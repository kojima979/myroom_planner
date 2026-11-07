import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { useRoomStore } from '../../store/useRoomStore';
import { computeWallClearances } from '../../utils/geometry';

/**
 * 選択・配置中のオブジェクトの前後左右4側面から対面する壁面までの距離（クリアランス）を常時表示するコンポーネント
 */
export const WallClearanceGuides: React.FC = () => {
  const roomVertices = useRoomStore((s) => s.room.vertices);
  const furnitures = useRoomStore((s) => s.furnitures);
  const selectedFurnitureId = useRoomStore((s) => s.selectedFurnitureId);
  const editorMode = useRoomStore((s) => s.editorMode);

  const selectedItem = useMemo(
    () => furnitures.find((f) => f.id === selectedFurnitureId) ?? null,
    [furnitures, selectedFurnitureId]
  );

  const clearances = useMemo(() => {
    if (!selectedItem || editorMode !== 'furniture') return [];
    return computeWallClearances(selectedItem, roomVertices);
  }, [selectedItem, roomVertices, editorMode]);

  if (!selectedItem || clearances.length === 0) {
    return null;
  }

  return (
    <group>
      {clearances.map((c) => {
        const midX = (c.fromPoint.x + c.toWallPoint.x) / 2;
        const midY = c.fromPoint.y;
        const midZ = (c.fromPoint.z + c.toWallPoint.z) / 2;

        // 距離が非常に小さい場合は警告色、通常時はシアンブルーで表示
        const lineColor = c.distanceMm < 50 ? '#f43f5e' : '#06b6d4';

        return (
          <group key={c.direction}>
            {/* オブジェクト側面から壁面までのガイドライン */}
            <Line
              points={[
                [c.fromPoint.x, c.fromPoint.y, c.fromPoint.z],
                [c.toWallPoint.x, c.toWallPoint.y, c.toWallPoint.z],
              ]}
              color={lineColor}
              lineWidth={2.5}
              dashed
              dashSize={50}
              gapSize={35}
            />

            {/* 始点（オブジェクト側）と終点（壁面側）のドット */}
            <mesh position={[c.fromPoint.x, c.fromPoint.y, c.fromPoint.z]}>
              <sphereGeometry args={[22, 12, 12]} />
              <meshBasicMaterial color={lineColor} />
            </mesh>
            <mesh position={[c.toWallPoint.x, c.toWallPoint.y, c.toWallPoint.z]}>
              <sphereGeometry args={[26, 12, 12]} />
              <meshBasicMaterial color={lineColor} />
            </mesh>

            {/* 壁との間の寸法ラベル（常時表示） */}
            <Html position={[midX, midY + 35, midZ]} center zIndexRange={[35, 0]}>
              <div className="pointer-events-none select-none px-2 py-0.5 rounded-md bg-cyan-950/95 text-cyan-200 border border-cyan-400/90 text-[11px] font-bold shadow-lg whitespace-nowrap flex items-center gap-1">
                <span className="text-cyan-400 text-[10px]">[{c.label}壁まで]</span>
                <span>{c.distanceMm.toLocaleString()} mm</span>
                <span className="text-[10px] text-cyan-300/80">
                  ({(c.distanceMm / 10).toFixed(1)} cm)
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
