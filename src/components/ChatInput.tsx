'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!message.trim()) return;
    onSendMessage(message);
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
