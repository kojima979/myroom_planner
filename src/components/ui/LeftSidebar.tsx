import React, { useEffect, useRef, useState } from 'react';
import {
  Armchair,
  Bed,
  Box,
  Compass,
  CookingPot,
  Copy,
  CornerDownRight,
  DoorOpen,
  FolderPlus,
  Layers,
  Magnet,
  Maximize2,
  Plus,
  Refrigerator,
  RotateCw,
  SquarePen,
  Trash2,
  Tv,
  Utensils,
} from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { FURNITURE_PRESETS } from '../../constants/presets';
import { FurniturePresetType } from '../../types/room';
import { readModelFileAsDataUrl } from '../../utils/fileIo';
import { NumericInput } from './NumericInput';

export const LeftSidebar: React.FC = () => {
  const room = useRoomStore((s) => s.room);
  const updateRoomConfig = useRoomStore((s) => s.updateRoomConfig);
  const setNorthAngleDeg = useRoomStore((s) => s.setNorthAngleDeg);
  const setRectangularRoomDimensions = useRoomStore((s) => s.setRectangularRoomDimensions);
  const setLShapedRoomPreset = useRoomStore((s) => s.setLShapedRoomPreset);
  const furnitures = useRoomStore((s) => s.furnitures);
  const selectedFurnitureId = useRoomStore((s) => s.selectedFurnitureId);
  const selectFurniture = useRoomStore((s) => s.selectFurniture);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);
  const duplicateFurniture = useRoomStore((s) => s.duplicateFurniture);
  const addPresetFurniture = useRoomStore((s) => s.addPresetFurniture);
  const addCustomModelFurniture = useRoomStore((s) => s.addCustomModelFurniture);
  const editorMode = useRoomStore((s) => s.editorMode);

  const [activeTab, setActiveTab] = useState<'presets' | 'room' | 'list'>('presets');
  const [rectWidth, setRectWidth] = useState(3600);
  const [rectDepth, setRectDepth] = useState(2700);

  // モードに応じて適切なタブへ自動連動
  useEffect(() => {
    if (editorMode === 'room_edit') {
      setActiveTab('room');
    } else if (activeTab === 'room') {
      setActiveTab('presets');
    }
  }, [editorMode]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleModelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, format } = await readModelFileAsDataUrl(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      addCustomModelFurniture(nameWithoutExt, dataUrl, format);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '読み込み失敗';
      window.alert(msg);
    } finally {
      e.target.value = '';
    }
  };

  const getPresetIcon = (type: FurniturePresetType) => {
    switch (type) {
      case 'bed':
        return <Bed className="w-4 h-4 text-sky-400" />;
      case 'desk':
        return <Maximize2 className="w-4 h-4 text-amber-400" />;
      case 'chair':
        return <Armchair className="w-4 h-4 text-indigo-400" />;
      case 'sofa':
        return <Layers className="w-4 h-4 text-emerald-400" />;
      case 'bookshelf':
        return <Box className="w-4 h-4 text-yellow-500" />;
      case 'carpet':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'refrigerator':
        return <Refrigerator className="w-4 h-4 text-blue-300" />;
      case 'kitchen':
        return <CookingPot className="w-4 h-4 text-teal-400" />;
      case 'tv':
        return <Tv className="w-4 h-4 text-violet-400" />;
      case 'bean_table':
        return <Utensils className="w-4 h-4 text-amber-500" />;
      case 'window':
        return <Maximize2 className="w-4 h-4 text-cyan-400" />;
      case 'door':
        return <DoorOpen className="w-4 h-4 text-orange-400" />;
      default:
        return <Box className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 z-10 overflow-hidden">
      {/* タブナビゲーション */}
      {editorMode === 'room_edit' ? (
        <div className="h-10 border-b border-slate-800 bg-slate-950/60 px-3 flex items-center justify-between font-bold text-amber-400 shrink-0">
          <span className="flex items-center gap-1.5 text-xs">
            <SquarePen className="w-4 h-4 text-amber-400" />
            部屋設定・形状
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            プリセット / 天井高 / 床色
          </span>
        </div>
      ) : (
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'presets'
                ? 'bg-slate-800 text-sky-400 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            家具追加
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
              activeTab === 'list'
                ? 'bg-slate-800 text-slate-200 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            配置一覧 ({furnitures.length})
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
        {/* 1. 部屋形状・壁寸法編集画面時: 部屋設定のみを表示 */}
        {editorMode === 'room_edit' ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                部屋の基本形状プリセット
              </h2>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">四角形の部屋</span>
                    <button
                      type="button"
                      onClick={() => setRectangularRoomDimensions(rectWidth, rectDepth)}
                      className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px]"
                    >
                      適用
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">幅 (X)</label>
                      <div className="flex items-center bg-slate-900 rounded border border-slate-700 px-1.5 py-1">
                        <NumericInput
                          step={50}
                          min={20}
                          value={rectWidth}
                          onChange={(val) => setRectWidth(val)}
                          className="w-full bg-transparent text-white focus:outline-none text-xs"
                        />
                        <span className="text-[10px] text-slate-500">mm</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">奥行 (Z)</label>
                      <div className="flex items-center bg-slate-900 rounded border border-slate-700 px-1.5 py-1">
                        <NumericInput
                          step={50}
                          min={20}
                          value={rectDepth}
                          onChange={(val) => setRectDepth(val)}
                          className="w-full bg-transparent text-white focus:outline-none text-xs"
                        />
                        <span className="text-[10px] text-slate-500">mm</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={setLShapedRoomPreset}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-left font-medium text-slate-200 hover:text-white flex items-center justify-between"
                >
                  <span>L字型の部屋プリセット</span>
                  <span className="text-amber-400 text-xs font-bold">適用</span>
                </button>
              </div>
            </div>

            {/* 部屋形状編集の操作案内 */}
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200">
              <span className="font-semibold block mb-1">📐 多角形・壁寸法の自由編集</span>
              <p className="text-[10px] text-amber-300/80 leading-relaxed">
                2D/3D画面上のオレンジ頂点をドラッグして移動（90°直角スナップ）、各壁の「＋頂点追加」、または右パネルの壁寸法入力で自由に寸法を変更できます。
              </p>
            </div>

            {/* 寸法・オプション */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">天井の高さ</label>
                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2 py-1">
                  <NumericInput
                    step={50}
                    min={10}
                    max={20000}
                    value={room.wallHeight}
                    onChange={(val) => updateRoomConfig({ wallHeight: val })}
                    className="w-full bg-transparent text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">mm</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">床の色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={room.floorColor}
                    onChange={(e) => updateRoomConfig({ floorColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                  <span className="text-slate-300 font-mono text-[11px]">{room.floorColor}</span>
                </div>
              </div>

              {/* 部屋の方位（北方向） */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 flex items-center gap-1.5 text-[11px] font-semibold">
                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                    北方向（方位）
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sky-400 font-mono text-xs font-bold">
                      {room.northAngleDeg ?? 0}°
                    </span>
                    <button
                      type="button"
                      onClick={() => setNorthAngleDeg((room.northAngleDeg ?? 0) + 90)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
                      title="時計回りに90°回転"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 4方位クイックボタン */}
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '北 (上)', deg: 0 },
                    { label: '東 (右)', deg: 90 },
                    { label: '南 (下)', deg: 180 },
                    { label: '西 (左)', deg: 270 },
                  ].map((dir) => (
                    <button
                      key={dir.deg}
                      type="button"
                      onClick={() => setNorthAngleDeg(dir.deg)}
                      className={`py-1 px-1 rounded text-[10px] font-semibold text-center transition-colors ${
                        (room.northAngleDeg ?? 0) === dir.deg
                          ? 'bg-sky-600 text-white shadow'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {dir.label}
                    </button>
                  ))}
                </div>

                {/* 角度スライダー */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="range"
                    min={0}
                    max={355}
                    step={5}
                    value={room.northAngleDeg ?? 0}
                    onChange={(e) => setNorthAngleDeg(Number(e.target.value))}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Magnet className="w-3.5 h-3.5 text-emerald-400" />
                  壁の直角スナップ
                </span>
                <input
                  type="checkbox"
                  checked={room.enableRightAngleSnap}
                  onChange={(e) => updateRoomConfig({ enableRightAngleSnap: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />
                  直角マーク表示 (∟90°)
                </span>
                <input
                  type="checkbox"
                  checked={room.showRightAngleMarks ?? false}
                  onChange={(e) => updateRoomConfig({ showRightAngleMarks: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
              </div>

              <div className="pt-1">
                <label className="text-[10px] text-slate-400 block mb-0.5">
                  干渉警告ポップアップ表示時間（0で非表示）
                </label>
                <div className="flex items-center bg-slate-800 rounded border border-slate-700 px-2 py-1">
                  <NumericInput
                    step={1}
                    min={0}
                    max={300}
                    value={room.collisionWarningDurationSec ?? 2}
                    onChange={(val) =>
                      updateRoomConfig({ collisionWarningDurationSec: val })
                    }
                    className="w-full bg-transparent text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">秒</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 2. 家具配置・移動モード（または測定モード）時: 家具追加と配置一覧のタブのみ表示 */
          <>
            {activeTab === 'presets' && (
              <>
                <div>
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    プリセット家具・建具
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {FURNITURE_PRESETS.map((preset) => (
                      <button
                        key={preset.presetType}
                        type="button"
                        onClick={() => addPresetFurniture(preset.presetType)}
                        className="flex flex-col items-start p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          {getPresetIcon(preset.presetType)}
                          <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400" />
                        </div>
                        <span className="font-semibold text-slate-200 group-hover:text-white text-xs">
                          {preset.label}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {preset.defaultDimensions.width}×{preset.defaultDimensions.depth}
                        </span>
                        {preset.allowOverlap && (
                          <span className="mt-1 text-[9px] px-1 py-0.2 rounded bg-purple-900/70 text-purple-200 border border-purple-500/40">
                            重ね置き可
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3Dモデルインポート */}
                <div className="pt-2 border-t border-slate-800">
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    外部3Dモデル読込
                  </h2>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 border-2 border-dashed border-slate-700 hover:border-sky-400 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 cursor-pointer flex flex-col items-center justify-center text-center transition-colors"
                  >
                    <FolderPlus className="w-6 h-6 text-sky-400 mb-1" />
                    <span className="font-medium text-slate-200 text-xs">
                      .glb / .gltf / .obj を追加
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      クリックしてファイルを選択
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".glb,.gltf,.obj"
                      onChange={handleModelFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </>
            )}

            {activeTab === 'list' && (
              <div className="space-y-1.5">
                {furnitures.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">配置された家具はありません</p>
                ) : (
                  furnitures.map((f) => {
                    const isSelected = f.id === selectedFurnitureId;
                    return (
                      <div
                        key={f.id}
                        onClick={() => selectFurniture(f.id)}
                        className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-950/80 border-sky-400 text-white'
                            : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                            style={{ backgroundColor: f.color }}
                          />
                          <div className="truncate">
                            <div className="font-semibold truncate text-xs">{f.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {f.dimensions.width}×{f.dimensions.depth}×{f.dimensions.height}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateFurniture(f.id);
                            }}
                            className="p-1 hover:text-sky-300 text-slate-400 rounded"
                            title="複製"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFurniture(f.id);
                            }}
                            className="p-1 hover:text-red-400 text-slate-400 rounded"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
