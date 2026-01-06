'use client';

import { useState, useEffect } from 'react';

type Step = 'requirement' | 'script' | 'storyboard' | 'character' | 'keyframes' | 'video-prompts' | 'download';

interface SceneScript {
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  mood: string;
  characters: string[];
  action: string;
  dialogue?: string;
  emotionalBeat: string;
  visualHook: string;
  duration: string;
}

interface MovieScript {
  title: string;
  genre: string;
  logline: string;
  summary: string;
  emotionalArc: string;
  targetAudience: string;
  visualStyle: string;
  scenes: SceneScript[];
}

interface StoryboardScene {
  sceneNumber: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  focalLength: string;
  depthOfField: string;
  composition: string;
  characterPosition: string;
  lighting: string;
  colorTemperature: string;
  mood: string;
  transition: string;
  prompt: string;
  videoPrompt: string;
}

interface StoryboardScript {
  artStyle: string;
  aspectRatio: string;
  cameraStyle: string;
  lightingStyle: string;
  scenes: StoryboardScene[];
}

interface CharacterInfo {
  name: string;
  role: string;
  relationship: string;
  ethnicity: string;
  age: string;
  gender: string;
  description: string;
  appearance: string;
  outfit: string;
  expression: string;
  prompt: string;
}

interface CharacterDesign {
  unifiedSetting: {
    ethnicity: string;
    artStyleKeywords: string;
    familyTraits: string;
  };
  characters: CharacterInfo[];
  characterImages: string[];
}

interface KeyframeScene {
  sceneNumber: number;
  prompt: string;
  imageUrl: string;
}

interface VideoPromptScene {
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
}

interface VideoPrompts {
  overallStyle: {
    visualStyle: string;
    colorPalette: string;
    motionStyle: string;
    audioAtmosphere: string;
  };
  scenes: VideoPromptScene[];
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('requirement');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // 状态数据
  const [requirement, setRequirement] = useState('');
  const [script, setScript] = useState<MovieScript | null>(null);
  const [scriptEdit, setScriptEdit] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('写实风格');
  const [storyboard, setStoryboard] = useState<StoryboardScript | null>(null);
  const [sceneCharacterMapping, setSceneCharacterMapping] = useState<any[]>([]); // 场景-人物映射
  const [characterDesign, setCharacterDesign] = useState<CharacterDesign | null>(null);
  const [keyframes, setKeyframes] = useState<KeyframeScene[] | null>(null);
  const [videoPrompts, setVideoPrompts] = useState<VideoPrompts | null>(null);
  const [selectedPromptScene, setSelectedPromptScene] = useState<number | null>(null);
  const [fastMode, setFastMode] = useState(false); // 快速预览模式
  const [stylePreviewImages, setStylePreviewImages] = useState<Record<string, string>>({}); // 画风预览图片映射
  const [generatingPreviews, setGeneratingPreviews] = useState(false); // 是否正在生成预览

