import React from 'react';
import { HeaderToolbar } from './components/ui/HeaderToolbar';
import { LeftSidebar } from './components/ui/LeftSidebar';
import { RightInspector } from './components/ui/RightInspector';
import { SceneCanvas } from './components/canvas/SceneCanvas';

export const App: React.FC = () => {
  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* 上部ヘッダー・ツールバー */}
      <HeaderToolbar />

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
    </div>
  );
};

export default App;
