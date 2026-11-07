import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Html, Line, TransformControls } from '@react-three/drei';
import { useRoomStore } from '../../store/useRoomStore';
import { computeCollidingFurnitureIds } from '../../utils/geometry';
import { FurnitureItem } from '../../types/room';
import { PresetGeometryRenderer } from './PresetGeometries';

const SingleFurnitureNode: React.FC<{
  item: FurnitureItem;
  isSelected: boolean;
  isColliding: boolean;
}> = ({ item, isSelected, isColliding }) => {
  const groupRef = useRef<THREE.Group>(null);
  const editorMode = useRoomStore((s) => s.editorMode);
  const gizmoMode = useRoomStore((s) => s.gizmoMode);
  const selectFurniture = useRoomStore((s) => s.selectFurniture);
  const updateFurniturePosition = useRoomStore((s) => s.updateFurniturePosition);
  const updateFurnitureRotation = useRoomStore((s) => s.updateFurnitureRotation);
  const setIsDraggingGizmo = useRoomStore((s) => s.setIsDraggingGizmo);
  const handleMeasurementClick = useRoomStore((s) => s.handleMeasurementClick);
  const setHoverMeasurementPoint = useRoomStore((s) => s.setHoverMeasurementPoint);

  const eulerRad = useMemo(
    () =>
      new THREE.Euler(
        (item.rotation.x * Math.PI) / 180,
        (item.rotation.y * Math.PI) / 180,
        (item.rotation.z * Math.PI) / 180
      ),
    [item.rotation.x, item.rotation.y, item.rotation.z]
  );

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (editorMode === 'measure') {
      handleMeasurementClick({
        x: e.point.x,
        y: e.point.y,
        z: e.point.z,
      });
    } else if (editorMode === 'furniture') {
      selectFurniture(item.id);
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (editorMode === 'measure') {
      e.stopPropagation();
      setHoverMeasurementPoint({
        x: e.point.x,
        y: e.point.y,
        z: e.point.z,
      });
    }
  };

  const { width: w, height: h, depth: d } = item.dimensions;

  return (
    <>
      <group
        ref={groupRef}
        position={[item.position.x, item.position.y, item.position.z]}
        rotation={eulerRad}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
      >
        <PresetGeometryRenderer
          item={item}
          isSelected={isSelected}
          isColliding={isColliding}
        />

        {/* 選択中または衝突時のバウンディングボックス枠線 */}
        {(isSelected || isColliding) && (
          <Line
            points={[
              [-w / 2, 2, -d / 2],
              [w / 2, 2, -d / 2],
              [w / 2, 2, d / 2],
              [-w / 2, 2, d / 2],
              [-w / 2, 2, -d / 2],
            ]}
            color={isColliding ? '#ef4444' : '#38bdf8'}
            lineWidth={2.5}
          />
        )}

        {/* 干渉（衝突）警告バッジ */}
        {isColliding && (
          <Html position={[0, h + 120, 0]} center zIndexRange={[40, 0]}>
            <div className="pointer-events-none select-none px-2 py-0.5 rounded bg-red-600/95 text-white text-[11px] font-bold border border-red-200 shadow-lg whitespace-nowrap">
              ⚠ 他の家具または壁と干渉しています
            </div>
          </Html>
        )}
      </group>

      {/* 選択中の家具に対する3D移動・回転ギズモ */}
      {isSelected && editorMode === 'furniture' && !item.locked && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={gizmoMode}
          size={0.85}
          onMouseDown={() => setIsDraggingGizmo(true)}
          onMouseUp={() => setIsDraggingGizmo(false)}
          onObjectChange={() => {
            if (!groupRef.current) return;
            if (gizmoMode === 'translate') {
              const pos = groupRef.current.position;
              const clampedY = Math.max(0, Math.round(pos.y / 10) * 10);
              pos.y = clampedY;
              updateFurniturePosition(item.id, {
                x: Math.round(pos.x / 10) * 10,
                y: clampedY,
                z: Math.round(pos.z / 10) * 10,
              });
            } else if (gizmoMode === 'rotate') {
              const rot = groupRef.current.rotation;
              const degY = Math.round(((rot.y * 180) / Math.PI) * 2) / 2;
              updateFurnitureRotation(item.id, {
                x: 0,
                y: degY,
                z: 0,
              });
            }
          }}
        />
      )}
    </>
  );
};

export const FurnitureLayer: React.FC = () => {
  const furnitures = useRoomStore((s) => s.furnitures);
  const roomVertices = useRoomStore((s) => s.room.vertices);
  const selectedFurnitureId = useRoomStore((s) => s.selectedFurnitureId);

  const collidingIds = useMemo(
    () => computeCollidingFurnitureIds(furnitures, roomVertices),
    [furnitures, roomVertices]
  );

  return (
    <group>
      {furnitures.map((item) => (
        <SingleFurnitureNode
          key={item.id}
          item={item}
          isSelected={item.id === selectedFurnitureId}
          isColliding={collidingIds.has(item.id)}
        />
      ))}
    </group>
  );
};
