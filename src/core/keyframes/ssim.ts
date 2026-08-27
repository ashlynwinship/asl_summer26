
// function to get luma
export function rgbaToGrayscale(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4);

  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // perceptual luminance calculated with CCIR 601 standard
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return gray;
}

export function ssim(
  img1: Float32Array,
  img2: Float32Array
): number {
  // insure image sizes match
  if (img1.length !== img2.length) {
    throw new Error("SSIM: input sizes must match");
  }

  const N = img1.length;

  // constants (stabilization, standard SSIM)
  const C1 = 6.5025;
  const C2 = 58.5225;

  let mux = 0;
  let muy = 0;

  // mean
  for (let i = 0; i < N; i++) {
    mux += img1[i];
    muy += img2[i];
  }
  mux /= N;
  muy /= N;

  let sigmax = 0;
  let sigmay = 0;
  let sigmaxy = 0;

  // variance + covariance
  for (let i = 0; i < N; i++) {
    const x = img1[i] - mux;
    const y = img2[i] - muy;

    sigmax += x * x;
    sigmay += y * y;
    sigmaxy += x * y;
  }

  sigmax /= N;
  sigmay /= N;
  sigmaxy /= N;

  // SSIM formula
  const numerator =
    (2 * mux * muy + C1) * (2 * sigmaxy + C2);

  const denominator =
    (mux * mux + muy * muy + C1) *
    (sigmax + sigmay + C2);

  return numerator / denominator;
}
