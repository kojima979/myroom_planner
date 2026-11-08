import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  CameraMode,
  EditorMode,
  FurnitureItem,
  FurniturePresetType,
  MeasurementItem,
  ProjectData,
  RoomConfig,
  TransformGizmoMode,
  Vector2D,
  Vector3D,
} from '../types/room';
import { FURNITURE_PRESETS } from '../constants/presets';
import { distance3D } from '../utils/geometry';

const INITIAL_ROOM: RoomConfig = {
  // 初期状態: 幅 3600mm (3.6m) × 奥行 2700mm (2.7m) の約6畳の部屋
  vertices: [
    { x: -1800, z: -1350 },
    { x: 1800, z: -1350 },
    { x: 1800, z: 1350 },
    { x: -1800, z: 1350 },
  ],
  wallHeight: 2400,
  wallThickness: 120,
  floorColor: '#e2d5c3',
  wallColor: '#f8fafc',
  enableRightAngleSnap: true,
  showRightAngleMarks: false,
  showDimensionLabels: true,
  collisionWarningDurationSec: 2,
  wallVisibility: 'auto',
};

const INITIAL_FURNITURES: FurnitureItem[] = [
  {
    id: 'preset-carpet-1',
    name: 'カーペット（ラグ）',
    presetType: 'carpet',
    dimensions: { width: 2000, height: 12, depth: 1400 },
    position: { x: 200, y: 0, z: 100 },
    rotation: { x: 0, y: 0, z: 0 },
    color: '#a78bfa',
    allowOverlap: true,
  },
  {
    id: 'preset-bed-1',
    name: 'シングルベッド',
    presetType: 'bed',
    dimensions: { width: 1000, height: 500, depth: 2000 },
    position: { x: -1200, y: 0, z: -250 },
    rotation: { x: 0, y: 0, z: 0 },
    color: '#60a5fa',
    allowOverlap: false,
  },
  {
    id: 'preset-desk-1',
    name: 'デスク',
    presetType: 'desk',
    dimensions: { width: 1200, height: 720, depth: 600 },
    position: { x: 900, y: 0, z: -950 },
    rotation: { x: 0, y: 0, z: 0 },
    color: '#d97706',
    allowOverlap: false,
  },
  {
    id: 'preset-chair-1',
    name: 'デスクチェア',
    presetType: 'chair',
    dimensions: { width: 500, height: 820, depth: 520 },
    position: { x: 900, y: 0, z: -350 },
    rotation: { x: 0, y: 180, z: 0 },
    color: '#334155',
    allowOverlap: true,
  },
  {
    id: 'preset-bookshelf-1',
    name: '本棚',
    presetType: 'bookshelf',
    dimensions: { width: 800, height: 1800, depth: 300 },
    position: { x: 1350, y: 0, z: 750 },
    rotation: { x: 0, y: -90, z: 0 },
    color: '#92400e',
    allowOverlap: false,
  },
  {
    id: 'preset-door-1',
    name: '室内ドア',
    presetType: 'door',
    dimensions: { width: 800, height: 2000, depth: 140 },
    position: { x: -900, y: 0, z: 1350 },
    rotation: { x: 0, y: 180, z: 0 },
    color: '#b45309',
    allowOverlap: false,
  },
  {
    id: 'preset-window-1',
    name: '腰高窓',
    presetType: 'window',
    dimensions: { width: 1600, height: 1100, depth: 140 },
    position: { x: 200, y: 900, z: -1350 },
    rotation: { x: 0, y: 0, z: 0 },
    color: '#38bdf8',
    allowOverlap: false,
  },
];

