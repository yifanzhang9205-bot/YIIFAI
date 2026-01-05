'use client';

import { useState } from 'react';

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
  const [error, setError] = useState<string | null>(null);

  // 状态数据
  const [requirement, setRequirement] = useState('');
  const [script, setScript] = useState<MovieScript | null>(null);
  const [scriptEdit, setScriptEdit] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('写实风格');
  const [storyboard, setStoryboard] = useState<StoryboardScript | null>(null);
  const [characterDesign, setCharacterDesign] = useState<CharacterDesign | null>(null);
  const [keyframes, setKeyframes] = useState<KeyframeScene[] | null>(null);
  const [videoPrompts, setVideoPrompts] = useState<VideoPrompts | null>(null);
  const [selectedPromptScene, setSelectedPromptScene] = useState<number | null>(null);

  const artStyles = [
    '写实风格',
    '卡通风格',
    '动漫风格',
    '水彩风格',
    '油画风格',
    '像素风格',
  ];

  // 生成剧本
  const generateScript = async () => {
    if (!requirement.trim()) {
      alert('请输入需求');
      return;
    }

    setLoading(true);
    setError(null);

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
      setLoading(false);
    }
  };

  // 修改剧本
  const editScript = async () => {
    setLoading(true);
    setError(null);

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
      setLoading(false);
    }
  };

  // 确认剧本，生成分镜
  const confirmScript = async () => {
    if (!script) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          artStyle: selectedStyle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStoryboard(data.storyboard);
        setCurrentStep('storyboard');
      } else {
        throw new Error(data.error || '生成分镜失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成分镜失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成人物设定
  const generateCharacters = async () => {
    if (!script || !storyboard) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/character/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          artStyle: storyboard.artStyle,
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
      setLoading(false);
    }
  };

  // 确认人物，生成关键帧
  const confirmCharacters = async () => {
    if (!storyboard || !characterDesign) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/keyframes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboard,
          characterImages: characterDesign.characterImages,
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
      setLoading(false);
    }
  };

  // 生成视频提示词
  const generateVideoPrompts = async () => {
    if (!script || !storyboard || !characterDesign || !keyframes) return;

    setLoading(true);
    setError(null);

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
      setLoading(false);
    }
  };

  // 下载所有关键帧
  const downloadAll = async () => {
    if (!keyframes || !script) return;

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyframes,
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
      a.download = `${script.title}_keyframes.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : '打包下载失败');
    }
  };

  // 复制文本
  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`已复制${label}到剪贴板`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 头部 */}
      <header className="border-b border-gray-200 bg-white/50 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/50">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2v2m0-2h10M7 4H4a1 1 0 00-1 1v14a1 1 0 001 1h16a1 1 0 001-1V5a1 1 0 00-1-1h-3m-9 10l3 3m0 0l3-3m-3 3V8" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">AI 剧本分镜视频生成器</span>
            </div>

            {/* 步骤指示器 */}
            <div className="hidden md:flex items-center gap-2">
              {[
                { step: 'requirement', label: '需求' },
                { step: 'script', label: '剧本' },
                { step: 'storyboard', label: '分镜' },
                { step: 'character', label: '人物' },
                { step: 'keyframes', label: '关键帧' },
                { step: 'video-prompts', label: '视频提示词' },
                { step: 'download', label: '完成' },
              ].map((item, index) => (
                <div key={item.step} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      currentStep === item.step
                        ? 'bg-blue-500 text-white'
                        : index < ['requirement', 'script', 'storyboard', 'character', 'keyframes', 'video-prompts', 'download'].indexOf(currentStep)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={`text-sm ${
                    currentStep === item.step
                      ? 'text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {item.label}
                  </span>
                  {index < 6 && <div className="h-px w-8 bg-gray-300 dark:bg-gray-600" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* 步骤1：需求输入 */}
        {currentStep === 'requirement' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              第一步：输入创作需求
            </h2>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="描述你想要创作的剧本内容，例如：
- 一个关于都市爱情的故事
- 主角是一个年轻的程序员
- 发生在咖啡馆的相遇
- 温馨治愈的风格

请尽可能详细地描述你的创意..."
              className="min-h-[200px] w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              disabled={loading}
            />
            <button
              onClick={generateScript}
              disabled={loading || !requirement.trim()}
              className="mt-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? '生成中...' : '生成剧本'}
            </button>
          </div>
        )}

        {/* 步骤2：剧本确认 */}
        {currentStep === 'script' && script && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              第二步：确认剧本
            </h2>
            <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <p className="font-medium text-gray-900 dark:text-white">{script.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{script.genre}</p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{script.logline}</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{script.summary}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                <div><span className="font-medium">情感弧线：</span>{script.emotionalArc}</div>
                <div><span className="font-medium">目标受众：</span>{script.targetAudience}</div>
                <div><span className="font-medium">视觉风格：</span>{script.visualStyle}</div>
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-2 block font-medium text-gray-700 dark:text-gray-300">
                剧本JSON（可直接修改）
              </label>
              <textarea
                value={scriptEdit}
                onChange={(e) => setScriptEdit(e.target.value)}
                className="min-h-[300px] w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={loading}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={editScript}
                disabled={loading}
                className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? '修改中...' : '修改剧本'}
              </button>
              <button
                onClick={confirmScript}
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
              >
                {loading ? '生成中...' : '确认，选择画风'}
              </button>
            </div>
          </div>
        )}

        {/* 步骤3：画风选择和分镜 */}
        {currentStep === 'storyboard' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              第三步：选择画风并生成分镜
            </h2>
            <div className="mb-6">
              <label className="mb-2 block font-medium text-gray-700 dark:text-gray-300">
                选择画风
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {artStyles.map((style) => (
                  <button
                    key={style}
                    onClick={() => setSelectedStyle(style)}
                    className={`rounded-lg border-2 px-4 py-3 font-medium transition-all ${
                      selectedStyle === style
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            {storyboard && (
              <div className="mb-6">
                <h3 className="mb-3 font-medium text-gray-700 dark:text-gray-300">
                  分镜脚本预览
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {storyboard.scenes.slice(0, 4).map((scene) => (
                    <div key={scene.sceneNumber} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                          {scene.sceneNumber}
                        </span>
                        <div className="flex-1">
                          <p className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
                            {scene.shotType} · {scene.cameraAngle} · {scene.cameraMovement}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {scene.composition}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {storyboard.scenes.length > 4 && (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                      还有 {storyboard.scenes.length - 4} 场...
                    </p>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={generateCharacters}
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              {loading ? '生成中...' : '确认，生成人物设定'}
            </button>
          </div>
        )}

        {/* 步骤4：人物设定 */}
        {currentStep === 'character' && characterDesign && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              第四步：确认人物设定
            </h2>
            <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-medium">统一种族：</span>{characterDesign.unifiedSetting.ethnicity}
                {' '}|{' '}
                <span className="font-medium">画风关键词：</span>{characterDesign.unifiedSetting.artStyleKeywords}
                {' '}|{' '}
                <span className="font-medium">家族特征：</span>{characterDesign.unifiedSetting.familyTraits}
              </p>
            </div>
            <div className="mb-6 grid gap-6 sm:grid-cols-2">
              {characterDesign.characters.map((character, index) => (
                <div key={character.name} className="rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="aspect-[720/1280] w-full overflow-hidden">
                    <img
                      src={characterDesign.characterImages[index]}
                      alt={character.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">{character.name}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{character.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={confirmCharacters}
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
            >
              {loading ? '生成中（可能需要几分钟）...' : '确认，生成关键帧'}
            </button>
          </div>
        )}

        {/* 步骤5：关键帧 */}
        {currentStep === 'keyframes' && keyframes && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              第五步：关键帧预览（全部统一高度 720×1280）
            </h2>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {keyframes.map((keyframe) => (
                <div key={keyframe.sceneNumber} className="group relative aspect-[720/1280] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                  <img
                    src={keyframe.imageUrl}
                    alt={`场景${keyframe.sceneNumber}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-center text-white">
                    <span className="text-sm font-medium">场景 {keyframe.sceneNumber}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                共 {keyframes.length} 个关键帧，所有图片尺寸均为 720×1280，高度完全一致
              </p>
              <div className="flex gap-4">
                <button
                  onClick={downloadAll}
                  className="rounded-lg border border-blue-500 bg-blue-50 px-6 py-3 font-medium text-blue-700 transition-all hover:bg-blue-100 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  打包下载关键帧
                </button>
                <button
                  onClick={generateVideoPrompts}
                  disabled={loading}
                  className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                >
                  {loading ? '生成中...' : '生成视频提示词'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 步骤6：视频提示词 */}
        {currentStep === 'video-prompts' && videoPrompts && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              第六步：视频生成提示词（适配Sora、Runway、Pika、Kling等）
            </h2>

            {/* 整体风格 */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <h3 className="mb-3 font-medium text-gray-900 dark:text-white">整体风格建议</h3>
              <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div><span className="font-medium">视觉风格：</span>{videoPrompts.overallStyle.visualStyle}</div>
                <div><span className="font-medium">色调：</span>{videoPrompts.overallStyle.colorPalette}</div>
                <div><span className="font-medium">运动风格：</span>{videoPrompts.overallStyle.motionStyle}</div>
                <div><span className="font-medium">音效氛围：</span>{videoPrompts.overallStyle.audioAtmosphere}</div>
              </div>
            </div>

            {/* 场景选择 */}
            <div className="mb-6">
              <h3 className="mb-3 font-medium text-gray-700 dark:text-gray-300">
                选择场景查看详细提示词
              </h3>
              <div className="flex flex-wrap gap-2">
                {videoPrompts.scenes.map((scene) => (
                  <button
                    key={scene.sceneNumber}
                    onClick={() => setSelectedPromptScene(scene.sceneNumber)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                      selectedPromptScene === scene.sceneNumber
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    场景 {scene.sceneNumber}
                  </button>
                ))}
              </div>
            </div>

            {/* 详细提示词 */}
            {selectedPromptScene && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                {(() => {
                  const scene = videoPrompts.scenes.find(s => s.sceneNumber === selectedPromptScene);
                  if (!scene) return null;

                  return (
                    <>
                      <h4 className="mb-3 font-medium text-gray-900 dark:text-white">
                        场景 {scene.sceneNumber} - {scene.sceneDescription}
                      </h4>

                      <div className="space-y-4">
                        {/* Sora */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">OpenAI Sora</h5>
                            <button
                              onClick={() => copyText(scene.soraPrompt, 'Sora提示词')}
                              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                              复制
                            </button>
                          </div>
                          <p className="rounded bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {scene.soraPrompt}
                          </p>
                        </div>

                        {/* Runway */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Runway Gen-2</h5>
                            <button
                              onClick={() => copyText(scene.runwayPrompt, 'Runway提示词')}
                              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                              复制
                            </button>
                          </div>
                          <p className="rounded bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {scene.runwayPrompt}
                          </p>
                        </div>

                        {/* Pika */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pika</h5>
                            <button
                              onClick={() => copyText(scene.pikaPrompt, 'Pika提示词')}
                              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                              复制
                            </button>
                          </div>
                          <p className="rounded bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {scene.pikaPrompt}
                          </p>
                        </div>

                        {/* Kling */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Kling（可灵）</h5>
                            <button
                              onClick={() => copyText(scene.klingPrompt, 'Kling提示词')}
                              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                              复制
                            </button>
                          </div>
                          <p className="rounded bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {scene.klingPrompt}
                          </p>
                        </div>

                        {/* 中文通用 */}
                        <div>
                          <div className="mb-2 flex items-center justify-between">
                            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">中文通用提示词</h5>
                            <button
                              onClick={() => copyText(scene.chinesePrompt, '中文提示词')}
                              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                            >
                              复制
                            </button>
                          </div>
                          <p className="rounded bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {scene.chinesePrompt}
                          </p>
                        </div>

                        {/* 其他信息 */}
                        <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">摄像机运动：</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">{scene.cameraMovement}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">建议时长：</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">{scene.duration}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">运动强度：</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">{scene.motionIntensity}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">音乐情绪：</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">{scene.musicMood}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400">音效建议：</span>
                            <span className="text-xs text-gray-700 dark:text-gray-300">{scene.audioSuggestion}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => setCurrentStep('keyframes')}
                className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                返回关键帧
              </button>
              <button
                onClick={() => {
                  downloadAll();
                  setCurrentStep('download');
                }}
                className="rounded-lg bg-gradient-to-r from-green-500 to-blue-500 px-6 py-2 font-medium text-white transition-all hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                下载并完成
              </button>
            </div>
          </div>
        )}

        {/* 步骤7：完成 */}
        {currentStep === 'download' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <svg className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
              完成！
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              所有关键帧已生成并下载完成。所有图片高度一致（720×1280），人物保持连贯性。<br />
              视频生成提示词已准备就绪，可用于 Sora、Runway、Pika、Kling 等 AI 视频工具。
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-3 font-medium text-white transition-all hover:from-blue-600 hover:to-purple-600"
            >
              创建新剧本
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
