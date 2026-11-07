import { FurniturePresetType } from '../types/room';

export type FurniturePresetDefinition = {
  presetType: FurniturePresetType;
  label: string;
  category: 'furniture' | 'fixture' | 'basic';
  description: string;
  defaultDimensions: {
    width: number;
    height: number;
    depth: number;
  };
  defaultY: number;
  defaultColor: string;
  allowOverlap: boolean;
};

export const FURNITURE_PRESETS: FurniturePresetDefinition[] = [
  {
    presetType: 'bed',
    label: 'ベッド',
    category: 'furniture',
    description: 'シングル〜ダブル等、寸法変更可能なベッド',
    defaultDimensions: {
      width: 1000,
      height: 500,
      depth: 2000,
    },
    defaultY: 0,
    defaultColor: '#60a5fa',
    allowOverlap: false,
  },
  {
    presetType: 'desk',
    label: '机（デスク）',
    category: 'furniture',
    description: '天板と4本脚のワークデスク・テーブル',
    defaultDimensions: {
      width: 1200,
      height: 720,
      depth: 600,
    },
    defaultY: 0,
    defaultColor: '#d97706',
    allowOverlap: false,
  },
  {
    presetType: 'chair',
    label: '椅子（チェア）',
    category: 'furniture',
    description: '座面・背もたれ・脚付きのチェア',
    defaultDimensions: {
      width: 500,
      height: 820,
      depth: 520,
    },
    defaultY: 0,
    defaultColor: '#334155',
    allowOverlap: false,
  },
  {
    presetType: 'sofa',
    label: 'ソファー',
    category: 'furniture',
    description: '背もたれ・アームレスト付きのソファー',
    defaultDimensions: {
      width: 1600,
      height: 760,
      depth: 800,
    },
    defaultY: 0,
    defaultColor: '#10b981',
    allowOverlap: false,
  },
  {
    presetType: 'bookshelf',
    label: '本棚（シェルフ）',
    category: 'furniture',
    description: '複数段の棚板を持つ収納棚',
    defaultDimensions: {
      width: 800,
      height: 1800,
      depth: 300,
    },
    defaultY: 0,
    defaultColor: '#92400e',
    allowOverlap: false,
  },
  {
    presetType: 'carpet',
    label: 'カーペット（ラグ）',
    category: 'furniture',
    description: '他の家具と干渉せず重ねて配置可能な床敷物',
    defaultDimensions: {
      width: 2000,
      height: 12,
      depth: 1400,
    },
    defaultY: 0,
    defaultColor: '#a78bfa',
    allowOverlap: true,
  },
  {
    presetType: 'window',
    label: '窓',
    category: 'fixture',
    description: '壁面に配置する窓枠・ガラス建具',
    defaultDimensions: {
      width: 1600,
      height: 1100,
      depth: 140,
    },
    defaultY: 900,
    defaultColor: '#38bdf8',
    allowOverlap: false,
  },
  {
    presetType: 'door',
    label: '扉（ドア）',
    category: 'fixture',
    description: '開閉軌跡ガイド付きの室内ドア建具',
    defaultDimensions: {
      width: 800,
      height: 2000,
      depth: 140,
    },
    defaultY: 0,
    defaultColor: '#b45309',
    allowOverlap: false,
  },
  {
    presetType: 'box',
    label: '直方体ボックス',
    category: 'basic',
    description: '任意の家電・収納箱などを表現できる汎用直方体',
    defaultDimensions: {
      width: 600,
      height: 600,
      depth: 600,
    },
    defaultY: 0,
    defaultColor: '#94a3b8',
    allowOverlap: false,
  },
  {
    presetType: 'cylinder',
    label: '円柱オブジェクト',
    category: 'basic',
    description: '丸テーブル・スツール・観葉植物鉢などの円柱形状',
    defaultDimensions: {
      width: 600,
      height: 700,
      depth: 600,
    },
    defaultY: 0,
    defaultColor: '#cbd5e1',
    allowOverlap: false,
  },
];
