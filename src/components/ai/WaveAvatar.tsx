import { useEffect, useRef } from 'react';

/**
 * Voice-assistant globe — ported from Escoutly's WaveAvatar, re-themed to
 * Qlisted's browns. A masked circle with a radial gradient; animated sine waves
 * while the AI speaks, a calm glowing line otherwise. Pure canvas, no deps.
 */
export function WaveAvatar({ speaking, size = 220 }: { speaking: boolean; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const w = size, h = size, r = size * 0.46;
    const waves = [
      { timeModifier: 1.0, amplitude: 14, wavelength: 26 },
      { timeModifier: 1.7, amplitude: 9, wavelength: 18 },
      { timeModifier: 0.7, amplitude: 18, wavelength: 34 },
    ];
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      // Qlisted brown globe
      const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.2, w / 2, h / 2, r);
      g.addColorStop(0, 'rgba(139,69,19,0.95)');   // #8B4513
      g.addColorStop(0.5, 'rgba(92,64,51,0.97)');  // #5C4033
      g.addColorStop(1, 'rgba(40,26,18,0.98)');
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      const stroke = '#F5DEB3'; // wheat accent
      const x0 = w * 0.16, x1 = w * 0.84;
      if (!speakingRef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, h / 2);
        ctx.lineTo(x1, h / 2);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#D2A679';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
      } else {
        const now = Date.now() / 800;
        waves.forEach((wv, i) => {
          ctx.save();
          ctx.beginPath();
          for (let x = x0; x <= x1; x += 1) {
            const progress = x / wv.wavelength;
            const t = now * wv.timeModifier;
            const fade = Math.sin((Math.PI * (x - x0)) / (x1 - x0));
            const y = h / 2 + Math.sin(progress + t) * wv.amplitude * fade;
            if (x === x0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = stroke;
          ctx.globalAlpha = 0.45 + 0.5 / (i + 1);
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#D2A679';
          ctx.shadowBlur = 6;
          ctx.stroke();
          ctx.restore();
        });
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} className="rounded-full shadow-2xl" aria-hidden />;
}
