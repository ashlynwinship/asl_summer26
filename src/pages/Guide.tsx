import { useState } from "react";
import { Link } from "react-router-dom";

export default function Guide() {
  const [activeTab, setActiveTab] = useState("what");
  const [activeSlide, setActiveSlide] = useState(0);

  const tabs = [
    {
      id: "what",
      label: "What is the Tool Doing?",
      content:
        "The ASL Live Dictionary uses advanced computer vision and machine learning " +
        "algorithms to match the American Sign Language (ASL) sign with the corresponding English word. It captures video input " +
        "from a camera or uses a pre-recorded video, processes the sign in that video, and outputs the closest matches along with video " +
        "demonstrations of the most similar matches. The tool utilizes a combination of computer vision techniques to detect and track ASL parameter. " +
        "It then applies machine learning models trained on large datasets of ASL " +
        "signs to interpret the video and generate accurate matches.",
    },
    {
      id: "who",
      label: "Who is the Tool For?",
      content:
        "The ASL Live Dictionary is designed primarily for students of ASL " +
        "and anyone interested in learning ASL or improving their skills. It is meant to be a way for learners " +
        "to look up signs that they only partially remember or do not know the meaning of without needing to search " +
        "through videos manually.",
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
        "N.B.: If the video doesn't meet the criteria, the match may be inaccurate or fail to process.",
    },
    {
      id: "data",
      label: "Is My Data Being Used?",
      content:
        "Any videos you upload will only be stored on your computer locally. " +
        "We do not use your likeness or your video directly, and what you upload is only used for " +
        "determining vector points so we can best match your sign with those in our data set. ",
    },
    {
      id: "faq",
      label: "FAQ",
      content:
        "Q: Why were none of the signs that were best matches the sign that I was looking for? \n " +
        "A: The current dataset of this tool is limited and is mostly comprised of commonly used ASL signs. " +
        " In addition only some proper nouns (e.g. names, states, and cities) and numbers are included in the dataset and therefore are unlikely to process. \n\n" +
        "Q: I tried to look up a classfier but the tool did not come back with any relevant matches, why? \n" +
        "A: This tool does not work for classifiers due to thier context dependent nature.\n\n" +
        "Q: I hit block on a pop-up about my camera and now the tool will not record a video, why? \n" +
        "A: You need to allow camera access in order to record a video. Please try reloading the page and allowing camera access when you try recording again. " +
        "As a reminder your image is not being used just the vector points of your sign. \n\n",
    },
    {
      id: "acknowledgements",
      label: "Acknowledgements",
      content:
        "We would like to acknowledge the following for their contributions to the development of this tool: ",
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
      <div className="relative w-full flex items-center justify-center mb-10 px-4">
        <div className="absolute left-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-full transition-all duration-200 shadow-sm hover:shadow active:scale-95 no-underline"
          >
            <svg
              className="w-4 h-4 text-gray-600 transition-transform duration-200 group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Return Home</span>
          </Link>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 text-center relative inline-block after:content-[''] after:absolute after:w-full after:h-1 after:bg-brand-darker after:-bottom-2 after:left-0">
          User Guide
        </h1>
      </div>

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
            <li>
              <strong>5.</strong> If not satisfied with the results, toggle with
              the parameters that you want to include and click "Recalculate"
              (must have at least one parameter selected).
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
                  <p className="m-2 leading-normal">Demo Video (Spoken)</p>
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
                  <p className="m-2 leading-normal">Demo Video (ASL)</p>
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
                  style={{
                    width: "450px",
                    height: "250px",
                    backgroundColor: "black",
                  }}
                  className="mx-5 rounded-lg shadow-md"
                  controls
                >
                  <source src="/GRANDPARENTS_Cut.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
              <div className="text-center bg-red-50/50 p-4 rounded-xl border border-red-100">
                <p className="text-red-600 font-bold mb-2">NOT This ↓</p>
                <iframe
                  style={{ width: "450px", height: "250px" }}
                  className="mx-5 rounded-lg shadow-md"
                  src={`https://youtube.com/embed/uOIILzYgxTk?autoplay=0`}
                  title="How to Ruin Your ASL Teacher's Day"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
