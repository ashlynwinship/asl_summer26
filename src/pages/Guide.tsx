import React, { useEffect, useRef, useState } from "react";

export default function Guide() {
  const [activeTab, setActiveTab] = useState("what");

  const tabs = [
    {
      id: "what",
      label: "What is the Tool Doing?",
      content:
        "The ASL Live Translation tool uses advanced computer vision and machine learning " +
        "algorithms to translate American Sign Language (ASL) into spoken English in real-time. It captures video input " +
        "from a camera, processes the sign language gestures, and outputs the corresponding translation along with a video " +
        "demonstration. The tool utilizes a combination of computer vision techniques to detect and track hand movements " +
        "and body language. It then applies machine learning models trained on large datasets of ASL " +
        "gestures to interpret the signs and generate accurate translations.",
    },
    {
      id: "who",
      label: "Who is the Tool For?",
      content:
        "The ASL Live Translation tool is designed for educators, researchers, " +
        "and anyone interested in learning or improving their ASL skills.",
    },
    {
      id: "tips",
      label: "Tips for Filming",
      content:
        "These are some tips for filming your ASL translations: \n" +
        "1. Ensure you have good lighting so that your hand movements are clearly visible.\n" +
        "2. Position yourself in front of a plain background to avoid distractions.\n" +
        "3. Keep your hands within the camera frame at all times for accurate translation.\n" +
        "4. Ensure the video is clear and well-lit for better translation accuracy.",
    },
  ];

  /* slideshow functionality */
  const slideIndex = useRef<number>(1);

  const plusSlides = (n: number): void => {
    slideIndex.current += n;
    showSlides(slideIndex.current);
  };

  const currentSlide = (n: number): void => {
    slideIndex.current = n;
    showSlides(slideIndex.current);
  };

  const showSlides = (n: number): void => {
    const slides = document.getElementsByClassName(
      "slides",
    ) as HTMLCollectionOf<HTMLElement>;
    const dots = document.getElementsByClassName(
      "demo",
    ) as HTMLCollectionOf<HTMLImageElement>;
    const captionText = document.getElementById("caption");
    if (slides.length === 0) return;

    if (n > slides.length) slideIndex.current = 1;
    if (n < 1) slideIndex.current = slides.length;

    for (let i = 0; i < slides.length; i++) {
      slides[i].style.display = "none";
    }

    for (let i = 0; i < dots.length; i++) {
      dots[i].className = dots[i].className.replace(" active", "");
    }

    const idx = slideIndex.current - 1;
    slides[idx].style.display = "block";
    if (dots[idx]) dots[idx].className += " active";
    if (captionText && dots[idx]) captionText.innerHTML = dots[idx].alt || "";
  };

  useEffect(() => {
    showSlides(slideIndex.current);
  }, []);

  return (
    <main>
      <h1 className="longer-underline" style={{ marginBottom: "20px" }}>
        User Guide
      </h1>
      <div className="columns">
        <div className="column-content panel">
          <h2 style={{ textAlign: "center" }}>How to Use</h2>
          <p>
            1. Click "Upload" to upload an existing video or if recording, click
            the "Start Recording" button.
          </p>
          <p>
            2. Ensure that you are visible and clear in frame and sign your word
            in front of the camera.
          </p>
          <p>3. Click the "Stop Recording" button to end the recording.</p>
          <p>
            4. Preview your video and click "Submit" to see the results of the
            translation.
          </p>
        </div>
        <div
          className="column-content panel"
          style={{ textAlign: "center", paddingBottom: 20 }}
        >
          <h2>Walkthrough Demonstration</h2>
          <div className="slideshow-container slideshow-stage">
            <div className="slides">
              <video id="spoken-demo" width={450} height={250} controls />
              <div className="caption-container">
                <p id="caption">Demo Video (Spoken)</p>
              </div>
            </div>
            <div className="slides">
              <video id="asl-demo" width={450} height={250} controls />
              <div className="caption-container">
                <p id="caption">Demo Video (ASL)</p>
              </div>
            </div>
            <a className="prev" onClick={() => plusSlides(-1)}>
              &#10094;
            </a>
            <a className="next" onClick={() => plusSlides(1)}>
              &#10095;
            </a>
          </div>
        </div>
      </div>
      <div className="tab-container">
        <nav className="nav-bar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div
          className="content-panel active"
          style={{ whiteSpace: "pre-line" }}
        >
          {tabs.find((tab) => tab.id === activeTab)?.content}
          {activeTab === "tips" && (
            <div className="columns" style={{ justifyContent: "center" }}>
              <div className="column-content" style={{ textAlign: "center" }}>
                <p>
                  <strong>Aim for This ↓</strong>
                </p>
                <video
                  width={450}
                  height={250}
                  style={{ margin: "20px" }}
                  controls
                >
                  <source src="/good-vid.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="column-content" style={{ textAlign: "center" }}>
                <p>
                  <strong>NOT This ↓</strong>
                </p>
                <video
                  width={450}
                  height={250}
                  style={{ margin: "20px" }}
                  controls
                >
                  <source src="/bad-vid.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
