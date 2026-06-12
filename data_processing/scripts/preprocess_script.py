"""
Processing pipeline for both pose and hand data using MediaPipe for a reverse ASL dictionary.
"""

import imageio
import cv2 as cv
import numpy as np
import mediapipe as mp
from pathlib import Path


# used to reduce hardcoding repitions here
NUM_POSE_LANDMARKS = 33
NUM_HAND_LANDMARKS = 21


def get_pose_and_hand_coords(input_vid: Path, root: Path) -> tuple[Path, Path]:
    """Extracts pose and hand landmark coordinates from a video using SSIM keyframe
    selection and writes them to separate files.

    Will output Poses in (frame_idx, landmark_id, x, y, z) format, 
    and Hands in (frame_idx, hand_idx, landmark_id, x, y, z) format; hands are 0-padded if no hands.

    Args:
        input_vid: Path to the input video file.
        root: Root directory for output files.
    Returns:
        Tuple of (pose_results_path, hand_results_path).
    Raises:
        ValueError: If the video file cannot be opened.
    """
    input_vid = Path(input_vid)

    # output directories & file paths
    pose_directory_path = root / "asl_citation_forms" / "pose_results"
    hand_directory_path = root / "asl_citation_forms" / "hand_results"
    pose_directory_path.mkdir(parents=True, exist_ok=True)
    hand_directory_path.mkdir(parents=True, exist_ok=True)
    pose_result_file_path = pose_directory_path / (input_vid.stem + "_pose-results.txt")
    hand_result_file_path = hand_directory_path / (input_vid.stem + "_hand-results.txt")

    # setup mediapipe Hand & Pose
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    mp_hands_model = mp.solutions.hands
    hands = mp_hands_model.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    # open video
    cap = cv.VideoCapture(str(input_vid))
    if not cap.isOpened():
        raise ValueError(f"ERROR: could not open video {input_vid}.")

    flagged_frames = 0
    total_frames = 0

    try:
        with (open(pose_result_file_path, "w") as pose_file, open(hand_result_file_path, "w") as hand_file):
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                frame_idx = total_frames
                total_frames += 1
                image_rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
                h, w, _ = frame.shape

                # extract pose landmarks
                pose_results = pose.process(image_rgb)
                if pose_results.pose_landmarks:
                    for id, lm in enumerate(pose_results.pose_landmarks.landmark):
                        cx, cy = int(lm.x * w), int(lm.y * h)
                        pose_file.write(f"{frame_idx}, {id}, {cx}, {cy}, {lm.z}\n")
                else:
                    # zero-pad so every keyframe has a pose row
                    for id in range(NUM_POSE_LANDMARKS):
                        pose_file.write(f"{frame_idx}, {id}, 0, 0, 0.0\n")

                # extract hand landmarks
                hand_results = hands.process(image_rgb)
                if not hand_results.multi_hand_landmarks:
                    flagged_frames += 1

                    # zero-pad both hand slots so pose and hand files stay aligned
                    for hand_idx in range(2):
                        for id in range(NUM_HAND_LANDMARKS):
                            hand_file.write(f"{frame_idx}, {hand_idx}, {id}, 0, 0, 0.0\n")
                        
                else:
                    for hand_idx, hand_landmarks in enumerate(hand_results.multi_hand_landmarks):
                        for id, lm in enumerate(hand_landmarks.landmark):
                            cx, cy = int(lm.x * w), int(lm.y * h)
                            hand_file.write(f"{frame_idx}, {hand_idx}, {id}, {cx}, {cy}, {lm.z}\n")

                    # if only one hand detected, zero-pad the second slot
                    if len(hand_results.multi_hand_landmarks) == 1:
                        for id in range(NUM_HAND_LANDMARKS):
                            hand_file.write(f"{frame_idx}, 1, {id}, 0, 0, 0.0\n")

    finally:
        cap.release()
        pose.close()
        hands.close()

    # check flagged frames amount/threshold
    print(f"{input_vid.name}: {total_frames} frames processed, {flagged_frames} flagged for missing hands.")

    return pose_result_file_path, hand_result_file_path


def save_annotated_gif(input_vid: Path, root: Path, fps: int = 24) -> Path:
    """Sets up pose/hand landmarks on black background for each frame, saves to GIF for
    visual understanding where the coordinates are on hand/pose. This is just for 
    personal visualization purposes so it's easier to understand where each coordinate goes/
    moves across the video clip. FEEL FREE TO COMMENT OUT IF NOT NEEDED FOR THE FULL SEMLEX DATASET!
 
    Args:
        input_vid: Path to the input video file.
        root: Root directory for output files.
        fps: Frames per second for the output GIF (default 24).
    Returns:
        Path to the saved GIF file.
    Raises:
        ValueError: If the video file cannot be opened.
    """
    # get input video & path
    input_vid = Path(input_vid)
    gif_dir = root / "results" / "gifs"
    gif_dir.mkdir(parents=True, exist_ok=True)
    gif_path = gif_dir / (input_vid.stem + "_annotated.gif")
 
    # set up pose/hands
    mp_pose = mp.solutions.pose
    mp_hands_model = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
 
    pose = mp_pose.Pose(
        static_image_mode=False,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    hands = mp_hands_model.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
 
    # analayze/run video
    cap = cv.VideoCapture(str(input_vid))
    if not cap.isOpened():
        raise ValueError(f"ERROR: could not open video {input_vid}.")
 
    gif_frames = []
 
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
 
            image_rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
 
            # get canvas to be same size as original
            canvas = np.zeros_like(frame)
 
            # draw pose landmarks onto canvas
            pose_results = pose.process(image_rgb)
            if pose_results.pose_landmarks:
                mp_drawing.draw_landmarks(
                    canvas,
                    pose_results.pose_landmarks,
                    mp_pose.POSE_CONNECTIONS,
                    mp_drawing_styles.get_default_pose_landmarks_style(),
                )
 
            # draw hand landmarks onto canvas
            hand_results = hands.process(image_rgb)
            if hand_results.multi_hand_landmarks:
                for hand_landmarks in hand_results.multi_hand_landmarks:
                    mp_drawing.draw_landmarks(
                        canvas,
                        hand_landmarks,
                        mp_hands_model.HAND_CONNECTIONS,
                        mp_drawing_styles.get_default_hand_landmarks_style(),
                        mp_drawing_styles.get_default_hand_connections_style(),
                    )
 
            # canvas is BGR, imageio expects RGB so gotta change it back
            gif_frames.append(cv.cvtColor(canvas, cv.COLOR_BGR2RGB))
 
    finally:
        cap.release()
        pose.close()
        hands.close()
 
    imageio.mimsave(gif_path, gif_frames, fps=fps)
    print(f"saved GIF to {gif_path}")
    return gif_path


def main():
    root = Path(__file__).parent.parent
    folder_path = root / "asl_citation_forms"
 
    for video_path in folder_path.glob("*.mp4"):
        print(f"\nprocessing {video_path.name}")
        pose_path, hand_path = get_pose_and_hand_coords(video_path, root)
        save_annotated_gif(video_path, root, fps=24)

        # double checks
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

        print("-"*30)


if __name__ == "__main__":
    main()
