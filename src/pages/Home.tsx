import { useNavigate } from "react-router-dom";
import { useState, ChangeEvent, useRef } from "react";
import { saveAs } from "file-saver";

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
    navigate("/results", { state: { videoURL } });
  };

  // Video recorder
  const [permission, setPermission] = useState<boolean>(false);
  const [recordingStatus, setRecordingStatus] = useState<
    null | "recording" | "stopped"
  >(null);
  const [videoChunks, setVideoChunks] = useState<Blob[]>([]);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);

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
      <div className="flex-container">
        <div
          className="custom-box"
          style={{ backgroundColor: "#f9fbfd", borderColor: "#282828" }}
        >
          {!file && (
            <>
              <label htmlFor="upload-input" className="custom-file-label">
                <span className="upload-text">
                  <div className="upload-icon">📁</div>
                  Drag and drop file here or <strong>Browse</strong>
                  <p className="upload-text">
                    Accepted formats: MP4, MOV, WebM
                  </p>
                </span>
              </label>
              <input
                id="upload-input"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden-file-input"
              />
              {videoURL && <video src={videoURL} width="400" controls />}
            </>
          )}
          <div style={{ marginTop: "10px", textAlign: "center" }}>
            {file && (
              <div>
                <video src={videoURL} width={500} height={300} controls />
                <strong>Uploaded Video:</strong> {file.name}
              </div>
            )}
          </div>
          <div>
            <div className="button-container">
              <button
                className="uploadButton"
                disabled={!file || uploadStatus === "uploading"}
                //onClick={() => {
                //if (!file) return;
                //setUploadStatus("success");
                onClick={handleRedirect}
                //</div>}}
              >
                Upload
              </button>

              <button
                className="uploadResetButton"
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
          </div>
          <div>
            {uploadStatus} {uploadProgress > 0 && `${uploadProgress}%`}
          </div>
        </div>
        <div
          className="custom-box"
          style={{ backgroundColor: "#f9fbfd", borderColor: "#282828" }}
        >
          <div className="upload-icon">📹</div>
          <span className="upload-text">Record your video</span>
          <p className="upload-text">
            Your video will immediately start recording once you click the start
            button. A playback of your recording will be displayed below once
            the stop button is clicked.
          </p>

          {!recordedVideo && (
            <video
              ref={liveVideoRef}
              id="preview"
              className="video-preview"
              autoPlay
              muted
              playsInline
            />
          )}
          {recordedVideo && (
            <video
              id="recording"
              src={recordedVideo || undefined}
              controls
              style={{ display: recordedVideo ? "block" : "none" }}
            />
          )}
          <div className="button-container">
            <button
              id="startButton"
              className="startButton"
              onClick={handleCameraAndStart}
              disabled={recordingStatus === "recording"}
            >
              Start Recording
            </button>
            <button
              id="stopButton"
              className="stopButton"
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
          <div className="button-container">
            <button
              id="download"
              className="downloadButton"
              disabled={!recordedVideo}
              onClick={() => {
                if (recordedVideo) {
                  saveAs(recordedVideo, "recorded_video.mp4");
                }
              }}
            >
              Download Video
            </button>
            <button
              id="retakeButton"
              className="retakeButton"
              disabled={!recordedVideo}
              onClick={() => {
                setRecordedVideo(null);
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
              className="submitButton"
              disabled={!recordedVideo}
              onClick={() => {
                if (streamRef.current) {
                  streamRef.current
                    .getTracks()
                    .forEach((track) => track.stop());
                }
                setPermission(false);
                if (recordedVideo) {
                  navigate("/results", { state: { videoURL: recordedVideo } });
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
    <main>
      <h1 className="longer-underline">Home</h1>

      {/* <div className="welcome-content" style={{ textAlign: "center" }}>
        <div className="emphasized-text">Welcome!</div>
        <p>
          This is going to be content. Written here is a paragraph explaining an
          overview of the application, as well as linking to the user guide. I
          am writing a bunch of stuff just so the paragraph looks good and fills
          up the space. This is just a placeholder for now, but it will be
          replaced with actual content later on.
          <br />
          The user guide can be found <a href="/guide">here</a>.
        </p>
      </div> */}

      <div className="home-ending" style={{ textAlign: "center" }}>
        <p>
          <strong>
            Record <u>or</u> upload a video here.
          </strong>
          Your video will be stored temporarily, and you will be redirected to
          the results page once the upload is processed.
        </p>
      </div>

      <FileUploader />
    </main>
  );
}
