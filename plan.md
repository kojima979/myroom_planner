# MyRoom Planner 開発計画書 (plan.md)

## 1. プロジェクト概要
本プロジェクトは、自身の部屋の寸法や形状、および家具・建具の寸法や3Dモデルを自由に入力・配置し、3次元空間上で任意の視点から観察・距離測定ができるWebアプリケーション「MyRoom Planner」を構築するものです。

---

## 2. 技術スタック
型安全性（TypeScriptの`any`排除）と3D描画の保守性・拡張性を重視し、以下の構成を採用します。

- **ビルドツール / フレームワーク**: Vite + React 18 + TypeScript (`strict: true`)
- **3D描画エンジン**: Three.js / `@react-three/fiber` (R3F) / `@react-three/drei`
  - カメラ操作 (`OrbitControls`, `PerspectiveCamera`, `OrthographicCamera`)
  - オブジェクト操作ギズモ (`TransformControls`)
  - 3Dモデルローダー (`GLTFLoader`, `OBJLoader`)
  - 測定・寸法ラベル・補助線表示 (`Html`, `Line`)
- **状態管理**: Zustand（厳密な型定義を用いた軽量・高速なストア管理）
- **スタイリング / UI**: Tailwind CSS + Lucide React（アイコン）
- **ユーティリティ / バリデーション**:
  - `zod`（JSONインポート時のスキーマ検証・型安全性の担保）
  - `uuid`（各要素のユニークID生成）

---

## 3. 主要機能と仕様詳細

### 3.1 部屋の作成・編集機能（多角形・L字型・直角スナップ・常時寸法表示）
- **2Dフロアプラン編集モード / 頂点編集**:
  - 矩形プリセット（幅・奥行きを入力して即座に4頂点を生成）に加え、2Dグリッド上で頂点（`(x, z)` 座標）の追加・移動・削除を行うことで、L字型や任意の多角形部屋を作成可能とします。
- **壁一辺の寸法の常時表示**:
  - 部屋の寸法を設定・編集する際、各壁セグメント（一辺）の長さがいくつであるかを壁の中央付近に常時ラベル表示します。また、数値入力による辺の長さ・頂点座標の直接指定にも対応します。
- **壁面の直角スナップおよび直角ハイライト表示**:
  - 頂点を移動・追加する際、隣接する壁とのなす角が90°（直角）または軸平行（水平・垂直）に近づいた場合（閾値: 例 ±5°以内）、自動的に90°へスナップします。
  - 壁同士が直角（90°）になっている箇所には、コーナーへの直角記号（`∟` マーク）およびガイドラインのハイライト色（緑や水色など）を表示し、直角であることが一目でわかるようにします。
- **高さ・壁の表現**:
  - 部屋の天井高（`height`）を任意の数値（内部はミリメートル単位で統一）で指定可能とします。
  - 外側の視点から部屋内部を観察しやすいよう、カメラ角度に応じた手前の壁の半透明化（または壁の表示/非表示切り替え）を実装します。

