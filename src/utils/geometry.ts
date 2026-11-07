import {
  ClearanceDirection,
  ClearanceDistance,
  FurnitureItem,
  Vector2D,
  Vector3D,
  WallSegmentInfo,
} from '../types/room';

const RIGHT_ANGLE_TOLERANCE_DEG = 2.0;

/**
 * 多角形の符号付き面積を計算する（靴紐の公式）
 */
export function computeSignedPolygonArea(vertices: Vector2D[]): number {
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];
    area += curr.x * next.z - next.x * curr.z;
  }
  return area / 2;
}

/**
 * 部屋の頂点配列から各壁セグメントの長さ、法線、および各頂点の角度・直角判定を計算する
 */
export function computeWallSegments(vertices: Vector2D[]): WallSegmentInfo[] {
  const n = vertices.length;
  if (n < 3) return [];

  const signedArea = computeSignedPolygonArea(vertices);
  const isClockwise = signedArea > 0;

  const segments: WallSegmentInfo[] = [];

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    const dx = next.x - curr.x;
    const dz = next.z - curr.z;
    const lengthMm = Math.round(Math.hypot(dx, dz));

    const ux = lengthMm > 0 ? dx / lengthMm : 1;
    const uz = lengthMm > 0 ? dz / lengthMm : 0;

    // 部屋内側向きの単位法線ベクトル
    const normal: Vector2D = isClockwise ? { x: -uz, z: ux } : { x: uz, z: -ux };

    // 前の辺 (prev -> curr) と現在の辺 (curr -> next) の角度計算
    const v1x = prev.x - curr.x;
    const v1z = prev.z - curr.z;
    const v2x = next.x - curr.x;
    const v2z = next.z - curr.z;
    const len1 = Math.hypot(v1x, v1z);
    const len2 = Math.hypot(v2x, v2z);

    let cornerAngleDeg = 90;
    if (len1 > 1e-4 && len2 > 1e-4) {
      const dot = (v1x * v2x + v1z * v2z) / (len1 * len2);
      const clampedDot = Math.max(-1, Math.min(1, dot));
      cornerAngleDeg = (Math.acos(clampedDot) * 180) / Math.PI;
    }

    const isRightAngle = Math.abs(cornerAngleDeg - 90) <= RIGHT_ANGLE_TOLERANCE_DEG;

    segments.push({
      index: i,
      start: curr,
      end: next,
      midPoint: {
        x: (curr.x + next.x) / 2,
        z: (curr.z + next.z) / 2,
      },
      lengthMm,
      normal,
      cornerAngleDeg: Math.round(cornerAngleDeg * 10) / 10,
      isRightAngle,
    });
  }

  return segments;
}

export type SnapResult = {
  position: Vector2D;
  snappedToPrevX: boolean;
  snappedToPrevZ: boolean;
  snappedToNextX: boolean;
  snappedToNextZ: boolean;
  snappedPerpendicularPrev: boolean;
  snappedPerpendicularNext: boolean;
  guideLines: Array<{ from: Vector2D; to: Vector2D }>;
};

/**
 * 頂点移動時に、隣接頂点との水平・垂直（直角）および隣接辺に対する90°スナップを計算する
 */
