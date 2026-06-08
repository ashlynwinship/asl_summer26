import { useState } from 'react';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

function FileUploader(){
	const [file, setFile] = useState<File | null>(null);
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
	const [uploadProgress, setUploadProgress] = useState(0);

	// Placeholder UI for uploader
	return (
		<div className="custom-box">
			<div className="upload-icon">📁</div>
			<span className="upload-text">Accepted formats: MP4, MOV, AVI, WebM</span>
			<br></br>
			<label 
				htmlFor="upload-input"
				className="custom-file-label">
				
				<span className="upload-text">Drag and drop file here or <strong>Browse</strong></span>
				<br />
			</label>
			<input 
				id="upload-input"
				type="file"
				accept="video/*"
				onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				className="hidden-file-input"
			/>
			<div style={{ marginTop: '10px' }}>
          <strong>Uploaded Video:</strong> {file?.name}
        </div>
			<div>
				<button className="uploadButton"
					onClick={() => {
					if (!file) return;
					setUploadStatus('uploading');
					const form = new FormData();
					form.append('file', file);
					fetch('/api/upload', {
						method: 'POST',
						body: form,
					})
						.then((response) => {
							if (!response.ok) {
								throw new Error('Upload failed');
							}
							setUploadStatus('success');
						})
						.catch(() => setUploadStatus('error'));
					}}
				>Upload</button>
			</div>
			<div>{uploadStatus} {uploadProgress > 0 && `${uploadProgress}%`}</div>
		</div>
		
	);
}

export default function Home() {
	return (
		<main>
			<h1 className="longer-underline">Home</h1>

			<div className = "welcome-content" style={{textAlign: 'center'}}>
				<div className="emphasized-text">Welcome!</div>
				<p>This is going to be content. Written here is a paragraph explaining an overview of the application, as well as linking to the user
				guide. I am writing a bunch of stuff just so the paragraph looks good and fills up the space.
				This is just a placeholder for now, but it will be replaced with actual content later on.
				<br />
				The user guide can be found  <a href="/guide">here</a>.
				</p>
			</div>

			<div className = "home-ending" style={{textAlign: 'center'}}>
				<p>Record or upload a video here. Your video will be stored temporarily, and you will be redirected
				to the results page once the upload is processed.</p>
			</div>

			<FileUploader />
		</main>
	)
}
