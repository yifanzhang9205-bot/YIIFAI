import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, ImageGenerationClient } from 'coze-coding-dev-sdk';

interface CharacterRequest {
  script: any; // MovieScript
  artStyle: string;
  artStyleStrength?: number; // 0-100, 画风强度
  fastMode?: boolean; // 快速预览模式（低分辨率）
}

interface CharacterInfo {
  name: string;
  role: string; // 角色：主角/配角等
  relationship: string; // 与其他人物的关系
  ethnicity: string; // 种族/族裔
  age: string;
  gender: string;
  description: string;
  appearance: string;
  outfit: string;
  expression: string;
  prompt: string;
}

interface CharacterDesign {
  unifiedSetting: {
    ethnicity: string; // 统一种族
    artStyleKeywords: string; // 统一画风关键词
    familyTraits: string; // 家族共同特征
  };
  characters: CharacterInfo[];
  characterImages: string[]; // 图片URL
}

// 生成人物设定
export async function POST(request: NextRequest) {
  try {
    const body: CharacterRequest = await request.json();
    const { script, artStyle, artStyleStrength = 80, fastMode = false } = body;

    if (!script || !script.scenes) {
      return NextResponse.json(
        { error: '剧本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const llmClient = new LLMClient(config);
    const imageClient = new ImageGenerationClient(config);

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

    // 步骤1：提取所有人物
    const allCharacters = Array.from(new Set(
      script.scenes.flatMap((s: any) => s.characters || [])
    ));

    if (allCharacters.length === 0) {
      return NextResponse.json(
        { error: '剧本中没有人物信息' },
        { status: 400 }
      );
    }

    // 步骤1.5：分析每个角色在剧本中的出场场景和形象约束
    const characterSceneAnalysis = allCharacters.map(charName => {
      const charScenes = script.scenes.filter((s: any) =>
        s.characters && s.characters.includes(charName)
      );

      return {
        name: charName,
        scenes: charScenes.map(s => ({
          sceneNumber: s.sceneNumber,
          location: s.location,
          timeOfDay: s.timeOfDay,
          mood: s.mood,
          action: s.action,
          emotionalBeat: s.emotionalBeat,
          visualHook: s.visualHook,
        })),
        sceneCount: charScenes.length,
      };
    });

    // 步骤2：分析人物关系和统一设定
    const relationshipPrompt = `你是一个专业的人物关系分析师。
你的任务是根据剧本内容，分析人物之间的关系，并确定统一的种族/族裔设定。

关键原则：
1. **血缘关系必须一致**：父母和孩子必须同一种族
2. **家族成员要有相似特征**：同一家庭的人要有种族特征相似性
3. **避免逻辑错误**：不要出现两个外国父母生了中国孩子的情况
4. **性别必须明确**：每个角色的性别字段必须准确（男/女/male/female）

请返回JSON格式：
{
  "relationships": [
    {"name": "角色名", "role": "角色类型（主角/配角/等）", "relationship": "与他人的关系（如：父亲、母亲、儿子、朋友等）", "age": "年龄", "gender": "性别（必须明确：男/女）"}
  ],
  "unifiedSetting": {
    "ethnicity": "统一的种族/族裔（必须具体，如：东亚人、白人、黑人、拉丁裔等，如果有多人混血请明确说明）",
    "artStyleKeywords": "基于画风${artStyle}的关键词（英文，如：anime style / photorealistic 等）",
    "familyTraits": "家族成员共同的相貌特征（如：圆脸、高鼻梁、深色眼睛等）"
  },
  "characters": [
    {
      "name": "角色名",
      "role": "角色类型",
      "relationship": "关系描述",
      "ethnicity": "种族",
      "age": "年龄",
      "gender": "性别（必须明确：男/女）",
      "description": "角色背景和性格",
      "appearance": "详细外貌描述（必须包含：1.统一的种族特征 2.明确的性别特征）",
      "outfit": "服装描述",
      "expression": "常用表情",
      "prompt": "英文生图提示词（必须包含：1.明确的性别关键词 man/male 或 woman/female 2.统一的种族关键词 3.统一的画风关键词 4.家族共同特征 5.个人独特特征）"
    }
  ]
}

剧本信息：
标题：${script.title}
类型：${script.genre}
人物列表：${allCharacters.join(', ')}
画风选择：${artStyle}
对应英文关键词：${currentArtStyleKeywords}

角色在剧本中的出场场景分析：
${characterSceneAnalysis.map(analysis => `
【${analysis.name}】
- 出现场景数：${analysis.sceneCount}
- 场景详情：
${analysis.scenes.map(s => `  场景${s.sceneNumber}：${s.location}（${s.timeOfDay}），动作：${s.action}，情感：${s.emotionalBeat}，视觉钩子：${s.visualHook}`).join('\n')}
`).join('\n')}

重要提示：
- 在生成每个人物的 prompt 时，**必须**包含画风关键词："${currentArtStyleKeywords}"
- 画风关键词是强制性的，不能省略
- prompt结构应为：性别关键词 + 画风关键词 + 种族关键词 + 个人特征 + 家族特征
- 人物设计必须基于剧本场景细节（如：古代战士需要盔甲，现代学生需要校服等）

请仔细分析人物关系，确保：
1. 种族和血缘关系的一致性
2. 性别识别准确（父亲/儿子=男性，母亲/女儿=女性）
3. prompt中必须包含明确的性别关键词
4. prompt中必须包含画风关键词：${currentArtStyleKeywords}
5. 人物设计要参考剧本中的场景约束（服装、道具、环境）
`;

    const relationshipMessages = [
      { role: 'system' as const, content: '你是专业的人物关系分析师，确保逻辑一致性。' },
      { role: 'user' as const, content: relationshipPrompt },
    ];

    const relationshipResponse = await llmClient.invoke(relationshipMessages, {
      model: 'doubao-seed-1-6-flash-250615', // 使用快速模型
      temperature: 0.5
    });

    // 提取JSON - 移除markdown标记
    let jsonContent = relationshipResponse.content.trim();

    // 移除可能的markdown代码块标记
    jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // 提取JSON（支持嵌套）
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('LLM返回内容:', relationshipResponse.content);
      throw new Error('无法解析人物关系设定，返回格式不正确');
    }

    const characterData: any = JSON.parse(jsonMatch[0]);

    // 步骤3：校验一致性（自检逻辑）
    const unifiedEthnicity = characterData.unifiedSetting.ethnicity;
    const characters = characterData.characters;

    // 检查是否有多个种族
    const ethnicities = new Set(characters.map((c: CharacterInfo) => c.ethnicity));
    if (ethnicities.size > 1) {
      console.warn('检测到多种族角色，统一为：', unifiedEthnicity);
      // 强制统一种族
      characters.forEach((c: CharacterInfo) => {
        c.ethnicity = unifiedEthnicity;
        // 更新 prompt 中的种族关键词
        const ethnicityKeywords: Record<string, string> = {
          '东亚人': 'East Asian',
          '白人': 'Caucasian',
          '黑人': 'African',
          '拉丁裔': 'Latino',
          '南亚人': 'South Asian',
        };
        const ethnicityKey = ethnicityKeywords[unifiedEthnicity] || 'mixed race';
        c.prompt = c.prompt.replace(/\b(East Asian|Caucasian|African|Latino|South Asian|mixed race)\b/gi, ethnicityKey);
      });
    }

    // 检查性别逻辑错误
    characters.forEach((c: CharacterInfo) => {
      const gender = c.gender.toLowerCase();
      const relationship = c.relationship.toLowerCase();

      // 父亲/儿子必须男性
      if ((relationship.includes('父亲') || relationship.includes('father') || relationship.includes('儿子') || relationship.includes('son')) &&
          !(gender.includes('男') || gender.includes('male') || gender.includes('man'))) {
        console.warn(`角色${c.name}关系为${c.relationship}，但性别为${c.gender}，强制修正为男性`);
        c.gender = '男';
      }

      // 母亲/女儿必须女性
      if ((relationship.includes('母亲') || relationship.includes('mother') || relationship.includes('女儿') || relationship.includes('daughter')) &&
          !(gender.includes('女') || gender.includes('female') || gender.includes('woman'))) {
        console.warn(`角色${c.name}关系为${c.relationship}，但性别为${c.gender}，强制修正为女性`);
        c.gender = '女';
      }
    });

    // 检查prompt是否包含画风关键词
    characters.forEach((c: CharacterInfo) => {
      const promptLower = c.prompt.toLowerCase();

      // 检查是否包含画风关键词
      const hasArtStyle = currentArtStyleKeywords.split(',').some(keyword =>
        promptLower.includes(keyword.trim().toLowerCase())
      );

      if (!hasArtStyle) {
        console.warn(`角色${c.name}的prompt缺少画风关键词，强制添加`);
        // 强制在开头添加画风关键词
        c.prompt = `${currentArtStyleKeywords}, ${c.prompt}`;
      }
    });

    // 步骤4：为每个人物生成设定图（优化：并发生成）
    console.log(`开始并发生成 ${characters.length} 个人物设定图...`);

    // 根据模式选择分辨率
    const imageSize = fastMode ? '512x912' : '720x1280';
    console.log(`图片尺寸: ${imageSize} (${fastMode ? '快速预览模式' : '标准模式'})`);

    // 构建所有人物的prompt
    const characterPrompts = characters.map((character: CharacterInfo) => {
      const ethnicityMap: Record<string, string> = {
        '东亚人': 'East Asian',
        '白人': 'Caucasian',
        '黑人': 'African',
        '拉丁裔': 'Latino',
        '南亚人': 'South Asian',
      };

      const ethnicityKeyword: string = ethnicityMap[unifiedEthnicity] || 'mixed race';

      // 添加明确的性别关键词
      let genderKeyword = '';
      const gender = character.gender.toLowerCase();
      if (gender.includes('男') || gender.includes('male') || gender.includes('man')) {
        genderKeyword = 'man, male';
      } else if (gender.includes('女') || gender.includes('female') || gender.includes('woman')) {
        genderKeyword = 'woman, female';
      } else {
        console.warn(`角色${character.name}性别不明确：${character.gender}，默认使用男性`);
        genderKeyword = 'man, male';
      }

      // 确保包含所有一致性要素
      const unifiedPrompt = `${genderKeyword}, ${currentArtStyleKeywords}, ${character.prompt}, ${ethnicityKeyword}, ${characterData.unifiedSetting.familyTraits}`;

      return { character, prompt: unifiedPrompt };
    });

    // 并发生成所有人物图片
    const imagePromises = characterPrompts.map(async ({ character, prompt }: { character: CharacterInfo; prompt: string }) => {
      console.log(`生成人物设定图：${character.name}...`);

      const imageResponse = await imageClient.generate({
        prompt,
        size: imageSize,
        watermark: false,
      });

      const helper = imageClient.getResponseHelper(imageResponse);

      if (!helper.success || helper.imageUrls.length === 0) {
        throw new Error(`生成人物${character.name}设定图失败`);
      }

      console.log(`✓ 完成：${character.name}`);
      return { index: characters.indexOf(character), imageUrl: helper.imageUrls[0] };
    });

    // 等待所有图片生成完成
    const imageResults = await Promise.all(imagePromises);

    // 按原始顺序整理图片URL
    const characterImages: string[] = [];
    imageResults.sort((a: any, b: any) => a.index - b.index);
    imageResults.forEach((result: any) => characterImages.push(result.imageUrl));

    console.log(`✓ 所有人物设定图生成完成`);

    const design: CharacterDesign = {
      unifiedSetting: characterData.unifiedSetting,
      characters,
      characterImages,
    };

    return NextResponse.json({
      success: true,
      design,
    });

  } catch (error) {
    console.error('生成人物设定失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成人物设定失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
