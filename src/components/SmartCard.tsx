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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'script': return 'from-blue-500 to-blue-600';
      case 'storyboard': return 'from-purple-500 to-purple-600';
      case 'image': return 'from-green-500 to-green-600';
      case 'video': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
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
        return (
          <div className="relative">
            {/* 显示选中的图片 */}
            {item.images && item.images.length > 0 ? (
              <div className="aspect-video bg-gray-800">
                <img
                  src={item.images[item.selectedImageIndex || 0]}
                  alt="生成的图片"
                  className="w-full h-full object-cover"
                />
                {/* 图片编号 */}
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  #{(item.selectedImageIndex || 0) + 1}
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-gray-800 flex items-center justify-center text-gray-500">
                生成中...
              </div>
            )}

            {/* 九宫格展示（展开时） */}
            {expanded && item.images && item.images.length > 1 && (
              <div className="grid grid-cols-2 gap-2 p-2 bg-gray-900 mt-2 rounded">
                {item.images.map((img, index) => (
                  <div
                    key={index}
                    onClick={() => onSelectImage(index)}
                    className={`cursor-pointer rounded overflow-hidden transition-all relative group ${
                      (item.selectedImageIndex || 0) === index ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    <img
                      src={img}
                      alt={`选项 ${index + 1}`}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                    />
                    {/* 悬停时显示编号 */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        #{index + 1}
                      </span>
                    </div>
                    {/* 选中标记 */}
                    {(item.selectedImageIndex || 0) === index && (
                      <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                        已选
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 操作按钮 */}
            <div className="p-2 flex gap-2">
              <button
                onClick={() => {
                  // 这里可以触发重新生成
                  console.log('重新生成图片');
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-2 rounded transition-colors"
              >
                🔄 重新生成
              </button>
              <button
                onClick={() => {
                  // 这里可以触发生成更多选项
                  console.log('生成更多选项');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-xs py-1.5 px-2 rounded transition-colors"
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
      className={`absolute bg-gray-800 rounded-lg shadow-2xl overflow-hidden transition-all ${
        selected ? 'ring-2 ring-blue-500' : ''
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
        className={`bg-gradient-to-r ${getTypeColor(item.type)} px-3 py-2 flex items-center justify-between cursor-move`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getTypeIcon(item.type)}</span>
          <span className="text-white font-medium text-sm">
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
            className="text-white hover:bg-white/20 px-2 py-1 rounded text-xs"
          >
            {expanded ? '收起' : '展开'}
          </button>
          {/* 复选框 */}
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="w-4 h-4 rounded cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* 卡片内容 */}
      <div className="bg-gray-800">
        {renderContent()}
      </div>

      {/* 调整大小的手柄 */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/50"
        onMouseDown={handleResizeStart}
      >
        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-gray-500">
          <path d="M12 12h4v4h-4zM8 12h4v4H8zM12 8h4v4h-4z" />
        </svg>
      </div>
    </div>
  );
}
