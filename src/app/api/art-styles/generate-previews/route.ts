import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';
import axios from 'axios';

// 60+种画风的预览提示词
const ART_STYLE_PROMPTS: Record<string, string> = {
  // 写实类
  '写实风格': 'A realistic portrait of a young woman in natural lighting, photorealistic, 8k, ultra detailed, cinematic composition, soft shadows',
  '电影质感': 'Cinematic movie still, dramatic lighting, professional cinematography, film grain, moody atmosphere, a detective standing in a rainy street at night',
  '纪录片风格': 'Documentary style photograph, natural lighting, authentic moment, handheld camera feel, a street vendor in Tokyo at dusk, candid shot',
  '新闻摄影': 'Photojournalism style, authentic documentary moment, natural lighting, a protest scene with people holding signs, professional news photography',
  '商业摄影': 'High-end commercial photography, clean studio lighting, polished look, a model wearing modern fashion against a gradient background, glossy magazine style',

  // 动漫/漫画类
  '动漫风格': 'Anime style character design, cel shading, vivid colors, detailed line art, a young anime protagonist with spiky hair in a fantasy world, manga style',
  '漫画风格': 'Black and white manga style, detailed line art, screentone shading, a dramatic action scene with dynamic poses, traditional Japanese manga',
  '赛璐璐风格': 'Cel shaded anime art, bold black outlines, flat colors, a stylish anime character with dynamic pose, graphic novel style, vibrant palette',
  '吉卜力风格': 'Studio Ghibli inspired art, hand drawn aesthetic, soft colors, whimsical atmosphere, a young girl standing in a magical forest, detailed background',
  '新海诚风格': 'Makoto Shinkai style, anime with breathtaking scenery, detailed backgrounds, emotional lighting, a boy and girl watching sunset over a beautiful cityscape',
  '宫崎骏风格': 'Hayao Miyazaki inspired, Studio Ghibli, hand drawn, fantasy adventure, magical creatures flying in a floating island setting, detailed animation style',

  // 卡通/插画类
  '卡通风格': 'Cartoon style animation, vibrant colors, clean lines, expressive characters, a cute cartoon bear having a tea party in a colorful garden, animated movie style',
  '迪士尼风格': 'Disney animation style, expressive eyes, vibrant colors, clean lines, magical atmosphere, a princess in a royal castle with sparkles, Disney movie art',
  '皮克斯风格': 'Pixar 3D animation style, detailed textures, expressive characters, family friendly, a cute robot in a futuristic world, Pixar movie poster',
  '儿童绘本': "Children's book illustration, watercolor style, whimsical, hand drawn, cute animals having a picnic in a meadow, soft colors, storybook art",
  '矢量插画': 'Vector illustration, flat design, clean geometric shapes, minimalist, modern graphic design, a stylized city skyline with bold colors, vector art',
  '涂鸦风格': 'Street art graffiti style, urban aesthetic, bold vibrant colors, spray paint texture, expressive tags and characters on a brick wall, edgy street art',

  // 艺术绘画类
  '水彩风格': 'Watercolor painting, soft edges, artistic, dreamy, watercolor texture, a beautiful flower field at sunset with soft brushstrokes, delicate art',
  '油画风格': 'Classical oil painting, rich brushstrokes, textured surface, Renaissance style, a portrait of a noble with dramatic lighting, museum quality art',
  '素描风格': 'Pencil sketch drawing, detailed line work, shading techniques, charcoal texture, a detailed portrait with realistic shading, traditional sketch art',
  '粉彩风格': 'Pastel art, soft muted colors, gentle brushstrokes, delicate atmosphere, a dreamy landscape with pastel pink and blue hues, soft pastel painting',
  '版画风格': 'Linocut printmaking, bold lines, limited color palette, traditional print aesthetic, a stylized mountain scene with bold black outlines, woodblock print',
  '波普艺术': 'Andy Warhol style pop art, bold vibrant colors, halftone dots, comic book style, a portrait with bright contrasting colors, 1960s pop art',

  // 传统文化类
  '水墨风格': 'Traditional Chinese ink painting, brush strokes, minimalist, black ink on white paper, a majestic mountain with a small hermit, Zen aesthetic',
  '浮世绘风格': 'Japanese ukiyo-e woodblock print, flat colors, wave patterns, traditional, Mt. Fuji with cherry blossoms, Edo period art style',
  '敦煌壁画': 'Ancient Chinese Dunhuang mural style, vibrant mineral pigments, gold leaf details, flying apsaras, buddhist art, rich cultural heritage',
  '唐卡风格': 'Tibetan thangka art, intricate detailed patterns, vibrant colors, religious mandala, gold accents, traditional Buddhist art',
  '和风': 'Traditional Japanese aesthetic, minimal, zen, delicate patterns, soft pastel colors, cherry blossoms and a torii gate, calm Japanese garden',

  // 特定时期/流派
  '复古油画': 'Vintage classical oil painting, Renaissance style, rich aged textures, dramatic chiaroscuro lighting, a 17th century still life with fruits and flowers',
  '印象派': 'Claude Monet impressionist style, soft visible brushstrokes, dreamy light, water lilies in a pond at golden hour, French impressionism',
  '野兽派': 'Henri Matisse fauvism style, bold expressive colors, wild brushwork, simplified forms, a vibrant portrait with unrealistic colorful palette',
  '超现实主义': 'Salvador Dalí surrealist style, dreamlike imagery, melting clocks, bizarre landscape, symbolic and mysterious, surrealist masterpiece',

  // 科幻/未来类
  '赛博朋克': 'Cyberpunk cityscape, neon lights, futuristic, high tech dystopian, rain-slicked streets with glowing holographic signs, Blade Runner aesthetic',
  '废土风格': 'Post-apocalyptic wasteland, rusty decayed buildings, atmospheric dust, abandoned vehicles, a lone survivor walking through desert ruins, Fallout aesthetic',
  '太空歌剧': 'Epic space opera scene, massive spaceships in orbit, cosmic nebula background, grand scale, interstellar battle, Star Wars inspired',
  '未来都市': 'Futuristic megacity, advanced architecture, flying vehicles, clean glass skyscrapers, vibrant neon lighting, utopian future city',
  '机甲风格': 'Giant mecha robot anime style, detailed mechanical parts, high tech, pilot in cockpit, intense action scene, Gundam inspired mech art',

  // 奇幻/魔法类
  '奇幻风格': 'High fantasy art, magical creatures, enchanted forest with fairies and unicorns, ethereal lighting, detailed mystical atmosphere, D&D fantasy art',
  '暗黑奇幻': 'Dark fantasy gothic horror, eerie atmosphere, dramatic lighting, a vampire castle in moonlight, mysterious and haunting, dark fantasy game art',
  '童话风格': 'Classic fairy tale illustration, enchanted castle, magical creatures, whimsical atmosphere, a princess with magical powers, storybook fantasy',
  '魔幻现实主义': 'Magical realism, surreal elements in realistic setting, a modern city with floating houses, dreamlike yet grounded, artistic fantasy',

  // 机械/工业类
  '工业设计': 'Modern industrial design product photography, sleek minimal, clean lines, manufactured look, a futuristic consumer gadget, Apple-style product design',
  '蒸汽朋克': 'Victorian steampunk aesthetic, brass gears, steam machinery, ornate details, an airship with cogs and pipes, retro-futuristic style',
  '柴油朋克': '1940s dieselpunk aesthetic, gritty industrial, diesel machinery, wartime vibe, a tank with retro-futuristic modifications, dystopian industrial',
  '机械科幻': 'Detailed mechanical sci-fi, blueprints, technical drawings, intricate machinery, a futuristic spacecraft engine room, hard sci-fi concept art',

  // 数字/现代类
  '像素风格': '8-bit pixel art, retro video game aesthetic, blocky characters, vibrant limited palette, a fantasy hero on an adventure, classic NES game art',
  '低多边形': 'Low poly 3D art, geometric shapes, flat shading, minimalist, a stylized landscape with angular mountains and trees, modern 3D design',
  '霓虹艺术': '1980s synthwave neon art, glowing colors, retro futuristic, grid landscapes, palm trees and sunset with neon lights, vaporwave aesthetic',
  '未来主义': 'Futurism art movement, dynamic movement, speed lines, technology theme, abstract shapes representing progress and velocity, Italian futurism',
  '极简主义': 'Minimalist art, clean simple geometric shapes, lots of negative space, monochromatic palette, a simple elegant composition, modern minimalist',

  // 其他风格
  '抽象主义': 'Abstract geometric art, non-representational, bold colors and shapes, Kandinsky style, dynamic composition without recognizable objects, modern abstract',
  '表现主义': 'Expressionist art, emotional intensity, distorted forms, bold brushstrokes, Edvard Munch style, dramatic psychological portrait, German expressionism',
  '立体主义': 'Cubist art style, fragmented geometric forms, multiple perspectives, Picasso style, abstract portrait with angular shapes, analytical cubism',
  '暗黑哥特': 'Dark gothic aesthetic, Victorian horror, ornate details, dark atmospheric, a gothic cathedral at night, bats and gargoyles, Tim Burton style',
  '黏土动画': 'Claymation stop motion style, textured clay characters, hand-crafted aesthetic, Aardman animation style, a cute clay character in a storybook setting'
};

