'use client';

interface BatchActionBarProps {
  count: number;
  onAction: (action: 'save' | 'download' | 'delete' | 'regenerate') => void;
}

export default function BatchActionBar({ count, onAction }: BatchActionBarProps) {
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
        {/* 选中数量 */}
        <div className="text-white font-medium">
          已选 <span className="text-blue-400 font-bold">{count}</span> 项
        </div>

        <div className="w-px h-6 bg-gray-600" />

        {/* 批量操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAction('save')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
          >
            <span>💾</span>
            <span>保存</span>
          </button>

          <button
            onClick={() => onAction('download')}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
          >
            <span>📦</span>
            <span>打包下载</span>
          </button>

          <button
            onClick={() => onAction('regenerate')}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
          >
            <span>🔄</span>
            <span>重新生成</span>
          </button>

          <button
            onClick={() => onAction('delete')}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95"
          >
            <span>🗑️</span>
            <span>删除</span>
          </button>
        </div>
      </div>
    </div>
  );
}
