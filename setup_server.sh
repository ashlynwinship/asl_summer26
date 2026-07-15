#!/usr/bin/env bash
# Pulls the SL-GCN inference code (GitHub) and weights (Hugging Face) and
# lays out a runnable deployment directory. Meant for a fresh server that
# has nothing on it yet -- copy this one file over first, then run it.
#
# Requires GITHUB_TOKEN and HF_TOKEN env vars set beforehand (both need only
# read access -- a fine-grained GitHub PAT scoped to dobb5/SL-GCN-pipeline
# with Contents:Read, and an HF token with Read access to dobb5/SL-GCN):
#
#   export GITHUB_TOKEN=ghp_xxx
#   export HF_TOKEN=hf_xxx
#   ./setup_server.sh [deploy_dir]     # deploy_dir defaults to ~/sl-gcn-deploy
#
# Neither token is written to disk: the GitHub token is used only for the
# initial clone URL and then stripped from the remote (git would otherwise
# leave it sitting in plaintext in .git/config indefinitely); the HF token is
# passed straight to snapshot_download() in-memory, not via `huggingface-cli
# login` (which would cache it to ~/.cache/huggingface/token).
set -euo pipefail

DEPLOY_DIR="${1:-$HOME/sl-gcn-deploy}"
GITHUB_REPO="dobb5/SL-GCN-pipeline"
HF_REPO="dobb5/SL-GCN"

if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "error: GITHUB_TOKEN not set" >&2
  exit 1
fi
if [[ -z "${HF_TOKEN:-}" ]]; then
  echo "error: HF_TOKEN not set" >&2
  exit 1
fi

mkdir -p "$DEPLOY_DIR"
CODE_DIR="$DEPLOY_DIR/SL-GCN-pipeline"
WEIGHTS_DIR="$DEPLOY_DIR/weights"

echo "==> code: github.com/$GITHUB_REPO -> $CODE_DIR"
if [[ -d "$CODE_DIR/.git" ]]; then
  git -C "$CODE_DIR" pull
else
  git clone "https://oauth2:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git" "$CODE_DIR"
  git -C "$CODE_DIR" remote set-url origin "https://github.com/${GITHUB_REPO}.git"
fi

echo "==> python deps: torch, numpy, huggingface_hub"
pip install -q torch numpy huggingface_hub

echo "==> weights: huggingface.co/$HF_REPO -> $WEIGHTS_DIR"
python3 - "$WEIGHTS_DIR" "$HF_REPO" <<'PYEOF'
import os
import sys

from huggingface_hub import snapshot_download

weights_dir, repo_id = sys.argv[1], sys.argv[2]
path = snapshot_download(repo_id=repo_id, local_dir=weights_dir, token=os.environ["HF_TOKEN"])
print(f"  downloaded to {path}")
PYEOF

echo
echo "==> done. run inference with:"
echo "    python3 $CODE_DIR/predict.py --landmarks <path.npy> --checkpoints-dir $WEIGHTS_DIR"
