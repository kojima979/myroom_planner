import React, { useRef } from 'react';
import {
  Box,
  Compass,
  Download,
  Eye,
  Move,
  Printer,
  RotateCw,
  Ruler,
  SquarePen,
  Upload,
} from 'lucide-react';
import { useRoomStore } from '../../store/useRoomStore';
import { exportProjectToJson, importProjectFromJsonFile } from '../../utils/fileIo';

type Props = {
  onOpenPrintModal?: () => void;
};

export const HeaderToolbar: React.FC<Props> = ({ onOpenPrintModal }) => {
  const editorMode = useRoomStore((s) => s.editorMode);
  const setEditorMode = useRoomStore((s) => s.setEditorMode);
  const cameraMode = useRoomStore((s) => s.cameraMode);
  const setCameraMode = useRoomStore((s) => s.setCameraMode);
  const gizmoMode = useRoomStore((s) => s.gizmoMode);
  const setGizmoMode = useRoomStore((s) => s.setGizmoMode);
  const wallVisibility = useRoomStore((s) => s.room.wallVisibility ?? 'auto');
  const updateRoomConfig = useRoomStore((s) => s.updateRoomConfig);
  const getProjectData = useRoomStore((s) => s.getProjectData);
  const loadProjectData = useRoomStore((s) => s.loadProjectData);

  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importProjectFromJsonFile(file);
      loadProjectData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'JSON形式が不正です';
      window.alert(`プロジェクトファイルの読み込みに失敗しました: ${msg}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-20">
      {/* アプリタイトル */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-slate-950 font-bold shadow">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">MyRoom Planner</h1>
          <p className="text-[10px] text-slate-400">3D部屋・家具配置＆距離測定シミュレーター</p>
        </div>
      </div>

      {/* メインモード切り替え */}
      <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-lg border border-slate-700">
        <button
          type="button"
          onClick={() => setEditorMode('furniture')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            editorMode === 'furniture'
              ? 'bg-sky-500 text-slate-950 shadow'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Move className="w-3.5 h-3.5" />
          家具配置・移動
        </button>
        <button
          type="button"
          onClick={() => setEditorMode('room_edit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            editorMode === 'room_edit'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <SquarePen className="w-3.5 h-3.5" />
          部屋形状・壁寸法編集
        </button>
        <button
          type="button"
          onClick={() => setEditorMode('measure')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            editorMode === 'measure'
              ? 'bg-rose-500 text-white shadow'
              : 'text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          2点間長さ測定
        </button>
      </div>

      {/* ギズモ操作＆視点切り替え＆印刷＆ファイル入出力 */}
      <div className="flex items-center gap-2.5">
        {/* 家具モード時の移動/回転切替 */}
        {editorMode === 'furniture' && (
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setGizmoMode('translate')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${
                gizmoMode === 'translate'
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3D移動ギズモ"
            >
              <Move className="w-3.5 h-3.5" />
              移動
            </button>
            <button
              type="button"
              onClick={() => setGizmoMode('rotate')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${
                gizmoMode === 'rotate'
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3D回転ギズモ"
            >
              <RotateCw className="w-3.5 h-3.5" />
              回転
            </button>
          </div>
        )}

        {/* 3D / 2D視点切替 */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setCameraMode('3d')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
              cameraMode === '3d'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            3D視点
          </button>
          <button
            type="button"
            onClick={() => setCameraMode('2d')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold ${
              cameraMode === '2d'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2D平面図
          </button>
        </div>

        {/* 壁の透過モード切り替え */}
        <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-xs">
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={wallVisibility}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'auto' || val === 'visible' || val === 'hidden') {
                updateRoomConfig({ wallVisibility: val });
              }
            }}
            className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer"
            title="壁の表示方式"
          >
            <option value="auto" className="bg-slate-900">
              壁: 自動透過
            </option>
            <option value="visible" className="bg-slate-900">
              壁: 常時不透明
            </option>
            <option value="hidden" className="bg-slate-900">
              壁: 最小表示
            </option>
          </select>
        </div>

        {/* 印刷 / PDF出力ボタン */}
        <button
          type="button"
          onClick={onOpenPrintModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 border border-emerald-400 text-xs text-white font-bold shadow transition-colors"
          title="2D平面図と家具寸法表を印刷・PDF出力"
        >
          <Printer className="w-3.5 h-3.5" />
          図面印刷 / PDF
        </button>

        {/* JSON保存・読込 */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => exportProjectToJson(getProjectData())}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium"
            title="現在の部屋と家具配置をJSONファイルとして保存"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            保存
          </button>
          <button
            type="button"
            onClick={() => jsonInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 font-medium"
            title="JSONファイルを読み込む"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            読込
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="hidden"
          />
        </div>
      </div>
    </header>
  );
};