export function snapVertexPosition(
  vertices: Vector2D[],
  movingIndex: number,
  rawPos: Vector2D,
  enableSnap: boolean,
  snapThresholdMm = 120
): SnapResult {
  const n = vertices.length;
  const result: SnapResult = {
    position: {
      x: Math.round(rawPos.x / 10) * 10,
      z: Math.round(rawPos.z / 10) * 10,
    },
    snappedToPrevX: false,
    snappedToPrevZ: false,
    snappedToNextX: false,
    snappedToNextZ: false,
    snappedPerpendicularPrev: false,
    snappedPerpendicularNext: false,
    guideLines: [],
  };

  if (!enableSnap || n < 3) {
    return result;
  }

  const prev = vertices[(movingIndex - 1 + n) % n];
  const next = vertices[(movingIndex + 1) % n];
  const prevPrev = vertices[(movingIndex - 2 + n) % n];
  const nextNext = vertices[(movingIndex + 2) % n];

  let { x, z } = result.position;

  // 1. 隣接頂点 (prev / next) との軸平行（水平・垂直 = ワールド座標での直角壁）スナップ
  if (Math.abs(x - prev.x) <= snapThresholdMm) {
    x = prev.x;
    result.snappedToPrevX = true;
    result.guideLines.push({ from: prev, to: { x, z } });
  } else if (Math.abs(x - next.x) <= snapThresholdMm) {
    x = next.x;
    result.snappedToNextX = true;
    result.guideLines.push({ from: next, to: { x, z } });
  }

  if (Math.abs(z - prev.z) <= snapThresholdMm) {
    z = prev.z;
    result.snappedToPrevZ = true;
    result.guideLines.push({ from: prev, to: { x, z } });
  } else if (Math.abs(z - next.z) <= snapThresholdMm) {
    z = next.z;
    result.snappedToNextZ = true;
    result.guideLines.push({ from: next, to: { x, z } });
  }

  // 2. 前の壁セグメント (prevPrev -> prev) に対して90°になる直線への射影スナップ
  if (!result.snappedToPrevX && !result.snappedToPrevZ) {
    const pdx = prev.x - prevPrev.x;
    const pdz = prev.z - prevPrev.z;
    const plen = Math.hypot(pdx, pdz);
    if (plen > 1e-3) {
      const nx = -pdz / plen;
      const nz = pdx / plen;
      const vx = x - prev.x;
      const vz = z - prev.z;
      const proj = vx * nx + vz * nz;
      const perpX = prev.x + proj * nx;
      const perpZ = prev.z + proj * nz;
      if (Math.hypot(x - perpX, z - perpZ) <= snapThresholdMm) {
        x = Math.round(perpX);
        z = Math.round(perpZ);
        result.snappedPerpendicularPrev = true;
        result.guideLines.push({ from: prev, to: { x, z } });
      }
    }
  }

  // 3. 次の壁セグメント (nextNext -> next) に対して90°になる直線への射影スナップ
  if (!result.snappedToNextX && !result.snappedToNextZ) {
    const ndx = next.x - nextNext.x;
    const ndz = next.z - nextNext.z;
    const nlen = Math.hypot(ndx, ndz);
    if (nlen > 1e-3) {
      const nx = -ndz / nlen;
      const nz = ndx / nlen;
      const vx = x - next.x;
      const vz = z - next.z;
      const proj = vx * nx + vz * nz;
      const perpX = next.x + proj * nx;
      const perpZ = next.z + proj * nz;
      if (Math.hypot(x - perpX, z - perpZ) <= snapThresholdMm) {
        x = Math.round(perpX);
        z = Math.round(perpZ);
        result.snappedPerpendicularNext = true;
        result.guideLines.push({ from: next, to: { x, z } });
      }
    }
  }

  result.position = { x, z };
  return result;
}

/**
 * 2Dレイ (origin + t * dir, t >= 0) と線分 (segA -> segB) の交点を求める
 */
function intersectRaySegment2D(
  origin: Vector2D,
  dir: Vector2D,
  segA: Vector2D,
  segB: Vector2D
): { distance: number; point: Vector2D } | null {
  const vx = segB.x - segA.x;
  const vz = segB.z - segA.z;

  const det = dir.x * vz - dir.z * vx;
  if (Math.abs(det) < 1e-7) return null;

  const dx = segA.x - origin.x;
  const dz = segA.z - origin.z;

  const t = (dx * vz - dz * vx) / det;
  const u = (dx * dir.z - dz * dir.x) / det;

  if (t >= -1e-3 && u >= -1e-4 && u <= 1 + 1e-4) {
    const clampedT = Math.max(0, t);
    return {
      distance: clampedT,
      point: {
        x: origin.x + dir.x * clampedT,
        z: origin.z + dir.z * clampedT,
      },
    };
  }
  return null;
}

/**
 * オブジェクトの前後左右4側面から部屋の壁面までの最短クリアランス距離を計算する
 */
