import React from 'react';
import { FurnitureItem } from '../../types/room';
import { FURNITURE_PRESETS } from '../../constants/presets';

type Props = {
  furnitures: FurnitureItem[];
};

/**
 * 平面図の番号と連動する家具・建具のサイズ一覧テーブル
 */
export const FurnitureSizeTable: React.FC<Props> = ({ furnitures }) => {
  const getPresetLabel = (presetType: string) => {
    const p = FURNITURE_PRESETS.find((item) => item.presetType === presetType);
    return p ? p.label : presetType;
  };

  return (
    <div className="w-full mt-4 bg-white text-slate-900 border border-slate-300 rounded overflow-hidden">
      <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between">
        <h3 className="font-bold text-xs tracking-wider text-slate-800">
          ■ 配置オブジェクト・家具サイズ一覧表（合計: {furnitures.length}件）
        </h3>
        <span className="text-[10px] text-slate-500">※寸法単位: mm (cm)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-300 text-[11px] text-slate-700">
              <th className="py-1.5 px-2 font-bold w-12 text-center border-r border-slate-200">番号</th>
              <th className="py-1.5 px-2 font-bold border-r border-slate-200">名称</th>
              <th className="py-1.5 px-2 font-bold border-r border-slate-200">種類</th>
              <th className="py-1.5 px-2 font-bold text-right border-r border-slate-200">幅 (W)</th>
              <th className="py-1.5 px-2 font-bold text-right border-r border-slate-200">奥行 (D)</th>
              <th className="py-1.5 px-2 font-bold text-right border-r border-slate-200">高さ (H)</th>
              <th className="py-1.5 px-2 font-bold text-right border-r border-slate-200">配置高さ (Y)</th>
              <th className="py-1.5 px-2 font-bold text-center">重なり設定</th>
            </tr>
          </thead>
          <tbody>
            {furnitures.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-4 text-center text-slate-400">
                  配置されている家具はありません
                </td>
              </tr>
            ) : (
              furnitures.map((f, idx) => (
                <tr
                  key={f.id}
                  className="border-b border-slate-200 hover:bg-slate-50 text-[11px] leading-tight"
                >
                  <td className="py-1.5 px-2 text-center font-bold border-r border-slate-200 bg-slate-50/50">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px]">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 font-semibold text-slate-900 border-r border-slate-200">
                    {f.name}
                  </td>
                  <td className="py-1.5 px-2 text-slate-600 border-r border-slate-200">
                    {getPresetLabel(f.presetType)}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200">
                    {f.dimensions.width.toLocaleString()} mm
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({(f.dimensions.width / 10).toFixed(1)}cm)
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200">
                    {f.dimensions.depth.toLocaleString()} mm
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({(f.dimensions.depth / 10).toFixed(1)}cm)
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200">
                    {f.dimensions.height.toLocaleString()} mm
                    <span className="text-[10px] text-slate-400 ml-1">
                      ({(f.dimensions.height / 10).toFixed(1)}cm)
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono border-r border-slate-200">
                    {f.position.y > 0 ? `${f.position.y} mm` : '0 mm (床置)'}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {f.allowOverlap ? (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[9px] border border-purple-200">
                        重ね置き可 (ラグ等)
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">通常</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