  const artStyles = [
    { name: '写实风格', keywords: 'photorealistic, 8k, ultra detailed, realistic lighting, cinematic', description: '逼真照片级', previewColor: 'from-gray-700 to-gray-900' },
    { name: '卡通风格', keywords: 'cartoon style, vibrant colors, clean lines, expressive, animated', description: '卡通动画', previewColor: 'from-pink-400 to-purple-500' },
    { name: '动漫风格', keywords: 'anime style, cel shading, vivid colors, manga, detailed', description: '日系动漫', previewColor: 'from-blue-400 to-cyan-400' },
    { name: '漫画风格', keywords: 'manga style, comic style, black and white manga, detailed line art, anime', description: '黑白漫画', previewColor: 'from-gray-600 to-gray-800' },
    { name: '水彩风格', keywords: 'watercolor painting, soft edges, artistic, dreamy, watercolor texture', description: '水彩艺术', previewColor: 'from-amber-200 to-orange-300' },
    { name: '油画风格', keywords: 'oil painting, textured, classic art, oil brushstrokes, rich colors', description: '古典油画', previewColor: 'from-yellow-500 to-orange-600' },
    { name: '像素风格', keywords: 'pixel art, 8-bit, retro, blocky, vibrant colors', description: '像素复古', previewColor: 'from-green-400 to-emerald-500' },
    { name: '赛博朋克', keywords: 'cyberpunk, neon lights, futuristic, high tech, dystopian, glowing', description: '科幻未来', previewColor: 'from-fuchsia-500 to-cyan-500' },
    { name: '吉卜力风格', keywords: 'ghibli style, studio ghibli, anime, hand drawn, soft colors, whimsical', description: '宫崎骏风', previewColor: 'from-green-300 to-teal-400' },
    { name: '水墨风格', keywords: 'ink painting, traditional chinese art, brush strokes, minimalist, black ink', description: '中国水墨', previewColor: 'from-slate-600 to-slate-800' },
    { name: '赛璐璐风格', keywords: 'cel shaded, anime, bold outlines, flat colors, graphic novel style', description: '赛璐璐', previewColor: 'from-indigo-500 to-purple-600' },
    { name: '蒸汽朋克', keywords: 'steampunk, victorian, brass gears, steam, industrial, ornate', description: '蒸汽朋克', previewColor: 'from-amber-600 to-yellow-700' },
    { name: '暗黑哥特', keywords: 'dark fantasy, gothic, horror, eerie atmosphere, dramatic lighting', description: '暗黑哥特', previewColor: 'from-gray-800 to-purple-900' },
    { name: '浮世绘风格', keywords: 'ukiyo-e, japanese woodblock print, traditional, flat colors, wave patterns', description: '浮世绘', previewColor: 'from-red-400 to-pink-500' },
    { name: '低多边形', keywords: 'low poly, geometric, flat shading, minimalist, 3D render', description: '低多边形', previewColor: 'from-cyan-400 to-blue-500' },
    { name: '黏土动画', keywords: 'claymation, clay animation, stop motion, textured, hand crafted', description: '黏土动画', previewColor: 'from-orange-400 to-red-400' },
    { name: '复古油画', keywords: 'vintage painting, classical art, renaissance, rich textures, aged', description: '复古油画', previewColor: 'from-yellow-600 to-amber-700' },
    { name: '霓虹艺术', keywords: 'neon art, glowing, vibrant, retro 80s, synthwave, electric colors', description: '霓虹80s', previewColor: 'from-pink-500 to-violet-600' },
  ];

  const [artStyleStrength, setArtStyleStrength] = useState(80); // 0-100, 默认80%

  // 更新加载状态
  const updateLoading = (loading: boolean, text?: string, progress?: { current: number; total: number }) => {
    setLoading(loading);
    setLoadingText(text || '');
    if (progress) {
      setLoadingProgress(progress);
    } else {
      setLoadingProgress({ current: 0, total: 0 });
    }
  };

  // 检查画风预览图片
  const checkStylePreviews = async () => {
    try {
      const response = await fetch('/api/style-previews/generate');
      const data = await response.json();

      if (data.hasPreviews) {
        const previewMap: Record<string, string> = {};
        data.styles.forEach((style: any) => {
          previewMap[style.style] = style.url;
        });
        setStylePreviewImages(previewMap);
      }
    } catch (error) {
      console.error('检查画风预览失败:', error);
    }
  };

  // 生成画风预览图片
  const generateStylePreviews = async () => {
    setGeneratingPreviews(true);
    try {
      const response = await fetch('/api/style-previews/generate', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        const previewMap: Record<string, string> = {};
        data.results.forEach((result: any) => {
          if (result.success) {
            previewMap[result.style] = result.url;
          }
        });
        setStylePreviewImages(previewMap);
        alert(`成功生成 ${data.results.filter((r: any) => r.success).length} / ${data.results.length} 张预览图`);
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (error) {
      alert('生成预览图片失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setGeneratingPreviews(false);
    }
  };

  // 生成剧本
  const generateScript = async () => {
    if (!requirement.trim()) {
      alert('请输入需求');
      return;
    }

    updateLoading(true, '正在生成剧本...');

    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: requirement.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setScript(data.script);
        setScriptEdit(JSON.stringify(data.script, null, 2));
        setCurrentStep('script');
      } else {
        throw new Error(data.error || '生成失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      updateLoading(false);
    }
  };

  // 修改剧本
  const editScript = async () => {
    updateLoading(true, '正在修改剧本...');

    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: '请根据JSON格式修改剧本',
          previousScript: scriptEdit,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setScript(data.script);
        setScriptEdit(JSON.stringify(data.script, null, 2));
      } else {
        throw new Error(data.error || '修改失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败');
    } finally {
      updateLoading(false);
    }
  };

  // 确认剧本，生成分镜
  const confirmScript = async () => {
    if (!script) return;

    updateLoading(true, '正在生成分镜脚本（约30-60秒）...');

    try {
      // 创建带超时的fetch - 调整为3分钟（优化后应该更快）
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3分钟超时

      const response = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          artStyle: selectedStyle,
          artStyleStrength,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API返回错误:', response.status, errorText);
        throw new Error(`HTTP错误：${response.status}`);
      }

      const data = await response.json();
      console.log('分镜生成返回:', data);

      if (data.success) {
        setStoryboard(data.storyboard);
        setSceneCharacterMapping(data.sceneCharacterMapping || []); // 保存场景-人物映射
        setCurrentStep('storyboard');
      } else {
        throw new Error(data.error || '生成分镜失败');
      }
    } catch (err) {
      console.error('生成分镜错误:', err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('生成超时，请稍后重试或简化剧本场景');
        } else {
          setError(err.message || '生成分镜失败');
        }
      } else {
        setError('生成分镜失败，请检查网络连接');
      }
    } finally {
      updateLoading(false);
    }
  };

