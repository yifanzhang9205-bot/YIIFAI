'use client';

import { useState, useRef, useEffect } from 'react';
import ChatInput from '@/components/ChatInput';
import CanvasArea from '@/components/CanvasArea';
import BatchActionBar from '@/components/BatchActionBar';
import SmartCard from '@/components/SmartCard';

export type ContentType = 'script' | 'storyboard' | 'image' | 'video';

export interface ContentItem {
  id: string;
  number: string; // 如 1.1, 1.12
  type: ContentType;
  title: string;
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  selected?: boolean;
  images?: string[]; // 九宫格图片
  selectedImageIndex?: number; // 选中的图片索引
}

export default function CanvasPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [messageCount, setMessageCount] = useState(0);

  // 添加新内容
  const addContent = (type: ContentType, title: string, content: any, images?: string[]) => {
    setMessageCount(prev => prev + 1);
    const newItem: ContentItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      number: `${messageCount + 1}.${1}`,
      type,
      title,
      content,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { width: 300, height: 200 },
      selected: false,
      images,
    };
    setItems(prev => [...prev, newItem]);
  };

  // 更新子编号
  const updateSubNumber = (parentNumber: string) => {
    const parentItems = items.filter(item => item.number.startsWith(parentNumber));
    if (parentItems.length === 0) return `${parentNumber}.1`;

    const subNumbers = parentItems
      .map(item => item.number.split('.').slice(-1)[0])
      .map(Number)
      .filter(n => !isNaN(n));

    const maxSubNumber = subNumbers.length > 0 ? Math.max(...subNumbers) : 0;
    return `${parentNumber}.${maxSubNumber + 1}`;
  };

  // 处理AI消息
  const handleAiMessage = async (message: string) => {
    // 解析用户意图
    if (message.includes('剧本')) {
      // 生成剧本
      await generateScript(message);
    } else if (message.includes('分镜')) {
      // 提取编号
      const match = message.match(/(\d+\.\d+)/);
      const sceneNumber = match ? match[1] : '1.1';
      // 生成分镜
      await generateStoryboard(sceneNumber, message);
    } else if (message.includes('图片') || message.includes('生图')) {
      const match = message.match(/(\d+\.\d+)/);
      const sceneNumber = match ? match[1] : '1.1';
      await generateImages(sceneNumber, message);
    }
  };

  // 生成剧本
  const generateScript = async (prompt: string) => {
    try {
      const response = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement: prompt }),
      });

      const data = await response.json();
      if (data.success) {
        addContent('script', '剧本', data.script);
      }
    } catch (error) {
      console.error('生成剧本失败:', error);
    }
  };

  // 生成分镜
  const generateStoryboard = async (sceneNumber: string, prompt: string) => {
    try {
      // 构造正确的剧本格式
      const mockScript = {
        title: '自定义分镜',
        genre: '剧情',
        logline: prompt,
        summary: prompt,
        emotionalArc: '平静→紧张→高潮→解决',
        targetAudience: '大众',
        visualStyle: '写实风格',
        scenes: [
          {
            sceneNumber: 1,
            location: '未知场景',
            timeOfDay: '白天',
            mood: '紧张',
            characters: ['人物A'],
            action: prompt,
            dialogue: '',
            emotionalBeat: '情感节拍',
            visualHook: '视觉钩子',
            duration: '5秒',
          }
        ],
      };

      const response = await fetch('/api/storyboard/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: mockScript, // 直接传递对象，不是字符串
          artStyle: '写实风格',
        }),
      });

      const data = await response.json();
      if (data.success) {
        const subNumber = updateSubNumber(sceneNumber);
        addContent('storyboard', `分镜 ${subNumber}`, data.storyboard);
      } else {
        console.error('生成分镜失败:', data.error);
        alert(`生成分镜失败: ${data.error}`);
      }
    } catch (error) {
      console.error('生成分镜失败:', error);
      alert('生成分镜失败，请稍后重试');
    }
  };

  // 生成图片
  const generateImages = async (sceneNumber: string, prompt: string) => {
    try {
      // 构造正确的分镜格式
      const mockStoryboard = {
        artStyle: '写实风格',
        aspectRatio: '9:16',
        cameraStyle: '固定镜头为主，偶尔推镜头',
        lightingStyle: '自然光',
        scenes: [
          {
            sceneNumber: 1,
            shotType: '中景',
            cameraAngle: '平视',
            cameraMovement: '固定',
            focalLength: '标准',
            depthOfField: '中景深',
            composition: '三分法',
            characterPosition: '画面中央',
            lighting: '自然光',
            colorTemperature: '中性',
            mood: '平静',
            transition: '切',
            prompt: prompt, // 用户输入的提示词
            videoPrompt: prompt,
          }
        ],
      };

      const response = await fetch('/api/keyframes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyboard: mockStoryboard, // 直接传递对象，不是字符串
          artStyle: '写实风格',
          characterImages: [],
        }),
      });

      const data = await response.json();
      if (data.success && data.keyframes) {
        const images = data.keyframes.map((kf: any) => kf.imageUrl).filter(Boolean);
        const subNumber = updateSubNumber(sceneNumber);
        addContent('image', `图片 ${subNumber}`, {}, images);
      } else {
        console.error('生成图片失败:', data.error);
        alert(`生成图片失败: ${data.error}`);
      }
    } catch (error) {
      console.error('生成图片失败:', error);
      alert('生成图片失败，请稍后重试');
    }
  };

  // 处理选择
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 框选处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.target !== canvasRef.current) return;
    setIsSelectMode(true);
    const rect = canvasRef.current!.getBoundingClientRect();
    setSelectionBox({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelectMode || !selectionBox) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    setSelectionBox({
      x: Math.min(selectionBox.x, currentX),
      y: Math.min(selectionBox.y, currentY),
      width: Math.abs(currentX - selectionBox.x),
      height: Math.abs(currentY - selectionBox.y),
    });
  };

  const handleMouseUp = () => {
    if (!isSelectMode || !selectionBox) return;
    setIsSelectMode(false);

    // 检查哪些卡片在框选区域内
    const selectedInBox = items.filter(item => {
      const itemRight = item.position.x + item.size.width;
      const itemBottom = item.position.y + item.size.height;
      const boxRight = selectionBox.x + selectionBox.width;
      const boxBottom = selectionBox.y + selectionBox.height;

      return (
        item.position.x < boxRight &&
        itemRight > selectionBox.x &&
        item.position.y < boxBottom &&
        itemBottom > selectionBox.y
      );
    });

    setSelectedIds(new Set(selectedInBox.map(item => item.id)));
    setSelectionBox(null);
  };

  // 批量操作
  const handleBatchAction = async (action: 'save' | 'download' | 'delete' | 'regenerate') => {
    const selectedItems = items.filter(item => selectedIds.has(item.id));

    switch (action) {
      case 'delete':
        setItems(prev => prev.filter(item => !selectedIds.has(item.id)));
        setSelectedIds(new Set());
        break;
      case 'save':
        alert(`已保存 ${selectedItems.length} 个项目到存储`);
        break;
      case 'download':
        alert(`正在打包下载 ${selectedItems.length} 个项目...`);
        break;
      case 'regenerate':
        alert(`正在重新生成 ${selectedItems.length} 个项目...`);
        break;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* 顶部工具栏 */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🎬</span>
          <h1 className="text-white font-bold text-lg">AI 视频创作画布</h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>AI 已就绪</span>
          </div>
          <div>内容数量: <span className="text-white font-medium">{items.length}</span></div>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 relative overflow-hidden">
        <CanvasArea
          ref={canvasRef}
          items={items}
          setItems={setItems}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          selectionBox={selectionBox}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {/* 批量操作栏 */}
      {selectedIds.size > 0 && (
        <BatchActionBar
          count={selectedIds.size}
          onAction={handleBatchAction}
        />
      )}

      {/* 底部AI输入框 */}
      <ChatInput onSendMessage={handleAiMessage} />
    </div>
  );
}
