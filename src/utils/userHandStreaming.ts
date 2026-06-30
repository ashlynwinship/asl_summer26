import {
  FilesetResolver,
  HandLandmarker,
  HandLandmarkerResult,
} from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState } from "react";

export interface DetectedHand {
  label: string; // "right" or "left"
  score: number; // probability of predicted handedness
  landmarks: number[]; // flat 63-length list of floats representing the hand landmarks (21 landmarks * xyz)
}

// already in Home.tsx
const liveVideoRef = useRef<HTMLVideoElement | null>(null);
const isStreamingRef = useRef<boolean>(false);

const [handsVector, setHandsVector] = useState<DetectedHand[][]>([]); // handsVector[frameIdx] = hands detected that frame
const [handsLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(
  null,
);
const accumulatedHandsRef = useRef<DetectedHand[][]>([]); // accumulated hands data across frames

useEffect(() => {
  const initHandLandmarker = async () => {
    try {
      // webassembly for mediapipe to allow for browser run
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
      );
      // initialize hand tracking
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 2, // maximum number of hands to detect
      });
      setHandLandmarker(handLandmarker);
    } catch (error) {
      console.error("Error initializing HandLandmarker:", error);
    }
  };
  void initHandLandmarker();
}, []);

const startHandsTrackingLoop = () => {
  if (!handsLandmarker || !liveVideoRef.current) return;

  accumulatedHandsRef.current = []; // reset accumulated hands data
  setHandsVector([]); // reset handsVector state

  const video = liveVideoRef.current;

  const processFrame = () => {
    if (!isStreamingRef.current) return; // reuse the same ref pose loop already uses

    if (video.readyState >= 2) {
      const timestamp = performance.now();
      const result: HandLandmarkerResult = handsLandmarker.detectForVideo(
        video,
        timestamp,
      );

      const frameHands: DetectedHand[] = [];

      if (result.worldLandmarks && result.worldLandmarks.length > 0) {
        result.worldLandmarks.forEach((handLandmarks, index) => {
          const handednessInfo = result.handedness[index]?.[0]; // get the first category for the hand (should only be one)
          if (!handednessInfo) return;

          // mirror correction since front-facing camera flips the image
          const correctedLabel =
            handednessInfo.categoryName === "Left" ? "right" : "left";

          frameHands.push({
            label: correctedLabel,
            score: handednessInfo.score,
            landmarks: handLandmarks.flatMap((lm) => [lm.x, lm.y, lm.z]),
          });
        });
      }

      // push even when empty to preserve frame-index alignment with pose data
      accumulatedHandsRef.current.push(frameHands);
      setHandsVector([...accumulatedHandsRef.current]); // update state with new hands data
    }
    requestAnimationFrame(processFrame);
  };
  requestAnimationFrame(processFrame);
};

// export async function extractHandData(videoBlob: Blob): Promise<number[][]> {
//   // webassembly for mediapipe to allow for browser run
//   const vision = await FilesetResolver.forVisionTasks(
//     "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
//   );

//   // initialize hand tracking
//   const handLandmarker = await HandLandmarker.createFromOptions(vision, {
//     baseOptions: {
//       modelAssetPath:
//         "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker_full/float16/latest/hand_landmarker_full.task",
//       delegate: "GPU",
//     },
//     runningMode: "VIDEO",
//     // outputSegmentationMasks: false,
//   });

//   return new Promise((resolve, reject) => {
//     // video created to give to mediapipe, separate from UI display
//     const video = document.createElement("video");
//     video.src = URL.createObjectURL(videoBlob);
//     video.muted = true;
//     video.playsInline = true;

//     // array for storing coordinates
//     const handData: number[][] = [];

//     video.onloadeddata = async () => {
//       try {
//         await video.play();
//         // frame rate
//         const frameStepSeconds = 0.1;

//         while (!video.ended) {
//           const timestampMs = video.currentTime * 1000;
//           // find landmarks for current frame
//           const handResult: HandLandmarkerResult =
//             handLandmarker.detectForVideo(video, timestampMs);
//           // check for hands in current frame
//           if (handResult.landmarks && handResult.landmarks.length > 0) {
//             // flatten the landmarks for the detected hand
//             const handFrameVector: number[] = handResult.landmarks[0].flatMap(
//               (lm) => [lm.x, lm.y, lm.z],
//             );
//             handData.push(handFrameVector);
//           }
//           video.currentTime += frameStepSeconds;

//           await new Promise<void>((res) => {
//             video.onseeked = () => res();
//           });
//         }
//         URL.revokeObjectURL(video.src);
//         video.remove();
//         handLandmarker.close();

//         resolve(handData);
//       } catch (err) {
//         reject(err);
//       }
//     };
//     video.onerror = (err) => {
//       reject(new Error("Video loading error: ${err.toString()}"));
//     };
//   });
// }
