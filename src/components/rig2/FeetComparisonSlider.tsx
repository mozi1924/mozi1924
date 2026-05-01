import React, { useEffect, useRef, useState } from "react";

type ComparisonItem = {
  label: string;
  caption: string;
  image: string;
};

interface Props {
  items: ComparisonItem[];
}

const EDGE_PADDING = 2;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function FeetComparisonSlider({ items }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [stops, setStops] = useState<[number, number]>([34, 68]);
  const [activeIndex, setActiveIndex] = useState(1);
  const [dragging, setDragging] = useState<number | null>(null);
  const sortedStops = [...stops].sort((a, b) => a - b) as [number, number];
  const segments = [
    [0, sortedStops[0]],
    [sortedStops[0], sortedStops[1]],
    [sortedStops[1], 100],
  ] as const;

  const updateHandle = (handleIndex: number, clientX: number) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;

    setStops((current) => {
      const next = [...current] as [number, number];
      next[handleIndex] = clamp(percent, EDGE_PADDING, 100 - EDGE_PADDING);
      return next;
    });
  };

  useEffect(() => {
    if (dragging === null) return;

    const handleMove = (event: PointerEvent) => {
      updateHandle(dragging, event.clientX);
    };

    const handleUp = () => {
      setDragging(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, updateHandle]);

  return (
    <div className="feet-comparison">
      <div
        ref={containerRef}
        className="comparison-stage"
        onPointerDown={(event) => event.preventDefault()}
      >
        <img
          src={items[2].image}
          alt={items[2].label}
          className="comparison-image"
          draggable={false}
        />
        <div
          className="comparison-layer"
          style={{
            clipPath: `polygon(${segments[1][0]}% 0%, ${segments[1][1]}% 0%, ${segments[1][1]}% 100%, ${segments[1][0]}% 100%)`,
          }}
        >
          <img
            src={items[1].image}
            alt={items[1].label}
            className="comparison-image"
            draggable={false}
          />
        </div>
        <div
          className="comparison-layer"
          style={{
            clipPath: `polygon(${segments[0][0]}% 0%, ${segments[0][1]}% 0%, ${segments[0][1]}% 100%, ${segments[0][0]}% 100%)`,
          }}
        >
          <img
            src={items[0].image}
            alt={items[0].label}
            className="comparison-image"
            draggable={false}
          />
        </div>

        {stops.map((stop, index) => (
          <button
            key={index}
            type="button"
            className={`comparison-handle ${dragging === index ? "is-dragging" : ""}`}
            style={{ left: `${stop}%` }}
            onPointerDown={(event) => {
              setDragging(index);
              updateHandle(index, event.clientX);
            }}
            aria-label={`Drag divider ${index + 1}`}
          >
            <span className="comparison-handle-line" />
            <span className="comparison-handle-pill">
              <span />
              <span />
              <span />
            </span>
          </button>
        ))}

        <div className="comparison-badges" aria-hidden="true">
          {items.map((item, index) => {
            const [start, end] = segments[index];
            const left = `${(start + end) / 2}%`;

            return (
              <span className="comparison-badge" style={{ left }} key={item.label}>
                {item.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="comparison-copy">
        <div className="comparison-tabs" role="tablist" aria-label="Feet modes">
          {items.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={`comparison-tab ${activeIndex === index ? "is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p
          key={items[activeIndex].label}
          className="comparison-caption comparison-caption-live"
        >
          {items[activeIndex].caption}
        </p>
      </div>
    </div>
  );
}
