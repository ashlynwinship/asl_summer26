import { useNavigate } from "react-router-dom";
import {
  useState,
  useEffect,
  ChangeEvent,
  useRef,
  useLayoutEffect,
} from "react";
import { saveAs } from "file-saver";
import { useLocation } from "react-router-dom";
import { SyncLoader } from "react-spinners";
import { clearCanvas, drawLandmarkOverlay } from "../utils/landmarkDrawing";
import {
  DetectedHand,
  extractLandmarkVectors,
  initMediaPipe,
} from "../utils/mediapipe";
import {
  createMediaRecorder,
  startCameraStream,
  stopMediaTracks,
} from "../utils/recording";

type UploadStatus = "idle" | "uploading" | "success" | "error";
type RecordingStatus = null | "recording" | "stopped" | "counting";

function FileUploader() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  //file uploading
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [uploadDataReady, setUploadDataReady] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    resetLandmarkData();
    setFile(selectedFile);
    setRecordedVideo(null);
    setUploadDataReady(false);
    if (selectedFile) {
      const tempUrl = URL.createObjectURL(selectedFile);
      setVideoURL(tempUrl);
      setRawRecordedBlob(selectedFile);
    } else {
      setVideoURL(undefined);
      setRawRecordedBlob(null);
    }
  };

  const navigate = useNavigate();

  const handleRedirect = (): void => {
    if (!file) return;
    navigate("/results", { state: { videoURL: videoURL } });
  };

  // useEffect(() => {
  //   if (file && videoRef.current) {
  //     videoRef.current.play()
  //     .then(() => {

  //     })
  //   });

  // Video recorder
  const [permission, setPermission] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>(null);
  const [countdown, setCountdown] = useState(3);
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [videoChunks, setVideoChunks] = useState<Blob[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [rawRecordedBlob, setRawRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const countdownActiveRef = useRef(false);
  const countdownRunIdRef = useRef(0);
  const lastFrameProcessedAtRef = useRef(0);
  const uploadTrackingFrameRef = useRef<number | null>(null);
  const uploadTrackingActiveRef = useRef(false);
  const uploadLastProcessedTimeRef = useRef(0);
  const frameStepMs = 100;

  const clearCountdownTimer = () => {
    if (countdownTimerRef.current !== null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    countdownActiveRef.current = false;
  };

  const resetCountdownState = () => {
    clearCountdownTimer();
    setCountdownVisible(false);
    setCountdown(3);
    setRecordingStatus(null);
  };

  useEffect(() => {
    if (recordingStatus !== "counting") {
      return;
    }

    if (countdown <= 0) {
      clearCountdownTimer();
      setCountdownVisible(false);
      setRecordingStatus("recording");
      void startRecording();
      return;
    }

    countdownActiveRef.current = true;
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => {
      if (countdownTimerRef.current !== null) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [recordingStatus, countdown]);

  const getCameraPermission = async () => {
    try {
      const stream = await startCameraStream();
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

    clearCountdownTimer();
    setIsProcessing(true);

    const mediaRecorder = createMediaRecorder(streamRef.current);
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
    //startTrackingLoop();
  };

  //Landmark drawing - erase on final deployment (only for debugging and testing right now)
  const clearOverlay = () => {
    clearCanvas(overlayCanvasRef.current);
  };

  const clearUploadOverlay = () => {
    clearCanvas(uploadOverlayCanvasRef.current);
  };

  const stopUploadTrackingLoop = () => {
    uploadTrackingActiveRef.current = false;
    if (uploadTrackingFrameRef.current !== null) {
      window.cancelAnimationFrame(uploadTrackingFrameRef.current);
      uploadTrackingFrameRef.current = null;
    }
    clearUploadOverlay();
  };

  const resetLandmarkData = () => {
    stopUploadTrackingLoop();
    isStreamingRef.current = false;
    clearOverlay();
    clearUploadOverlay();
    accumulatedDataRef.current = [];
    accumulatedHandsRef.current = [];
    uploadAccumulatedDataRef.current = [];
    uploadAccumulatedHandsRef.current = [];
    setPoseVectors([]);
    setHandsVectors([]);
    setUploadPoseVectors([]);
    setUploadHandsVectors([]);
    setUploadDataReady(false);
  };

  const resetUploadLandmarkData = () => {
    stopUploadTrackingLoop();
    clearUploadOverlay();
    uploadAccumulatedDataRef.current = [];
    uploadAccumulatedHandsRef.current = [];
    setUploadPoseVectors([]);
    setUploadHandsVectors([]);
    setUploadDataReady(false);
  };

  const resetRecordingLandmarkData = () => {
    isStreamingRef.current = false;
    clearOverlay();
    accumulatedDataRef.current = [];
    accumulatedHandsRef.current = [];
    setPoseVectors([]);
    setHandsVectors([]);
  };

  const stopRecording = () => {
    clearCountdownTimer();

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    isStreamingRef.current = false;
    clearOverlay();
    setRecordingStatus("stopped");
    setPoseVectors([...accumulatedDataRef.current]);
    setHandsVectors([...accumulatedHandsRef.current]);
    setIsProcessing(false);
  };

  const handleCameraAndStart = async () => {
    if (countdownActiveRef.current || recordingStatus === "counting") {
      return;
    }

    let currentStream = streamRef.current;
    if (!permission) {
      currentStream = await getCameraPermission();
    }
    if (currentStream) {
      clearCountdownTimer();
      setCountdownVisible(false);
      setCountdown(3);
      setRecordingStatus("recording");

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = currentStream;
      }

      const waitForPreview = async () => {
        if (!liveVideoRef.current) return;

        if (liveVideoRef.current.readyState >= 2) {
          return;
        }

        await new Promise<void>((resolve) => {
          const video = liveVideoRef.current;
          if (!video) {
            resolve();
            return;
          }
          const handleLoadedData = () => {
            video.removeEventListener("loadeddata", handleLoadedData);
            resolve();
          };
          video.addEventListener("loadeddata", handleLoadedData, {
            once: true,
          });
        });
      };

      await waitForPreview();

      try {
        await liveVideoRef.current?.play();
      } catch (err) {
        console.error("Failed to start preview playback:", err);
      }

      const runId = countdownRunIdRef.current + 1;
      countdownRunIdRef.current = runId;
      setCountdown(3);
      setCountdownVisible(true);
      setRecordingStatus("counting");
      countdownActiveRef.current = true;
    }
  };

  // pose state - RECORDING
  const [poseVectors, setPoseVectors] = useState<number[][]>([]);
  const [poseLandmarker, setPoseLandmarker] = useState<any>(null);
  const accumulatedDataRef = useRef<number[][]>([]);

  // hands state - RECORDING
  const [handsVectors, setHandsVectors] = useState<DetectedHand[][]>([]);
  const [handLandmarker, setHandLandmarker] = useState<any>(null);
  const accumulatedHandsRef = useRef<DetectedHand[][]>([]);

  // pose state - UPLOAD
  const [uploadPoseVectors, setUploadPoseVectors] = useState<number[][]>([]);
  const uploadAccumulatedDataRef = useRef<number[][]>([]);

  // hands state - UPLOAD
  const [uploadHandsVectors, setUploadHandsVectors] = useState<
    DetectedHand[][]
  >([]);
  const uploadAccumulatedHandsRef = useRef<DetectedHand[][]>([]);

  const [isProcessing, setIsProcessing] = useState<boolean>(true); //might not need
  const isStreamingRef = useRef<boolean>(false);

  useEffect(() => {
    const loadMediaPipe = async () => {
      try {
        const { pose, hands } = await initMediaPipe();
        setPoseLandmarker(pose);
        setHandLandmarker(hands);
        setIsProcessing(false);
      } catch (error) {
        console.error("Failed to initialize MediaPipe Landmarkers:", error);
        setIsProcessing(false);
      }
    };

    void loadMediaPipe();
  }, []);

  useEffect(() => {
    if (
      !permission ||
      !poseLandmarker ||
      !handLandmarker ||
      !liveVideoRef.current
    ) {
      return;
    }

    if (recordingStatus === "recording") {
      // Start the loop only when actively recording
      startTrackingLoop();
    } else {
      // Stop the loop and reset the flag if stop recording
      isStreamingRef.current = false;
      clearOverlay();
    }

    return () => {
      isStreamingRef.current = false;
    };
  }, [recordingStatus, permission, poseLandmarker, handLandmarker]);
  //start

  useEffect(() => {
    if (!file || !videoURL || !poseLandmarker || !handLandmarker) {
      stopUploadTrackingLoop();
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const startUploadTracking = () => {
      stopUploadTrackingLoop();
      uploadTrackingActiveRef.current = true;
      uploadLastProcessedTimeRef.current = 0;
      uploadAccumulatedDataRef.current = [];
      uploadAccumulatedHandsRef.current = [];
      setUploadPoseVectors([]);
      setUploadHandsVectors([]);
      setUploadDataReady(false);

      const canvas = uploadOverlayCanvasRef.current;
      const finalizeUploadLandmarks = () => {
        uploadTrackingActiveRef.current = false;
        clearUploadOverlay();
        setUploadPoseVectors([...uploadAccumulatedDataRef.current]);
        setUploadHandsVectors([...uploadAccumulatedHandsRef.current]);
        setUploadDataReady(true);
      };

      const processFrame = () => {
        if (!uploadTrackingActiveRef.current || !video) {
          return;
        }

        if (
          video.ended ||
          (video.duration > 0 && video.currentTime >= video.duration - 0.01)
        ) {
          finalizeUploadLandmarks();
          return;
        }

        const playbackTimeMs = video.currentTime * 1000;
        if (playbackTimeMs - uploadLastProcessedTimeRef.current < frameStepMs) {
          uploadTrackingFrameRef.current =
            window.requestAnimationFrame(processFrame);
          return;
        }
        uploadLastProcessedTimeRef.current = playbackTimeMs;

        if (video.readyState >= 2) {
          const timestamp = performance.now();
          const poseResult = poseLandmarker.detectForVideo(video, timestamp);
          const handResult = handLandmarker.detectForVideo(video, timestamp);

          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              const width = video.videoWidth || 640;
              const height = video.videoHeight || 480;
              if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
              }
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              drawLandmarkOverlay({
                ctx,
                poseResult,
                handResult,
                width,
                height,
              });
            }
          }

          const {
            poseVectors: currentPoseVectors,
            handsVectors: currentHandsVectors,
          } = extractLandmarkVectors({ poseResult, handResult });
          if (currentPoseVectors.length > 0) {
            uploadAccumulatedDataRef.current.push(currentPoseVectors[0]);
          }
          uploadAccumulatedHandsRef.current.push(currentHandsVectors[0] ?? []);
        }

        uploadTrackingFrameRef.current =
          window.requestAnimationFrame(processFrame);
      };

      video.src = videoURL;
      video.load();
      video.currentTime = 0;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      void video.play().catch((error) => {
        console.error("Failed to autoplay uploaded video:", error);
      });

      const handleLoadedData = () => {
        uploadTrackingFrameRef.current =
          window.requestAnimationFrame(processFrame);
      };

      const handleVideoEnded = () => {
        finalizeUploadLandmarks();
      };

      video.addEventListener("loadeddata", handleLoadedData, { once: true });
      video.addEventListener("ended", handleVideoEnded, { once: true });
      return () => {
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("ended", handleVideoEnded);
      };
    };

    const handlePlaybackReady = () => {
      void startUploadTracking();
    };

    handlePlaybackReady();

    return () => {
      stopUploadTrackingLoop();
    };
  }, [file, videoURL, poseLandmarker, handLandmarker]);

  // start tracking loop for pose and hands
  const startTrackingLoop = () => {
    if (
      !poseLandmarker ||
      !handLandmarker ||
      !liveVideoRef.current ||
      recordingStatus !== "recording"
    )
      return;

    isStreamingRef.current = true;
    accumulatedDataRef.current = [];
    accumulatedHandsRef.current = [];
    lastFrameProcessedAtRef.current = 0;
    setPoseVectors([]);
    setHandsVectors([]);

    const video = liveVideoRef.current;
    // canvas landmark drawing
    const canvas = overlayCanvasRef.current;

    const processFrame = () => {
      if (!isStreamingRef.current) return;

      const now = performance.now();
      if (now - lastFrameProcessedAtRef.current < frameStepMs) {
        requestAnimationFrame(processFrame);
        return;
      }
      lastFrameProcessedAtRef.current = now;

      if (video.readyState >= 2) {
        const timestamp = now;

        const poseResult = poseLandmarker.detectForVideo(video, timestamp);
        const handResult = handLandmarker.detectForVideo(video, timestamp);

        // still landmark drawing

        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const width = video.videoWidth || 640;
            const height = video.videoHeight || 480;
            if (canvas.width !== width || canvas.height !== height) {
              canvas.width = width;
              canvas.height = height;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            drawLandmarkOverlay({
              ctx,
              poseResult,
              handResult,
              width,
              height,
            });
          }
        }

        const {
          poseVectors: currentPoseVectors,
          handsVectors: currentHandsVectors,
        } = extractLandmarkVectors({ poseResult, handResult });
        if (currentPoseVectors.length > 0) {
          accumulatedDataRef.current.push(currentPoseVectors[0]);
          setPoseVectors([...accumulatedDataRef.current]);
        }
        accumulatedHandsRef.current.push(currentHandsVectors[0] ?? []);
        setHandsVectors([...accumulatedHandsRef.current]);
      }
      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);
  };

  const handleResultsDownload = (source: "upload" | "recording") => {
    const isUpload = source === "upload";
    const poses = isUpload ? uploadPoseVectors : poseVectors;
    const hands = isUpload ? uploadHandsVectors : handsVectors;

    if (!poses || !hands) return;

    const jsonString = JSON.stringify(
      {
        frameCount: poses.length,
        extractedAt: new Date().toISOString(),
        pose: poses,
        hands: hands,
      },
      null,
      2,
    );
    const jsonBlob = new Blob([jsonString], { type: "application/json" });
    saveAs(jsonBlob, `landmark_data_${source}_${Date().toString()}.json`);
  };

  // UI state for tab switching
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");
  const [tabError, setTabError] = useState<string | null>(null);

  const handleTabSwitch = (targetTab: "record" | "upload") => {
    const isRecordingOrCounting =
      recordingStatus === "recording" || recordingStatus === "counting";
    const hasActiveContent = !!file || !!rawRecordedBlob || !!recordedVideo;

    if (isRecordingOrCounting || hasActiveContent) {
      setTabError(
        "Please reset or remove your current video before switching options.",
      );
      return;
    }

    setTabError(null);
    setActiveTab(targetTab);
  };

  return (
    <main className="w-full flex flex-col items-center justify-center px-4 mb-16">
      {/* tab controls */}
      <div className="relative flex items-center bg-gray-200/80 p-1.5 rounded-full mb-8 w-full max-w-sm shadow-inner">
        <div
          className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[#9E2A2B] rounded-full transition-all duration-300 ease-in-out shadow-md ${
            activeTab === "record" ? "left-1.5" : "left-[calc(50%+3px)]"
          }`}
        />
        <button
          type="button"
          onClick={() => handleTabSwitch("record")}
          className={`relative z-10 flex-1 py-2.5 text-center text-lg font-bold tracking-wide transition-colors duration-200 ${
            activeTab === "record"
              ? "text-white"
              : "text-gray-700 hover:text-gray-900"
          }`}
        >
          RECORD
        </button>
        <button
          type="button"
          onClick={() => handleTabSwitch("upload")}
          className={`relative z-10 flex-1 py-2.5 text-center text-lg font-bold tracking-wide transition-colors duration-200 ${
            activeTab === "upload"
              ? "text-white"
              : "text-gray-700 hover:text-gray-900"
          }`}
        >
          UPLOAD
        </button>
      </div>

      {/* error message */}
      {tabError && (
        <div className="w-full max-w-2xl mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{tabError}</p>
          </div>
          <button
            type="button"
            onClick={() => setTabError(null)}
            className="text-red-600 hover:text-red-800 font-bold text-sm px-2 py-1 rounded-md hover:bg-red-200/60 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* tab content container */}
      <div className="w-full max-w-2xl bg-[#EAEAEA] rounded-2xl p-8 border border-gray-300/60 shadow-lg transition-all duration-300">
        {/* record content */}
        {activeTab === "record" && (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 tracking-tight">
              Record your video
            </h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Your video will start recording after a 3-second countdown. A
              playback of your recording will be displayed below once the stop
              button is clicked.
            </p>

            <div className="w-full aspect-video bg-gray-900 rounded-xl border border-gray-400/50 flex items-center justify-center relative overflow-hidden shadow-inner">
              {recordedVideo ? (
                <video
                  key={recordedVideo}
                  src={recordedVideo}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={liveVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  />
                  {recordingStatus === "counting" && countdownVisible && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-20">
                      <span className="text-white text-8xl font-black animate-pulse">
                        {countdown}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mt-6">
              <button
                type="button"
                onClick={handleCameraAndStart}
                disabled={
                  recordingStatus === "recording" ||
                  recordingStatus === "counting" ||
                  !!recordedVideo
                }
                className="py-3 px-4 font-bold text-white bg-[#34A853] hover:bg-[#2E9647] rounded-full transition-colors duration-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {recordingStatus === "counting"
                  ? "Preparing..."
                  : "Start Recording"}
              </button>

              <button
                type="button"
                onClick={() => {
                  stopRecording();
                  stopMediaTracks(streamRef.current);
                  setPermission(false);
                }}
                disabled={recordingStatus !== "recording"}
                className="py-3 px-4 font-bold text-white bg-[#EA4335] hover:bg-[#D93025] rounded-full transition-colors duration-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Stop Recording
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-6 border-t border-gray-300/70 w-full">
              <button
                type="button"
                disabled={!recordedVideo}
                onClick={() =>
                  recordedVideo && saveAs(recordedVideo, "recorded_video.webm")
                }
                className="px-5 py-2 font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-full border border-gray-300 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Download Video
              </button>

              <button
                type="button"
                disabled={!recordedVideo}
                onClick={() => {
                  resetRecordingLandmarkData();
                  setRecordedVideo(null);
                  setRawRecordedBlob(null);
                  setCountdownVisible(false);
                  setCountdown(3);
                  stopMediaTracks(streamRef.current);
                  setPermission(false);
                }}
                className="px-5 py-2 font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-full border border-gray-300 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Retake
              </button>

              <button
                type="button"
                disabled={!rawRecordedBlob}
                onClick={async () => {
                  stopMediaTracks(streamRef.current);
                  setPermission(false);
                  const activeBlob = rawRecordedBlob ?? (file ? file : null);
                  const activeVideoUrl = recordedVideo ?? videoURL ?? null;
                  const poses = file ? uploadPoseVectors : poseVectors;
                  const hands = file ? uploadHandsVectors : handsVectors;
                  try {
                    const res = await fetch(`${apiBaseUrl}/api/jobs`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        frame_count: poses.length,
                        landmarks_per_frame: 33,
                        extracted_at: new Date().toISOString(),
                        pose: poses,
                        hands: hands,
                      }),
                    });
                    const data = await res.json();
                    navigate(`/results/${data.job_id}`, {
                      state: { videoURL: activeVideoUrl },
                    });
                  } catch (error) {
                    console.error("Error submitting job:", error);
                  }
                }}
                className="px-8 py-2 font-semibold text-white bg-[#4385F5] hover:bg-[#3367D6] rounded-full transition-colors duration-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit
              </button>
              {poseVectors.length > 0 &&
                handsVectors.length > 0 &&
                recordingStatus === "stopped" && (
                  <button
                    onClick={() => handleResultsDownload("recording")}
                    className="font-button py-2 px-5 text-white bg-brand-dark rounded-md transition-colors hover:bg-brand font-medium"
                  >
                    Download Live Landmark Results JSON File
                  </button>
                )}
            </div>
          </div>
        )}

        {/* upload content */}
        {activeTab === "upload" && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 tracking-tight">
              Upload your video
            </h2>
            <div
              className={`w-full aspect-video rounded-xl transition-all duration-200 overflow-hidden relative flex flex-col items-center justify-center text-center ${
                file
                  ? "bg-black border-none"
                  : "bg-gray-300/80 border-2 border-dashed border-gray-400 group hover:border-[#9E2A2B] hover:bg-gray-300/50" // Dashed dropzone when empty
              }`}
            >
              {" "}
              {!file && (
                <label
                  htmlFor="upload-input"
                  className="cursor-pointer w-full h-full flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 mb-3 text-gray-500 group-hover:scale-110 transition-transform duration-200">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-medium text-sm sm:text-base">
                    Browse <span className="font-bold text-gray-900">or</span>{" "}
                    drag & drop file here.
                  </p>
                  <p className="text-sm text-gray-500 mt-1.5">
                    Accepted formats: .mov, .mp4, .webm
                  </p>
                </label>
              )}
              {file && (
                <div className="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    src={videoURL}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas
                    ref={uploadOverlayCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  />
                </div>
              )}
              <input
                id="upload-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <div className="w-full mt-8">
              <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                <button
                  type="button"
                  onClick={() => {
                    resetUploadLandmarkData();
                    setFile(null);
                    setVideoURL(undefined);
                    setRawRecordedBlob(null);
                    setPermission(false);
                    setCountdownVisible(false);
                    setCountdown(3);
                    stopMediaTracks(streamRef.current);
                  }}
                  disabled={!file}
                  className="px-8 py-2.5 font-semibold text-gray-700 bg-white hover:bg-gray-100 rounded-full border border-gray-300 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleRedirect}
                  disabled={
                    (!file && !rawRecordedBlob) ||
                    uploadStatus === "uploading" ||
                    uploadDataReady === false
                  }
                  className="px-8 py-2.5 font-semibold text-white bg-[#4385F5] hover:bg-[#3367D6] rounded-full transition-colors duration-200 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
                {uploadPoseVectors.length > 0 &&
                  uploadHandsVectors.length > 0 &&
                  file &&
                  uploadDataReady && (
                    <button
                      onClick={() => handleResultsDownload("upload")}
                      className="font-button py-2 px-5 text-sm text-white bg-brand-dark rounded-md transition-colors hover:bg-brand font-medium"
                    >
                      Download Landmark Data JSON File
                    </button>
                  )}
              </div>
              {file && !uploadDataReady && uploadStatus !== "uploading" && (
                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium animate-pulse mt-5">
                  <span>
                    Processing video landmarks with MediaPipe... Please wait.
                  </span>
                </div>
              )}
              {uploadStatus && (
                <div className="text-center mt-2 text-sm text-gray-500 font-medium">
                  {uploadStatus} {uploadProgress > 0 && `${uploadProgress}%`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="justify-center mt-6">
        <div className="flex justify-center">
          <img
            src="ASLWELCOMEIMAGE.PNG"
            alt="Header visual"
            className="rounded-lg"
          />
        </div>
        <h1 className="text-center font-head text-gray-900 text-[50px] leading-tight mt-2">
          To ASL Live Dictionary!
        </h1>
      </div>
      <div className="w-23/24 h-1 mt-4 border-b border-gray-500 mx-auto"></div>
      <div className="text-center mt-6 mb-10 text-gray-600">
        <p className="text-base sm:text-lg leading-relaxed">
          <strong>
            Record <span className="text-black font-bold">or</span> upload a
            video below.
          </strong>{" "}
          Your video will be stored temporarily, and you will be redirected to
          the results page once the upload is processed.
        </p>
      </div>
      <FileUploader />
    </main>
  );
}