interface GeneratePreviewsRequest {
  styles?: string[]; // 可选：指定要生成的画风列表，不传则生成全部
}

interface GeneratedPreview {
  style: string;
  prompt: string;
  imageUrl: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GeneratePreviewsRequest = await request.json();
    const stylesToGenerate = body.styles || Object.keys(ART_STYLE_PROMPTS);

    console.log(`开始生成 ${stylesToGenerate.length} 种画风的预览图片...`);

    const config = new Config();
    const client = new ImageGenerationClient(config);

    const results: GeneratedPreview[] = [];

    // 分批处理，每批3个，避免并发过多
    const batchSize = 3;
    for (let i = 0; i < stylesToGenerate.length; i += batchSize) {
      const batch = stylesToGenerate.slice(i, i + batchSize);
      console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(stylesToGenerate.length / batchSize)}: ${batch.join(', ')}`);

      const batchPromises = batch.map(async (styleName) => {
        try {
          const prompt = ART_STYLE_PROMPTS[styleName];
          if (!prompt) {
            return {
              style: styleName,
              prompt: '',
              imageUrl: '',
              success: false,
              error: '未找到该画风的提示词'
            };
          }

          console.log(`  生成 ${styleName}...`);
          const response = await client.generate({
            prompt,
            size: '2K', // 使用2K分辨率
            watermark: false, // 不添加水印
          });

          const helper = client.getResponseHelper(response);

          if (helper.success && helper.imageUrls.length > 0) {
            console.log(`  ✓ ${styleName} 生成成功: ${helper.imageUrls[0].substring(0, 50)}...`);
            return {
              style: styleName,
              prompt,
              imageUrl: helper.imageUrls[0],
              success: true
            };
          } else {
            console.error(`  ✗ ${styleName} 生成失败:`, helper.errorMessages);
            return {
              style: styleName,
              prompt,
              imageUrl: '',
              success: false,
              error: helper.errorMessages.join(', ')
            };
          }
        } catch (error: any) {
          console.error(`  ✗ ${styleName} 异常:`, error.message);
          return {
            style: styleName,
            prompt: ART_STYLE_PROMPTS[styleName] || '',
            imageUrl: '',
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 批次间等待，避免速率限制
      if (i + batchSize < stylesToGenerate.length) {
        console.log('等待2秒后处理下一批...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`预览生成完成！成功: ${successCount}, 失败: ${failCount}`);

    // 自动保存成功的预览URL
    if (successCount > 0) {
      try {
        const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000'}/api/art-styles/save-previews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            previews: results.filter(r => r.success).map(r => ({
              style: r.style,
              imageUrl: r.imageUrl
            }))
          }),
        });

        if (saveResponse.ok) {
          console.log('已自动保存预览URL到配置文件');
        }
      } catch (saveError) {
        console.warn('自动保存预览URL失败:', saveError);
      }
    }

    return NextResponse.json({
      success: true,
      total: results.length,
      successCount,
      failCount,
      results
    });

  } catch (error: any) {
    console.error('生成画风预览失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '未知错误'
    }, { status: 500 });
  }
}
