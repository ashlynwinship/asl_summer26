import React, { useEffect, useRef, useState } from "react";

export default function Guide() {
  const [activeTab, setActiveTab] = useState("what");
  const [activeSlide, setActiveSlide] = useState(0);

  const tabs = [
    {
      id: "what",
      label: "What is the Tool Doing?",
      content:
        "The ASL Live Dictionary uses advanced computer vision and machine learning " +
        "algorithms to match American Sign Language (ASL) with the corresponding English word. It captures video input " +
        "from a camera, processes the sign language gestures, and outputs the closest match along with video " +
        "demonstrations of the top most accurate matches. The tool utilizes a combination of computer vision techniques to detect and track hand movements " +
        "and body language. It then applies machine learning models trained on large datasets of ASL " +
        "gestures to interpret the signs and generate accurate pairs.",
    },
    {
      id: "who",
      label: "Who is the Tool For?",
      content:
        "The ASL Live Dictionary is designed for educators, researchers, " +
        "and anyone interested in learning or improving their ASL skills.",
    },
    {
      id: "tips",
      label: "Tips for Filming",
      content:
        "These are some tips for filming your ASL signs: \n" +
        "1. Only sign one word in your video.\n" +
        "2. Ensure you have good lighting so that your hand movements are clearly visible.\n" +
        "3. Position yourself in front of a plain background to avoid distractions.\n" +
        "4. Keep your hands within the camera frame at all times for accurate matches.\n" +
        "5. Ensure the video is clear and well-lit for better match accuracy.\n\n" +
        "Note: If the video doesn't meet the criteria, the match may be inaccurate or fail to process.",
    },
    {
      id: "data",
      label: "How is my Data Being Used?",
      content:
        "Any videos you upload will only be stored on your computer locally. " +
        "We do not use your likeness or your video directly, and what you upload is only used for " +
        "determining vector points so we can best match your sign with those in our data set. ",
    },
    {
      id: "faq",
      label: "FAQ",
      content: <strong className="underline">FAQ</strong>,
    },
  ];

  /* slideshow functionality */
  const totalSlides = 2;

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1 >= totalSlides ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setActiveSlide((prev) => (prev - 1 < 0 ? totalSlides - 1 : prev - 1));
  };

  return (
    <main className="p-4">
      <h1 className="font-head text-black text-3xl mb-5 pb-1 border-b border-black w-full">
        User Guide
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        <div className="bg-white p-5 rounded-xl border border-neutral-border shadow-sm">
          <h2 className="font-head text-black text-2xl text-center mb-4">
            How to Use
          </h2>
          <ol className="space-y-3 text-gray-700 list-none p-0 m-0">
            <li>
              <strong>1.</strong> Click "Upload" to upload an existing video or
              if recording, click the "Start Recording" button.
            </li>
            <li>
              <strong>2.</strong> Ensure that you are visible and clear in frame
              and sign your word in front of the camera.
            </li>
            <li>
              <strong>3.</strong> Click the "Stop Recording" button to end the
              recording.
            </li>
            <li>
              <strong>4.</strong> Preview your video and click "Submit" to see
              the results of the translation.
            </li>
          </ol>
        </div>

        <div className="bg-white p-5 pb-6 rounded-xl border border-neutral-border shadow-sm text-center">
          <h2 className="font-head text-black text-2xl mb-4">
            Walkthrough Demonstration
          </h2>

          <div className="relative w-fit mx-auto group">
            {activeSlide === 0 && (
              <div className="text-center">
                <video
                  id="spoken-demo"
                  width={450}
                  height={250}
                  controls
                  className="rounded-lg bg-black"
                />
                <div className="text-center bg-neutral-dark text-white p-1 text-sm rounded-b-lg w-full">
                  <p className="m-0 leading-normal">Demo Video (Spoken)</p>
                </div>
              </div>
            )}

            {activeSlide === 1 && (
              <div className="text-center">
                <video
                  id="asl-demo"
                  width={450}
                  height={250}
                  controls
                  className="rounded-lg bg-black"
                />
                <div className="text-center bg-neutral-dark text-white p-1 text-sm rounded-b-lg w-full">
                  <p className="m-0 leading-normal">Demo Video (ASL)</p>
                </div>
              </div>
            )}

            <button
              type="button"
              className="cursor-pointer absolute top-[40%] left-0 -translate-y-1/2 p-4 text-gray-400 font-bold text-xl rounded-r transition-colors hover:bg-black/80 hover:text-white"
              onClick={prevSlide}
            >
              &#10094;
            </button>
            <button
              type="button"
              className="cursor-pointer absolute top-[40%] right-0 -translate-y-1/2 p-4 text-gray-400 font-bold text-xl rounded-l transition-colors hover:bg-black/80 hover:text-white"
              onClick={nextSlide}
            >
              &#10095;
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex gap-2.5 bg-neutral-panel p-2.5 rounded-t-lg border-x border-t border-neutral-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`py-2 px-5 cursor-pointer border-none text-base transition-all rounded ${
                activeTab === tab.id
                  ? "bg-neutral-dark text-white font-medium"
                  : "bg-gray-300 text-gray-700 hover:bg-gray-400"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="block p-5 border border-neutral-border bg-white rounded-b-lg shadow-sm whitespace-pre-line">
          <div className="text-gray-800 leading-relaxed mb-4">
            {tabs.find((tab) => tab.id === activeTab)?.content}
          </div>

          {activeTab === "tips" && (
            <div className="flex flex-wrap gap-5 justify-center mt-6 pt-6 border-t border-gray-100">
              <div className="text-center bg-brand-light p-4 rounded-xl border border-brand/20">
                <p className="text-green-600 font-bold mb-2">Aim for This ↓</p>
                <video
                  width={450}
                  height={250}
                  className="mx-5 rounded-lg shadow-md"
                  controls
                >
                  <source src="/good-vid.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="text-center bg-red-50/50 p-4 rounded-xl border border-red-100">
                <p className="text-red-600 font-bold mb-2">NOT This ↓</p>
                <video
                  width={450}
                  height={250}
                  className="mx-5 rounded-lg shadow-md"
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
