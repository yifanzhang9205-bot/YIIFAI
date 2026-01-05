import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, ImageGenerationClient } from 'coze-coding-dev-sdk';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface CharacterRequest {
  script: any; // MovieScript
  artStyle: string;
}

interface CharacterInfo {
  name: string;
  description: string;
  appearance: string;
  outfit: string;
  expression: string;
  prompt: string;
}

interface CharacterDesign {
  characters: CharacterInfo[];
  characterImages: string[]; // 图片URL
}

// 生成人物设定
export async function POST(request: NextRequest) {
  try {
    const body: CharacterRequest = await request.json();
    const { script, artStyle } = body;

    if (!script || !script.scenes) {
      return NextResponse.json(
        { error: '剧本内容不能为空' },
        { status: 400 }
      );
    }

    const config = new Config();
    const llmClient = new LLMClient(config);
    const imageClient = new ImageGenerationClient(config);

    // 步骤1：提取所有人物
    const allCharacters = Array.from(new Set(
      script.scenes.flatMap((s: any) => s.characters || [])
    ));

    if (allCharacters.length === 0) {
      return NextResponse.json(
        { error: '剧本中没有人物信息' },
        { status: 400 }
      );
    }

    // 步骤2：生成人物设定描述
    const systemPrompt = `你是一个专业的人物设定设计师。
你的任务是根据剧本和画风，为每个角色生成详细的人物设定。

人物设定格式：
- 姓名
- 描述（年龄、性格、背景）
- 外貌（发型、脸型、五官特征）
- 服装（穿搭风格、颜色）
- 表情（常用表情）
- 生图提示词（英文，包含画风和人物特征）

返回格式必须是JSON：
{
  "characters": [
    {
      "name": "角色名",
      "description": "角色描述",
      "appearance": "外貌描述",
      "outfit": "服装描述",
      "expression": "表情",
      "prompt": "生图提示词（包含画风关键词、人物外貌、服装等）"
    }
  ]
}

画风参考：${artStyle}`;

    const userPrompt = `剧本标题：${script.title}
类型：${script.genre}

人物列表：
${allCharacters.map((c, i) => `${i + 1}. ${c}`).join('\n')}

请为每个人物生成设定，返回JSON格式。`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await llmClient.invoke(messages, { temperature: 0.7 });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析人物设定');
    }

    const characterInfo: { characters: CharacterInfo[] } = JSON.parse(jsonMatch[0]);

    // 步骤3：为每个人物生成设定图（统一高度 720x1280）
    const characterImages: string[] = [];

    for (const character of characterInfo.characters) {
      console.log(`生成人物设定图：${character.name}`);

      const imageResponse = await imageClient.generate({
        prompt: character.prompt,
        size: '720x1280',
        watermark: false,
      });

      const helper = imageClient.getResponseHelper(imageResponse);

      if (!helper.success || helper.imageUrls.length === 0) {
        throw new Error(`生成人物${character.name}设定图失败`);
      }

      characterImages.push(helper.imageUrls[0]);
    }

    const design: CharacterDesign = {
      characters: characterInfo.characters,
      characterImages,
    };

    return NextResponse.json({
      success: true,
      design,
    });

  } catch (error) {
    console.error('生成人物设定失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '生成人物设定失败',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
