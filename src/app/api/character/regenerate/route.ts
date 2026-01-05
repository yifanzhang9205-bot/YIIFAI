import { NextRequest, NextResponse } from 'next/server';
import { Config, ImageGenerationClient } from 'coze-coding-dev-sdk';

interface RegenerateRequest {
  character: {
    name: string;
    role: string;
    ethnicity: string;
    age: string;
    gender: string;
    description: string;
    appearance: string;
    outfit: string;
    expression: string;
    prompt: string;
  };
  artStyle: string;
  artStyleStrength?: number;
  unifiedSetting: {
    ethnicity: string;
    artStyleKeywords: string;
    familyTraits: string;
  };
}

// 重新生成单个角色图片
export async function POST(request: NextRequest) {
  try {
    const body: RegenerateRequest = await request.json();
    const { character, artStyle, artStyleStrength = 80, unifiedSetting } = body;

    const config = new Config();
    const imageClient = new ImageGenerationClient(config);

    // 根据画风强度调整prompt
    const strengthWeight = artStyleStrength / 100;
    let finalPrompt = character.prompt;
    
    if (strengthWeight < 0.5) {
      // 强度较低时，添加写实关键词
      finalPrompt = `photorealistic, 8k, ultra detailed, realistic lighting, ${character.prompt}`;
    }

    // 使用统一的画风关键词
    const artStyleKeywords = unifiedSetting.artStyleKeywords;
    if (!finalPrompt.toLowerCase().includes(artStyleKeywords.toLowerCase())) {
      finalPrompt = `${artStyleKeywords}, ${finalPrompt}`;
    }

    // 添加竖屏尺寸
    finalPrompt = `${finalPrompt}, portrait orientation, 9:16 aspect ratio`;

    console.log(`重新生成角色 ${character.name}，prompt:`, finalPrompt);

    // 生成图片
    const imageResponse = await imageClient.generate({
      prompt: finalPrompt,
      size: '720x1280',
      watermark: false,
      responseFormat: 'url',
    });

    const helper = imageClient.getResponseHelper(imageResponse);

    if (!helper.success || helper.imageUrls.length === 0) {
      throw new Error(`生成角色 ${character.name} 失败`);
    }

    return NextResponse.json({
      success: true,
      imageUrl: helper.imageUrls[0],
    });
  } catch (err) {
    console.error('重新生成角色失败:', err);
    return NextResponse.json(
      { 
        success: false, 
        error: err instanceof Error ? err.message : '重新生成失败' 
      },
      { status: 500 }
    );
  }
}
