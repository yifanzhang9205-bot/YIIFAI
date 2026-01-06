import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// 画风定义
const artStyles = [
  { name: '写实风格', keywords: 'photorealistic, 8k, ultra detailed, realistic lighting, cinematic', description: '逼真照片级', prompt: 'A professional portrait of a young woman in natural lighting, photorealistic, 8k, ultra detailed, cinematic, realistic' },
  { name: '卡通风格', keywords: 'cartoon style, vibrant colors, clean lines, expressive, animated', description: '卡通动画', prompt: 'A cheerful cartoon character with vibrant colors and clean lines, cartoon style, animated, expressive' },
  { name: '动漫风格', keywords: 'anime style, cel shading, vivid colors, manga, detailed', description: '日系动漫', prompt: 'A beautiful anime girl with detailed hair and eyes, anime style, cel shading, vivid colors, manga style' },
  { name: '漫画风格', keywords: 'manga style, comic style, black and white manga, detailed line art, anime', description: '黑白漫画', prompt: 'A dramatic manga character with detailed line work, manga style, black and white, comic style' },
  { name: '水彩风格', keywords: 'watercolor painting, soft edges, artistic, dreamy, watercolor texture', description: '水彩艺术', prompt: 'A soft dreamy landscape, watercolor painting, artistic, soft edges, watercolor texture' },
  { name: '油画风格', keywords: 'oil painting, textured, classic art, oil brushstrokes, rich colors', description: '古典油画', prompt: 'A classical portrait with rich brushstrokes, oil painting, textured, classic art, rich colors' },
  { name: '像素风格', keywords: 'pixel art, 8-bit, retro, blocky, vibrant colors', description: '像素复古', prompt: 'A retro pixel art character, 8-bit, blocky, vibrant colors, retro gaming style' },
  { name: '赛博朋克', keywords: 'cyberpunk, neon lights, futuristic, high tech, dystopian, glowing', description: '科幻未来', prompt: 'A cyberpunk city with neon lights and futuristic buildings, cyberpunk, neon, futuristic, high tech' },
  { name: '吉卜力风格', keywords: 'ghibli style, studio ghibli, anime, hand drawn, soft colors, whimsical', description: '宫崎骏风', prompt: 'A whimsical landscape in Studio Ghibli style, hand drawn, soft colors, magical atmosphere' },
  { name: '水墨风格', keywords: 'ink painting, traditional chinese art, brush strokes, minimalist, black ink', description: '中国水墨', prompt: 'Traditional Chinese ink painting, elegant brush strokes, minimalist, black ink on paper' },
  { name: '赛璐璐风格', keywords: 'cel shaded, anime, bold outlines, flat colors, graphic novel style', description: '赛璐璐', prompt: 'A character in cel shaded style, bold outlines, flat colors, graphic novel style' },
  { name: '蒸汽朋克', keywords: 'steampunk, victorian, brass gears, steam, industrial, ornate', description: '蒸汽朋克', prompt: 'A steampunk machine with brass gears and steam, victorian industrial design, ornate' },
  { name: '暗黑哥特', keywords: 'dark fantasy, gothic, horror, eerie atmosphere, dramatic lighting', description: '暗黑哥特', prompt: 'A dark gothic scene with dramatic lighting and eerie atmosphere, dark fantasy, horror' },
  { name: '浮世绘风格', keywords: 'ukiyo-e, japanese woodblock print, traditional, flat colors, wave patterns', description: '浮世绘', prompt: 'Traditional Japanese ukiyo-e woodblock print, flat colors, wave patterns' },
  { name: '低多边形', keywords: 'low poly, geometric, flat shading, minimalist, 3D render', description: '低多边形', prompt: 'A low poly geometric landscape, flat shading, minimalist, 3D render' },
  { name: '黏土动画', keywords: 'claymation, clay animation, stop motion, textured, hand crafted', description: '黏土动画', prompt: 'A character in claymation style, stop motion, textured, hand crafted' },
  { name: '复古油画', keywords: 'vintage painting, classical art, renaissance, rich textures, aged', description: '复古油画', prompt: 'A vintage renaissance painting with aged texture, classical art, rich colors' },
  { name: '霓虹艺术', keywords: 'neon art, glowing, vibrant, retro 80s, synthwave, electric colors', description: '霓虹80s', prompt: 'Vibrant neon art with glowing colors, retro 80s synthwave style, electric' },
];

export async function POST(request: NextRequest) {
  try {
    const config = new Config();
    const client = new ImageGenerationClient(config);

    // 确保public目录存在
    const publicDir = path.join(process.cwd(), 'public', 'style-previews');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const results: any[] = [];

    // 并发生成图片（限制并发数为3以避免限流）
    for (let i = 0; i < artStyles.length; i += 3) {
      const batch = artStyles.slice(i, i + 3);
      const batchResults = await client.batchGenerate(
        batch.map(style => ({
          prompt: style.prompt,
          size: '2K',
          watermark: false,
        }))
      );

      for (let j = 0; j < batch.length; j++) {
        const style = batch[j];
        const response = batchResults[j];
        const helper = client.getResponseHelper(response);

        if (helper.success && helper.imageUrls.length > 0) {
          // 下载图片并保存到本地
          const imageResponse = await axios.get(helper.imageUrls[0], { responseType: 'arraybuffer' });
          const fileName = `${style.name.replace(/\s+/g, '-').toLowerCase()}.jpg`;
          const filePath = path.join(publicDir, fileName);
          fs.writeFileSync(filePath, imageResponse.data);

          results.push({
            style: style.name,
            fileName: fileName,
            url: `/style-previews/${fileName}`,
            success: true,
          });
        } else {
          results.push({
            style: style.name,
            success: false,
            error: helper.errorMessages.join(', '),
          });
        }
      }

      // 等待一小段时间避免限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('生成画风预览失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成失败',
      },
      { status: 500 }
    );
  }
}

// GET端点用于检查是否已生成预览图
export async function GET() {
  const publicDir = path.join(process.cwd(), 'public', 'style-previews');

  if (!fs.existsSync(publicDir)) {
    return NextResponse.json({
      hasPreviews: false,
      styles: [],
    });
  }

  const files = fs.readdirSync(publicDir);
  const styles = files
    .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
    .map(f => ({
      fileName: f,
      url: `/style-previews/${f}`,
      style: f.replace(/\.(jpg|png)$/, '').replace(/-/g, ' '),
    }));

  return NextResponse.json({
    hasPreviews: styles.length > 0,
    styles,
  });
}
