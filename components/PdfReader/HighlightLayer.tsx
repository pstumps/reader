"use client";

import React from "react";
import type { Highlight } from "@/types/highlight";

type Props = {
  highlights: Highlight[];
  currentPage: number;
  onRemove: (id: string) => void;
};

/**
 * Renders yellow highlight rectangles behind selected text.
 * Positioned absolutely inside the page container.
 */
export default function HighlightLayer({ highlights, currentPage, onRemove }: Props) {
  const visible = highlights.filter((h) => h.page === currentPage);
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((h) =>
        h.rects.map((rect, i) => (
          <div
            key={`${h.id}-${i}`}
            className="pdf-highlight-rect"
            style={{
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              zIndex: 1,
              pointerEvents: i === 0 ? "auto" : "none",
            }}
            title={h.text.slice(0, 80)}
            onDoubleClick={() => onRemove(h.id)}
          />
        ))
      )}
    </>
  );
}
