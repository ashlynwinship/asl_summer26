# Ashlyn: Temp script for processing a user input video 
# so Jay & Avery can play around with it on front-end

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
# import mediapipe.python.solutions.hands as mp_hands
# import mediapipe.python.solutions
import cv2 as cv
import os
import shutil
import sys
import numpy as np
from scipy import stats
import pandas as pd
from pathlib import Path
np.set_printoptions(threshold=sys.maxsize) # prevents long arrays from saving to csv with "..."

ROOT = Path.cwd().parents[0]  # sets it to data_processing/ rather than data_processing/notebooks/

# function for extracting body pose coordinates

def get_pose_coords(input_vid, pose_model_path):

    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Create a pose landmarker instance with the video mode:
    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=pose_model_path),
        running_mode=VisionRunningMode.VIDEO)

    with PoseLandmarker.create_from_options(options) as landmarker:
    # The landmarker is initialized. Use it here.
        options=mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path='pose_landmarker.task'),
        running_mode=mp.tasks.vision.RunningMode.VIDEO, # Set to video mode (not image or livestream)
    )
    
    # Initialize MediaPipe Pose
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=False, 
                    min_detection_confidence=0.5, 
                    min_tracking_confidence=0.5)
    # mp_drawing = mp.solutions.drawing_utils

    # Open the video file
    cap = cv.VideoCapture(input_vid)

    if not cap.isOpened():
        print("Error: Could not open video.")
        exit()

    # Handle result file!
    result_file_name = str(input_vid).split(".")[0] + "_pose-results.txt" # cut off file ending and add _pose-results.txt
    results_file = open(result_file_name, "w")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        # Convert the BGR image to RGB
        image_rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)

        # Process the image and detect pose landmarks
        results = pose.process(image_rgb)

        # Write pose landmarks to file
        if results.pose_landmarks:
            for id, lm in enumerate(results.pose_landmarks.landmark):
                # Get image dimensions to convert normalized coordinates to pixel coordinates
                h, w, c = frame.shape
                cx, cy = int(lm.x * w), int(lm.y * h)
                # print(f"Landmark {id}: x={cx}, y={cy}, z={lm.z}, visibility={lm.visibility}")
                # results_file.write(f"Landmark {id}: x={cx}, y={cy}, z={lm.z}, visibility={lm.visibility}\n")
                results_file.write(f"{id}, {cx}, {cy}, {lm.z}\n")

    # Release resources
    cap.release()
    cv.destroyAllWindows()
    cv.waitKey(1)           # MacBook fix - need to add this for the window to actually close!

    results_file.close() # close file!
    
    return results_file

# Set the model
pose_model_path = ROOT / "pose_landmarker_lite.task"

# Specify user input video
user_input = sys.argv[1] # temp assignment for command line; will need to update to url or otherwise id'd uploaded vid 

user_results = get_pose_coords(user_input, pose_model_path)