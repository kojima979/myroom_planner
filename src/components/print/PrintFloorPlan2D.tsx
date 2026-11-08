import React, { useMemo } from 'react';
import { FurnitureItem, MeasurementItem, Vector2D } from '../../types/room';
import {
  computeWallSegments,
  getFurnitureFootprintCorners,
} from '../../utils/geometry';

type Props = {
  vertices: Vector2D[];
  furnitures: FurnitureItem[];
  measurements: MeasurementItem[];
  wallThickness: number;
};

type PlanClearanceLine = {
  axis: 'horizontal' | 'vertical';
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  distanceMm: number;
};

/**
 * 2Dレイ (origin + t * dir, t >= 0) と線分 (segA -> segB) の交点距離を求める
 */
function raycastWall2D(
  originX: number,
  originZ: number,
  dirX: number,
  dirZ: number,
  vertices: Vector2D[]
): { distanceMm: number; hitX: number; hitZ: number } | null {
  const n = vertices.length;
  let minT = Infinity;
  let bestX = originX;
  let bestZ = originZ;

  for (let i = 0; i < n; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % n];
    const vx = b.x - a.x;
    const vz = b.z - a.z;

    const det = dirX * vz - dirZ * vx;
    if (Math.abs(det) < 1e-7) continue;

    const dx = a.x - originX;
    const dz = a.z - originZ;

    const t = (dx * vz - dz * vx) / det;
    const u = (dx * dirZ - dz * dirX) / det;

    if (t >= -1 && u >= -1e-4 && u <= 1 + 1e-4) {
      const clampedT = Math.max(0, t);
      if (clampedT < minT) {
        minT = clampedT;
        bestX = originX + dirX * clampedT;
        bestZ = originZ + dirZ * clampedT;
      }
    }
  }

  if (!Number.isFinite(minT)) return null;
  return {
    distanceMm: Math.round(minT),
    hitX: bestX,
    hitZ: bestZ,
  };
}

/**
 * 各オブジェクトについて、2D平面図上の「横方向（左右の近い方）1つ」と「縦方向（上下の近い方）1つ」の壁面までの寸法を計算する
 */
function computeObjectPlanClearances(
  item: FurnitureItem,
  vertices: Vector2D[]
): {
  horizontal: PlanClearanceLine | null;
  vertical: PlanClearanceLine | null;
} {
  // 窓・扉は壁面自体に配置される建具のため、壁までのクリアランス測定対象から除外
  if (item.presetType === 'window' || item.presetType === 'door') {
    return { horizontal: null, vertical: null };
  }

  const corners = getFurnitureFootprintCorners(item);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const c of corners) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.z < minZ) minZ = c.z;
    if (c.z > maxZ) maxZ = c.z;
  }

  const centerX = item.position.x;
  const centerZ = item.position.z;

  // 横方向: 左壁 (-X) と 右壁 (+X) を比較し、近い方1つを採用
  const hitLeft = raycastWall2D(minX, centerZ, -1, 0, vertices);
  const hitRight = raycastWall2D(maxX, centerZ, 1, 0, vertices);

  let horizontal: PlanClearanceLine | null = null;
  if (hitLeft && hitRight) {
    const pickLeft = hitLeft.distanceMm <= hitRight.distanceMm;
    const chosen = pickLeft ? hitLeft : hitRight;
    const startX = pickLeft ? minX : maxX;
    if (chosen.distanceMm >= 10) {
      horizontal = {
        axis: 'horizontal',
        fromX: startX,
        fromZ: centerZ,
        toX: chosen.hitX,
        toZ: chosen.hitZ,
        distanceMm: chosen.distanceMm,
      };
    }
  } else if (hitLeft && hitLeft.distanceMm >= 10) {
    horizontal = {
      axis: 'horizontal',
      fromX: minX,
      fromZ: centerZ,
      toX: hitLeft.hitX,
      toZ: hitLeft.hitZ,
      distanceMm: hitLeft.distanceMm,
    };
  } else if (hitRight && hitRight.distanceMm >= 10) {
    horizontal = {
      axis: 'horizontal',
      fromX: maxX,
      fromZ: centerZ,
      toX: hitRight.hitX,
      toZ: hitRight.hitZ,
      distanceMm: hitRight.distanceMm,
    };
  }

  // 縦方向: 上壁 (-Z) と 下壁 (+Z) を比較し、近い方1つを採用
  const hitTop = raycastWall2D(centerX, minZ, 0, -1, vertices);
  const hitBottom = raycastWall2D(centerX, maxZ, 0, 1, vertices);

  let vertical: PlanClearanceLine | null = null;
  if (hitTop && hitBottom) {
    const pickTop = hitTop.distanceMm <= hitBottom.distanceMm;
    const chosen = pickTop ? hitTop : hitBottom;
    const startZ = pickTop ? minZ : maxZ;
    if (chosen.distanceMm >= 10) {
      vertical = {
        axis: 'vertical',
        fromX: centerX,
        fromZ: startZ,
        toX: chosen.hitX,
        toZ: chosen.hitZ,
        distanceMm: chosen.distanceMm,
      };
    }
  } else if (hitTop && hitTop.distanceMm >= 10) {
    vertical = {
      axis: 'vertical',
      fromX: centerX,
      fromZ: minZ,
      toX: hitTop.hitX,
      toZ: hitTop.hitZ,
      distanceMm: hitTop.distanceMm,
    };
  } else if (hitBottom && hitBottom.distanceMm >= 10) {
    vertical = {
      axis: 'vertical',
      fromX: centerX,
      fromZ: maxZ,
      toX: hitBottom.hitX,
      toZ: hitBottom.hitZ,
      distanceMm: hitBottom.distanceMm,
    };
  }

  return { horizontal, vertical };
}

