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

  //original original code
  // useEffect(() => {
  //   let timerId: ReturnType<typeof setTimeout>;
  //   if (recordingStatus === "counting") {
  //     if (countdown > 0) {
  //       timerId = setTimeout(() => {
  //         setCountdown((prev) => prev - 1);
  //       }, 1000);
  //     } else {
  //       startRecording();
  //     }
  //   }
  //   return () => clearTimeout(timerId);
  // }, [recordingStatus, countdown]);
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

  // const clearCountdownTimer = () => {
  //   if (countdownTimerRef.current !== null) {
  //     window.clearTimeout(countdownTimerRef.current);
  //     countdownTimerRef.current = null;
  //   }
  //   countdownActiveRef.current = false;
  // };

  // const resetCountdownState = () => {
  //   clearCountdownTimer();
  //   countdownRunIdRef.current += 1;
  //   setCountdownVisible(false);
  //   setCountdown(3);
  //   setRecordingStatus(null);
  //   countdownActiveRef.current = false;
  // };

  // useEffect(() => {
  //   if (recordingStatus !== "counting") {
  //     return;
  //   }

  //   if (countdown === 1) {
  //     const timerId = window.setTimeout(() => {
  //       clearCountdownTimer();
  //       setCountdownVisible(false);
  //       setRecordingStatus("recording");
  //       void startRecording();
  //     }, 1000);

  //     countdownTimerRef.current = timerId;

  //     return () => {
  //       window.clearTimeout(timerId);
  //     };
  //   }

  //   if (countdown <= 0) {
  //     return;
  //   }

  //   const timerId = window.setTimeout(() => {
  //     setCountdown((prev) => prev - 1);
  //   }, 1000);

  //   countdownTimerRef.current = timerId;

  //   return () => {
  //     window.clearTimeout(timerId);
  //   };
  // }, [countdown, recordingStatus]);

  // useEffect(() => {
  //   return () => {
  //     clearCountdownTimer();
  //   };
  // }, []);

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

  // still landmark drawing
  // useEffect(() => {
  //   if (
  //     !permission ||
  //     !poseLandmarker ||
  //     !handLandmarker ||
  //     !liveVideoRef.current
  //   ) {
  //     return;
  //   }

  //   if (!isStreamingRef.current) {
  //     startTrackingLoop();
  //   }
  // }, [permission, poseLandmarker, handLandmarker]);
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

  //end

  //realstart
  // useEffect(() => {
  //   if (!file || !videoURL || !poseLandmarker || !handLandmarker) {
  //     stopUploadTrackingLoop();
  //     return;
  //   }

  //   const video = videoRef.current;
  //   if (!video) {
  //     return;
  //   }

  //   let active = true;

  //   // Triggered every time the video successfully jumps to our target timestamp
  //   const handleSeeked = () => {
  //     if (!active) return;
  //     processCurrentFrameAndStep();
  //   };

  //   // Triggered when the initial video frame loads
  //   const handleLoadedData = () => {
  //     if (!active) return;
  //     processCurrentFrameAndStep();
  //   };

  //   const finalizeUploadLandmarks = () => {
  //     active = false;
  //     uploadTrackingActiveRef.current = false;
  //     clearUploadOverlay();
  //     setUploadPoseVectors([...uploadAccumulatedDataRef.current]);
  //     setUploadHandsVectors([...uploadAccumulatedHandsRef.current]);
  //     setUploadDataReady(true);
  //   };

  //   const stepSeconds = frameStepMs / 1000; // e.g., 100ms becomes 0.1s

  //   const processCurrentFrameAndStep = () => {
  //     if (!active || !video) return;

  //     // 1. Process the decoded frame we just seeked to
  //     if (video.readyState >= 2) {
  //       // Use performance.now() so MediaPipe always sees a strictly increasing timestamp
  //       const timestamp = performance.now();
  //       const poseResult = poseLandmarker.detectForVideo(video, timestamp);
  //       const handResult = handLandmarker.detectForVideo(video, timestamp);

  //       const canvas = uploadOverlayCanvasRef.current;
  //       if (canvas) {
  //         const ctx = canvas.getContext("2d");
  //         if (ctx) {
  //           const width = video.videoWidth || 640;
  //           const height = video.videoHeight || 480;
  //           if (canvas.width !== width || canvas.height !== height) {
  //             canvas.width = width;
  //             canvas.height = height;
  //           }
  //           ctx.clearRect(0, 0, canvas.width, canvas.height);

  //           drawLandmarkOverlay({
  //             ctx,
  //             poseResult,
  //             handResult,
  //             width,
  //             height,
  //           });
  //         }
  //       }

  //       const {
  //         poseVectors: currentPoseVectors,
  //         handsVectors: currentHandsVectors,
  //       } = extractLandmarkVectors({ poseResult, handResult });

  //       if (currentPoseVectors.length > 0) {
  //         // Fix: Save to upload-specific accumulated arrays
  //         uploadAccumulatedDataRef.current.push(currentPoseVectors[0]);
  //       }
  //       uploadAccumulatedHandsRef.current.push(currentHandsVectors[0] ?? []);
  //     }

  //     // 2. Decide if we reached the end of the video
  //     const nextTime = video.currentTime + stepSeconds;
  //     if (nextTime >= video.duration) {
  //       finalizeUploadLandmarks();
  //       return;
  //     }

  //     // 3. Move the playhead forward. This automatically triggers 'handleSeeked' above!
  //     video.currentTime = nextTime;
  //   };

  //   // Initialize clean tracking states
  //   stopUploadTrackingLoop();
  //   uploadTrackingActiveRef.current = true;
  //   uploadAccumulatedDataRef.current = [];
  //   uploadAccumulatedHandsRef.current = [];
  //   setUploadPoseVectors([]);
  //   setUploadHandsVectors([]);
  //   setUploadDataReady(false);

  //   // Keep the video PAUSED so it doesn't run ahead of MediaPipe
  //   video.src = videoURL;
  //   video.load();
  //   video.currentTime = 0;
  //   video.muted = true;
  //   video.playsInline = true;
  //   video.pause();

  //   // Listeners to drive our programmatic playback step-by-step
  //   video.addEventListener("seeked", handleSeeked);
  //   video.addEventListener("loadeddata", handleLoadedData, { once: true });

  //   // Clean up cleanly on unmount / re-upload
  //   return () => {
  //     active = false;
  //     stopUploadTrackingLoop();
  //     video.removeEventListener("seeked", handleSeeked);
  //     video.removeEventListener("loadeddata", handleLoadedData);
  //   };
  // }, [file, videoURL, poseLandmarker, handLandmarker]);
  // //realend

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
        handLandmarksPerFrame: 33,
        poseLandmarksPerFrame: 21,
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

  return (
    <main>
      <div className="flex flex-col lg:flex-row gap-5 justify-center items-stretch w-full px-4 mb-10">
        {/* file upload section */}
        <div className="flex flex-col items-center justify-between w-full max-w-150 min-h-130 p-6 border-2 border-neutral-dark rounded-xl bg-brand-light transition-all duration-300 ease-in-out hover hover:scale-[1.01]">
          {!file &&
            recordingStatus !== "recording" &&
            recordingStatus !== "counting" &&
            poseVectors.length <= 0 && (
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
          {(recordingStatus === "recording" ||
            recordingStatus === "counting" ||
            (!file && rawRecordedBlob)) && (
            <div className="mt-2.5 text-center flex-1 flex flex-col items-center justify-center w-full">
              <div className="w-full max-w-125 aspect-video rounded-lg border-2 border-neutral-dark bg-gray-900/90 flex items-center justify-center text-center px-6 mb-3">
                <p className="text-sm text-gray-200">
                  Currently live recording. Upload video disabled.
                </p>
              </div>
              {/* <p
            //   className="text-sm text-transparent select-none"
            //   aria-hidden="true"
            // >
            //   Placeholder
            // </p> */}
            </div>
          )}
          {file && (
            <div className="mt-2.5 text-center flex-1 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-125 aspect-video rounded-lg overflow-hidden border-2 border-neutral-dark bg-black mb-3">
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
                  style={{ display: "block" }}
                />
              </div>
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
                  (!file && !rawRecordedBlob) ||
                  uploadStatus === "uploading" ||
                  uploadDataReady === false
                }
                onClick={handleRedirect}
              >
                Upload
              </button>
              {/* {file && !uploadDataReady && (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <p className="text-sm text-gray-500 font-medium animate-pulse">
                    Processing uploaded video landmarks...
                  </p>
                </div>
              )} */}
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
              {/* {poseVectors.length <= 0 && !file && (
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
              )} */}
              <button
                type="button"
                className="font-button py-2 px-5 text-base text-white bg-brand rounded-md cursor-pointer transition-colors self-center hover:bg-brand-hover disabled:bg-brand-hover/40 disabled:cursor-default"
                disabled={
                  !file ||
                  recordedVideo !== null ||
                  recordingStatus === "recording"
                }
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
            {file ? (
              <div className="w-full max-w-140 aspect-video rounded-lg border-2 border-neutral-dark bg-gray-900/90 flex items-center justify-center text-center px-6">
                <p className="text-sm text-gray-200">
                  Currently using upload video. Live recording disabled.
                </p>
              </div>
            ) : recordedVideo ? (
              <video
                key={recordedVideo}
                id="recording"
                src={recordedVideo}
                className="w-full max-w-140 aspect-video border-2 border-neutral-dark rounded-lg object-cover bg-black"
                controls
              />
            ) : (
              <div className="relative w-full max-w-140 aspect-video rounded-lg overflow-hidden border-2 border-neutral-dark bg-black">
                <video
                  ref={liveVideoRef}
                  id="preview"
                  className="w-full max-w-140 aspect-video border-2 border-neutral-dark rounded-lg object-cover bg-black"
                  autoPlay
                  muted
                  playsInline
                />
                {/* still landmark drawing */}
                <canvas
                  ref={overlayCanvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  style={{ display: "block" }}
                />
                {recordingStatus === "counting" && countdownVisible && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-all duration-200">
                    <span className="text-white text-7xl font-bold animate-ping">
                      {countdown}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full flex flex-col gap-3">
            <button
              type="button"
              className="font-button py-2 px-5 text-base text-white bg-brand rounded-md cursor-pointer transition-colors hover:bg-brand-hover disabled:bg-brand-hover/40 disabled:cursor-not-allowed"
              onClick={handleCameraAndStart}
              disabled={
                !!file ||
                recordingStatus === "recording" ||
                recordingStatus === "counting" ||
                !!recordedVideo
              }
            >
              {recordingStatus === "counting"
                ? "Preparing..."
                : "Start Recording"}
            </button>
            <button
              type="button"
              className="font-button py-2 px-5 text-base text-white bg-brand rounded-md cursor-pointer transition-colors hover:bg-brand-hover disabled:bg-brand-hover/40 disabled:cursor-not-allowed"
              disabled={!!file || recordingStatus !== "recording"}
              onClick={() => {
                stopRecording();
                stopMediaTracks(streamRef.current);
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
                resetRecordingLandmarkData();
                setRecordedVideo(null);
                setRawRecordedBlob(null);
                setCountdownVisible(false);
                setCountdown(3);
                stopMediaTracks(streamRef.current);
                setPermission(false);
              }}
            >
              Retake
            </button>
            <div>
              <button
                id="submitButton"
                className="py-1.5 px-4 text-sm font-medium border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                disabled={
                  (!rawRecordedBlob && !file) ||
                  (file ? !uploadDataReady : false)
                }
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
              >
                Submit
              </button>
              {poseVectors.length > 0 &&
                handsVectors.length > 0 &&
                recordingStatus === "stopped" && (
                  <button
                    onClick={() => handleResultsDownload("recording")}
                    className="font-button py-2 px-5 text-sm text-white bg-brand-dark rounded-md transition-colors hover:bg-brand font-medium"
                  >
                    Download Live Landmark Results JSON File
                  </button>
                )}
            </div>
            {/* {poseVectors.length <= 0 && (
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
            )} */}
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
