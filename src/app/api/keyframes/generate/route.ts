import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, LLMClient } from 'coze-coding-dev-sdk';

interface KeyframeRequest {
  storyboard: any; // StoryboardScript
  characterImages: string[]; // 人物设定图URL
  characterDesign: any; // 人物设计信息（包含人物名称和图片索引）
  fastMode?: boolean; // 快速预览模式（低分辨率）
  sceneCharacterMapping?: any[]; // 场景-人物映射（新增）
}

interface KeyframeScene {
  sceneNumber: number;
  prompt: string;
  imageUrl: string;
}

interface Keyframes {
  scenes: KeyframeScene[];
}

// 定义画风关键词映射（与分镜生成保持一致）
const artStyleKeywordsMap: Record<string, string> = {
  '写实风格': 'photorealistic, 8k, ultra detailed, realistic lighting, cinematic',
  '卡通风格': 'cartoon style, vibrant colors, clean lines, expressive, animated',
  '动漫风格': 'anime style, cel shading, vivid colors, manga, detailed',
  '漫画风格': 'manga style, comic style, black and white manga, detailed line art, anime',
  '水彩风格': 'watercolor painting, soft edges, artistic, dreamy, watercolor texture',
  '油画风格': 'oil painting, textured, classic art, oil brushstrokes, rich colors',
  '像素风格': 'pixel art, 8-bit, retro, blocky, vibrant colors',
  '赛博朋克': 'cyberpunk, neon lights, futuristic, high tech, dystopian, glowing',
  '吉卜力风格': 'ghibli style, studio ghibli, anime, hand drawn, soft colors, whimsical',
  '水墨风格': 'ink painting, traditional chinese art, brush strokes, minimalist, black ink',
  '赛璐璐风格': 'cel shaded, anime, bold outlines, flat colors, graphic novel style',
  '蒸汽朋克': 'steampunk, victorian, brass gears, steam, industrial, ornate',
  '暗黑哥特': 'dark fantasy, gothic, horror, eerie atmosphere, dramatic lighting',
  '浮世绘风格': 'ukiyo-e, japanese woodblock print, traditional, flat colors, wave patterns',
  '低多边形': 'low poly, geometric, flat shading, minimalist, 3D render',
  '黏土动画': 'claymation, clay animation, stop motion, textured, hand crafted',
  '复古油画': 'vintage painting, classical art, renaissance, rich textures, aged',
  '霓虹艺术': 'neon art, glowing, vibrant, retro 80s, synthwave, electric colors',
};

// 智能角色分析函数 - 识别角色类型、性别、年龄等关键信息
function analyzeCharacter(character: any): {
  species: string; // 物种：human/animal
  gender: string; // 性别：male/female
  age: string; // 年龄描述
  isAnimal: boolean; // 是否为动物
  animalType?: string; // 动物类型（如果是动物）
} {
  const gender = character.gender || '';
  const age = character.age || '';
  const appearance = character.appearance || '';
  const name = character.name || '';

  // 1. 识别是否为动物
  const animalKeywords = ['猫', 'dog', '猫', '狗', '鸟', 'rabbit', '兔子', 'fox', '狐狸', 'wolf', '狼',
                          'lion', '狮子', 'tiger', '老虎', 'bear', '熊', 'deer', '鹿', 'horse', '马',
                          'cat', 'pet', '宠物', 'animal', '动物', 'kitten', 'kitty', '小猫'];
  const isAnimal = animalKeywords.some(kw => name.includes(kw) || appearance.includes(kw));

  if (isAnimal) {
    // 提取动物类型
    const animalType = animalKeywords.find(kw => name.includes(kw) || appearance.includes(kw)) || 'animal';

    // 动物的性别表达（使用appropriate terms）
    const animalGender = gender.includes('公') || gender.toLowerCase().includes('male') ? 'male' : 'female';

    // 动物的年龄表达
    let animalAge = age;
    if (age.includes('幼') || age.includes('小') || name.includes('小')) {
      animalAge = 'young';
    } else if (age.includes('老') || age.includes('old')) {
      animalAge = 'old';
    } else if (age.includes('成') || age.includes('adult')) {
      animalAge = 'adult';
    } else {
      animalAge = 'adult'; // 默认成年
    }

    return {
      species: animalType,
      gender: animalGender,
      age: animalAge,
      isAnimal: true,
      animalType,
    };
  }

  // 2. 人类角色分析
  // 性别分析（更细致的判断）
  let humanGender = 'person';
  if (gender.includes('男') || gender.toLowerCase().includes('male') || gender.includes('他')) {
    humanGender = 'male';
  } else if (gender.includes('女') || gender.toLowerCase().includes('female') || gender.includes('她')) {
    humanGender = 'female';
  } else if (gender.includes('儿童') || gender.includes('child') || gender.includes('小孩')) {
    humanGender = 'child';
  } else if (gender.includes('中性') || gender.toLowerCase().includes('neutral')) {
    humanGender = 'person';
  }

  // 年龄分析
  let humanAge = 'adult';
  if (age.includes('婴儿') || age.includes('baby') || age.includes('幼儿')) {
    humanAge = 'baby';
  } else if (age.includes('儿童') || age.includes('child') || age.includes('少年')) {
    humanAge = 'child';
  } else if (age.includes('青少年') || age.includes('teen') || age.includes('teenager')) {
    humanAge = 'teenager';
  } else if (age.includes('青年') || age.includes('young') || age.includes('年轻')) {
    humanAge = 'young adult';
  } else if (age.includes('中年') || age.includes('middle')) {
    humanAge = 'middle-aged';
  } else if (age.includes('老年') || age.includes('old') || age.includes('elderly')) {
    humanAge = 'elderly';
  }

  return {
    species: 'human',
    gender: humanGender,
    age: humanAge,
    isAnimal: false,
  };
}