### 3.2 家具・建具プリセットと3D配置機能
- **家具・建具のプリセットカタログ**:
  以下のプリセットを用意し、それぞれ一目で種類が判別できる3Dプロシージャル形状（複合メッシュ）と標準的な初期寸法を持たせます。なお、配置後もすべてのプリセットについて寸法（幅 `width`・奥行き `depth`・高さ `height`）および色を任意の値に自由に変更可能です。
  1. **ベッド (`bed`)**: フレーム・マットレス・ヘッドボード・枕で構成される形状（例: 初期値 幅1000 × 奥行2000 × 高さ450 mm）
  2. **机 (`desk`)**: 天板と4本脚で構成される形状（例: 初期値 幅1200 × 奥行600 × 高さ720 mm）
  3. **椅子 (`chair`)**: 座面・背もたれ・脚で構成される形状（例: 初期値 幅480 × 奥行500 × 高さ800 mm）
  4. **ソファー (`sofa`)**: 座面・背もたれ・左右のアームレストで構成される形状（例: 初期値 幅1600 × 奥行800 × 高さ750 mm）
  5. **本棚 (`bookshelf`)**: 外枠・背板・複数の棚板で構成される形状（例: 初期値 幅800 × 奥行300 × 高さ1800 mm）
  6. **カーペット (`carpet`)**: 床面に敷く薄型のラグ形状（例: 初期値 幅2000 × 奥行1400 × 高さ10 mm）
  7. **窓 (`window`)**: 窓枠と半透明ガラスで構成される建具形状（例: 初期値 幅1600 × 奥行120 × 高さ1100 mm、床からの高さ指定対応）
  8. **扉 (`door`)**: ドア枠・ドアパネル・ノブ（および平面視での開閉軌跡表示）で構成される建具形状（例: 初期値 幅800 × 奥行120 × 高さ2000 mm）
  9. **汎用形状 (`box` / `cylinder`)**: 自由な直方体・円柱オブジェクト
- **干渉（衝突）判定とカーペットの重ね置き仕様**:
  - ベッド・机・椅子・ソファー・本棚などの通常オブジェクトは、他の家具や部屋の壁と重なった（干渉した）際に衝突判定を行います（干渉時のハイライト警告表示またはめり込み防止）。
  - **カーペット (`carpet`) は他の物体と干渉しない仕様（`allowOverlap: true`）** とし、カーペットの上にベッド・机・椅子・ソファーなどを自由に重ねて配置可能とします。
- **オブジェクトと壁の間の寸法（クリアランス）常時表示**:
  - 部屋の中にオブジェクト（家具・建具）を配置・選択・移動する際、そのオブジェクトの前後左右（各側面）から対面する壁面までの最短距離（垂線ガイドライン＋距離数値ラベル）をリアルタイムに常時表示します。
  - ユーザーはこの壁までの距離表示を見ながら、ドラッグ操作や数値入力で位置の微調整を行うことができます。
- **外部3Dモデル（GLTF / GLB / OBJ）のインポート**:
  - ローカルの `.glb` / `.gltf` / `.obj` ファイルをドラッグ＆ドロップまたはファイル選択で読み込みます。
  - 読み込んだモデルのバウンディングボックスを自動計算し、任意の目標寸法（幅・奥行き・高さ）へのスケーリングやサイズ調整を可能とします。
- **3次元空間での自由配置・操作**:
  - `TransformControls` を用い、3Dビュー上で移動（X, Y, Z軸）・回転（Y軸および全軸）をマウスドラッグで直感的に操作できるほか、サイドパネルから座標・回転角・寸法を直接数値入力できます。

### 3.3 視点（カメラ）操作機能
- **3D自由視点（パースペクティブ）**:
  - `OrbitControls` により、回転・パン（平行移動）・ズームを自在に行い、任意の角度・高さ（鳥瞰視点〜部屋内部のアイレベル視点）から観察できます。
- **2D真上視点（オルソグラフィック / 間取り図ビュー）**:
  - ワンクリックで真上からの平行投影（2D平面図）に切り替え、全体の配置バランスや壁形状の編集を行えるようにします。

### 3.4 長さ測定機能（メジャー機能）
- **任意の2点間距離の測定**:
  - 上記の自動寸法表示（壁の一辺の長さ、およびオブジェクト〜壁間の距離表示）に加え、「測定モード」を有効にすると、レイキャスティング（Raycasting）により部屋の床・壁・家具・建具の表面（および頂点・エッジ付近）の任意の点をクリックして始点 `P1` と終点 `P2` を指定できます。
  - 始点からマウスカーソル位置までのプレビュー線と距離をリアルタイム表示し、2点確定時に3D空間上に測定ラインと距離ラベル（直線距離 `d`、および必要に応じて `ΔX, ΔY, ΔZ` 成分）を描画します。
  - 複数の測定ラインを保持・一覧表示し、個別に削除または全消去できます。

