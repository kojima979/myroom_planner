import React, { useMemo } from 'react';
import { FurnitureItem, MeasurementItem, Vector2D } from '../../types/room';
import { computeWallClearances, computeWallSegments } from '../../utils/geometry';

type Props = {
  vertices: Vector2D[];
  furnitures: FurnitureItem[];
  measurements: MeasurementItem[];
  wallThickness: number;
};

/**
 * 各家具について、縦方向1つ（前または後）・横方向1つ（左または右）の最短壁クリアランスを抽出する
 */
function getSelectedClearancesForPrint(furniture: FurnitureItem, vertices: Vector2D[]) {
  const clearances = computeWallClearances(furniture, vertices);
  // 横方向（left or right）の最短
  const horizontalList = clearances.filter((c) => c.direction === 'left' || c.direction === 'right');
  horizontalList.sort((a, b) => a.distanceMm - b.distanceMm);
  const bestHorizontal = horizontalList[0] ?? null;

  // 縦方向（front or back）の最短
  const verticalList = clearances.filter((c) => c.direction === 'front' || c.direction === 'back');
  verticalList.sort((a, b) => a.distanceMm - b.distanceMm);
  const bestVertical = verticalList[0] ?? null;

  return { bestHorizontal, bestVertical };
}

export const PrintFloorPlan2D: React.FC<Props> = ({
  vertices,
  furnitures,
  measurements,
  wallThickness,
}) => {
  const wallSegments = useMemo(() => computeWallSegments(vertices), [vertices]);

  // 家具ごとの厳選クリアランス（縦1つ、横1つ）
  const furnitureClearances = useMemo(() => {
    return furnitures.map((f, idx) => ({
      furniture: f,
      index: idx + 1,
      ...getSelectedClearancesForPrint(f, vertices),
    }));
  }, [furnitures, vertices]);

  // 部屋全体のバウンディングボックス計算（寸法線や文字が絶対にはみ出さないよう広めのマージンを確保）
  const bounds = useMemo(() => {
    if (vertices.length === 0) {
      return { minX: -2200, maxX: 2200, minZ: -1800, maxZ: 1800, w: 4400, d: 3600 };
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

    // 外側の寸法線と文字バッジのための十分な余白 (850mm)
    const margin = 850;
    const w = maxX - minX + margin * 2;
    const d = maxZ - minZ + margin * 2;

    return {
      minX: minX - margin,
      maxX: maxX + margin,
      minZ: minZ - margin,
      maxZ: maxZ + margin,
      w: Math.max(1200, w),
      d: Math.max(1200, d),
    };
  }, [vertices, furnitures]);

  const roomPolygonPoints = useMemo(() => {
    return vertices.map((v) => `${v.x},${v.z}`).join(' ');
  }, [vertices]);

  return (
    <div className="w-full flex flex-col items-center justify-center bg-white border border-slate-300 rounded p-4 overflow-hidden">
      <svg
        viewBox={`${bounds.minX} ${bounds.minZ} ${bounds.w} ${bounds.d}`}
        className="w-full h-auto max-h-[580px] select-none block"
        style={{ backgroundColor: '#ffffff' }}
      >
        <defs>
          {/* 寸法線の矢印マーカー */}
          <marker
            id="dim-arrow-black"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0f172a" />
          </marker>
          <marker
            id="clearance-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 2 L 8 5 L 0 8 z" fill="#0284c7" />
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

        {/* 1. 床面塗りつぶしと壁の輪郭 */}
        <polygon
          points={roomPolygonPoints}
          fill="#f8fafc"
          stroke="#0f172a"
          strokeWidth={Math.max(16, wallThickness * 0.45)}
          strokeLinejoin="round"
        />

        {/* 2. 各壁セグメントの一辺寸法線（大きくクッキリした文字） */}
        {wallSegments.map((seg) => {
          const offsetDist = 320;
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
                strokeWidth="2"
                strokeDasharray="6,4"
              />
              <line
                x1={seg.end.x}
                y1={seg.end.z}
                x2={ex}
                y2={ez}
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="6,4"
              />
              {/* 寸法矢印線 */}
              <line
                x1={sx}
                y1={sz}
                x2={ex}
                y2={ez}
                stroke="#0f172a"
                strokeWidth="3.5"
                markerStart="url(#dim-arrow-black)"
                markerEnd="url(#dim-arrow-black)"
              />
              {/* 大きく見やすい寸法数値バッジ */}
              <rect
                x={mx - 90}
                y={mz - 28}
                width="180"
                height="56"
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2"
                rx="6"
              />
              <text
                x={mx}
                y={mz + 9}
                fill="#0f172a"
                fontSize="32"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {seg.lengthMm.toLocaleString()} mm
              </text>
            </g>
          );
        })}

        {/* 3. 家具と壁面までの寸法（縦方向1つ、横方向1つに限定） */}
        {furnitureClearances.map(({ furniture, bestHorizontal, bestVertical }) => {
          const lines = [bestHorizontal, bestVertical].filter(Boolean);

          return (
            <g key={`clearance-${furniture.id}`}>
              {lines.map((c, i) => {
                if (!c) return null;
                const midX = (c.fromPoint.x + c.toWallPoint.x) / 2;
                const midZ = (c.fromPoint.z + c.toWallPoint.z) / 2;

                return (
                  <g key={i}>
                    {/* クリアランス寸法線 */}
                    <line
                      x1={c.fromPoint.x}
                      y1={c.fromPoint.z}
                      x2={c.toWallPoint.x}
                      y2={c.toWallPoint.z}
                      stroke="#0284c7"
                      strokeWidth="2.5"
                      strokeDasharray="8,5"
                      markerEnd="url(#clearance-arrow)"
                    />
                    <circle cx={c.fromPoint.x} cy={c.fromPoint.z} r="6" fill="#0284c7" />
                    {/* 寸法バッジ */}
                    <rect
                      x={midX - 55}
                      y={midZ - 18}
                      width="110"
                      height="36"
                      fill="#f0f9ff"
                      stroke="#0284c7"
                      strokeWidth="1.5"
                      rx="4"
                    />
                    <text
                      x={midX}
                      y={midZ + 6}
                      fill="#0369a1"
                      fontSize="20"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="sans-serif"
                    >
                      {c.distanceMm.toLocaleString()}mm
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* 4. 家具・建具本体の平面形状 */}
        {furnitures.map((f, idx) => {
          const hw = f.dimensions.width / 2;
          const hd = f.dimensions.depth / 2;
          const isCarpet = f.presetType === 'carpet';
          const isDoor = f.presetType === 'door';
          const isWindow = f.presetType === 'window';

          const transform = `translate(${f.position.x}, ${f.position.z}) rotate(${f.rotation.y})`;

          return (
            <g key={f.id} transform={transform}>
              {/* 家具本体 */}
              <rect
                x={-hw}
                y={-hd}
                width={f.dimensions.width}
                height={f.dimensions.depth}
                fill={isCarpet ? '#f3e8ff' : '#ffffff'}
                stroke={isCarpet ? '#9333ea' : '#0f172a'}
                strokeWidth={isCarpet ? '2.5' : '3.5'}
                strokeDasharray={isCarpet ? '10,5' : undefined}
                rx={isCarpet ? '6' : '3'}
              />

              {/* 扉の開閉軌跡 */}
              {isDoor && (
                <path
                  d={`M ${-hw} ${hd} A ${f.dimensions.width * 0.9} ${
                    f.dimensions.width * 0.9
                  } 0 0 0 ${-hw + f.dimensions.width * 0.9} ${hd - f.dimensions.width * 0.9}`}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2.5"
                  strokeDasharray="8,5"
                />
              )}

              {/* 窓のサッシ二重線 */}
              {isWindow && (
                <line
                  x1={-hw}
                  y1={0}
                  x2={hw}
                  y2={0}
                  stroke="#0284c7"
                  strokeWidth="3"
                />
              )}

              {/* 識別番号バッジ（円を大きく、フォントを強調） */}
              <circle cx="0" cy="0" r="50" fill="#0f172a" />
              <text
                x="0"
                y="12"
                fill="#ffffff"
                fontSize="32"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {idx + 1}
              </text>

              {/* 家具名 */}
              <text
                x="0"
                y={hd - 16}
                fill="#0f172a"
                fontSize="24"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {f.name}
              </text>
            </g>
          );
        })}

        {/* 5. 任意の長さ測定ライン */}
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
                strokeWidth="4"
                strokeDasharray="8,5"
                markerEnd="url(#measure-arrow)"
              />
              <circle cx={m.startPoint.x} cy={m.startPoint.z} r="10" fill="#e11d48" />
              <circle cx={m.endPoint.x} cy={m.endPoint.z} r="10" fill="#e11d48" />
              <rect
                x={mx - 80}
                y={mz - 24}
                width="160"
                height="48"
                fill="#ffe4e6"
                stroke="#e11d48"
                strokeWidth="2"
                rx="5"
              />
              <text
                x={mx}
                y={mz + 8}
                fill="#9f1239"
                fontSize="24"
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
        <g transform={`translate(${bounds.maxX - 200}, ${bounds.minZ + 200})`}>
          <circle cx="0" cy="0" r="60" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
          <polygon points="0,-48 -20,12 0,0 20,12" fill="#0f172a" />
          <text
            x="0"
            y="-56"
            fill="#0f172a"
            fontSize="24"
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
