"""
Processing pipeline (TO BE RAN ONLY ON CLUSTER) for both pose and hand data using MediaPipe for a 
reverse ASL dictionary.
"""


import argparse
import cv2 as cv
import pandas as pd
import mediapipe as mp
from pathlib import Path


# reducing the number of hardcoded values
NUM_POSE_LANDMARKS = 33
NUM_HAND_LANDMARKS = 21


def get_pose_and_hand_coords(input_vid: Path, pose_directory_path: Path, hand_directory_path: Path) -> tuple[Path, Path]:
    """Gets Pose and Hand landmark coordinates from a video and writes them to a separate file.

    Outputs Poses in (frame_idx, landmark_id, x, y, z) format, and Hands in (frame_idx, hand_idx, landmark_id, x, y, z) format; 
    hands are 0-padded if no hands are detected.

    Args:
        input_vid: Path to the input video file.
        pose_directory_path: Path to the directory to write the Pose results to.
        hand_directory_path: Path to the directory to write the Hand results to.
    Returns:
       Tuple of (pose_results_path, hand_results_path). 
    Raises:
        ValueError: If the video file cannot be opened.
    """

    input_vid = Path(input_vid)

    pose_result_file_path = pose_directory_path / (input_vid.stem + "_pose-results.txt")
    hand_result_file_path = hand_directory_path / (input_vid.stem + "_hand-results.txt")

    # setup mediapipe Pose & Hand
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
            static_image_mode = False,
            min_detection_confidence = 0.5,
            min_tracking_confidence = 0.5
            )

    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
            static_image_mode = False,
            max_num_hands = 2,
            min_detection_confidence = 0.5,
            min_tracking_confidence = 0.5
            )

    # open video file
    cap = cv.VideoCapture(str(input_vid))
    if not cap.isOpened():
        raise ValueError(f"ERROR! could not open {input_vid}, please try again.")

    # to detect between frames with hand detection and frames with none
    flagged_frames = 0
    total_frames = 0

    # attempt to gather coordinates of pose and hands
    try:
        with (open(pose_result_file_path, "w") as pose_file, open(hand_result_file_path, "w") as hand_file):
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                frame_index = total_frames
                total_frames += 1
                image_rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
                h, w, _ = frame.shape

                # get pose landmarks
                pose_results = pose.process(image_rgb)
                if pose_results.pose_landmarks:
                    for id, lm in enumerate(pose_results.pose_landmarks.landmark):
                        cx, cy = int(lm.x * w), int(lm.y * h)
                        pose_file.write(f"{frame_index}, {id}, {cx}, {cy}, {lm.z}\n")
                else:
                    # zero-pad so every keyframe has a pose row
                    for id in range(NUM_POSE_LANDMARKS):
                        pose_file.write(f"{frame_index}, {id}, 0, 0, 0.0\n")

                # get hand landmarks
                hand_results = hands.process(image_rgb)
                if not hand_results.multi_hand_landmarks:
                    flagged_frames += 1

                    # zero-pad both hand slots so pose and hand files stay aligned
                    for hand_index in range(2):
                        for id in range(NUM_HAND_LANDMARKS):
                            hand_file.write(f"{frame_index}, {hand_index}, {id}, 0, 0, 0.0\n")


                else:
                    for hand_index, hand_landmarks in enumerate(hand_results.multi_hand_landmarks):
                        for id, lm in enumerate(hand_landmarks.landmark):
                            cx, cy = int(lm.x * w), int(lm.y * h)
                            hand_file.write(f"{frame_index}, {hand_index}, {id}, {cx}, {cy}, {lm.z}\n")

                        # if only one hand detected, zero-pad the second slot
                        if len(hand_results.multi_hand_landmarks) == 1:
                            for id in range(NUM_HAND_LANDMARKS):
                                hand_file.write(f"{frame_index}, 1, {id}, 0, 0, 0.0\n")

    finally:
        cap.release()
        pose.close()
        hands.close()

    # check flagged frames amount
    print(f"{input_vid.name}: {total_frames} frames processed, {flagged_frames} flagged for missing hands.")

    return pose_result_file_path, hand_result_file_path


def main():
    # parser setup for use of additional args in the script call
    parser = argparse.ArgumentParser(description="helps process videos from the SEMLEX dataset.")
    parser.add_argument(
        "--split",
        type=str,
        required=True,
        choices=["train", "test", "val"],
        help="which split to process (train, test, or val).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="max number of videos to process, omit this argument to process all videos.",
    )
    args = parser.parse_args()

    # root & label/metadata & directory setup
    root = Path("/share/compling/data/semlex")

    # metadata helps swap out video_id for label in the print outputs of the coordinate processing
    metadata_path = root / "metadata" / "semlex_metadata.csv"
    metadata = pd.read_csv(metadata_path)
    metadata = metadata[metadata["split"] == args.split]
    id_to_label = dict(zip(metadata["video_id"], metadata["label"]))

    video_dir = root / args.split / f"{args.split}-videos"
    results_dir = root / "results" / args.split
    pose_dir = results_dir / f"{args.split}-pose-results"
    hand_dir = results_dir / f"{args.split}-hand-results"
    pose_dir.mkdir(parents=True, exist_ok=True)
    hand_dir.mkdir(parents=True, exist_ok=True)

    # collect the videos ending in .webm in sorted order
    video_paths = sorted(video_dir.glob("*.webm"))
    if args.limit is not None:
        video_paths = video_paths[: args.limit]

    # start the process of getting coordinates
    print(f"split: {args.split} | processing {len(video_paths)} video(s)...")

    for video_path in video_paths:
        # swap in video label
        video_id = video_path.stem
        label = id_to_label.get(video_id, video_id)

        print(f"\n{'─' * 30} processing: {label} ({video_id}) {'─' * 30}\n")
        pose_path, hand_path = get_pose_and_hand_coords(video_path, pose_dir, hand_dir)

        # manual double checking as videos are processed; can comment out if not needed
        print(f"pose results: {pose_path}")
        print(f"hand results: {hand_path}")

        with open(pose_path) as f:
            print("\npose (first 3 lines)")
            for _ in range(3):
                print(f.readline().strip())

        with open(hand_path) as f:
            print("\nhand (first 3 lines)")
            for _ in range(3):
                print(f.readline().strip())

        print(f"\n{'─' * 30} done: {label} ({video_id}) {'─' * 30}\n")


if __name__ == "__main__":
    main()
