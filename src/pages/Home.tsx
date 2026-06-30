import { useNavigate } from "react-router-dom";
import { useState, useEffect, ChangeEvent, useRef } from "react";
import { saveAs } from "file-saver";
import { useLocation } from "react-router-dom";
import { extractPoseData } from "../utils/userPoseData";
import {
  FilesetResolver,
  PoseLandmarker,
  HandLandmarker,
} from "@mediapipe/tasks-vision";
import { SyncLoader } from "react-spinners";

type UploadStatus = "idle" | "uploading" | "success" | "error";
type RecordingStatus = null | "recording" | "stopped" | "counting";

interface DetectedHand {
  label: string; // "right" or "left"
  score: number; // probability of predicted handedness
  landmarks: number[]; // flat 63-length list of floats representing the hand landmarks (21 landmarks * xyz)
}

function FileUploader() {
  //file uploading
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    if (selectedFile) {
      const tempUrl = URL.createObjectURL(selectedFile);
      setVideoURL(tempUrl);
      setRawRecordedBlob(selectedFile);
    }
  };

  const navigate = useNavigate();

  const handleRedirect = (): void => {
    if (!file) return;
    navigate("/results", { state: { videoURL: videoURL } });
  };

  // Video recorder
  const [permission, setPermission] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>(null);
  const [countdown, setCountdown] = useState(3);
  const [videoChunks, setVideoChunks] = useState<Blob[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [rawRecordedBlob, setRawRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    if (recordingStatus === "counting") {
      if (countdown > 0) {
        timerId = setTimeout(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        startRecording();
      }
    }
    return () => clearTimeout(timerId);
  }, [recordingStatus, countdown]);

  const getCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("The MediaRecorder API is not supported in this browser.");
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      streamRef.current = stream;
      setPermission(true);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Permission denied or error accessing media devices:", err);
      alert("Could not access camera or microphone.");
      return null;
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) return;

    setIsProcessing(true);

    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRawRecordedBlob(blob);
      setRecordedVideo(url);
      setVideoChunks([]);
    };

    setVideoChunks([]);
    mediaRecorder.start();
    setRecordingStatus("recording");
    startTrackingLoop();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    isStreamingRef.current = false;
    setRecordingStatus("stopped");
    setPoseVectors([...accumulatedDataRef.current]);
    setHandsVectors([...accumulatedHandsRef.current]);
    setIsProcessing(false);
  };

  const handleCameraAndStart = async () => {
    let currentStream = streamRef.current;
    if (!permission) {
      currentStream = await getCameraPermission();
    }
    if (currentStream) {
      setCountdown(3);
      setRecordingStatus("counting");
    }
  };

  // pose state
  const [poseVectors, setPoseVectors] = useState<number[][]>([]);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(
    null,
  );
  const accumulatedDataRef = useRef<number[][]>([]);

  // hands state
  const [handsVectors, setHandsVectors] = useState<DetectedHand[][]>([]); // handsVector[frameIdx] = hands detected that frame
  const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(
    null,
  );
  const accumulatedHandsRef = useRef<DetectedHand[][]>([]); // accumulated hands data across frames

  const [isProcessing, setIsProcessing] = useState<boolean>(true); //might not need
  const isStreamingRef = useRef<boolean>(false);

  // useEffect(() => {
  //   if (!rawRecordedBlob) {
  //     setIsProcessing(false);
  //     return;
  //   }

  //   setIsProcessing(true);
  //   extractPoseData(rawRecordedBlob)
  //     .then((data) => {
  //       setPoseVectors(data);
  //       setIsProcessing(false);
  //     })
  //     .catch((err) => {
  //       console.error("MediaPipe Extraction Failed:", err);
  //       setIsProcessing(false);
  //     });
  // }, [rawRecordedBlob]);
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
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
        setPoseLandmarker(pose);
        setHandLandmarker(hands);
        setIsProcessing(false);
      } catch (error) {
        console.error("Failed to initialize MediaPipe Landmarkers:", error);
        setIsProcessing(false);
      }
    };

    void initMediaPipe();
  }, []);

  // start tracking loop for pose and hands
  const startTrackingLoop = () => {
    if (!poseLandmarker || !handLandmarker || !liveVideoRef.current) return;

    isStreamingRef.current = true;
    accumulatedDataRef.current = [];
    accumulatedHandsRef.current = [];
    setPoseVectors([]);
    setHandsVectors([]);

    const video = liveVideoRef.current;

    const processFrame = () => {
      if (!isStreamingRef.current) return;

      if (video.readyState >= 2) {
        const timestamp = performance.now();

        // pose detection
        const poseResult = poseLandmarker.detectForVideo(video, timestamp);
        if (poseResult.worldLandmarks && poseResult.worldLandmarks.length > 0) {
          const currentFrameVector = poseResult.worldLandmarks[0].flatMap(
            (lm) => [lm.x, lm.y, lm.z],
          );
          accumulatedDataRef.current.push(currentFrameVector);
          setPoseVectors([...accumulatedDataRef.current]);
        }

        // hands detection
        const handResult = handLandmarker.detectForVideo(video, timestamp);
        const frameHands: DetectedHand[] = [];
        if (handResult.worldLandmarks && handResult.worldLandmarks.length > 0) {
          handResult.worldLandmarks.forEach((handLandmarks, index) => {
            const handednessInfo = handResult.handedness[index]?.[0]; // get the first category for the hand (should only be one)
            if (!handednessInfo) return;

            frameHands.push({
              label: handednessInfo.categoryName,
              score: handednessInfo.score,
              landmarks: handLandmarks.flatMap((lm) => [lm.x, lm.y, lm.z]),
            });
          });
        }
        // push even when empty to preserve frame-index alignment between pose and hands data
        accumulatedHandsRef.current.push(frameHands);
        setHandsVectors([...accumulatedHandsRef.current]); // update state with new hands data
      }
      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);
  };

  const handleResultsDownload = () => {
    if (!poseVectors || !handsVectors) return;

    const jsonString = JSON.stringify(
      {
        frameCount: poseVectors.length,
        landmarksPerFrame: 33,
        extractedAt: new Date().toISOString(),
        pose: poseVectors,
        hands: handsVectors,
      },
      null,
      2,
    );
    const jsonBlob = new Blob([jsonString], { type: "application/json" });
    saveAs(jsonBlob, "landmark_data_" + Date().toString() + ".json");
  };

  return (
    <main>
      <div className="flex flex-col lg:flex-row gap-5 justify-center items-stretch w-full px-4 mb-10">
        {/* file upload section */}
        <div className="flex flex-col items-center justify-between w-full max-w-150 min-h-130 p-6 border-2 border-neutral-dark rounded-xl bg-brand-light transition-all duration-300 ease-in-out hover hover:scale-[1.01]">
          {!file && (
            <div className="w-full flex-1 flex flex-col justify-center">
              <label
                htmlFor="upload-input"
                className="flex flex-col items-center justify-center w-full min-h-75 p-6 border-2 border-dashed border-brand-dark rounded-xl cursor-pointer bg-brand-light hover:bg-brand-alt-bg transition-colors"
              >
                <span className="flex flex-col items-center text-center text-sm text-gray-600 gap-2">
                  <div className="text-4xl mb-2">📁</div>
                  <span>
                    Drag and drop file here or{" "}
                    <strong className="text-brand font-bold">Browse</strong>
                  </span>
                  <p className="text-xs text-gray-400">
                    Accepted formats: MP4, MOV, WebM
                  </p>
                </span>
              </label>
              <input
                id="upload-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
          {file && (
            <div className="mt-2.5 text-center flex-1 flex flex-col items-center justify-center">
              <video
                src={videoURL}
                className="w-full max-w-125 rounded-lg border-2 border-neutral-dark object-cover aspect-video mb-3"
                controls
              />
              <p className="text-gray-700 text-sm">
                <strong className="text-brand">Uploaded Video:</strong>{" "}
                {file.name}
              </p>
            </div>
          )}
          <div className="w-full mt-4">
            <div className="flex flex-row gap-2.5 justify-center">
              <button
                type="button"
                className="font-button py-2 px-5 text-base text-white bg-brand rounded-md cursor-pointer transition-colors self-center hover:bg-brand-hover disabled:bg-brand-hover/40 disabled:cursor-default"
                disabled={
                  (!file && !rawRecordedBlob) || uploadStatus === "uploading"
                }
                onClick={handleRedirect}
              >
                Upload
              </button>
              {poseVectors.length > 0 &&
                handsVectors.length > 0 &&
                recordingStatus === "stopped" && (
                  <button
                    onClick={handleResultsDownload}
                    className="font-button py-2 px-5 text-sm text-white bg-brand-dark rounded-md transition-colors hover:bg-brand font-medium"
                  >
                    Download Landmark Data JSON File
                  </button>
                )}
              {poseVectors.length <= 0 && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <p className="text-sm text-gray-500 font-medium animate-pulse">
                    Loading Results File...
                  </p>
                  <SyncLoader
                    color="#4a90e2"
                    size={10}
                    loading={isProcessing}
                  ></SyncLoader>
                </div>
              )}
              <button
                type="button"
                className="font-button py-2 px-5 text-base text-white bg-brand rounded-md cursor-pointer transition-colors self-center hover:bg-brand-hover disabled:bg-brand-hover/40 disabled:cursor-default"
                disabled={!file || uploadStatus === "uploading"}
                onClick={() => {
                  setFile(null);
                  setUploadStatus(null);
                  setUploadProgress(0);
                  setVideoURL(undefined);
                }}
              >
                Reset
              </button>
            </div>
            {uploadStatus && (
              <div className="text-center mt-2 text-sm text-gray-500 font-medium">
                {uploadStatus} {uploadProgress > 0 && `${uploadProgress}%`}
              </div>
            )}
          </div>
        </div>
        {/* camera recording section */}
        <div className="flex flex-col items-center justify-between w-full max-w-150 min-h-130 p-6 border-2 border-neutral-dark rounded-xl bg-brand-light transition-all duration-300 ease-in-out hover hover:scale-[1.01]">
          <div className="w-full text-center flex flex-col items-center">
            <div className="text-4xl mb-1">📹</div>
            <span className="font-bold text-gray-700 text-sm">
              Record your video
            </span>
            <p className="text-xs text-gray-500 max-w-md mt-1 leading-relaxed">
              Your video will start recording after a 3-second countdown. A
              playback of your recording will be displayed below once the stop
              button is clicked.
            </p>
          </div>

          <div className="w-full flex-1 flex items-center justify-center my-4">
            {!rawRecordedBlob || !recordedVideo ? (
              <div className="relative w-full max-w-140 aspect-video rounded-lg overflow-hidden border-2 border-neutral-dark bg-black">
                <video
                  ref={liveVideoRef}
                  id="preview"
                  className="w-full max-w-140 aspect-video border-2 border-neutral-dark rounded-lg object-cover bg-black"
                  autoPlay
                  muted
                  playsInline
                />
                {recordingStatus === "counting" && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-all duration-200">
                    <span className="text-white text-7xl font-bold animate-ping">
                      {countdown}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <video
                key={recordedVideo}
                id="recording"
                src={recordedVideo}
                className="w-full max-w-140 aspect-video border-2 border-neutral-dark rounded-lg object-cover bg-black"
                controls
              />
            )}
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              className="font-button py-2 px-5 text-base text-white bg-brand rounded-md cursor-pointer transition-colors hover:bg-brand-hover disabled:bg-brand-hover/40 disabled:cursor-not-allowed"
              onClick={handleCameraAndStart}
              disabled={recordingStatus === "recording" || !!recordedVideo}
            >
              {recordingStatus === "counting"
                ? "Preparing..."
                : "Start Recording"}
            </button>
            <button
              type="button"
              className="font-button py-2 px-5 text-base text-white bg-brand rounded-md cursor-pointer transition-colors hover:bg-brand-hover disabled:bg-brand-hover/40 disabled:cursor-not-allowed"
              disabled={recordingStatus !== "recording"}
              onClick={() => {
                stopRecording();
                if (streamRef.current) {
                  streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                }
                setPermission(false);
              }}
            >
              Stop Recording
            </button>
          </div>
          <div className="w-full flex flex-row gap-2 justify-center flex-wrap border-t border-gray-200 pt-4">
            <button
              id="download"
              className="py-1.5 px-4 text-sm font-medium border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={!recordedVideo}
              onClick={() => {
                if (recordedVideo) {
                  saveAs(recordedVideo, "recorded_video.webm");
                }
              }}
            >
              Download Video
            </button>
            <button
              id="retakeButton"
              className="py-1.5 px-4 text-sm font-medium border border-gray-300 rounded-md bg-white text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              disabled={!recordedVideo}
              onClick={() => {
                setRecordedVideo(null);
                setRawRecordedBlob(null);
                setRecordingStatus(null);
                if (streamRef.current) {
                  streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                }
                setPermission(false);
              }}
            >
              Retake
            </button>
            <div>
              <button
                id="submitButton"
                className="py-1.5 px-4 text-sm font-medium border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                disabled={!rawRecordedBlob}
                onClick={() => {
                  handleResultsDownload;
                  if (streamRef.current) {
                    streamRef.current
                      .getTracks()
                      .forEach((track) => track.stop());
                  }
                  setPermission(false);
                  if (rawRecordedBlob && recordedVideo) {
                    navigate("/results", {
                      state: {
                        videoURL: recordedVideo,
                      },
                    });
                  }
                }}
              >
                Submit
              </button>
              {poseVectors.length > 0 &&
                handsVectors.length > 0 &&
                recordingStatus === "stopped" && (
                  <button
                    onClick={handleResultsDownload}
                    className="font-button py-2 px-5 text-sm text-white bg-brand-dark rounded-md transition-colors hover:bg-brand font-medium"
                  >
                    Download Landmark Results JSON File
                  </button>
                )}
            </div>
            {poseVectors.length <= 0 && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <p className="text-sm text-gray-500 font-medium animate-pulse">
                  Loading landmark data...
                </p>
                <SyncLoader
                  color="#4a90e2"
                  size={10}
                  loading={isProcessing}
                ></SyncLoader>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen py-10 bg-gray-50">
      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-2 relative inline-block left-1/2 -translate-x-1/2 after:content-[''] after:absolute after:w-full after:h-1 after:bg-brand-darker after:-bottom-2 after:left-0">
        Home
      </h1>
      <div className="text-center max-w-2xl mx-auto mt-6 mb-10 px-4 text-gray-600">
        <p className="text-base sm:text-lg leading-relaxed">
          <strong>
            Record{" "}
            <span className="underline decoration-brand-darker decoration-2">
              or
            </span>{" "}
            upload a video here.
          </strong>{" "}
          Your video will be stored temporarily, and you will be redirected to
          the results page once the upload is processed.
        </p>
      </div>

      <FileUploader />
    </main>
  );
}
