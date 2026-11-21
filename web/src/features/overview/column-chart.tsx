"use client";

import { useState } from "react";
import { dayLabel as label } from "./day-label";

type Point = { day: string; count: number };

// Room above the plot for the top tick's label.
const PAD = 10;
const HEIGHT = 160;
const BASE = PAD + HEIGHT;
const AXIS = 24;
const SLOT = 22;
const BAR = 12;

/** A round top for the axis: 4, 5, 10, 20, 25, 50... at or above `value`. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    if (factor * step >= value) return factor * step;
  }
  return value;
}

/**
 * Listings posted per day, one column a day. Hovering or focusing a column
 * shows its date and count; the same numbers are in the table beside it.
 */
export function ColumnChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const top = niceMax(Math.max(...points.map((point) => point.count), 1));
  const width = points.length * SLOT;
  const y = (count: number) => BASE - (count / top) * HEIGHT;
  const shown = active === null ? null : points[active];

  return (
    // On a phone the chart keeps a readable size and scrolls sideways.
    <div className="overflow-x-auto">
      <div className="relative min-w-[560px]">
        <svg
          viewBox={`0 0 ${width + 28} ${BASE + AXIS}`}
          className="block h-auto w-full"
          role="img"
          aria-label="Listings posted per day for the last 30 days"
        >
          {[0, top / 2, top].map((tick) => (
            <g key={tick}>
              <line
                x1={0}
                x2={width}
                y1={y(tick)}
                y2={y(tick)}
                className={tick === 0 ? "stroke-control" : "stroke-rule"}
                strokeWidth={1}
              />
              <text
                x={width + 6}
                y={y(tick) + 4}
                className="fill-muted text-[11px] tabular-nums"
              >
                {tick}
              </text>
            </g>
          ))}
          {points.map((point, index) => {
            const x = index * SLOT + (SLOT - BAR) / 2;
            const cap = y(point.count);
            return (
              <g
                key={point.day}
                tabIndex={0}
                role="img"
                aria-label={`${label(point.day)}: ${point.count} ${point.count === 1 ? "listing" : "listings"}`}
                onPointerEnter={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                {/* The hit area is the whole slot, not only the painted bar. */}
                <rect
                  x={index * SLOT}
                  y={0}
                  width={SLOT}
                  height={BASE}
                  fill="transparent"
                />
                {point.count > 0 && (
                  <path
                    d={`M${x},${BASE} V${cap + 4} Q${x},${cap} ${x + 4},${cap} H${x + BAR - 4} Q${x + BAR},${cap} ${x + BAR},${cap + 4} V${BASE} Z`}
                    className={`fill-chart transition-opacity ${active !== null && active !== index ? "opacity-50" : ""}`}
                  />
                )}
                {index % 7 === points.length % 7 && (
                  <text
                    x={index * SLOT + SLOT / 2}
                    y={BASE + 17}
                    textAnchor="middle"
                    className="fill-muted text-[11px]"
                  >
                    {label(point.day)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {shown && active !== null && (
          <div
            className="bg-surface border-line rounded-card pointer-events-none absolute top-0 border px-2.5 py-1.5 shadow-sm"
            style={{
              left: `${((active * SLOT + SLOT / 2) / (width + 28)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <p className="font-semibold tabular-nums">
              {shown.count} {shown.count === 1 ? "listing" : "listings"}
            </p>
            <p className="text-small text-muted whitespace-nowrap">
              {label(shown.day)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
