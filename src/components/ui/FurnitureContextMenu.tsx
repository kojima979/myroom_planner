import React, { useEffect, useRef } from 'react';
import { Copy, Move, RotateCw, Trash2 } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';

/**
 * 家具オブジェクトをマウス右クリックした際に表示されるコンテキストメニュー
 * 「回転モードへ移行」「複製」「削除」をワンクリックで実行可能
 */
export const FurnitureContextMenu: React.FC = () => {
  const contextMenu = useRoomStore((s) => s.furnitureContextMenu);
  const closeContextMenu = useRoomStore((s) => s.closeFurnitureContextMenu);
  const furnitures = useRoomStore((s) => s.furnitures);
  const gizmoMode = useRoomStore((s) => s.gizmoMode);
  const setGizmoMode = useRoomStore((s) => s.setGizmoMode);
  const duplicateFurniture = useRoomStore((s) => s.duplicateFurniture);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);
  const selectFurniture = useRoomStore((s) => s.selectFurniture);

  const menuRef = useRef<HTMLDivElement>(null);

  // Escキーまたは外側クリックで閉じる
  useEffect(() => {
    if (!contextMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu, closeContextMenu]);

  if (!contextMenu) return null;

  const targetItem = furnitures.find((f) => f.id === contextMenu.furnitureId);
  if (!targetItem) return null;

  // 画面端からはみ出さないよう座標を補正
  const menuWidth = 190;
  const menuHeight = 160;
  const adjustedX = Math.max(10, Math.min(contextMenu.x, window.innerWidth - menuWidth - 10));
  const adjustedY = Math.max(10, Math.min(contextMenu.y, window.innerHeight - menuHeight - 10));

  const isRotateMode = gizmoMode === 'rotate';

  const handleToggleGizmoMode = () => {
    selectFurniture(targetItem.id);
    setGizmoMode(isRotateMode ? 'translate' : 'rotate');
    closeContextMenu();
  };

  const handleDuplicate = () => {
    duplicateFurniture(targetItem.id);
    closeContextMenu();
  };

  const handleDelete = () => {
    removeFurniture(targetItem.id);
    closeContextMenu();
  };

  return (
    <>
      {/* メニュー外クリック検知用の透明バックドロップ */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={closeContextMenu}
        onContextMenu={(e) => {
          e.preventDefault();
          closeContextMenu();
        }}
      />

      {/* コンテキストメニュー本体 */}
      <div
        ref={menuRef}
        style={{ left: adjustedX, top: adjustedY }}
        className="fixed z-50 w-48 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-1 text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
      >
        {/* ヘッダー: 対象家具名 */}
        <div className="px-2.5 py-1.5 border-b border-slate-800 text-[11px] text-slate-400 font-semibold truncate flex items-center justify-between">
          <span className="truncate">{targetItem.name}</span>
          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
            右クリック
          </span>
        </div>

        <div className="py-1 space-y-0.5 text-xs">
          {/* 1. 回転/移動モード移行 */}
          <button
            type="button"
            onClick={handleToggleGizmoMode}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              {isRotateMode ? (
                <>
                  <Move className="w-3.5 h-3.5 text-sky-400" />
                  <span>移動モードへ移行</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>回転モードへ移行</span>
                </>
              )}
            </div>
            <kbd className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1 rounded border border-slate-700">
              G
            </kbd>
          </button>

          {/* 2. 複製 */}
          <button
            type="button"
            onClick={handleDuplicate}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-sky-400" />
              <span>複製</span>
            </div>
          </button>

          {/* 3. 削除 */}
          <button
            type="button"
            onClick={handleDelete}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              <span className="font-medium">削除</span>
            </div>
            <kbd className="text-[10px] font-mono text-red-400/80 bg-red-950/40 px-1 rounded border border-red-800/50">
              Del
            </kbd>
          </button>
        </div>
      </div>
    </>
  );
};
