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
  script?: any; // 添加剧本内容
}

// 打包下载所有资源
export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { keyframes, videoPrompts, scriptTitle, script } = body;

    console.log('开始打包下载，关键帧数量:', keyframes?.length, '视频提示词:', !!videoPrompts, '剧本:', !!script);
    console.log('剧本类型:', typeof script);

    if (!keyframes || keyframes.length === 0) {
      return NextResponse.json(
        { error: '没有可下载的内容' },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    // 1. 添加关键帧图片
    const keyframesFolder = zip.folder('keyframes');
    let successCount = 0;

    for (const keyframe of keyframes) {
      try {
        console.log(`下载场景${keyframe.sceneNumber}图片: ${keyframe.imageUrl}`);

        // 下载图片，添加超时和重试
        const imageResponse = await axios.get(keyframe.imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000, // 30秒超时
        });

        if (imageResponse.data && imageResponse.data.byteLength > 0) {
          // 使用场景编号作为文件名，确保对应关系
          const fileName = `scene_${String(keyframe.sceneNumber).padStart(2, '0')}.png`;
          keyframesFolder?.file(fileName, imageResponse.data);
          successCount++;
          console.log(`✓ 场景${keyframe.sceneNumber}下载成功，文件大小: ${imageResponse.data.byteLength} bytes`);
        } else {
          console.warn(`场景${keyframe.sceneNumber}下载的图片为空`);
        }
      } catch (error) {
        console.error(`下载场景${keyframe.sceneNumber}图片失败:`, error);
        // 添加一个占位文件，说明下载失败
        const errorText = `场景${keyframe.sceneNumber}图片下载失败\n\n图片URL: ${keyframe.imageUrl}\n\n可能原因：\n1. 图片链接已过期\n2. 网络连接问题\n3. 图片服务器限制\n\n建议：请重新生成关键帧后再试`;
        const fileName = `scene_${String(keyframe.sceneNumber).padStart(2, '0')}_ERROR.txt`;
        keyframesFolder?.file(fileName, errorText);
      }
    }

    console.log(`关键帧下载完成: ${successCount}/${keyframes.length} 成功`);

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

    // 3. 添加剧本文件
    if (script) {
      try {
        let scriptText = '';
        if (typeof script === 'string') {
          scriptText = script;
        } else if (typeof script === 'object') {
          // 处理对象类型的剧本
          const title = script.title || '未命名剧本';
          const genre = script.genre || '';
          const duration = script.duration || '';
          const logline = script.logline || '';
          const emotionalArc = script.emotionalArc || '';
          const summary = script.summary || '';

          scriptText = `${title}

类型：${genre}
时长：${duration}
一句话梗概：${logline}
情感弧线：${emotionalArc}

---
剧情梗概
${summary}

---

角色
${script.characters?.map((char: any) => {
            const charName = char?.name || '未命名';
            const charDesc = char?.description ? ' - ' + String(char.description) : '';
            return `${charName}${charDesc}`;
          }).join('\n') || '无'}

---

场景列表
${script.scenes?.map((scene: any) => {
            const sceneNum = scene?.sceneNumber || '?';
            const sceneTitle = scene?.title || '未命名';
            const sceneLoc = scene?.location || '未知';
            const sceneTime = scene?.timeOfDay || '未知';
            const sceneAction = scene?.action || scene?.description || '';
            const sceneDialogue = scene?.dialogue ? '对话：' + String(scene.dialogue) : '';
            return `【场景 ${sceneNum}】${sceneTitle}
地点：${sceneLoc}
时间：${sceneTime}
${sceneAction}
${sceneDialogue}`;
          }).join('\n\n') || '无'}
`;
        }

        if (scriptText) {
          zip.file('00_剧本.txt', scriptText);
          console.log('✓ 剧本文件已添加');
        }
      } catch (error) {
        console.error('生成剧本文件失败:', error);
        // 失败时添加一个说明文件
        zip.file('00_剧本_ERROR.txt', '剧本文件生成失败，请手动查看剧本卡片内容。');
      }
    }

    // 4. 添加说明文件
    const readmeText = `${scriptTitle} - AI视频生成素材包
====================================

文件说明：
--------
00_剧本.txt        - 完整的剧本内容，包含剧情、角色、场景等详细信息
keyframes/         - 关键帧图片文件夹，每个场景一张图片，文件名格式为 scene_XX.png
prompts/           - 视频生成提示词文件夹，每个场景一个txt文件，文件名格式为 scene_XX_prompts.txt

使用方法：
--------
1. 查看 00_剧本.txt 了解完整故事内容
2. 查看 keyframes/ 文件夹中的图片，预览每个场景的画面
3. 查看 prompts/ 文件夹中的提示词，选择适合你的AI视频工具
4. 复制提示词到 Sora、Runway、Pika、Kling 等工具生成视频
5. 按场景编号顺序拼接视频，完成最终作品

提示：
- 所有关键帧尺寸根据宽高比自动调整（支持 16:9, 9:16, 4:3, 3:4, 1:1）
- 提示词已经针对不同工具优化，直接使用即可
- 建议先根据剧本和关键帧预览确认画面效果，再生成视频

生成时间：${new Date().toLocaleString('zh-CN')}
`;

    zip.file('README.txt', readmeText);

    // 生成ZIP文件
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' }) as Buffer;

    // 返回ZIP文件
    // 使用纯ASCII文件名避免编码问题
    const asciiFilename = `download_${Date.now()}.zip`;
    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${asciiFilename}"`,
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