  // 生成人物设定
  const generateCharacters = async () => {
    if (!script || !storyboard) return;

    updateLoading(true, '正在并发生成人物设定...');

    try {
      const response = await fetch('/api/character/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          artStyle: selectedStyle,
          artStyleStrength,
          fastMode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCharacterDesign(data.design);
        setCurrentStep('character');
      } else {
        throw new Error(data.error || '生成人物设定失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成人物设定失败');
    } finally {
      updateLoading(false);
    }
  };

  // 重新生成单个角色
  const regenerateCharacter = async (characterIndex: number) => {
    if (!characterDesign) return;

    const character = characterDesign.characters[characterIndex];
    updateLoading(true, `正在重新生成${character.name}...`);

    try {
      const response = await fetch('/api/character/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: character,
          artStyle: selectedStyle,
          artStyleStrength,
          unifiedSetting: characterDesign.unifiedSetting,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 更新角色图片
        const newCharacterImages = [...characterDesign.characterImages];
        newCharacterImages[characterIndex] = data.imageUrl;
        setCharacterDesign({
          ...characterDesign,
          characterImages: newCharacterImages,
        });
      } else {
        throw new Error(data.error || '重新生成失败');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '重新生成失败');
    } finally {
      updateLoading(false);
    }
  };

  // 确认人物，生成关键帧
  const confirmCharacters = async () => {
    if (!storyboard || !characterDesign) return;

    const modeText = fastMode ? '快速预览模式（低分辨率）' : '标准模式（高分辨率）';
    updateLoading(true, `正在并发生成关键帧 - ${modeText}...`, {
      current: 0,
      total: storyboard.scenes.length
    });

    try {
      const response = await fetch('/api/keyframes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboard,
          characterImages: characterDesign.characterImages,
          characterDesign,
          sceneCharacterMapping,
          fastMode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setKeyframes(data.keyframes);
        setCurrentStep('keyframes');
      } else {
        throw new Error(data.error || '生成关键帧失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成关键帧失败');
    } finally {
      updateLoading(false);
    }
  };

  // 重新生成单个关键帧
  const regenerateKeyframe = async (sceneNumber: number) => {
    if (!keyframes || !storyboard || !characterDesign) return;

    const keyframe = keyframes.find(kf => kf.sceneNumber === sceneNumber);
    if (!keyframe) return;

    updateLoading(true, `正在重新生成场景${sceneNumber}...`);

    try {
      const response = await fetch('/api/keyframes/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene: keyframe,
          storyboard,
          characterImages: characterDesign.characterImages,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 更新关键帧图片
        const newKeyframes = keyframes.map(kf => 
          kf.sceneNumber === sceneNumber ? { ...kf, imageUrl: data.imageUrl } : kf
        );
        setKeyframes(newKeyframes);
      } else {
        throw new Error(data.error || '重新生成失败');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '重新生成失败');
    } finally {
      updateLoading(false);
    }
  };

  // 生成视频提示词
  const generateVideoPrompts = async () => {
    if (!script || !storyboard || !characterDesign || !keyframes) return;

    updateLoading(true, '正在生成视频提示词...');

    try {
      const response = await fetch('/api/video-prompt/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          storyboard,
          characterImages: characterDesign.characterImages,
          keyframes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVideoPrompts(data.videoPrompts);
        setCurrentStep('video-prompts');
      } else {
        throw new Error(data.error || '生成视频提示词失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成视频提示词失败');
    } finally {
      updateLoading(false);
    }
  };

  // 打包下载所有资源（关键帧+提示词）
  const downloadAll = async () => {
    if (!keyframes || !script) return;

    updateLoading(true, '正在打包下载...');

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyframes,
          videoPrompts,
          scriptTitle: script.title,
        }),
      });

