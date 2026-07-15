export const startCameraStream = async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("MediaRecorder API is not supported in this browser.");
  }

  return navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
};

export const stopMediaTracks = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

export const createMediaRecorder = (stream: MediaStream) => {
  return new MediaRecorder(stream);
};
