'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { getPreviewUrl, hasPreview } from '@/data/art-style-previews';

interface ChatInputProps {
  onSendMessage: (message: string, options?: { artStyle?: string; aspectRatio?: string }) => void;
}

// 60+种画风选项（按分类）
const ART_STYLE_CATEGORIES = {
  '写实类': [
    { name: '写实风格', gradient: 'from-blue-500 to-purple-600' },
    { name: '电影质感', gradient: 'from-gray-700 to-gray-900' },
    { name: '纪录片风格', gradient: 'from-amber-600 to-amber-800' },
    { name: '新闻摄影', gradient: 'from-stone-500 to-stone-700' },
    { name: '商业摄影', gradient: 'from-slate-500 to-slate-700' }
  ],
  '动漫/漫画类': [
    { name: '动漫风格', gradient: 'from-pink-500 to-rose-600' },
    { name: '漫画风格', gradient: 'from-zinc-600 to-zinc-800' },
    { name: '赛璐璐风格', gradient: 'from-violet-500 to-purple-600' },
    { name: '吉卜力风格', gradient: 'from-green-500 to-emerald-600' },
    { name: '新海诚风格', gradient: 'from-sky-400 to-blue-500' },
    { name: '宫崎骏风格', gradient: 'from-lime-500 to-green-600' }
  ],
  '卡通/插画类': [
    { name: '卡通风格', gradient: 'from-yellow-400 to-orange-500' },
    { name: '迪士尼风格', gradient: 'from-blue-400 to-indigo-500' },
    { name: '皮克斯风格', gradient: 'from-red-400 to-orange-500' },
    { name: '儿童绘本', gradient: 'from-pink-400 to-rose-500' },
    { name: '矢量插画', gradient: 'from-cyan-500 to-teal-600' },
    { name: '涂鸦风格', gradient: 'from-fuchsia-500 to-pink-600' }
  ],
  '艺术绘画类': [
    { name: '水彩风格', gradient: 'from-indigo-300 to-purple-400' },
    { name: '油画风格', gradient: 'from-amber-700 to-orange-800' },
    { name: '素描风格', gradient: 'from-gray-400 to-gray-600' },
    { name: '粉彩风格', gradient: 'from-pink-300 to-purple-400' },
    { name: '版画风格', gradient: 'from-red-600 to-rose-700' },
    { name: '波普艺术', gradient: 'from-yellow-500 to-red-500' }
  ],
  '传统文化类': [
    { name: '水墨风格', gradient: 'from-gray-600 to-black' },
    { name: '浮世绘风格', gradient: 'from-red-400 to-orange-500' },
    { name: '敦煌壁画', gradient: 'from-amber-500 to-yellow-600' },
    { name: '唐卡风格', gradient: 'from-orange-600 to-red-700' },
    { name: '和风', gradient: 'from-rose-300 to-pink-400' }
  ],
  '特定时期/流派': [
    { name: '复古油画', gradient: 'from-amber-800 to-stone-900' },
    { name: '印象派', gradient: 'from-sky-300 to-blue-400' },
    { name: '野兽派', gradient: 'from-green-500 to-lime-500' },
    { name: '超现实主义', gradient: 'from-purple-500 to-indigo-600' }
  ],
  '科幻/未来类': [
    { name: '赛博朋克', gradient: 'from-cyan-400 to-purple-600' },
    { name: '废土风格', gradient: 'from-stone-600 to-amber-700' },
    { name: '太空歌剧', gradient: 'from-indigo-600 to-purple-800' },
    { name: '未来都市', gradient: 'from-blue-500 to-cyan-600' },
    { name: '机甲风格', gradient: 'from-slate-600 to-zinc-700' }
  ],
  '奇幻/魔法类': [
    { name: '奇幻风格', gradient: 'from-purple-400 to-pink-500' },
    { name: '暗黑奇幻', gradient: 'from-gray-700 to-purple-900' },
    { name: '童话风格', gradient: 'from-pink-300 to-purple-400' },
    { name: '魔幻现实主义', gradient: 'from-indigo-400 to-purple-500' }
  ],
  '机械/工业类': [
    { name: '工业设计', gradient: 'from-gray-500 to-slate-600' },
    { name: '蒸汽朋克', gradient: 'from-amber-600 to-orange-700' },
    { name: '柴油朋克', gradient: 'from-stone-500 to-zinc-600' },
    { name: '机械科幻', gradient: 'from-slate-600 to-gray-700' }
  ],
  '数字/现代类': [
    { name: '像素风格', gradient: 'from-green-500 to-emerald-600' },
    { name: '低多边形', gradient: 'from-blue-400 to-cyan-500' },
    { name: '霓虹艺术', gradient: 'from-fuchsia-500 to-purple-600' },
    { name: '未来主义', gradient: 'from-indigo-500 to-blue-600' },
    { name: '极简主义', gradient: 'from-gray-300 to-gray-500' }
  ],
  '其他风格': [
    { name: '抽象主义', gradient: 'from-violet-500 to-fuchsia-600' },
    { name: '表现主义', gradient: 'from-red-500 to-orange-600' },
    { name: '立体主义', gradient: 'from-blue-600 to-indigo-700' },
    { name: '暗黑哥特', gradient: 'from-gray-800 to-black' }
  ]
};

