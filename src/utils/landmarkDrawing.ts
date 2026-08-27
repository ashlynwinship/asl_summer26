export const clearCanvas = (canvas: HTMLCanvasElement | null) => {
  const ctx = canvas?.getContext("2d");
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

export const drawLandmarkPoints = (
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number }> | undefined,
  color: string,
  radius: number,
  width: number,
  height: number,
) => {
  if (!landmarks) return;

  ctx.save();
  ctx.fillStyle = color;
  landmarks.forEach((landmark) => {
    const x = landmark.x * width;
    const y = landmark.y * height;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

export const drawSkeleton = (
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number }> | undefined,
  connections: Array<[number, number]>,
  color: string,
  width: number,
  height: number,
) => {
  if (!landmarks) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  connections.forEach(([start, end]) => {
    const startPoint = landmarks[start];
    const endPoint = landmarks[end];
    if (!startPoint || !endPoint) return;

    ctx.beginPath();
    ctx.moveTo(startPoint.x * width, startPoint.y * height);
    ctx.lineTo(endPoint.x * width, endPoint.y * height);
    ctx.stroke();
  });
  ctx.restore();
};

export const drawLandmarkOverlay = ({
  ctx,
  poseResult,
  handResult,
  width,
  height,
}: {
  ctx: CanvasRenderingContext2D;
  poseResult: any;
  handResult: any;
  width: number;
  height: number;
}) => {
  if (poseResult?.landmarks?.length) {
    drawSkeleton(
      ctx,
      poseResult.landmarks[0],
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 7],
        [0, 4],
        [4, 5],
        [5, 6],
        [6, 8],
        [9, 10],
        [11, 12],
        [11, 13],
        [13, 15],
        [15, 17],
        [15, 19],
        [17, 19],
        [12, 14],
        [12, 24],
        [14, 16],
        [16, 18],
        [16, 20],
        [18, 20],
        [11, 23],
        [23, 24],
        [23, 25],
        [24, 26],
        [25, 27],
      ],
      "#00e676",
      width,
      height,
    );
    drawLandmarkPoints(
      ctx,
      poseResult.landmarks[0],
      "#ff3b30",
      4,
      width,
      height,
    );
  }

  if (handResult?.landmarks) {
    handResult.landmarks.forEach(
      (landmarks: Array<{ x: number; y: number }>, index: number) => {
        const handednessLabel =
          handResult.handedness?.[index]?.[0]?.categoryName;
        const color = handednessLabel === "Left" ? "#ef4444" : "#3b82f6";
        const pointColor = handednessLabel === "Left" ? "#fca5a5" : "#fbbf24";

        drawSkeleton(
          ctx,
          landmarks,
          [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [0, 5],
            [5, 6],
            [6, 7],
            [7, 8],
            [0, 9],
            [9, 10],
            [10, 11],
            [11, 12],
            [0, 13],
            [13, 14],
            [14, 15],
            [15, 16],
            [0, 17],
            [17, 18],
            [18, 19],
            [19, 20],
          ],
          color,
          width,
          height,
        );
        drawLandmarkPoints(ctx, landmarks, pointColor, 3, width, height);
      },
    );
  }
};
