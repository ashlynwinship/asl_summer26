"""Import shim: makes the cloned SL-GCN-pipeline's predict.py importable
as a normal module despite the hyphenated directory names."""

import sys
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent / "sl-gcn-deploy" / "SL-GCN-pipeline"
sys.path.insert(0, str(PIPELINE_DIR))

from predict import load_ensemble, run_inference  # noqa: E402
