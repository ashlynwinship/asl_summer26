"""
Processing pipeline for SEMLEX data using LSH for a reverse ASL dictionary.
Extracts pose information and processes it (flatten frames, grab pseudo-keyframes, etc).

Unused modules (add back if needed):
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
"""

import sys
import shutil
import logging
import cv2 as cv
import numpy as np
import pandas as pd
import mediapipe as mp
from pathlib import Path

np.set_printoptions(
    threshold=sys.maxsize  # prevents long arrays from saving to csv with "..."
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout
)

logger = logging.getLogger(__name__)


# POSE EXTRACTION
def get_pose_coords(input_vid: Path, root: Path) -> Path:
    """Extracts body pose coordinates from a video and write them to a file.
 
    Args:
        input_vid: Path to the input video file.
        root: Root directory for output files.
 
    Returns:
        Path to the results file containing pose coordinates.
 
    Raises:
        ValueError: If the video file cannot be opened.
    """
    input_vid = Path(input_vid)
 
    pose_directory_path = root / "asl_citation_forms" / "pose_results"
    pose_directory_path.mkdir(parents=True, exist_ok=True)  # parents=True creates parent directories if needed
    result_file_path = pose_directory_path / (input_vid.stem + "_pose-results.txt")  # cuts off extension and adds _pose-results.txt
 
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
 
    # open video file (added a raise error here to handle gracefully rather than printing error alongside full trace)
    cap = cv.VideoCapture(str(input_vid))
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {input_vid}")
 
    try:
        with open(result_file_path, "w") as results_file:  # open the file in write mode and write some content
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
 
                image_rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)  # convert the BGR image to RGB
                results = pose.process(image_rgb)  # process the image and detect pose landmarks
 
                if results.pose_landmarks:  # if pose landmarks exist, then get image dimensions to convert normalized coordinates to pixel coordinates
                    h, w, _ = frame.shape

                    for id, lm in enumerate(results.pose_landmarks.landmark):  # write pose landmarks to file
                        cx, cy = int(lm.x * w), int(lm.y * h)
                        results_file.write(f"{id}, {cx}, {cy}, {lm.z}\n") # landmark {id}: x={cx}, y={cy}, z={lm.z}, visibility={lm.visibility}

    finally:  # releases resources & closes file
        cap.release()
        pose.close()
 
    return result_file_path


# LOAD DATA FOR POSES
def load_pose_data(input_file: Path, pose_dict: dict) -> dict:
    """Loads pose landmark data from a results file into a dictionary.
 
    Args:
        input_file: Path to the pose results .txt file.
        pose_dict: Dictionary to load pose data into, keyed by sign name.
 
    Returns:
        Updated pose_dict with the new entry added.
 
    Raises:
        FileNotFoundError: If the pose results file does not exist.
    """
    input_file = Path(input_file)
    if not input_file.exists():
        raise FileNotFoundError(f"Pose results file not found: {input_file}")
 
    data = []
    one_frame = []
 
    with open(input_file, "r") as file:
        for line in file:
            values = [float(x) for x in line.strip().split(", ")]  # lambda here helps reduce the 5-line loop to strip, split, and float each number in file
            landmark_id = values[0]
            coords = values[1:]  # [x, y, z]; skipping first empty one_frame since the first index is 0. 
 
            if landmark_id == 0:
                if one_frame:
                    data.append(one_frame)
                one_frame = [coords]
            else:
                one_frame.append(coords)
 
        if one_frame:  # add the last frame just in case
            data.append(one_frame)
 
    key_str = input_file.stem.replace("_pose-results", "")
    if key_str not in pose_dict:
        pose_dict[key_str] = np.array(data)
 
    return pose_dict