export function computeWallClearances(
  item: FurnitureItem,
  roomVertices: Vector2D[]
): ClearanceDistance[] {
  const n = roomVertices.length;
  if (n < 3) return [];

  const radY = (item.rotation.y * Math.PI) / 180;
  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);

  const halfW = item.dimensions.width / 2;
  const halfD = item.dimensions.depth / 2;
  const displayY = Math.max(20, item.position.y + Math.min(item.dimensions.height / 2, 400));

  const directions: Array<{
    direction: ClearanceDirection;
    label: string;
    localOffset: Vector2D;
    localDir: Vector2D;
  }> = [
    {
      direction: 'front',
      label: '前',
      localOffset: { x: 0, z: halfD },
      localDir: { x: 0, z: 1 },
    },
    {
      direction: 'back',
      label: '後',
      localOffset: { x: 0, z: -halfD },
      localDir: { x: 0, z: -1 },
    },
    {
      direction: 'right',
      label: '右',
      localOffset: { x: halfW, z: 0 },
      localDir: { x: 1, z: 0 },
    },
    {
      direction: 'left',
      label: '左',
      localOffset: { x: -halfW, z: 0 },
      localDir: { x: -1, z: 0 },
    },
  ];

  const results: ClearanceDistance[] = [];

  for (const d of directions) {
    const worldOffsetX = d.localOffset.x * cosY + d.localOffset.z * sinY;
    const worldOffsetZ = -d.localOffset.x * sinY + d.localOffset.z * cosY;

    const worldDirX = d.localDir.x * cosY + d.localDir.z * sinY;
    const worldDirZ = -d.localDir.x * sinY + d.localDir.z * cosY;

    const origin: Vector2D = {
      x: item.position.x + worldOffsetX,
      z: item.position.z + worldOffsetZ,
    };
    const dir: Vector2D = { x: worldDirX, z: worldDirZ };

    let minDistance = Infinity;
    let closestPoint: Vector2D | null = null;
    let hitWallIndex = -1;

    for (let i = 0; i < n; i++) {
      const segA = roomVertices[i];
      const segB = roomVertices[(i + 1) % n];
      const hit = intersectRaySegment2D(origin, dir, segA, segB);
      if (hit && hit.distance < minDistance) {
        minDistance = hit.distance;
        closestPoint = hit.point;
        hitWallIndex = i;
      }
    }

    if (closestPoint && Number.isFinite(minDistance)) {
      results.push({
        direction: d.direction,
        label: d.label,
        fromPoint: { x: origin.x, y: displayY, z: origin.z },
        toWallPoint: { x: closestPoint.x, y: displayY, z: closestPoint.z },
        distanceMm: Math.round(minDistance),
        wallIndex: hitWallIndex,
      });
    }
  }

  return results;
}

/**
 * 家具の水平面上の4頂点（OBB）を取得する
 */
export function getFurnitureFootprintCorners(item: FurnitureItem): Vector2D[] {
  const radY = (item.rotation.y * Math.PI) / 180;
  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);
  const hw = item.dimensions.width / 2;
  const hd = item.dimensions.depth / 2;

  const localCorners: Vector2D[] = [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: -hw, z: hd },
  ];

  return localCorners.map((c) => ({
    x: item.position.x + c.x * cosY + c.z * sinY,
    z: item.position.z - c.x * sinY + c.z * cosY,
  }));
}

/**
 * 家具の3D頂点（8コーナー＋各面の中点）を取得する（測定時のスナップ用）
 */
export function getFurnitureSnapPoints(item: FurnitureItem): Vector3D[] {
  const radY = (item.rotation.y * Math.PI) / 180;
  const cosY = Math.cos(radY);
  const sinY = Math.sin(radY);
  const hw = item.dimensions.width / 2;
  const hd = item.dimensions.depth / 2;
  const minY = item.position.y;
  const maxY = item.position.y + item.dimensions.height;

  const localXz = [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: -hw, z: hd },
    { x: 0, z: -hd },
    { x: 0, z: hd },
    { x: -hw, z: 0 },
    { x: hw, z: 0 },
  ];

  const points: Vector3D[] = [];
  for (const y of [minY, maxY]) {
    for (const xz of localXz) {
      points.push({
        x: Math.round(item.position.x + xz.x * cosY + xz.z * sinY),
        y: Math.round(y),
        z: Math.round(item.position.z - xz.x * sinY + xz.z * cosY),
      });
    }
  }
  return points;
}

/**
 * 測定モード時に、マウス近傍（閾値以内）の家具角や部屋の角頂点にスナップさせる
 */
export function snapMeasurementPoint(
  targetPoint: Vector3D,
  roomVertices: Vector2D[],
  furnitures: FurnitureItem[],
  thresholdMm = 150
): { point: Vector3D; isSnapped: boolean; snapLabel?: string } {
  let closestDist = Infinity;
  let snappedPoint: Vector3D = targetPoint;
  let snapLabel: string | undefined = undefined;

  // 1. 部屋の壁コーナー頂点（床面および天井高）
  for (let i = 0; i < roomVertices.length; i++) {
    const v = roomVertices[i];
    for (const y of [0, 2400]) {
      const d = Math.hypot(targetPoint.x - v.x, targetPoint.y - y, targetPoint.z - v.z);
      if (d <= thresholdMm && d < closestDist) {
        closestDist = d;
        snappedPoint = { x: v.x, y, z: v.z };
        snapLabel = `部屋の角 #${i + 1}`;
      }
    }
  }

  // 2. 各家具のコーナー頂点
  for (const f of furnitures) {
    const fPoints = getFurnitureSnapPoints(f);
    for (const pt of fPoints) {
      const d = Math.hypot(targetPoint.x - pt.x, targetPoint.y - pt.y, targetPoint.z - pt.z);
      if (d <= thresholdMm && d < closestDist) {
        closestDist = d;
        snappedPoint = pt;
        snapLabel = `${f.name}の端`;
      }
    }
  }

  return {
    point: snappedPoint,
    isSnapped: closestDist <= thresholdMm,
    snapLabel,
  };
}

