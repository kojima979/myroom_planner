import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { useRoomStore } from '../../store/useRoomStore';
import { computeWallSegments, snapVertexPosition } from '../../utils/geometry';
import { Vector2D } from '../../types/room';

export const FloorPlanPolygonEditor: React.FC = () => {
  const { camera, gl, raycaster } = useThree();
  const room = useRoomStore((s) => s.room);
  const editorMode = useRoomStore((s) => s.editorMode);
  const selectedVertexIndex = useRoomStore((s) => s.selectedVertexIndex);
  const selectVertex = useRoomStore((s) => s.selectVertex);
  const updateVertexPosition = useRoomStore((s) => s.updateVertexPosition);
  const addVertexOnWall = useRoomStore((s) => s.addVertexOnWall);
  const setIsDraggingGizmo = useRoomStore((s) => s.setIsDraggingGizmo);

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [snapGuides, setSnapGuides] = useState<Array<{ from: Vector2D; to: Vector2D }>>([]);

  const groundPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const planeIntersectPoint = useRef(new THREE.Vector3());

  // ドラッグ操作をグローバルなポインターイベントで確実に捕捉・追従させる
  useEffect(() => {
    if (draggingIndex === null) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.ray.intersectPlane(
        groundPlaneRef.current,
        planeIntersectPoint.current
      );

      if (hit) {
        const rawPos: Vector2D = {
          x: planeIntersectPoint.current.x,
          z: planeIntersectPoint.current.z,
        };

        const snapped = snapVertexPosition(
          room.vertices,
          draggingIndex,
          rawPos,
          room.enableRightAngleSnap
        );

        updateVertexPosition(draggingIndex, snapped.position);
        setSnapGuides(snapped.guideLines);
      }
    };

    const handlePointerUp = () => {
      setDraggingIndex(null);
      setSnapGuides([]);
      setIsDraggingGizmo(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [
    draggingIndex,
    gl.domElement,
    camera,
    raycaster,
    room.vertices,
    room.enableRightAngleSnap,
    updateVertexPosition,
    setIsDraggingGizmo,
  ]);

  if (editorMode !== 'room_edit') {
    return null;
  }

  const wallSegments = computeWallSegments(room.vertices);

  const handleVertexPointerDown = (e: ThreeEvent<PointerEvent>, idx: number) => {
    e.stopPropagation();
    selectVertex(idx);
    setDraggingIndex(idx);
    setIsDraggingGizmo(true);
  };

  return (
    <group>
      {/* 直角スナップ作動時のハイライト補助線 */}
      {snapGuides.map((g, idx) => (
        <Line
          key={idx}
          points={[
            [g.from.x, 25, g.from.z],
            [g.to.x, 25, g.to.z],
          ]}
          color="#10b981"
          lineWidth={3.5}
          dashed
          dashSize={80}
          gapSize={45}
        />
      ))}

      {/* 各頂点のドラッグハンドル */}
      {room.vertices.map((vert, idx) => {
        const isSelected = selectedVertexIndex === idx || draggingIndex === idx;
        const isDragging = draggingIndex === idx;

        return (
          <group key={idx} position={[vert.x, 20, vert.z]}>
            {/* ヒット判定を広めにとった円柱ハンドル */}
            <mesh
              onPointerDown={(e) => handleVertexPointerDown(e, idx)}
              onPointerOver={(e) => {
                e.stopPropagation();
                gl.domElement.style.cursor = 'grab';
              }}
              onPointerOut={() => {
                if (draggingIndex === null) {
                  gl.domElement.style.cursor = 'default';
                }
              }}
            >
              <cylinderGeometry args={[130, 130, 45, 24]} />
              <meshStandardMaterial
                color={isDragging ? '#0284c7' : isSelected ? '#38bdf8' : '#f97316'}
                emissive={isDragging ? '#38bdf8' : isSelected ? '#0284c7' : '#c2410c'}
                emissiveIntensity={isDragging ? 0.7 : 0.4}
                roughness={0.3}
              />
            </mesh>

            {/* 頂点座標ラベル */}
            <Html position={[0, 80, 0]} center zIndexRange={[35, 0]}>
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  selectVertex(idx);
                }}
                className={`select-none px-2 py-0.5 rounded text-[10px] font-bold shadow-lg border whitespace-nowrap transition-transform ${
                  isDragging
                    ? 'bg-sky-400 text-slate-950 border-white scale-110 ring-2 ring-sky-300'
                    : isSelected
                    ? 'bg-sky-500 text-slate-950 border-white'
                    : 'bg-slate-900/95 text-orange-300 border-orange-500/80 hover:scale-105'
                }`}
              >
                {isDragging ? '✊ 移動中: ' : '頂点'}#{idx + 1} ({Math.round(vert.x)},{' '}
                {Math.round(vert.z)})
              </div>
            </Html>
          </group>
        );
      })}

      {/* 各壁の中間点にある「＋頂点追加」ボタン */}
      {wallSegments.map((seg) => (
        <Html
          key={`add-vert-${seg.index}`}
          position={[seg.midPoint.x, 25, seg.midPoint.z]}
          center
          zIndexRange={[25, 0]}
        >
          <button
            type="button"
            title="この壁を分割して新しい頂点を追加"
            onClick={(e) => {
              e.stopPropagation();
              addVertexOnWall(seg.index);
            }}
            className="mt-8 px-2.5 py-1 rounded-full bg-emerald-600/95 hover:bg-emerald-500 text-white text-[10px] font-bold border border-emerald-300 shadow-md pointer-events-auto whitespace-nowrap active:scale-95 transition-transform"
          >
            ＋頂点追加
          </button>
        </Html>
      ))}
    </group>
  );
};
