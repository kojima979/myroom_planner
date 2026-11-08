import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { useRoomStore } from '../../store/useRoomStore';
import { computeWallClearances } from '../../utils/geometry';

/**
 * 選択・配置中のオブジェクトの前後左右4側面から対面する壁面までの距離（クリアランス）を表示するコンポーネント
 * 座標軸（ギズモ）の中央操作を邪魔しないよう、床面近く・壁面寄りに配置し、ドラッグ移動中は半透明化する
 */
export const WallClearanceGuides: React.FC = () => {
  const roomVertices = useRoomStore((s) => s.room.vertices);
  const showDimensionLabels = useRoomStore((s) => s.room.showDimensionLabels ?? true);
  const furnitures = useRoomStore((s) => s.furnitures);
  const selectedFurnitureId = useRoomStore((s) => s.selectedFurnitureId);
  const editorMode = useRoomStore((s) => s.editorMode);
  const isDraggingGizmo = useRoomStore((s) => s.isDraggingGizmo);

  const selectedItem = useMemo(
    () => furnitures.find((f) => f.id === selectedFurnitureId) ?? null,
    [furnitures, selectedFurnitureId]
  );

  const clearances = useMemo(() => {
    if (!selectedItem || editorMode !== 'furniture' || !showDimensionLabels) return [];
    return computeWallClearances(selectedItem, roomVertices);
  }, [selectedItem, roomVertices, editorMode, showDimensionLabels]);

  if (!selectedItem || clearances.length === 0) {
    return null;
  }

  // ギズモの高さ（空中）と干渉しないよう、床面からわずかに浮かせた位置に配置
  const floorY = Math.max(8, selectedItem.position.y + 12);

  return (
    <group>
      {clearances.map((c) => {
        // ラベル位置を家具中央から離し、壁際（壁の手前約120mmまたは全体の75%）に配置することで、
        // 座標軸ギズモの中心や操作領域と絶対に重ならないようにする
        const wallOffsetMm = Math.min(120, c.distanceMm * 0.4);
        const ratio = c.distanceMm > 0 ? Math.max(0.6, (c.distanceMm - wallOffsetMm) / c.distanceMm) : 0.75;

        const labelX = c.fromPoint.x + (c.toWallPoint.x - c.fromPoint.x) * ratio;
        const labelZ = c.fromPoint.z + (c.toWallPoint.z - c.fromPoint.z) * ratio;

        // 距離が非常に小さい場合は警告色、通常時はシアンブルーで表示
        const lineColor = c.distanceMm < 50 ? '#f43f5e' : '#06b6d4';

        return (
          <group key={c.direction}>
            {/* オブジェクト側面から壁面までのガイドライン（床面近くを這わせる） */}
            <Line
              points={[
                [c.fromPoint.x, floorY, c.fromPoint.z],
                [c.toWallPoint.x, floorY, c.toWallPoint.z],
              ]}
              color={lineColor}
              lineWidth={2}
              dashed
              dashSize={45}
              gapSize={30}
              transparent
              opacity={isDraggingGizmo ? 0.45 : 0.85}
            />

            {/* 始点（オブジェクト側）と終点（壁面側）のドット */}
            <mesh position={[c.fromPoint.x, floorY, c.fromPoint.z]}>
              <sphereGeometry args={[18, 12, 12]} />
              <meshBasicMaterial color={lineColor} transparent opacity={isDraggingGizmo ? 0.45 : 0.85} />
            </mesh>
            <mesh position={[c.toWallPoint.x, floorY, c.toWallPoint.z]}>
              <sphereGeometry args={[22, 12, 12]} />
              <meshBasicMaterial color={lineColor} transparent opacity={isDraggingGizmo ? 0.45 : 0.85} />
            </mesh>

            {/* 壁との間の寸法ラベル（壁面寄りに配置・ドラッグ中は半透明で控えめに表示） */}
            <Html
              position={[labelX, floorY + 10, labelZ]}
              center
              zIndexRange={[25, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div
                className={`pointer-events-none select-none px-2 py-0.5 rounded shadow-md whitespace-nowrap flex items-center gap-1.5 transition-all duration-150 ${
                  isDraggingGizmo
                    ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-200/80 opacity-35 scale-90'
                    : 'bg-cyan-950/95 border border-cyan-400 text-cyan-100 opacity-95 shadow-cyan-950/40'
                }`}
              >
                <span className="text-[10px] font-semibold text-cyan-300">
                  [{c.label}壁]
                </span>
                <span className="text-xs font-bold font-mono tracking-tight">
                  {c.distanceMm.toLocaleString()}
                  <span className="text-[9px] font-normal text-cyan-300/80 ml-0.5">mm</span>
                </span>
                <span className="text-[10px] text-cyan-300/70 font-mono">
                  ({(c.distanceMm / 10).toFixed(1)}cm)
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
