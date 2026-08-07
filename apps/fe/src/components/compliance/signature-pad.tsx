import { Button } from "@dashboard/ui/components/button";
import { useRef } from "react";

type SignaturePadProps = {
  onChange: (dataUrl: string) => void;
};

const WIDTH = 600;
const HEIGHT = 200;

// Raw canvas rather than a signature dependency, at a fixed size so the encoded
// PNG stays far below the sign route's body limit.
export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const context = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    return ctx;
  };

  const pointAt = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = context();
    if (!ctx) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = pointAt(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;

    const ctx = context();
    if (!ctx) return;

    const { x, y } = pointAt(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    dirty.current = true;
  };

  const end = () => {
    if (!drawing.current) return;

    drawing.current = false;
    if (dirty.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    const ctx = context();
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    dirty.current = false;
    onChange("");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="w-full touch-none rounded-md border border-dashed bg-white"
      />
      <Button type="button" variant="ghost" size="sm" onClick={clear}>
        Clear signature
      </Button>
    </div>
  );
}
