"""
Processing pipeline for both pose and hand data using MediaPipe for a reverse ASL dictionary.
"""

import cv2 as cv
import mediapipe as mp
from pathlib import Path


def get_pose_and_hand_coords(input_vid: Path, root: Path) -> tuple[Path, Path]:
    """Extracts pose and hand landmark coordinates from a video using SSIM keyframe
    selection and writes them to separate files.

    Will output Poses in (frame_idx, landmark_id, x, y, z) format, and Hands in
    (frame_idx, hand_idx, landmark_id, x, y, z) format; hands are 0-padded if no hands.

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


def main():
    root = Path(__file__).parent.parent
    test_vid = root / "asl_citation_forms" / "dinosaur.mp4"

    pose_path, hand_path = get_pose_and_hand_coords(test_vid, root)

    # double checks
    print(f"pose results: {pose_path}")
    print(f"hand results: {hand_path}")
    print()
    print(f"pose file size: {hand_path.stat().st_size} bytes")
    print(f"hand file size: {hand_path.stat().st_size} bytes")

    with open(pose_path) as f:
        print("\npose (first 3 lines)")
        for _ in range(3):
            print(f.readline().strip())

    with open(hand_path) as f:
        print("\nhand (first 3 lines)")
        for _ in range(3):
            print(f.readline().strip())


if __name__ == "__main__":
    main()
