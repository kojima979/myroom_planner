#!/usr/bin/env bash
# ==============================================================================
# MyRoom Planner - Raspberry Pi デプロイスクリプト
# 
# 使い方:
#   ./scripts/deploy_to_raspi.sh [ユーザー名@ラズパイのIPまたはホスト名]
# 
# 例:
#   ./scripts/deploy_to_raspi.sh pi@192.168.4.150
#   ./scripts/deploy_to_raspi.sh pi@raspberrypi.local
# ==============================================================================

set -euo pipefail

TARGET_HOST="${1:-}"

if [ -z "$TARGET_HOST" ]; then
  echo "【エラー】接続先の Raspberry Pi のホストが指定されていません。"
  echo "使用例: ./scripts/deploy_to_raspi.sh pi@192.168.4.150"
  exit 1
fi

DEST_DIR="~/myroom_planner_dist"

echo "=== 1. Mac側で本番ビルドを実行中 (npm run build) ==="
npm run build

echo ""
echo "=== 2. ビルド成果物 (dist) を ${TARGET_HOST}:${DEST_DIR} へ転送中 ==="

# rsync が利用可能な場合は差分転送、なければ scp を使用
if command -v rsync >/dev/null 2>&1; then
  rsync -avz --delete ./dist/ "${TARGET_HOST}:${DEST_DIR}/"
else
  scp -r ./dist/* "${TARGET_HOST}:${DEST_DIR}/"
fi

echo ""
echo "=== デプロイ完了！ ==="
echo "Raspberry Pi 側で Web サーバーが起動していれば、即座に最新版が反映されます。"
echo "アクセスURL: http://${TARGET_HOST#*@}:5173/ (ポート5173で配信中の場合)"
