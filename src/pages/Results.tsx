import React, { useEffect, useState } from 'react'

export default function Results() {
	const [showBtn, setShowBtn] = useState(false)

	useEffect(() => {
		function onScroll() {
			const scrolled = document.documentElement.scrollTop || document.body.scrollTop
			setShowBtn(scrolled > 20)
		}
		window.addEventListener('scroll', onScroll)
		return () => window.removeEventListener('scroll', onScroll)
	}, [])

	function topFunction() {
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	return (
		<main>
			<h1 className="longer-underline">Results</h1>

			<div className="flex-container" style={{ justifyContent: 'space-evenly' }}>
				<div className="left-box" style={{ textAlign: 'center' }}>
					<div className="custom-box" style={{ justifyContent: 'flex-start', minHeight: 'auto' }}>
						<h2 style={{ textAlign: 'center' }}>Your Uploaded Video</h2>
						<video id="uploadedVideo" width={500} height={300} controls />
					</div>
					<button id="download" className="downloadButton">Download Video</button>
				</div>

				<div className="right-box match-info-panel">
					<div className="custom-box" style={{ justifyContent: 'flex-start', minHeight: 'auto' }}>
						<h2 style={{ textAlign: 'center' }}>Top Match:</h2>
						<video id="matchedVideo" width={450} height={250} controls />
					</div>

					<div className="match-info-row">
						<div className="column-content match-info-attribute-item"><p>Handshape:</p></div>
						<div className="column-content match-info-attribute-item"><p>Movement:</p></div>
						<div className="column-content match-info-attribute-item"><p>Location:</p></div>
						<div className="column-content match-info-attribute-item"><p>Palm Orientation:</p></div>
						<div className="column-content match-info-attribute-item"><p>Non-Manual Signs:</p></div>
					</div>

					<div className="custom-box" style={{ justifyContent: 'flex-start', minHeight: 'auto' }}>
						<h2 style={{ textAlign: 'center' }}>Second Best Match:</h2>
						<video id="matchedVideo2" width={450} height={250} controls />
					</div>

					<div className="match-info-row">
						<div className="column-content match-info-attribute-item"><p>Handshape:</p></div>
						<div className="column-content match-info-attribute-item"><p>Movement:</p></div>
						<div className="column-content match-info-attribute-item"><p>Location:</p></div>
						<div className="column-content match-info-attribute-item"><p>Palm Orientation:</p></div>
						<div className="column-content match-info-attribute-item"><p>Non-Manual Signs:</p></div>
					</div>

					<div className="custom-box" style={{ justifyContent: 'flex-start', minHeight: 'auto' }}>
						<h2 style={{ textAlign: 'center' }}>Third Best Match:</h2>
						<video id="matchedVideo3" width={450} height={250} controls />
					</div>

					<div className="match-info-row">
						<div className="column-content match-info-attribute-item"><p>Handshape:</p></div>
						<div className="column-content match-info-attribute-item"><p>Movement:</p></div>
						<div className="column-content match-info-attribute-item"><p>Location:</p></div>
						<div className="column-content match-info-attribute-item"><p>Palm Orientation:</p></div>
						<div className="column-content match-info-attribute-item"><p>Non-Manual Signs:</p></div>
					</div>
				</div>
			</div>

			<div className="column-content" style={{ margin: '0 60px' }}>
				<h2 style={{ textAlign: 'center' }}>Other Potential Matches</h2>
				<div className="columns">
					<div className="column-content panel" style={{ textAlign: 'center' }}>
						<button className="matches-button">match</button>
						<p>Handshape:</p>
						<p>Movement:</p>
						<p>Location:</p>
						<p>Palm Orientation:</p>
						<p>Non-Manual Signs:</p>
					</div>
					<div className="column-content panel" style={{ textAlign: 'center' }}>
						<button className="matches-button">match</button>
						<p>Handshape:</p>
						<p>Movement:</p>
						<p>Location:</p>
						<p>Palm Orientation:</p>
						<p>Non-Manual Signs:</p>
					</div>
					<div className="column-content panel" style={{ textAlign: 'center' }}>
						<button className="matches-button">match</button>
						<p>Handshape:</p>
						<p>Movement:</p>
						<p>Location:</p>
						<p>Palm Orientation:</p>
						<p>Non-Manual Signs:</p>
					</div>
					<div className="column-content panel" style={{ textAlign: 'center' }}>
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
				<button onClick={topFunction} id="myBtn" title="Go to top" className="back-to-top">
					<span style={{ marginRight: 6 }}>&uarr;</span> Back to top
				</button>
			)}
		</main>
	)
}
