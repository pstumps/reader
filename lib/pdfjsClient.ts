export async function getPdfJs() {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs")
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.mjs"
    return pdfjs;
}