// Prompt自检函数 - 验证prompt是否包含所有关键角色信息
function validateScenePrompt(prompt: string, characterDetails: any[]): {
  valid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!characterDetails || characterDetails.length === 0) {
    return { valid: true, issues: [], suggestions: [] };
  }

  // 检查每个角色的关键信息是否在prompt中
  characterDetails.forEach((char, idx) => {
    const charInfo = analyzeCharacter(char);

    // 检查物种/性别关键词
    const requiredKeywords: string[] = [];

    if (charInfo.isAnimal) {
      // 动物必须有物种关键词
      requiredKeywords.push(charInfo.animalType || 'animal');
      if (charInfo.gender === 'male' || charInfo.gender === 'female') {
        requiredKeywords.push(charInfo.gender);
      }
    } else {
      // 人类必须有性别关键词
      if (charInfo.gender !== 'person' && charInfo.gender !== 'child') {
        requiredKeywords.push(charInfo.gender);
      }
    }

    // 检查年龄关键词
    if (charInfo.age && charInfo.age !== 'adult') {
      requiredKeywords.push(charInfo.age);
    }

    // 检查外貌/服装关键词
    if (char.appearance) {
      const appearanceKeywords = char.appearance.split(/[,，]/).map((k: string) => k.trim()).slice(0, 2);
      requiredKeywords.push(...appearanceKeywords);
    }

    // 验证这些关键词是否在prompt中
    const lowerPrompt = prompt.toLowerCase();
    const missingKeywords = requiredKeywords.filter(kw => {
      const lowerKw = kw.toLowerCase();
      // 对于中英文混合的关键词，做更宽松的匹配
      return !lowerPrompt.includes(lowerKw) && !prompt.includes(kw);
    });

    if (missingKeywords.length > 0) {
      issues.push(`角色"${char.name}"缺少关键特征: ${missingKeywords.join(', ')}`);
      suggestions.push(`在prompt开头强制添加: "${charInfo.species}, ${charInfo.gender}, ${charInfo.age}, ${char.appearance}"`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
  };
}

// 生成关键帧
export async function POST(request: NextRequest) {
  try {
    const body: KeyframeRequest = await request.json();
    const { storyboard, characterImages, characterDesign, fastMode = false, sceneCharacterMapping } = body;

    if (!storyboard || !storyboard.scenes || storyboard.scenes.length === 0) {
      return NextResponse.json(
        { error: '分镜脚本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const imageClient = new ImageGenerationClient(config);
    const llmClient = new LLMClient(config);

    // 步骤1：为每个场景生成优化的关键帧prompt（理解情感和氛围）
    console.log('步骤1：分析场景情感，生成优化prompt...');

    const sceneCharactersMap: Record<number, any[]> = {};
    if (sceneCharacterMapping) {
      sceneCharacterMapping.forEach((mapping: any) => {
        if (mapping.sceneNumber && mapping.characters) {
          const characterDetails = mapping.characters
            .map((charInfo: any) => {
              const charData = characterDesign?.characters?.find((c: any) => c.name === charInfo.name);
              if (!charData) return null;
              return {
                name: charData.name,
                gender: charData.gender,
                ethnicity: charData.ethnicity,
                appearance: charData.appearance,
                outfit: charData.outfit,
                expression: charData.expression,
              };
            })
            .filter(Boolean);
          sceneCharactersMap[mapping.sceneNumber] = characterDetails;
        }
      });
    }

    const sceneEnhancementPrompt = `你是一位获奖的电影美术指导和视觉艺术家，擅长将剧本情感和叙事细节转化为震撼的视觉语言。
你的核心使命：为每个场景生成**令人惊叹、细节丰富、戏剧性极强**的AI生图提示词。

## 第一部分：深度剧本理解（情感内核挖掘）

在生成prompt之前，你必须先深入理解每个场景的**情感内核**和**戏剧意图**：

### 情感内核四问
对每个场景，回答这四个问题：

**1. 这个场景的核心情感是什么？**
- 表层情感：角色的直接情绪（愤怒、悲伤、恐惧、喜悦等）
- 深层情感：情感背后的真实动机（不安、渴望、遗憾、决绝等）
- 情感强度：轻度（微妙暗示）、中度（明显表达）、强烈（爆发状态）

**2. 这个场景的戏剧目的是什么？**
- 推进剧情：揭示信息、制造冲突、推动发展
- 建立关系：展现角色互动、情感连接、权力关系
- 角色成长：展现角色转变、内心突破、性格展现
- 情感释放：高潮爆发、情绪释放、情感宣泄

**3. 这个场景的视觉隐喻是什么？**
- 环境隐喻：场景环境如何表达情感（如"狭窄的房间=压抑"、"广阔的天空=自由"）
- 光影隐喻：光影如何暗示心理状态（如"阴影覆盖脸部=隐藏"、"明亮光线=诚实"）
- 色彩隐喻：色彩选择如何传达情感（如"红色=激情/愤怒"、"蓝色=忧郁/平静"）
- 构图隐喻：构图如何体现关系（如"高角度俯视=角色渺小"、"低角度仰视=角色强大"）

**4. 这个场景的戏剧性时刻在哪里？**
- 动作高潮：最具戏剧张力的动作瞬间（如"拳头即将击中"、"手即将松开"）
- 情感爆发：情绪最强烈的时刻（如"眼泪夺眶而出"、"怒吼的瞬间"）
- 悬念时刻：最具期待感的瞬间（如"即将打开门"、"即将说出真相"）
- 转折瞬间：情感或剧情的转折点（如"从愤怒转为悲伤"、"从希望转为绝望"）

### 视觉细节三原则

**原则1：情感必须可见化**
❌ 错误："他看起来很伤心"
✅ 正确："肩膀下垂，眼神失焦，嘴角微微颤抖，眼眶泛红"

❌ 错误："她很愤怒"
✅ 正确："紧咬嘴唇，眉头紧锁形成川字纹，额头青筋凸起，拳头紧紧握住指节发白"

**原则2：动作必须动态化**
❌ 错误："他拿起杯子"
✅ 正确："左手五指缓缓张开，从桌面拿起咖啡杯，杯中液面随动作微微晃动"

❌ 错误："她走向门口"
✅ 正确："右脚迈出第一步，鞋跟在地板上发出清脆声响，身体重心前倾，左手悬在门把手上方"

**原则3：细节必须叙事化**
❌ 错误："房间里有一张桌子"
✅ 正确："破旧的木质桌子占据房间角落，桌面上刻满划痕，一盏台灯投下昏黄的光圈，照亮桌面散落的三张照片"

❌ 错误："穿着蓝色衣服"
✅ 正确："深蓝色丝绸衬衫，扣子解到第二颗，袖口卷起到肘部，露出手腕上的旧手表"

## 第二部分：人物状态深度推断

从剧本的只言片语中，推断人物的完整状态：

### 动作推断（从文字到视觉）
- 剧本："拿起电话" → 推断："右手食指和拇指捏住听筒，缓缓提起贴近耳边，另一只手的食指悬在拨号键上方，微微颤抖"
- 剧本："坐下" → 推断："身体重心下沉，背部贴上椅子靠背，双手自然垂落在膝盖上方，头部微微后仰"
- 剧本："开门" → 推断："右手握住圆形门把手，顺时针旋转90度，左手推开门板，身体微微前倾准备跨入"

### 表情推断（从情绪到微表情）
- 剧本："开心" → 推断："嘴角上扬呈弧形，眼角出现细纹，眉毛自然舒展，眼神明亮且有神"
- 剧本："愤怒" → 推断："眉毛紧锁下垂，双眼圆睁，眼球微凸，嘴角向下撇，下颚肌肉紧绷"
- 剧本："紧张" → 推断："眼神游移不定，喉结上下滚动，额角渗出细密汗珠，下唇被咬出印痕"

### 姿态推断（从情感到肢体语言）
- 剧本："自信" → 推断："脊背挺直如箭，肩膀自然下沉打开，双手自然垂落或抱在胸前，下巴微微抬起"
- 剧本："害怕" → 推断："肩膀内扣前倾，双臂交叉护在胸前，重心后移，脚尖朝向出口方向"
- 剧本："疲惫" → 推断："脊柱微曲，肩膀沉重下垂，头颅低垂，双手无力地垂在身侧"

### 位置推断（从关系到空间）
- 剧本：两个人对峙 → 推断："左侧人物占据画面左侧三分之一处，身体微微右转；右侧人物占据右侧三分之一处，身体微微左转；两人之间留出三分之一的空间作为张力区域"
- 剧本：亲密对话 → 推断："两人距离不超过半米，身体微微前倾形成对话弧线，视线平直相交，占据画面中央"

## 第三部分：Prompt生成规范

### Prompt结构（七层递进）

**第1层：强制角色约束（CRITICAL - 绝不能错）**
格式：\`[CHARACTER DETAILS MUST MATCH: 角色1, species, gender, age, ethnicity, appearance, outfit, 位置; 角色2, species, gender, age, ethnicity, appearance, outfit, 位置]\`
- 物种必须准确：human/animal（严禁混淆）
- 性别必须准确：male/female
- 年龄必须合理：child/teenager/young adult/middle-aged/elderly
- 外貌特征必须完整体现
- 服装细节必须准确
- 位置必须明确（on the left/right/center, foreground/background）

**第2层：核心动作描述（动态且具体）**
- 使用具体视觉动词：fingers trembling, body leaning forward, eyes widening, etc.
- 描述动作的强度和速度：slowly reaching, quickly grasping, firmly holding
- 描述动作的影响：shadows cast by movement, liquid rippling, fabric wrinkling

**第3层：面部表情细节（微表情）**
- 眼睛状态：pupil dilation, eyelid position, gaze direction, tear formation
- 嘴巴状态：lip position, smile/frown curve, teeth visibility, muscle tension
- 眉毛状态：position, furrowing, raising
- 脸部肌肉：tension lines, shadows formed by expression

**第4层：姿态与肢体语言**
- 脊椎状态：straight/slumped/curved
- 肩膀状态：raised/relaxed/tensed/rounded
- 手臂状态：position, hand shape, muscle tension
- 手部细节：finger curling, fist clenching, palm orientation
- 腿部状态：stance width, weight distribution, knee position
- 整体动态：leaning forward/backward, turning, crouching

**第5层：环境与道具叙事**
- 环境细节：location features, time of day, weather, texture, color palette
- 道具细节：specific objects, their condition, position, lighting effects
- 光影叙事：light direction, intensity, color, shadow placement, dramatic contrast
- 色彩叙事：color temperature, saturation, contrast, color symbolism

**第6层：情感氛围强化**
- 氛围词汇：tense, melancholic, joyful, menacing, serene, etc.
- 氛围视觉化：通过光影、色彩、构图体现
- 戏剧张力：通过对比、冲突、矛盾体现

**第7层：电影质感词汇**
- 光影：cinematic lighting, rim light, dramatic shadows, chiaroscuro, volumetric lighting
- 构图：rule of thirds, golden ratio, leading lines, depth of field
- 质感：film grain, lens flare, vignette, color grading
- 镜头：wide angle, telephoto, macro, dolly shot, tracking shot

### 人物互动描述规范

**双人场景：**
- 描述两人的空间关系（距离、角度、站位）
- 描述两人的视觉互动（对视、凝视、回避、瞥视）
- 描述两人的肢体关系（接触、即将接触、保持距离）
- 描述两人的情感互动（谁占主导、谁处于弱势、平等对视）

**多人场景：**
- 明确每个人的位置和站位
- 描述视觉焦点（谁在中心、谁在边缘）
- 描述人群动态（整体状态、个体差异）
- 描述空间层次（前景、中景、背景的人物分布）

## 剧本详细分析

${storyboard.scenes.map((scene: any, index: number) => {
  const characters = sceneCharactersMap[scene.sceneNumber] || [];
  return `
【场景${scene.sceneNumber}】
- 场景类型：${scene.shotType}
- 角度：${scene.cameraAngle}
- 运镜：${scene.cameraMovement}
- 构图：${scene.composition}
- 人物位置：${scene.characterPosition}
- 光线：${scene.lighting}
- 色温：${scene.colorTemperature}
- 氛围：${scene.mood}
- 出场人物：${characters.length > 0 ? characters.map((c: any) => c.name).join(', ') : '无'}
${characters.length > 0 ? characters.map((c: any) => `  - ${c.name}：
    物种：${c.appearance.includes('猫') || c.appearance.includes('狗') || c.appearance.includes('鸟') || c.name.includes('猫') || c.name.includes('狗') || c.name.includes('鸟') ? 'animal' : 'human'}
    性别：${c.gender}
    种族：${c.ethnicity}
    年龄：${c.appearance.includes('幼') || c.appearance.includes('小') ? 'young' : c.appearance.includes('老') ? 'old' : 'adult'}
    外貌特征：${c.appearance}
    服装细节：${c.outfit}
    表情状态：${c.expression}
    独特标识：${c.appearance}` ).join('\n') : ''}
- 原始提示词：${scene.prompt}

【场景${scene.sceneNumber}深度分析】
- 核心情感：从mood和action推断（如：紧张、悲伤、愤怒、希望、恐惧、喜悦）
- 戏剧目的：这个场景要达成什么（如：制造冲突、推进剧情、建立关系、释放情绪）
- 视觉隐喻：环境、光影、色彩如何体现情感
- 戏剧性时刻：最具张力的瞬间是什么
- 人物状态推断：
${characters.map((c: any) => `  - ${c.name}：
    动作推断：从action推断具体动作细节（视觉动词+具体描述）
    表情推断：从mood和dialogue推断微表情（眼睛、嘴巴、眉毛状态）
    姿态推断：从情感推断肢体语言（脊背、肩膀、手臂、手部状态）
    位置安排：在画面中的具体位置和空间关系
`).join('\n')}
`;
}).join('\n')}

## 返回格式（严格JSON）

\`\`\`json
{
  "enhancedPrompts": [
    {
      "sceneNumber": 1,
      "enhancedPrompt": "完整的英文生图提示词，严格遵循七层结构：[CHARACTER DETAILS MUST MATCH: 角色完整信息] + 核心动作描述 + 面部表情细节 + 姿态与肢体语言 + 环境与道具叙事 + 情感氛围强化 + 电影质感词汇，确保：1.角色100%符合设定（物种、性别、年龄、外貌、服装） 2.每个细节都有具体视觉描述 3.情感通过光影色彩构图准确传达 4.人物动态、表情、姿态完美契合剧情 5.画面细节丰富、戏剧性强、令人惊艳"
    }
  ]
}
\`\`\`

## 优化要求（必须严格遵守 - 违反即失败）

**第一优先级：角色一致性（CRITICAL - 不可妥协）**
1. **物种必须100%准确**：动物角色生成动物形态，人类角色生成人类形态
2. **性别必须100%准确**：male=男性，female=女性，绝不允许混淆
3. **年龄必须合理**：child=儿童，elderly=老人，外貌与年龄匹配
4. **外貌特征必须100%体现**：剧本描述的所有特征必须出现在画面中

**第二优先级：剧本细节与情感内核**
5. **情感内核四问必须回答**：每个场景都要先回答核心情感、戏剧目的、视觉隐喻、戏剧性时刻
6. **动作推断必须具体**：从action推断动态细节，使用具体视觉动词（如"手指颤抖"而非"紧张的动作"）
7. **表情推断必须精确**：从mood和dialogue推断微表情（眼睛、嘴巴、眉毛、脸部肌肉）
8. **姿态推断必须生动**：从情感推断肢体语言（脊背、肩膀、手臂、手部、腿部状态）
9. **位置推断必须明确**：明确描述每个角色的空间位置和相互关系
10. **环境叙事必须有目的**：环境不是背景，要主动传达情感（时间、地点、天气、色彩、光影）

**第三优先级：视觉表达**
11. **Prompt必须遵循七层结构**：角色约束→动作→表情→姿态→环境→情感→电影质感
12. **每个出场人物必须有完整描述**：包含species, gender, age, ethnicity, appearance, outfit, position
13. **人物互动必须具体**：双人场景描述空间关系、视觉互动、肢体关系、情感互动
14. **动态细节必须生动**：描述动作的强度、速度、影响（不是静态描述）
15. **光影色彩必须叙事**：光线方向、强度、色温服务于情感，色彩选择传达隐喻
16. **电影质感必须专业**：使用cinematic lighting, rim light, depth of field等专业词汇
17. **细节丰富性**：每个prompt都要有8-10个不同的视觉细节，确保画面丰富

**第四优先级：从分镜信息中提取并强化**
18. **利用分镜的景别信息**：shotType决定画面重点（特写强化表情，全景强化环境）
19. **利用分镜的角度信息**：cameraAngle暗示权力关系（低角度仰视=强大，高角度俯视=弱小）
20. **利用分镜的运镜信息**：cameraMovement体现动感（Dolly In=聚焦，Handheld=不安）
21. **利用分镜的构图信息**：composition引导视线（三分法=动态平衡，对称=稳定庄重）
22. **利用分镜的光线信息**：lighting直接影响氛围（Chiaroscuro=强烈对比，Golden Hour=温暖）

## 自检清单（每个prompt必须通过）

生成每个prompt前，必须逐项检查：

**角色一致性检查：**
- [ ] 所有角色的物种是否准确？（猫就是猫，不是人）
- [ ] 所有角色的性别是否准确？（male/female绝不混淆）
- [ ] 所有角色的年龄是否合理？（child就是儿童的样子）
- [ ] 所有角色的外貌特征是否完整体现？

**情感内核检查：**
- [ ] 是否回答了核心情感四问？
- [ ] 戏剧目的是否清晰？（这个场景要达成什么）
- [ ] 视觉隐喻是否准确？（环境、光影、色彩如何体现情感）
- [ ] 戏剧性时刻是否突出？（最具张力的瞬间是什么）

**视觉细节检查：**
- [ ] 人物动作是否具体动态？（使用具体视觉动词，不是笼统描述）
- [ ] 人物表情是否精确详细？（眼睛、嘴巴、眉毛、脸部肌肉状态）
- [ ] 人物姿态是否生动？（脊背、肩膀、手臂、手部、腿部状态）
- [ ] 人物位置是否明确？（空间关系、构图位置）
- [ ] 环境细节是否叙事？（时间、地点、天气、道具如何服务于情感）
- [ ] 光影色彩是否准确？（服务于情感基调，传达视觉隐喻）

**多人物场景检查：**
- [ ] 每个人物是否有完整描述？（species, gender, age, ethnicity, appearance, outfit, position）
- [ ] 人物互动是否具体？（空间关系、视觉互动、肢体关系、情感互动）
- [ ] 视觉焦点是否明确？（谁在中心、谁在边缘、视线如何引导）

**电影质感检查：**
- [ ] 是否使用了专业摄影词汇？（cinematic lighting, rim light, depth of field等）
- [ ] 光影是否戏剧化？（对比度、光源方向、阴影设计）
- [ ] 色彩是否有情感？（色温、饱和度、对比度、象征意义）
- [ ] 构图是否有目的？（引导视线、突出重点、营造氛围）

**Prompt结构检查：**
- [ ] 是否遵循七层结构？（角色约束→动作→表情→姿态→环境→情感→电影质感）
- [ ] 开头是否有[CHARACTER DETAILS MUST MATCH: xxx]强制约束？
- [ ] 每个部分是否有足够的细节？（至少8-10个不同的视觉细节）

请为每个场景生成深度理解、细节丰富、戏剧性强、角色100%准确的prompt，让画面令人惊叹！`;

    const sceneEnhancementMessages = [
      { role: 'system' as const, content: '你是资深电影美术指导，擅长将情感转化为视觉语言。' },
      { role: 'user' as const, content: sceneEnhancementPrompt },
    ];

    let sceneEnhancementResponse: any;
    try {
      sceneEnhancementResponse = await llmClient.invoke(sceneEnhancementMessages, {
        model: 'doubao-seed-1-6-flash-250615',
        temperature: 0.3
      });

      console.log('场景增强分析完成');
      console.log('LLM原始返回内容:', sceneEnhancementResponse.content);

      // 提取JSON - 使用更健壮的方法
      let enhancementJsonContent = sceneEnhancementResponse.content.trim();

      // 移除markdown代码块标记
      enhancementJsonContent = enhancementJsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // 尝试找到完整的JSON对象（从第一个{开始，到对应的}结束）
      const firstBraceIndex = enhancementJsonContent.indexOf('{');
      if (firstBraceIndex === -1) {
        console.warn('场景增强解析失败：未找到JSON起始标记');
        throw new Error('无法解析场景增强提示词：未找到JSON起始标记');
      }

      // 找到匹配的结束括号
      let braceCount = 0;
      let jsonString = '';
      for (let i = firstBraceIndex; i < enhancementJsonContent.length; i++) {
        const char = enhancementJsonContent[i];
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        jsonString += char;
        if (braceCount === 0) break;
      }

      console.log('提取的JSON字符串长度:', jsonString.length, '前200字符:', jsonString.substring(0, 200));

      const enhancementData = JSON.parse(jsonString);
      const enhancedPromptMap: Record<number, string> = {};
      enhancementData.enhancedPrompts.forEach((item: any) => {
        enhancedPromptMap[item.sceneNumber] = item.enhancedPrompt;
      });

      console.log(`已增强 ${Object.keys(enhancedPromptMap).length} 个场景的prompt`);

      // 将增强的prompt合并到storyboard中
      storyboard.scenes.forEach((scene: any) => {
        if (enhancedPromptMap[scene.sceneNumber]) {
          scene.originalPrompt = scene.prompt;
          scene.prompt = enhancedPromptMap[scene.sceneNumber];
          console.log(`场景${scene.sceneNumber} prompt已增强`);
        }
      });

    } catch (error) {
      console.warn('场景增强失败，使用原始prompt:', error);
      // 继续使用原始prompt
    }

    // 根据模式选择分辨率
    const imageSize = fastMode ? '512x912' : '720x1280';
    console.log(`开始并发生成 ${storyboard.scenes.length} 个关键帧（尺寸: ${imageSize}）...`);

    // 构建人物名称到图片索引的映射
    const characterImageMap: Record<string, number> = {};
    if (characterDesign && characterDesign.characters) {
      characterDesign.characters.forEach((char: any, index: number) => {
        characterImageMap[char.name] = index;
      });
    }

    // 辅助函数：根据场景获取应该使用的人物参考图
    const getSceneReferenceImages = (sceneNumber: number): string[] => {
      if (!sceneCharacterMapping) {
        // 如果没有映射，返回所有人物图（向后兼容）
        return characterImages;
      }

      const sceneMapping = sceneCharacterMapping.find((m: any) => m.sceneNumber === sceneNumber);
      if (!sceneMapping || !sceneMapping.characters || sceneMapping.characters.length === 0) {
        // 该场景没有人物，使用第一张图作为风格参考
        return characterImages.length > 0 ? [characterImages[0]] : [];
      }

      // 根据场景中的角色名称，选择对应的人物图
      const sceneCharacterImages = sceneMapping.characters
        .map((charInfo: any) => {
          const imageIndex = characterImageMap[charInfo.name];
          return imageIndex !== undefined ? characterImages[imageIndex] : null;
        })
        .filter((img: any): img is string => img !== null);

      // 如果没有找到匹配的人物图，使用第一张图作为风格参考
      return sceneCharacterImages.length > 0 ? sceneCharacterImages : (characterImages.length > 0 ? [characterImages[0]] : []);
    };

    // 构建所有场景的生成任务
    const keyframePromises = storyboard.scenes.map(async (scene: any, index: number) => {
      console.log(`生成关键帧 - 场景${scene.sceneNumber}...`);

      // 根据场景选择对应的人物参考图
      const sceneReferenceImages = getSceneReferenceImages(scene.sceneNumber);
      const referenceImage = sceneReferenceImages.length > 0 ? sceneReferenceImages[0] : undefined;

      // 增强prompt：如果场景有多个角色，在prompt中明确描述
      const sceneMapping = sceneCharacterMapping?.find((m: any) => m.sceneNumber === scene.sceneNumber);

      // 【第一步】强制添加画风关键词（形成三明治结构：开头+中间+结尾，确保画风100%一致）
      const artStyleName = storyboard.artStyle || '写实风格';
      const artStyleKeywords = artStyleKeywordsMap[artStyleName] || artStyleKeywordsMap['写实风格'];

      // 强制性画风标记 - 使用多重强调
      const forcedArtStylePrefix = `CRITICAL ART STYLE: ${artStyleKeywords}. STRICT: The artwork must follow this art style 100%. `;
      const forcedArtStyleMiddle = ` ART STYLE REINFORCEMENT: ${artStyleKeywords}`;
      const forcedArtStyleSuffix = ` Ensure the final image adheres strictly to the ${artStyleName} art style with ${artStyleKeywords}.`;

      let enhancedPrompt = scene.prompt;

      // 在prompt的开头添加强制画风关键词
      if (!enhancedPrompt.toLowerCase().includes('critical art style')) {
        enhancedPrompt = forcedArtStylePrefix + enhancedPrompt;
        console.log(`  ✓ 已添加画风前缀: ${artStyleName}`);
      }

      // 在prompt的结尾添加画风关键词（三明治结构）
      if (!enhancedPrompt.toLowerCase().includes('ensure the final image')) {
        enhancedPrompt = enhancedPrompt + forcedArtStyleSuffix;
        console.log(`  ✓ 已添加画风后缀: ${artStyleName}`);
      }

      // 在prompt的中间添加画风强化（如果prompt太长）
      if (enhancedPrompt.length > 500) {
        const midPoint = Math.floor(enhancedPrompt.length / 2);
        enhancedPrompt = enhancedPrompt.substring(0, midPoint) + forcedArtStyleMiddle + enhancedPrompt.substring(midPoint);
        console.log(`  ✓ 已添加画风中间强化: ${artStyleName}`);
      }

      if (sceneMapping && sceneMapping.characters.length > 0) {
        // 多人物场景：在prompt中明确标注每个角色
        console.log(`  场景${scene.sceneNumber}包含${sceneMapping.characters.length}个角色: ${sceneMapping.characters.map((c: any) => c.name).join(', ')}`);

        // 获取该场景中每个角色的详细信息
        const characterDetails = sceneMapping.characters
          .map((charInfo: any) => {
            const charData = characterDesign?.characters?.find((c: any) => c.name === charInfo.name);
            if (!charData) return null;

            return {
              name: charData.name,
              gender: charData.gender,
              ethnicity: charData.ethnicity,
              appearance: charData.appearance,
              outfit: charData.outfit,
            };
          })
          .filter(Boolean);

        if (characterDetails.length > 0) {
          // 构建增强的prompt，明确描述每个角色的位置和特征
          const characterDescriptions = characterDetails.map((char: any, idx: number) => {
            // 智能识别角色类型和特征
            const charInfo = analyzeCharacter(char);

            const positionText = idx === 0 ? 'on the left' : idx === 1 ? 'on the right' : 'in the center';
            return `${charInfo.species}, ${charInfo.gender}, ${charInfo.age}, ${char.ethnicity}, ${char.appearance}, wearing ${char.outfit}, ${positionText}`;
          }).join(', ');

          // 在prompt的开头插入人物描述，使用强制性的分隔符和全大写强调
          const forcedCharacterPrompt = `[CHARACTER DETAILS MUST MATCH: ${characterDescriptions}]. `;
          enhancedPrompt = forcedCharacterPrompt + enhancedPrompt;

          // Prompt自检：验证是否包含所有关键信息
          const validation = validateScenePrompt(enhancedPrompt, characterDetails);

          if (!validation.valid) {
            console.warn(`⚠️  场景${scene.sceneNumber} prompt验证失败:`);
            validation.issues.forEach(issue => console.warn(`    - ${issue}`));
            console.log(`  🔧 应用自动修复...`);
            validation.suggestions.forEach(suggestion => console.log(`    - ${suggestion}`));

            // 自动修复：在prompt最前面添加强制性的角色描述
            const emergencyFix = characterDetails.map((char: any, idx: number) => {
              const charInfo = analyzeCharacter(char);
              const pos = idx === 0 ? 'left side' : idx === 1 ? 'right side' : 'center';
              return `${charInfo.species} ${charInfo.gender} ${charInfo.age} on ${pos}`;
            }).join(' and ');

            enhancedPrompt = `CRITICAL: ${emergencyFix}. ` + enhancedPrompt;
            console.log(`  ✅ 已应用修复: ${enhancedPrompt.substring(0, 150)}...`);
          } else {
            console.log(`  ✅ Prompt验证通过`);
          }

          console.log(`  增强prompt: ${enhancedPrompt.substring(0, 250)}...`);
        }
      }

      console.log(`  使用参考图数量: ${sceneReferenceImages.length}`);

      const imageResponse = await imageClient.generate({
        prompt: enhancedPrompt,
        image: referenceImage,
        size: imageSize,
        watermark: false,
        responseFormat: 'url',
      });

      const helper = imageClient.getResponseHelper(imageResponse);

      if (!helper.success || helper.imageUrls.length === 0) {
        throw new Error(`生成场景${scene.sceneNumber}关键帧失败`);
      }

      console.log(`✓ 完成场景${scene.sceneNumber}`);
      return { scene, imageUrl: helper.imageUrls[0] };
    });

    // 等待所有关键帧生成完成
    const keyframeResults = await Promise.all(keyframePromises);

    // 按场景编号顺序整理关键帧
    const keyframes: KeyframeScene[] = keyframeResults.map(result => ({
      sceneNumber: result.scene.sceneNumber,
      prompt: result.scene.prompt,
      imageUrl: result.imageUrl,
    }));

    console.log(`✓ 所有关键帧生成完成`);

    return NextResponse.json({
      success: true,
      keyframes,
    });

  } catch (error) {
    console.error('生成关键帧失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成关键帧失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
