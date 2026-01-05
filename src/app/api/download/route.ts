import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

interface DownloadRequest {
  keyframes: {
    sceneNumber: number;
    imageUrl: string;
    prompt: string;
  }[];
  scriptTitle: string;
}

// 打包下载关键帧
export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();
    const { keyframes, scriptTitle } = body;

    if (!keyframes || keyframes.length === 0) {
      return NextResponse.json(
        { error: '关键帧内容不能为空' },
        { status: 400 }
      );
    }

    // 创建ZIP文件
    const zip = new JSZip();

    // 添加图片到ZIP
    for (const keyframe of keyframes) {
      try {
        const response = await fetch(keyframe.imageUrl);
        if (!response.ok) {
          throw new Error(`下载场景${keyframe.sceneNumber}图片失败`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 添加到ZIP
        const filename = `${String(keyframe.sceneNumber).padStart(2, '0')}_scene.jpg`;
        zip.file(filename, buffer);
      } catch (error) {
        console.error(`下载场景${keyframe.sceneNumber}图片失败:`, error);
      }
    }

    // 添加说明文件
    const readme = `# ${scriptTitle} - 关键帧说明

共 ${keyframes.length} 个关键帧

## 关键帧列表
${keyframes.map(kf => `
### 场景 ${kf.sceneNumber}
- 提示词: ${kf.prompt}
- 文件名: ${String(kf.sceneNumber).padStart(2, '0')}_scene.jpg
`).join('\n')}

---
生成时间: ${new Date().toLocaleString('zh-CN')}
`;

    zip.file('README.md', readme);

    // 生成ZIP
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

    // 返回ZIP文件
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${scriptTitle}_keyframes.zip"`,
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
