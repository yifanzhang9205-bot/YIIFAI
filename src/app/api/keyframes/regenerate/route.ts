import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';

interface RegenerateRequest {
  scene: {
    sceneNumber: number;
    prompt: string;
    imageUrl: string;
  };
  storyboard: any;
  characterImages: string[];
}

// 重新生成单个关键帧
export async function POST(request: NextRequest) {
  try {
    const body: RegenerateRequest = await request.json();
    const { scene, storyboard, characterImages } = body;

    const config = new Config();
    const imageClient = new ImageGenerationClient(config);

    console.log(`重新生成关键帧 - 场景${scene.sceneNumber}`);

    // 使用人物设定图作为参考（image-to-image）
    // 如果有多个人物，使用第一张图作为参考
    const referenceImage = characterImages.length > 0 ? characterImages[0] : undefined;

    const imageResponse = await imageClient.generate({
      prompt: scene.prompt,
      image: referenceImage, // 使用人物设定图保持一致性
      size: '720x1280', // 统一高度
      watermark: false,
      responseFormat: 'url',
    });

    const helper = imageClient.getResponseHelper(imageResponse);

    if (!helper.success || helper.imageUrls.length === 0) {
      throw new Error(`生成场景${scene.sceneNumber}关键帧失败`);
    }

    return NextResponse.json({
      success: true,
      imageUrl: helper.imageUrls[0],
    });

  } catch (error) {
    console.error('重新生成关键帧失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '重新生成关键帧失败',
      },
      { status: 500 }
    );
  }
}