# MAIN FUNCTION (for scripting purposes, so can run as script.py)
def main():
    root = Path(__file__).parent.parent
    video_ext = "mp4"  # can change out for .webm if needed for semlex
    output_csv = root / "data" / "semlex_frame_training_data.csv"
 
    # extract pose coords from training data
    logger.info("... extracting pose coordinates from training videos")
    folder_path = root / "asl_citation_forms"
    for video_path in folder_path.glob(f"*.{video_ext}"):
        logger.info(f"processing {video_path.name}")
        get_pose_coords(video_path, root)
 
    # sort training results into subdirectories
    logger.info("... sorting pose results into subdirectory")
    pose_path = root / "asl_citation_forms" / "pose_results"
    for file_path in folder_path.iterdir():
        if "pose" in file_path.name:
            dest = pose_path / file_path.name
            if dest.exists():  # if already exists, remove & replace
                dest.unlink()
            shutil.move(file_path, pose_path)
 
    # semlex data import
    logger.info("... loading SEMLEX data")
 
    semlex_data = (pd.read_csv(root / "data" / "semlex_metadata.csv")
                  .loc[:, ['video_id', 'split', 'label', 'Handshape', 'SignType',
                           'PathMovement', 'RepeatedMovement', 'MajorLocation', 
                           'Contact', 'NondominantHandshape']]
                  .query("split == 'train'"))

    # load pose data from all result files
    logger.info("... loading pose results")
    pose_results_path = root / "asl_citation_forms" / "pose_results"
    pose_dict = {}
    for file_path in pose_results_path.glob("*.txt"):  # glob helps ignore other files, such as .DS_Store
        load_pose_data(file_path, pose_dict)
    logger.info(f"loaded {len(pose_dict)} signs")
 
    # add pose landmark arrays to semlex data
    logger.info("... adding pose landmarks to SEMLEX data")
    semlex_data['pose_landmarks'] = None
    for i, row in semlex_data.iterrows():
        lemma = row['label']
        if lemma in pose_dict:
            semlex_data.at[i, 'pose_landmarks'] = pose_dict[lemma]
 
    # filter semlex to lemmas with landmarks only
    filtered_semlex = semlex_data.loc[semlex_data['label'].isin(pose_dict.keys())].copy()
    logger.info(f"filtered to {len(filtered_semlex)} lemmas with pose landmarks")
 
    # filter pose landmarks in 3 representations:
    # 1) first 10 frames
    # 2) limited pseudo-keyframes (every 10 frames, up to 7 frames total)
    # 3) all pseudo-keyframes (every 10 frames)
    logger.info("... filtering pose landmarks into representations")
    first_ten_pose_frames = []
    pseudokey_n7_frames = []
    pseudokey_all_frames = []
 
    for _, row in filtered_semlex.iterrows():
        all_frames = row['pose_landmarks']
        first_ten_pose_frames.append(all_frames[:10])
        pseudokey_n7_frames.append(all_frames[::10][:7])
        pseudokey_all_frames.append(all_frames[::10])
 
    filtered_semlex['pose_first10'] = first_ten_pose_frames
    filtered_semlex['pose_pseudokey_n7'] = pseudokey_n7_frames
    filtered_semlex['pose_pseudokey_all'] = pseudokey_all_frames
 
    # flatten pose arrays
    logger.info("... flattening pose arrays")
    filtered_semlex['flat_10frames'] = filtered_semlex['pose_first10'].apply(lambda x: np.array(x).flatten())
    filtered_semlex['flat_pseudo_n7'] = filtered_semlex['pose_pseudokey_n7'].apply(lambda x: np.array(x).flatten())
    filtered_semlex['flat_pseudo_all'] = filtered_semlex['pose_pseudokey_all'].apply(lambda x: np.array(x).flatten())
 
    # second flatten pass in case of remaining nested arrays
    filtered_semlex['flat_10frames'] = filtered_semlex['flat_10frames'].apply(lambda x: x.flatten())
    filtered_semlex['flat_pseudo_n7'] = filtered_semlex['flat_pseudo_n7'].apply(lambda x: x.flatten())
    filtered_semlex['flat_pseudo_all'] = filtered_semlex['flat_pseudo_all'].apply(lambda x: x.flatten())
 
    # save to csv
    logger.info(f"... saving output to {output_csv}")
    filtered_semlex.to_csv(output_csv)
    logger.info("DONE.")


if __name__ == "__main__":
    main()
