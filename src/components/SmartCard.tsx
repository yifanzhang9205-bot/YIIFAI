'use client';

import { useState } from 'react';
import { ContentItem } from '@/app/canvas/page';

interface SmartCardProps {
  item: ContentItem;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ContentItem>) => void;
  onSelectImage: (imageIndex: number) => void;
}

// 宽高比对应的aspect-ratio值
const ASPECT_RATIO_MAP: Record<string, string> = {
  '16:9': '16/9',
  '9:16': '9/16',
  '4:3': '4/3',
  '3:4': '3/4',
  '1:1': '1/1',
};

export default function SmartCard({ item, selected, onSelect, onUpdate, onSelectImage }: SmartCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: item.size.width,
      height: item.size.height,
    });
  };

  const handleResizeMove = (e: React.MouseEvent) => {
    if (!isResizing) return;

    const newWidth = Math.max(200, resizeStart.width + (e.clientX - resizeStart.x));
    const newHeight = Math.max(150, resizeStart.height + (e.clientY - resizeStart.y));

    onUpdate({
      size: { width: newWidth, height: newHeight }
    });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'script': return '📝';
      case 'storyboard': return '🎬';
      case 'image': return '🖼️';
      case 'video': return '🎥';
      default: return '📄';
    }
  };

  const getTypeGradient = (type: string) => {
    switch (type) {
      case 'script': return 'from-blue-500 to-blue-600';
      case 'storyboard': return 'from-purple-500 to-purple-600';
      case 'image': return 'from-green-500 to-green-600';
      case 'video': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  // 获取宽高比
  const getAspectRatio = () => {
    if (item.type === 'image' && item.content?.aspectRatio) {
      return ASPECT_RATIO_MAP[item.content.aspectRatio] || '16/9';
    }
    return '16/9'; // 默认
  };

  // 渲染内容
  const renderContent = () => {
    switch (item.type) {
      case 'script':
        return (
          <div className="p-4 text-white text-sm overflow-auto max-h-full">
            <div className="font-bold mb-2">{item.content.title || '剧本'}</div>
            <div className="text-gray-300 line-clamp-6">
              {typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2)}
            </div>
          </div>
        );

      case 'image':
        const aspectRatio = getAspectRatio();

        return (
          <div className="relative">
            {/* 显示选中的图片 */}
            {item.images && item.images.length > 0 ? (
              <div
                className="bg-gray-800 relative rounded-lg overflow-hidden"
                style={{ aspectRatio }}
              >
                <img
                  src={item.images[item.selectedImageIndex || 0]}
                  alt="生成的图片"
                  className="w-full h-full object-cover"
                />
                {/* 图片编号和总数 */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-medium">
                  #{(item.selectedImageIndex || 0) + 1} / {item.images.length}
                </div>
                {/* 提示点击展开 */}
                {item.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-blue-600/90 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg shadow-lg">
                    展开选择
                  </div>
                )}
              </div>
            ) : (
              <div
                className="bg-gray-800 flex flex-col items-center justify-center text-gray-500 rounded-lg"
                style={{ aspectRatio }}
              >
                <div className="text-4xl mb-2">⏳</div>
                <div className="text-sm">生成中...</div>
              </div>
            )}

            {/* 九宫格展示（展开时） */}
            {expanded && item.images && item.images.length > 1 && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-gray-900/50 mt-3 rounded-xl backdrop-blur-sm">
                {item.images.map((img, index) => (
                  <div
                    key={index}
                    onClick={() => onSelectImage(index)}
                    className={`cursor-pointer rounded-lg overflow-hidden transition-all duration-200 relative group ${
                      (item.selectedImageIndex || 0) === index
                        ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/30'
                        : 'hover:scale-105 hover:shadow-lg'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`选项 ${index + 1}`}
                      className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-200"
                    />
                    {/* 悬停时显示编号 */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        #{index + 1}
                      </span>
                    </div>
                    {/* 选中标记 */}
                    {(item.selectedImageIndex || 0) === index && (
                      <div className="absolute top-1.5 right-1.5 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium shadow-lg">
                        已选
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="p-3 flex gap-2">
              <button
                onClick={() => {
                  console.log('重新生成图片');
                }}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs py-2 px-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 font-medium"
              >
                🔄 重新生成
              </button>
              <button
                onClick={() => {
                  console.log('生成更多选项');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 px-3 rounded-xl transition-all shadow-lg hover:shadow-gray-500/10 font-medium"
              >
                ✨ 更多选项
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="p-4 text-white text-sm">
            <div className="text-gray-400">内容类型：{item.type}</div>
          </div>
        );
    }
  };

  return (
    <div
      className={`absolute bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
        selected ? 'ring-2 ring-blue-500 shadow-blue-500/30' : ''
      }`}
      style={{
        width: item.size.width,
        height: expanded ? 'auto' : item.size.height,
        minHeight: 120,
      }}
      onMouseMove={isResizing ? handleResizeMove : undefined}
      onMouseUp={isResizing ? handleResizeEnd : undefined}
      onMouseLeave={isResizing ? handleResizeEnd : undefined}
    >
      {/* 卡片头部 */}
      <div
        className={`bg-gradient-to-r ${getTypeGradient(item.type)} px-4 py-2.5 flex items-center justify-between cursor-move shadow-lg`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{getTypeIcon(item.type)}</span>
          <span className="text-white font-semibold text-sm">
            {item.number} · {item.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 展开/折叠按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg
              className={`w-4 h-4 text-white transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 选择按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`p-1.5 rounded-lg transition-colors ${
              selected
                ? 'bg-white/20 text-white'
                : 'hover:bg-white/10 text-white/70'
            }`}
          >
            {selected ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <div className="w-4 h-4 border-2 border-current rounded" />
            )}
          </button>

          {/* 删除按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // 触发删除
            }}
            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors text-white/70 hover:text-red-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 卡片内容 */}
      <div className="bg-gray-900/50">
        {renderContent()}
      </div>

      {/* 调整大小手柄 */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-center opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={handleResizeStart}
      >
        <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </div>
    </div>
  );
}
