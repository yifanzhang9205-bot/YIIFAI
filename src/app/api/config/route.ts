import { NextRequest, NextResponse } from 'next/server';

interface ConfigStorage {
  customApiEndpoint?: string;
  customApiKey?: string;
  customImageEndpoint?: string;
  customImageApiKey?: string;
  useCustomApi?: boolean;
  imageModel?: string; // 图片生成模型
  // 异步图片生成API配置
  useAsyncImageApi?: boolean;
  asyncImageApiEndpoint?: string;
  asyncImageApiKey?: string;
  asyncImageModel?: string;
}

// 简单的内存存储（生产环境应该使用数据库或环境变量）
let configStorage: ConfigStorage = {
  useCustomApi: false,
};

export async function GET() {
  return NextResponse.json(configStorage);
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<ConfigStorage> & { action?: 'save' | 'reset' } = await request.json();

    if (body.action === 'reset') {
      // 重置为默认配置
      configStorage = {
        useCustomApi: false,
      };
      return NextResponse.json({
        success: true,
        message: '配置已重置为默认',
        config: configStorage,
      });
    }

    // 保存配置
    configStorage = {
      ...configStorage,
      customApiEndpoint: body.customApiEndpoint,
      customApiKey: body.customApiKey,
      customImageEndpoint: body.customImageEndpoint,
      customImageApiKey: body.customImageApiKey,
      useCustomApi: body.useCustomApi,
      imageModel: body.imageModel || 'doubao-seedream-4-5-251128', // 默认模型
      // 异步图片生成API配置
      useAsyncImageApi: body.useAsyncImageApi,
      asyncImageApiEndpoint: body.asyncImageApiEndpoint,
      asyncImageApiKey: body.asyncImageApiKey,
      asyncImageModel: body.asyncImageModel || 'midjourney', // 默认midjourney
    };

    return NextResponse.json({
      success: true,
      message: '配置已保存',
      config: configStorage,
    });
  } catch (error) {
    console.error('保存配置失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '保存配置失败',
      },
      { status: 500 }
    );
  }
}
