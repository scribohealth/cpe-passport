import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import type { Attestation } from "../shared/model";
type Point = [number, number];
export function Signature({
  onChange,
}: {
  onChange: (signature: Pick<Attestation, "method" | "value">) => void;
}) {
  const [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [name, setName] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Point[][]>([]);
  const drawing = useRef(false);
  useEffect(() => {
    onChange({
      method,
      value: method === "typed" ? name : JSON.stringify(strokes.current),
    });
  }, [method, name, onChange]);
  function draw() {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 1000, 300);
    ctx.strokeStyle = "#183e3a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const stroke of strokes.current) {
      ctx.beginPath();
      stroke.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  }
  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      Math.max(
        0,
        Math.min(1000, ((event.clientX - rect.left) * 1000) / rect.width),
      ),
      Math.max(
        0,
        Math.min(300, ((event.clientY - rect.top) * 300) / rect.height),
      ),
    ];
  }
  return (
    <fieldset className="signature">
      <legend>Your signature</legend>
      <div className="segmented">
        <button
          type="button"
          aria-pressed={method === "typed"}
          onClick={() => setMethod("typed")}
        >
          Type full name
        </button>
        <button
          type="button"
          aria-pressed={method === "drawn"}
          onClick={() => {
            setMethod("drawn");
            requestAnimationFrame(draw);
          }}
        >
          Draw signature
        </button>
      </div>
      {method === "typed" ? (
        <label>
          Full name
          <input
            value={name}
            maxLength={240}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
          />
        </label>
      ) : (
        <>
          <p className="muted">
            Draw below using a pointer or touch. You can also use the
            keyboard-accessible typed signature.
          </p>
          <canvas
            ref={canvas}
            width={1000}
            height={300}
            aria-label="Drawn signature area; use Type full name for a keyboard alternative"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drawing.current = true;
              strokes.current.push([point(e)]);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              const current = strokes.current.at(-1)!;
              if (current.length < 2000) current.push(point(e));
              draw();
            }}
            onPointerUp={() => {
              drawing.current = false;
              onChange({
                method: "drawn",
                value: JSON.stringify(strokes.current),
              });
            }}
            onPointerCancel={() => {
              drawing.current = false;
              onChange({
                method: "drawn",
                value: JSON.stringify(strokes.current),
              });
            }}
          />
          <button
            className="text-button"
            type="button"
            onClick={() => {
              strokes.current = [];
              draw();
              onChange({ method: "drawn", value: "[]" });
            }}
          >
            Clear signature
          </button>
        </>
      )}
    </fieldset>
  );
}
export function DrawnSignature({ value }: { value: string }) {
  let strokes: Point[][] = [];
  try {
    strokes = JSON.parse(value);
  } catch {
    /* Invalid legacy signatures do not render. */
  }
  return (
    <svg
      className="signature-preview"
      viewBox="0 0 1000 300"
      role="img"
      aria-label="Submitted drawn signature"
    >
      {strokes.map((stroke, i) => (
        <polyline
          key={i}
          points={stroke.map((p) => p.join(",")).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
