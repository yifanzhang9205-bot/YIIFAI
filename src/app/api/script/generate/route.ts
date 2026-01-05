import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface ScriptRequest {
  requirement: string;
  previousScript?: string; // 如果有，表示修改
}

interface SceneScript {
  sceneNumber: number;
  location: string;
  characters: string[];
  action: string;
  dialogue?: string;
  duration: string;
}

interface MovieScript {
  title: string;
  genre: string;
  summary: string;
  scenes: SceneScript[];
}

// 生成剧本
export async function POST(request: NextRequest) {
  try {
    const body: ScriptRequest = await request.json();
    const { requirement, previousScript } = body;

    if (!requirement || !requirement.trim()) {
      return NextResponse.json(
        { error: '需求内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const client = new LLMClient(config);

    const systemPrompt = `你是一个专业的影视剧本创作专家。
你的任务是根据用户的需求，创作一个完整的影视剧本。

剧本格式要求：
- 标题
- 类型
- 故事梗概（100字以内）
- 分场剧本（每场包含场号、场景、人物、动作、对白、时长）

返回格式必须是JSON：
{
  "title": "剧本标题",
  "genre": "类型（如：悬疑、爱情、科幻）",
  "summary": "故事梗概",
  "scenes": [
    {
      "sceneNumber": 1,
      "location": "场景地点",
      "characters": ["人物1", "人物2"],
      "action": "动作描述",
      "dialogue": "对白（可选）",
      "duration": "时长（如：10秒）"
    }
  ]
}

要求：
1. 场景数量控制在5-10场
2. 每场时长5-15秒
3. 场景描述要生动具体，适合后续转化为画面`;

    const userPrompt = previousScript
      ? `这是上一版剧本：\n${previousScript}\n\n用户希望修改：${requirement}\n\n请根据用户意见修改剧本，返回JSON格式。`
      : `用户需求：${requirement}\n\n请生成剧本，返回JSON格式。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await client.invoke(messages, { temperature: 0.7 });

    // 提取JSON
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析生成的剧本');
    }

    const script: MovieScript = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      script,
    });

  } catch (error) {
    console.error('生成剧本失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成剧本失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
