# MyRoom Planner 開発計画書 (plan.md)

## 1. プロジェクト概要
本プロジェクトは、自身の部屋の寸法や形状、および家具・建具の寸法や3Dモデルを自由に入力・配置し、3次元空間上で任意の視点から観察・距離測定ができるWebアプリケーション「MyRoom Planner」を構築するものです。
また、検討したレイアウトを施工・搬入・記録用として活用できるよう、くっきりと見やすい2D平面図（寸法入り）と配置家具・建具のサイズ一覧表を印刷・PDF出力できる機能を備えます。

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
- **印刷制御**: CSS `@media print` + SVG/Canvas 2Dレンダリング（白背景・高コントラスト建築図面調）
- **ユーティリティ / バリデーション**:
  - `zod`（JSONインポート時のスキーマ検証・型安全性の担保）
  - `uuid`（各要素のユニークID生成）

---

## 3. 主要機能と仕様詳細

### 3.1 部屋の作成・編集機能（多角形・L字型・直角スナップ・常時寸法表示）
- **2Dフロアプラン編集モード / 頂点編集**:
  - 矩形プリセット（幅・奥行きを入力して即座に4頂点を生成）に加え、2Dグリッド上で頂点（`(x, z)` 座標）の追加・ドラッグ移動・削除を行うことで、L字型や任意の多角形部屋を作成可能とします。
- **壁一辺の寸法の常時表示**:
  - 部屋の寸法を設定・編集する際、各壁セグメント（一辺）の長さがいくつであるかを壁の中央付近に常時ラベル表示します。また、数値入力による辺の長さ・頂点座標の直接指定にも対応します。
- **壁面の直角スナップおよび直角ハイライト表示（ON/OFF切替対応）**:
  - 頂点をドラッグ移動する際、隣接する壁とのなす角が90°（直角）または軸平行（水平・垂直）に近づいた場合、自動的に90°へスナップします。
  - 壁同士が直角（90°）になっている箇所には、コーナーへの直角記号（`∟` マーク）およびガイドラインのハイライト色を表示でき、視認性に応じて表示のON/OFFを切り替え可能とします。
- **高さ・壁の表現**:
  - 部屋の天井高（`height`）を任意の数値（内部はミリメートル単位で統一）で指定可能とします。
  - 外側の視点から部屋内部を観察しやすいよう、カメラ角度に応じた手前の壁の半透明化（または壁の表示/非表示切り替え）を実装します。

### 3.2 家具・建具プリセットと3D配置機能
- **家具・建具のプリセットカタログ**:
  以下のプリセットを用意し、それぞれ一目で種類が判別できる3Dプロシージャル形状（複合メッシュ）と標準的な初期寸法を持たせます。なお、配置後もすべてのプリセットについて寸法（幅 `width`・奥行き `depth`・高さ `height`）および色を任意の値に自由に変更可能です。
  1. **ベッド (`bed`)**: フレーム・マットレス・ヘッドボード・枕で構成される形状（例: 初期値 幅1000 × 奥行2000 × 高さ500 mm）
  2. **机 (`desk`)**: 天板と4本脚で構成される形状（例: 初期値 幅1200 × 奥行600 × 高さ720 mm）
  3. **椅子 (`chair`)**: 座面・背もたれ・脚で構成される形状。机の下に格納できるよう他のオブジェクトと干渉しない非干渉仕様（`allowOverlap: true`）（例: 初期値 幅500 × 奥行520 × 高さ820 mm）
  4. **ソファー (`sofa`)**: 座面・背もたれ・左右のアームレストで構成される形状（例: 初期値 幅1600 × 奥行800 × 高さ760 mm）
  5. **本棚 (`bookshelf`)**: 外枠・背板・複数の棚板で構成される形状（例: 初期値 幅800 × 奥行300 × 高さ1800 mm）
  6. **カーペット (`carpet`)**: 床面に敷く薄型のラグ形状。他のオブジェクトと干渉しない非干渉仕様（`allowOverlap: true`）（例: 初期値 幅2000 × 奥行1400 × 高さ12 mm）
  7. **冷蔵庫 (`refrigerator`)**: ドアスリットやハンドルを備えた冷蔵庫（例: 初期値 幅600 × 奥行650 × 高さ1800 mm）
  8. **システムキッチン (`kitchen`)**: シンク・水栓・コンロ・作業台・キャビネットを備えたキッチン設備（例: 初期値 幅2100 × 奥行650 × 高さ850 mm）
  9. **テレビ（モニタ） (`tv`)**: スタンド付き薄型ディスプレイパネル・モニタ（例: 初期値 幅1100 × 奥行250 × 高さ700 mm）
  10. **豆型ダイニングテーブル (`bean_table`)**: オーガニックな豆型天板と丸テーパー脚で構成される北欧調ダイニングテーブル（例: 初期値 幅1400 × 奥行850 × 高さ720 mm）
  11. **窓 (`window`)**: 窓枠と半透明ガラスで構成される建具形状（例: 初期値 幅1600 × 奥行140 × 高さ1100 mm、床からの高さ指定対応）
  12. **扉 (`door`)**: ドア枠・ドアパネル・ノブ・開閉軌跡ガイドで構成される建具形状（例: 初期値 幅800 × 奥行140 × 高さ2000 mm）
  13. **汎用形状 (`box` / `cylinder`)**: 自由な直方体・円柱オブジェクト
