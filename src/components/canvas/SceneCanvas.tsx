import React from 'react';
import { Box } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Grid,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei';
import { useRoomStore } from '../../store/useRoomStore';
import { RoomMesh } from './RoomMesh';
import { FloorPlanPolygonEditor } from './FloorPlanPolygonEditor';
import { FurnitureLayer } from './FurnitureMesh';
import { WallClearanceGuides } from './WallClearanceGuides';
import { MeasurementLayer } from './MeasurementLayer';

export const SceneCanvas: React.FC = () => {
  const cameraMode = useRoomStore((s) => s.cameraMode);
  const isDraggingGizmo = useRoomStore((s) => s.isDraggingGizmo);
  const editorMode = useRoomStore((s) => s.editorMode);
  const cancelPendingMeasurement = useRoomStore((s) => s.cancelPendingMeasurement);

  return (
    <div
      className={`relative w-full h-full bg-slate-900 ${
        editorMode === 'measure' ? 'cursor-crosshair' : 'cursor-default'
      }`}
      onContextMenu={(e) => {
        if (editorMode === 'measure') {
          e.preventDefault();
          cancelPendingMeasurement();
        }
      }}
    >
      <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <color attach="background" args={['#0f172a']} />

        {/* カメラ切り替え: 3D自由視点 vs 2D真上平行投影視点 */}
        {cameraMode === '3d' ? (
          <PerspectiveCamera
            makeDefault
            position={[3800, 3600, 4200]}
            fov={45}
            near={20}
            far={60000}
          />
        ) : (
          <OrthographicCamera
            makeDefault
            position={[0, 8000, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            zoom={0.14}
            near={10}
            far={30000}
          />
        )}

        <OrbitControls
          makeDefault
          enabled={!isDraggingGizmo}
          enableRotate={cameraMode === '3d'}
          maxPolarAngle={cameraMode === '3d' ? Math.PI / 2 - 0.02 : 0}
          minDistance={300}
          maxDistance={25000}
          target={[0, 400, 0]}
        />

        {/* ライティング */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[4000, 7000, 3000]}
          intensity={1.1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-6000}
          shadow-camera-right={6000}
          shadow-camera-top={6000}
          shadow-camera-bottom={-6000}
          shadow-camera-near={500}
          shadow-camera-far={20000}
        />
        <hemisphereLight args={['#f8fafc', '#334155', 0.4]} />

        {/* 床面基準グリッド (100mm小グリッド / 1000mm=1m大グリッド) */}
        <Grid
          position={[0, -2, 0]}
          args={[20000, 20000]}
          cellSize={100}
          cellThickness={0.5}
          cellColor="#334155"
          sectionSize={1000}
          sectionThickness={1.2}
          sectionColor="#475569"
          fadeDistance={16000}
          fadeStrength={1}
        />

        <ContactShadows
          position={[0, 1, 0]}
          opacity={0.35}
          scale={12000}
          blur={1.8}
          far={2500}
        />

        {/* 部屋の床・壁・一辺寸法・直角マーク描画 */}
        <RoomMesh />

        {/* 部屋の頂点編集・直角スナップオーバーレイ */}
        <FloorPlanPolygonEditor />

        {/* 家具・建具・外部3Dモデルレイヤー */}
        <FurnitureLayer />

        {/* オブジェクト〜壁間の距離（クリアランス）常時表示レイヤー */}
        <WallClearanceGuides />

        {/* 任意の2点間距離測定レイヤー */}
        <MeasurementLayer />
      </Canvas>

      {/* 画面左下: 格子の背景として半透明で目立たなく表示するアプリロゴと名称 */}
      <div className="pointer-events-none select-none absolute bottom-4 left-4 z-10 flex items-center gap-2.5 opacity-20">
        <div className="w-8 h-8 rounded-lg border border-slate-400/40 bg-slate-800/40 flex items-center justify-center text-slate-300">
          <Box className="w-4 h-4" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-wider text-slate-300 uppercase block font-mono">
            MyRoom Planner
          </span>
          <span className="text-[9px] tracking-wide text-slate-400 block">
            3D ROOM & FURNITURE PLANNER
          </span>
        </div>
      </div>

      {/* モード別の画面下部ステータス・操作ヒントバー */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 text-slate-200 px-4 py-1.5 rounded-full text-xs shadow-xl flex items-center gap-3">
        {editorMode === 'furniture' && (
          <span>
            💡 <strong>家具配置モード</strong>:
            家具をクリックして選択し、矢印ギズモのドラッグまたは右パネルの数値入力で微調整できます（周囲の壁までの距離が常時表示されます）。
          </span>
        )}
        {editorMode === 'room_edit' && (
          <span>
            📐 <strong>部屋形状・寸法編集モード</strong>:
            オレンジ色の頂点をドラッグして移動（90°直角に自動スナップ＆緑ハイライト）、または壁の寸法ラベルをクリックして一辺の長さを直接入力できます。
          </span>
        )}
        {editorMode === 'measure' && (
          <span>
            📏 <strong>長さ測定モード</strong>:
            床・壁・家具表面の任意の2点をクリックして距離を測定します（右クリックでキャンセル）。
          </span>
        )}
      </div>
    </div>
  );
};
