import { useEffect, useRef } from "react";

export default function ScratchCard({ revealed, label, onReveal }) {
  const canvasRef = useRef(null);
  const done = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = "#7C3AED";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#E4D4FF";
    ctx.font = "16px Sora, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Scratch here", w / 2, h / 2);

    function scratch(e) {
      if (revealed || done.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (w / rect.width);
      const y = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (h / rect.height);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      const data = ctx.getImageData(0, 0, w, h).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] < 20) clear += 1;
      if (clear / (w * h) > 0.45) {
        done.current = true;
        ctx.clearRect(0, 0, w, h);
        onReveal?.();
      }
    }

    canvas.addEventListener("mousemove", scratch);
    canvas.addEventListener("touchmove", scratch, { passive: true });
    return () => {
      canvas.removeEventListener("mousemove", scratch);
      canvas.removeEventListener("touchmove", scratch);
    };
  }, [revealed, onReveal]);

  return (
    <div className="relative h-40 overflow-hidden rounded-3xl bg-raised text-ink">
      <div className="flex h-full items-center justify-center p-4 text-center font-semibold">{label}</div>
      {!revealed ? <canvas ref={canvasRef} width={320} height={160} className="absolute inset-0 h-full w-full" /> : null}
    </div>
  );
}
