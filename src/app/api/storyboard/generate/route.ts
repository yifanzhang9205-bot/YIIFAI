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

    // 简化系统提示词，提升响应速度
    const systemPrompt = `你是专业分镜师。将剧本转换为JSON分镜脚本。

返回JSON格式：
{
  "artStyle": "${artStyle}",
  "aspectRatio": "9:16",
  "cameraStyle": "运镜风格（如：稳定机位、缓慢跟拍）",
  "lightingStyle": "光线风格（如：自然光、室内暖光）",
  "scenes": [
    {
      "sceneNumber": 1,
      "shotType": "景别（Close-up/Medium Shot/Wide Shot）",
      "cameraAngle": "角度（Eye Level/High Angle/Low Angle）",
      "cameraMovement": "运镜（Static/Dolly In/Pan/Tracking）",
      "focalLength": "焦距（标准/广角/长焦）",
      "depthOfField": "景深（Shallow DOF/Deep DOF）",
      "composition": "构图（三分法/对称/对角线）",
      "characterPosition": "人物位置描述",
      "lighting": "光线描述",
      "colorTemperature": "色温（warm/cool/neutral）",
      "mood": "氛围",
      "transition": "转场（Cut/Fade/Dissolve）",
      "prompt": "英文提示词：${currentArtStyleKeywords} + 画面描述",
      "videoPrompt": "英文视频提示词：画面动态 + 摄像机运动"
    }
  ]
}

关键要求：
1. prompt必须包含画风关键词：${currentArtStyleKeywords}
2. 简洁专业，适合AI视频生成
3. 直接返回JSON，不要任何解释`;

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
