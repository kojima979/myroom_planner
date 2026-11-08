import { z } from 'zod';

export const Vector2DSchema = z.object({
  x: z.number(),
  z: z.number(),
});

export type Vector2D = z.infer<typeof Vector2DSchema>;

export const Vector3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export type Vector3D = z.infer<typeof Vector3DSchema>;

export type WallSegmentInfo = {
  index: number;
  start: Vector2D;
  end: Vector2D;
  midPoint: Vector2D;
  lengthMm: number;
  /** 法線ベクトル（部屋内側向き） */
  normal: Vector2D;
  /** この壁の始点頂点における内角（degree） */
  cornerAngleDeg: number;
  /** 始点コーナーが直角（90°または270°±許容誤差）であるか */
  isRightAngle: boolean;
};

export type ClearanceDirection = 'front' | 'back' | 'left' | 'right';

export type ClearanceDistance = {
  direction: ClearanceDirection;
  label: string;
  fromPoint: Vector3D;
  toWallPoint: Vector3D;
  distanceMm: number;
  wallIndex: number;
};

export const RoomConfigSchema = z.object({
  /** 部屋の床面を構成する多角形の頂点リスト（単位: mm） */
  vertices: z.array(Vector2DSchema).min(3),
  /** 天井の高さ（単位: mm） */
  wallHeight: z.number().min(10).max(20000),
  /** 壁の厚み（単位: mm） */
  wallThickness: z.number().min(10).max(2000),
  /** 床・壁のカラー設定 */
  floorColor: z.string(),
  wallColor: z.string(),
  /** 直角スナップの有効/無効フラグ */
  enableRightAngleSnap: z.boolean(),
  /** 直角（∟ 90°）マーク表示のON/OFFフラグ */
  showRightAngleMarks: z.boolean().optional().default(false),
  /** 壁一辺および壁クリアランス寸法ラベル表示のON/OFFフラグ */
  showDimensionLabels: z.boolean().optional().default(true),
  /** 干渉警告ポップアップの表示秒数（単位: 秒、デフォルト5秒、0で非表示） */
  collisionWarningDurationSec: z.number().min(0).max(300).optional().default(5),
  /** 壁の表示モード（半透明自動/常時表示/非表示） */
  wallVisibility: z.enum(['auto', 'visible', 'hidden']).optional().default('auto'),
});

export type RoomConfig = z.infer<typeof RoomConfigSchema>;

export const FurniturePresetTypeSchema = z.enum([
  'bed',
  'desk',
  'chair',
  'sofa',
  'bookshelf',
  'carpet',
  'refrigerator',
  'kitchen',
  'tv',
  'window',
  'door',
  'box',
  'cylinder',
  'custom_model',
]);

export type FurniturePresetType = z.infer<typeof FurniturePresetTypeSchema>;

export const FurnitureItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  presetType: FurniturePresetTypeSchema,
  /** 寸法（幅・高さ・奥行き、単位: mm） */
  dimensions: z.object({
    width: z.number().min(1).max(30000),
    height: z.number().min(1).max(20000),
    depth: z.number().min(1).max(30000),
  }),
  /** 3D空間上の配置座標（底面中心の座標、単位: mm） */
  position: Vector3DSchema,
  /** オイラー角による回転（単位: degree） */
  rotation: Vector3DSchema,
  color: z.string(),
  /**
   * 他のオブジェクトとの重なり（非干渉）を許可するかどうか
   * カーペット ('carpet') の場合は true
   */
  allowOverlap: z.boolean(),
  /** 外部3Dモデル（GLTF/GLB/OBJ）のデータURL */
  modelDataUrl: z.string().optional(),
  modelFormat: z.enum(['gltf', 'glb', 'obj']).optional(),
  locked: z.boolean().optional(),
});

export type FurnitureItem = z.infer<typeof FurnitureItemSchema>;

export const MeasurementItemSchema = z.object({
  id: z.string(),
  startPoint: Vector3DSchema,
  endPoint: Vector3DSchema,
  distanceMm: z.number(),
  label: z.string().optional(),
});

export type MeasurementItem = z.infer<typeof MeasurementItemSchema>;

export const ProjectDataSchema = z.object({
  version: z.string(),
  room: RoomConfigSchema,
  furnitures: z.array(FurnitureItemSchema),
  measurements: z.array(MeasurementItemSchema),
});

export type ProjectData = z.infer<typeof ProjectDataSchema>;

export type EditorMode = 'furniture' | 'room_edit' | 'measure';

export type CameraMode = '3d' | '2d';

export type TransformGizmoMode = 'translate' | 'rotate';
