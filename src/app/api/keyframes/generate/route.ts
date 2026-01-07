import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, LLMClient } from 'coze-coding-dev-sdk';

interface KeyframeRequest {
  storyboard: any; // StoryboardScript
  characterImages: string[]; // 人物设定图URL
  characterDesign: any; // 人物设计信息（包含人物名称和图片索引）
  fastMode?: boolean; // 快速预览模式（低分辨率）
  sceneCharacterMapping?: any[]; // 场景-人物映射（新增）
  imagesPerScene?: number; // 每个场景生成的图片数量，默认4张
}

interface KeyframeScene {
  sceneNumber: number;
  prompt: string;
  imageUrl: string;
}

interface Keyframes {
  scenes: KeyframeScene[];
}

// 定义画风关键词映射
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

    // 读取配置，获取用户选择的图片生成模型
    let imageModel = 'doubao-seedream-4-5-251128'; // 默认模型
    try {
      const configResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/config`);
      const configData = await configResponse.json();
      if (configData.imageModel) {
        imageModel = configData.imageModel;
        console.log(`使用用户配置的图片生成模型: ${imageModel}`);
        // 修改client的model属性
        (imageClient as any).model = imageModel;
      }
    } catch (error) {
      console.warn('读取图片生成模型配置失败，使用默认模型:', error);
    }

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

    // ==================== 第一步：深度剧本理解 ====================
    // 让LLM先真正理解剧本，而不是直接生成prompt

    // 定义变量用于存储分析结果
    let sceneAnalysisMap: Record<number, any> = {};

    const scriptAnalysisPrompt = `你是一位专业的电影剧本分析师，你的任务是深度理解每个场景的**情感内核**和**视觉本质**。

你的核心使命：读懂剧本，理解每个场景在讲什么、要传达什么、最震撼的视觉是什么。

## 剧本理解指南

### 如何真正读懂一个场景？

**第一步：故事摘要（用一句话概括）**
- 这个场景发生了什么？（具体的事件）
- 结果如何？（发生了什么变化）
- 例如："小明拿着诊断书，在走廊崩溃大哭"

**第二步：情感内核（这个场景的情感本质是什么）**
- 主导情感：用1-2个词概括（如：悲伤、愤怒、恐惧、希望、绝望）
- 情感强度：微妙/明显/强烈/爆发
- 情感来源：为什么会有这种情感？（来自对话/来自动作/来自环境）
- 例如："悲伤-强烈-来自诊断书显示晚期癌症"

**第三步：戏剧目的（这个场景要达成什么）**
- 推进剧情：揭示了什么信息？制造了什么冲突？
- 建立关系：展现了角色间的什么关系？
- 角色成长：角色有什么改变或觉醒？
- 情感释放：情绪如何被表达或压抑？
- 例如："推进剧情-揭示了绝症真相，制造角色与命运的冲突"

**第四步：关键视觉（最震撼的画面是什么）**
- 核心画面：哪个瞬间最能传达情感？（捕捉最动人的时刻）
- 视觉焦点：观众的目光应该看哪里？（最应该突出的元素）
- 情感载体：情感通过什么视觉元素传达？（光线/色彩/构图/表情/动作）
- 例如："核心画面：小明双手颤抖着拿着诊断书，眼泪滴落在纸张上；视觉焦点：诊断书的字迹和眼泪；情感载体：眼泪、颤抖的手、悲伤的表情"

**第五步：角色状态（每个角色在这个场景中是什么状态）**
- 外在状态：他在做什么？姿势如何？表情如何？
- 内在状态：他在想什么？情绪如何？动机是什么？
- 状态细节：具体的视觉表现（手部动作、眼神方向、身体姿态）
- 例如："外在：双手紧握诊断书，肩膀剧烈颤抖，眼泪流淌；内在：面对死亡的恐惧，对未来的绝望；细节：指节因用力而发白，眼泪从眼角滑落经过脸颊"

**第六步：画面想象（如果让你画一张最贴切的图，你会画什么）**
- 时间：什么时候？（清晨/正午/黄昏/深夜）
- 地点：在哪里？（室内/室外，具体环境）
- 光线：如何打光？（自然光/人造光，光的方向/强度/色温）
- 色彩：什么色调？（暖色/冷色/对比色）
- 构图：如何构图？（景别/角度/人物位置）
- 动作/表情：人物在做什么？什么表情？
- 道具/环境：关键道具是什么？环境细节有哪些？
- 氛围：整体氛围如何？

## 示例分析

### 示例场景1
**剧本内容**："深夜的医院走廊，小明拿着诊断书，双手颤抖，眼泪流下"

**深度理解**：
- 故事摘要：小明在医院走廊看到晚期癌症的诊断书，崩溃大哭
- 情感内核：悲伤-强烈-来自绝症的打击
- 戏剧目的：情感释放-角色面对死亡的绝望
- 关键视觉：双手颤抖的特写，诊断书上的字迹，眼泪滴落
- 角色状态：外在-手部颤抖、泪流满面、肩膀下沉；内在-恐惧、绝望、崩溃；细节-指节发白、眼泪滑落的轨迹
- 画面想象：深夜医院走廊，冷色调 fluorescent lights 顶部照明，小明站立在走廊中央，中景到特写的构图，聚焦他颤抖的双手和哭泣的脸庞，背景是模糊的走廊墙壁，地面可能有散落的纸巾，整体氛围压抑、冰冷、绝望

### 示例场景2
**剧本内容**："小芳在公园长椅上，手里拿着结婚戒指，微笑着看向远方"

**深度理解**：
- 故事摘要：小芳独自坐在公园长椅上，看着结婚戒指，露出发自内心的微笑
- 情感内核：希望-温和-来自对未来的憧憬
- 戏剧目的：角色成长-从悲伤中走出来，找到新的希望
- 关键视觉：结婚戒指在阳光下闪光，小芳的微笑，远方的天空
- 角色状态：外在-手指轻抚戒指、嘴角上扬、眼神明亮；内在-希望、释然、期待；细节-戒指的金属光泽、眼角的笑纹、舒展的眉头
- 画面想象：黄昏时分的公园长椅，golden hour 的温暖光线从侧面照射，小芳坐在长椅右侧，正面到侧面的角度，特写戒指和微笑的脸庞，背景是模糊的绿植和夕阳的天空，整体氛围温暖、充满希望、诗意

## 待分析剧本

${storyboard.scenes.map((scene: any, index: number) => {
  const characters = sceneCharactersMap[scene.sceneNumber] || [];
  return `
=== 场景${scene.sceneNumber} ===

【分镜信息】
- 场景类型：${scene.shotType}
- 角度：${scene.cameraAngle}
- 运镜：${scene.cameraMovement}
- 构图：${scene.composition}
- 人物位置：${scene.characterPosition}
- 光线：${scene.lighting}
- 色温：${scene.colorTemperature}
- 氛围：${scene.mood}

【出场人物】
${characters.map((c: any) => `- ${c.name}：${c.gender}，${c.appearance}，${c.outfit}`).join('\n')}

【原始提示词】
${scene.prompt}

【请你深度分析这个场景】
`;
}).join('\n')}

## 返回格式（严格JSON）

\`\`\`json
{
  "sceneAnalysis": [
    {
      "sceneNumber": 1,
      "storySummary": "用一句话概括这个场景发生了什么",
      "emotionCore": {
        "dominantEmotion": "主导情感（如：悲伤/愤怒/恐惧/希望/绝望）",
        "intensity": "微妙/明显/强烈/爆发",
        "source": "情感来源（来自对话/来自动作/来自环境）"
      },
      "dramaticPurpose": "戏剧目的（推进剧情/建立关系/角色成长/情感释放-具体说明）",
      "keyVisual": {
        "coreMoment": "最震撼的瞬间是什么",
        "visualFocus": "观众的目光应该看哪里",
        "emotionCarrier": "情感通过什么视觉元素传达"
      },
      "characterStates": [
        {
          "name": "角色名称",
          "externalState": "外在状态：他在做什么，姿势如何，表情如何",
          "internalState": "内在状态：他在想什么，情绪如何，动机是什么",
          "visualDetails": "状态细节：具体的视觉表现"
        }
      ],
      "sceneImagination": "画面想象：时间、地点、光线、色彩、构图、动作/表情、道具/环境、氛围"
    }
  ]
}
\`\`\`

请深度理解每个场景，不要套用模板，真正读懂剧本。`;

    // 调用LLM进行剧本深度分析
    console.log('步骤1：深度分析剧本情感和视觉...');
    
    const scriptAnalysisMessages = [
      { role: 'system' as const, content: '你是专业的电影剧本分析师，擅长深度理解剧本的情感内核和视觉本质。' },
      { role: 'user' as const, content: scriptAnalysisPrompt },
    ];

    let scriptAnalysisResponse: any;
    try {
      scriptAnalysisResponse = await llmClient.invoke(scriptAnalysisMessages, {
        model: 'doubao-seed-1-6-flash-250615',
        temperature: 0.3
      });

      console.log('剧本分析完成');
      console.log('分析结果:', scriptAnalysisResponse.content);

      // 提取分析结果JSON
      let analysisJsonContent = scriptAnalysisResponse.content.trim();
      analysisJsonContent = analysisJsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const firstBraceIndex = analysisJsonContent.indexOf('{');
      if (firstBraceIndex === -1) {
        console.warn('剧本分析解析失败：未找到JSON起始标记');
        throw new Error('无法解析剧本分析结果：未找到JSON起始标记');
      }

      let braceCount = 0;
      let jsonString = '';
      for (let i = firstBraceIndex; i < analysisJsonContent.length; i++) {
        const char = analysisJsonContent[i];
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        jsonString += char;
        if (braceCount === 0) break;
      }

      const analysisData = JSON.parse(jsonString);
      analysisData.sceneAnalysis.forEach((item: any) => {
        sceneAnalysisMap[item.sceneNumber] = item;
      });

      console.log(`已完成 ${Object.keys(sceneAnalysisMap).length} 个场景的深度分析`);

    } catch (error) {
      console.warn('剧本分析失败，跳过此步骤:', error);
    }

    // ==================== 第二步：基于分析生成prompt ====================
    // 基于深度分析结果，生成简化但精准的prompt

    const promptGenerationPrompt = `你是一位专业的电影美术指导，擅长将剧本理解转化为精准的视觉prompt。

你的核心使命：基于剧本的深度分析，生成每个场景的AI生图prompt。

## Prompt生成原则

**核心原则：prompt要简洁、精准、画面感强**

不要使用复杂的结构，直接描述画面应该是什么样子。

### Prompt应该包含的元素

**1. 画面核心（最重要）**
- 最震撼的瞬间是什么（来自剧本分析）
- 画面应该呈现什么核心内容
- 例如："A young man holding a medical diagnosis document, hands trembling, tears streaming down his face"

**2. 人物细节（必须准确）**
- 每个角色的species、gender、age
- 外貌特征（头发、眼睛、体型等）
- 服装细节
- 姿态和动作
- 表情和眼神
- 例如："male, Asian, 25 years old, short black hair, wearing a blue hoodie, standing with hunched shoulders, hands clutching a paper, eyes red from crying"

**3. 画面想象细节（来自剧本分析）**
- 时间：time of day
- 地点：location and environment details
- 光线：lighting direction, intensity, color
- 色彩：color temperature and palette
- 构图：shot type, camera angle, character position
- 道具：key props in the scene
- 氛围：overall mood and atmosphere

**4. 情感氛围强化**
- 使用情感相关的形容词（tense, melancholic, hopeful, menacing, serene, etc.）
- 通过光影和色彩强化情感
- 例如："melancholic atmosphere, cold fluorescent lighting, blue color palette, feeling of despair"

**5. 画风关键词（必须包含）**
- 确保画风一致性
- 使用画风关键词：${artStyleKeywordsMap[storyboard.artStyle || '写实风格'] || 'photorealistic, 8k, ultra detailed, realistic lighting, cinematic'}

**6. 电影质感词汇**
- cinematic lighting, dramatic shadows, depth of field
- professional photography quality

### Prompt的格式（简化版）

不要使用复杂的结构，直接用自然语言描述画面：

\`\`\`
[人物详细信息] + [核心动作和表情] + [环境和光线] + [情感氛围] + [画风关键词] + [电影质感词汇]
\`\`\`

例如：
\`\`\`
A male Asian 25-year-old with short black hair, wearing a blue hoodie, standing in a hospital corridor at night. His hands are trembling as he holds a medical diagnosis document, tears streaming down his face, shoulders slumped forward in despair. The scene is lit by cold fluorescent overhead lights, creating harsh shadows on his face. Blue color palette, melancholic and desperate atmosphere. Photorealistic, 8k, ultra detailed, realistic lighting, cinematic lighting, dramatic shadows, depth of field.
\`\`\`

## 剧本分析结果

${Object.entries(sceneCharactersMap).map(([sceneNum, characters]: [string, any]) => {
  const analysis = sceneAnalysisMap[parseInt(sceneNum)];
  const scene = storyboard.scenes.find((s: any) => s.sceneNumber === parseInt(sceneNum));
  if (!scene) return '';
  
  return `
=== 场景${sceneNum} ===

【深度分析结果】
${analysis ? `
- 故事摘要：${analysis.storySummary}
- 情感内核：${analysis.emotionCore.dominantEmotion}（${analysis.intensity}）- ${analysis.emotionCore.source}
- 戏剧目的：${analysis.dramaticPurpose}
- 关键视觉：${analysis.keyVisual.coreMoment}
- 画面想象：${analysis.sceneImagination}

【角色状态】
${analysis.characterStates.map((cs: any) => `- ${cs.name}：${cs.externalState}，${cs.visualDetails}`).join('\n')}
` : `
[分析结果缺失，使用原始分镜信息]
- 原始提示词：${scene.prompt}
- 氛围：${scene.mood}
`}

【角色信息】
${characters.map((c: any) => `- ${c.name}：${c.gender}，${c.ethnicity}，${c.appearance}，${c.outfit}，${c.expression}`).join('\n')}

【请生成此场景的prompt】
`;
}).join('\n')}

## 返回格式（严格JSON）

\`\`\`json
{
  "prompts": [
    {
      "sceneNumber": 1,
      "prompt": "完整的英文生图prompt，简洁、精准、画面感强，包含：人物详细信息 + 核心动作和表情 + 环境和光线 + 情感氛围 + 画风关键词 + 电影质感词汇"
    }
  ]
}
\`\`\`

请基于剧本的深度分析，生成每个场景的精准prompt。`;

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

      const imagesPerScene = body.imagesPerScene || 1; // 每个场景生成1张图片
      console.log(`  为场景${scene.sceneNumber}生成 ${imagesPerScene} 张图片...`);

      // 为每个场景生成多张图片
      const sceneImages: string[] = [];
      for (let i = 0; i < imagesPerScene; i++) {
        // 为每张图片添加一点变化（可选）
        const variationPrompt = i === 0 ? enhancedPrompt : `${enhancedPrompt}, variation ${i + 1}`;

        const imageResponse = await imageClient.generate({
          prompt: variationPrompt,
          image: referenceImage,
          size: imageSize,
          watermark: false,
          responseFormat: 'url',
        });

        const helper = imageClient.getResponseHelper(imageResponse);

        if (!helper.success || helper.imageUrls.length === 0) {
          console.warn(`场景${scene.sceneNumber}的第${i+1}张图片生成失败，跳过`);
          continue;
        }

        sceneImages.push(helper.imageUrls[0]);
        console.log(`  ✓ 场景${scene.sceneNumber} - 图片${i+1}/${imagesPerScene} 生成成功`);
      }

      if (sceneImages.length === 0) {
        throw new Error(`生成场景${scene.sceneNumber}关键帧失败：所有图片生成均失败`);
      }

      console.log(`✓ 完成场景${scene.sceneNumber}，共生成 ${sceneImages.length} 张图片`);
      return { scene, imageUrls: sceneImages };
    });

    // 等待所有关键帧生成完成
    const keyframeResults = await Promise.all(keyframePromises);

    // 按场景编号顺序整理关键帧
    const keyframes: KeyframeScene[] = keyframeResults.flatMap(result =>
      (result as any).imageUrls.map((imageUrl: string, index: number) => ({
        sceneNumber: result.scene.sceneNumber,
        prompt: result.scene.prompt,
        imageUrl: imageUrl,
        variationIndex: index, // 标记是第几张图片
      }))
    );

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
