"use client";

import React from "react";

type Props = {
  visible: boolean;
  x: number;
  y: number;
  onHighlight: () => void;
  onExplain: () => void;
  isExplaining: boolean;
};

export default function SelectionToolbar({
  visible,
  x,
  y,
  onHighlight,
  onExplain,
  isExplaining,
}: Props) {
  if (!visible) return null;

  return (
    <div
      className="selection-toolbar"
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -110%)",
        zIndex: 20,
      }}
    >
      <button onClick={onHighlight} title="Highlight selection">
        <HighlightIcon />
        <span>Highlight</span>
      </button>
      <button onClick={onExplain} disabled={isExplaining} title="Explain selection">
        <ExplainIcon />
        <span>{isExplaining ? "…" : "Explain"}</span>
      </button>
    </div>
  );
}

function HighlightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="12" height="4" rx="1" fill="currentColor" opacity="0.5" />
      <path d="M3 5h10M3 11h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ExplainIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <text x="8" y="11.5" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="bold">?</text>
    </svg>
  );
}
