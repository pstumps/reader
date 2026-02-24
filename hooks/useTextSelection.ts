"use client";

import { useCallback, useEffect, useState } from "react";

export type SelectionInfo = {
  text: string;
  rects: DOMRect[];
  /** Position for a floating toolbar (centre-top of selection) */
  toolbarX: number;
  toolbarY: number;
};

/**
 * Watches for text selection changes inside `containerRef`.
 * Returns the current selection info, or null when nothing is selected.
 */
export function useTextSelection(
  containerRef: React.RefObject<HTMLElement | null>
) {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      setSelection(null);
      return;
    }

    // Only consider selections that live inside our container
    const anchorInside = containerRef.current.contains(sel.anchorNode);
    const focusInside = containerRef.current.contains(sel.focusNode);
    if (!anchorInside && !focusInside) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const containerRect = containerRef.current.getBoundingClientRect();
    const rangeRects = Array.from(range.getClientRects());

    // Convert client rects to container-relative rects
    const rects = rangeRects.map(
      (r) =>
        new DOMRect(
          r.x - containerRect.x,
          r.y - containerRect.y,
          r.width,
          r.height
        )
    );

    if (rects.length === 0) {
      setSelection(null);
      return;
    }

    // Toolbar at top-centre of first rect
    const first = rects[0];
    const toolbarX = first.x + first.width / 2;
    const toolbarY = first.y;

    setSelection({ text, rects, toolbarX, toolbarY });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, []);

  return { selection, clearSelection };
}
