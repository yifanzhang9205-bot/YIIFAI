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

    const systemPrompt = `你是一位获奖的电影导演和资深分镜师，深谙镜头语言、视觉叙事和情感表达。
你的核心使命：创作让观众**停下滑动、凝神观看、被视觉冲击震撼**的分镜脚本。

## 导演思维原则（视觉冲击优先）

**0. 视觉冲击是第一要务**
每个分镜都要问：这个镜头能让人"wow"一声吗？
- 如果答案是"不能"，重新设计
- 视觉冲击不是炫技，而是服务于情感和叙事的震撼效果
- 抓人眼球的要素：强烈对比、意外构图、震撼光影、动感运镜

**1. 情感驱动的镜头选择**

**1. 情感驱动的镜头选择**
每个镜头的选择必须回答：这个镜头要传达什么情感？如何让观众感受到？
- 情绪高潮时：用特写、浅景深、低角度，强化冲击力
- 安静反思时：用远景、深景深、固定镜头，留出呼吸空间
- 建立关系时：用中景、双人构图、平视角度，平等对话
- 角色成长时：从俯视（弱小）到仰视（强大），展现地位变化

**2. 视觉叙事的连贯性**
考虑场景之间的视觉节奏：
- 节奏紧张：多用特写、快切、跟随运镜
- 节奏舒缓：多用全景、固定镜头、缓慢横移
- 节奏对比：在平静后突然特写，制造张力

**3. 场景的戏剧目标**
每个分镜要服务于剧本的核心冲突和主题：
- 开场：用远景或推镜头建立世界观
- 冲突：用特写和动态运镜展现对抗
- 高潮：用多层次构图和强烈对比渲染气氛
- 结局：用固定镜头或拉镜头给观众思考空间

**4. 转场的情感功能**
- Cut（切）：情节推进，节奏紧凑
- Fade（淡）：时间流逝，情绪转换
- Dissolve（叠化）：回忆、梦境、平行时空
- Wipe（划像）：同时发生的事件，场景切换

## 专业术语库

**景别（情感强度递减）**：
- Extreme Close-up（极特写）：眼睛、指尖，极度紧张
- Close-up（特写）：面部表情，情感核心
- Medium Close-up（近景）：肩部以上，亲密对话
- Medium Shot（中景）：腰部以上，互动关系
- Medium Wide（中远景）：全身以上，环境与人物
- Wide Shot（全景）：完整场景，空间关系
- Extreme Wide（远景）：宏大的环境，世界观建立

**运镜（动感强度）**：
- Static（固定）：稳定、观察、客观
- Slow Pan/Truck（缓慢平移）：抒情、扫视、沉浸
- Tracking Follow（跟拍）：伴随角色，增强代入感
- Dolly In（推进）：聚焦、强调、深入
- Dolly Out（拉远）：揭示、疏离、反思
- Whip Pan（快速摇甩）：动感、混乱、冲突
- Handheld（手持）：纪实、不安、亲密

**角度（权力关系）**：
- Eye Level（平视）：平等、客观、常态
- High Angle（俯视）：角色显得渺小、弱势、被支配
- Low Angle（仰视）：角色显得高大、强势、英雄
- Dutch Angle（倾斜角度）：不安、混乱、心理失衡

**构图（视觉引导）**：
- Rule of Thirds（三分法）：动态平衡，主体在交点
- Center Symmetry（中心对称）：稳定、庄重、仪式感
- Diagonal（对角线）：动感、张力、冲突
- Leading Lines（引导线）：视线引导，纵深
- Frame within Frame（框中框）：聚焦、观察、窥视
- Negative Space（负空间）：孤独、沉思、留白

**景深（聚焦方式）**：
- Shallow DOF（浅景深）：聚焦主体，虚化背景，情绪强烈
- Deep DOF（深景深）：环境清晰，背景与主体并重

**光线（氛围营造）**：
- Natural Daylight（自然日光）：明亮、希望、真实
- Golden Hour（黄金时段）：温暖、浪漫、怀旧
- Blue Hour（蓝调时刻）：神秘、忧郁、静谧
- Interior Warm Light（室内暖光）：亲密、温馨、安全
- Interior Cool Light（室内冷光）：疏离、冷静、距离
- Rim/Back Light（轮廓光）：分离主体，戏剧性
- Rembrandt（伦勃朗光）：经典、戏剧性、深度
- Chiaroscuro（明暗对比）：强烈对比、神秘、张力

## 返回格式（严格JSON）

\`\`\`json
{
  "artStyle": "${artStyle}",
  "aspectRatio": "9:16",
  "cameraStyle": "整体运镜风格（描述镜头节奏，强调视觉冲击：如'开场用慢速推镜头建立氛围，第2场突然切换手持跟拍制造不安，高潮用快速剪辑和强烈对比释放张力'）",
  "lightingStyle": "整体光线风格（描述光线基调，强调抓人眼球：如'整体采用温暖的黄金时段自然光，但开场突然用冷色调制造反差，情感高潮用强烈的轮廓光和阴影对比震撼观众'）",
  "scenes": [
    {
      "sceneNumber": 1,
      "shotType": "景别（开场必须用震撼的景别建立视觉冲击，如Extreme Wide Shot展现宏大或Extreme Close-up直击眼球）",
      "cameraAngle": "角度（开场要用意外角度抓人，如Low Angle英雄化或Dutch Angle制造不安）",
      "cameraMovement": "运镜（开场必须有动感，如Dolly In推进聚焦或Whip Pan快速切换）",
      "focalLength": "焦距（开场用广角表现空间，或长焦特写突出情感）",
      "depthOfField": "景深（开场用浅景深聚焦主体，或深景深展现环境张力）",
      "composition": "构图（必须用有冲击力的构图，如Diagonal对角线制造动感、Frame within Frame框中框聚焦焦点）",
      "characterPosition": "人物位置（必须占据有冲击力的位置，如画面边缘或中心对称）",
      "lighting": "光线描述（开场必须有强烈对比，如Rim Light轮廓光、Chiaroscuro明暗对比）",
      "colorTemperature": "色温（开场用反差制造冲击，如冷色配暖色）",
      "mood": "氛围（用震撼的形容词，如'压抑而紧张'而非简单的'紧张'）",
      "transition": "转场方式（开场用Cut快切或Fade营造氛围）",
      "prompt": "英文AI生图提示词（必须震撼：${currentArtStyleKeywords} + 极强视觉冲击的构图 + 强烈对比的光影 + 动感的运镜 + [人物详细描述：每个出场人物的具体动作（如'左手持杯，右手食指指向对方，身体前倾'）、具体表情（如'嘴角微挑，眼神犀利，眉毛上扬'）、具体姿态（如'双脚分开站立，肩膀紧绷，右手握拳'）、位置（如'on the left side, occupying one-third of the frame'）] + 戏剧性情绪 + 抓人眼球的氛围细节）",
      "videoPrompt": "英文视频提示词（必须动态且震撼：描述快速摄像机运动 + 强烈的视觉对比 + 角色戏剧性动作 + 动态环境氛围 + 快速或缓慢的节奏反差）"
    }
  ]
}
\`\`\`

## 创作要求

1. **情感优先**：每个分镜先问"情感是什么"，再选择技术手段
2. **视觉叙事**：镜头是语言，不是炫技，每个镜头都要推进故事
3. **角色状态**：通过景别、角度、光线展现角色的内心世界和成长
4. **节奏把控**：考虑整体叙事节奏，张弛有度，避免单调
5. **连贯性**：转场自然，画面语言一致，形成视觉整体
6. **画风融合**：prompt必须包含画风关键词：${currentArtStyleKeywords}
7. **人物细节（CRITICAL - 关键帧生成的基础）**：
   - **每个出场人物必须在prompt中有详细描述**，包括：
     - **具体动作**：基于剧本的 action，描述人物正在做什么（不是"站立"，而是"双手抱胸，身体后仰，靠在墙上"）
     - **具体表情**：基于剧本的 mood 和 dialogue，描述人物的面部表情（不是"开心"，而是"嘴角上扬，眼睛弯成月牙，眉头舒展"）
     - **具体姿态**：描述人物的肢体语言（"身体前倾，双手握拳" vs "身体放松，手臂自然下垂"）
     - **位置细节**：描述人物在场景中的具体位置和构图关系（"占据画面左侧三分之一处" vs "在画面中央"）
   - **多个人物时**：明确每个人的位置和状态差异（如"左边人物激动地指向右边，右边人物惊讶地后退"）
   - **动态状态**：如果是动作场景，描述动态细节（如"手臂正在挥动的模糊残影"）
   - **道具互动**：如果人物有道具，描述如何使用（如"手指悬在键盘上方，屏幕的光映在脸上"）
`;

    // 增强剧本分析，包含情感和戏剧信息
    let scriptAnalysisParts = ['[剧本分析]'];
    scriptAnalysisParts.push('标题：《' + script.title + '》');
    scriptAnalysisParts.push('类型：' + script.genre);
    scriptAnalysisParts.push('核心冲突：' + script.logline);
    scriptAnalysisParts.push('情感弧线：' + script.emotionalArc);
    scriptAnalysisParts.push('视觉风格：' + script.visualStyle);
    scriptAnalysisParts.push('整体基调：' + script.summary);
    scriptAnalysisParts.push('');
    scriptAnalysisParts.push('[场次信息]');

    const sceneParts = script.scenes.map((s: any, i: number) => {
      const sceneInfo = [
        '场景' + (i + 1) + '：',
        '- 地点：' + s.location,
        '- 时间：' + s.timeOfDay,
        '- 人物：' + s.characters.join('、'),
        '- 动作描述：' + s.action,
        '- 对话内容：' + (s.dialogue || '无'),
        '- 情绪基调：' + s.mood,
        '- 情感钩子：' + (s.visualHook || '视觉冲击点'),
        '- 戏剧重点：' + (s.emotionalBeat || '情感节拍'),
        '- 持续时间：' + s.duration,
        '- 人物状态推导：',
        ...s.characters.map((char: string) => {
          return [
            '  人物"' + char + '"：',
            '   - 可能的动作：基于"' + s.action + '"推断人物的肢体动作',
            '   - 可能的表情：基于"' + s.mood + '"和"' + (s.dialogue || '') + '"推断面部表情',
            '   - 可能的姿态：基于情感状态推断身体姿态和肢体语言',
            '   - 位置安排：根据构图需求建议人物在画面中的位置',
          ].join('\n');
        })
      ];
      return sceneInfo.join('\n');
    });

    scriptAnalysisParts.push(...sceneParts);
    scriptAnalysisParts.push('');
    scriptAnalysisParts.push('[导演创作指南]');
    scriptAnalysisParts.push('1. 分析每个场景的戏剧目标：这个场景要达成什么？让观众感受到什么？');
    scriptAnalysisParts.push('2. 考虑情感弧线：开场建立氛围，中段推进冲突，高潮释放情绪，结局留下余韵');
    scriptAnalysisParts.push('3. 角色状态变化：通过镜头语言展现角色在故事中的成长和转变');
    scriptAnalysisParts.push('4. 视觉节奏：在紧张与舒缓之间找到平衡，避免观众疲劳');
    scriptAnalysisParts.push('5. 人物状态推导（关键）：');
    scriptAnalysisParts.push('   - 从动作描述推断具体肢体语言（如"拿起电话"→"手指颤抖着拿起电话，屏幕的光照亮脸部"）');
    scriptAnalysisParts.push('   - 从对话内容推断表情和眼神（如"我绝对不会原谅你"→"紧咬嘴唇，眼神冰冷，眉头紧锁"）');
    scriptAnalysisParts.push('   - 从情绪基调推断整体姿态（如"愤怒"→"身体前倾，双手握拳，肩膀紧绷" vs "悲伤"→"肩膀下垂，眼睑低垂，身体微蜷"）');
    scriptAnalysisParts.push('   - 从人物数量决定构图关系（单人/双人/多人，不同站位和互动）');
    scriptAnalysisParts.push('6. Prompt生成规范：');
    scriptAnalysisParts.push('   - 每个出场人物必须有一句完整的描述（动作+表情+姿态+位置）');
    scriptAnalysisParts.push('   - 使用具体的视觉动词，避免笼统描述');
    scriptAnalysisParts.push('   - 多人物时用"on the left/right/center"明确位置');
    scriptAnalysisParts.push('   - 描述人物之间的互动关系（对视、接触、距离等）');
    scriptAnalysisParts.push('');
    scriptAnalysisParts.push('[画风]');
    scriptAnalysisParts.push(artStyle + ' - 关键词：' + currentArtStyleKeywords);
    scriptAnalysisParts.push('');
    scriptAnalysisParts.push('请以导演思维创作分镜JSON，每个镜头都要有明确的情感目的和叙事功能。');

    const scriptAnalysis = scriptAnalysisParts.join('\n');

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: scriptAnalysis },
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
