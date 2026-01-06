import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, LLMClient } from 'coze-coding-dev-sdk';

interface KeyframeRequest {
  storyboard: any; // StoryboardScript
  characterImages: string[]; // 人物设定图URL
  characterDesign: any; // 人物设计信息（包含人物名称和图片索引）
  fastMode?: boolean; // 快速预览模式（低分辨率）
  sceneCharacterMapping?: any[]; // 场景-人物映射（新增）
}

interface KeyframeScene {
  sceneNumber: number;
  prompt: string;
  imageUrl: string;
}

interface Keyframes {
  scenes: KeyframeScene[];
}

// 生成关键帧
export async function POST(request: NextRequest) {
  try {
    const body: KeyframeRequest = await request.json();
    const { storyboard, characterImages, characterDesign, fastMode = false, sceneCharacterMapping } = body;

    if (!storyboard || !storyboard.scenes || storyboard.scenes.length === 0) {
      return NextResponse.json(
        { error: '分镜脚本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const imageClient = new ImageGenerationClient(config);
    const llmClient = new LLMClient(config);

    // 步骤1：为每个场景生成优化的关键帧prompt（理解情感和氛围）
    console.log('步骤1：分析场景情感，生成优化prompt...');

    const sceneCharactersMap: Record<number, any[]> = {};
    if (sceneCharacterMapping) {
      sceneCharacterMapping.forEach((mapping: any) => {
        if (mapping.sceneNumber && mapping.characters) {
          const characterDetails = mapping.characters
            .map((charInfo: any) => {
              const charData = characterDesign?.characters?.find((c: any) => c.name === charInfo.name);
              if (!charData) return null;
              return {
                name: charData.name,
                gender: charData.gender,
                ethnicity: charData.ethnicity,
                appearance: charData.appearance,
                outfit: charData.outfit,
                expression: charData.expression,
              };
            })
            .filter(Boolean);
          sceneCharactersMap[mapping.sceneNumber] = characterDetails;
        }
      });
    }

    const sceneEnhancementPrompt = `你是一位资深电影美术指导和视觉艺术家，擅长将剧本情感转化为视觉语言。
你的任务是为每个场景生成优化的AI生图提示词，让画面具有电影感和戏剧张力。

## 关键帧创作思维

**1. 情感即视觉（Emotion is Visual）**
- 场景的情绪基调决定了光影、色彩、构图
- 紧张：强烈的对比度、锐利的阴影、动态构图
- 温馨：柔和的光线、暖色调、开放式构图
- 忧郁：冷色调、低对比度、留白空间

**2. 人物即故事（Character is Story）**
- 人物的姿态、表情要反映他们在故事中的状态
- 人物的服装、道具要服务于叙事功能
- 多人场景：人物之间的关系要通过构图和站位来体现

**3. 场景即氛围（Scene is Atmosphere）**
- 环境不仅仅是背景，是情绪的容器
- 光影要增强戏剧效果
- 色彩要传达情感基调

**4. 构图即焦点（Composition is Focus）**
- 确保观众视线聚焦在叙事重点上
- 利用引导线、景深、留白强化焦点
- 构图要服务于戏剧目标

## 场景分析

${storyboard.scenes.map((scene: any) => {
  const characters = sceneCharactersMap[scene.sceneNumber] || [];
  return `
【场景${scene.sceneNumber}】
- 场景类型：${scene.shotType}
- 角度：${scene.cameraAngle}
- 运镜：${scene.cameraMovement}
- 构图：${scene.composition}
- 人物位置：${scene.characterPosition}
- 光线：${scene.lighting}
- 色温：${scene.colorTemperature}
- 氛围：${scene.mood}
- 出场人物：${characters.length > 0 ? characters.map((c: any) => c.name).join(', ') : '无'}
${characters.length > 0 ? characters.map((c: any) => `  - ${c.name}：${c.gender}，${c.ethnicity}，外貌：${c.appearance}，服装：${c.outfit}，表情：${c.expression}`).join('\n') : ''}
- 原始提示词：${scene.prompt}
`;
}).join('\n')}

## 返回格式（严格JSON）

\`\`\`json
{
  "enhancedPrompts": [
    {
      "sceneNumber": 1,
      "enhancedPrompt": "优化后的英文生图提示词（包含：1.完整的场景描述 2.人物细节（如果有）3.光影效果 4.色彩氛围 5.构图强化 6.情感表达，比原始prompt更具电影感和戏剧性）"
    }
  ]
}
\`\`\`

## 优化要求

1. **强化情感表达**：用视觉元素增强场景的情绪基调
2. **深化氛围营造**：光影、色彩、构图要服务于情感
3. **细化人物细节**：人物的表情、姿态要反映他们的状态
4. **增强电影感**：添加电影摄影的质感描述（如：cinematic lighting, dramatic shadows, depth of field等）
5. **保持一致性**：人物特征、服装、道具要与设定一致
6. **保留原始意图**：不要改变分镜的核心意图，只是强化表现力

请为每个场景生成优化后的prompt，让画面更有戏剧张力和电影质感。`;

    const sceneEnhancementMessages = [
      { role: 'system' as const, content: '你是资深电影美术指导，擅长将情感转化为视觉语言。' },
      { role: 'user' as const, content: sceneEnhancementPrompt },
    ];

    let sceneEnhancementResponse: any;
    try {
      sceneEnhancementResponse = await llmClient.invoke(sceneEnhancementMessages, {
        model: 'doubao-seed-1-6-flash-250615',
        temperature: 0.5
      });

      console.log('场景增强分析完成');

      // 提取JSON
      let enhancementJsonContent = sceneEnhancementResponse.content.trim();
      enhancementJsonContent = enhancementJsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      const enhancementJsonMatch = enhancementJsonContent.match(/\{[\s\S]*\}/);
      if (!enhancementJsonMatch) {
        console.warn('场景增强解析失败，使用原始prompt');
        throw new Error('无法解析场景增强提示词');
      }

      const enhancementData = JSON.parse(enhancementJsonMatch[0]);
      const enhancedPromptMap: Record<number, string> = {};
      enhancementData.enhancedPrompts.forEach((item: any) => {
        enhancedPromptMap[item.sceneNumber] = item.enhancedPrompt;
      });

      console.log(`已增强 ${Object.keys(enhancedPromptMap).length} 个场景的prompt`);

      // 将增强的prompt合并到storyboard中
      storyboard.scenes.forEach((scene: any) => {
        if (enhancedPromptMap[scene.sceneNumber]) {
          scene.originalPrompt = scene.prompt;
          scene.prompt = enhancedPromptMap[scene.sceneNumber];
          console.log(`场景${scene.sceneNumber} prompt已增强`);
        }
      });

    } catch (error) {
      console.warn('场景增强失败，使用原始prompt:', error);
      // 继续使用原始prompt
    }

    // 根据模式选择分辨率
    const imageSize = fastMode ? '512x912' : '720x1280';
    console.log(`开始并发生成 ${storyboard.scenes.length} 个关键帧（尺寸: ${imageSize}）...`);

    // 构建人物名称到图片索引的映射
    const characterImageMap: Record<string, number> = {};
    if (characterDesign && characterDesign.characters) {
      characterDesign.characters.forEach((char: any, index: number) => {
        characterImageMap[char.name] = index;
      });
    }

    // 辅助函数：根据场景获取应该使用的人物参考图
    const getSceneReferenceImages = (sceneNumber: number): string[] => {
      if (!sceneCharacterMapping) {
        // 如果没有映射，返回所有人物图（向后兼容）
        return characterImages;
      }

      const sceneMapping = sceneCharacterMapping.find((m: any) => m.sceneNumber === sceneNumber);
      if (!sceneMapping || !sceneMapping.characters || sceneMapping.characters.length === 0) {
        // 该场景没有人物，使用第一张图作为风格参考
        return characterImages.length > 0 ? [characterImages[0]] : [];
      }

      // 根据场景中的角色名称，选择对应的人物图
      const sceneCharacterImages = sceneMapping.characters
        .map((charInfo: any) => {
          const imageIndex = characterImageMap[charInfo.name];
          return imageIndex !== undefined ? characterImages[imageIndex] : null;
        })
        .filter((img: any): img is string => img !== null);

      // 如果没有找到匹配的人物图，使用第一张图作为风格参考
      return sceneCharacterImages.length > 0 ? sceneCharacterImages : (characterImages.length > 0 ? [characterImages[0]] : []);
    };

    // 构建所有场景的生成任务
    const keyframePromises = storyboard.scenes.map(async (scene: any, index: number) => {
      console.log(`生成关键帧 - 场景${scene.sceneNumber}...`);

      // 根据场景选择对应的人物参考图
      const sceneReferenceImages = getSceneReferenceImages(scene.sceneNumber);
      const referenceImage = sceneReferenceImages.length > 0 ? sceneReferenceImages[0] : undefined;

      // 增强prompt：如果场景有多个角色，在prompt中明确描述
      const sceneMapping = sceneCharacterMapping?.find((m: any) => m.sceneNumber === scene.sceneNumber);
      let enhancedPrompt = scene.prompt;

      if (sceneMapping && sceneMapping.characters.length > 0) {
        // 多人物场景：在prompt中明确标注每个角色
        console.log(`  场景${scene.sceneNumber}包含${sceneMapping.characters.length}个角色: ${sceneMapping.characters.map((c: any) => c.name).join(', ')}`);

        // 获取该场景中每个角色的详细信息
        const characterDetails = sceneMapping.characters
          .map((charInfo: any) => {
            const charData = characterDesign?.characters?.find((c: any) => c.name === charInfo.name);
            if (!charData) return null;

            return {
              name: charData.name,
              gender: charData.gender,
              ethnicity: charData.ethnicity,
              appearance: charData.appearance,
              outfit: charData.outfit,
            };
          })
          .filter(Boolean);

        if (characterDetails.length > 0) {
          // 构建增强的prompt，明确描述每个角色的位置和特征
          const characterDescriptions = characterDetails.map((char: any, idx: number) => {
            const genderKeyword = char.gender.includes('男') || char.gender.toLowerCase().includes('male') ? 'man' : 'woman';
            const positionText = idx === 0 ? 'on the left' : idx === 1 ? 'on the right' : 'in the center';
            return `${genderKeyword}, ${char.ethnicity}, ${char.appearance}, wearing ${char.outfit}, ${positionText}`;
          }).join(', ');

          // 在prompt的开头插入人物描述
          enhancedPrompt = `${characterDescriptions}. ${enhancedPrompt}`;

          console.log(`  增强prompt: ${enhancedPrompt.substring(0, 150)}...`);
        }
      }

      console.log(`  使用参考图数量: ${sceneReferenceImages.length}`);

      const imageResponse = await imageClient.generate({
        prompt: enhancedPrompt,
        image: referenceImage,
        size: imageSize,
        watermark: false,
        responseFormat: 'url',
      });

      const helper = imageClient.getResponseHelper(imageResponse);

      if (!helper.success || helper.imageUrls.length === 0) {
        throw new Error(`生成场景${scene.sceneNumber}关键帧失败`);
      }

      console.log(`✓ 完成场景${scene.sceneNumber}`);
      return { scene, imageUrl: helper.imageUrls[0] };
    });

    // 等待所有关键帧生成完成
    const keyframeResults = await Promise.all(keyframePromises);

    // 按场景编号顺序整理关键帧
    const keyframes: KeyframeScene[] = keyframeResults.map(result => ({
      sceneNumber: result.scene.sceneNumber,
      prompt: result.scene.prompt,
      imageUrl: result.imageUrl,
    }));

    console.log(`✓ 所有关键帧生成完成`);

    return NextResponse.json({
      success: true,
      keyframes,
    });

  } catch (error) {
    console.error('生成关键帧失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成关键帧失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
