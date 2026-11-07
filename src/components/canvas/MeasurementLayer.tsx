import React from 'react';
import { Html, Line } from '@react-three/drei';
import { useRoomStore } from '../../store/useRoomStore';
import { distance3D } from '../../utils/geometry';

export const MeasurementLayer: React.FC = () => {
  const measurements = useRoomStore((s) => s.measurements);
  const pendingStart = useRoomStore((s) => s.pendingMeasurementStart);
  const hoverPoint = useRoomStore((s) => s.hoverMeasurementPoint);
  const removeMeasurement = useRoomStore((s) => s.removeMeasurement);
  const editorMode = useRoomStore((s) => s.editorMode);

  const previewDistance =
    pendingStart && hoverPoint ? distance3D(pendingStart, hoverPoint) : 0;

  return (
    <group>
      {/* 確定済みの測定ライン一覧 */}
      {measurements.map((m, idx) => {
        const midX = (m.startPoint.x + m.endPoint.x) / 2;
        const midY = (m.startPoint.y + m.endPoint.y) / 2;
        const midZ = (m.startPoint.z + m.endPoint.z) / 2;

        const dx = Math.abs(Math.round(m.endPoint.x - m.startPoint.x));
        const dy = Math.abs(Math.round(m.endPoint.y - m.startPoint.y));
        const dz = Math.abs(Math.round(m.endPoint.z - m.startPoint.z));

        return (
          <group key={m.id}>
            <Line
              points={[
                [m.startPoint.x, m.startPoint.y + 4, m.startPoint.z],
                [m.endPoint.x, m.endPoint.y + 4, m.endPoint.z],
              ]}
              color="#f43f5e"
              lineWidth={3}
            />
            <mesh position={[m.startPoint.x, m.startPoint.y + 4, m.startPoint.z]}>
              <sphereGeometry args={[28, 16, 16]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>
            <mesh position={[m.endPoint.x, m.endPoint.y + 4, m.endPoint.z]}>
              <sphereGeometry args={[28, 16, 16]} />
              <meshBasicMaterial color="#f43f5e" />
            </mesh>

            <Html position={[midX, midY + 60, midZ]} center zIndexRange={[45, 0]}>
              <div className="pointer-events-auto select-none bg-rose-950/95 text-rose-100 border border-rose-400 rounded-md px-2.5 py-1 shadow-xl text-xs flex flex-col gap-0.5 whitespace-nowrap">
                <div className="flex items-center justify-between gap-2 font-bold">
                  <span>
                    📏 #{idx + 1}: {m.distanceMm.toLocaleString()} mm (
                    {(m.distanceMm / 10).toFixed(1)} cm)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMeasurement(m.id);
                    }}
                    className="text-rose-300 hover:text-white px-1 rounded bg-rose-800/60"
                    title="この測定を削除"
                  >
                    ×
                  </button>
                </div>
                <div className="text-[10px] text-rose-300">
                  ΔX: {dx}mm / ΔY: {dy}mm / ΔZ: {dz}mm
                </div>
              </div>
            </Html>
          </group>
        );
      })}

      {/* 測定モード中のリアルタイムプレビューライン */}
      {editorMode === 'measure' && pendingStart && (
        <group>
          <mesh position={[pendingStart.x, pendingStart.y + 5, pendingStart.z]}>
            <sphereGeometry args={[32, 16, 16]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>

          {hoverPoint && (
            <>
              <Line
                points={[
                  [pendingStart.x, pendingStart.y + 5, pendingStart.z],
                  [hoverPoint.x, hoverPoint.y + 5, hoverPoint.z],
                ]}
                color="#fbbf24"
                lineWidth={2.5}
                dashed
                dashSize={50}
                gapSize={30}
              />
              <mesh position={[hoverPoint.x, hoverPoint.y + 5, hoverPoint.z]}>
                <sphereGeometry args={[26, 16, 16]} />
                <meshBasicMaterial color="#fbbf24" />
              </mesh>
              <Html
                position={[
                  (pendingStart.x + hoverPoint.x) / 2,
                  (pendingStart.y + hoverPoint.y) / 2 + 70,
                  (pendingStart.z + hoverPoint.z) / 2,
                ]}
                center
                zIndexRange={[50, 0]}
              >
                <div className="pointer-events-none select-none bg-amber-500 text-slate-950 font-bold text-xs px-2 py-0.5 rounded shadow-lg border border-white whitespace-nowrap">
                  {previewDistance.toLocaleString()} mm ({(previewDistance / 10).toFixed(1)}{' '}
                  cm) — クリックで確定
                </div>
              </Html>
            </>
          )}
        </group>
      )}
    </group>
  );
};
