import React, { useMemo } from 'react';
import {
  ArrowLeftRight,
  Maximize2,
  Move,
  RotateCw,
  Ruler,
  Trash2,
} from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { computeWallClearances, computeWallSegments } from '../../utils/geometry';

export const RightInspector: React.FC = () => {
  const editorMode = useRoomStore((s) => s.editorMode);
  const selectedFurnitureId = useRoomStore((s) => s.selectedFurnitureId);
  const furnitures = useRoomStore((s) => s.furnitures);
  const updateFurniture = useRoomStore((s) => s.updateFurniture);
  const updateFurnitureDimensions = useRoomStore((s) => s.updateFurnitureDimensions);
  const updateFurniturePosition = useRoomStore((s) => s.updateFurniturePosition);
  const updateFurnitureRotation = useRoomStore((s) => s.updateFurnitureRotation);
  const removeFurniture = useRoomStore((s) => s.removeFurniture);

  const room = useRoomStore((s) => s.room);
  const selectedVertexIndex = useRoomStore((s) => s.selectedVertexIndex);
  const updateVertexPosition = useRoomStore((s) => s.updateVertexPosition);
  const removeVertex = useRoomStore((s) => s.removeVertex);
  const updateWallSegmentLength = useRoomStore((s) => s.updateWallSegmentLength);

  const measurements = useRoomStore((s) => s.measurements);
  const removeMeasurement = useRoomStore((s) => s.removeMeasurement);
  const clearMeasurements = useRoomStore((s) => s.clearMeasurements);

  const selectedItem = useMemo(
    () => furnitures.find((f) => f.id === selectedFurnitureId) ?? null,
    [furnitures, selectedFurnitureId]
  );

  const wallSegments = useMemo(
    () => computeWallSegments(room.vertices),
    [room.vertices]
  );

  const clearances = useMemo(() => {
    if (!selectedItem) return [];
    return computeWallClearances(selectedItem, room.vertices);
  }, [selectedItem, room.vertices]);

  // 壁までの目標距離を入力して家具の位置を前後にシフトさせる処理
  const handleClearanceAdjustment = (direction: string, targetDistMm: number) => {
    if (!selectedItem) return;
    const current = clearances.find((c) => c.direction === direction);
    if (!current) return;
    const diff = targetDistMm - current.distanceMm;

    // 現在の家具の向きに応じてワールド座標をシフト
    const radY = (selectedItem.rotation.y * Math.PI) / 180;
    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);

    let localShiftX = 0;
    let localShiftZ = 0;
    if (direction === 'front') localShiftZ = -diff;
    else if (direction === 'back') localShiftZ = diff;
    else if (direction === 'right') localShiftX = -diff;
    else if (direction === 'left') localShiftX = diff;

    const worldShiftX = localShiftX * cosY + localShiftZ * sinY;
    const worldShiftZ = -localShiftX * sinY + localShiftZ * cosY;

    updateFurniturePosition(selectedItem.id, {
      x: Math.round(selectedItem.position.x + worldShiftX),
      z: Math.round(selectedItem.position.z + worldShiftZ),
    });
  };

  return (
    <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col shrink-0 z-10 overflow-hidden text-xs">
      <div className="h-10 border-b border-slate-800 bg-slate-950/60 px-3 flex items-center justify-between font-bold text-slate-300">
        <span>
          {editorMode === 'furniture' && '家具プロパティ・寸法調整'}
          {editorMode === 'room_edit' && '部屋・壁寸法インスペクター'}
          {editorMode === 'measure' && '長さ測定リスト'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 1. 家具モード時 */}
        {editorMode === 'furniture' && (
          <>
            {selectedItem ? (
              <div className="space-y-4">
                {/* 家具基本情報 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      基本情報
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFurniture(selectedItem.id)}
                      className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      削除
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">家具名称</label>
                      <input
                        type="text"
                        value={selectedItem.name}
                        onChange={(e) =>
                          updateFurniture(selectedItem.id, { name: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">カラー設定</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedItem.color}
                          onChange={(e) =>
                            updateFurniture(selectedItem.id, { color: e.target.value })
                          }
                          className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                        <span className="font-mono text-slate-300">{selectedItem.color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 家具寸法（幅・奥行き・高さ） */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                    家具の寸法 (mm)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">幅 (W)</label>
                      <input
                        type="number"
                        step={10}
                        min={50}
                        value={selectedItem.dimensions.width}
                        onChange={(e) =>
                          updateFurnitureDimensions(selectedItem.id, {
                            width: Math.max(50, Number(e.target.value)),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-center focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">奥行 (D)</label>
                      <input
                        type="number"
                        step={10}
                        min={50}
                        value={selectedItem.dimensions.depth}
                        onChange={(e) =>
                          updateFurnitureDimensions(selectedItem.id, {
                            depth: Math.max(50, Number(e.target.value)),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-center focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">高さ (H)</label>
                      <input
                        type="number"
                        step={10}
                        min={10}
                        value={selectedItem.dimensions.height}
                        onChange={(e) =>
                          updateFurnitureDimensions(selectedItem.id, {
                            height: Math.max(10, Number(e.target.value)),
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-center focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 周囲の壁までの寸法（クリアランス）と直接位置微調整 */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1 mb-1 text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    壁との寸法・隙間微調整
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                    家具から各壁面までの距離です。数値を変更して壁からの間隔を微調整できます。
                  </p>
                  <div className="space-y-1.5">
                    {clearances.map((c) => (
                      <div
                        key={c.direction}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-700"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded bg-cyan-950 text-cyan-300 font-bold flex items-center justify-center text-[10px] border border-cyan-500/40">
                            {c.label}
                          </span>
                          <span className="text-slate-300">壁までの距離:</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step={10}
                            min={0}
                            value={c.distanceMm}
                            onChange={(e) =>
                              handleClearanceAdjustment(c.direction, Number(e.target.value))
                            }
                            className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-right font-mono text-cyan-200 focus:outline-none focus:border-cyan-400 text-xs"
                          />
                          <span className="text-[10px] text-slate-400">mm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 配置座標・回転 */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div>
                    <div className="flex items-center gap-1 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <Move className="w-3.5 h-3.5" />
                      配置座標 (X, Y, Z)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">X</label>
                        <input
                          type="number"
                          step={10}
                          value={selectedItem.position.x}
                          onChange={(e) =>
                            updateFurniturePosition(selectedItem.id, {
                              x: Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-center focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">
                          Y (高さ)
                        </label>
                        <input
                          type="number"
                          step={10}
                          min={0}
                          value={selectedItem.position.y}
                          onChange={(e) =>
                            updateFurniturePosition(selectedItem.id, {
                              y: Math.max(0, Number(e.target.value)),
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-center focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Z</label>
                        <input
                          type="number"
                          step={10}
                          value={selectedItem.position.z}
                          onChange={(e) =>
                            updateFurniturePosition(selectedItem.id, {
                              z: Number(e.target.value),
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-center focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <RotateCw className="w-3.5 h-3.5" />
                      回転角 (Y軸度数)
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={selectedItem.rotation.y}
                        onChange={(e) =>
                          updateFurnitureRotation(selectedItem.id, {
                            y: Number(e.target.value),
                          })
                        }
                        className="flex-1 accent-sky-500"
                      />
                      <div className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-white text-xs">
                        {selectedItem.rotation.y}°
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 space-y-2">
                <p>3Dビューで家具をクリックして選択すると、寸法や壁からの間隔を編集できます</p>
              </div>
            )}
          </>
        )}

        {/* 2. 部屋編集モード時 */}
        {editorMode === 'room_edit' && (
          <div className="space-y-4">
            {/* 各壁一辺の寸法一覧 */}
            <div>
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-2">
                各壁一辺の寸法一覧
              </span>
              <div className="space-y-1.5">
                {wallSegments.map((seg) => (
                  <div
                    key={seg.index}
                    className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-200">壁 {seg.index + 1}:</span>
                      {seg.isRightAngle && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                          ∟ 90°直角
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={10}
                        min={100}
                        value={seg.lengthMm}
                        onChange={(e) =>
                          updateWallSegmentLength(seg.index, Number(e.target.value))
                        }
                        className="w-16 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-right font-mono text-white text-xs"
                      />
                      <span className="text-[10px] text-slate-400">mm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 選択中の頂点 */}
            {selectedVertexIndex !== null && selectedVertexIndex < room.vertices.length && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-orange-400">
                    選択中の頂点 #{selectedVertexIndex + 1}
                  </span>
                  {room.vertices.length > 3 && (
                    <button
                      type="button"
                      onClick={() => removeVertex(selectedVertexIndex)}
                      className="text-red-400 hover:text-red-300 text-[11px] flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      頂点を削除
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">X 座標</label>
                    <input
                      type="number"
                      step={10}
                      value={room.vertices[selectedVertexIndex].x}
                      onChange={(e) =>
                        updateVertexPosition(selectedVertexIndex, {
                          x: Number(e.target.value),
                          z: room.vertices[selectedVertexIndex].z,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Z 座標</label>
                    <input
                      type="number"
                      step={10}
                      value={room.vertices[selectedVertexIndex].z}
                      onChange={(e) =>
                        updateVertexPosition(selectedVertexIndex, {
                          x: room.vertices[selectedVertexIndex].x,
                          z: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-white text-center"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. 測定モード時 */}
        {editorMode === 'measure' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                測定結果リスト ({measurements.length})
              </span>
              {measurements.length > 0 && (
                <button
                  type="button"
                  onClick={clearMeasurements}
                  className="text-red-400 hover:text-red-300 text-[11px]"
                >
                  すべて消去
                </button>
              )}
            </div>

            {measurements.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                3D空間上の任意の2点をクリックすると長さが測定されます
              </p>
            ) : (
              <div className="space-y-2">
                {measurements.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-lg bg-slate-800/80 border border-rose-900/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <Ruler className="w-3.5 h-3.5" />
                        <span>測定 #{idx + 1}</span>
                      </div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {m.distanceMm.toLocaleString()} mm
                        <span className="text-xs text-slate-400 font-normal ml-1">
                          ({(m.distanceMm / 10).toFixed(1)} cm)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMeasurement(m.id)}
                      className="p-1 hover:text-red-400 text-slate-500"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