      if (!response.ok) {
        throw new Error('打包失败');
      }

      // 下载文件
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${script.title}_素材包.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '打包下载失败');
    } finally {
      updateLoading(false);
    }
  };

  // 单独下载某个关键帧
  const downloadSingleKeyframe = (sceneNumber: number, imageUrl: string) => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `scene_${String(sceneNumber).padStart(2, '0')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 复制文本
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`已复制${label}到剪贴板`);
  };

  // 获取当前步骤序号
  const getCurrentStepIndex = () => {
    const steps: Step[] = ['requirement', 'script', 'storyboard', 'character', 'keyframes', 'video-prompts', 'download'];
    return steps.indexOf(currentStep);
  };

  // 在组件加载时检查画风预览图片
  useEffect(() => {
    checkStylePreviews();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 头部 */}
      <header className="border-b border-gray-200 bg-white/50 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/50 sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2v2m0-2h10M7 4H4a1 1 0 00-1 1v14a1 1 0 001 1h16a1 1 0 001-1V5a1 1 0 00-1-1h-3m-9 10l3 3m0 0l3-3m-3 3V8" />
                </svg>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">AI 剧本分镜视频生成器</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">从创意到视频提示词的完整工作流</p>
              </div>
            </div>

            {/* 步骤指示器 */}
            <div className="hidden lg:flex items-center gap-2">
              {[
                { step: 'requirement', label: '需求', short: '需求' },
                { step: 'script', label: '剧本', short: '剧本' },
                { step: 'storyboard', label: '分镜', short: '分镜' },
                { step: 'character', label: '人物', short: '人物' },
                { step: 'keyframes', label: '关键帧', short: '关键帧' },
                { step: 'video-prompts', label: '提示词', short: '提示词' },
                { step: 'download', label: '完成', short: '完成' },
              ].map((item, index) => (
                <div key={item.step} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                      currentStep === item.step
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : index < getCurrentStepIndex()
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {index < getCurrentStepIndex() ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={`text-sm font-medium transition-all ${
                    currentStep === item.step
                      ? 'text-blue-600 dark:text-blue-400'
                      : index < getCurrentStepIndex()
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {item.short}
                  </span>
                  {index < 6 && <div className={`h-px w-6 transition-all ${index < getCurrentStepIndex() ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* 进度条 */}
          {loading && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{loadingText}</span>
                {loadingProgress.total > 0 && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {loadingProgress.current} / {loadingProgress.total}
                  </span>
                )}
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                {loadingProgress.total > 0 ? (
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  />
                ) : (
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 主内容 */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-medium text-red-900 dark:text-red-300">出错了</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 步骤1：需求输入 + 画风选择 */}
        {currentStep === 'requirement' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              开始你的创作
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              描述你想要创作的视频内容，AI 将为你生成完整的剧本、分镜和视频提示词
            </p>

            {/* 画风选择 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  选择画风
                </label>
                {Object.keys(stylePreviewImages).length === 0 && (
                  <button
                    onClick={generateStylePreviews}
                    disabled={generatingPreviews}
                    className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generatingPreviews ? '生成中...' : '生成预览图'}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {artStyles.map((style) => (
                  <button
                    key={style.name}
                    onClick={() => setSelectedStyle(style.name)}
                    className={`group relative rounded-xl border-2 overflow-hidden transition-all ${
                      selectedStyle === style.name
                        ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
                    }`}
                  >
                    {/* 预览图片或渐变色块 */}
                    {stylePreviewImages[style.name] ? (
                      <div className="aspect-square relative overflow-hidden">
                        <img
                          src={stylePreviewImages[style.name]}
                          alt={style.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    ) : (
                      <div className={`aspect-square bg-gradient-to-br ${style.previewColor} transition-transform group-hover:scale-105`}>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    )}

                    {/* 画风名称和描述 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <div className="font-semibold text-white text-xs">{style.name}</div>
                    </div>

                    {/* 选中标记 */}
                    {selectedStyle === style.name && (
                      <div className="absolute top-1 right-1 h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="描述你想要创作的剧本内容，例如：

一个关于都市爱情的故事
- 主角是一个年轻的程序员
- 发生在咖啡馆的相遇
- 温馨治愈的风格
- 时长约 45 秒

请尽可能详细地描述你的创意..."
              className="min-h-[250px] w-full rounded-xl border-2 border-gray-200 px-6 py-4 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              disabled={loading}
            />
            <div className="flex justify-end mt-6">
              <button
                onClick={generateScript}
                disabled={loading || !requirement.trim()}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-semibold text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-blue-500/30 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    生成中...
                  </>
                ) : (
                  <>
                    开始创作
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 步骤2：剧本确认 */}
        {currentStep === 'script' && script && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
              第二步：确认剧本
            </h2>
            <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{script.title}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">{script.genre}</p>
                </div>
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300">
                  {script.scenes.length} 场景
                </div>
              </div>
              <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">{script.logline}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{script.summary}</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">情感弧线</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{script.emotionalArc}</div>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">目标受众</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{script.targetAudience}</div>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">视觉风格</div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">{script.visualStyle}</div>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <label className="mb-3 block font-medium text-gray-700 dark:text-gray-300">
                剧本 JSON（可直接修改）
              </label>
              <textarea
                value={scriptEdit}
                onChange={(e) => setScriptEdit(e.target.value)}
                className="min-h-[300px] w-full rounded-xl border-2 border-gray-200 px-6 py-4 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <button
                onClick={editScript}
                disabled={loading}
                className="rounded-xl border-2 border-gray-200 px-8 py-4 font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? '修改中...' : '修改剧本'}
              </button>
              <button
                onClick={confirmScript}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-semibold text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 shadow-lg shadow-blue-500/30 flex items-center gap-2"
              >
                {loading ? '生成中...' : (
                  <>
                    确认，生成分镜
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 步骤3：分镜确认 */}
        {currentStep === 'storyboard' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
              第三步：确认分镜脚本
            </h2>

            {/* 当前选择的画风显示 */}
            <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="flex items-center gap-4">
                <div className={`h-16 w-16 rounded-lg bg-gradient-to-br ${artStyles.find(s => s.name === selectedStyle)?.previewColor || 'from-gray-700 to-gray-900'}`} />
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">当前画风</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{selectedStyle}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{artStyles.find(s => s.name === selectedStyle)?.description}</div>
                </div>
              </div>
            </div>

            {/* 画风强度调节 */}
            <div className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-700">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  画风强度
                </label>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {artStyleStrength}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={artStyleStrength}
                onChange={(e) => setArtStyleStrength(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600 accent-blue-500"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>写实平衡</span>
                <span>风格强烈</span>
              </div>
            </div>

            {/* 快速预览模式开关 */}
            <div className="mb-6 rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-gray-700 dark:text-gray-300">
                    快速预览模式
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    使用低分辨率快速生成预览，速度提升约 50%
                  </p>
                </div>
                <button
                  onClick={() => setFastMode(!fastMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    fastMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      fastMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* 分镜脚本预览 */}
            {storyboard && (
              <div className="mb-6">
                <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-300">
                  分镜脚本预览（共{storyboard.scenes.length}场）
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {storyboard.scenes.slice(0, 6).map((scene) => (
                    <div key={scene.sceneNumber} className="rounded-xl bg-gray-50 p-4 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-sm font-bold text-white">
                          {scene.sceneNumber}
                        </span>
                        <div className="flex-1">
                          <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                            {scene.shotType} · {scene.cameraAngle} · {scene.cameraMovement}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {scene.composition}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {storyboard.scenes.length > 6 && (
                    <div className="text-center py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-100 dark:border-gray-600">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        还有 {storyboard.scenes.length - 6} 场...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 优化提示 */}
            <div className="mb-4 rounded-xl bg-green-50 p-4 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-300 text-sm">
                    速度优化已启用
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    • 人物图片并发生成，速度提升约 {Math.min(script?.scenes?.length || 2, 5)}x
                    <br />
                    • 关键帧并发生成，大幅缩短等待时间
                    {fastMode && (
                      <>
                        <br />
                        • 快速预览模式：使用低分辨率，速度提升约 50%
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={generateCharacters}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-semibold text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 shadow-lg shadow-blue-500/30 flex items-center gap-2"
              >
                {loading ? '生成中...' : (
                  <>
                    确认，生成人物设定
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 步骤4：人物设定 */}
        {currentStep === 'character' && characterDesign && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
              第四步：确认人物设定
            </h2>
            <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">统一种族</span>
                  <span className="font-medium text-gray-900 dark:text-white">{characterDesign.unifiedSetting.ethnicity}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">画风关键词</span>
                  <span className="font-medium text-gray-900 dark:text-white">{characterDesign.unifiedSetting.artStyleKeywords}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">家族特征</span>
                  <span className="font-medium text-gray-900 dark:text-white">{characterDesign.unifiedSetting.familyTraits}</span>
                </div>
              </div>
            </div>
            <div className="mb-8 grid gap-6 sm:grid-cols-2">
              {characterDesign.characters.map((character, index) => (
                <div key={character.name} className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-lg group relative">
                  <div className="aspect-[720/1280] w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={characterDesign.characterImages[index]}
                      alt={character.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => regenerateCharacter(index)}
                      disabled={loading}
                      className="p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 dark:bg-gray-800/90 dark:hover:bg-gray-700"
                      title="重新生成此角色"
                    >
                      <svg className={`h-5 w-5 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">{character.name}</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{character.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={confirmCharacters}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-semibold text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 shadow-lg shadow-blue-500/30 flex items-center gap-2"
              >
                {loading ? '生成中（可能需要几分钟）...' : (
                  <>
                    确认，生成关键帧
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 步骤5：关键帧 */}
        {currentStep === 'keyframes' && keyframes && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                第五步：关键帧预览
              </h2>
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-xs font-medium text-green-700 dark:text-green-300">
                720×1280 统一尺寸
              </div>
            </div>
            <div className="mb-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {keyframes.map((keyframe) => (
                <div key={keyframe.sceneNumber} className="group relative aspect-[720/1280] overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-600 shadow-lg">
                  <img
                    src={keyframe.imageUrl}
                    alt={`场景${keyframe.sceneNumber}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  
                  {/* 重新生成按钮 */}
                  <button
                    onClick={() => regenerateKeyframe(keyframe.sceneNumber)}
                    disabled={loading}
                    className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all hover:scale-110 dark:bg-gray-800/90 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100"
                    title="重新生成此关键帧"
                  >
                    <svg className={`h-5 w-5 text-blue-600 dark:text-blue-400 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold text-sm">场景 {keyframe.sceneNumber}</span>
                      <button
                        onClick={() => downloadSingleKeyframe(keyframe.sceneNumber, keyframe.imageUrl)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm"
                        title="下载此关键帧"
                      >
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                共 {keyframes.length} 个关键帧，使用 image-to-image 技术保持人物一致性
              </p>
              <div className="flex gap-4">
                <button
                  onClick={downloadAll}
                  className="rounded-xl border-2 border-blue-500 bg-blue-50 px-6 py-3 font-semibold text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 flex items-center gap-2"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  打包下载关键帧
                </button>
                <button
                  onClick={generateVideoPrompts}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-semibold text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:opacity-50 shadow-lg shadow-blue-500/30 flex items-center gap-2"
                >
                  {loading ? '生成中...' : (
                    <>
                      生成视频提示词
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 步骤6：视频提示词 */}
        {currentStep === 'video-prompts' && videoPrompts && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
              第六步：视频生成提示词
            </h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              已针对 Sora、Runway、Pika、Kling 等工具优化
            </p>

            {/* 整体风格 */}
            <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-6 dark:from-blue-900/20 dark:to-purple-900/20">
              <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">整体风格建议</h3>
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">视觉风格</span>
                  <span className="text-gray-900 dark:text-white">{videoPrompts.overallStyle.visualStyle}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">色调</span>
                  <span className="text-gray-900 dark:text-white">{videoPrompts.overallStyle.colorPalette}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">运动风格</span>
                  <span className="text-gray-900 dark:text-white">{videoPrompts.overallStyle.motionStyle}</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">音效氛围</span>
                  <span className="text-gray-900 dark:text-white">{videoPrompts.overallStyle.audioAtmosphere}</span>
                </div>
              </div>
            </div>

            {/* 场景选择 */}
            <div className="mb-8">
              <h3 className="mb-4 font-semibold text-gray-700 dark:text-gray-300">
                选择场景查看详细提示词
              </h3>
              <div className="flex flex-wrap gap-2">
                {videoPrompts.scenes.map((scene) => (
                  <button
                    key={scene.sceneNumber}
                    onClick={() => setSelectedPromptScene(scene.sceneNumber)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                      selectedPromptScene === scene.sceneNumber
                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    场景 {scene.sceneNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* 详细提示词 */}
            {selectedPromptScene && keyframes && (
              <div className="rounded-xl border-2 border-gray-200 p-6 dark:border-gray-600">
                {(() => {
                  const scene = videoPrompts.scenes.find(s => s.sceneNumber === selectedPromptScene);
                  const keyframe = keyframes.find(k => k.sceneNumber === selectedPromptScene);
                  if (!scene || !keyframe) return null;

                  return (
                    <>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                            场景 {scene.sceneNumber} - {scene.sceneDescription}
                          </h4>
                        </div>
                        {/* 关键帧预览 */}
                        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 mb-4">
                          <img
                            src={keyframe.imageUrl}
                            alt={`场景${scene.sceneNumber}关键帧`}
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Sora */}
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-bold text-gray-900 dark:text-white">OpenAI Sora</h5>
                            <button
                              onClick={() => copyText(scene.soraPrompt, 'Sora提示词')}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              复制
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {scene.soraPrompt}
                          </p>
                        </div>

                        {/* Runway */}
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-bold text-gray-900 dark:text-white">Runway Gen-2</h5>
                            <button
                              onClick={() => copyText(scene.runwayPrompt, 'Runway提示词')}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              复制
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {scene.runwayPrompt}
                          </p>
                        </div>

                        {/* Pika */}
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-bold text-gray-900 dark:text-white">Pika</h5>
                            <button
                              onClick={() => copyText(scene.pikaPrompt, 'Pika提示词')}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              复制
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {scene.pikaPrompt}
                          </p>
                        </div>

                        {/* Kling */}
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-bold text-gray-900 dark:text-white">Kling（可灵）</h5>
                            <button
                              onClick={() => copyText(scene.klingPrompt, 'Kling提示词')}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              复制
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {scene.klingPrompt}
                          </p>
                        </div>

                        {/* 中文通用 */}
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-bold text-gray-900 dark:text-white">中文通用提示词</h5>
                            <button
                              onClick={() => copyText(scene.chinesePrompt, '中文提示词')}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              复制
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {scene.chinesePrompt}
                          </p>
                        </div>

                        {/* 其他信息 */}
                        <div className="grid grid-cols-2 gap-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-900/20 dark:to-purple-900/20">
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">摄像机运动</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{scene.cameraMovement}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">建议时长</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{scene.duration}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">运动强度</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{scene.motionIntensity}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">音乐情绪</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{scene.musicMood}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">音效建议</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{scene.audioSuggestion}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <button
                onClick={() => setCurrentStep('keyframes')}
                className="rounded-xl border-2 border-gray-200 px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回关键帧
              </button>
              <button
                onClick={() => {
                  downloadAll();
                  setCurrentStep('download');
                }}
                className="rounded-xl bg-gradient-to-r from-green-500 to-blue-500 px-8 py-3 font-semibold text-white transition-all hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-green-500/30 shadow-lg shadow-green-500/30 flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                下载所有素材并完成
              </button>
            </div>
          </div>
        )}

        {/* 步骤7：完成 */}
        {currentStep === 'download' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 shadow-lg dark:border-gray-700 dark:bg-gray-800 text-center max-w-3xl mx-auto">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-blue-500 shadow-xl shadow-green-500/30">
              <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
              完成！
            </h2>
            <p className="mb-8 text-gray-600 dark:text-gray-400 leading-relaxed">
              所有关键帧和视频提示词已打包下载完成。<br />
              <span className="font-medium text-gray-900 dark:text-white">关键帧</span>：720×1280 统一尺寸，使用 image-to-image 技术保持人物一致性<br />
              <span className="font-medium text-gray-900 dark:text-white">提示词</span>：已针对 Sora、Runway、Pika、Kling 等工具优化<br />
              <span className="font-medium text-gray-900 dark:text-white">文件命名</span>：场景编号统一，方便对应
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-4 font-semibold text-white transition-all hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                创建新剧本
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
