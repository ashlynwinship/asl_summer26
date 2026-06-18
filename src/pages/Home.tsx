import { useNavigate } from "react-router-dom";
import { useState, ChangeEvent, useRef } from "react";
import { saveAs } from "file-saver";
// import { SyncLoader } from "react-spinners";
// above will be implemented on home screen when server available

type UploadStatus = "idle" | "uploading" | "success" | "error";

function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
    if (selectedFile) {
      const tempUrl = URL.createObjectURL(selectedFile);
      setVideoURL(tempUrl);
    }
  };

  const navigate = useNavigate();

  const handleRedirect = (): void => {
    if (!file) return;
    navigate("/results", { state: { videoBlob: file, videoURL: videoURL } });
  };

  // Video recorder
  const [permission, setPermission] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<
    null | "recording" | "stopped"
  >(null);
  const [videoChunks, setVideoChunks] = useState<Blob[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);

  const [rawRecordedBlob, setRawRecordedBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("The MediaRecorder API is not supported in this browser.");
      return;
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
    } catch (err) {
      console.error("Permission denied or error accessing media devices:", err);
      alert("Could not access camera or microphone.");
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) return;

    const mediaRecorder = new MediaRecorder(streamRef.current);
    mediaRecorderRef.current = mediaRecorder;
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setRawRecordedBlob(blob);
      setRecordedVideo(url);
      setVideoChunks([]);
    };

    setVideoChunks([]);
    mediaRecorder.start();
    setRecordingStatus("recording");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingStatus("stopped");
    }
  };

  const handleCameraAndStart = async () => {
    if (!permission) {
      await getCameraPermission();
    }
    startRecording();
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
                disabled={!file || uploadStatus === "uploading"}
                onClick={handleRedirect}
              >
                Upload
              </button>

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
              Your video will immediately start recording once you click the
              start button. A playback of your recording will be displayed below
              once the stop button is clicked.
            </p>
          </div>

          <div className="w-full flex-1 flex items-center justify-center my-4">
            {!recordedVideo ? (
              <video
                ref={liveVideoRef}
                id="preview"
                className="w-full max-w-140 aspect-video border-2 border-neutral-dark rounded-lg object-cover bg-black"
                autoPlay
                muted
                playsInline
              />
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
              Start Recording
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
            <button
              id="submitButton"
              className="py-1.5 px-4 text-sm font-medium border border-gray-300 rounded-md bg-white text-green-600 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              disabled={!rawRecordedBlob}
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                }
                setPermission(false);
                if (rawRecordedBlob && recordedVideo) {
                  navigate("/results", {
                    state: {
                      videoBlob: rawRecordedBlob,
                      videoURL: recordedVideo,
                    },
                  });
                }
              }}
            >
              Submit
            </button>
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
