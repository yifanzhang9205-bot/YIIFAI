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

## 关键帧创作思维（细节优先）

**核心原则：每个细节都必须服务于戏剧目标和情感表达**

**0. 角色一致性是生死攸关的规则（CRITICAL）**
⚠️ **绝对禁止违反角色设定！**
- **物种必须严格一致**：如果角色是动物（猫、狗、鸟等），必须生成动物形态，严禁生成人类形态或"长动物耳朵的人"
- **性别必须严格一致**：male必须生成男性，female必须生成女性，严禁性别混淆
- **年龄必须合理**：child必须生成儿童，elderly必须生成老人
- **外貌特征必须准确**：剧本描述的特征（头发、眼睛、服装）必须完全体现

**强制约束关键词位置**：
- 角色信息必须在prompt的最前面
- 使用全大写和特殊标记：[CHARACTER DETAILS: xxx] 或 CRITICAL: xxx
- 这些信息不是建议，是强制约束！

**1. 剧本细节即视觉细节（Script Detail = Visual Detail）**
- 动作细节：剧本中的每个动作都要在画面中体现
  - ❌ 错误："他拿起电话"
  - ✅ 正确："他的手指颤抖着拿起电话，屏幕的光照亮他布满血丝的眼睛"
- 环境细节：场景的时间、地点、天气都要在画面中体现
  - ❌ 错误："房间"
  - ✅ 正确："深夜的卧室，月光透过窗帘缝隙照进来，地板上散落着几张揉皱的纸"
- 道具细节：剧本提到的道具必须在画面中清晰可见

**2. 情感即视觉（Emotion is Visual）**
- **每个视觉元素都要传达情感**：
  - 紧张：强烈的对比度、锐利的阴影、动态构图、紧绷的姿态
  - 温馨：柔和的光线、暖色调、开放式构图、放松的姿态
  - 忧郁：冷色调、低对比度、留白空间、低垂的肩膀
  - 希望：明亮的高光、温暖的光线、向上的构图
- **光影即情感**：光线方向、强度、色温都要服务于情感基调

**3. 人物即故事（Character is Story）**
- **人物姿态和表情必须反映当前状态**：
  - 疲惫：肩膀下垂、眼皮下垂、步履沉重
  - 兴奋：身体前倾、眼睛睁大、手势活跃
  - 紧张：身体僵硬、手部抓握、眼神游移
  - 自信：姿态挺拔、眼神坚定、动作从容
- **人物服装和道具必须与设定一致**：
  - 每个角色的服装细节、颜色、款式都要准确
  - 道具要服务于叙事功能（如：诊断书、照片、钥匙等）
- **人物动作必须与剧情完美契合**：
  - 从剧本的action推断人物正在做什么（不是静态站立，而是动态的动作）
  - 从剧本的dialogue推断人物在说这句话时的表情和眼神
  - 从剧本的mood推断人物的整体状态和肢体语言
  - 多人物时，描述人物之间的互动关系（对视、接触、距离、姿态差异）
  - 每个动作都要用具体的视觉动词（如"手指颤抖"、"身体前倾"、"眼神游离"）

**4. 场景即氛围（Scene is Atmosphere）**
- **环境是情绪的容器**：
  - 环境不仅仅是背景，要主动传达情感
  - 光影、色彩、构图都要服务于情感基调
  - 天气、时间、季节都要在画面中体现

**5. 构图即焦点（Composition is Focus）**
- **引导观众视线到叙事重点**：
  - 利用引导线（道路、光影、建筑线条）引导视线
  - 利用景深（浅景深聚焦主体，深景深展现环境）
  - 利用留白（突出主体，营造孤独或沉思感）

**6. 电影感质感（Cinematic Quality）**
- **添加电影摄影的专业词汇**：
  - 光影：cinematic lighting, rim light, dramatic shadows, chiaroscuro
  - 构图：rule of thirds, golden ratio, leading lines, depth of field
  - 质感：film grain, lens flare, vignette, color grading
  - 镜头：wide angle, telephoto, macro, dolly shot

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
${characters.length > 0 ? characters.map((c: any) => `  - ${c.name}：${c.gender}，${c.ethnicity}
    外貌特征：${c.appearance}
    服装细节：${c.outfit}
    表情状态：${c.expression}
    独特标识：${c.appearance}` ).join('\n') : ''}
