import React, { useMemo } from 'react';
import { FurnitureItem, MeasurementItem, Vector2D } from '../../types/room';
import { computeWallSegments } from '../../utils/geometry';

type Props = {
  vertices: Vector2D[];
  furnitures: FurnitureItem[];
  measurements: MeasurementItem[];
  wallThickness: number;
};

/**
 * 白背景・高コントラストなベクターSVGにより、
 * 部屋の輪郭・壁寸法・家具フットプリント・番号・測定線をクッキリと印刷用に出力するコンポーネント
 */
export const PrintFloorPlan2D: React.FC<Props> = ({
  vertices,
  furnitures,
  measurements,
  wallThickness,
}) => {
  // 部屋全体のバウンディングボックスを計算してSVG viewBoxを自動決定
  const bounds = useMemo(() => {
    if (vertices.length === 0) {
      return { minX: -2000, maxX: 2000, minZ: -1500, maxZ: 1500, w: 4000, d: 3000 };
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const v of vertices) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.z < minZ) minZ = v.z;
      if (v.z > maxZ) maxZ = v.z;
    }

    // 家具の位置も考慮
    for (const f of furnitures) {
      const hw = f.dimensions.width / 2;
      const hd = f.dimensions.depth / 2;
      const fMinX = f.position.x - hw;
      const fMaxX = f.position.x + hw;
      const fMinZ = f.position.z - hd;
      const fMaxZ = f.position.z + hd;
      if (fMinX < minX) minX = fMinX;
      if (fMaxX > maxX) maxX = fMaxX;
      if (fMinZ < minZ) minZ = fMinZ;
      if (fMaxZ > maxZ) maxZ = fMaxZ;
    }

    // 寸法線用の余白 (margin) を600mm確保
    const margin = 700;
    const w = maxX - minX + margin * 2;
    const d = maxZ - minZ + margin * 2;
    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minZ: minZ - margin,
      maxZ: maxZ + margin,
      w: Math.max(1000, w),
      d: Math.max(1000, d),
    };
  }, [vertices, furnitures]);

  const wallSegments = useMemo(() => computeWallSegments(vertices), [vertices]);

  // 部屋の内壁多角形パス
  const roomPolygonPoints = useMemo(() => {
    return vertices.map((v) => `${v.x},${v.z}`).join(' ');
  }, [vertices]);

  return (
    <div className="w-full flex flex-col items-center justify-center bg-white border border-slate-300 rounded p-2">
      <svg
        viewBox={`${bounds.minX} ${bounds.minZ} ${bounds.w} ${bounds.d}`}
        className="w-full h-auto max-h-[500px]"
        style={{ backgroundColor: '#ffffff' }}
      >
        <defs>
          {/* 寸法線の矢印マーカー */}
          <marker
            id="dim-arrow-start"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0f172a" />
          </marker>
          <marker
            id="dim-arrow-end"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0f172a" />
          </marker>
          <marker
            id="measure-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 2 L 8 5 L 0 8 z" fill="#e11d48" />
          </marker>
        </defs>

        {/* 1. 床面塗りつぶし（極めて淡いグレー） */}
        <polygon
          points={roomPolygonPoints}
          fill="#fafafa"
          stroke="#0f172a"
          strokeWidth={wallThickness * 0.4}
          strokeLinejoin="round"
        />

        {/* 2. 各壁セグメントの寸法線と寸法数値 */}
        {wallSegments.map((seg) => {
          // 壁の外側へ寸法線を引き出すオフセット（単位法線の逆方向）
          const offsetDist = 260;
          const sx = seg.start.x - seg.normal.x * offsetDist;
          const sz = seg.start.z - seg.normal.z * offsetDist;
          const ex = seg.end.x - seg.normal.x * offsetDist;
          const ez = seg.end.z - seg.normal.z * offsetDist;
          const mx = (sx + ex) / 2;
          const mz = (sz + ez) / 2;

          return (
            <g key={`dim-${seg.index}`}>
              {/* 引出線 */}
              <line
                x1={seg.start.x}
                y1={seg.start.z}
                x2={sx}
                y2={sz}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
              <line
                x1={seg.end.x}
                y1={seg.end.z}
                x2={ex}
                y2={ez}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
              {/* 寸法線 */}
              <line
                x1={sx}
                y1={sz}
                x2={ex}
                y2={ez}
                stroke="#0f172a"
                strokeWidth="2.5"
                markerStart="url(#dim-arrow-start)"
                markerEnd="url(#dim-arrow-end)"
              />
              {/* 寸法数値テキスト（白背景バッジ付きでくっきり） */}
              <rect
                x={mx - 65}
                y={mz - 22}
                width="130"
                height="44"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="1"
                rx="4"
              />
              <text
                x={mx}
                y={mz + 6}
                fill="#0f172a"
                fontSize="24"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {seg.lengthMm.toLocaleString()} mm
              </text>
            </g>
          );
        })}

        {/* 3. 家具・建具のフットプリント（平面形状） */}
        {furnitures.map((f, idx) => {
          const hw = f.dimensions.width / 2;
          const hd = f.dimensions.depth / 2;
          const isCarpet = f.presetType === 'carpet';
          const isDoor = f.presetType === 'door';
          const isWindow = f.presetType === 'window';

          // 回転変換行列
          const transform = `translate(${f.position.x}, ${f.position.z}) rotate(${f.rotation.y})`;

          return (
            <g key={f.id} transform={transform}>
              {/* 家具本体の四角形 */}
              <rect
                x={-hw}
                y={-hd}
                width={f.dimensions.width}
                height={f.dimensions.depth}
                fill={isCarpet ? '#f3e8ff' : '#ffffff'}
                stroke={isCarpet ? '#9333ea' : '#0f172a'}
                strokeWidth={isCarpet ? '2' : '3'}
                strokeDasharray={isCarpet ? '8,4' : undefined}
                rx={isCarpet ? '4' : '2'}
              />

              {/* 扉の開閉軌跡（平面扇形ガイド） */}
              {isDoor && (
                <path
                  d={`M ${-hw} ${hd} A ${f.dimensions.width * 0.9} ${
                    f.dimensions.width * 0.9
                  } 0 0 0 ${-hw + f.dimensions.width * 0.9} ${hd - f.dimensions.width * 0.9}`}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                />
              )}

              {/* 窓のサッシ二重線表現 */}
              {isWindow && (
                <line
                  x1={-hw}
                  y1={0}
                  x2={hw}
                  y2={0}
                  stroke="#0284c7"
                  strokeWidth="2"
                />
              )}

              {/* 識別番号バッジ (F1, F2...) */}
              <circle cx="0" cy="0" r="40" fill="#0f172a" />
              <text
                x="0"
                y="10"
                fill="#ffffff"
                fontSize="24"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {idx + 1}
              </text>

              {/* 家具名 */}
              <text
                x="0"
                y={hd - 14}
                fill="#0f172a"
                fontSize="18"
                fontWeight="600"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {f.name}
              </text>
            </g>
          );
        })}

        {/* 4. 長さ測定ライン */}
        {measurements.map((m, idx) => {
          const mx = (m.startPoint.x + m.endPoint.x) / 2;
          const mz = (m.startPoint.z + m.endPoint.z) / 2;

          return (
            <g key={m.id}>
              <line
                x1={m.startPoint.x}
                y1={m.startPoint.z}
                x2={m.endPoint.x}
                y2={m.endPoint.z}
                stroke="#e11d48"
                strokeWidth="3.5"
                strokeDasharray="6,4"
                markerEnd="url(#measure-arrow)"
              />
              <circle cx={m.startPoint.x} cy={m.startPoint.z} r="10" fill="#e11d48" />
              <circle cx={m.endPoint.x} cy={m.endPoint.z} r="10" fill="#e11d48" />
              <rect
                x={mx - 60}
                y={mz - 18}
                width="120"
                height="36"
                fill="#ffe4e6"
                stroke="#e11d48"
                strokeWidth="1.5"
                rx="4"
              />
              <text
                x={mx}
                y={mz + 6}
                fill="#9f1239"
                fontSize="20"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                M{idx + 1}: {m.distanceMm.toLocaleString()}mm
              </text>
            </g>
          );
        })}

        {/* 方位記号（北マーク） */}
        <g transform={`translate(${bounds.maxX - 160}, ${bounds.minZ + 160})`}>
          <circle cx="0" cy="0" r="50" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
          <polygon points="0,-40 -16,10 0,0 16,10" fill="#0f172a" />
          <text
            x="0"
            y="-46"
            fill="#0f172a"
            fontSize="20"
            fontWeight="bold"
            textAnchor="middle"
          >
            N
          </text>
        </g>
      </svg>
    </div>
  );
};
