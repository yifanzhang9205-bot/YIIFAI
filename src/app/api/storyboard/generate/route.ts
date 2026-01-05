import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface StoryboardRequest {
  script: any; // MovieScript
  artStyle: string; // 画风选择
  artStyleStrength?: number; // 0-100, 画风强度
}

interface StoryboardScene {
  sceneNumber: number;
  shotType: string; // 景别
  cameraAngle: string; // 角度
  cameraMovement: string; // 运镜（推/拉/摇/移/跟/固定）
  focalLength: string; // 焦距（广角/标准/长焦）
  depthOfField: string; // 景深（浅景深/深景深）
  composition: string; // 构图（三分法/对称/对角线等）
  characterPosition: string; // 人物位置
  lighting: string; // 光线（自然光/人造光、光位、色温）
  colorTemperature: string; // 色温（暖色/冷色/中性）
  mood: string; // 氛围
  transition: string; // 转场方式（切/淡/叠化/划像）
  prompt: string; // AI生图提示词（英文）
  videoPrompt: string; // 视频生成提示词（英文，用于AI视频生成工具）
}

interface StoryboardScript {
  artStyle: string;
  aspectRatio: string;
  cameraStyle: string; // 整体运镜风格
  lightingStyle: string; // 整体光线风格
  scenes: StoryboardScene[];
}

