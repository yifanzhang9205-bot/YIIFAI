import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import axios from 'axios';

// XiguAPI配置
const XIGUAPI_CONFIG = {
  endpoint: 'https://tasks.xiguapi.tech/',
  apiKey: 'w8n-cYYtSMwKtG6ghPyEykfbh8pl',
  model: 'nanobananapro',
};

// XiguAPI - 提交图片生成任务
async function submitXiguApiTask(
  prompt: string,
  resolution: string = '1K',
  aspectRatio: string = '3:4'
): Promise<{ taskId: string }> {
  const requestData = {
    prompt,
    model: XIGUAPI_CONFIG.model,
    resolution,
    aspect_ratio: aspectRatio,
  };

  console.log(`  请求数据:`, JSON.stringify(requestData, null, 2));

  const response = await axios.post(XIGUAPI_CONFIG.endpoint, requestData, {
    headers: {
      'Authorization': `Bearer ${XIGUAPI_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`  响应数据:`, JSON.stringify(response.data, null, 2));

  // API返回格式：{ success: true, taskId: "xxx", status: "queued" }
  if (response.data.success === true && response.data.taskId) {
    return { taskId: response.data.taskId };
  }

  throw new Error(`提交任务失败: ${JSON.stringify(response.data)}`);
}

// XiguAPI - 轮询任务结果
async function pollXiguApiResult(
  taskId: string,
  maxAttempts: number = 60,
  pollInterval: number = 3000
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 使用POST方法轮询任务状态
      const response = await axios.post(XIGUAPI_CONFIG.endpoint, {
        taskId,
      }, {
        headers: {
          'Authorization': `Bearer ${XIGUAPI_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = response.data;

      // 调试：打印完整返回数据
      if (attempt === 1 || result.status === 'success') {
        console.log(`  轮询返回数据:`, JSON.stringify(result, null, 2));
      }

      if (result.success && result.status === 'success') {
        // 从 result.images[0] 获取图片URL
        if (result.result?.images?.[0]) {
          const imageUrl = result.result.images[0];
          console.log(`  ✓ 找到图片URL (result.images[0]): ${imageUrl.substring(0, 50)}...`);
          return imageUrl;
        }
        throw new Error(`任务完成但未返回图片URL。返回数据: ${JSON.stringify(result)}`);
      }

      // 检查失败状态
      if (result.status === 'failed' || result.status === 'error') {
        throw new Error(result.message || result.error?.message || '任务执行失败');
      }

      console.log(`  轮询任务 ${taskId}: ${result.status || 'processing'} (${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error: any) {
      if (attempt === maxAttempts) {
        throw error;
      }
      console.warn(`  轮询失败 (${attempt}/${maxAttempts}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error(`任务超时：超过${maxAttempts}次轮询仍未完成`);
}

// 根据宽高比和模式计算分辨率
// XiguAPI支持：'1K', '512x912' 等格式
function getResolution(aspectRatio: string, fastMode: boolean): string {
  // 标准模式统一使用1K
  // 快速模式根据宽高比使用不同的分辨率
  if (fastMode) {
    const fastResolutionMap: Record<string, string> = {
      '16:9': '512x288',
      '9:16': '288x512',
      '4:3': '512x384',
      '3:4': '512x912',
      '1:1': '512x512',
    };
    return fastResolutionMap[aspectRatio] || '512x912';
  } else {
    // 标准模式都使用1K（API会根据aspectRatio自动调整）
    return '1K';
  }
}

interface CharacterRequest {
  script: any; // MovieScript
  artStyle: string;
  artStyleStrength?: number; // 0-100, 画风强度
  fastMode?: boolean; // 快速预览模式（低分辨率）
  aspectRatio?: string; // 宽高比：'16:9', '9:16', '4:3', '3:4', '1:1'，默认'3:4'
}

interface CharacterInfo {
  name: string;
  role: string; // 角色：主角/配角等
  relationship: string; // 与其他人物的关系
  ethnicity: string; // 种族/族裔
  age: string;
  gender: string;
  description: string;
  appearance: string;
  outfit: string;
  expression: string;
  prompt: string;
}

interface CharacterDesign {
  unifiedSetting: {
    ethnicity: string; // 统一种族
    artStyleKeywords: string; // 统一画风关键词
    familyTraits: string; // 家族共同特征
  };
  characters: CharacterInfo[];
  characterImages: string[]; // 图片URL
}

// 生成人物设定
export async function POST(request: NextRequest) {
  try {
    const body: CharacterRequest = await request.json();
    const { script, artStyle, artStyleStrength = 80, fastMode = false, aspectRatio = '3:4' } = body;

    if (!script || !script.scenes) {
      return NextResponse.json(
        { error: '剧本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const llmClient = new LLMClient(config);

    console.log('✅ 使用XiguAPI默认配置生成人物图片');
    console.log(`   模型: ${XIGUAPI_CONFIG.model}`);

    // 定义画风关键词映射（确保前后一致，优化适配Nanobanana3模型）
    const artStyleKeywordsMap: Record<string, string> = {
      // 写实类
      '写实风格': 'photorealistic, hyperrealistic, 8k, ultra detailed, realistic lighting, cinematic, professional photography, sharp focus, depth of field',
      '电影质感': 'cinematic, film grain, dramatic lighting, professional cinematography, high detail, movie still, anamorphic lens, color graded',
      '纪录片风格': 'documentary style, natural lighting, authentic, raw, handheld camera, photojournalism, candid, real life, unpolished',
      '新闻摄影': 'photojournalism, candid, authentic, documentary style, natural lighting, news photography, editorial, reportage style',
      '商业摄影': 'commercial photography, high key lighting, clean, polished, professional, advertising, product photography, magazine quality',

      // 动漫/漫画类
      '动漫风格': 'anime style, anime art, Japanese animation, vibrant colors, detailed character design, manga aesthetic, cel shading, 2D animation',
      '漫画风格': 'manga style, Japanese comic style, black and white manga, detailed line art, screentone, comic book style, graphic novel',
      '赛璐璐风格': 'cel shaded anime, bold outlines, flat colors, simplified shading, animation style, 2D anime aesthetic, cel shading technique',
      '吉卜力风格': 'Studio Ghibli style, Hayao Miyazaki art, Japanese anime, hand drawn, soft watercolor palette, whimsical, fantasy adventure, detailed background art',
      '新海诚风格': 'Makoto Shinkai style, beautiful anime scenery, hyper detailed backgrounds, emotional lighting, vibrant colors, atmospheric clouds, lens flare, photorealistic anime',
      '宫崎骏风格': 'Hayao Miyazaki style, Studio Ghibli, fantasy anime, hand drawn, magical realism, whimsical, soft colors, detailed animation, emotional storytelling',

      // 卡通/插画类
      '卡通风格': 'cartoon style, animated cartoon, vibrant colors, clean lines, expressive characters, cartoon network style, 2D animation',
      '迪士尼风格': 'Disney animation style, Disney art style, expressive characters, vibrant saturated colors, clean lines, magical, polished animation',
      '皮克斯风格': 'Pixar style, 3D animation, CGI animation, expressive characters, detailed textures, subsurface scattering, family friendly, lighting based shading',
      '儿童绘本': 'childrens book illustration, picture book art, whimsical, watercolor, hand drawn, cute, colorful, soft pastel colors, childrens book aesthetic',
      '矢量插画': 'vector illustration, flat design, clean lines, minimalist, geometric, graphic design, vector art, digital illustration',
      '涂鸦风格': 'street art graffiti, urban art, spray paint style, bold vibrant colors, expressive, edgy, street art aesthetic, mural style',

      // 艺术绘画类
      '水彩风格': 'watercolor painting, watercolor art, soft edges, artistic, dreamy, watercolor texture, paint splatters, watercolor medium',
      '油画风格': 'oil painting, traditional oil on canvas, textured, classic art, oil brushstrokes, rich colors, impasto technique, museum quality',
      '素描风格': 'pencil sketch, charcoal drawing, graphite, detailed line art, traditional art, black and white, sketch style, pencil drawing',
      '粉彩风格': 'pastel art, soft pastel colors, gentle, dreamy, delicate, muted palette, pastel medium, chalk art',
      '版画风格': 'printmaking, linocut, woodcut, bold lines, limited colors, traditional printmaking, relief printing, carved block print',
      '波普艺术': 'Pop Art, Andy Warhol style, bold vibrant colors, comic book style, halftone dots, screen print aesthetic, 1960s pop art, commercial art style',

      // 传统文化类
      '水墨风格': 'Chinese ink painting, sumi-e, traditional Chinese art, brush strokes, minimalist, black ink on rice paper, calligraphy, Zen aesthetic',
      '浮世绘风格': 'Japanese ukiyo-e, woodblock print, Edo period, flat colors, wave patterns, traditional Japanese art, Japanese printmaking',
      '敦煌壁画': 'Dunhuang mural style, ancient Chinese Buddhist art, vibrant mineral pigments, gold leaf, religious art, cave painting style, Silk Road art',
      '唐卡风格': 'Tibetan thangka, Tibetan Buddhist art, vibrant colors, intricate detailed patterns, religious imagery, gold leaf, traditional Tibetan painting',
      '和风': 'Japanese traditional style, Japanese aesthetic, minimal, Zen, delicate patterns, soft colors, Japanese cultural elements, traditional Japan',

      // 特定时期/流派
      '复古油画': 'vintage painting, classical art, renaissance, rich textures, aged',
      '印象派': 'impressionism, soft light, visible brushstrokes, monet style, dreamy atmosphere',
      '野兽派': 'fauvism, bold colors, expressive, intense, matisse style',
      '超现实主义': 'surrealism, dreamlike, salvador dali style, bizarre, symbolic',
      '包豪斯': 'bauhaus style, geometric, minimalist, functional, modernist design',

      // 科幻/未来类
      '赛博punk': 'cyberpunk, neon lights, futuristic, high tech dystopian, rain, holographic signs, Blade Runner aesthetic, night city, cybernetic, digital',
      '科幻未来': 'science fiction, futuristic, high tech, space age, clean design, advanced technology, future city, space exploration concept art',
      '废土风格': 'post apocalyptic, wasteland, dystopian, gritty, abandoned, atmospheric, decayed buildings, Mad Max aesthetic, nuclear wasteland',
      '太空歌剧': 'space opera, epic space, grand cosmic scale, starships, alien worlds, deep space, interstellar, sci-fi concept art, space opera aesthetic',

      // 奇幻/魔法类
      '暗黑哥特': 'dark fantasy, gothic, horror, eerie atmosphere, dramatic lighting',
      '奇幻史诗': 'high fantasy, epic, magical, tolkien style, grand scale, mythical creatures',
      '魔法少女': 'magical girl anime style, cute, sparkles, pastel colors, anime, dreamy',
      '童话风格': 'fairy tale style, whimsical, magical, enchanted, storybook illustration',

      // 机械/工业类
      '蒸汽朋克': 'steampunk, victorian, brass gears, steam, industrial, ornate',
      '柴油朋克': 'dieselpunk, 1940s retro, industrial, gritty, diesel machinery',
      '原子朋克': 'atompunk, 1950s retro, atomic age, bright colors, streamlined design',

      // 数字/现代类
      '像素风格': 'pixel art, 8-bit, retro, blocky, vibrant colors',
      '低多边形': 'low poly, geometric, flat shading, minimalist, 3D render',
      '霓虹艺术': 'neon art, glowing, vibrant, retro 80s, synthwave, electric colors',
      '故障艺术': 'glitch art, digital distortion, cyberpunk, vhs effect, corrupted data',
      '等距视角': 'isometric view, 2.5D, pixel art, clean lines, detailed geometry',

      // 其他风格
      '黏土动画': 'claymation, clay animation, stop motion, textured, hand crafted',
      '剪纸艺术': 'paper cut art, papercraft, layered, intricate, colorful',
      '针线艺术': 'thread art, embroidery style, textile art, detailed stitching',
      '玻璃艺术': 'stained glass, colorful, translucent, intricate patterns, religious art',
      '极简主义': 'minimalism, clean, simple, negative space, elegant, modern',
      '抽象艺术': 'abstract art, geometric, expressive, bold colors, modern',
      '3D渲染': '3D render, raytracing, realistic materials, studio lighting, high detail',
    };

    // 获取当前画风的关键词
    const baseKeywords = artStyleKeywordsMap[artStyle] || artStyleKeywordsMap['写实风格'];
    
    // 根据画风强度调整关键词权重
    // artStyleStrength: 0-100, 0=写实平衡, 100=风格强烈
    const strengthWeight = artStyleStrength / 100;
    const currentArtStyleKeywords = strengthWeight >= 0.5 
      ? baseKeywords 
      : `photorealistic, ${baseKeywords}`; // 强度较低时增加写实关键词平衡

    // 步骤1：提取所有人物
    const allCharacters = Array.from(new Set(
      script.scenes.flatMap((s: any) => s.characters || [])
    ));

    if (allCharacters.length === 0) {
      return NextResponse.json(
        { error: '剧本中没有人物信息' },
        { status: 400 }
      );
    }

    // 步骤1.5：分析每个角色在剧本中的出场场景和形象约束
    const characterSceneAnalysis = allCharacters.map(charName => {
      const charScenes = script.scenes.filter((s: any) =>
        s.characters && s.characters.includes(charName)
      );

      return {
        name: charName,
        scenes: charScenes.map((s: any) => ({
          sceneNumber: s.sceneNumber,
          location: s.location,
          timeOfDay: s.timeOfDay,
          mood: s.mood,
          action: s.action,
          emotionalBeat: s.emotionalBeat,
          visualHook: s.visualHook,
        })),
        sceneCount: charScenes.length,
      };
    });

    // 步骤2：分析人物关系和统一设定
    const relationshipPrompt = `你是一位获奖的角色设计师和造型师，深谙角色设计心理学、视觉符号学和叙事功能。
你的核心使命：创造**令人难忘、一眼识别、情感共鸣**的角色，每个角色都必须是独立的个体，有独特的视觉标识。

## 【关键】从剧本中准确提取角色信息

**剧本中的角色名已标注性别**：
- 注意角色名中已明确标注性别，如："小明（男）"、"小芳（女）"、"母亲（女）"、"父亲（男）"
- **必须严格使用剧本标注的性别**，不能更改
- 如果剧本中首次出现角色，会包含外貌描述（在action字段中），必须提取这些外貌特征

**角色出场场景分析**：
- 观察每个角色在哪些场景出现
- 分析角色的动作、情感节拍、视觉钩子
- 理解角色在故事中的定位和功能

## 角色设计思维（一致性 + 独特性）

**核心原则：每个角色都必须是独特的个体，同时保持血缘关系的视觉一致性**

**1. 血缘一致性（Family Consistency）**
- **统一种族**：所有角色必须有明确的种族归属（东亚人、白人、黑人等）
- **家族特征**：家族成员共享3-5个核心特征（如：深色眼睛、高鼻梁、方形脸型）
- **血缘关系识别**：通过相似的特征让观众一眼识别血缘关系
- **避免混淆**：父子、母女必须有明确的性别特征区分

**2. 个体独特性（Individual Uniqueness）**
- **每个角色必须有5个以上独特的视觉标识**：
  - 独特的发型（长度、颜色、造型）
  - 独特的五官特征（眼睛形状、鼻子特点、嘴巴样式）
  - 独特的配饰（眼镜、首饰、特殊物品）
  - 独特的服装风格（颜色、材质、款式）
  - 独特的体态和姿态
- **避免"模板化"**：不要让所有角色长得像兄弟姐妹
- **一眼识别**：即使剪影也要能区分不同角色

**3. 外貌即性格（Appearance Reveals Character）**
- **每个特征都要有含义**：
  - 坚毅：下颌线分明，眼神坚定，姿态挺拔
  - 内向：眼神游移，身体微微含胸，姿态收敛
  - 天真：圆脸，大眼睛，表情开放，姿态自然
  - 复杂：面部有故事感（疤痕、皱纹），眼神有层次
- **表情即心理**：默认表情要反映角色核心性格
- **姿态即状态**：站姿、坐姿、走路方式都要符合角色性格

**4. 服装即身份（Costume Defines Role）**
- **主角**：服装有标志性，便于观众识别
- **反派**：服装有威胁性，色彩和设计传达对立
- **配角**：服装简洁，不抢主角风头，但有功能性
- **时代适配**：服装必须符合故事时代背景（古代/现代/未来）

**5. 动物角色（如果有）**
- 动物也必须有明确的种族和特征一致性
- 动物的毛色、体型、姿态都要独特
- 动物道具（项圈、衣服）要服务于角色功能

## 角色分析维度（详细）

对于每个角色，必须详细分析：
1. **角色定位**：主角/反派/配角/工具人？在故事中的核心功能
2. **性格核心**：3-5个最核心的性格特质（如：勇敢+固执+善良）
3. **情感弧光**：起点状态 → 关键转折 → 终点状态，详细描述
4. **内心冲突**：角色有什么内在矛盾或困境？
5. **视觉符号**：5个以上独特视觉元素（发型、五官、配饰、服装、体态）
6. **性别特征**：**必须从剧本角色名中提取，保持一致**

## 返回格式（严格JSON）

\`\`\`json
{
  "relationships": [
    {"name": "角色名（保留剧本中的性别标注）", "role": "角色类型（主角/反派/配角/动物等）", "relationship": "与他人关系（明确血缘：父子/母女/夫妻/朋友）", "age": "年龄", "gender": "性别（必须与剧本标注一致：男/女）"}
  ],
  "unifiedSetting": {
    "ethnicity": "统一种族（必须明确：东亚人/白人/黑人/拉丁裔/南亚人，确保血缘关系一致）",
    "artStyleKeywords": "画风关键词：${currentArtStyleKeywords}",
    "familyTraits": "家族共同特征（3-5个，如：深色眼睛、高鼻梁、方形脸型、厚嘴唇，用于强化血缘关系）"
  },
  "characters": [
    {
      "name": "角色名（保留剧本中的性别标注）",
      "role": "角色定位（主角/反派/配角/动物/等）",
      "relationship": "关系描述",
      "ethnicity": "种族（必须与统一设定一致）",
      "age": "年龄",
      "gender": "性别（必须与剧本标注一致：男/女，**不能更改**）",
      "description": "角色背景和性格分析（核心性格特质、情感弧光详细描述、内心冲突、在故事中的功能）",
      "appearance": "外貌设计（必须详细描述：1.统一种族特征 2.明确性别特征（如男性特征：宽下巴、粗眉毛；女性特征：柔和脸型、细腻五官） 3.反映性格的5个以上独特面部特征 4.独特发型 5.姿态和体态 6.3个以上独特视觉符号（疤痕、痣、配饰等）",
      "outfit": "服装设计（必须符合角色定位、时代背景、故事需求，包含：颜色、材质、款式、标志性元素）",
      "expression": "默认表情设计（详细描述反映角色核心性格的面部表情，包括眼神、嘴型、眉毛等细节）",
      "prompt": "英文生图提示词（**必须严格包含以下要素，顺序很重要**）：【性别关键词】${currentArtStyleKeywords} + 【种族关键词】 + 【家族共同特征】 + 【5个以上独特外貌特征】 + 【独特发型】 + 【服装细节】 + 【表情细节】 + 【姿态】。**强制要求**：开头必须是'man, male'或'woman, female'，中间包含画风关键词和种族关键词，结尾包含家族特征。示例：'man, male, ${currentArtStyleKeywords}, East Asian, ${familyTraits}, short black hair, glasses, wearing black jacket, standing confidently, determined expression'"
    }
  ]
}
\`\`\`

## 剧本分析

【故事概况】
标题：《${script.title}》
类型：${script.genre}
核心冲突：${script.logline}
情感弧线：${script.emotionalArc}
视觉风格：${script.visualStyle}

【角色出场场景分析】
${characterSceneAnalysis.map(analysis => `
【${analysis.name}】
- 出场频次：${analysis.sceneCount}个场景
- 场景分布：
${analysis.scenes.map((s: any) => `  场景${s.sceneNumber}：${s.location}（${s.timeOfDay}）
    - 动作：${s.action}
    - 情绪：${s.mood}
    - 情感节拍：${s.emotionalBeat}
    - 视觉钩子：${s.visualHook}`).join('\n')}
`).join('\n\n')}

## 创作要求

1. **深度理解角色**：不要只看角色名，要理解角色在故事中的功能和定位
2. **外貌即性格**：每个面部特征、姿态、表情都要反映角色性格
3. **视觉叙事**：角色设计要服务于故事的情感和主题
4. **一致性与独特性并重**：家族成员要有一致性，但每个人要有独特性
5. **强制包含关键词**：prompt必须包含：
   - 性别关键词：male/man 或 female/woman
   - 画风关键词：${currentArtStyleKeywords}
   - 种族关键词（统一）
   - 家族特征（统一）

请以专业角色设计师的思维，创造有灵魂、有故事感的角色。`;

    const relationshipMessages = [
      { role: 'system' as const, content: '你是专业的人物关系分析师，确保逻辑一致性。' },
      { role: 'user' as const, content: relationshipPrompt },
    ];

    const relationshipResponse = await llmClient.invoke(relationshipMessages, {
      model: 'doubao-seed-1-6-flash-250615', // 使用快速模型
      temperature: 0.5
    });

    // 提取JSON - 移除markdown标记
    let jsonContent = relationshipResponse.content.trim();

    // 移除可能的markdown代码块标记
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // 提取JSON（支持嵌套）
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('LLM返回内容:', relationshipResponse.content);
      throw new Error('无法解析人物关系设定，返回格式不正确');
    }

    const characterData: any = JSON.parse(jsonMatch[0]);

    // 步骤3：校验一致性（自检逻辑）
    const unifiedEthnicity = characterData.unifiedSetting.ethnicity;
    const characters = characterData.characters;

    // 【关键】从剧本角色名中提取性别信息，确保一致性
    const extractGenderFromName = (charName: string): string => {
      if (charName.includes('（女）') || charName.includes('(女)') || charName.includes('（女性）') || charName.includes('(女性)')) {
        return '女';
      } else if (charName.includes('（男）') || charName.includes('(男)') || charName.includes('（男性）') || charName.includes('(男性)')) {
        return '男';
      }
      // 如果没有标注，从角色名本身判断
      if (['母亲', '妈妈', '女儿', '姐妹', '妻子'].some(kw => charName.includes(kw))) {
        return '女';
      } else if (['父亲', '爸爸', '儿子', '兄弟', '丈夫'].some(kw => charName.includes(kw))) {
        return '男';
      }
      return '';
    };

    // 检查并修正性别
    characters.forEach((c: CharacterInfo) => {
      const scriptGender = extractGenderFromName(c.name);
      
      if (scriptGender) {
        // 如果剧本中有性别标注，强制使用剧本标注
        if (c.gender !== scriptGender) {
          console.warn(`角色${c.name}的性别与剧本标注不一致，强制修正为：${scriptGender}`);
          c.gender = scriptGender;
        }
      } else {
        // 如果剧本中没有标注，检查关系的性别逻辑
        const gender = c.gender.toLowerCase();
        const relationship = c.relationship.toLowerCase();

        // 父亲/儿子必须男性
        if ((relationship.includes('父亲') || relationship.includes('father') || relationship.includes('儿子') || relationship.includes('son')) &&
            !(gender.includes('男') || gender.includes('male') || gender.includes('man'))) {
          console.warn(`角色${c.name}关系为${c.relationship}，但性别为${c.gender}，强制修正为男性`);
          c.gender = '男';
        }

        // 母亲/女儿必须女性
        if ((relationship.includes('母亲') || relationship.includes('mother') || relationship.includes('女儿') || relationship.includes('daughter')) &&
            !(gender.includes('女') || gender.includes('female') || gender.includes('woman'))) {
          console.warn(`角色${c.name}关系为${c.relationship}，但性别为${c.gender}，强制修正为女性`);
          c.gender = '女';
        }
      }
    });

    // 检查是否有多个种族
    const ethnicities = new Set(characters.map((c: CharacterInfo) => c.ethnicity));
    if (ethnicities.size > 1) {
      console.warn('检测到多种族角色，统一为：', unifiedEthnicity);
      // 强制统一种族
      characters.forEach((c: CharacterInfo) => {
        c.ethnicity = unifiedEthnicity;
        // 更新 prompt 中的种族关键词
        const ethnicityKeywords: Record<string, string> = {
          '东亚人': 'East Asian',
          '白人': 'Caucasian',
          '黑人': 'African',
          '拉丁裔': 'Latino',
          '南亚人': 'South Asian',
        };
        const ethnicityKey = ethnicityKeywords[unifiedEthnicity] || 'mixed race';
        c.prompt = c.prompt.replace(/\b(East Asian|Caucasian|African|Latino|South Asian|mixed race)\b/gi, ethnicityKey);
      });
    }

    // 检查prompt是否包含画风关键词（使用三明治结构强化）
    characters.forEach((c: CharacterInfo) => {
      const promptLower = c.prompt.toLowerCase();

      // 检查是否包含画风关键词
      const hasArtStyle = currentArtStyleKeywords.split(',').some(keyword =>
        promptLower.includes(keyword.trim().toLowerCase())
      );

      if (!hasArtStyle) {
        console.warn(`角色${c.name}的prompt缺少画风关键词，强制添加三明治结构`);
        // 强制在开头添加画风关键词（三明治结构）
        const forcedArtStylePrefix = `CRITICAL ART STYLE: ${currentArtStyleKeywords}. `;
        const forcedArtStyleSuffix = ` Ensure the final image adheres strictly to the ${artStyle} art style.`;

        c.prompt = forcedArtStylePrefix + c.prompt + forcedArtStyleSuffix;
      } else {
        // 即使已有画风关键词，也添加强制性的前后缀
        const reinforceArtStyle = `CRITICAL ART STYLE: ${currentArtStyleKeywords}. `;
        const reinforceArtStyleSuffix = ` Art style must be consistent: ${artStyle}.`;

        c.prompt = reinforceArtStyle + c.prompt + reinforceArtStyleSuffix;
        console.log(`角色${c.name}的prompt已强化画风一致性`);
      }
    });

    // 步骤4：为每个人物生成设定图（分批次生成）
    console.log(`开始分批次生成 ${characters.length} 个人物设定图...`);
    console.log(`模式: ${fastMode ? '快速预览模式' : '标准模式'}`);

    // API限制：每批次最多生成4张图片
    const MAX_BATCH_SIZE = 4;
    const totalCharacters = characters.length;
    const totalBatches = Math.ceil(totalCharacters / MAX_BATCH_SIZE);

    console.log(`\n📊 分批次生成策略：`);
    console.log(`   总人物数: ${totalCharacters}`);
    console.log(`   每批次: ${MAX_BATCH_SIZE}个人物`);
    console.log(`   总批次数: ${totalBatches}`);

    // 分批次生成人物图片
    const allImageResults: any[] = [];

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * MAX_BATCH_SIZE;
      const endIdx = Math.min(startIdx + MAX_BATCH_SIZE, totalCharacters);
      const batchCharacters = characters.slice(startIdx, endIdx);

      console.log(`\n🔄 处理批次 ${batchIndex + 1}/${totalBatches} (人物 ${startIdx + 1}-${endIdx})...`);

      // 构建当前批次人物的prompt
      const batchPrompts = batchCharacters.map((character: CharacterInfo) => {
        const ethnicityMap: Record<string, string> = {
          '东亚人': 'East Asian',
          '白人': 'Caucasian',
          '黑人': 'African',
          '拉丁裔': 'Latino',
          '南亚人': 'South Asian',
        };

        const ethnicityKeyword: string = ethnicityMap[unifiedEthnicity] || 'mixed race';

        // 【关键】强制添加明确的性别关键词（必须放在最前面）
        let genderKeyword = '';
        const gender = character.gender.toLowerCase();
        if (gender.includes('男') || gender.includes('male') || gender.includes('man')) {
          genderKeyword = 'man, male, masculine';
        } else if (gender.includes('女') || gender.includes('female') || gender.includes('woman')) {
          genderKeyword = 'woman, female, feminine';
        } else {
          console.error(`角色${character.name}性别不明确：${character.gender}，使用默认性别`);
          // 如果性别不明确，从角色名中再次提取
          const extractedGender = extractGenderFromName(character.name);
          if (extractedGender) {
            genderKeyword = extractedGender === '男' ? 'man, male, masculine' : 'woman, female, feminine';
          } else {
            genderKeyword = 'man, male, masculine'; // 默认使用男性
          }
        }

        // 使用三明治结构强化画风一致性
        // 前缀：强制画风关键词
        const forcedArtStylePrefix = `CRITICAL ART STYLE: ${currentArtStyleKeywords}. `;
        // 中间：性别 + 种族 + 家族特征 + 角色独特特征
        const corePrompt = `${genderKeyword}, ${ethnicityKeyword}, ${characterData.unifiedSetting.familyTraits}`;
        // 后缀：强化画风关键词和角色prompt
        const forcedArtStyleSuffix = ` Character details: ${character.prompt}. Ensure the final image strictly adheres to the ${artStyle} art style.`;

        const unifiedPrompt = forcedArtStylePrefix + corePrompt + forcedArtStyleSuffix;

        console.log(`  角色${character.name}的prompt结构：`);
        console.log(`    性别关键词: ${genderKeyword}`);
        console.log(`    种族关键词: ${ethnicityKeyword}`);
        console.log(`    画风关键词: ${currentArtStyleKeywords}`);
        console.log(`    Prompt长度: ${unifiedPrompt.length}字符`);

        return { character, prompt: unifiedPrompt };
      });

      // 并发生成当前批次的人物图片
      const resolution = getResolution(aspectRatio, fastMode);

      const batchImagePromises = batchPrompts.map(async ({ character, prompt }: { character: CharacterInfo; prompt: string }) => {
      console.log(`生成人物设定图：${character.name}...`);

      try {
        // 1. 提交任务到XiguAPI
        console.log(`  📤 提交任务到XiguAPI...`);
        const { taskId } = await submitXiguApiTask(
          prompt,
          resolution,
          aspectRatio
        );

        console.log(`  ✅ 任务已提交: ${taskId}`);

        // 2. 轮询任务结果
        console.log(`  ⏳ 轮询任务结果...`);
        const imageUrl = await pollXiguApiResult(taskId, 120, 3000); // 最多6分钟

        console.log(`✓ 完成：${character.name}`);
        return { index: characters.indexOf(character), imageUrl };
      } catch (error: any) {
        console.error(`❌ 生成人物${character.name}失败:`, error.message);
        throw new Error(`生成人物${character.name}设定图失败: ${error.message}`);
      }
    });

    // 等待当前批次完成
    const batchResults = await Promise.all(batchImagePromises);
    allImageResults.push(...batchResults);

    console.log(`✅ 批次 ${batchIndex + 1}/${totalBatches} 完成`);
  }

    // 按原始顺序整理图片URL
    const characterImages: string[] = [];
    allImageResults.sort((a: any, b: any) => a.index - b.index);
    allImageResults.forEach((result: any) => characterImages.push(result.imageUrl));

    console.log(`✓ 所有人物设定图生成完成`);

    const design: CharacterDesign = {
      unifiedSetting: characterData.unifiedSetting,
      characters,
      characterImages,
    };

    return NextResponse.json({
      success: true,
      design,
    });

  } catch (error) {
    console.error('生成人物设定失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成人物设定失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
