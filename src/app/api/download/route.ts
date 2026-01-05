import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import axios from 'axios';

interface DownloadRequest {
  keyframes: Array<{
    sceneNumber: number;
    prompt: string;
    imageUrl: string;
  }>;
  videoPrompts?: {
    overallStyle: {
      visualStyle: string;
      colorPalette: string;
      motionStyle: string;
      audioAtmosphere: string;
    };
    scenes: Array<{
      sceneNumber: number;
      sceneDescription: string;
      soraPrompt: string;
      runwayPrompt: string;
      pikaPrompt: string;
      klingPrompt: string;
      chinesePrompt: string;
      cameraMovement: string;
      duration: string;
      motionIntensity: string;
      audioSuggestion: string;
      musicMood: string;
    }>;
  };
  scriptTitle: string;
}

// 打包下载所有资源
export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { keyframes, videoPrompts, scriptTitle } = body;

    if (!keyframes || keyframes.length === 0) {
      return NextResponse.json(
        { error: '没有可下载的内容' },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    // 1. 添加关键帧图片
    const keyframesFolder = zip.folder('keyframes');
    for (const keyframe of keyframes) {
      try {
        // 下载图片
        const imageResponse = await axios.get(keyframe.imageUrl, {
          responseType: 'arraybuffer',
        });

        // 使用场景编号作为文件名，确保对应关系
        const fileName = `scene_${String(keyframe.sceneNumber).padStart(2, '0')}.png`;
        keyframesFolder?.file(fileName, imageResponse.data);
      } catch (error) {
        console.error(`下载场景${keyframe.sceneNumber}图片失败:`, error);
      }
    }

    // 2. 添加提示词文件
    if (videoPrompts) {
      // 整体风格说明
      const overallStyleText = `整体风格建议
-------------------
视觉风格：${videoPrompts.overallStyle.visualStyle}
色调：${videoPrompts.overallStyle.colorPalette}
运动风格：${videoPrompts.overallStyle.motionStyle}
音效氛围：${videoPrompts.overallStyle.audioAtmosphere}

`;

      // 为每个场景生成单独的提示词文件
      const promptsFolder = zip.folder('prompts');
      promptsFolder?.file('00_整体风格.txt', overallStyleText);

      for (const scene of videoPrompts.scenes) {
        const sceneText = `场景 ${scene.sceneNumber} - ${scene.sceneDescription}
======================================

摄像机运动：${scene.cameraMovement}
建议时长：${scene.duration}
运动强度：${scene.motionIntensity}
音乐情绪：${scene.musicMood}
音效建议：${scene.audioSuggestion}

---
OpenAI Sora 提示词
${scene.soraPrompt}

---
Runway Gen-2 提示词
${scene.runwayPrompt}

---
Pika 提示词
${scene.pikaPrompt}

---
Kling（可灵）提示词
${scene.klingPrompt}

---
中文通用提示词
${scene.chinesePrompt}
`;

        const fileName = `scene_${String(scene.sceneNumber).padStart(2, '0')}_prompts.txt`;
        promptsFolder?.file(fileName, sceneText);
      }
    }

    // 3. 添加说明文件
    const readmeText = `${scriptTitle} - AI视频生成素材包
====================================

文件说明：
--------
keyframes/       - 关键帧图片文件夹，每个场景一张图片，文件名格式为 scene_XX.png
prompts/         - 视频生成提示词文件夹，每个场景一个txt文件，文件名格式为 scene_XX_prompts.txt

使用方法：
--------
1. 查看 keyframes/ 文件夹中的图片，预览每个场景的画面
2. 查看 prompts/ 文件夹中的提示词，选择适合你的AI视频工具
3. 复制提示词到 Sora、Runway、Pika、Kling 等工具生成视频
4. 按场景编号顺序拼接视频，完成最终作品

提示：
- 所有关键帧尺寸均为 720×1280（竖屏9:16）
- 提示词已经针对不同工具优化，直接使用即可
- 建议先根据关键帧预览确认画面效果，再生成视频

生成时间：${new Date().toLocaleString('zh-CN')}
`;

    zip.file('README.txt', readmeText);

    // 生成ZIP文件
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;

    // 返回ZIP文件
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(scriptTitle)}_素材包.zip"`,
      },
    });

  } catch (error) {
    console.error('打包下载失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '打包下载失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