// 生成分镜脚本
export async function POST(request: NextRequest) {
  try {
    const body: StoryboardRequest = await request.json();
    const { script, artStyle, artStyleStrength = 80 } = body;

    if (!script || !script.scenes || script.scenes.length === 0) {
      return NextResponse.json(
        { error: '剧本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new LLMClient(config);

    // 定义画风关键词映射（确保前后一致）
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

    // 获取当前画风的关键词
    const baseKeywords = artStyleKeywordsMap[artStyle] || artStyleKeywordsMap['写实风格'];
    
    // 根据画风强度调整关键词权重
    // artStyleStrength: 0-100, 0=写实平衡, 100=风格强烈
    const strengthWeight = artStyleStrength / 100;
    const currentArtStyleKeywords = strengthWeight >= 0.5 
      ? baseKeywords 
      : `photorealistic, ${baseKeywords}`; // 强度较低时增加写实关键词平衡

    const systemPrompt = `你是一个资深影视分镜师和导演，精通镜头语言和视觉叙事。
你的任务是将剧本转化为专业、精准、可直接用于视频制作的分镜脚本。

专业术语说明：
**景别**：
- 特写（Extreme Close-up/Close-up）：脸部细节、手部动作，传达情绪
- 中景（Medium Shot）：上半身，表现对话和关系
- 全景（Wide Shot）：全身或全身以上，表现环境和空间
- 远景（Long Shot）：广阔场景，交代环境

**运镜**：
- 推（Dolly In）：镜头推进，强调、聚焦
- 拉（Dolly Out）：镜头拉远，揭示、舒缓
- 摇（Pan）：左右平移，扫视场景
- 移（Truck）：左右平行移动，跟随动作
- 跟（Tracking）：跟随人物移动，增强代入感
- 固定（Static）：静态镜头，稳定、庄重

**角度**：
- 平视（Eye Level）：正常视角，客观
- 俯视（High Angle）：人物显得渺小，弱势
- 仰视（Low Angle）：人物显得高大，强势

**构图**：
- 三分法（Rule of Thirds）：主体在交点，经典构图
- 中心对称（Center）：主体居中，庄重、稳定
- 对角线（Diagonal）：动感、张力
- 引导线（Leading Lines）：引导视线

**景深**：
- 浅景深（Shallow DOF）：背景虚化，聚焦主体，情绪强烈
- 深景深（Deep DOF）：前后都清晰，交代环境

**转场**：
- 切（Cut）：直接跳转，节奏快
- 淡（Fade）：缓慢过渡，抒情
- 叠化（Dissolve）：时间流逝、回忆
- 划像（Wipe）：场景分割、转场

返回格式必须是JSON：
{
  "artStyle": "${artStyle}",
  "aspectRatio": "9:16",
  "cameraStyle": "整体运镜风格描述（如：缓慢跟拍、稳定机位）",
  "lightingStyle": "整体光线风格（如：自然光黄金时段、室内暖色调）",
  "scenes": [
    {
      "sceneNumber": 1,
      "shotType": "景别",
      "cameraAngle": "角度",
      "cameraMovement": "运镜",
      "focalLength": "焦距",
      "depthOfField": "景深",
      "composition": "构图",
      "characterPosition": "人物位置",
      "lighting": "光线描述",
      "colorTemperature": "色温",
      "mood": "氛围",
      "transition": "转场方式",
      "prompt": "英文AI生图提示词（包含：画风关键词 + 景别 + 角度 + 构图 + 光线 + 人物动作 + 氛围）",
      "videoPrompt": "英文视频生成提示词（包含：画面描述 + 摄像机运动 + 节奏 + 氛围，适合Sora、Runway、Pika等AI视频工具）"
    }
  ]
}

画风关键词：
- 写实风格：photorealistic, 8k, ultra detailed, realistic lighting, cinematic
- 卡通风格：cartoon style, vibrant colors, clean lines, expressive, animated
- 动漫风格：anime style, cel shading, vivid colors, manga, detailed
- 水彩风格：watercolor painting, soft edges, artistic, dreamy, watercolor texture
- 油画风格：oil painting, textured, classic art, oil brushstrokes, rich colors

关键要求：
1. 每个场景必须有**精准的镜头语言**（景别、角度、运镜）
2. videoPrompt 要适合 AI 视频生成工具（描述画面动态、摄像机运动）
3. 转场设计要符合情感节奏
4. 构图要专业，考虑视觉引导`;

    // 构建剧本摘要
    const scriptInfo = script.scenes.map((s: any, i: number) => `
第${i + 1}场
- 场景：${s.location}
- 时间：${s.timeOfDay}
- 人物：${s.characters.join(', ')}
- 动作：${s.action}
- 情感节点：${s.emotionalBeat}
- 视觉钩子：${s.visualHook}
`).join('\n');

    const userPrompt = `剧本分析：
标题：${script.title}
类型：${script.genre}
一句话钩子：${script.logline}
情感弧线：${script.emotionalArc}
整体视觉风格：${script.visualStyle}

场次详情：
${scriptInfo}

画风选择：${artStyle}
对应英文关键词：${currentArtStyleKeywords}

重要提示：
- 在生成每个场景的 prompt 时，**必须**在开头包含画风关键词："${currentArtStyleKeywords}"
- 画风关键词是强制性的，不能省略

请生成专业分镜脚本，确保镜头语言精准、videoPrompt 适合AI视频生成，**prompt必须包含画风关键词**，返回JSON格式。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, { temperature: 0.7 });

    // 提取JSON
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析生成的分镜脚本');
    }

    const storyboard: StoryboardScript = JSON.parse(jsonMatch[0]);

    // 自检：确保每个场景的prompt包含画风关键词
    storyboard.scenes.forEach(scene => {
      const promptLower = scene.prompt.toLowerCase();

      // 检查是否包含画风关键词
      const hasArtStyle = currentArtStyleKeywords.split(',').some(keyword =>
        promptLower.includes(keyword.trim().toLowerCase())
      );

      if (!hasArtStyle) {
        console.warn(`场景${scene.sceneNumber}的prompt缺少画风关键词，强制添加`);
        // 强制在开头添加画风关键词
        scene.prompt = `${currentArtStyleKeywords}, ${scene.prompt}`;
      }
    });

    // 确保artStyle字段正确
    storyboard.artStyle = artStyle;

    return NextResponse.json({
      success: true,
      storyboard,
    });

  } catch (error) {
    console.error('生成分镜脚本失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成分镜脚本失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