- **干渉（衝突）判定とカーペット・椅子の重ね置き仕様**:
  - 通常オブジェクト同士や壁と重なった場合は、衝突判定を行い赤くハイライト表示します。また、干渉発生時の警告ポップアップは視界を妨げないようデフォルトで表示から2秒後に自動消去され、表示秒数はパラメータ（0秒で非表示〜任意の秒数）で変更可能とします。
  - **カーペット (`carpet`) および 椅子 (`chair`) は他の物体と干渉しない仕様（`allowOverlap: true`）** とし、机の下への椅子の格納やカーペットの上への家具配置を警告なく自由に行えるようにします。
- **家具の右クリック操作（コンテキストメニュー）**:
  - 家具オブジェクト上でマウス右クリックを行うことで、コンテキストメニューから「削除」「複製」「回転モードへ移行（または移動モードへ移行）」を素早く選んで実行できるようにします。
- **オブジェクトと壁の間の寸法（クリアランス）常時表示**:
  - オブジェクトを配置・選択・移動する際、前後左右の各側面から対面する壁面までの最短距離（垂線ガイドライン＋距離数値ラベル）をリアルタイムに常時表示します。
  - サイドパネルから距離数値を直接入力して壁からの隙間をミリ単位で微調整できます。
- **外部3Dモデル（GLTF / GLB / OBJ）のインポート**:
  - ローカルの `.glb` / `.gltf` / `.obj` ファイルを読み込み、目標寸法への自動スケーリングや自由配置に対応します。

### 3.3 視点（カメラ）操作機能
- **3D自由視点（パースペクティブ）**:
  - `OrbitControls` により、回転・平行移動・ズームを自在に行い、任意の角度・高さから部屋を観察できます。
- **2D真上視点（オルソグラフィック / 間取り図ビュー）**:
  - ワンクリックで真上からの平行投影（2D平面図）に切り替え、全体の配置バランスや壁形状の編集を行えるようにします。

### 3.4 長さ測定機能（メジャー機能）
- **任意の2点間距離の測定と端点スナップ**:
  - 「測定モード」では、レイキャスティングにより部屋の床・壁・家具・建具の表面をクリックして2点間距離を測定できます。
  - 家具の角（頂点・端）や部屋の壁コーナー付近にマウスカーソルを近づけると自動的に吸着スナップし、正確な隙間や通路幅を容易に測定できます。
  - 確定した測定線は直線距離 `d` および各軸成分 `ΔX, ΔY, ΔZ` を3Dラベル表示し、一覧パネルで管理・個別削除できます。

