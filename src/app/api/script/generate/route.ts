import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

// 修复常见的LLM JSON格式问题
function fixLLMJSON(jsonString: string): string {
  let fixed = jsonString;

  // 修复：属性名后缺少冒号，但是要避免误伤（如数组元素）
  // 例如："title" "测试" -> "title": "测试"
  // 但不修复：["a", "b"] 这种情况
  fixed = fixed.replace(/"([^"]+)"\s+"([^"]+)"/g, (match, p1, p2, offset) => {
    // 检查前一个字符是否是冒号，如果是则跳过
    const prefix = fixed.substring(0, offset);
    if (prefix.endsWith(':') || prefix.endsWith('{') || prefix.endsWith(',')) {
      return `"${p1}": "${p2}"`;
    }
    // 如果是数组元素（前导是[），不修复
    if (prefix.endsWith('[') || prefix.endsWith(',')) {
      return match;
    }
    return match;
  });

  // 修复逗号位置问题（例如 "a": 1,} -> "a": 1}）
  fixed = fixed.replace(/,\s*}/g, '}');
  fixed = fixed.replace(/,\s*]/g, ']');

  return fixed;
}

interface ScriptRequest {
  requirement: string;
  previousScript?: string; // 如果有，表示修改
}

interface SceneScript {
  sceneNumber: number;
  location: string;
  timeOfDay: string; // 早晨/中午/傍晚/深夜
  mood: string; // 氛围
  characters: string[];
  action: string; // 动作描述，要画面感强
  dialogue?: string;
  emotionalBeat: string; // 情感节点
  visualHook: string; // 视觉钩子，吸引眼球的关键画面
  duration: string; // 时长
}

interface MovieScript {
  title: string;
  genre: string;
  logline: string; // 一句话核心钩子
  summary: string; // 故事梗概（150字）
  emotionalArc: string; // 情感弧线（起承转合）
  targetAudience: string; // 目标受众
  visualStyle: string; // 整体视觉风格建议
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

    const systemPrompt = `你是一个获奖的影视剧本编剧专家，擅长创作引人入胜、情感深刻、视觉震撼的短视频剧本。

你的核心任务：根据用户需求创作一个**能打动人心、让人愿意看完**的优质剧本。

剧本创作黄金法则：
1. **情感钩子** - 前3秒必须有吸引眼球的内容
2. **冲突推进** - 每场都有明确冲突或转折
3. **画面优先** - 90%的内容用画面表达，减少对白
4. **节奏控制** - 张弛有度，有爆点有留白
5. **情感共鸣** - 传递可感知的情感价值

IMPORTANT: 你必须返回一个有效的JSON对象，不要包含任何额外的文本、说明或markdown标记。

返回JSON格式（严格遵守）：
{
  "title": "简洁有力的标题（5-8字）",
  "genre": "类型（悬疑/爱情/励志/喜剧/温情等）",
  "logline": "一句话核心钩子（30字内，点明冲突和看点）",
  "summary": "故事梗概（150字内，突出情感和亮点）",
  "emotionalArc": "情感弧线描述（例如：孤独-相遇-温暖-希望）",
  "targetAudience": "目标受众（如：都市青年/上班族/父母等）",
  "visualStyle": "整体视觉风格建议（如：暖色调特写/冷色调宽景/光影对比强烈等）",
  "scenes": [
    {
      "sceneNumber": 1,
      "location": "场景（具体地点，如：深夜写字楼、早高峰地铁）",
      "timeOfDay": "时间（早晨/中午/傍晚/深夜）",
      "mood": "情绪氛围（如：压抑/温馨/紧张/浪漫）",
      "characters": ["角色名"],
      "action": "动作描述（必须画面感强！用动词+细节，如：他双手颤抖着拿起电话，屏幕的光映照着他布满血丝的眼睛）",
      "dialogue": "对白（可选，简短有力，必要时写'无声'）",
      "emotionalBeat": "本场情感节点（如：孤独感、希望萌生、冲突爆发）",
      "visualHook": "视觉钩子（本场最吸引眼球的画面，如：窗外霓虹灯下的孤单背影、泪水滴落的特写）",
      "duration": "时长（5-10秒）"
    }
  ]
}

严格要求：
1. 场景数量5-8场，总时长45-60秒
2. 每场必须有明确的**视觉钩子**（visualHook）
3. 动作描述必须**具体、有画面感**，避免"他思考着"这种抽象描述
4. 情感弧线要完整，有起伏
5. 最后一场要有情感升华或开放式结尾
6. **直接返回JSON，不要包含任何额外的文字、注释或markdown代码块标记**`;

    const userPrompt = previousScript
      ? `这是上一版剧本：\n${previousScript}\n\n用户希望修改：${requirement}\n\n请根据用户意见优化剧本，确保情感更打动人、画面更具视觉冲击力。\n\nIMPORTANT: 直接返回有效的JSON对象，不要包含任何额外的文字、注释或markdown标记。`
      : `用户需求：${requirement}\n\n请创作一个能打动人心的优秀剧本，确保：\n1. 开头3秒有强烈视觉钩子\n2. 有清晰的情感弧线\n3. 每场都有吸引眼球的画面\n\nIMPORTANT: 直接返回有效的JSON对象，不要包含任何额外的文字、注释或markdown标记。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    console.log('开始调用LLM...');
    const startTime = Date.now();

    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-6-flash-250615', // 使用快速模型
      temperature: 0.3  // 降低温度，提高JSON稳定性
    });

    const endTime = Date.now();
    console.log(`LLM调用完成，耗时：${endTime - startTime}ms`);
    console.log('LLM返回的原始内容:', response.content);

    // 提取JSON - 移除markdown标记
    let jsonContent = response.content.trim();

    // 移除可能的markdown代码块标记
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    console.log('处理后的JSON内容:', jsonContent);

    // 提取JSON（支持嵌套）
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('无法提取JSON，原始内容:', response.content);
      throw new Error('无法解析生成的剧本，返回格式不正确');
    }

    let script: MovieScript;
    try {
      // 尝试修复常见的JSON格式问题
      const fixedJSON = fixLLMJSON(jsonMatch[0]);
      script = JSON.parse(fixedJSON);
    } catch (parseError) {
      console.error('JSON解析失败，内容:', jsonMatch[0]);
      console.error('解析错误:', parseError);
      throw new Error(`剧本JSON格式错误: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
    }

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
