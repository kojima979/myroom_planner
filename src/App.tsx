import React, { useEffect, useState } from 'react';
import { HeaderToolbar } from './components/ui/HeaderToolbar';
import { LeftSidebar } from './components/ui/LeftSidebar';
import { RightInspector } from './components/ui/RightInspector';
import { SceneCanvas } from './components/canvas/SceneCanvas';
import { PrintModal } from './components/print/PrintModal';
import { FurnitureContextMenu } from './components/ui/FurnitureContextMenu';
import { useRoomStore } from './store/useRoomStore';

export const App: React.FC = () => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const selectedFurnitureId = useRoomStore((s) => s.selectedFurnitureId);
  const selectFurniture = useRoomStore((s) => s.selectFurniture);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);
  const selectVertex = useRoomStore((s) => s.selectVertex);
  const cancelPendingMeasurement = useRoomStore((s) => s.cancelPendingMeasurement);
  const closeFurnitureContextMenu = useRoomStore((s) => s.closeFurnitureContextMenu);
  const editorMode = useRoomStore((s) => s.editorMode);
  const setEditorMode = useRoomStore((s) => s.setEditorMode);
  const gizmoMode = useRoomStore((s) => s.gizmoMode);
  const setGizmoMode = useRoomStore((s) => s.setGizmoMode);
  const cameraMode = useRoomStore((s) => s.cameraMode);
  const setCameraMode = useRoomStore((s) => s.setCameraMode);

  // キーボードショートカットの登録
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // input, textarea, selectにフォーカスがある時はショートカットを発火させない
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // 印刷ショートカット (Cmd+P / Ctrl+P または Pキー)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPrintModalOpen(true);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFurnitureId && editorMode === 'furniture') {
          e.preventDefault();
          removeFurniture(selectedFurnitureId);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeFurnitureContextMenu();
        if (isPrintModalOpen) {
          setIsPrintModalOpen(false);
        } else {
          selectFurniture(null);
          selectVertex(null);
          cancelPendingMeasurement();
        }
      } else if (e.key === '1') {
        setEditorMode('furniture');
      } else if (e.key === '2') {
        setEditorMode('room_edit');
      } else if (e.key === '3') {
        setEditorMode('measure');
      } else if (e.key.toLowerCase() === 'g' && editorMode === 'furniture') {
        setGizmoMode(gizmoMode === 'translate' ? 'rotate' : 'translate');
      } else if (e.key.toLowerCase() === 'v') {
        setCameraMode(cameraMode === '3d' ? '2d' : '3d');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedFurnitureId,
    editorMode,
    gizmoMode,
    cameraMode,
    isPrintModalOpen,
    removeFurniture,
    selectFurniture,
    selectVertex,
    cancelPendingMeasurement,
    setEditorMode,
    setGizmoMode,
    setCameraMode,
  ]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* 上部ヘッダー・ツールバー */}
      <HeaderToolbar onOpenPrintModal={() => setIsPrintModalOpen(true)} />

      {/* メイン画面レイアウト */}
      <div className="flex flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden relative">
        {/* 左サイドバー: 部屋設定・家具追加・配置一覧 */}
        <LeftSidebar />

        {/* 中央3Dキャンバス: 部屋・家具・測定・壁クリアランス表示 */}
        <main className="flex-1 h-full relative overflow-hidden">
          <SceneCanvas />
        </main>

        {/* 右インスペクター: 選択中家具の詳細・寸法微調整・壁寸法一覧・測定リスト */}
        <RightInspector />
      </div>

      {/* 家具右クリックコンテキストメニュー（削除・複製・回転モード移行） */}
      <FurnitureContextMenu />

      {/* 印刷プレビュー＆出力モーダル */}
      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
};

export default App;