export type RoomStoreState = {
  room: RoomConfig;
  furnitures: FurnitureItem[];
  measurements: MeasurementItem[];
  selectedFurnitureId: string | null;
  selectedVertexIndex: number | null;
  editorMode: EditorMode;
  cameraMode: CameraMode;
  gizmoMode: TransformGizmoMode;
  isDraggingGizmo: boolean;
  pendingMeasurementStart: Vector3D | null;
  hoverMeasurementPoint: Vector3D | null;
  furnitureContextMenu: { furnitureId: string; x: number; y: number } | null;

  // Context menu actions
  openFurnitureContextMenu: (furnitureId: string, x: number, y: number) => void;
  closeFurnitureContextMenu: () => void;

  // Room actions
  updateRoomConfig: (partial: Partial<RoomConfig>) => void;
  setRectangularRoomDimensions: (widthMm: number, depthMm: number) => void;
  setLShapedRoomPreset: () => void;
  updateVertexPosition: (index: number, pos: Vector2D) => void;
  addVertexOnWall: (wallIndex: number) => void;
  removeVertex: (index: number) => void;
  updateWallSegmentLength: (wallIndex: number, newLengthMm: number) => void;

  // Furniture actions
  addPresetFurniture: (presetType: FurniturePresetType) => void;
  addCustomModelFurniture: (
    name: string,
    dataUrl: string,
    format: 'gltf' | 'glb' | 'obj',
    dimensions?: { width: number; height: number; depth: number }
  ) => void;
  updateFurniture: (id: string, partial: Partial<FurnitureItem>) => void;
  updateFurnitureDimensions: (
    id: string,
    dimensions: Partial<FurnitureItem['dimensions']>
  ) => void;
  updateFurniturePosition: (id: string, position: Partial<Vector3D>) => void;
  updateFurnitureRotation: (id: string, rotation: Partial<Vector3D>) => void;
  removeFurniture: (id: string) => void;
  duplicateFurniture: (id: string) => void;
  selectFurniture: (id: string | null) => void;
  selectVertex: (index: number | null) => void;

  // Mode & Camera actions
  setEditorMode: (mode: EditorMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setGizmoMode: (mode: TransformGizmoMode) => void;
  setIsDraggingGizmo: (isDragging: boolean) => void;

  // Measurement actions
  handleMeasurementClick: (point: Vector3D) => void;
  setHoverMeasurementPoint: (point: Vector3D | null) => void;
  cancelPendingMeasurement: () => void;
  removeMeasurement: (id: string) => void;
  clearMeasurements: () => void;

  // Project Export/Import
  getProjectData: () => ProjectData;
  loadProjectData: (data: ProjectData) => void;
};

export const useRoomStore = create<RoomStoreState>((set, get) => ({
  room: INITIAL_ROOM,
  furnitures: INITIAL_FURNITURES,
  measurements: [],
  selectedFurnitureId: 'preset-bed-1',
  selectedVertexIndex: null,
  editorMode: 'furniture',
  cameraMode: '3d',
  gizmoMode: 'translate',
  isDraggingGizmo: false,
  pendingMeasurementStart: null,
  hoverMeasurementPoint: null,
  furnitureContextMenu: null,

  openFurnitureContextMenu: (furnitureId, x, y) =>
    set({
      furnitureContextMenu: { furnitureId, x, y },
    }),

  closeFurnitureContextMenu: () =>
    set({
      furnitureContextMenu: null,
    }),

  updateRoomConfig: (partial) =>
    set((state) => ({
      room: { ...state.room, ...partial },
    })),

  setRectangularRoomDimensions: (widthMm, depthMm) => {
    const hw = Math.max(10, Math.round(widthMm / 2));
    const hd = Math.max(10, Math.round(depthMm / 2));
    set((state) => ({
      room: {
        ...state.room,
        vertices: [
          { x: -hw, z: -hd },
          { x: hw, z: -hd },
          { x: hw, z: hd },
          { x: -hw, z: hd },
        ],
      },
      selectedVertexIndex: null,
    }));
  },

  setLShapedRoomPreset: () => {
    set((state) => ({
      room: {
        ...state.room,
        vertices: [
          { x: -2000, z: -1800 },
          { x: 2000, z: -1800 },
          { x: 2000, z: 200 },
          { x: 200, z: 200 },
          { x: 200, z: 1800 },
          { x: -2000, z: 1800 },
        ],
      },
      selectedVertexIndex: null,
    }));
  },

  updateVertexPosition: (index, pos) =>
    set((state) => {
      if (index < 0 || index >= state.room.vertices.length) return state;
      const nextVertices = state.room.vertices.map((v, idx) =>
        idx === index ? { x: Math.round(pos.x), z: Math.round(pos.z) } : v
      );
      return {
        room: { ...state.room, vertices: nextVertices },
      };
    }),

  addVertexOnWall: (wallIndex) =>
    set((state) => {
      const verts = state.room.vertices;
      if (wallIndex < 0 || wallIndex >= verts.length) return state;
      const curr = verts[wallIndex];
      const next = verts[(wallIndex + 1) % verts.length];
      const mid: Vector2D = {
        x: Math.round((curr.x + next.x) / 2),
        z: Math.round((curr.z + next.z) / 2),
      };
      const nextVertices = [
        ...verts.slice(0, wallIndex + 1),
        mid,
        ...verts.slice(wallIndex + 1),
      ];
      return {
        room: { ...state.room, vertices: nextVertices },
        selectedVertexIndex: wallIndex + 1,
      };
    }),

  removeVertex: (index) =>
    set((state) => {
      if (state.room.vertices.length <= 3) return state;
      const nextVertices = state.room.vertices.filter((_, idx) => idx !== index);
      return {
        room: { ...state.room, vertices: nextVertices },
        selectedVertexIndex: null,
      };
    }),

  updateWallSegmentLength: (wallIndex, newLengthMm) =>
    set((state) => {
      const verts = state.room.vertices;
      const n = verts.length;
      if (wallIndex < 0 || wallIndex >= n || newLengthMm < 10) return state;

      const start = verts[wallIndex];
      const endIndex = (wallIndex + 1) % n;
      const end = verts[endIndex];

      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const currentLen = Math.hypot(dx, dz);
      if (currentLen < 1e-3) return state;

      const ux = dx / currentLen;
      const uz = dz / currentLen;

      const newEnd: Vector2D = {
        x: Math.round(start.x + ux * newLengthMm),
        z: Math.round(start.z + uz * newLengthMm),
      };

      const nextVertices = verts.map((v, idx) => (idx === endIndex ? newEnd : v));
      return {
        room: { ...state.room, vertices: nextVertices },
      };
    }),

  addPresetFurniture: (presetType) => {
    const preset = FURNITURE_PRESETS.find((p) => p.presetType === presetType);
    if (!preset) return;

    const newItem: FurnitureItem = {
      id: uuidv4(),
      name: preset.label,
      presetType: preset.presetType,
      dimensions: { ...preset.defaultDimensions },
      position: { x: 0, y: preset.defaultY, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: preset.defaultColor,
      allowOverlap: preset.allowOverlap,
    };

    set((state) => ({
      furnitures: [...state.furnitures, newItem],
      selectedFurnitureId: newItem.id,
      editorMode: 'furniture',
    }));
  },

  addCustomModelFurniture: (
    name,
    dataUrl,
    format,
    dimensions = { width: 800, height: 800, depth: 800 }
  ) => {
    const newItem: FurnitureItem = {
      id: uuidv4(),
      name,
      presetType: 'custom_model',
      dimensions,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      color: '#cbd5e1',
      allowOverlap: false,
      modelDataUrl: dataUrl,
      modelFormat: format,
    };

    set((state) => ({
      furnitures: [...state.furnitures, newItem],
      selectedFurnitureId: newItem.id,
      editorMode: 'furniture',
    }));
  },

  updateFurniture: (id, partial) =>
    set((state) => ({
      furnitures: state.furnitures.map((item) =>
        item.id === id ? { ...item, ...partial } : item
      ),
    })),

  updateFurnitureDimensions: (id, dimensions) =>
    set((state) => ({
      furnitures: state.furnitures.map((item) =>
        item.id === id
          ? {
              ...item,
              dimensions: {
                ...item.dimensions,
                ...dimensions,
              },
            }
          : item
      ),
    })),

  updateFurniturePosition: (id, position) =>
    set((state) => ({
      furnitures: state.furnitures.map((item) =>
        item.id === id
          ? {
              ...item,
              position: {
                ...item.position,
                ...position,
              },
            }
          : item
      ),
    })),

  updateFurnitureRotation: (id, rotation) =>
    set((state) => ({
      furnitures: state.furnitures.map((item) =>
        item.id === id
          ? {
              ...item,
              rotation: {
                ...item.rotation,
                ...rotation,
              },
            }
          : item
      ),
    })),

  removeFurniture: (id) =>
    set((state) => ({
      furnitures: state.furnitures.filter((item) => item.id !== id),
      selectedFurnitureId: state.selectedFurnitureId === id ? null : state.selectedFurnitureId,
      furnitureContextMenu: null,
    })),

  duplicateFurniture: (id) =>
    set((state) => {
      const target = state.furnitures.find((item) => item.id === id);
      if (!target) return state;
      const duplicated: FurnitureItem = {
        ...target,
        id: uuidv4(),
        name: `${target.name} (複製)`,
        position: {
          x: target.position.x + 200,
          y: target.position.y,
          z: target.position.z + 200,
        },
      };
      return {
        furnitures: [...state.furnitures, duplicated],
        selectedFurnitureId: duplicated.id,
        furnitureContextMenu: null,
      };
    }),

  selectFurniture: (id) => set({ selectedFurnitureId: id }),

  selectVertex: (index) => set({ selectedVertexIndex: index }),

  setEditorMode: (mode) =>
    set({
      editorMode: mode,
      pendingMeasurementStart: null,
      hoverMeasurementPoint: null,
    }),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  setGizmoMode: (mode) => set({ gizmoMode: mode }),

  setIsDraggingGizmo: (isDragging) => set({ isDraggingGizmo: isDragging }),

  handleMeasurementClick: (point) =>
    set((state) => {
      const roundedPoint: Vector3D = {
        x: Math.round(point.x),
        y: Math.round(point.y),
        z: Math.round(point.z),
      };
      if (!state.pendingMeasurementStart) {
        return {
          pendingMeasurementStart: roundedPoint,
          hoverMeasurementPoint: roundedPoint,
        };
      }
      const dist = distance3D(state.pendingMeasurementStart, roundedPoint);
      if (dist < 1) {
        return state;
      }
      const newMeasurement: MeasurementItem = {
        id: uuidv4(),
        startPoint: state.pendingMeasurementStart,
        endPoint: roundedPoint,
        distanceMm: dist,
      };
      return {
        measurements: [...state.measurements, newMeasurement],
        pendingMeasurementStart: null,
        hoverMeasurementPoint: null,
      };
    }),

  setHoverMeasurementPoint: (point) => set({ hoverMeasurementPoint: point }),

  cancelPendingMeasurement: () =>
    set({ pendingMeasurementStart: null, hoverMeasurementPoint: null }),

  removeMeasurement: (id) =>
    set((state) => ({
      measurements: state.measurements.filter((m) => m.id !== id),
    })),

  clearMeasurements: () =>
    set({
      measurements: [],
      pendingMeasurementStart: null,
      hoverMeasurementPoint: null,
    }),

  getProjectData: () => {
    const state = get();
    return {
      version: '1.0.0',
      room: state.room,
      furnitures: state.furnitures,
      measurements: state.measurements,
    };
  },

  loadProjectData: (data) =>
    set({
      room: data.room,
      furnitures: data.furnitures,
      measurements: data.measurements,
      selectedFurnitureId: null,
      selectedVertexIndex: null,
      pendingMeasurementStart: null,
      hoverMeasurementPoint: null,
    }),
}));