### 3.5 データの保存・読み込み（エクスポート / インポート）
- **JSONファイルによるエクスポート / インポート**:
  - 部屋の頂点データ、天井高、配置済み家具・建具リスト、測定データを含むプロジェクト全体を `.json` ファイルとして書き出し・読み込みできます。`zod` スキーマによる型検証を行います。

### 3.6 2D平面図および配置オブジェクト一覧の印刷機能（新規追加）
- **目的**:
  - 設計・検討したレイアウトを紙面（A4サイズ等）への印刷またはPDF保存用として出力し、寸法や配置関係をクリアに把握できるようにします。
- **2D平面図のくっきり・高コントラスト印刷**:
  - 画面上の暗色テーマ（ダークモード）とは異なり、印刷時は**白背景＋高コントラストな黒・濃色線（CAD/建築図面調）**でレンダリングします。
  - 部屋の外形線・壁の厚み、各壁の一辺の寸法（mm）、ドアの開閉軌跡、窓の位置、各家具のフットプリント（輪郭・識別番号・名称）をインクにじみなく明瞭に出力します。
  - 画面上で引かれた測定ラインや壁クリアランスの寸法線も高解像度で正確に紙面に反映します。
- **配置オブジェクト（家具・建具）のサイズ一覧表出力**:
  - 平面図の下部（または次ページ）に、配置されている全オブジェクトの仕様表を自動レイアウト出力します。
  - 表の項目:
    - **番号 / 記号**: 平面図上の番号と連動する識別番号（例: F1, F2... / D1, W1...）
    - **名称**: 家具・建具の名前（例: シングルベッド、ワークデスク）
    - **種類（プリセット）**: ベッド、机、ソファー、カーペットなど
    - **寸法 (W × D × H)**: 幅 × 奥行き × 高さを mm 単位で明記（cm換算も併記）
    - **床面配置高さ (Y)**: 床置き(0mm)または腰高窓などの高さ
    - **重なり設定**: カーペット等の重ね置き可否
- **印刷プレビュー・出力UI**:
  - ヘッダーツールバーに「印刷・PDF出力」ボタンを配置。
  - クリック時に印刷用レイアウト（図面＋サイズ一覧表）のプレビューモーダルを表示し、確認後にワンクリックでブラウザの印刷ダイアログ（`window.print()`）を呼び出します。
  - `@media print` スタイルにより、不要なUIツールバーや左右操作パネルは自動的に非表示化されます。

---

## 4. データ構造設計（TypeScript 型定義案）

`src/types/room.ts` において、印刷用データ生成に対応した型を整備します。

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
  midPoint: Vector2D;
  lengthMm: number;
  normal: Vector2D;
  cornerAngleDeg: number;
  isRightAngle: boolean;
};

export type ClearanceDistance = {
  direction: 'front' | 'back' | 'left' | 'right';
  label: string;
  fromPoint: Vector3D;
  toWallPoint: Vector3D;
  distanceMm: number;
  wallIndex: number;
};

export type RoomConfig = {
  vertices: Vector2D[];
  wallHeight: number;
  wallThickness: number;
  floorColor: string;
  wallColor: string;
  enableRightAngleSnap: boolean;
  showRightAngleMarks?: boolean;
  showDimensionLabels?: boolean;
  collisionWarningDurationSec?: number;
  wallVisibility: 'auto' | 'visible' | 'hidden';
};

export type FurniturePresetType =
  | 'bed'
  | 'desk'
  | 'chair'
  | 'sofa'
  | 'bookshelf'
  | 'carpet'
  | 'refrigerator'
  | 'kitchen'
  | 'tv'
  | 'window'
  | 'door'
  | 'box'
  | 'cylinder'
  | 'custom_model';

