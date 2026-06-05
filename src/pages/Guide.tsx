import React, { useState } from 'react';

export default function TabNavigation() {
  const [activeTab, setActiveTab] = useState('what');

  const tabs = [
    { id: 'what', label: 'What is the Tool Doing?', content: 'The ASL Live Translation tool uses advanced computer vision and machine learning ' + 
        'algorithms to translate American Sign Language (ASL) into spoken English in real-time. It captures video input ' +
        'from a camera, processes the sign language gestures, and outputs the corresponding translation along with a video ' +
        'demonstration. The tool utilizes a combination of computer vision techniques to detect and track hand movements,' +
        'facial expressions, and body language. It then applies machine learning models trained on large datasets of ASL ' +
        'gestures to interpret the signs and generate accurate translations.' },
    { id: 'who', label: 'Who is the Tool For?', content: 'The ASL Live Translation tool is designed for educators, researchers, '
        + 'and anyone interested in learning or improving their ASL skills.' },
    { id: 'tips', label: 'Tips for Filming', content: 'These are some tips for filming your ASL translations: \n' +
      '1. Ensure you have good lighting so that your hand movements are clearly visible.\n' +
      '2. Position yourself in front of a plain background to avoid distractions.\n' +
      '3. Keep your hands within the camera frame at all times for accurate translation.\n' +
      '4. Ensure the video is clear and well-lit for better translation accuracy.' }
  ];

  return (
    <main>
      <h1 style={{ marginBottom: '20px' }}>User Guide</h1>
      <div className="columns">
        <div className="column-content panel">
            <h2 style={{ textAlign: 'center' }}>How to Use</h2>
            <p>1. Click the "Start Recording" button to begin recording your ASL translation.</p>
            <p>2. Sign your word in front of the camera.</p>
            <p>3. Click the "Stop Recording" button to end the recording.</p>
            <p>4. Your recorded video will be displayed below the buttons for you to review.</p>
        </div>
        <div className="column-content panel" style={{ textAlign: 'center', paddingBottom: 20 }}>
            <h2>Walkthrough Demonstration</h2>
            <video id="demoVideo" width={450} height={250} controls />
        </div>
      </div>
        <div className="tab-container">
            <nav className="nav-bar">
                {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </button>
                ))}
            </nav>

            <div className="content-panel active">
                {tabs.find((tab) => tab.id === activeTab)?.content}
            </div>
        </div>
    </main>
  );
}