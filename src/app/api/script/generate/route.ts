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
  characters: string[]; // 角色名，必须标注性别，如"小明（男）"
  action: string; // 动作描述，要画面感强，包含外貌特征
  dialogue?: string;
  emotionalBeat: string; // 情感节点
  visualHook: string; // 视觉钩子，吸引眼球的关键画面
  duration: string; // 时长
  visualDetails: {
    lighting: string; // 光线描述
    color: string; // 色彩描述
    composition: string; // 构图描述
    camera: string; // 镜头描述
    environment: string; // 环境细节
  };
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

    const systemPrompt = `你是一个获奖的影视剧本编剧专家，擅长创作引人入胜、情感深刻、视觉震撼的爆款短视频剧本。
你的核心使命是：创作一个**完整可执行的视频剧本**，每个场景都必须有明确的视觉实现路径，可以直接用于后续的分镜和图片生成。

## 关键原则：剧本是后续所有环节的源头

**重要提醒**：
- 你生成的剧本将被用于：人物设定生成、分镜设计、关键帧图片生成
- 每个场景都必须有**完整的视觉描述**，不能模糊不清
- 每个角色的性别、外貌必须**明确标注**，避免后续生成错误
- 场景描述必须包含：光线、色彩、构图、动作等**具体视觉元素**

## 剧本创作黄金法则

### 1. 开场钩子（前3秒决定生死）
- **视觉冲击**：开场必须有一个让人眼前一亮的画面
  - ❌ 错误："一个男人走在街上"
  - ✅ 正确："一个男人满头大汗，手里紧握着一份被揉皱的诊断书，在暴雨中狂奔"
- **制造悬念**：开场就抛出问题或冲突
  - ❌ 错误："小明今天上班迟到了"
  - ✅ 正确："小明看着屏幕上的倒计时：59、58、57...他必须在最后一秒前按下按钮，否则..."

### 2. 反转设计（每个场景都要有意外）
- **预期违背**：观众以为会A，结果发生了B
  - 错误：他打开门，看到妈妈在做饭
  - 正确：他打开门，看到妈妈不在家，桌上留了一张纸条："我走了，别找我"
- **情感反转**：从悲伤到希望，从温暖到绝望
  - 错误：他很难过，然后还是很难过
  - 正确：他很难过，突然电话响了，是妈妈打来的："傻孩子，我就在楼下"

### 3. 冲突推进（没有冲突就没有戏剧）
- **内外冲突**：
  - 外部冲突：人与环境、人与人的对抗
  - 内部冲突：角色内心的挣扎和选择
- **层层递进**：冲突从小到大，最后达到高潮

### 4. 画面优先（用镜头讲故事）
- **Show, Don't Tell**：90%用画面表达，避免对白
  - ❌ 错误："他很紧张"
  - ✅ 正确："他的手在颤抖，额头渗出细密的汗珠"
- **细节的力量**：用小细节传达大情感
  - ❌ 错误："他想念妈妈"
  - ✅ 正确："他看着妈妈的照片，轻轻擦拭上面的灰尘"

### 5. 节奏控制（张弛有度）
- **紧张-放松-再紧张**：给观众喘息的空间，然后再次冲击
- **慢镜头**：关键时刻用慢镜头强化情感

### 6. 情感共鸣（让观众感同身受）
- **普世情感**：亲情、爱情、友情、梦想、成长
- **细节真实**：让观众觉得"这就像发生在我身上"

### 7. 【关键】为后续生成提供完整的视觉信息

**角色设计原则（必须遵守）**：
- **性别必须明确**：每个角色必须明确标注性别（男/女），不能模糊
  - ❌ 错误："两个朋友" / "一个陌生人"
  - ✅ 正确："两个女性朋友" / "一位陌生男性"
- **外貌特征具体**：每个角色必须有3个以上明确的外貌特征
  - ❌ 错误："她长得很漂亮"
  - ✅ 正确："她长着瓜子脸，有黑色的长发，穿着白色连衣裙"
- **种族特征明确**：如果涉及不同种族，必须明确标注
  - ❌ 错误："一个年轻人"
  - ✅ 正确："一个东亚年轻女性" / "一个非洲中年男性"
- **服装有标志性**：每个角色的服装要服务于角色识别
  - ❌ 错误："他穿得很随意"
  - ✅ 正确："他穿着蓝色牛仔外套、黑色T恤、灰色牛仔裤"

**场景描述原则（必须遵守）**：
- **光线明确**：自然光/人造光，光的方向（侧光/顶光/背光）
  - ❌ 错误："房间里很亮"
  - ✅ 正确："阳光从窗户斜射进来，形成温暖的侧光"
- **色彩明确**：主色调是什么？冷色/暖色/对比色
  - ❌ 错误："景色很美"
  - ✅ 正确："夕阳西下，天空呈现橙紫渐变的暖色调"
- **构图明确**：景别（远景/中景/特写），人物位置
  - ❌ 错误："他们面对面"
  - ✅ 正确："他们面对面站着，中景构图，背景是模糊的街道"
- **动作细节**：必须有具体的动词和细节
  - ❌ 错误："他很生气"
  - ✅ 正确："他双手握拳，眉头紧锁，胸口剧烈起伏"

IMPORTANT: 你必须返回一个有效的JSON对象，不要包含任何额外的文本、说明或markdown标记。

返回JSON格式（严格遵守）：
{
  "title": "简洁有力的标题（5-8字）",
  "genre": "类型（悬疑/爱情/励志/喜剧/温情等）",
  "logline": "一句话核心钩子（30字内，必须点明冲突、反转或悬念）",
  "summary": "故事梗概（150字内，必须突出反转、冲突和情感亮点）",
  "emotionalArc": "情感弧线（例如：绝望→挣扎→意外→希望，每个阶段要有明确的转折）",
  "targetAudience": "目标受众（如：都市青年/上班族/父母等）",
  "visualStyle": "整体视觉风格（如：冷色调强对比/暖色调柔和/黑白+彩色点缀）",
  "scenes": [
    {
      "sceneNumber": 1,
      "location": "场景（具体地点，越具体越有代入感，如：深夜的医院走廊）",
      "timeOfDay": "时间（早晨/中午/傍晚/深夜，如：深夜）",
      "mood": "情绪氛围（如：压抑/温馨/紧张/浪漫，越具体越好，如：压抑、绝望）",
      "characters": ["角色名（必须明确性别，如：小明（男）、小芳（女））"],
      "action": "动作描述（必须画面感极强！要求：动词+细节+反转+首次出现角色的外貌特征。如：他双手颤抖着拿起电话，屏幕的光映照着他布满血丝的眼睛（30岁男性，短发，戴眼镜，黑色外套），突然电话自动挂断，屏幕显示'对方已关机'）",
      "dialogue": "对白（可选，如需对白必须简短有力，推动剧情或揭示真相，否则写'无声'）",
      "emotionalBeat": "本场情感节点（必须有反转或冲突，如：从自信到挫败、从绝望到希望、从平静到暴怒）",
      "visualHook": "视觉钩子（本场最抓人眼球的画面，必须让人'哇'一声。如：窗外霓虹灯下的孤单背影、泪水滴落在镜子里的特写、突然的灯光变化揭示惊人真相）",
      "duration": "时长（5-10秒，根据场景重要性调整）",
      "visualDetails": {
        "lighting": "光线描述（如：冷色调的荧光灯，从顶部投射，形成强烈对比）",
        "color": "色彩描述（如：冷蓝色调，突出孤独感；或温暖的橙黄色，营造希望）",
        "composition": "构图描述（如：中景，人物居中，背景虚化）",
        "camera": "镜头描述（如：推镜头，从远景推进到脸部特写）",
        "environment": "环境细节（如：墙上挂着旧照片，桌上散落着文件）"
      }
    }
  ]
}

## 严格要求（必须遵守）

1. **场景结构**：根据剧情需要确定场景数量（不要硬性限制数量），总时长控制在120-180秒（2-3分钟完整短剧）。
2. **角色性别明确**：所有角色名必须标注性别，如"小明（男）"、"小芳（女）"、"母亲（女）"、"父亲（男）"，避免性别混淆。
3. **角色外貌特征**：首次出现的角色必须在action中描述外貌（3个以上特征：年龄、发型、穿着等），便于后续人物设定生成。
4. **开场场景**（sceneNumber: 1）必须有强烈视觉钩子，让人停下滑动。
5. **每场反转**：每个场景都要有意外、冲突或情感转折。
6. **视觉钩子**：每场的visualHook必须具体、震撼，让人"wow"一声。
7. **动作描述**：必须有画面感，包含动词+细节，不能是"他想着"、"他感觉到"这种抽象描述。
8. **情感弧线**：必须有起伏、转折，不能是一条直线。
9. **结尾升华**：最后一场要有情感升华或震撼的反转。
10. **visualDetails完整**：每个场景的visualDetails必须填写完整（lighting、color、composition、camera、environment），为后续分镜提供具体指导。
11. **直接返回JSON，不要包含任何额外的文字、注释或markdown代码块标记**

## 场景设计示例（参考）

**场景1（开场钩子）**：
- location: "深夜的医院走廊"
- timeOfDay: "深夜"
- mood: "压抑、绝望"
- characters: ["小明（男）"]
- action: "小明满头大汗，手里紧握着一张皱巴巴的诊断书，在暴雨中狂奔，突然脚下一滑，重重摔倒在水坑里。他长相：30岁男性，短发，戴眼镜，穿着黑色外套。"
- dialogue: "无声"
- emotionalBeat: "从紧张到绝望"
- visualHook: "暴雨中摔倒的瞬间，诊断书飘落在地，特写显示'晚期'两个字"
- duration: "8秒"
- visualDetails: {
    "lighting": "走廊荧光灯从顶部冷光照射，雨水打在玻璃窗上形成光斑",
    "color": "冷蓝色调，突出孤独和绝望感",
    "composition": "中景，人物在画面中央，背景是模糊的走廊墙壁",
    "camera": "跟拍镜头，随着人物奔跑移动",
    "environment": "走廊墙壁惨白，地上有散落的纸巾，远处有模糊的医院标识"
  }

**场景2（反转）**：
- location: "医院走廊（原地）"
- timeOfDay: "深夜"
- mood: "恐惧、震惊"
- characters: ["小明（男）", "陌生男子（男）"]
- action: "小明颤抖着捡起诊断书，正要查看，一辆黑色轿车突然停在他面前，车窗摇下，露出一个50岁左右的陌生男子，长相：白发，深皱纹，眼神锐利，穿着灰色西装。"
- dialogue: "无声"
- emotionalBeat: "从绝望到更深的恐惧"
- visualHook: "黑色轿车大灯照亮小明满脸的雨水和绝望的表情，陌生男子的眼神如同利剑"
- duration: "6秒"
- visualDetails: {
    "lighting": "车灯强光从前方照射，形成强烈的明暗对比",
    "color": "高对比度，黑暗中的强光营造悬疑感",
    "composition": "近景，聚焦小明的表情和陌生男子的眼神",
    "camera": "从车灯视角拍摄，仰视小明",
    "environment": "雨水在车灯照射下形成光帘，地面有积水反光"
  }

这样的剧本才有戏剧性和观看价值！`;

    const userPrompt = previousScript
      ? `这是上一版剧本：\n${previousScript}\n\n用户希望修改：${requirement}\n\n请根据用户意见优化剧本，确保：
1. 开场3秒有强烈的视觉冲击，让人停下滑动
2. 每个场景都有明确的反转或冲突
3. 视觉钩子震撼，有"wow"效果
4. 情感弧线有起伏，不是直线
5. 结尾有情感升华或震撼反转

IMPORTANT: 直接返回有效的JSON对象，不要包含任何额外的文字、注释或markdown标记。`
      : `用户需求：${requirement}\n\n请创作一个爆款剧本，让观众停下滑动、完整看完、忍不住转发。确保：
1. **开场钩子**：前3秒必须有让人"哇"一声的视觉冲击
2. **每场反转**：每个场景都要有意外、冲突或情感转折
3. **视觉震撼**：每个场景的visualHook都要具体、抓人眼球
4. **情感弧线**：从A情绪到B情绪，有明显转折
5. **结尾升华**：最后一场要有情感共鸣或震撼反转

参考结构：
- 开场：视觉冲击 + 悬念
- 发展：冲突升级 + 多次反转
- 高潮：情感爆发或真相揭示
- 结尾：情感升华或意外反转

IMPORTANT: 直接返回有效的JSON对象，不要包含任何额外的文字、注释或markdown标记。`;

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