### 3.5 データの保存・読み込み（エクスポート / インポート）
- **JSONファイルによるエクスポート / インポート**:
  - 部屋の頂点データ、高さ、配置済み家具・建具リスト（種類・座標・寸法・回転・色・干渉設定・モデル参照情報）、測定データを含むプロジェクト全体を `.json` ファイルとして書き出し・読み込みできます。
  - インポート時は `zod` スキーマで型検証を行い、不正なデータによるクラッシュを防止します。

---

## 4. データ構造設計（TypeScript 型定義案）

`any` を一切使用せず、以下のような厳密な型定義を `src/types/room.ts` に設けます。

```typescript
export type Vector2D = {
  x: number;
  z: number;
};

export type Vector3D = {
  x: number;
  y: number;
  z: number;
};

export type WallSegmentInfo = {
  index: number;
  start: Vector2D;
  end: Vector2D;
  lengthMm: number;
  /** 前の壁セグメントとのなす角（degree） */
  cornerAngleDeg: number;
  /** 直角（90°±許容誤差）であるか */
  isRightAngle: boolean;
};

export type ClearanceDistance = {
  direction: 'front' | 'back' | 'left' | 'right';
  fromPoint: Vector3D;
  toWallPoint: Vector3D;
  distanceMm: number;
};

export type RoomConfig = {
  /** 部屋の床面を構成する多角形の頂点リスト（単位: mm） */
  vertices: Vector2D[];
  /** 天井の高さ（単位: mm） */
  wallHeight: number;
  /** 壁の厚み（単位: mm） */
  wallThickness: number;
  /** 床・壁のカラー設定 */
  floorColor: string;
  wallColor: string;
  /** 直角スナップの有効/無効フラグ */
  enableRightAngleSnap: boolean;
};

export type FurniturePresetType =
  | 'bed'
  | 'desk'
  | 'chair'
  | 'sofa'
  | 'bookshelf'
  | 'carpet'
  | 'window'
  | 'door'
  | 'box'
  | 'cylinder'
  | 'custom_model';

export type FurnitureItem = {
  id: string;
  name: string;
  presetType: FurniturePresetType;
  /** 寸法（幅・高さ・奥行き、単位: mm） */
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  /** 3D空間上の配置座標（単位: mm） */
  position: Vector3D;
  /** オイラー角による回転（単位: degree） */
  rotation: Vector3D;
  color: string;
  /**
   * 他のオブジェクトとの重なり（非干渉）を許可するかどうか
   * カーペット ('carpet') の場合はデフォルトで true
   */
  allowOverlap: boolean;
  /** 外部3Dモデル（GLTF/GLB/OBJ）のデータURLまたはオブジェクトURL */
  modelDataUrl?: string;
  modelFormat?: 'gltf' | 'glb' | 'obj';
  locked?: boolean;
};

export type MeasurementItem = {
  id: string;
  startPoint: Vector3D;
  endPoint: Vector3D;
  distanceMm: number;
  label?: string;
};

export type ProjectData = {
  version: string;
  room: RoomConfig;
  furnitures: FurnitureItem[];
  measurements: MeasurementItem[];
};
```

---

## 5. ディレクトリ構成案