/**
 * 分離軸定理 (SAT) による2つの2D凸四角形 (OBB) の重なり判定
 */
function checkPolygonOverlapSAT(polyA: Vector2D[], polyB: Vector2D[]): boolean {
  const polygons = [polyA, polyB];
  for (const poly of polygons) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];

      const axisX = -(p2.z - p1.z);
      const axisZ = p2.x - p1.x;
      const len = Math.hypot(axisX, axisZ);
      if (len < 1e-6) continue;
      const nx = axisX / len;
      const nz = axisZ / len;

      let minA = Infinity;
      let maxA = -Infinity;
      for (const p of polyA) {
        const proj = p.x * nx + p.z * nz;
        if (proj < minA) minA = proj;
        if (proj > maxA) maxA = proj;
      }

      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of polyB) {
        const proj = p.x * nx + p.z * nz;
        if (proj < minB) minB = proj;
        if (proj > maxB) maxB = proj;
      }

      if (maxA <= minB + 1 || maxB <= minA + 1) {
        return false;
      }
    }
  }
  return true;
}

/**
 * 点が多角形の内部（または境界付近）にあるかを判定する（Ray-casting法）
 */
export function isPointInPolygon(pt: Vector2D, polygon: Vector2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;

    const intersect =
      zi > pt.z !== zj > pt.z &&
      pt.x < ((xj - xi) * (pt.z - zi)) / (zj - zi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * 点と線分の最短距離を求める
 */
function pointToSegmentDistance(pt: Vector2D, a: Vector2D, b: Vector2D): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) return Math.hypot(pt.x - a.x, pt.z - a.z);
  const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.z - a.z) * dz) / lenSq));
  const projX = a.x + t * dx;
  const projZ = a.z + t * dz;
  return Math.hypot(pt.x - projX, pt.z - projZ);
}

/**
 * 家具同士および壁との干渉（衝突）している家具IDセットを計算する
 * カーペット (allowOverlap: true) は他の物体と一切干渉しない
 */
export function computeCollidingFurnitureIds(
  furnitures: FurnitureItem[],
  roomVertices: Vector2D[]
): Set<string> {
  const collidingIds = new Set<string>();

  for (let i = 0; i < furnitures.length; i++) {
    const a = furnitures[i];
    if (a.allowOverlap) continue;

    const cornersA = getFurnitureFootprintCorners(a);
    const minYA = a.position.y;
    const maxYA = a.position.y + a.dimensions.height;

    if (a.presetType !== 'window' && a.presetType !== 'door' && roomVertices.length >= 3) {
      for (const corner of cornersA) {
        const inside = isPointInPolygon(corner, roomVertices);
        if (!inside) {
          let nearWall = false;
          for (let w = 0; w < roomVertices.length; w++) {
            const d = pointToSegmentDistance(
              corner,
              roomVertices[w],
              roomVertices[(w + 1) % roomVertices.length]
            );
            if (d <= 5) {
              nearWall = true;
              break;
            }
          }
          if (!nearWall) {
            collidingIds.add(a.id);
            break;
          }
        }
      }
    }

    for (let j = i + 1; j < furnitures.length; j++) {
      const b = furnitures[j];
      if (b.allowOverlap) continue;

      const minYB = b.position.y;
      const maxYB = b.position.y + b.dimensions.height;

      const yOverlap = maxYA > minYB + 1 && maxYB > minYA + 1;
      if (!yOverlap) continue;

      const cornersB = getFurnitureFootprintCorners(b);
      if (checkPolygonOverlapSAT(cornersA, cornersB)) {
        collidingIds.add(a.id);
        collidingIds.add(b.id);
      }
    }
  }

  return collidingIds;
}

/**
 * 3D空間上の2点間直線距離（mm）を計算する
 */
export function distance3D(a: Vector3D, b: Vector3D): number {
  return Math.round(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
}
