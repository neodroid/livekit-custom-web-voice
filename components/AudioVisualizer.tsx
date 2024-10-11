import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  audioTrack: MediaStreamTrack | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioTrack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !audioTrack) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayedWidth = 400;
    const displayedHeight = 400;
    const WIDTH = displayedWidth;
    const HEIGHT = displayedHeight;

    canvas.style.width = `${displayedWidth}px`;
    canvas.style.height = `${displayedHeight}px`;
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const audioCtx = new AudioContext();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const mediaStream = new MediaStream([audioTrack]);

    // mediastream
    const source = audioCtx.createMediaStreamSource(mediaStream);

    const analyser = audioCtx.createAnalyser();
    source.connect(analyser);

    // options
    const opts = {
      smoothing: 0.95,
      fft: 8,
      minDecibels: -90,
      maxDecibels: -10,
      scale: 0.2, // decrease for AI
      glow: 10,
      color1: [255, 0, 0],
      color2: [0, 255, 0],
      color3: [0, 0, 255],
      fillOpacity: 0.6,
      lineWidth: 1,
      blend: 'lighter' as GlobalCompositeOperation,
      shift: 50,
      width: 60,
      amp: 0.2, // decrease for AI increase for mic
      emaFactor: 0.8,
    };

    analyser.fftSize = Math.pow(2, opts.fft);
    analyser.smoothingTimeConstant = opts.smoothing;
    analyser.minDecibels = opts.minDecibels;
    analyser.maxDecibels = opts.maxDecibels;

    const bufferLength = analyser.frequencyBinCount;
    const freqs = new Uint8Array(bufferLength);
    const smoothedFreqs = new Uint8Array(bufferLength);

    // smoothed freqs
    for (let i = 0; i < smoothedFreqs.length; i++) {
      smoothedFreqs[i] = 0;
    }

    const shuffle = [1, 3, 0, 4, 2];

    function freq(channel: number, i: number) {
      const band = 2 * channel + shuffle[i] * 6;
      return smoothedFreqs[band];
    }

    function scale(i: number) {
      const x = Math.abs(2 - i);
      const s = 3 - x;
      return (s / 3) * opts.amp;
    }

    function path(channel: number) {
      if (ctx) {
      const color = opts[`color${channel + 1}` as keyof typeof opts] as number[];
      ctx.fillStyle = `rgba(${color.join(',')}, ${opts.fillOpacity})`;
      ctx.strokeStyle = ctx.shadowColor = `rgb(${color.join(',')})`;

      ctx.lineWidth = opts.lineWidth;
      ctx.shadowBlur = opts.glow;
      ctx.globalCompositeOperation = opts.blend;

      const m = HEIGHT / 2;
      const offset = (WIDTH - 15 * opts.width) / 2;
      const x = Array.from({ length: 15 }, (_, i) => offset + channel * opts.shift + i * opts.width);

      const y = Array.from({ length: 5 }, (_, i) =>
        Math.max(0, m - scale(i) * freq(channel, i))
      );

      const h = 2 * m;

      ctx.beginPath();
      ctx.moveTo(0, m);
      ctx.lineTo(x[0], m + 1);

      ctx.bezierCurveTo(x[1], m + 1, x[2], y[0], x[3], y[0]);
      ctx.bezierCurveTo(x[4], y[0], x[4], y[1], x[5], y[1]);
      ctx.bezierCurveTo(x[6], y[1], x[6], y[2], x[7], y[2]);
      ctx.bezierCurveTo(x[8], y[2], x[8], y[3], x[9], y[3]);
      ctx.bezierCurveTo(x[10], y[3], x[10], y[4], x[11], y[4]);

      ctx.bezierCurveTo(x[12], y[4], x[12], m, x[13], m);
      ctx.lineTo(WIDTH, m + 1);
      ctx.lineTo(x[13], m - 1);

      ctx.bezierCurveTo(x[12], m, x[12], h - y[4], x[11], h - y[4]);
      ctx.bezierCurveTo(x[10], h - y[4], x[10], h - y[3], x[9], h - y[3]);
      ctx.bezierCurveTo(x[8], h - y[3], x[8], h - y[2], x[7], h - y[2]);
      ctx.bezierCurveTo(x[6], h - y[2], x[6], h - y[1], x[5], h - y[1]);
      ctx.bezierCurveTo(x[4], h - y[1], x[4], h - y[0], x[3], h - y[0]);
      ctx.bezierCurveTo(x[2], h - y[0], x[1], m, x[0], m);

      ctx.lineTo(0, m);
      ctx.fill();
      ctx.stroke();
    }
    }

    function visualize() {
      analyser.getByteFrequencyData(freqs);

      // Apply exponential moving average
      for (let i = 0; i < freqs.length; i++) {
        smoothedFreqs[i] =
          opts.emaFactor * freqs[i] + (1 - opts.emaFactor) * smoothedFreqs[i];
      }
      if (ctx)
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      path(0);
      path(1);
      path(2);

      animationFrameId.current = requestAnimationFrame(visualize);
    }

    visualize();

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
      audioCtx.close();
    };
  }, [audioTrack]);

  return (
    <canvas
      ref={canvasRef}
      className="audio-visualizer-canvas"
      style={{
        width: '100%',
        height: '400px',
        backgroundColor: 'transparent',
      }}
    />
  );
};

export default AudioVisualizer;
