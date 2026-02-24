"use client";

import React from "react";

type Props = {
  explanation: string | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
};

export default function ExplanationPanel({ explanation, isLoading, error, onClose }: Props) {
  if (!explanation && !isLoading && !error) return null;

  return (
    <div className="explanation-panel">
      <div className="explanation-panel-header">
        <strong>Explanation</strong>
        <button onClick={onClose} className="explanation-close-btn" title="Close">
          ✕
        </button>
      </div>
      <div className="explanation-panel-body">
        {isLoading && <p className="explanation-loading">Thinking…</p>}
        {error && <p className="explanation-error">{error}</p>}
        {explanation && <p>{explanation}</p>}
      </div>
    </div>
  );
}
