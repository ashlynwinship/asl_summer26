import React, { useEffect, useRef, useState } from "react";

export default function Results() {
  const [showBtn, setShowBtn] = useState(false);

  useEffect(() => {
    const onScroll = async () => {
      const scrolled =
        document.documentElement.scrollTop || document.body.scrollTop;
      setShowBtn(scrolled > 20);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const topFunction = async () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

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
      <h1 className="longer-underline">Results</h1>

      <div
        className="flex-container"
        style={{ justifyContent: "space-evenly" }}
      >
        <div className="left-box" style={{ textAlign: "center" }}>
          <div
            className="custom-box"
            style={{ justifyContent: "flex-start", minHeight: "auto" }}
          >
            <h2 style={{ textAlign: "center" }}>Your Uploaded Video</h2>
            <video id="uploadedVideo" width={500} height={300} controls />
            <button id="download" className="downloadButton">
              Download Video
            </button>
          </div>
        </div>

        <div className="right-box custom-box">
          <h2 style={{ textAlign: "center" }}>Top Three Matches</h2>
          <div className="slideshow-container">
            <div className="slides">
              <video
                id="slide1"
                src="test.mp4"
                width={500}
                height={300}
                controls
              />
            </div>
            <div className="slides">
              <video
                id="slide2"
                src="test.mp4"
                width={500}
                height={300}
                controls
              />
            </div>
            <div className="slides">
              <video
                id="slide3"
                src="test.mp4"
                width={500}
                height={300}
                controls
              />
            </div>
            <a className="prev" onClick={() => plusSlides(-1)}>
              &#10094;
            </a>
            <a className="next" onClick={() => plusSlides(1)}>
              &#10095;
            </a>
            <div className="caption-container">
              <p id="caption"></p>
            </div>
            <div
              className="row"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <div className="column">
                <img
                  className="demo"
                  src="test-ss.png"
                  style={{ width: "100%" }}
                  onClick={() => currentSlide(1)}
                  alt="Match 1 (Confidence: XX%)"
                />
              </div>
              <div className="column">
                <img
                  className="demo"
                  src="test-ss.png"
                  style={{ width: "100%" }}
                  onClick={() => currentSlide(2)}
                  alt="Match 2 (Confidence: XX%)"
                />
              </div>
              <div className="column">
                <img
                  className="demo"
                  src="test-ss.png"
                  style={{ width: "100%" }}
                  onClick={() => currentSlide(3)}
                  alt="Match 3 (Confidence: XX%)"
                />
              </div>
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
              <p>Handshape:</p>
              <p>Movement:</p>
              <p>Location:</p>
              <p>Palm Orientation:</p>
              <p>Non-Manual Signs:</p>
            </div>
          </div>
        </div>
      </div>

      <div className="column-content" style={{ margin: "20px 60px" }}>
        <h2 style={{ textAlign: "center" }}>Other Potential Matches</h2>
        <div className="columns">
          <div className="column-content panel" style={{ textAlign: "center" }}>
            <button className="matches-button">match</button>
            <p>Handshape:</p>
            <p>Movement:</p>
            <p>Location:</p>
            <p>Palm Orientation:</p>
            <p>Non-Manual Signs:</p>
          </div>
          <div className="column-content panel" style={{ textAlign: "center" }}>
            <button className="matches-button">match</button>
            <p>Handshape:</p>
            <p>Movement:</p>
            <p>Location:</p>
            <p>Palm Orientation:</p>
            <p>Non-Manual Signs:</p>
          </div>
          <div className="column-content panel" style={{ textAlign: "center" }}>
            <button className="matches-button">match</button>
            <p>Handshape:</p>
            <p>Movement:</p>
            <p>Location:</p>
            <p>Palm Orientation:</p>
            <p>Non-Manual Signs:</p>
          </div>
          <div className="column-content panel" style={{ textAlign: "center" }}>
            <button className="matches-button">match</button>
            <p>Handshape:</p>
            <p>Movement:</p>
            <p>Location:</p>
            <p>Palm Orientation:</p>
            <p>Non-Manual Signs:</p>
          </div>
        </div>
      </div>

      {showBtn && (
        <button
          onClick={topFunction}
          id="myBtn"
          title="Go to top"
          className="back-to-top"
        >
          <span style={{ marginRight: 6 }}>&uarr;</span> Back to top
        </button>
      )}
    </main>
  );
}
