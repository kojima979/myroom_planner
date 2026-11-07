import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { useRoomStore } from '../../store/useRoomStore';
import { computeWallSegments } from '../../utils/geometry';
import { WallSegmentInfo } from '../../types/room';

const WallSegmentMesh: React.FC<{
  segment: WallSegmentInfo;
  wallHeight: number;
  wallThickness: number;
  wallColor: string;
  wallVisibility: 'auto' | 'visible' | 'hidden';
  isRoomEditMode: boolean;
  showRightAngleMarks: boolean;
  onFloorOrWallPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onFloorOrWallClick: (e: ThreeEvent<MouseEvent>) => void;
}> = ({
  segment,
  wallHeight,
  wallThickness,
  wallColor,
  wallVisibility,
  isRoomEditMode,
  showRightAngleMarks,
  onFloorOrWallPointerMove,
  onFloorOrWallClick,
}) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  const dx = segment.end.x - segment.start.x;
  const dz = segment.end.z - segment.start.z;
  const angleY = -Math.atan2(dz, dx);

  // 壁は部屋の内面を基準にして外側へ厚みを持たせる
  const offsetX = -segment.normal.x * (wallThickness / 2);
  const offsetZ = -segment.normal.z * (wallThickness / 2);

  useFrame(({ camera }) => {
    if (!materialRef.current) return;
    if (wallVisibility === 'hidden') {
      materialRef.current.opacity = 0.08;
      materialRef.current.transparent = true;
      return;
    }
    if (wallVisibility === 'visible') {
      materialRef.current.opacity = 1.0;
      materialRef.current.transparent = false;
      return;
    }

    const camToWallX = segment.midPoint.x - camera.position.x;
    const camToWallZ = segment.midPoint.z - camera.position.z;
    const dot = camToWallX * segment.normal.x + camToWallZ * segment.normal.z;

    const shouldFade = dot > 0;
    const targetOpacity = shouldFade ? 0.16 : 0.95;
    materialRef.current.transparent = true;
    materialRef.current.opacity = THREE.MathUtils.lerp(
      materialRef.current.opacity,
      targetOpacity,
      0.15
    );
  });

  // 頂点クリックの邪魔にならないよう、壁の外側へオフセットして配置し、pointer-events-none（マウス透過）とする
  const labelOutwardDist = isRoomEditMode ? 240 : 140;
  const labelX = segment.midPoint.x - segment.normal.x * labelOutwardDist;
  const labelZ = segment.midPoint.z - segment.normal.z * labelOutwardDist;
  const labelY = isRoomEditMode ? 40 : Math.min(wallHeight + 80, 2500);

  return (
    <group>
      {/* 壁3Dメッシュ */}
      <mesh
        position={[
          segment.midPoint.x + offsetX,
          wallHeight / 2,
          segment.midPoint.z + offsetZ,
        ]}
        rotation={[0, angleY, 0]}
        receiveShadow
        onPointerMove={onFloorOrWallPointerMove}
        onClick={onFloorOrWallClick}
      >
        <boxGeometry args={[Math.max(10, segment.lengthMm), wallHeight, wallThickness]} />
        <meshStandardMaterial
          ref={materialRef}
          color={wallColor}
          roughness={0.85}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>

      {/* 壁の床面境界ライン */}
      <Line
        points={[
          [segment.start.x, 4, segment.start.z],
          [segment.end.x, 4, segment.end.z],
        ]}
        color={showRightAngleMarks && segment.isRightAngle ? '#10b981' : '#64748b'}
        lineWidth={showRightAngleMarks && segment.isRightAngle ? 2.5 : 2}
      />

      {/* 一辺の壁の寸法ラベル（常時表示・マウスイベント完全透過で頂点操作を邪魔しない） */}
      <Html
        position={[labelX, labelY, labelZ]}
        center
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="pointer-events-none select-none px-2 py-0.5 rounded-full text-xs font-semibold shadow-md border whitespace-nowrap flex items-center gap-1 bg-slate-900/85 text-slate-100 border-slate-600/80">
          <span className="opacity-75 text-[10px]">壁{segment.index + 1}:</span>
          <span>{segment.lengthMm.toLocaleString()} mm</span>
          <span className="text-[10px] opacity-80">
            ({(segment.lengthMm / 10).toFixed(1)} cm)
          </span>
        </div>
      </Html>
    </group>
  );
};

