import { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  alpha: number;
  targetAlpha: number;
  delay: number;
  pulseAlpha: number;
}

interface Props {
  onComplete?: () => void;
}

export default function TextHeart({ onComplete }: Props) {
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
    const text = "i love you";
    const fontSize = 14;
    const COMPLETE_AT = 37000; // heart is "done" at 37s (30s draw + ~7s fade)

    const initPoints = () => {
      points = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 45;

      // Outer heart — sequential along the curve (pen-drawing effect)
      const outerTs: number[] = [];
      for (let t = 0; t < Math.PI * 2; t += 0.05) outerTs.push(t);

      outerTs.forEach((t, i) => {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        points.push({
          x: centerX + x * scale,
          y: centerY + y * scale,
          alpha: 0,
          targetAlpha: 0.75 + Math.random() * 0.25,
          delay: (i / outerTs.length) * 26000,
          pulseAlpha: 0,
        });
      });

      // Inner layers — fill in during the same window, slightly staggered
      for (let s = 0.8; s >= 0.2; s -= 0.2) {
        const layerDelay = (0.8 - s) * 3000 + 5000;
        for (let t = 0; t < Math.PI * 2; t += 0.1) {
          const x = 16 * Math.pow(Math.sin(t), 3);
          const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          points.push({
            x: centerX + x * scale * s,
            y: centerY + y * scale * s,
            alpha: 0,
            targetAlpha: 0.3 + Math.random() * 0.4,
            delay: layerDelay + Math.random() * 18000,
            pulseAlpha: 0,
          });
        }
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initPoints();
    };

    let start: number | null = null;
    let heartCompleted = false;
    let lastPulseAt = 0;
    let nextPulseInterval = 2000 + Math.random() * 1000;

    const draw = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "Fira Code", monospace`;
      const textWidth = ctx.measureText(text).width;

      points.forEach(p => {
        if (elapsed > p.delay) {
          p.alpha += (p.targetAlpha - p.alpha) * 0.008;
        }

        // Decay pulse
        if (p.pulseAlpha > 0.005) {
          p.pulseAlpha *= 0.96;
        } else {
          p.pulseAlpha = 0;
        }

        // Base draw
        ctx.fillStyle = `rgba(255, 77, 109, ${p.alpha})`;
        ctx.fillText(text, p.x - textWidth / 2, p.y);

        // Pulse overlay (lighter pink/white on top)
        if (p.pulseAlpha > 0) {
          ctx.fillStyle = `rgba(255, 210, 220, ${p.pulseAlpha})`;
          ctx.fillText(text, p.x - textWidth / 2, p.y);
        }
      });

      // Signal completion
      if (!heartCompleted && elapsed > COMPLETE_AT) {
        heartCompleted = true;
        lastPulseAt = time;
        onCompleteRef.current?.();
      }

      // Pulse effect after heart is complete
      if (heartCompleted && points.length > 0) {
        if (time - lastPulseAt > nextPulseInterval) {
          lastPulseAt = time;
          nextPulseInterval = 2000 + Math.random() * 1000;
          const idx = Math.floor(Math.random() * points.length);
          points[idx].pulseAlpha = 0.65 + Math.random() * 0.25;
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
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
    />
  );
}
