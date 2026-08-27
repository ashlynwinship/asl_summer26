import cv2
from skimage.metrics import structural_similarity as ssim
import os
import sys
from pathlib import Path

if len(sys.argv) != 2 or Path(sys.argv[1]).suffix != ".mp4":
    print("Usage: python ssim_kf_detection.py <video_path.mp4>")

video_path = sys.argv[1]
output_folder = "./keyframes"
threshold = 0.95

os.makedirs(output_folder, exist_ok=True)
cap = cv2.VideoCapture(video_path)

ret, prev_frame = cap.read()
if not ret:
    print("Error: Could not read video.")
    exit()


# Initialize frames
prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
frame_idx = 0
saved_keyframe_count = 0

cv2.imwrite(f"{output_folder}/keyframe_{saved_keyframe_count:04d}.jpg", prev_frame)
saved_keyframe_count += 1

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame_idx += 1
    curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    score = ssim(prev_gray, curr_gray, data_range=255)

    if score < threshold:
        cv2.imwrite(f"{output_folder}/keyframe_{saved_keyframe_count:04d}.jpg", frame)
        saved_keyframe_count += 1
        print(f"Keyframe saved at frame {frame_idx} (SSIM: {score:.3f})")
        prev_gray = curr_gray

cap.release()
print(f"Saved {saved_keyframe_count} keyframes.")
