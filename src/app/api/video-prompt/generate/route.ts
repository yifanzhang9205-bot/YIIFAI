import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface VideoPromptRequest {
  script: any; // MovieScript
  storyboard: any; // StoryboardScript
  characterImages: string[]; // 人物设定图
  keyframes: any[]; // 已生成的关键帧
}

interface VideoPromptScene {
  sceneNumber: number;
  sceneDescription: string; // 场景描述
  soraPrompt: string; // Sora专用提示词
  runwayPrompt: string; // Runway专用提示词
  pikaPrompt: string; // Pika专用提示词
  klingPrompt: string; // Kling（可灵）专用提示词
  chinesePrompt: string; // 中文提示词（国内工具）
  cameraMovement: string; // 摄像机运动
  duration: string; // 建议时长
  motionIntensity: string; // 运动强度（低/中/高）
  audioSuggestion: string; // 音效建议
  musicMood: string; // 音乐情绪
}

interface VideoPrompts {
  overallStyle: {
    visualStyle: string;
    colorPalette: string;
    motionStyle: string;
    audioAtmosphere: string;
  };
  scenes: VideoPromptScene[];
}

// 生成视频生成提示词
export async function POST(request: NextRequest) {
  try {
    const body: VideoPromptRequest = await request.json();
    const { script, storyboard, characterImages, keyframes } = body;

    if (!script || !storyboard || !keyframes) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new LLMClient(config);

    // 构建输入摘要
    const scenesInfo = storyboard.scenes.map((s: any, i: number) => `
场景${s.sceneNumber}：
- 景别：${s.shotType}
- 角度：${s.cameraAngle}
- 运镜：${s.cameraMovement}
- 构图：${s.composition}
- 光线：${s.lighting}
- 转场：${s.transition}
- 剧本动作：${script.scenes[i]?.action || ''}
- 情感节点：${script.scenes[i]?.emotionalBeat || ''}
- 视觉钩子：${script.scenes[i]?.visualHook || ''}
`).join('\n');

    const systemPrompt = `你是一个精通各类AI视频生成工具的专家，包括Sora、Runway Gen-2、Pika、Kling（可灵）等。
你的任务是根据剧本和分镜，为每个场景生成**经过优化**的视频生成提示词，确保这些提示词能生成高质量的视频。

各AI视频工具的特点和最佳实践：

**OpenAI Sora**：
- 特点：超长视频生成、高质量、理解复杂镜头语言
- 提示词要点：详细的画面描述、明确的摄像机运动、时间流逝描述
- 最佳实践：用英文，描述画面动态和摄像机移动

**Runway Gen-2**：
- 特点：8秒视频生成、Motion Brush控制、稳定质量
- 提示词要点：简洁清晰的画面描述、明确的运动方向
- 最佳实践：强调主体动作、摄像机轨迹

**Pika**：
- 特点：动画风格、风格化强、支持Lip Sync
- 提示词要点：画面描述+运动+风格关键词
- 最佳实践：适合动画风格、创意短片

**Kling（可灵）**：
- 特点：国内工具、中文支持好、性价比高
- 提示词要点：中文描述、清晰的主体和运动
- 最佳实践：适合国内用户、中文提示词效果更佳

返回格式必须是JSON：
{
  "overallStyle": {
    "visualStyle": "整体视觉风格（英文，如：cinematic, warm tones, soft lighting）",
    "colorPalette": "色调建议（英文，如：muted colors with warm highlights）",
    "motionStyle": "整体运动风格（英文，如：smooth slow movements, gentle transitions）",
    "audioAtmosphere": "整体音效氛围（英文，如：ambient sound, soft background music）"
  },
  "scenes": [
    {
      "sceneNumber": 1,
      "sceneDescription": "场景详细描述（中文，便于用户理解）",
      "soraPrompt": "Sora专用提示词（英文，详细+摄像机运动+时间流逝）",
      "runwayPrompt": "Runway专用提示词（英文，简洁+运动方向）",
      "pikaPrompt": "Pika专用提示词（英文，画面+运动+风格）",
      "klingPrompt": "可灵专用提示词（中文，清晰描述）",
      "chinesePrompt": "通用中文提示词（适用于国内视频AI工具）",
      "cameraMovement": "摄像机运动描述（中文）",
      "duration": "建议时长（如：3秒、5秒）",
      "motionIntensity": "运动强度（低/中/高）",
      "audioSuggestion": "音效建议（中文，如：环境音、脚步声、风声）",
      "musicMood": "音乐情绪（中文，如：温馨、紧张、抒情）"
    }
  ]
}

提示词优化原则：
1. **画面描述要具体**：避免"一个人走"，要说"一个穿着灰色西装的青年，在清晨的街道上缓慢行走"
2. **摄像机运动要明确**：使用专业术语（dolly in, pan, tilt, tracking shot, static）
3. **时间流逝要描述**：描述变化过程（slowly, gradually, in a sequence）
4. **光线和氛围要包含**：golden hour, soft natural light, dramatic shadows
5. **运动强度要合理**：情绪紧张时运动强度高，抒情时运动强度低
6. **工具针对性**：Sora需要详细描述，Runway需要简洁，Pika强调风格，Kling用中文`;

    const userPrompt = `剧本信息：
- 标题：${script.title}
- 类型：${script.genre}
- 情感弧线：${script.emotionalArc}
- 整体视觉风格：${script.visualStyle}

分镜和场景信息：
${scenesInfo}

请为每个场景生成优化过的视频生成提示词，返回JSON格式。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-flash-250615', // 使用快速模型
      temperature: 0.7
    });

    // 提取JSON - 移除markdown标记
    let jsonContent = response.content.trim();

    // 移除可能的markdown代码块标记
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // 提取JSON（支持嵌套）
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('LLM返回内容:', response.content);
      throw new Error('无法解析视频生成提示词，返回格式不正确');
    }

    const videoPrompts: VideoPrompts = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      videoPrompts,
    });

  } catch (error) {
    console.error('生成视频提示词失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成视频提示词失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
