import { ProjectData, ProjectDataSchema } from '../types/room';

/**
 * プロジェクトデータをJSONファイルとしてダウンロードする
 */
export function exportProjectToJson(data: ProjectData, filename = 'myroom_plan.json'): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * JSONファイルを読み込み、Zodスキーマで検証した上でProjectDataを返す
 */
export async function importProjectFromJsonFile(file: File): Promise<ProjectData> {
  const text = await file.text();
  const raw: unknown = JSON.parse(text);
  const parsed = ProjectDataSchema.parse(raw);
  return parsed;
}

/**
 * 3Dモデルファイル (.glb / .gltf / .obj) をData URLとして読み込む
 */
export function readModelFileAsDataUrl(
  file: File
): Promise<{ dataUrl: string; format: 'gltf' | 'glb' | 'obj' }> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    let format: 'gltf' | 'glb' | 'obj' = 'glb';
    if (ext === 'gltf') format = 'gltf';
    else if (ext === 'obj') format = 'obj';
    else if (ext === 'glb') format = 'glb';
    else {
      reject(new Error('対応している3Dモデル形式は .glb, .gltf, .obj です。'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve({ dataUrl: reader.result, format });
      } else {
        reject(new Error('ファイルの読み込みに失敗しました。'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込み中にエラーが発生しました。'));
    reader.readAsDataURL(file);
  });
}
