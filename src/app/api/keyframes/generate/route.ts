import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';

interface KeyframeRequest {
  storyboard: any; // StoryboardScript
  characterImages: string[]; // 人物设定图URL
  fastMode?: boolean; // 快速预览模式（低分辨率）
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
    const { storyboard, characterImages, fastMode = false } = body;

    if (!storyboard || !storyboard.scenes || storyboard.scenes.length === 0) {
      return NextResponse.json(
        { error: '分镜脚本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const imageClient = new ImageGenerationClient(config);

    // 根据模式选择分辨率
    const imageSize = fastMode ? '512x912' : '720x1280';
    console.log(`开始并发生成 ${storyboard.scenes.length} 个关键帧（尺寸: ${imageSize}）...`);

    // 使用人物设定图作为参考（image-to-image）
    const referenceImage = characterImages.length > 0 ? characterImages[0] : undefined;

    // 构建所有场景的生成任务
    const keyframePromises = storyboard.scenes.map(async (scene: any, index: number) => {
      console.log(`生成关键帧 - 场景${scene.sceneNumber}...`);

      const imageResponse = await imageClient.generate({
        prompt: scene.prompt,
        image: referenceImage, // 使用人物设定图保持一致性
        size: imageSize, // 统一高度
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
