import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';

interface KeyframeRequest {
  storyboard: any; // StoryboardScript
  characterImages: string[]; // 人物设定图URL
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
    const { storyboard, characterImages } = body;

    if (!storyboard || !storyboard.scenes || storyboard.scenes.length === 0) {
      return NextResponse.json(
        { error: '分镜脚本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const imageClient = new ImageGenerationClient(config);

    const keyframes: KeyframeScene[] = [];

    // 为每个场景生成关键帧
    for (const scene of storyboard.scenes) {
      console.log(`生成关键帧 - 场景${scene.sceneNumber}`);

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

      keyframes.push({
        sceneNumber: scene.sceneNumber,
        prompt: scene.prompt,
        imageUrl: helper.imageUrls[0],
      });

      // 避免请求过快，延迟1秒
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

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
