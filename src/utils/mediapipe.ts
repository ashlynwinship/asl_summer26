import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

const NUM_POSE_LANDMARKS = 33;

export interface DetectedHand {
  label: string;
  score: number;
  landmarks: number[];
}

export const initMediaPipe = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
  );

  const [pose, hands] = await Promise.all([
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      outputSegmentationMasks: false,
    }),
    HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
    }),
  ]);

  return { pose, hands };
};

export const extractLandmarkVectors = ({
  poseResult,
  handResult,
}: {
  poseResult: any;
  handResult: any;
}) => {
  const poseVectors: number[][] = [];
  const handsVectors: DetectedHand[][] = [];

  // Must match the training pipeline (keyframe_selection/landmarks.py):
  // normalized image-space pose landmarks (same [0,1] frame as the hands),
  // not worldLandmarks (meters, hip-centred). Frames with no pose are
  // zero-filled rather than dropped, as in training.
  if (poseResult?.landmarks?.length) {
    poseVectors.push(
      poseResult.landmarks[0].flatMap((lm: any) => [lm.x, lm.y, lm.z]),
    );
  } else {
    poseVectors.push(new Array(NUM_POSE_LANDMARKS * 3).fill(0));
  }

  const frameHands: DetectedHand[] = [];
  if (handResult?.landmarks?.length) {
    handResult.landmarks.forEach((handLandmarks: any[], index: number) => {
      const handednessInfo = handResult.handedness?.[index]?.[0];
      if (!handednessInfo) return;

      // MediaPipe's handedness label is passed through unchanged: the model
      // was trained on raw labels from unflipped video. If the input is ever
      // mirrored, flip the image before MediaPipe instead of the label.
      frameHands.push({
        label: handednessInfo.categoryName,
        score: handednessInfo.score,
        landmarks: handLandmarks.flatMap((lm: any) => [lm.x, lm.y, lm.z]),
      });
    });
  }

  handsVectors.push(frameHands);
  return { poseVectors, handsVectors };
};
