import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, ImageGenerationClient } from 'coze-coding-dev-sdk';

interface CharacterRequest {
  script: any; // MovieScript
  artStyle: string;
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
    const { script, artStyle } = body;

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
    };

    // 获取当前画风的关键词
    const currentArtStyleKeywords = artStyleKeywordsMap[artStyle] || artStyleKeywordsMap['写实风格'];

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

重要提示：
- 在生成每个人物的 prompt 时，**必须**包含画风关键词："${currentArtStyleKeywords}"
- 画风关键词是强制性的，不能省略
- prompt结构应为：性别关键词 + 画风关键词 + 种族关键词 + 个人特征 + 家族特征

请仔细分析人物关系，确保：
1. 种族和血缘关系的一致性
2. 性别识别准确（父亲/儿子=男性，母亲/女儿=女性）
3. prompt中必须包含明确的性别关键词
4. prompt中必须包含画风关键词：${currentArtStyleKeywords}
`;

    const relationshipMessages = [
      { role: 'system' as const, content: '你是专业的人物关系分析师，确保逻辑一致性。' },
      { role: 'user' as const, content: relationshipPrompt },
    ];

    const relationshipResponse = await llmClient.invoke(relationshipMessages, { temperature: 0.5 });

    const jsonMatch = relationshipResponse.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析人物关系设定');
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

    // 步骤4：为每个人物生成设定图（统一高度 720x1280）
    const characterImages: string[] = [];

    for (const character of characters) {
      console.log(`生成人物设定图：${character.name}（种族：${character.ethnicity}，性别：${character.gender}）`);

      // 优化 prompt，确保包含统一种族和画风
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
        // 如果性别不明确，默认为男性（或可以报错）
        console.warn(`角色${character.name}性别不明确：${character.gender}，默认使用男性`);
        genderKeyword = 'man, male';
      }

      // 确保包含所有一致性要素，性别和画风关键词放在最前面
      const unifiedPrompt = `${genderKeyword}, ${currentArtStyleKeywords}, ${character.prompt}, ${ethnicityKeyword}, ${characterData.unifiedSetting.familyTraits}`;

      const imageResponse = await imageClient.generate({
        prompt: unifiedPrompt,
        size: '720x1280',
        watermark: false,
      });

      const helper = imageClient.getResponseHelper(imageResponse);

      if (!helper.success || helper.imageUrls.length === 0) {
        throw new Error(`生成人物${character.name}设定图失败`);
      }

      characterImages.push(helper.imageUrls[0]);
    }

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
