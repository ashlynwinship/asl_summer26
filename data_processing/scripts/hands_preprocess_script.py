"""
Processing pipeline for hand data using MediaPipe for a reverse ASL dictionary.

Unused modules (add back if needed):
    import mediapipe.python.solutions.hands as mp_hands
    import mediapipe.python.solutions
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
"""

import sys
import logging
import cv2 as cv
import numpy as np
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


mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

def run_webcam_hands():
    """Runs real-time hand landmark detection from webcam feed.
    Press 'q' to quit.
    """
    cap = cv.VideoCapture(0)
    if not cap.isOpened():
        raise ValueError("Could not open webcam.")

    try:
        with mp_hands.Hands(
            model_complexity=0,
            static_image_mode=False,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as hands:
            while cap.isOpened():
                success, image = cap.read()
                if not success:
                    logger.warning("Ignoring empty camera frame.")
                    continue  # if loading a video, use 'break' instead of 'continue'

                # to improve performance, optionally mark the image as not writeable to pass by reference
                image.flags.writeable = False
                image = cv.cvtColor(image, cv.COLOR_BGR2RGB)
                results = hands.process(image)

                # draw the hand annotations on the image
                image.flags.writeable = True
                image = cv.cvtColor(image, cv.COLOR_RGB2BGR)

                if results.multi_hand_landmarks:
                    for hand_landmarks in results.multi_hand_landmarks:
                        mp_drawing.draw_landmarks(
                            image,
                            hand_landmarks,
                            mp_hands.HAND_CONNECTIONS,
                            mp_drawing_styles.get_default_hand_landmarks_style(),
                            mp_drawing_styles.get_default_hand_connections_style()
                        )

                # flip the image horizontally for a selfie-view display
                cv.imshow('MediaPipe Hands', cv.flip(image, 1))
                if cv.waitKey(5) & 0xFF == ord('q'):
                    break
    finally:
        cap.release()
        cv.destroyAllWindows()
        cv.waitKey(1)  # must be added for Macs


def process_static_images(image_files: list, root: Path) -> None:
    """Detects hand landmarks in a list of static images and saves annotated versions.

    Args:
        image_files: List of paths to input image files.
        root: Root directory for output files.
    """
    output_dir = root / "results" / "annotated_images"
    output_dir.mkdir(parents=True, exist_ok=True)

    with mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5,
    ) as hands:
        for idx, file in enumerate(image_files):
            logger.info(f"Processing {file}")
            # read an image, flip it around y-axis for correct handedness output (see above)
            image = cv.flip(cv.imread(str(file)), 1)
            results = hands.process(cv.cvtColor(image, cv.COLOR_BGR2RGB))  # convert the BGR image to RGB before processing

            # print handedness and draw hand landmarks on the image
            logger.info(f"Handedness: {results.multi_handedness}")
            if not results.multi_hand_landmarks:
                continue

            image_height, image_width, _ = image.shape
            annotated_image = image.copy()

            for hand_landmarks in results.multi_hand_landmarks:
                logger.info(f"hand_landmarks: {hand_landmarks}")
                logger.info(
                    f"Index finger tip coordinates: "
                    f"({hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP].x * image_width}, "
                    f"{hand_landmarks.landmark[mp_hands.HandLandmark.INDEX_FINGER_TIP].y * image_height})"
                )
                mp_drawing.draw_landmarks(
                    annotated_image,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style()
                )

            cv.imwrite(str(output_dir / f"annotated_image{idx}.png"), cv.flip(annotated_image, 1))

            # draw hand world landmarks
            if not results.multi_hand_world_landmarks:
                continue

            for hand_world_landmarks in results.multi_hand_world_landmarks:
                mp_drawing.plot_landmarks(
                    hand_world_landmarks, mp_hands.HAND_CONNECTIONS, azimuth=5
                )


def main():
    root = Path(__file__).parent.parent
    print(root)
    image_files = [root / "images" / "e_test.jpg", root / "images" / "kc_test.jpg"]
    process_static_images(image_files, root)
    # run_webcam_hands()


if __name__ == "__main__":
    main()
