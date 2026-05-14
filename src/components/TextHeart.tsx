import { useEffect, useRef, RefObject } from 'react';

interface Point {
  x: number;
  y: number;
  alpha: number;
  targetAlpha: number;
  delay: number;
}

interface Pulse {
  point: Point;
  startTime: number;
  duration: number;
  maxAlpha: number;
}

interface Props {
  analyserRef: RefObject<AnalyserNode | null>;
  onComplete?: () => void;
}

export default function TextHeart({ analyserRef, onComplete }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let points: Point[] = [];
    let activePulses: Pulse[] = [];
    const text = "i love you";
    const fontSize = 14;
    const COMPLETE_AT = 37000;

    const initPoints = () => {
      points = [];
      activePulses = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 45;

      // Outer contour — random order
      for (let t = 0; t < Math.PI * 2; t += 0.05) {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        points.push({
          x: centerX + x * scale,
          y: centerY + y * scale,
          alpha: 0,
          targetAlpha: 0.75 + Math.random() * 0.25,
          delay: Math.random() * 28000,
        });
      }

      // Inner layers — random order
      for (let s = 0.8; s >= 0.2; s -= 0.2) {
        for (let t = 0; t < Math.PI * 2; t += 0.1) {
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          points.push({
            x: centerX + x * scale * s,
            y: centerY + y * scale * s,
            alpha: 0,
            targetAlpha: 0.3 + Math.random() * 0.4,
            delay: 3000 + Math.random() * 28000,
          });
        }
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initPoints();
    };

    const triggerPulses = (count: number, currentTime: number) => {
      for (let i = 0; i < count; i++) {
        if (points.length === 0) return;
        const point = points[Math.floor(Math.random() * points.length)];
        activePulses.push({
          point,
          startTime: currentTime,
          duration: 2000 + Math.random() * 2500,
          maxAlpha: 0.55 + Math.random() * 0.35,
        });
      }
    };

    let start: number | null = null;
    let heartCompleted = false;
    let prevBass = 0;
    let lastBeatTime = 0;
    let lastFallbackPulseTime = 0;
    let freqBuffer: Uint8Array<ArrayBuffer> | null = null;

    const draw = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "Fira Code", monospace`;
      const textWidth = ctx.measureText(text).width;

      // Draw base points
      points.forEach(p => {
        if (elapsed > p.delay) {
          p.alpha += (p.targetAlpha - p.alpha) * 0.008;
        }
        if (p.alpha > 0.01) {
          ctx.fillStyle = `rgba(255, 77, 109, ${p.alpha})`;
          ctx.fillText(text, p.x - textWidth / 2, p.y);
        }
      });

      // Draw pulses — sinusoidal bell-curve lifecycle
      activePulses = activePulses.filter(pulse => time - pulse.startTime < pulse.duration);
      activePulses.forEach(pulse => {
        const progress = (time - pulse.startTime) / pulse.duration;
        const alpha = pulse.maxAlpha * Math.sin(Math.PI * progress);
        if (alpha > 0.01) {
          ctx.fillStyle = `rgba(255, 210, 220, ${alpha})`;
          ctx.fillText(text, pulse.point.x - textWidth / 2, pulse.point.y);
        }
      });

      // Completion signal
      if (!heartCompleted && elapsed > COMPLETE_AT) {
        heartCompleted = true;
        lastFallbackPulseTime = time;
        onCompleteRef.current?.();
      }

      // Pulse triggering after heart is complete
      if (heartCompleted) {
        const analyser = analyserRef.current;

        if (analyser) {
          // Beat detection via bass frequencies
          if (!freqBuffer || freqBuffer.length !== analyser.frequencyBinCount) {
            freqBuffer = new Uint8Array(analyser.frequencyBinCount);
          }
          analyser.getByteFrequencyData(freqBuffer);
          // Bins 1-4 cover ~86–350 Hz (kick drum range)
          const bassNow = (freqBuffer[1] + freqBuffer[2] + freqBuffer[3] + freqBuffer[4]) / 4;
          const delta = bassNow - prevBass;
          prevBass = bassNow;

          if (bassNow > 30 && delta > 18 && time - lastBeatTime > 280) {
            lastBeatTime = time;
            triggerPulses(3 + Math.floor(Math.random() * 4), time);
          }
        } else {
          // Fallback: timer-based at ~Angel's tempo (~67 BPM ≈ 900ms/beat)
          if (time - lastFallbackPulseTime > 700 + Math.random() * 500) {
            lastFallbackPulseTime = time;
            triggerPulses(2 + Math.floor(Math.random() * 3), time);
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserRef]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
    />
  );
}
