import React from 'react';
import { createPortal } from 'react-dom';
import { Compass, Printer, RotateCw, X } from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { PrintFloorPlan2D } from './PrintFloorPlan2D';
import { FurnitureSizeTable } from './FurnitureSizeTable';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * 角度（0〜359°）から方位名（日本語）を算出する
 */
function getCompassDirectionName(deg: number): string {
  const normalized = ((Math.round(deg) % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return '北 (上)';
  if (normalized >= 22.5 && normalized < 67.5) return '北東 (右上)';
  if (normalized >= 67.5 && normalized < 112.5) return '東 (右)';
  if (normalized >= 112.5 && normalized < 157.5) return '南東 (右下)';
  if (normalized >= 157.5 && normalized < 202.5) return '南 (下)';
  if (normalized >= 202.5 && normalized < 247.5) return '南西 (左下)';
  if (normalized >= 247.5 && normalized < 292.5) return '西 (左)';
  return '北西 (左上)';
}

const QUICK_DIRECTIONS = [
  { label: '北', fullLabel: '北 (上)', deg: 0 },
  { label: '東', fullLabel: '東 (右)', deg: 90 },
  { label: '南', fullLabel: '南 (下)', deg: 180 },
  { label: '西', fullLabel: '西 (左)', deg: 270 },
];

export const PrintModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const room = useRoomStore((s) => s.room);
  const furnitures = useRoomStore((s) => s.furnitures);
  const measurements = useRoomStore((s) => s.measurements);
  const setNorthAngleDeg = useRoomStore((s) => s.setNorthAngleDeg);

  if (!isOpen) return null;

  const currentNorthDeg = room.northAngleDeg ?? 0;

  const handlePrint = () => {
    window.print();
  };

  const handleRotate90 = () => {
    setNorthAngleDeg(currentNorthDeg + 90);
  };

  return createPortal(
    <div
      id="print-portal-root"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="print-modal-window bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* モーダルヘッダー（画面操作用・印刷時は非表示） */}
        <div className="print-modal-header px-5 py-3.5 border-b border-slate-800 flex items-center justify-between shrink-0">
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

        {/* 印刷前コントロールバー: 北方向（方位）設定（画面操作用・印刷時は非表示） */}
        <div className="print-modal-header bg-slate-900/90 border-b border-slate-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-sky-950 border border-sky-800/80 text-sky-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-200">図面の北方向（方位）: </span>
              <span className="font-bold text-sky-400 font-mono ml-1">
                {currentNorthDeg}°
              </span>
              <span className="text-slate-400 text-[11px] ml-1.5">
                ({getCompassDirectionName(currentNorthDeg)})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* 4方位クイックボタン */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 gap-0.5">
              {QUICK_DIRECTIONS.map((dir) => (
                <button
                  key={dir.deg}
                  type="button"
                  onClick={() => setNorthAngleDeg(dir.deg)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${
                    currentNorthDeg === dir.deg
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {dir.label}
                </button>
              ))}
            </div>

            {/* +90°回転ボタン */}
            <button
              type="button"
              onClick={handleRotate90}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-[11px] flex items-center gap-1 transition-colors"
              title="時計回りに90°回転"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              +90°
            </button>

            {/* スライダーによる角度微調整 */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <input
                type="range"
                min={0}
                max={355}
                step={5}
                value={currentNorthDeg}
                onChange={(e) => setNorthAngleDeg(Number(e.target.value))}
                className="w-28 accent-sky-400 cursor-pointer"
                title="北方向の角度（0°〜355°）"
              />
            </div>
          </div>
        </div>

        {/* 印刷対象シート */}
        <div className="print-modal-body flex-1 overflow-y-auto p-6 bg-slate-950">
          <div
            id="print-section"
            className="bg-white text-slate-900 p-6 rounded-lg shadow-xl max-w-3xl mx-auto border border-slate-200"
          >
            {/* 図面タイトルヘッダー */}
            <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-end justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Room Layout Plan & Dimension Sheet
                </span>
                <h1 className="text-lg font-bold tracking-tight text-slate-950">
                  部屋レイアウト平面図・家具寸法一覧表
                </h1>
              </div>
              <div className="text-right text-[11px] text-slate-700 leading-snug">
                <div>
                  天井高: <strong>{room.wallHeight.toLocaleString()} mm</strong> / 壁厚:{' '}
                  <strong>{room.wallThickness} mm</strong>
                </div>
                <div>
                  方位: <strong>北 = {getCompassDirectionName(currentNorthDeg)} ({currentNorthDeg}°)</strong> / 出力日:{' '}
                  {new Date().toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>

            {/* 2D平面図 (ベクターSVG) */}
            <div>
              <PrintFloorPlan2D
                vertices={room.vertices}
                furnitures={furnitures}
                measurements={measurements}
                wallThickness={room.wallThickness}
                northAngleDeg={currentNorthDeg}
              />
              <div className="mt-1 flex items-center justify-end gap-4 text-[10px] text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-slate-900" /> 黒実線: 壁一辺の寸法
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-0.5 bg-sky-700" /> 青破線: 家具〜壁面間の最短距離（縦1・横1）
                </span>
              </div>
            </div>

            {/* 配置オブジェクト・家具サイズ一覧表 */}
            <FurnitureSizeTable furnitures={furnitures} />

            {/* フッター */}
            <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
              <span>MyRoom Planner - 3D部屋・家具配置シミュレーター</span>
              <span>単位: mm (ミリメートル)</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
