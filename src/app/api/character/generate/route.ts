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
  const response = await axios.post(XIGUAPI_CONFIG.endpoint, {
    prompt,
    model: XIGUAPI_CONFIG.model,
    resolution,
    aspect_ratio: aspectRatio,
  }, {
    headers: {
      'Authorization': `Bearer ${XIGUAPI_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.data.code === 200 && response.data.taskid) {
    return { taskId: response.data.taskid };
  }

  throw new Error(response.data.message || '提交任务失败');
}

// XiguAPI - 轮询任务结果
async function pollXiguApiResult(
  taskId: string,
  maxAttempts: number = 60,
  pollInterval: number = 3000
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(`${XIGUAPI_CONFIG.endpoint}${taskId}`, {
        headers: {
          'Authorization': `Bearer ${XIGUAPI_CONFIG.apiKey}`,
        },
      });

      const result = response.data;

      if (result.status === 'completed' || result.status === 'succeeded') {
        if (result.imageUrl || result.image_urls?.[0]) {
          return result.imageUrl || result.image_urls[0];
        }
        throw new Error('任务完成但未返回图片URL');
      }

      if (result.status === 'failed' || result.status === 'error') {
        throw new Error(result.error?.message || result.message || '任务执行失败');
      }

      console.log(`  轮询任务 ${taskId}: ${result.status} (${attempt}/${maxAttempts})`);
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
function getResolution(aspectRatio: string, fastMode: boolean): string {
  const resolutionMap: Record<string, { standard: string; fast: string }> = {
    '16:9': { standard: '1280x720', fast: '512x288' },
    '9:16': { standard: '720x1280', fast: '288x512' },
    '4:3': { standard: '1024x768', fast: '432x324' },
    '3:4': { standard: '720x960', fast: '512x912' },
    '1:1': { standard: '1024x1024', fast: '512x512' },
  };

  const resolution = resolutionMap[aspectRatio] || resolutionMap['3:4'];
  return fastMode ? resolution.fast : resolution.standard;
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

    // 定义画风关键词映射（确保前后一致）
    const artStyleKeywordsMap: Record<string, string> = {
      // 写实类
      '写实风格': 'photorealistic, 8k, ultra detailed, realistic lighting, cinematic',
      '电影质感': 'cinematic, film grain, dramatic lighting, professional photography, high detail',
      '纪录片风格': 'documentary style, natural lighting, authentic, raw, handheld camera feel',
      '新闻摄影': 'photojournalism, candid, authentic, documentary style, natural lighting',
      '商业摄影': 'commercial photography, high key lighting, clean, polished, professional',

      // 动漫/漫画类
      '动漫风格': 'anime style, cel shading, vivid colors, manga, detailed',
      '漫画风格': 'manga style, comic style, black and white manga, detailed line art, anime',
      '赛璐璐风格': 'cel shaded, anime, bold outlines, flat colors, graphic novel style',
      '吉卜力风格': 'ghibli style, studio ghibli, anime, hand drawn, soft colors, whimsical',
      '新海诚风格': 'makoto shinkai style, anime, beautiful scenery, detailed backgrounds, emotional lighting',
      '宫崎骏风格': 'miyazaki hayao style, ghibli, anime, fantasy, hand drawn, magical realism',

      // 卡通/插画类
      '卡通风格': 'cartoon style, vibrant colors, clean lines, expressive, animated',
      '迪士尼风格': 'disney animation style, expressive, vibrant colors, clean lines, magical',
      '皮克斯风格': 'pixar style, 3D animation, expressive, detailed textures, family friendly',
      '儿童绘本': 'childrens book illustration, whimsical, watercolor, hand drawn, cute, colorful',
      '矢量插画': 'vector illustration, flat design, clean lines, minimalist, graphic design',
      '涂鸦风格': 'graffiti style, street art, urban, bold colors, expressive, edgy',

      // 艺术绘画类
      '水彩风格': 'watercolor painting, soft edges, artistic, dreamy, watercolor texture',
      '油画风格': 'oil painting, textured, classic art, oil brushstrokes, rich colors',
      '素描风格': 'pencil sketch, charcoal drawing, detailed line art, traditional art, black and white',
      '粉彩风格': 'pastel art, soft colors, gentle, dreamy, delicate, muted palette',
      '版画风格': 'printmaking, linocut, woodcut, bold lines, limited colors, traditional art',
      '波普艺术': 'pop art, bold colors, comic book style, halftone, vibrant, andy warhol style',

      // 传统文化类
      '水墨风格': 'ink painting, traditional chinese art, brush strokes, minimalist, black ink',
      '浮世绘风格': 'ukiyo-e, japanese woodblock print, traditional, flat colors, wave patterns',
      '敦煌壁画': 'dunhuang mural style, ancient chinese art, vibrant colors, gold leaf, religious art',
      '唐卡风格': 'thangka style, tibetan art, vibrant colors, detailed patterns, religious imagery',
      '和风': 'japanese style, traditional, minimal, zen, delicate patterns, soft colors',

      // 特定时期/流派
      '复古油画': 'vintage painting, classical art, renaissance, rich textures, aged',
      '印象派': 'impressionism, soft light, visible brushstrokes, monet style, dreamy atmosphere',
      '野兽派': 'fauvism, bold colors, expressive, intense, matisse style',
      '超现实主义': 'surrealism, dreamlike, salvador dali style, bizarre, symbolic',
      '包豪斯': 'bauhaus style, geometric, minimalist, functional, modernist design',

      // 科幻/未来类
      '赛博朋克': 'cyberpunk, neon lights, futuristic, high tech, dystopian, glowing',
      '科幻未来': 'science fiction, futuristic, high tech, space age, clean design, advanced',
      '末世废土': 'post apocalyptic, wasteland, dystopian, gritty, abandoned, atmospheric',
      '太空歌剧': 'space opera, epic, grand, cosmic, starships, alien worlds',

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
6. **性别特征**：明确的性别标识，避免模糊不清

## 返回格式（严格JSON）

\`\`\`json
{
  "relationships": [
    {"name": "角色名", "role": "角色类型（主角/反派/配角/动物等）", "relationship": "与他人关系（明确血缘：父子/母女/夫妻/朋友）", "age": "年龄", "gender": "性别（必须明确：男/女）"}
  ],
  "unifiedSetting": {
    "ethnicity": "统一种族（必须明确：东亚人/白人/黑人/拉丁裔/南亚人，确保血缘关系一致）",
    "artStyleKeywords": "画风关键词：${currentArtStyleKeywords}",
    "familyTraits": "家族共同特征（3-5个，如：深色眼睛、高鼻梁、方形脸型、厚嘴唇，用于强化血缘关系）"
  },
  "characters": [
    {
      "name": "角色名",
      "role": "角色定位（主角/反派/配角/动物/等）",
      "relationship": "关系描述",
      "ethnicity": "种族（必须与统一设定一致）",
      "age": "年龄",
      "gender": "性别（必须明确：男/女）",
      "description": "角色背景和性格分析（核心性格特质、情感弧光详细描述、内心冲突、在故事中的功能）",
      "appearance": "外貌设计（必须详细描述：1.统一种族特征 2.明确性别特征 3.反映性格的5个以上独特面部特征 4.独特发型 5.姿态和体态 6.3个以上独特视觉符号（疤痕、痣、配饰等））",
      "outfit": "服装设计（必须符合角色定位、时代背景、故事需求，包含：颜色、材质、款式、标志性元素）",
      "expression": "默认表情设计（详细描述反映角色核心性格的面部表情，包括眼神、嘴型、眉毛等细节）",
      "prompt": "英文生图提示词（结构：性别关键词 + 画风关键词 + 种族关键词 + 5个以上独特外貌特征 + 独特发型 + 服装细节 + 表情细节 + 姿态 + 家族共同特征 + 视觉符号，必须包含：1.male/man或female/woman 2.${currentArtStyleKeywords} 3.统一种族特征 4.3-5个家族共同特征 5.5个以上个体独特特征）"
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

    // 检查性别逻辑错误
    characters.forEach((c: CharacterInfo) => {
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
    });

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

        // 添加明确的性别关键词
        let genderKeyword = '';
        const gender = character.gender.toLowerCase();
        if (gender.includes('男') || gender.includes('male') || gender.includes('man')) {
          genderKeyword = 'man, male';
        } else if (gender.includes('女') || gender.includes('female') || gender.includes('woman')) {
          genderKeyword = 'woman, female';
        } else {
          console.warn(`角色${character.name}性别不明确：${character.gender}，默认使用男性`);
          genderKeyword = 'man, male';
        }

        // 确保包含所有一致性要素（使用三明治结构强化画风）
        const forcedArtStylePrefix = `CRITICAL ART STYLE: ${currentArtStyleKeywords}. STRICT: Must follow this art style 100%. `;
        const forcedArtStyleSuffix = ` Art style: ${artStyle}. Final image must adhere to ${artStyle} aesthetic.`;

        const unifiedPrompt = forcedArtStylePrefix + `${genderKeyword}, ${character.prompt}, ${ethnicityKeyword}, ${characterData.unifiedSetting.familyTraits}` + forcedArtStyleSuffix;

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