```text
myroom_planner/
├── public/
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── SceneCanvas.tsx             # Three.js Canvas・カメラ・ライト制御
│   │   │   ├── RoomMesh.tsx                # 多角形の床・壁メッシュ生成と壁一辺の常時寸法ラベル描画
│   │   │   ├── FurnitureMesh.tsx           # 家具・建具の描画・衝突表示・ギズモ制御
│   │   │   ├── WallClearanceGuides.tsx     # オブジェクト〜壁間の距離（クリアランス）常時表示コンポーネント
│   │   │   ├── PresetGeometries.tsx        # ベッド・机・椅子・ソファー・本棚・カーペット・窓・扉の3D形状コンポーネント
│   │   │   ├── MeasurementLayer.tsx        # 任意の2点間クリック判定・測定ライン＆ラベル描画
│   │   │   └── FloorPlanPolygonEditor.tsx  # 部屋の頂点編集・直角スナップ・直角ハイライト（∟マーク）描画
│   │   ├── ui/
│   │   │   ├── HeaderToolbar.tsx           # モード切替（配置/部屋編集/測定）・視点切替・JSON入出力
│   │   │   ├── LeftSidebar.tsx             # 部屋設定・プリセット家具追加・3Dモデルインポート・一覧
│   │   │   └── RightInspector.tsx          # 選択中の家具・壁寸法・頂点・測定リストの詳細数値編集パネル
│   ├── constants/
│   │   └── presets.ts                      # 各プリセットの初期寸法・色・非干渉設定（カーペット等）の定義
│   ├── store/
│   │   └── useRoomStore.ts                 # Zustandによる状態管理・アクション定義
│   ├── types/
│   │   └── room.ts                         # 型定義およびZodスキーマ
│   ├── utils/
│   │   ├── geometry.ts                     # 壁長・直角スナップ計算・オブジェクト〜壁間距離計算・OBB干渉判定
│   │   └── fileIo.ts                       # JSONエクスポート/インポート・モデルファイル読み込み
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 6. 開発フェーズ（実装ステップ）

1. **Phase 1: 環境構築とGitブランチ作成**
   - Gitリポジトリの初期化および作業用トピックブランチ（例: `feat/initial-setup`）の作成。
   - Vite + React + TypeScript + Tailwind CSS + Three.js (`@react-three/fiber`, `@react-three/drei`, `zustand`, `zod`) の導入。
2. **Phase 2: コアデータストアと多角形部屋の3D描画・壁寸法表示・直角スナップ**
   - `useRoomStore` の実装。
   - 任意の頂点配列から床メッシュ・壁メッシュを生成する [`RoomMesh.tsx`](file:///Users/hiroyoshikojima/hobby/myroom_planner/src/components/canvas/RoomMesh.tsx) と、**各壁一辺の寸法ラベルの常時表示**の実装。
   - 頂点編集時の**直角スナップ処理および直角時のハイライト表示（`∟` マーク・強調色）**を行う [`FloorPlanPolygonEditor.tsx`](file:///Users/hiroyoshikojima/hobby/myroom_planner/src/components/canvas/FloorPlanPolygonEditor.tsx) の実装。
3. **Phase 3: 家具・建具プリセット・干渉判定・壁との距離（クリアランス）常時表示**
   - ベッド・机・椅子・ソファー・本棚・カーペット・窓・扉のプリセット定義（`presets.ts`）およびプロシージャル3D形状（`PresetGeometries.tsx`）の実装。
   - OBBを用いた家具同士・壁との干渉判定と、カーペット（`allowOverlap: true`）を干渉対象外として重ね置き可能にする処理の実装。
   - **オブジェクト配置・移動時に、オブジェクト各側面から壁面までの距離ラインと寸法ラベルをリアルタイム常時表示する [`WallClearanceGuides.tsx`](file:///Users/hiroyoshikojima/hobby/myroom_planner/src/components/canvas/WallClearanceGuides.tsx)** の実装。
   - `.glb` / `.gltf` / `.obj` インポート機能、3Dギズモとサイドパネル数値入力の双方向同期。
4. **Phase 4: 任意の2点間長さ測定（メジャー）機能**
   - 測定モード時のRaycasting処理により、床・壁・家具表面上のクリック位置を取得し、3Dラインと距離ラベル（mm / cm 表記）を描画・管理する [`MeasurementLayer.tsx`](file:///Users/hiroyoshikojima/hobby/myroom_planner/src/components/canvas/MeasurementLayer.tsx) の実装。
5. **Phase 5: カメラ視点切り替えとJSONエクスポート・インポート**
   - 自由3D視点 / 真上2D視点のスムーズな切り替え、手前の壁の透過表示制御。
   - `zod` バリデーション付きのJSON保存・読込機能の実装と全体動作検証。
