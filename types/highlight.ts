/** A single persisted highlight on a specific page */
export interface Highlight {
  id: string;
  page: number;
  /** Rects are relative to the page container (px, at current scale) */
  rects: DOMRect[];
  text: string;
}
