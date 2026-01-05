import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface StoryboardRequest {
  script: any; // MovieScript
  artStyle: string; // 画风选择
}

interface StoryboardScene {
  sceneNumber: number;
  shotType: string; // 景别（特写、中景、全景等）
  cameraAngle: string; // 角度（俯视、仰视、平视等）
  composition: string; // 构图描述
  characterPosition: string; // 人物位置
  lighting: string; // 光线
  mood: string; // 氛围
  prompt: string; // 用于生图的提示词
}

interface StoryboardScript {
  artStyle: string;
  aspectRatio: string; // 画幅比例
  scenes: StoryboardScene[];
}

// 生成分镜脚本
export async function POST(request: NextRequest) {
  try {
    const body: StoryboardRequest = await request.json();
    const { script, artStyle } = body;

    if (!script || !script.scenes || script.scenes.length === 0) {
      return NextResponse.json(
        { error: '剧本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new LLMClient(config);

    const systemPrompt = `你是一个专业的影视分镜师。
你的任务是根据剧本和选定的画风，创作详细的分镜脚本。

分镜脚本格式要求：
- 画幅比例：统一使用竖屏 9:16（720x1280）
- 每个场景包含：景别、角度、构图、人物位置、光线、氛围、生图提示词
- 生图提示词要包含画风关键词，确保画面风格统一

返回格式必须是JSON：
{
  "artStyle": "画风名称",
  "aspectRatio": "9:16",
  "scenes": [
    {
      "sceneNumber": 1,
      "shotType": "景别（特写/中景/全景）",
      "cameraAngle": "角度（俯视/仰视/平视）",
      "composition": "构图描述",
      "characterPosition": "人物位置描述",
      "lighting": "光线描述",
      "mood": "氛围描述",
      "prompt": "用于AI生图的完整提示词（英文，包含画风关键词）"
    }
  ]
}

画风参考（根据用户选择）：
- 写实风格：photorealistic, 8k, detailed, realistic lighting
- 卡通风格：cartoon style, vibrant colors, expressive
- 动漫风格：anime style, cel shading, vivid
- 水彩风格：watercolor painting, soft edges, artistic
- 油画风格：oil painting, textured, classic art

注意事项：
1. 保持所有场景高度一致（720x1280）
2. 人物位置和动作要连贯
3. 光线和氛围要符合剧情需要`;

    const scriptSummary = script.scenes.map((s: any, i: number) =>
      `第${i + 1}场：${s.location} - ${s.characters.join(', ')} - ${s.action}`
    ).join('\n');

    const userPrompt = `剧本标题：${script.title}
类型：${script.genre}

场次信息：
${scriptSummary}

画风选择：${artStyle}

请生成分镜脚本，返回JSON格式。`;

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
