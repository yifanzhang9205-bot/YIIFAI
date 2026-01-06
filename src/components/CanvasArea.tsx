'use client';

import { forwardRef, useRef, DragEvent, useState } from 'react';
import { ContentItem } from '@/app/canvas/page';
import SmartCard from './SmartCard';

interface CanvasAreaProps {
  items: ContentItem[];
  setItems: (items: ContentItem[]) => void;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectionBox: { x: number; y: number; width: number; height: number } | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(
  ({ items, setItems, selectedIds, toggleSelect, selectionBox, onMouseDown, onMouseMove, onMouseUp }, ref) => {
    const draggedItemRef = useRef<ContentItem | null>(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);

    const handleDragStart = (e: DragEvent, item: ContentItem) => {
      draggedItemRef.current = item;
      dragOffsetRef.current = {
        x: e.clientX - item.position.x,
        y: e.clientY - item.position.y,
      };
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (!draggedItemRef.current) return;

      const newItem = { ...draggedItemRef.current };
      newItem.position = {
        x: e.clientX - dragOffsetRef.current.x,
        y: e.clientY - dragOffsetRef.current.y,
      };

      setItems(items.map(item =>
        item.id === newItem.id ? newItem : item
      ));

      draggedItemRef.current = null;
    };

    const handleUpdateItem = (id: string, updates: Partial<ContentItem>) => {
      setItems(items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ));
    };

    const handleSelectImage = (itemId: string, imageIndex: number) => {
      setItems(items.map(item =>
        item.id === itemId ? { ...item, selectedImageIndex: imageIndex } : item
      ));
    };

    return (
      <div
        ref={ref}
        className="w-full h-full relative bg-gray-900 overflow-auto"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* 缩放控制 */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
          <button
            onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
            className="text-white hover:bg-gray-700 px-2 py-1 rounded text-sm font-bold"
          >
            −
          </button>
          <span className="text-white text-sm w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
            className="text-white hover:bg-gray-700 px-2 py-1 rounded text-sm font-bold"
          >
            +
          </button>
          <div className="w-px h-4 bg-gray-600" />
          <button
            onClick={() => setScale(1)}
            className="text-gray-400 hover:text-white text-xs px-2"
          >
            重置
          </button>
        </div>

        {/* 内容区域（应用缩放） */}
        <div
          className="absolute inset-0"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* 背景网格 */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />

        {/* 所有卡片 */}
        {items.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            style={{
              position: 'absolute',
              left: item.position.x,
              top: item.position.y,
              width: item.size.width,
              height: item.size.height,
              zIndex: selectedIds.has(item.id) ? 1000 : 1,
            }}
          >
            <SmartCard
              item={item}
              selected={selectedIds.has(item.id)}
              onSelect={() => toggleSelect(item.id)}
              onUpdate={(updates) => handleUpdateItem(item.id, updates)}
              onSelectImage={(index) => handleSelectImage(item.id, index)}
            />
          </div>
        ))}

        {/* 框选框 */}
        {selectionBox && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
            style={{
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height,
            }}
          />
        )}

        {/* 空状态提示 */}
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">🎬</div>
              <div className="text-xl">画布是空的</div>
              <div className="mt-2">在下方输入框告诉我你的需求，开始创作吧！</div>
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }
);

CanvasArea.displayName = 'CanvasArea';

export default CanvasArea;
