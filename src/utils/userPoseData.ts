import {
  FilesetResolver,
  PoseLandmarker,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

// extracting the vectors from video blob (not HTML, as mediapipe cannot read - see code in results).
// using frame-by-frame based on the current scripting approach in data processing
export async function extractPoseData(videoBlob: Blob): Promise<number[][]> {
  // webassembly for mediapipe to allow for browser run
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
  );

  // initialize pose tracking
  const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      //browser path - pose_landmarker_full for high accuracy w/ fast processing.
      // other options include lite and heavy, if wanted to change later
      // float16 - 16bit floating point math, makes model file smaller w/o sacrificing accuracy
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task",
      //use GPU instead of CPU to calculate, CPU as a backup
      delegate: "GPU",
    },
    // three running modes covered by mediapipe: image, video, and live_stream.
    // using for video purposes (bases information off of previous frame instead of each frame as an individual)
    runningMode: "VIDEO",
    // pixel-level map separating target from rest of image. turned off to save memory since only joint coordinates
    // need to be taken, but can see if changing it will increase accuracy in the future
    outputSegmentationMasks: false,
  });

  return new Promise((resolve, reject) => {
    // video created to give to mediapipe, separate from UI display
    const video = document.createElement("video");
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;

    // array for storing coordinates
    const poseData: number[][] = [];

    video.onloadeddata = async () => {
      try {
        await video.play();
        //static frame rate (one forward per 100ms)
        const frameStepSeconds = 0.1;

        while (!video.ended) {
          // convert current timestamp to ms
          const timestampMs = video.currentTime * 1000;
          // find landmarks for current frame
          const result: PoseLandmarkerResult = poseLandmarker.detectForVideo(
            video,
            timestampMs,
          );

          // check for body/pose in current frame
          if (result.worldLandmarks && result.worldLandmarks.length > 0) {
            // 33 total pose landmarks used by mediapipe. makes array of xyz for each landmark (99 total)
            const frameVector: number[] = result.worldLandmarks[0].flatMap(
              (lm) => [lm.x, lm.y, lm.z],
            );
            poseData.push(frameVector);
          }
          video.currentTime += frameStepSeconds;

          await new Promise<void>((res) => {
            video.onseeked = () => res();
          });
        }
        URL.revokeObjectURL(video.src);
        video.remove();
        poseLandmarker.close();

        resolve(poseData);
      } catch (err) {
        reject(err);
      }
    };
    video.onerror = (err) => {
      reject(new Error("Video loading error: ${err.toString()}"));
    };
  });
}