export const RoomMesh: React.FC = () => {
  const room = useRoomStore((s) => s.room);
  const editorMode = useRoomStore((s) => s.editorMode);
  const selectFurniture = useRoomStore((s) => s.selectFurniture);
  const handleMeasurementClick = useRoomStore((s) => s.handleMeasurementClick);
  const setHoverMeasurementPoint = useRoomStore((s) => s.setHoverMeasurementPoint);

  const showRightAngleMarks = room.showRightAngleMarks ?? false;

  const wallSegments = useMemo(
    () => computeWallSegments(room.vertices),
    [room.vertices]
  );

  // 多角形の床ジオメトリを (x, 0, z) で正確に三角形分割して生成する
  const floorGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    if (room.vertices.length < 3) return geom;

    const contour = room.vertices.map((v) => new THREE.Vector2(v.x, v.z));
    const triangles = THREE.ShapeUtils.triangulateShape(contour, []);

    const positions: number[] = [];
    const normals: number[] = [];

    for (const tri of triangles) {
      const [i0, i1, i2] = tri;
      const v0 = room.vertices[i0];
      const v1 = room.vertices[i1];
      const v2 = room.vertices[i2];

      const crossY = (v1.x - v0.x) * (v2.z - v0.z) - (v1.z - v0.z) * (v2.x - v0.x);
      if (crossY < 0) {
        positions.push(v0.x, 0, v0.z, v1.x, 0, v1.z, v2.x, 0, v2.z);
      } else {
        positions.push(v0.x, 0, v0.z, v2.x, 0, v2.z, v1.x, 0, v1.z);
      }
      normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geom.computeBoundingSphere();
    return geom;
  }, [room.vertices]);

  // 各コーナーの直角記号（∟マーク）の頂点座標を計算（showRightAngleMarksがONの時のみ表示）
  const rightAngleCornerMarkers = useMemo(() => {
    if (!showRightAngleMarks) return [];
    const n = room.vertices.length;
    if (n < 3) return [];

    const markerSize = 160;

    return wallSegments.map((seg, i) => {
      const prevVert = room.vertices[(i - 1 + n) % n];
      const currVert = room.vertices[i];
      const nextVert = room.vertices[(i + 1) % n];

      const v1x = prevVert.x - currVert.x;
      const v1z = prevVert.z - currVert.z;
      const len1 = Math.hypot(v1x, v1z);

      const v2x = nextVert.x - currVert.x;
      const v2z = nextVert.z - currVert.z;
      const len2 = Math.hypot(v2x, v2z);

      if (len1 < 1e-3 || len2 < 1e-3) {
        return {
          index: i,
          angleDeg: seg.cornerAngleDeg,
          isRightAngle: seg.isRightAngle,
          points: [] as Array<[number, number, number]>,
          badgePos: { x: currVert.x, z: currVert.z },
        };
      }

      const u1x = (v1x / len1) * Math.min(markerSize, len1 * 0.3);
      const u1z = (v1z / len1) * Math.min(markerSize, len1 * 0.3);
      const u2x = (v2x / len2) * Math.min(markerSize, len2 * 0.3);
      const u2z = (v2z / len2) * Math.min(markerSize, len2 * 0.3);

      const pA: [number, number, number] = [currVert.x + u1x, 6, currVert.z + u1z];
      const pCorner: [number, number, number] = [
        currVert.x + u1x + u2x,
        6,
        currVert.z + u1z + u2z,
      ];
      const pB: [number, number, number] = [currVert.x + u2x, 6, currVert.z + u2z];

      return {
        index: i,
        angleDeg: seg.cornerAngleDeg,
        isRightAngle: seg.isRightAngle,
        points: [pA, pCorner, pB],
        badgePos: {
          x: currVert.x + (u1x + u2x) * 1.1,
          z: currVert.z + (u1z + u2z) * 1.1,
        },
      };
    });
  }, [room.vertices, wallSegments, showRightAngleMarks]);

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

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (editorMode === 'measure') {
      e.stopPropagation();
      handleMeasurementClick({
        x: e.point.x,
        y: e.point.y,
        z: e.point.z,
      });
    } else if (editorMode === 'furniture') {
      selectFurniture(null);
    }
  };

  return (
    <group>
      {/* 床メッシュ */}
      <mesh
        geometry={floorGeometry}
        receiveShadow
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      >
        <meshStandardMaterial
          color={room.floorColor}
          roughness={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 各壁セグメントと一辺の常時寸法表示 */}
      {wallSegments.map((seg) => (
        <WallSegmentMesh
          key={seg.index}
          segment={seg}
          wallHeight={room.wallHeight}
          wallThickness={room.wallThickness}
          wallColor={room.wallColor}
          wallVisibility={room.wallVisibility ?? 'auto'}
          isRoomEditMode={editorMode === 'room_edit'}
          showRightAngleMarks={showRightAngleMarks}
          onFloorOrWallPointerMove={handlePointerMove}
          onFloorOrWallClick={handleClick}
        />
      ))}

      {/* 直角表示がONの時のみコーナーの∟マークおよび角度バッジを描画 */}
      {showRightAngleMarks &&
        rightAngleCornerMarkers.map((marker) => (
          <group key={marker.index}>
            {marker.points.length === 3 && (
              <Line
                points={marker.points}
                color={marker.isRightAngle ? '#10b981' : '#f59e0b'}
                lineWidth={marker.isRightAngle ? 3 : 1.5}
              />
            )}
            <Html
              position={[marker.badgePos.x, 10, marker.badgePos.z]}
              center
              zIndexRange={[5, 0]}
              style={{ pointerEvents: 'none' }}
            >
              <div
                className={`pointer-events-none select-none px-1.5 py-0.5 rounded text-[10px] font-bold shadow ${
                  marker.isRightAngle
                    ? 'bg-emerald-500/85 text-slate-950'
                    : 'bg-amber-600/85 text-white'
                }`}
              >
                {marker.isRightAngle ? '∟90°' : `${marker.angleDeg}°`}
              </div>
            </Html>
          </group>
        ))}
    </group>
  );
};
