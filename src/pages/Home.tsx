import { useNavigate } from "react-router-dom";
import { useState, ChangeEvent, useEffect } from "react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | null>(null);

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

  return (
    <main>
      <div className="flex-container">
        <div className="custom-box" style={{ backgroundColor: "#f9fbfd" }}>
          {!file && (
            <>
              <label htmlFor="upload-input" className="custom-file-label">
                <span className="upload-text">
                  <div className="upload-icon">📁</div>
                  Drag and drop file here or <strong>Browse</strong>
                  <p className="upload-text">
                    Accepted formats: MP4, MOV, AVI, WebM
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
          <div style={{ marginTop: "10px" }}>
            {file && (
              <div>
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
                  setVideoURL(null);
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
        <div className="custom-box" style={{ backgroundColor: "#f9fbfd" }}>
          <div className="upload-icon">📹</div>
          <span className="upload-text">Record your video</span>
          <p className="upload-text">
            Your video will immediately start recording once you click the start
            button. A playback of your recording will be displayed below once
            the stop button is clicked.
          </p>
          <video
            id="preview"
            className="video-preview"
            autoPlay
            muted
            playsInline
          ></video>
          <video id="recording" controls style={{ display: "none" }}></video>
          <div className="button-container">
            <button id="startButton" className="startButton">
              Start Recording
            </button>
            <button id="stopButton" className="stopButton" disabled>
              Stop Recording
            </button>
          </div>
          <div className="button-container">
            <button id="download" className="downloadButton" disabled>
              Download Video
            </button>
            <button id="retakeButton" className="retakeButton" disabled>
              Retake
            </button>
            <button id="submitButton" className="submitButton" disabled>
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

      <div className="welcome-content" style={{ textAlign: "center" }}>
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
      </div>

      <div className="home-ending" style={{ textAlign: "center" }}>
        <p>
          Record or upload a video here. Your video will be stored temporarily,
          and you will be redirected to the results page once the upload is
          processed.
        </p>
      </div>

      <FileUploader />
    </main>
  );
}
