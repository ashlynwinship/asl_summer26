import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import { SyncLoader } from "react-spinners";
import { useLocation, useParams } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { Link } from "react-router-dom";

interface MatchItem {
  word: string;
  confidence: number;
}

interface FeedbackItem {
  feature: string;
  user_value: string;
  user_confidence: number;
  reference_value: string;
  similarity_score: number;
  accurate: boolean;
}

interface JobResult {
  matched_word?: string;
  match_confidence?: number;
  top_k?: [string, number][];
  matches?: MatchItem[];
  feedback: FeedbackItem[];
}

interface JobResponse {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  stage: string | null;
  error?: string;
  result?: JobResult;
}

export default function Results() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  const location = useLocation();
  const { videoURL } = (location.state as { videoURL?: string }) || {};

  // API call to fetch results
  const { job_id } = useParams<{ job_id: string }>();
  const [jobData, setJobData] = useState<JobResponse | null>(null);

  // modal states
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [selectedMatchLabel, setSelectedMatchLabel] = useState("");

  // user testing data
  const [intendedWord, setIntendedWord] = useState("");
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);

  useEffect(() => {
    if (!job_id) return;
    const interval = setInterval(async () => {
      try {
        console.log("Fetching job status for ID:", job_id);
        const res = await fetch(`${apiBaseUrl}/api/jobs/${job_id}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        console.log("Received Job Data from Backend:", data);
        setJobData(data);
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(interval);
        }
      } catch (err) {
        console.error("Error fetching job data:", err);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [job_id, apiBaseUrl]);

  // Normalize top_k / matches into array
  const rawMatches: MatchItem[] = (() => {
    if (jobData?.result?.matches && jobData.result.matches.length > 0) {
      return jobData.result.matches;
    }
    if (jobData?.result?.top_k && jobData.result.top_k.length > 0) {
      return jobData.result.top_k.map(([word, confidence]) => ({
        word,
        confidence,
      }));
    }
    if (jobData?.result?.matched_word) {
      return [
        {
          word: jobData.result.matched_word,
          confidence: jobData.result.match_confidence ?? 0,
        },
      ];
    }
    return [];
  })();

  // Top 3 for Slideshow (Indices 0, 1, 2)
  const slideshowMatches = rawMatches.slice(0, 3);

  // Bottom Cards (Indices 3, 4, 5) -> 4th, 5th, and 6th matches
  const bottomMatches = [0, 1, 2].map((i) => {
    //delete line below
    console.log(rawMatches);
    const match = rawMatches[i + 3];
    return {
      word: match?.word ?? `Match ${i + 4}`,
      confidence: match?.confidence ?? 0,
      slotKey: match?.word ? match.word : `slot_${i + 4}`,
    };
  });

  // Map of gloss word -> video filename, loaded from gloss_to_video.json
  const [glossToVideo, setGlossToVideo] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    fetch("/gloss_to_video.json")
      .then((res) => res.json())
      .then((data) => setGlossToVideo(data))
      .catch((err) =>
        console.error("Error loading gloss_to_video.json:", err),
      );
  }, []);

  const getVideoSrc = (word?: string): string | undefined => {
    if (!word) return undefined;
    const filename = glossToVideo[word.toLowerCase()];
    return filename ? `/Videos_gloss/${filename}` : undefined;
  };

  const featuresList = jobData?.result?.feedback ?? [];

  const [enabledFeatures, setEnabledFeatures] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (jobData?.result?.feedback) {
      const initial: Record<string, boolean> = {};
      jobData.result.feedback.forEach((item) => {
        initial[item.feature] = true;
      });
      setEnabledFeatures(initial);
    }
  }, [jobData]);

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const currentMatch = slideshowMatches[activeIdx] || slideshowMatches[0];

  const handleDownload = () => {
    if (videoURL) {
      saveAs(videoURL, "download.webm");
    }
  };

  const nextSlide = (): void => {
    if (slideshowMatches.length === 0) return;
    setActiveIdx((prev) => (prev + 1) % slideshowMatches.length);
  };

  const prevSlide = (): void => {
    if (slideshowMatches.length === 0) return;
    setActiveIdx(
      (prev) => (prev - 1 + slideshowMatches.length) % slideshowMatches.length,
    );
  };

  const [isVisible, setIsVisible] = useState<{ [key: string]: boolean }>({});

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleFeature = (name: string) => {
    const isCurrentlyEnabled = enabledFeatures[name];
    const totalEnabled = Object.values(enabledFeatures).filter(Boolean).length;
    if (isCurrentlyEnabled && totalEnabled <= 1) {
      setErrorMessage("At least one feature must be enabled.");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setErrorMessage(null);
    setEnabledFeatures((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const openSignModal = (label: string) => {
    if (hasSubmittedFeedback) return;
    setSelectedMatchLabel(label);
    setIsSignModalOpen(true);
  };

  const handleConfirmSign = async () => {
    setHasSubmittedFeedback(true);
    setIsSignModalOpen(false);
    try {
      await fetch(`${apiBaseUrl}/api/jobs/${job_id}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchedCorrectly: true,
          chosenLabel: selectedMatchLabel,
        }),
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
    alert(`Thank you! Feedback recorded for ${selectedMatchLabel}.`);
  };

  const handleConfirmMissingSign = async () => {
    setHasSubmittedFeedback(true);
    setIsMissingModalOpen(false);
    try {
      await fetch(`${apiBaseUrl}/api/jobs/${job_id}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchedCorrectly: true,
          intendedWord: intendedWord,
          allowVideoUse: true,
        }),
      });
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
    alert(
      `Thank you! Your video and feedback have been flagged for debugging.`,
    );
    setIntendedWord("");
  };

  //checkboxes for video consent
  const [inputs, setInputs] = useState({});

  // Loading screen
  if (!jobData || jobData.status === "queued" || jobData.status === "running") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600 font-medium animate-pulse">
          {jobData?.stage === "keyframe_selection" && "Selecting keyframes..."}
          {jobData?.stage === "cls0_matching" && "Identifying sign..."}
          {jobData?.stage === "cls1_feedback" && "Analyzing features..."}
          {!jobData?.stage && "Processing..."}
        </p>
        <SyncLoader color="#4a90e2" size={10} />
      </main>
    );
  }

  // Failed screen
  if (jobData.status === "failed") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-500 font-medium">
          Something went wrong: {jobData.error ?? "unknown error"}
        </p>
      </main>
    );
  }

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
          Results
        </h1>
      </div>
      {/* Side-by-side layout */}
      <div className="flex flex-col lg:flex-row gap-8 justify-center items-stretch w-full mb-12">
        {/* User uploaded video */}
        <div className="flex flex-col items-center justify-between w-full lg:w-1/2 p-6 border-2 border-neutral-border rounded-xl bg-brand-light shadow-custom">
          <div className="w-full text-center flex flex-col items-center">
            <h2 className="text-2xl font-bold text-neutral-darkest mb-4">
              Your Uploaded Video
            </h2>
            <div className="w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden border border-neutral-border mb-4">
              <video
                src={videoURL}
                className="w-full h-full object-cover"
                controls
              />
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
              <button
                disabled={!videoURL}
                className="font-body py-2 px-5 text-base text-black  bg-gray-300 rounded-2xl transition-colors hover:bg-gray-400 disabled:bg-neutral-border disabled:text-gray-400 disabled:cursor-not-allowed"
                onClick={handleDownload}
              >
                Download Video
              </button>
            </div>
          </div>

          {/* User features */}
          <div className="w-full mt-8 pt-6 border-t border-neutral-border text-left">
            <p className="text-xl font-bold text-neutral-darkest mb-3 text-center">
              Features
            </p>
            <div className="flex flex-col gap-3 w-full">
              {errorMessage && (
                <div className="text-sm font-medium text-red-500 bg-red-50 border border-red-200 rounded-md p-2 mb-2 animate-fade-in">
                  {errorMessage}
                </div>
              )}
              {featuresList.map((item) => {
                const isEnabled = enabledFeatures[item.feature] ?? true;
                const numericValue = Math.round(item.user_confidence * 100);
                return (
                  <div
                    key={item.feature}
                    className={`grid grid-cols-1 sm:grid-cols-4 items-center gap-4 p-3 rounded-lg border transition-all duration-300 ease-in-out ${
                      isEnabled
                        ? "bg-white/50 border-neutral-border/40 opacity-100"
                        : "bg-neutral-panel/40 border-neutral-border/20 opacity-40 select-none"
                    }`}
                  >
                    <div className="sm:col-span-2 flex items-center justify-start gap-3 w-full">
                      <input
                        type="checkbox"
                        className="switch cursor-pointer"
                        checked={isEnabled}
                        onChange={() => handleToggleFeature(item.feature)}
                        aria-label={`Toggle ${item.feature}`}
                      />
                      <span
                        className={`text-sm sm:text-base font-medium transition-colors duration-300 ${
                          isEnabled ? "text-neutral-dark" : "text-gray-400"
                        }`}
                      >
                        {item.feature}: {item.user_value}
                      </span>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-3 w-full">
                      <div className="w-full max-w-48 md:w-60">
                        <div
                          className={`h-2.5 rounded-full w-full overflow-hidden transition-colors duration-300 ${
                            isEnabled ? "bg-gray-200" : "bg-gray-300"
                          }`}
                          role="progressbar"
                          aria-label={`${item.feature}Progress`}
                          aria-valuenow={numericValue}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              isEnabled ? "bg-brand" : "bg-gray-400"
                            }`}
                            style={{ width: `${numericValue}%` }}
                          />
                        </div>
                      </div>
                      <span
                        className={`text-sm sm:text-base font-semibold sm:text-right transition-colors duration-300 whitespace-nowrap ${
                          isEnabled ? "text-neutral-dark" : "text-gray-400"
                        }`}
                      >
                        {numericValue}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center mt-5">
              <button className="bg-brand hover:bg-brand-hover text-white font-semibold py-2 px-4 mt-5 rounded-2xl transition-colors duration-300">
                Recalculate Features
              </button>
            </div>
          </div>
        </div>

        {/* Top 3 Matches Slideshow */}
        <div className="flex flex-col items-center justify-between w-full lg:w-1/2 p-6 border-2 border-neutral-border rounded-xl bg-brand-light shadow-custom">
          <div className="w-full text-center">
            <h2 className="text-2xl font-bold text-neutral-darkest mb-4">
              Top Three Matches
            </h2>

            {/* Slideshow */}
            <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-lg overflow-hidden border border-neutral-border group mb-4">
              {getVideoSrc(currentMatch?.word) ? (
                <video
                  key={currentMatch?.word ?? activeIdx}
                  src={getVideoSrc(currentMatch?.word)}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm">
                  Video not available
                </div>
              )}
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/70 w-9 h-9 flex items-center justify-center rounded-full text-xl font-bold transition-all cursor-pointer select-none"
              >
                &#10094;
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/70 w-9 h-9 flex items-center justify-center rounded-full text-xl font-bold transition-all cursor-pointer select-none"
              >
                &#10095;
              </button>
            </div>

            {/* Thumbnails */}
            <div className="flex flex-row gap-3 justify-center max-w-xs mx-auto">
              {slideshowMatches.map((match, idx) => (
                <button
                  key={match.word}
                  onClick={() => setActiveIdx(idx)}
                  className={`flex-1 aspect-video rounded overflow-hidden border-2 transition-all cursor-pointer capitalize${
                    idx === activeIdx
                      ? "border-brand scale-105 opacity-100 ring-2 ring-brand-hover-bg"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="w-full h-full bg-neutral-dark text-white flex items-center justify-center text-xs font-bold uppercase">
                    {match.word}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <br></br>

          <div className="flex flex-col items-center justify-center gap-3 bg-gray-200 rounded-2xl px-6 py-4 shadow-sm w-full max-w-md text-center">
            {/* Line 1: Word */}
            <span className="font-extrabold text-black text-xl tracking-wide uppercase truncate w-full">
              {currentMatch ? currentMatch.word : "SIGN LABEL"}
            </span>

            {/* Line 2: Confidence */}
            {currentMatch?.confidence !== undefined && (
              <span className="text-sm font-semibold text-gray-600">
                ({Math.round(currentMatch.confidence * 100)}% Confidence)
              </span>
            )}

            {/* Line 3: Button */}
            <button
              onClick={() =>
                openSignModal(currentMatch?.word || `Match ${activeIdx + 1}`)
              }
              disabled={hasSubmittedFeedback}
              className={`font-semibold py-2 px-6 rounded-full transition-colors shadow-sm whitespace-nowrap w-full mt-1 ${
                hasSubmittedFeedback
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {hasSubmittedFeedback ? "Feedback Submitted" : "This is my sign!"}
            </button>
          </div>

          {/* Match details / Features */}
          <div className="w-full mt-6 pt-6 border-t border-neutral-border text-left">
            <p className="text-xl font-bold text-neutral-darkest mb-3 text-center">
              Features
            </p>
            <div className="flex flex-col gap-3 w-full">
              {featuresList.map((item) => {
                const numericValue = Math.round(item.similarity_score * 100);
                const barColor = item.accurate
                  ? "bg-green-500"
                  : numericValue >= 60
                    ? "bg-yellow-400"
                    : "bg-red-400";
                return (
                  <div
                    key={item.feature}
                    className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 bg-white/50 p-3 rounded-lg border border-neutral-border/40"
                  >
                    <span className="text-neutral-dark text-sm sm:text-base font-medium">
                      {item.feature}: {item.reference_value}
                    </span>
                    <div className="sm:col-span-2 flex items-center justify-end gap-3 w-full">
                      <div className="w-full max-w-48 md:w-60">
                        <div
                          className="progress bg-gray-200 h-2.5 rounded-full w-full overflow-hidden"
                          role="progressbar"
                          aria-label={`${item.feature} similarity`}
                          aria-valuenow={numericValue}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div
                            className={`progress-bar ${barColor} h-full rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${numericValue}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-neutral-dark text-sm sm:text-base font-semibold sm:text-right">
                        {numericValue}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {/* Other Potential Matches Grid (4th, 5th, 6th signs) */}
      <div className="w-full border-t border-neutral-border pt-8 mt-4">
        <h2 className="text-3xl font-bold text-neutral-darkest text-center mb-4">
          Other Potential Matches
        </h2>
        <div className="w-full bg-brand-alt-bg text-neutral-dark p-3 rounded-lg border border-neutral-border mb-6 text-center">
          <p className="text-sm font-medium">
            Click each button to see the video that matches with the
            corresponding sign.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bottomMatches.map((match) => (
            <div
              key={match.slotKey}
              className="flex flex-col items-center p-5 bg-neutral-panel rounded-xl border border-neutral-border shadow-sm"
            >
              <div className="w-full flex flex-col items-center">
                {!isVisible[match.slotKey] && (
                  <button
                    className="font-button w-full max-w-70 aspect-video bg-brand text-white text-lg font-semibold rounded-lg shadow hover:bg-brand-hover active:scale-95 transition-all uppercase tracking-wider cursor-pointer"
                    onClick={() =>
                      setIsVisible((prev) => ({
                        ...prev,
                        [match.slotKey]: true,
                      }))
                    }
                  >
                    View {match.word}
                  </button>
                )}
                {isVisible[match.slotKey] && (
                  <div className="w-full max-w-[320px] aspect-video bg-black rounded-lg overflow-hidden border border-neutral-border">
                    {getVideoSrc(match.word) ? (
                      <video
                        key={match.word}
                        src={getVideoSrc(match.word)}
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-sm">
                        Video not available
                      </div>
                    )}
                  </div>
                )}
              </div>
              <br></br>
              {/* "This is my sign" for potential matches */}
              {isVisible[match.slotKey] && (
                <div className="flex flex-col items-center justify-center gap-3 bg-gray-200 rounded-2xl px-6 py-4 shadow-sm w-full max-w-md text-center">
                  {/* Line 1: Word */}
                  <span className="font-extrabold text-black text-xl tracking-wide uppercase truncate w-full">
                    {match ? match.word : "SIGN LABEL"}
                  </span>

                  {/* Line 2: Confidence */}
                  {match?.confidence !== undefined && (
                    <span className="text-sm font-semibold text-gray-600">
                      ({Math.round(match.confidence * 100)}% Confidence)
                    </span>
                  )}

                  {/* Line 3: Button */}
                  <button
                    onClick={() =>
                      openSignModal(match?.word || `Match ${activeIdx + 1}`)
                    }
                    disabled={hasSubmittedFeedback}
                    className={`font-semibold py-2 px-6 rounded-full transition-colors shadow-sm whitespace-nowrap w-full mt-1 ${
                      hasSubmittedFeedback
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {hasSubmittedFeedback
                      ? "Feedback Submitted"
                      : "This is my sign!"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Sign not found */}
      <div className="mt-2 bottom-0 left-0 right-0 py-4 px-6 flex justify-center">
        <button
          onClick={() => setIsMissingModalOpen(true)}
          disabled={hasSubmittedFeedback}
          className={`font-semibold py-2 px-4 rounded-lg shadow-md transition-transform active:scale-95 ${
            hasSubmittedFeedback
              ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {hasSubmittedFeedback ? "Feedback Completed" : "My sign is not here"}
        </button>
      </div>
      {/* Modal: "This is my sign" */}
      {isSignModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-fade-in relative">
            <h3 className="text-2xl font-bold text-neutral-darkest mb-3">
              Confirm Your Selection
            </h3>
            <p className="text-gray-600 mb-6">
              Please confirm that{" "}
              <span className="underline">{selectedMatchLabel}</span> is the
              sign you intended to find.
            </p>
            <div className="bg-brand-light p-4 rounded-lg mb-6 text-sm text-left border border-neutral-border/40">
              <p className="font-semibold text-neutral-darkest mb-1">
                📝 Feedback Surveys
              </p>
              <p className="text-gray-600 mb-2">
                Help us improve the recognition accuracy by answering a few
                short questions.
              </p>
              <a
                href="https://forms.gle/eAfhaNG49MGtescw5"
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline font-medium inline-block"
              >
                Feedback Survey
              </a>
              <br />
              <a
                href="https://forms.gle/ZiiSs1Cs2C2mbfnA7"
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline font-medium inline-block"
              >
                List of Signs for Testing (only fill out once AFTER you've
                tested all of them)
              </a>
            </div>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setIsSignModalOpen(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSign}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: "My sign is not here" */}
      {isMissingModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-fade-in relative">
            <h3 className="text-2xl font-bold text-red-600 mb-3">
              Help Us Debug
            </h3>
            <p className="text-gray-600 mb-6">
              Can we use your uploaded video to debug what happened? We will
              completely delete the video after resolving the bug.
            </p>
            <div className="mb-4">
              <label
                htmlFor="intendedWordInput"
                className="block text-sm font-semibold text-neutral-darkest mb-1"
              >
                What word were you trying to sign?
              </label>
              <input
                type="text"
                id="intendedWordInput"
                value={intendedWord}
                onChange={(e) => setIntendedWord(e.target.value)}
                placeholder="Enter word"
                className="w-full px-3 py-2 text-neutral-600 border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="bg-neutral-panel p-4 rounded-lg mb-6 text-sm text-left border border-neutral-border/40">
              <p className="font-semibold text-neutral-darkest mb-1">
                📝 Feedback Survey
              </p>
              <p className="text-gray-600 mb-2">
                Help us improve the recognition accuracy by answering a few
                short questions.
              </p>
              <a
                href="https://forms.gle/eAfhaNG49MGtescw5"
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline font-medium inline-block"
              >
                Feedback Survey
              </a>
              <br />
              <a
                href="https://forms.gle/ZiiSs1Cs2C2mbfnA7"
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline font-medium inline-block"
              >
                List of Signs for Testing (only fill out once AFTER you've
                tested all of them)
              </a>
            </div>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setIsMissingModalOpen(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMissingSign}
                disabled={!intendedWord.trim()}
                className={`px-5 py-2 rounded-lg font-semibold transition-colors ${
                  intendedWord.trim()
                    ? "bg-brand hover:bg-brand-hover text-white"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