export const PrintFloorPlan2D: React.FC<Props> = ({
  vertices,
  furnitures,
  measurements,
  wallThickness,
}) => {
  const wallSegments = useMemo(() => computeWallSegments(vertices), [vertices]);

  // 部屋の基本スパンから図面全体の基準スケール単位 u を算出
  const { bounds, unit } = useMemo(() => {
    if (vertices.length === 0) {
      return {
        bounds: { minX: -2500, maxX: 2500, minZ: -2000, maxZ: 2000, w: 5000, d: 4000 },
        unit: 40,
      };
    }

    let rMinX = Infinity;
    let rMaxX = -Infinity;
    let rMinZ = Infinity;
    let rMaxZ = -Infinity;

    for (const v of vertices) {
      if (v.x < rMinX) rMinX = v.x;
      if (v.x > rMaxX) rMaxX = v.x;
      if (v.z < rMinZ) rMinZ = v.z;
      if (v.z > rMaxZ) rMaxZ = v.z;
    }

    for (const f of furnitures) {
      const corners = getFurnitureFootprintCorners(f);
      for (const c of corners) {
        if (c.x < rMinX) rMinX = c.x;
        if (c.x > rMaxX) rMaxX = c.x;
        if (c.z < rMinZ) rMinZ = c.z;
        if (c.z > rMaxZ) rMaxZ = c.z;
      }
    }

    const baseSpan = Math.max(2000, rMaxX - rMinX, rMaxZ - rMinZ);
    // 基準単位 u: 部屋スパンの 1/35（例: 3600mmの部屋なら u ≈ 103mm）
    const u = Math.round(baseSpan / 35);

    // 外側の壁寸法線および寸法ラベルが絶対に見切れないマージンを確保
    const padX = u * 7.5;
    const padZ = u * 6.5;

    const minX = rMinX - padX;
    const maxX = rMaxX + padX;
    const minZ = rMinZ - padZ;
    const maxZ = rMaxZ + padZ;

    return {
      bounds: {
        minX,
        maxX,
        minZ,
        maxZ,
        w: maxX - minX,
        d: maxZ - minZ,
      },
      unit: u,
    };
  }, [vertices, furnitures]);

  // 各家具の壁面までの距離（縦1つ、横1つ）
  const furnitureClearances = useMemo(() => {
    return furnitures.map((f, idx) => ({
      furniture: f,
      index: idx + 1,
      ...computeObjectPlanClearances(f, vertices),
    }));
  }, [furnitures, vertices]);

  const roomPolygonPoints = useMemo(() => {
    return vertices.map((v) => `${v.x},${v.z}`).join(' ');
  }, [vertices]);

  // フォントおよびバッジのサイズ定義（unit基準なので部屋サイズに関わらず常に大きくクッキリ表示される）
  const wallDimFontSize = Math.round(unit * 1.15);
  const wallDimBoxW = Math.round(unit * 5.8);
  const wallDimBoxH = Math.round(unit * 1.75);
  const wallDimOffset = Math.round(unit * 3.4);

  const clearanceFontSize = Math.round(unit * 0.92);
  const clearanceBoxW = Math.round(unit * 4.2);
  const clearanceBoxH = Math.round(unit * 1.4);

  const badgeRadius = Math.round(unit * 0.85);
  const badgeFontSize = Math.round(unit * 1.0);
  const furnitureNameFontSize = Math.round(unit * 0.85);

  return (
    <div className="print-svg-wrapper w-full bg-white border border-slate-300 rounded p-2">
      <svg
        viewBox={`${bounds.minX} ${bounds.minZ} ${bounds.w} ${bounds.d}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-[380px] print:h-[122mm] select-none block mx-auto"
        style={{ backgroundColor: '#ffffff' }}
      >
        <defs>
          {/* 壁寸法線の矢印マーカー */}
          <marker
            id="dim-arrow-start"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0f172a" />
          </marker>
          <marker
            id="dim-arrow-end"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0f172a" />
          </marker>
          {/* オブジェクト〜壁間クリアランス矢印マーカー */}
          <marker
            id="clearance-arrow-start"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0369a1" />
          </marker>
          <marker
            id="clearance-arrow-end"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#0369a1" />
          </marker>
          {/* 任意測定ライン矢印 */}
          <marker
            id="measure-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#be123c" />
          </marker>
        </defs>

        {/* 1. 床面と部屋外壁の輪郭 */}
        <polygon
          points={roomPolygonPoints}
          fill="#f8fafc"
          stroke="#0f172a"
          strokeWidth={Math.max(unit * 0.35, wallThickness * 0.4)}
          strokeLinejoin="round"
        />

        {/* 2. 各壁一辺の寸法線（外側・大文字表記） */}
        {wallSegments.map((seg) => {
          const sx = seg.start.x - seg.normal.x * wallDimOffset;
          const sz = seg.start.z - seg.normal.z * wallDimOffset;
          const ex = seg.end.x - seg.normal.x * wallDimOffset;
          const ez = seg.end.z - seg.normal.z * wallDimOffset;
          const mx = (sx + ex) / 2;
          const mz = (sz + ez) / 2;

          return (
            <g key={`wall-dim-${seg.index}`}>
              {/* 壁端点からの補助引出線 */}
              <line
                x1={seg.start.x}
                y1={seg.start.z}
                x2={sx}
                y2={sz}
                stroke="#475569"
                strokeWidth={unit * 0.08}
                strokeDasharray={`${unit * 0.3},${unit * 0.2}`}
              />
              <line
                x1={seg.end.x}
                y1={seg.end.z}
                x2={ex}
                y2={ez}
                stroke="#475569"
                strokeWidth={unit * 0.08}
                strokeDasharray={`${unit * 0.3},${unit * 0.2}`}
              />
              {/* 寸法主線 */}
              <line
                x1={sx}
                y1={sz}
                x2={ex}
                y2={ez}
                stroke="#0f172a"
                strokeWidth={unit * 0.14}
                markerStart="url(#dim-arrow-start)"
                markerEnd="url(#dim-arrow-end)"
              />
              {/* 寸法数値ボックス */}
              <rect
                x={mx - wallDimBoxW / 2}
                y={mz - wallDimBoxH / 2}
                width={wallDimBoxW}
                height={wallDimBoxH}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth={unit * 0.09}
                rx={unit * 0.2}
              />
              <text
                x={mx}
                y={mz + wallDimFontSize * 0.36}
                fill="#0f172a"
                fontSize={wallDimFontSize}
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {seg.lengthMm.toLocaleString()} mm
              </text>
            </g>
          );
        })}

        {/* 3. 家具・建具の平面フットプリント（回転は図形のみに適用） */}
        {furnitures.map((f) => {
          const hw = f.dimensions.width / 2;
          const hd = f.dimensions.depth / 2;
          const isCarpet = f.presetType === 'carpet';
          const isDoor = f.presetType === 'door';
          const isWindow = f.presetType === 'window';
          const isFridge = f.presetType === 'refrigerator';
          const isKitchen = f.presetType === 'kitchen';
          const isTv = f.presetType === 'tv';
          const isChair = f.presetType === 'chair';

          const transform = `translate(${f.position.x}, ${f.position.z}) rotate(${f.rotation.y})`;

          return (
            <g key={`shape-${f.id}`} transform={transform}>
              <rect
                x={-hw}
                y={-hd}
                width={f.dimensions.width}
                height={f.dimensions.depth}
                fill={isCarpet ? '#f5f3ff' : '#ffffff'}
                stroke={isCarpet ? '#7c3aed' : '#0f172a'}
                strokeWidth={isCarpet ? unit * 0.1 : unit * 0.16}
                strokeDasharray={isCarpet ? `${unit * 0.4},${unit * 0.25}` : undefined}
                rx={unit * 0.12}
              />

              {/* 冷蔵庫のドア線 */}
              {isFridge && (
                <line
                  x1={-hw}
                  y1={hd - unit * 0.35}
                  x2={hw}
                  y2={hd - unit * 0.35}
                  stroke="#64748b"
                  strokeWidth={unit * 0.1}
                />
              )}

              {/* システムキッチンのシンク・コンロ */}
              {isKitchen && (
                <>
                  {/* シンク（左） */}
                  <rect
                    x={-hw + unit * 0.3}
                    y={-hd + unit * 0.3}
                    width={Math.max(unit * 0.5, hw * 0.7)}
                    height={Math.max(unit * 0.5, f.dimensions.depth - unit * 0.6)}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={unit * 0.08}
                    rx={unit * 0.15}
                  />
                  {/* 水栓 */}
                  <circle
                    cx={-hw + unit * 0.3 + (hw * 0.7) / 2}
                    cy={-hd + unit * 0.55}
                    r={unit * 0.15}
                    fill="#0284c7"
                  />
                  {/* コンロ口（右） */}
                  <circle
                    cx={hw - unit * 0.7}
                    cy={-hd * 0.4}
                    r={Math.min(unit * 0.45, hd * 0.4)}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={unit * 0.08}
                  />
                  <circle
                    cx={hw - unit * 0.7}
                    cy={hd * 0.4}
                    r={Math.min(unit * 0.45, hd * 0.4)}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={unit * 0.08}
                  />
                </>
              )}

              {/* テレビ（モニタ）の画面・スタンド */}
              {isTv && (
                <>
                  {/* スタンド台座 */}
                  <rect
                    x={-hw * 0.35}
                    y={-hd * 0.6}
                    width={hw * 0.7}
                    height={hd * 1.2}
                    fill="none"
                    stroke="#64748b"
                    strokeWidth={unit * 0.08}
                    rx={unit * 0.08}
                  />
                  {/* 画面ディスプレイ線 */}
                  <line
                    x1={-hw}
                    y1={0}
                    x2={hw}
                    y2={0}
                    stroke="#0f172a"
                    strokeWidth={unit * 0.16}
                  />
                </>
              )}

              {/* 椅子の背もたれ線 */}
              {isChair && (
                <path
                  d={`M ${-hw * 0.75} ${-hd * 0.6} Q 0 ${-hd * 0.9} ${hw * 0.75} ${-hd * 0.6}`}
                  fill="none"
                  stroke="#475569"
                  strokeWidth={unit * 0.12}
                />
              )}

              {/* 扉の開閉軌跡 */}
              {isDoor && (
                <path
                  d={`M ${-hw} ${hd} A ${f.dimensions.width * 0.9} ${
                    f.dimensions.width * 0.9
                  } 0 0 0 ${-hw + f.dimensions.width * 0.9} ${
                    hd - f.dimensions.width * 0.9
                  }`}
                  fill="none"
                  stroke="#b45309"
                  strokeWidth={unit * 0.1}
                  strokeDasharray={`${unit * 0.35},${unit * 0.25}`}
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
                  strokeWidth={unit * 0.12}
                />
              )}
            </g>
          );
        })}

        {/* 4. 各オブジェクトと壁面までの寸法（1オブジェクトにつき縦方向1つ・横方向1つに限定） */}
        {furnitureClearances.map(({ furniture, horizontal, vertical }) => {
          const lines = [horizontal, vertical].filter(
            (c): c is PlanClearanceLine => c !== null
          );

          return (
            <g key={`clearance-${furniture.id}`}>
              {lines.map((c) => {
                const midX = (c.fromX + c.toX) / 2;
                const midZ = (c.fromZ + c.toZ) / 2;

                return (
                  <g key={`${furniture.id}-${c.axis}`}>
                    <line
                      x1={c.fromX}
                      y1={c.fromZ}
                      x2={c.toX}
                      y2={c.toZ}
                      stroke="#0369a1"
                      strokeWidth={unit * 0.11}
                      strokeDasharray={`${unit * 0.3},${unit * 0.2}`}
                      markerStart="url(#clearance-arrow-start)"
                      markerEnd="url(#clearance-arrow-end)"
                    />
                    <rect
                      x={midX - clearanceBoxW / 2}
                      y={midZ - clearanceBoxH / 2}
                      width={clearanceBoxW}
                      height={clearanceBoxH}
                      fill="#f0f9ff"
                      stroke="#0369a1"
                      strokeWidth={unit * 0.07}
                      rx={unit * 0.15}
                    />
                    <text
                      x={midX}
                      y={midZ + clearanceFontSize * 0.36}
                      fill="#0c4a6e"
                      fontSize={clearanceFontSize}
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

        {/* 5. 家具の識別番号バッジと名称（回転させず常に水平・正立で描画） */}
        {furnitures.map((f, idx) => {
          const cx = f.position.x;
          const cz = f.position.z;
          const isFixture = f.presetType === 'window' || f.presetType === 'door';

          return (
            <g key={`label-${f.id}`}>
              {/* 番号バッジ */}
              <circle
                cx={cx}
                cy={cz - (isFixture ? 0 : badgeRadius * 0.45)}
                r={badgeRadius}
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth={unit * 0.08}
              />
              <text
                x={cx}
                y={cz - (isFixture ? 0 : badgeRadius * 0.45) + badgeFontSize * 0.36}
                fill="#ffffff"
                fontSize={badgeFontSize}
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                {idx + 1}
              </text>

              {/* 家具名称（白縁取り付きで線と重なってもクッキリ読める） */}
              {!isFixture && (
                <text
                  x={cx}
                  y={cz + badgeRadius * 0.95}
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth={unit * 0.22}
                  paintOrder="stroke"
                  fontSize={furnitureNameFontSize}
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {f.name}
                </text>
              )}
            </g>
          );
        })}

        {/* 6. 任意の2点間測定ライン */}
        {measurements.map((m, idx) => {
          const mx = (m.startPoint.x + m.endPoint.x) / 2;
          const mz = (m.startPoint.z + m.endPoint.z) / 2;
          const mBoxW = Math.round(unit * 5.2);
          const mBoxH = Math.round(unit * 1.5);

          return (
            <g key={m.id}>
              <line
                x1={m.startPoint.x}
                y1={m.startPoint.z}
                x2={m.endPoint.x}
                y2={m.endPoint.z}
                stroke="#be123c"
                strokeWidth={unit * 0.13}
                strokeDasharray={`${unit * 0.35},${unit * 0.2}`}
                markerEnd="url(#measure-arrow)"
              />
              <circle
                cx={m.startPoint.x}
                cy={m.startPoint.z}
                r={unit * 0.22}
                fill="#be123c"
              />
              <circle
                cx={m.endPoint.x}
                cy={m.endPoint.z}
                r={unit * 0.22}
                fill="#be123c"
              />
              <rect
                x={mx - mBoxW / 2}
                y={mz - mBoxH / 2}
                width={mBoxW}
                height={mBoxH}
                fill="#ffe4e6"
                stroke="#be123c"
                strokeWidth={unit * 0.08}
                rx={unit * 0.15}
              />
              <text
                x={mx}
                y={mz + clearanceFontSize * 0.36}
                fill="#881337"
                fontSize={clearanceFontSize}
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
              >
                M{idx + 1}: {m.distanceMm.toLocaleString()}mm
              </text>
            </g>
          );
        })}

        {/* 7. 方位記号（北マーク） */}
        <g
          transform={`translate(${bounds.maxX - unit * 2.6}, ${
            bounds.minZ + unit * 2.6
          })`}
        >
          <circle
            cx="0"
            cy="0"
            r={unit * 1.1}
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth={unit * 0.09}
          />
          <polygon
            points={`0,${-unit * 0.85} ${-unit * 0.38},${unit * 0.35} 0,${
              unit * 0.1
            } ${unit * 0.38},${unit * 0.35}`}
            fill="#0f172a"
          />
          <text
            x="0"
            y={-unit * 1.3}
            fill="#0f172a"
            fontSize={unit * 0.9}
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="sans-serif"
          >
            N
          </text>
        </g>
      </svg>
    </div>
  );
};