export type FurnitureItem = {
  id: string;
  name: string;
  presetType: FurniturePresetType;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  position: Vector3D;
  rotation: Vector3D;
  color: string;
  allowOverlap: boolean;
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

/** 印刷用オブジェクトサマリー情報 */
export type FurniturePrintRow = {
  index: number;
  id: string;
  name: string;
  presetLabel: string;
  dimensionsText: string;
  positionText: string;
  allowOverlapText: string;
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
│   │   │   ├── PresetGeometries.tsx        # 各種プロシージャル3D形状・モデル描画
│   │   │   ├── MeasurementLayer.tsx        # 2点間距離測定ライン・端点スナップ＆ラベル描画
│   │   │   └── FloorPlanPolygonEditor.tsx  # 部屋の頂点ドラッグ移動・直角スナップ・頂点追加
│   │   ├── print/
│   │   │   ├── PrintModal.tsx              # 印刷プレビューモーダル（A4レイアウト調整・用紙向き選択）
│   │   │   ├── PrintFloorPlan2D.tsx        # 白背景・黒線ベクター（SVG）による高精細2D間取り図
│   │   │   └── FurnitureSizeTable.tsx      # 配置オブジェクト一覧・サイズ詳細テーブル
│   │   ├── ui/
│   │   │   ├── HeaderToolbar.tsx           # モード切替・視点切替・印刷ボタン・JSON入出力
│   │   │   ├── LeftSidebar.tsx             # 部屋設定・プリセット家具追加・3Dモデルインポート・一覧
│   │   │   └── RightInspector.tsx          # 選択中家具の詳細・壁クリアランス微調整・測定リスト
│   ├── constants/
│   │   └── presets.ts                      # プリセット定義（初期寸法・色・非干渉設定）
│   ├── store/
│   │   └── useRoomStore.ts                 # Zustandによる状態管理・アクション定義
│   ├── types/
│   │   └── room.ts                         # 型定義およびZodスキーマ
│   ├── utils/
│   │   ├── geometry.ts                     # 壁長・直角スナップ・クリアランス・OBB判定・端点スナップ
│   │   └── fileIo.ts                       # JSONエクスポート/インポート・モデルファイル読み込み
│   ├── App.tsx
│   ├── index.css                           # 画面用Tailwindおよび @media print 用印刷スタイル
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 6. 開発フェーズ（実装ステップ）

1. **Phase 1: 環境構築とGitブランチ作成（完了）**
   - Gitトピックブランチ `feat/initial-implementation` の作成。
   - Vite + React + TypeScript (`strict: true`) + Tailwind CSS + Three.js の導入。
2. **Phase 2: コアデータストアと多角形部屋の3D描画・壁寸法表示・頂点ドラッグ直角スナップ（完了）**
   - `useRoomStore` の実装。
   - 床・壁メッシュの生成、壁一辺の寸法の常時表示、頂点の堅牢なドラッグ移動および直角自動スナップ・ガイドライン表示の実装。
3. **Phase 3: 家具・建具プリセット・干渉判定・壁クリアランス常時表示（完了）**
   - ベッド・机・椅子・ソファー・本棚・カーペット・窓・扉の実装。
   - カーペットの重ね置き非干渉仕様（`allowOverlap: true`）と他オブジェクトの衝突警告。
   - 家具各側面から壁までのリアルタイム距離（クリアランス）表示および数値直接入力による微調整の実装。
4. **Phase 4: 長さ測定機能（メジャー）と端点吸着スナップ（完了）**
   - 任意の2点間距離測定および、家具の角・壁の角への高精度吸着スナップの実装。
5. **Phase 5: 2D平面図・寸法線のくっきり印刷＆オブジェクトサイズ一覧出力機能（完了）**
   - 白背景・高コントラストなベクターSVGによる2D平面図描画（壁寸法・家具フットプリント・縦横1本ずつの壁面距離寸法・番号入り）。
   - 配置家具・建具の識別番号、種類、寸法（幅×奥行き×高さ mm/cm）、配置高さ等を一覧表示するサイズ表の実装。
   - A4用紙に最適化された印刷プレビューモーダルおよび `window.print()` / `@media print` スタイルの実装。
6. **Phase 6: 総合動作検証とユーザビリティ改善（完了）**
   - 500mm以下の小寸法入力対応（`NumericInput`）、頂点ドラッグ時の寸法ラベル干渉防止、直角表示ON/OFF切替、干渉警告ポップアップの2秒自動消去（秒数パラメータ変更可能）の実装と確認。
