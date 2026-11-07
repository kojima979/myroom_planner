import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { PrintFloorPlan2D } from './PrintFloorPlan2D';
import { FurnitureSizeTable } from './FurnitureSizeTable';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const PrintModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const room = useRoomStore((s) => s.room);
  const furnitures = useRoomStore((s) => s.furnitures);
  const measurements = useRoomStore((s) => s.measurements);

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* モーダルヘッダー */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white">
              2D平面図・家具寸法一覧 印刷プレビュー
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              印刷 / PDFとして保存
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 印刷対象プレビューエリア（紙面レイアウト） */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div
            id="print-section"
            ref={printAreaRef}
            className="bg-white text-slate-900 p-8 rounded-lg shadow-xl max-w-3xl mx-auto border border-slate-200"
          >
            {/* 図面タイトルヘッダー */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-end justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Room Layout Plan & Dimension Sheet
                </span>
                <h1 className="text-xl font-bold tracking-tight text-slate-950">
                  部屋レイアウト図面・家具寸法表
                </h1>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <div>天井高: {room.wallHeight.toLocaleString()} mm</div>
                <div>壁厚: {room.wallThickness} mm</div>
                <div>出力日: {new Date().toLocaleDateString('ja-JP')}</div>
              </div>
            </div>

            {/* クッキリした2D平面図 (ベクターSVG) */}
            <div className="mb-4">
              <PrintFloorPlan2D
                vertices={room.vertices}
                furnitures={furnitures}
                measurements={measurements}
                wallThickness={room.wallThickness}
              />
            </div>

            {/* 配置オブジェクト・家具サイズ一覧表 */}
            <FurnitureSizeTable furnitures={furnitures} />

            {/* フッター */}
            <div className="mt-6 pt-3 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-400">
              <span>MyRoom Planner - 3D部屋・家具配置シミュレーター</span>
              <span>A4印刷最適化レイアウト</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
