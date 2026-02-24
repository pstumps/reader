const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";


/** Threshold (character count) below which we send raw text; above we send a screenshot. */
export const TEXT_THRESHOLD = 200;

export type ExplainRequest =
  | { type: "text"; text: string; docId: string; page: number }
  | { type: "image"; imageBase64: string; docId: string; page: number };

export type ExplainResponse = {
  explanation: string;
};

/**
 * Call the backend explain endpoint.
 * - Short selections send { type: "text", text }
 * - Large selections send { type: "image", imageBase64 } (a cropped screenshot)
 */
export async function explainSelection(
  req: ExplainRequest
): Promise<ExplainResponse> {
  const res = await fetch(`${API_BASE_URL}/api/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    throw new Error(`Explain API returned ${res.status}`);
  }

  return res.json();
}
