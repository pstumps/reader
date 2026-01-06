"use client"

import React, { useEffect, useMemo, useRef, useState } from "react";
import {getPdfJs} from "@/lib/pdfjsClient";

type PdfReaderProps = {
    fileUrl: string;
    initialPage?: number;
    initialScale?: number;
}

export default function PdfReader({ fileUrl, initialPage = 1, initialScale = 1.0 }: PdfReaderProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [page, setPage] = useState<number>(initialPage);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [scale, setScale] = useState<number>(initialScale);
    const [isRendering, setIsRendering] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const canPrev = useMemo(() => page > 1, [page]);
    const canNext = useMemo(() => (numPages ? page < numPages : false), [page, numPages]);

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
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to render PDF";
                setError(message);
            } finally {
                if (!cancelled) setIsRendering(false);
            }
        }

        run();

        return () => {
            cancelled = true;
        };
    }, [fileUrl, page, scale]);

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={!canPrev || isRendering}>
                    Previous
                </button>
                <div style={{ minWidth: 120 }}>
                    Page {page} {numPages ? `of ${numPages}` : ""}
                </div>
                <button onClick={() => setPage((p) => (numPages ? Math.min(p + 1, numPages) : p + 1))} disabled={!canNext || isRendering}>
                    Next
                </button>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                    <button onClick={() => setScale((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10))} disabled={isRendering}>
                        -
                    </button>
                    <button onClick={() => setScale((s) => Math.min(3.0, Math.round((s + 0.1) * 10) / 10))} disabled={isRendering}>
                        +
                    </button>
                </div>
            </div>
            {error ? (
            <div style={{ color: "red" }}>Error: {error}</div>
            ) : (
                <div style={{ overflow: "auto", border: "1px solid #ddd", padding: 12 }}>
                    <canvas ref={canvasRef} />
                </div>
            )}
        </div>
    );
}