- 原始提示词：${scene.prompt}
`;
}).join('\n')}

## 返回格式（严格JSON）

\`\`\`json
{
  "enhancedPrompts": [
    {
      "sceneNumber": 1,
      "enhancedPrompt": "优化后的英文生图提示词（必须包含：1.[CHARACTER DETAILS: xxx]在最前面 2.场景完整细节描述 3.每个出场人物的详细特征 4.人物姿态和表情细节 5.光影效果描述 6.色彩氛围描述 7.构图细节 8.情感表达强化 9.电影质感词汇，让画面细节丰富、戏剧性强、令人惊艳，且角色100%符合设定）"
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

**第二优先级：剧本细节优先**
5. 剧本中的每个动作、道具、环境细节都要在prompt中体现
6. 人物细节精确：每个出场人物的外貌、服装、表情、姿态都要详细描述
7. **人物动作与剧情完美契合**：
   - 从原始prompt中提取人物的动态信息，强化视觉细节
   - 如果原始prompt有"拿起电话"→ 强化为"手指颤抖着拿起电话，屏幕的蓝光照亮他布满血丝的眼睛"
   - 如果原始prompt有"愤怒地看着对方"→ 强化为"紧咬嘴唇，眼神冰冷如刀，眉头紧锁，拳头紧紧握住"
   - 如果原始prompt有"开心地大笑"→ 强化为"嘴角上扬到极致，眼睛弯成月牙，头向后仰，双手高举"
8. **多人物互动**：
   - 描述人物之间的空间关系（距离、角度、站位）
   - 描述人物之间的视觉互动（对视、凝视、回避）
   - 描述人物之间的肢体接触或即将接触的状态
9. **道具互动**：
   - 如果有人物使用道具，描述如何使用（手指、抓握、举起等）
   - 描述道具与人物的关系（道具的位置、大小、光线影响）

**第三优先级：视觉表达**
7. 情感视觉化：每个视觉元素都要服务于情感表达，用光影、色彩、构图传达情绪
8. 环境氛围强化：环境不是背景，要主动传达情感，描述时间、天气、季节
9. 电影质感词汇：添加cinematic lighting, dramatic shadows, depth of field等专业词汇
10. 构图细节描述：描述具体如何引导视线、如何聚焦叙事重点
11. 细节丰富性：每个prompt都要有5-7个不同的视觉细节，确保画面丰富
12. 保留原始意图：不要改变分镜的核心意图，只是强化细节和表现力

## 自检清单（每个prompt必须通过）

生成每个prompt前，必须问自己：
- [ ] 所有角色的物种是否准确？（猫就是猫，不是人）
- [ ] 所有角色的性别是否准确？（male/female绝不混淆）
- [ ] 所有角色的年龄是否合理？（child就是儿童的样子）
- [ ] 剧本中的动作、对话是否都体现在画面中？
- [ ] **人物动作是否与剧情契合？**（不是静态摆拍，而是动态的动作描述）
- [ ] **人物表情是否与剧情契合？**（根据dialogue和mood推断的表情细节）
- [ ] **人物姿态是否与剧情契合？**（根据情感状态推断的肢体语言）
- [ ] **多人物是否有互动？**（不是简单并列，而是有空间关系和视觉互动）
- [ ] 场景的环境细节（时间、地点、天气）是否描述清楚？
- [ ] 情感基调是否通过光影、色彩、构图准确传达？
- [ ] 每个人物都有具体的视觉动词？（如"手指颤抖"、"身体前倾"、"眼神游离"，不是笼统的"坐着"、"站着"）

请为每个场景生成细节丰富、戏剧性强、角色100%准确的prompt，让画面令人惊叹！`;

    const sceneEnhancementMessages = [
      { role: 'system' as const, content: '你是资深电影美术指导，擅长将情感转化为视觉语言。' },
      { role: 'user' as const, content: sceneEnhancementPrompt },
    ];

    let sceneEnhancementResponse: any;
    try {
      sceneEnhancementResponse = await llmClient.invoke(sceneEnhancementMessages, {
        model: 'doubao-seed-1-6-flash-250615',
        temperature: 0.5
      });

      console.log('场景增强分析完成');

      // 提取JSON
      let enhancementJsonContent = sceneEnhancementResponse.content.trim();
      enhancementJsonContent = enhancementJsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const enhancementJsonMatch = enhancementJsonContent.match(/\{[\s\S]*\}/);
      if (!enhancementJsonMatch) {
        console.warn('场景增强解析失败，使用原始prompt');
        throw new Error('无法解析场景增强提示词');
      }

      const enhancementData = JSON.parse(enhancementJsonMatch[0]);
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

      // 【第一步】强制添加画风关键词（在最前面，确保画风100%一致）
      const artStyleName = storyboard.artStyle || '写实风格';
      const artStyleKeywords = artStyleKeywordsMap[artStyleName] || artStyleKeywordsMap['写实风格'];
      const forcedArtStyle = `[ART STYLE MUST MATCH: ${artStyleKeywords}]. `;

      let enhancedPrompt = scene.prompt;

      // 在prompt的最前面添加画风关键词（优先级最高）
      if (!enhancedPrompt.toLowerCase().includes(artStyleKeywords.split(',')[0].trim().toLowerCase())) {
        enhancedPrompt = forcedArtStyle + enhancedPrompt;
        console.log(`  ✓ 已添加画风关键词: ${artStyleName}`);
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