// 宽高比选项
const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9 横屏', icon: '↔' },
  { value: '9:16', label: '9:16 竖屏', icon: '↕' },
  { value: '4:3', label: '4:3 横屏', icon: '▭' },
  { value: '3:4', label: '3:4 竖屏', icon: '▯' },
  { value: '1:1', label: '1:1 方形', icon: '◼' },
];

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedArtStyle, setSelectedArtStyle] = useState('写实风格');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('3:4');
  const [showArtStyleDropdown, setShowArtStyleDropdown] = useState(false);
  const [showAspectRatioDropdown, setShowAspectRatioDropdown] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message, {
      artStyle: selectedArtStyle,
      aspectRatio: selectedAspectRatio,
    });
    setMessage('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent p-4 z-50">
      <div className="max-w-5xl mx-auto">
        {/* 选项栏 */}
        <div className="flex gap-3 mb-3">
          {/* 画风选择器 */}
          <div className="relative">
            <button
              onClick={() => setShowArtStyleDropdown(!showArtStyleDropdown)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-white rounded-xl text-sm transition-all border border-gray-700/50 hover:border-gray-600/50 shadow-lg"
            >
              <span className="text-lg">🎨</span>
              <span className="truncate max-w-[140px] font-medium">{selectedArtStyle}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showArtStyleDropdown && (
              <div className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-[560px] max-h-[420px] overflow-y-auto">
                {Object.entries(ART_STYLE_CATEGORIES).map(([category, styles]) => (
                  <div key={category} className="border-b border-gray-800/50 last:border-0">
                    <div className="px-4 py-2.5 bg-gray-800/50 text-gray-400 text-xs font-semibold uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                      {category}
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {styles.map((style) => {
                        const previewUrl = getPreviewUrl(style.name);
                        const hasImage = hasPreview(style.name);

                        return (
                          <button
                            key={style.name}
                            onClick={() => {
                              setSelectedArtStyle(style.name);
                              setShowArtStyleDropdown(false);
                            }}
                            className={`group relative overflow-hidden rounded-xl transition-all duration-200 aspect-[3/4] ${
                              selectedArtStyle === style.name
                                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 shadow-lg shadow-blue-500/20'
                                : 'hover:shadow-lg hover:scale-[1.02]'
                            }`}
                          >
                            {/* 预览图片或渐变背景 */}
                            {hasImage ? (
                              <>
                                <img
                                  src={previewUrl!}
                                  alt={style.name}
                                  className="absolute inset-0 w-full h-full object-cover transition-opacity group-hover:opacity-100 opacity-90"
                                  loading="lazy"
                                />
                                {/* 渐变遮罩，使文字更清晰 */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                              </>
                            ) : (
                              <div className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />
                            )}
                            {/* 选中遮罩 */}
                            {selectedArtStyle === style.name && (
                              <div className="absolute inset-0 bg-blue-500/30" />
                            )}
                            {/* 文字 */}
                            <div className="absolute bottom-0 left-0 right-0 p-2.5">
                              <div className={`text-xs font-medium text-center leading-tight ${
                                selectedArtStyle === style.name ? 'text-white' : 'text-white/95'
                              }`}>
                                {style.name}
                              </div>
                            </div>
                            {/* 选中标记 */}
                            {selectedArtStyle === style.name && (
                              <div className="absolute top-2 right-2">
                                <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 宽高比选择器 */}
          <div className="relative">
            <button
              onClick={() => setShowAspectRatioDropdown(!showAspectRatioDropdown)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-white rounded-xl text-sm transition-all border border-gray-700/50 hover:border-gray-600/50 shadow-lg"
            >
              <span className="text-lg">📐</span>
              <span className="font-medium">{selectedAspectRatio}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAspectRatioDropdown && (
              <div className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
                {ASPECT_RATIO_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedAspectRatio(option.value);
                      setShowAspectRatioDropdown(false);
                    }}
                    className={`block w-full px-4 py-3 text-sm text-left transition-all border-b border-gray-800/50 last:border-0 ${
                      selectedAspectRatio === option.value
                        ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-400 font-medium'
                        : 'text-gray-300 hover:bg-gray-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{option.icon}</span>
                        <span>{option.label}</span>
                      </div>
                      {selectedAspectRatio === option.value && (
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 输入区域 */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="告诉我你的需求，比如：帮我生成一个关于科幻的剧本..."
              className="w-full bg-gray-800/80 backdrop-blur-sm text-white placeholder-gray-500 rounded-2xl px-5 py-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-gray-800 transition-all shadow-lg border border-gray-700/50"
              rows={2}
            />
            {/* 提示文字 */}
            <div className="absolute -top-6 left-0 text-xs text-gray-500 flex items-center gap-2">
              <span className="px-2 py-1 bg-gray-800/80 backdrop-blur-sm rounded-lg">Enter 发送</span>
              <span className="px-2 py-1 bg-gray-800/80 backdrop-blur-sm rounded-lg">Shift+Enter 换行</span>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={`px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg ${
              message.trim()
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>

        {/* 快捷操作提示 */}
        <div className="mt-3 flex gap-2 text-xs text-gray-500 justify-center">
          <button className="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 rounded-lg transition-colors">
            生成剧本
          </button>
          <button className="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 rounded-lg transition-colors">
            生成分镜
          </button>
          <button className="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 rounded-lg transition-colors">
            生成图片
          </button>
          <button className="px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 rounded-lg transition-colors">
            框选保存
          </button>
        </div>
      </div>
    </div>
  );
}
