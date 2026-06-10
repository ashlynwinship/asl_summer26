import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { saveAs } from "file-saver";

interface MatchVideo {
  id: number;
  src: string;
  thumbnail: string;
  label: string;
  features: {
    handshape: string;
    movement: string;
    location: string;
    palm: string;
    nonManual: string;
  };
}

export default function Results() {
  const location = useLocation();
  const videoURL = location.state?.videoURL;

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const topMatches: MatchVideo[] = [
    {
      id: 1,
      src: "test.mp4",
      thumbnail: "test-ss.png",
      label: "Match 1 (Confidence: 95%)",
      features: {
        handshape: "95%",
        movement: "92%",
        location: "98%",
        palm: "90%",
        nonManual: "88%",
      },
    },
    {
      id: 2,
      src: "test.mp4",
      thumbnail: "test-ss.png",
      label: "Match 2 (Confidence: 85%)",
      features: {
        handshape: "85%",
        movement: "80%",
        location: "87%",
        palm: "82%",
        nonManual: "79%",
      },
    },
    {
      id: 3,
      src: "test.mp4",
      thumbnail: "test-ss.png",
      label: "Match 3 (Confidence: 75%)",
      features: {
        handshape: "75%",
        movement: "72%",
        location: "70%",
        palm: "78%",
        nonManual: "71%",
      },
    },
  ];

  const handleDownload = () => saveAs(videoURL, videoURL);

  const nextSlide = (): void => {
    setActiveIdx((prev) => (prev + 1) % topMatches.length);
  };

  const prevSlide = (): void => {
    setActiveIdx((prev) => (prev - 1 + topMatches.length) % topMatches.length);
  };

  const currentMatch = topMatches[activeIdx];

  return (
    <main>
      <h1 className="longer-underline">Results</h1>
      <div
        className="flex-container"
        style={{ justifyContent: "space-evenly" }}
      >
        <div
          className="left-box custom-box"
          style={{ backgroundColor: "#f9fbfd", border: "2px solid grey" }}
        >
          <div
            className="user-video"
            style={{ width: "500px", margin: "0 auto", textAlign: "center" }}
          >
            <h2>Your Uploaded Video</h2>
            <video src={videoURL} width={500} height={300} controls />
            <button
              disabled={!videoURL}
              id="download"
              className="downloadButton"
              onClick={handleDownload}
            >
              Download Video
            </button>
          </div>
          <div
            className="match-details"
            style={{
              marginTop: "20px",
              textAlign: "left",
              alignSelf: "stretch",
            }}
          >
            <p
              style={{
                fontWeight: "bold",
                textAlign: "center",
                fontSize: "18px",
              }}
            >
              Features
            </p>
            <p>Handshape (Confidence: XX%):</p>
            <p>Movement (Confidence: XX%):</p>
            <p>Location (Confidence: XX%):</p>
            <p>Palm Orientation (Confidence: XX%):</p>
            <p>Non-Manual Signs (Confidence: XX%):</p>
          </div>
        </div>

        <div
          className="right-box custom-box"
          style={{ backgroundColor: "#f9fbfd", border: "2px solid grey" }}
        >
          <h2 style={{ textAlign: "center" }}>Top Three Matches</h2>
          <div className="slideshow-container">
            <div className="slideshow-stage">
              <div className="slides" style={{ display: "block" }}>
                <video
                  key={currentMatch.id}
                  src={currentMatch.src}
                  width={500}
                  height={300}
                  controls
                />
              </div>
              <a className="prev" onClick={prevSlide}>
                &#10094;
              </a>
              <a className="next" onClick={nextSlide}>
                &#10095;
              </a>
              <div className="caption-container">
                <p id="caption">{currentMatch.label}</p>
              </div>
            </div>
            <div
              className="row"
              style={{ display: "flex", justifyContent: "center" }}
            >
              {topMatches.map((match, idx) => (
                <div className="column" key={match.id}>
                  <img
                    className={`demo ${idx === activeIdx ? "active" : ""}`}
                    src={match.thumbnail}
                    style={{ width: "100%" }}
                    onClick={() => setActiveIdx(idx)}
                    alt={match.label}
                  />
                </div>
              ))}
            </div>
            <div className="match-details" style={{ marginTop: 20 }}>
              <p
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  fontSize: "18px",
                }}
              >
                Features
              </p>
              <p>Handshape (Confidence: {currentMatch.features.handshape}):</p>
              <p>Movement (Confidence: {currentMatch.features.movement}):</p>
              <p>Location (Confidence: {currentMatch.features.location}):</p>
              <p>
                Palm Orientation (Confidence: {currentMatch.features.palm}):
              </p>
              <p>
                Non-Manual Signs (Confidence: {currentMatch.features.nonManual}
                ):
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="column-content" style={{ margin: "20px 60px" }}>
        <h2 style={{ textAlign: "center" }}>Other Potential Matches</h2>
        <div className="columns">
          {[1, 2, 3].map((item) => (
            <div key={item} className="column-content panel">
              <div style={{ textAlign: "center" }}>
                <button className="matches-button">match</button>
              </div>
              <p>Handshape:</p>
              <p>Movement:</p>
              <p>Location:</p>
              <p>Palm Orientation:</p>
              <p>Non-Manual Signs:</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
