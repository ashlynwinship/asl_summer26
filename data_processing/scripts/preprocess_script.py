"""
Processing pipeline for both pose and hand data using MediaPipe for a reverse ASL dictionary.

Unused modules (add back if needed):
"""

from skimage.metrics import structural_similarity as ssim
import cv2 as cv
from pathlib import Path


def extract_keyframe_ssim(video_path: Path, threshold: float = 0.90) -> list:
    """Extracts keyframes from a video using Structural Similarity Index (SSIM).

    derived from paper read for 6/11, algorithm 3
    guide from https://scikit-image.org/docs/stable/auto_examples/transform/plot_ssim.html

    Args:
        video_path: Path to the input video file.
        threshold: SSIM threshold above which frames are considered similar 
                   and discarded (default: 0.90). <- is based off the paper's hardcoded threshold but wanted
                   to make it easy to adjust if needed for now, then fix later.
    Returns:
        List of keyframes as numpy arrays.
    Raises:
        ValueError: If the video file cannot be opened.
    """
    cap = cv.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")

    frames = []
    while cap.isOpened():
        ret, frame = cap.read()
        


# Input: Dataset -Folder comprising of Vi, V2.... Vn videos Output: Output- Folder Vi,V2, V3....Vn subfolder, each subfolder contains frames of
# corresponding video.
# Step 1: Set CurrentFrame:=0
# Step 2: Read Input Folder
# Step 3: Create Output Folder
# Step 4: Repeat for V:=Vi to Vn
# Step 4.1: Extract frames(F1-Fm) and store in Frame_Folder
# Step 4.2: Repeat for Fi, Fi+1 of the Frame_Folder Step 4.3: If SSIM(F1,F1+1)>0.90) then
# 4.3.1 Write Fi to Subfolder V with name Frame_CurrentFrame
# 4.3.2 CurrentFrame:=CurrentFrame+1
# Step 4.4 Else
# 4.4.1 Write Fi,Fi+ı to Subfolder V with name
# Frame_CurrentFrame,Frame_CurrentFrame+1
# 4.4.2 CurrentFrame :=CurrentFrame+1
# [End of If statement]
# Step 4.5 Set FI=FI+1
# [End of For statement/
# [End of For Statement]
# Step 5: Stop