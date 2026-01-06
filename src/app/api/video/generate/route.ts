import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';
import { ImageGenerationClient } from 'coze-coding-dev-sdk';

interface GenerateRequest {
  theme: string;
  duration: number; // 秒
  style?: string;
}

interface Scene {
  description: string;
  duration: number;
}

interface VideoScript {
  theme: string;
  totalDuration: number;
  scenes: Scene[];
}

// 生成视频脚本
async function generateVideoScript(theme: string, duration: number, style?: string): Promise<VideoScript> {
  const config = new Config();
  const client = new LLMClient(config);

  const stylePrompt = style ? `风格：${style}` : '';
  const systemPrompt = `你是一个专业的短视频脚本生成专家。
你的任务是根据用户的主题，生成一个简短的视频脚本。

要求：
1. 每个场景约1秒
2. 场景之间要有连贯性
3. 场景描述要简洁清晰，适合用于AI生图
4. 场景数等于视频时长（秒）

返回格式必须是JSON：
{
  "theme": "主题",
  "totalDuration": 总时长,
  "scenes": [
    {
      "description": "场景画面描述",
      "duration": 1
    }
  ]
}`;

  const userPrompt = `主题：${theme}\n时长：${duration}秒\n${stylePrompt}\n\n请生成视频脚本，返回JSON格式。`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user' as const, content: userPrompt },
  ];

  const response = await client.invoke(messages, { temperature: 0.7 });

  // 提取JSON - 移除markdown标记
  let jsonContent = response.content.trim();

  // 移除可能的markdown代码块标记
  jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  // 尝试提取JSON
  const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('LLM返回内容:', response.content);
    throw new Error('无法解析生成的脚本，返回格式不正确');
  }

  const script: VideoScript = JSON.parse(jsonMatch[0]);
  
  // 验证场景数量
  if (script.scenes.length !== duration) {
    throw new Error(`场景数量(${script.scenes.length})与时长(${duration})不匹配`);
  }

  return script;
}

// 生成场景图片
async function generateSceneImages(scenes: Scene[]): Promise<string[]> {
  const config = new Config();
  const client = new ImageGenerationClient(config);

  // 组合所有场景描述为连续故事
  const storyPrompt = scenes.map((scene, i) => `场景${i + 1}: ${scene.description}`).join('\n');

  const response = await client.generate({
    prompt: storyPrompt,
    sequentialImageGeneration: 'auto',
    sequentialImageGenerationMaxImages: scenes.length,
    size: '2K',
    watermark: false,
  });

  const helper = client.getResponseHelper(response);

  if (!helper.success) {
    throw new Error(`生图失败: ${helper.errorMessages.join(', ')}`);
  }

  return helper.imageUrls;
}

// 生成视频接口
export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { theme, duration, style } = body;

    // 验证输入
    if (!theme || !duration || duration < 1 || duration > 15) {
      return NextResponse.json(
        { error: '主题和时长（1-15秒）为必填项' },
        { status: 400 }
      );
    }

    // 步骤1：生成脚本
    console.log('步骤1：生成视频脚本...');
    const script = await generateVideoScript(theme, duration, style);
    console.log('脚本生成完成:', script);

    // 步骤2：生成场景图片
    console.log('步骤2：生成场景图片...');
    const imageUrls = await generateSceneImages(script.scenes);
    console.log(`生成了 ${imageUrls.length} 张图片`);

    // TODO: 步骤3：合成视频（需要FFmpeg）
    // 目前先返回图片序列
    return NextResponse.json({
      success: true,
      script,
      imageUrls,
      message: '图片生成成功，视频合成功能开发中...'
    });

  } catch (error) {
    console.error('生成视频失败:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '生成视频失败',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
