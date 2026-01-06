import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

// 修复常见的LLM JSON格式问题
function fixLLMJSON(jsonString: string): string {
  let fixed = jsonString;

  // 修复：属性名后缺少冒号
  // 例如："title" "测试" -> "title": "测试"
  fixed = fixed.replace(/"([^"]+)"\s+"([^"]+)"/g, (match, p1, p2, offset) => {
    const prefix = fixed.substring(0, offset);
    if (prefix.endsWith(':') || prefix.endsWith('{') || prefix.endsWith(',')) {
      return `"${p1}": "${p2}"`;
    }
    if (prefix.endsWith('[') || prefix.endsWith(',')) {
      return match;
    }
    return match;
  });

  // 修复逗号位置问题
  fixed = fixed.replace(/,\s*}/g, '}');
  fixed = fixed.replace(/,\s*]/g, ']');

  return fixed;
}

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
- 特写（Close-up/Extreme Close-up）：脸部细节、手部动作，传达情绪
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

关键要求：
1. 每个场景必须有**精准的镜头语言**（景别、角度、运镜）
2. videoPrompt 要适合 AI 视频生成工具（描述画面动态、摄像机运动）
3. 转场设计要符合情感节奏
4. 构图要专业，考虑视觉引导
5. prompt必须包含画风关键词：${currentArtStyleKeywords}`;

    // 简化剧本摘要，只保留核心信息
    const scriptInfo = script.scenes.map((s: any, i: number) =>
      `场景${i + 1}：${s.location}，${s.timeOfDay}，人物：${s.characters.join('、')}，${s.action}`
    ).join('\n');

    const userPrompt = `剧本：${script.title}（${script.genre}）
风格：${script.visualStyle}

场次：
${scriptInfo}

画风关键词：${currentArtStyleKeywords}

生成分镜JSON，prompt必须包含画风关键词。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    console.log('开始调用LLM，使用模型: doubao-seed-1-6-flash-250615');

    // 添加重试机制，最多3次
    let response: any;
    let lastError: Error | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试第 ${attempt} 次LLM调用...`);
        const startTime = Date.now();

        response = await client.invoke(messages, {
          model: 'doubao-seed-1-6-flash-250615', // 使用快速模型
          temperature: 0.3
        });

        const elapsedTime = Date.now() - startTime;
        console.log(`LLM调用完成（尝试 ${attempt}），耗时: ${elapsedTime}ms`);
        console.log('LLM原始返回内容:', response.content);

        // 如果成功，跳出重试循环
        if (response.content && response.content.trim().length > 0) {
          break;
        } else {
          throw new Error('LLM返回空内容');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`第 ${attempt} 次尝试失败:`, lastError.message);

        if (attempt < maxRetries) {
          // 等待1秒后重试
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // 最后一次尝试也失败了，抛出错误
          throw lastError;
        }
      }
    }

    // 优化JSON提取逻辑
    let jsonContent = response.content.trim();

    // 移除markdown代码块标记
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // 移除可能的前后空白字符
    jsonContent = jsonContent.trim();

    console.log('处理后的内容长度:', jsonContent.length);

    // 提取JSON - 尝试多种方式
    let jsonStr = jsonContent;

    // 方式1：直接尝试整个内容
    try {
      const testParse = JSON.parse(jsonContent);
      if (testParse && testParse.scenes && Array.isArray(testParse.scenes)) {
        jsonStr = jsonContent;
      }
    } catch {
      // 方式2：使用正则匹配第一个完整的JSON对象
      const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        console.error('无法找到JSON内容，LLM返回:', response.content);
        throw new Error('无法解析生成的分镜脚本，返回格式不正确');
      }
    }

    console.log('提取的JSON字符串长度:', jsonStr.length, '前200字符:', jsonStr.substring(0, 200));

    // 修复常见的JSON格式问题
    const fixedJson = fixLLMJSON(jsonStr);

    let storyboard: StoryboardScript;
    try {
      storyboard = JSON.parse(fixedJson);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      console.error('尝试解析的内容:', fixedJson);
      throw new Error(`JSON解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
    }

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

    // 建立场景-人物映射关系
    const sceneCharacterMapping = storyboard.scenes.map(scene => {
      // 从剧本中提取该场景的人物信息
      const scriptScene = script.scenes.find((s: any) => s.sceneNumber === scene.sceneNumber);
      const charactersInScene = scriptScene?.characters || [];

      return {
        sceneNumber: scene.sceneNumber,
        characters: charactersInScene.map((charName: string) => ({
          name: charName,
          role: 'character', // 默认角色类型，后续可以根据剧本细化
        })),
      };
    });

    return NextResponse.json({
      success: true,
      storyboard,
      sceneCharacterMapping, // 新增：场景-人物映射
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
