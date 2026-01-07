'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string, options?: { artStyle?: string; aspectRatio?: string }) => void;
}

// 60+种画风选项（按分类）
const ART_STYLE_CATEGORIES = {
  '写实类': ['写实风格', '电影质感', '纪录片风格', '新闻摄影', '商业摄影'],
  '动漫/漫画类': ['动漫风格', '漫画风格', '赛璐璐风格', '吉卜力风格', '新海诚风格', '宫崎骏风格'],
  '卡通/插画类': ['卡通风格', '迪士尼风格', '皮克斯风格', '儿童绘本', '矢量插画', '涂鸦风格'],
  '艺术绘画类': ['水彩风格', '油画风格', '素描风格', '粉彩风格', '版画风格', '波普艺术'],
  '传统文化类': ['水墨风格', '浮世绘风格', '敦煌壁画', '唐卡风格', '和风'],
  '特定时期/流派': ['复古油画', '印象派', '野兽派', '超现实主义'],
  '科幻/未来类': ['赛博朋克', '废土风格', '太空歌剧', '未来都市', '机甲风格'],
  '奇幻/魔法类': ['奇幻风格', '暗黑奇幻', '童话风格', '魔幻现实主义'],
  '机械/工业类': ['工业设计', '蒸汽朋克', '柴油朋克', '机械科幻'],
  '数字/现代类': ['像素艺术', '低多边形', '赛博朋克', '未来主义', '极简主义'],
  '其他风格': ['抽象主义', '表现主义', '立体主义', '未来主义'],
};

// 宽高比选项
const ASPECT_RATIO_OPTIONS = [
  { value: '16:9', label: '16:9 (横屏)' },
  { value: '9:16', label: '9:16 (竖屏)' },
  { value: '4:3', label: '4:3 (横屏)' },
  { value: '3:4', label: '3:4 (竖屏)' },
  { value: '1:1', label: '1:1 (方形)' },
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
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4 z-50">
      <div className="max-w-4xl mx-auto">
        {/* 选项栏 */}
        <div className="flex gap-3 mb-3">
          {/* 画风选择器 */}
          <div className="relative">
            <button
              onClick={() => setShowArtStyleDropdown(!showArtStyleDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              <span>🎨</span>
              <span className="truncate max-w-[120px]">{selectedArtStyle}</span>
              <span className="text-gray-400">▼</span>
            </button>

            {showArtStyleDropdown && (
              <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-[600px] max-h-[400px] overflow-y-auto">
                {Object.entries(ART_STYLE_CATEGORIES).map(([category, styles]) => (
                  <div key={category} className="border-b border-gray-700 last:border-0">
                    <div className="px-3 py-2 bg-gray-900 text-gray-300 text-xs font-medium sticky top-0">
                      {category}
                    </div>
                    <div className="p-2 grid grid-cols-3 gap-2">
                      {styles.map((style) => (
                        <button
                          key={style}
                          onClick={() => {
                            setSelectedArtStyle(style);
                            setShowArtStyleDropdown(false);
                          }}
                          className={`px-2 py-1.5 text-xs rounded transition-colors ${
                            selectedArtStyle === style
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
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
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              <span>📐</span>
              <span>{selectedAspectRatio}</span>
              <span className="text-gray-400">▼</span>
            </button>

            {showAspectRatioDropdown && (
              <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
                {ASPECT_RATIO_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSelectedAspectRatio(option.value);
                      setShowAspectRatioDropdown(false);
                    }}
                    className={`block w-full px-3 py-2 text-sm text-left transition-colors ${
                      selectedAspectRatio === option.value
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
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
              className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              rows={2}
            />
            {/* 提示文字 */}
            <div className="absolute -top-5 left-0 text-xs text-gray-500">
              💡 提示：按 Enter 发送，Shift+Enter 换行
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              message.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/25'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            发送
          </button>
        </div>
        {/* 快捷操作提示 */}
        <div className="mt-3 flex gap-3 text-xs text-gray-500">
          <span className="px-2 py-1 bg-gray-700/50 rounded">帮我生成剧本</span>
          <span className="px-2 py-1 bg-gray-700/50 rounded">按1.1生成分镜</span>
          <span className="px-2 py-1 bg-gray-700/50 rounded">生成4张图片</span>
          <span className="px-2 py-1 bg-gray-700/50 rounded">框选并保存</span>
        </div>
      </div>
    </div>
  );
}
