export default function Home() {
	return (
		<main>
			<h1 className="longer-underline">Home</h1>
			<p>Welcome to ASL Live Translation.</p>

			<div className = "welcome-content" style={{textAlign: 'center'}}>
    			<div className="emphasized-text">Welcome!</div>  
				<p>This is going to be content. Written here is a paragraph explaining an overview of the application, as well as linking to the user
				guide. I am writing a bunch of stuff just so the paragraph looks good and fills up the space.
				This is just a placeholder for now, but it will be replaced with actual content later on. 
				<br></br>
				The user guide can be found <a href="guide.html">here</a>.
				</p>
  			</div>

			<div className = "home-ending" style={{textAlign: 'center'}}>
				<p>Record or upload a video here. Your video will be stored temporarily, and you will be redirected
				to the results page once the upload is processed.</p>
			</div>
		</main>
	)
}
