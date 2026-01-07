import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface SavePreviewsRequest {
  previews: Array<{
    style: string;
    imageUrl: string;
  }>;
}

/**
 * 保存画风预览URL到配置文件
 */
export async function POST(request: NextRequest) {
  try {
    const body: SavePreviewsRequest = await request.json();

    if (!body.previews || !Array.isArray(body.previews)) {
      return NextResponse.json({
        success: false,
        error: '无效的请求格式'
      }, { status: 400 });
    }

    // 读取现有配置文件
    const filePath = path.join(process.cwd(), 'src/data/art-style-previews.ts');
    let fileContent = `/**
 * 画风预览图片URL配置
 *
 * 使用说明：
 * 1. 运行 API: POST /api/art-styles/generate-previews 生成预览图
 * 2. 将生成的 imageUrl 更新到这个文件中
 * 3. 前端组件会自动使用这些预览图片
 */

export const ART_STYLE_PREVIEWS: Record<string, string> = {
`;

    // 添加预览URL
    body.previews.forEach((preview, index) => {
      fileContent += `  '${preview.style}': '${preview.imageUrl}',\n`;
    });

    fileContent += `};

/**
 * 检查画风是否有预览图
 */
export function hasPreview(styleName: string): boolean {
  return ART_STYLE_PREVIEWS.hasOwnProperty(styleName);
}

/**
 * 获取画风的预览URL
 * 如果没有预览图，返回null
 */
export function getPreviewUrl(styleName: string): string | null {
  return ART_STYLE_PREVIEWS[styleName] || null;
}

/**
 * 获取画风的渐变背景（作为没有预览图时的备选）
 */
export function getGradientFallback(styleName: string): string {
  // 这里返回默认的渐变色
  return 'from-gray-600 to-gray-800';
}
`;

    // 写入文件
    fs.writeFileSync(filePath, fileContent, 'utf-8');

    console.log(`已保存 ${body.previews.length} 个画风预览URL`);

    return NextResponse.json({
      success: true,
      count: body.previews.length
    });

  } catch (error: any) {
    console.error('保存预览URL失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '未知错误'
    }, { status: 500 });
  }
}
