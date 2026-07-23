import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
} from "@mediapipe/tasks-vision";

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

  if (poseResult?.worldLandmarks?.length) {
    poseVectors.push(
      poseResult.worldLandmarks[0].flatMap((lm: any) => [lm.x, lm.y, lm.z]),
    );
  }

  const frameHands: DetectedHand[] = [];
  if (handResult?.landmarks?.length) {
    handResult.landmarks.forEach((handLandmarks: any[], index: number) => {
      const handednessInfo = handResult.handedness?.[index]?.[0];
      if (!handednessInfo) return;

      // mirror correction since the front-facing camera feed isn't flipped
      // before MediaPipe sees it, but handedness assumes a selfie-view image
      const correctedLabel =
        handednessInfo.categoryName === "Left" ? "Right" : "Left";

      frameHands.push({
        label: correctedLabel,
        score: handednessInfo.score,
        landmarks: handLandmarks.flatMap((lm: any) => [lm.x, lm.y, lm.z]),
      });
    });
  }

  handsVectors.push(frameHands);
  return { poseVectors, handsVectors };
};
