"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPdfJs } from "@/lib/pdfjsClient";
import { useTextSelection } from "@/hooks/useTextSelection";
import { explainSelection, TEXT_THRESHOLD } from "@/lib/explainApi";
import type { Highlight } from "@/types/highlight";
import SelectionToolbar from "./SelectionToolbar";
import HighlightLayer from "./HighlightLayer";
import ExplanationPanel from "./ExplanationPanel";
import "./PdfReader.css";

type PdfReaderProps = {
  fileUrl: string;
  docId?: string;
  initialPage?: number;
  initialScale?: number;
};

export default function PdfReader({
  fileUrl,
  docId = "",
  initialPage = 1,
  initialScale = 1.0,
}: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const pageWrapperRef = useRef<HTMLDivElement | null>(null);

  const [page, setPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState<number>(initialScale);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Highlights
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // Explanation panel state
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Text selection hook — watches the page wrapper for selections
  const { selection, clearSelection } = useTextSelection(pageWrapperRef);

  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => (numPages ? page < numPages : false), [page, numPages]);

  /* ─── Render PDF page + text layer ──────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setError(null);
        setIsRendering(true);

        const pdfjs = await getPdfJs();

        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setNumPages(pdf.numPages);

        const safePage = Math.min(Math.max(page, 1), pdf.numPages);
        const pdfPage = await pdf.getPage(safePage);
        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) throw new Error("Canvas not found");

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Failed to get canvas context");

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderTask = pdfPage.render({
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;
        if (cancelled) return;

        /* ── Text layer ── */
        const textContent = await pdfPage.getTextContent();
        if (cancelled) return;

        const textContainer = textLayerRef.current;
        if (textContainer) {
          // Clear previous text layer
          textContainer.innerHTML = "";
          textContainer.style.width = canvas.style.width;
          textContainer.style.height = canvas.style.height;

          const textLayer = new pdfjs.TextLayer({
            textContentSource: textContent,
            container: textContainer,
            viewport,
          });

          await textLayer.render();
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to render PDF";
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [fileUrl, page, scale]);

  /* ─── Add highlight ─────────────────────────────────────── */
  const handleHighlight = useCallback(() => {
    if (!selection) return;

    const newHighlight: Highlight = {
      id: crypto.randomUUID(),
      page,
      rects: selection.rects,
      text: selection.text,
    };

    setHighlights((prev) => [...prev, newHighlight]);
    clearSelection();
  }, [selection, page, clearSelection]);

  /* ─── Remove highlight (double-click) ───────────────────── */
  const handleRemoveHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  /* ─── Capture a screenshot of the selected region ───────── */
  const captureSelectionScreenshot = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !selection) return null;

    const rects = selection.rects;
    if (rects.length === 0) return null;

    // Bounding box of all selection rects
    const minX = Math.min(...rects.map((r) => r.x));
    const minY = Math.min(...rects.map((r) => r.y));
    const maxX = Math.max(...rects.map((r) => r.x + r.width));
    const maxY = Math.max(...rects.map((r) => r.y + r.height));

    // Clamp to half-page height
    const halfPageHeight = canvas.clientHeight / 2;
    const clampedMaxY = Math.min(maxY, minY + halfPageHeight);

    const outputScale = window.devicePixelRatio || 1;

    // Create offscreen canvas for the cropped region
    const cropW = (maxX - minX) * outputScale;
    const cropH = (clampedMaxY - minY) * outputScale;
    const offscreen = document.createElement("canvas");
    offscreen.width = cropW;
    offscreen.height = cropH;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      canvas,
      minX * outputScale,
      minY * outputScale,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH
    );

    return offscreen.toDataURL("image/png");
  }, [selection]);

  /* ─── Explain selection ─────────────────────────────────── */
  const handleExplain = useCallback(async () => {
    if (!selection) return;

    setIsExplaining(true);
    setExplainError(null);
    setExplanation(null);

    try {
      const isLarge = selection.text.length > TEXT_THRESHOLD;

      if (isLarge) {
        const imageBase64 = captureSelectionScreenshot();
        if (!imageBase64) throw new Error("Failed to capture screenshot");

        const result = await explainSelection({
          type: "image",
          imageBase64,
          docId,
          page,
        });
        setExplanation(result.explanation);
      } else {
        const result = await explainSelection({
          type: "text",
          text: selection.text,
          docId,
          page,
        });
        setExplanation(result.explanation);
      }
    } catch (e) {
      setExplainError(e instanceof Error ? e.message : "Failed to get explanation");
    } finally {
      setIsExplaining(false);
      clearSelection();
    }
  }, [selection, captureSelectionScreenshot, docId, page, clearSelection]);

  /* ─── Close explanation panel ───────────────────────────── */
  const handleCloseExplanation = useCallback(() => {
    setExplanation(null);
    setExplainError(null);
  }, []);

  /* ─── Render ────────────────────────────────────────────── */
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={!canPrev || isRendering}
        >
          Previous
        </button>
        <div style={{ minWidth: 120 }}>
          Page {page} {numPages ? `of ${numPages}` : ""}
        </div>
        <button
          onClick={() => setPage((p) => (numPages ? Math.min(p + 1, numPages) : p + 1))}
          disabled={!canNext || isRendering}
        >
          Next
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))}
            disabled={isRendering}
          >
            −
          </button>
          <button
            onClick={() => setScale((s) => Math.min(3.0, Math.round((s + 0.1) * 10) / 10))}
            disabled={isRendering}
          >
            +
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ color: "red" }}>Error: {error}</div>
      ) : (
        <div style={{ overflow: "auto", border: "1px solid #ddd", padding: 12 }}>
          {/* Page wrapper — canvas + text layer + highlights + toolbar */}
          <div className="pdf-page-wrapper" ref={pageWrapperRef}>
            <canvas ref={canvasRef} />
            <div className="textLayer" ref={textLayerRef} />
            <HighlightLayer
              highlights={highlights}
              currentPage={page}
              onRemove={handleRemoveHighlight}
            />
            <SelectionToolbar
              visible={!!selection}
              x={selection?.toolbarX ?? 0}
              y={selection?.toolbarY ?? 0}
              onHighlight={handleHighlight}
              onExplain={handleExplain}
              isExplaining={isExplaining}
            />
          </div>
        </div>
      )}

      {/* Explanation panel */}
      <ExplanationPanel
        explanation={explanation}
        isLoading={isExplaining}
        error={explainError}
        onClose={handleCloseExplanation}
      />
    </div>
  );
}