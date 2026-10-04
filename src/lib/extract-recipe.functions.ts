import { createServerFn } from "@tanstack/react-start";

const EXTRACT_PROMPT = `אתה מומחה לחילוץ מתכוני בישול מטקסט חופשי או מתמונה של פוסט/מתכון.
החזר אך ורק אובייקט JSON תקין, ללא כל טקסט נוסף, ללא markdown וללא הסברים, במבנה המדויק הבא:
{
  "title": "string - שם המתכון",
  "equipment": ["מערך מחרוזות - רק מכשור חשמלי וכלים מרכזיים בלבד (לדוגמה: נינג'ה גריל, תנור, בלנדר, מעבד מזון, משקל מזון, סיר לחץ, מיקרוגל, כיריים). אסור בהחלט לכלול כלים בסיסיים כמו כפית, מזלג, סכין, קערה, צלחת, צנצנת, מלקחיים או כוסות."],
  "ingredients": [{ "amount": number, "unit": "string ביחידות עבריות כמו גרם/מ״ל/כפות/כפית/יחידה", "name": "string", "calories": number_or_null, "protein": number_or_null, "carbs": number_or_null, "fat": number_or_null }],
  "steps": ["מערך מחרוזות - שלבי הכנה ברורים וממוספרים לוגית"],
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number }
}

כללים:
- אם ערכים תזונתיים לא מופיעים בטקסט, חשב הערכה תזונתית משוערת לפי המצרכים.
- כל הטקסט בעברית תקנית.
- ציוד שלא נחוץ או כלים פשוטים — לא להוסיף כלל.`;

type GoogleErrorPayload = {
  error?: { code?: number; status?: string; message?: string; details?: unknown[] };
  models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function googleErrorMessage(data: GoogleErrorPayload | null, res: Response) {
  const err = data?.error;
  if (err) {
    const details = Array.isArray(err.details)
      ? err.details
          .map((d) => {
            const item = d as { reason?: string; message?: string };
            return item.reason || item.message || JSON.stringify(d);
          })
          .join(" | ")
      : "";
    return [
      `Google API ${err.code || res.status} ${err.status || ""}`.trim(),
      err.message || "",
      details,
    ]
      .filter(Boolean)
      .join(" — ");
  }
  return `Google API ${res.status} ${res.statusText || ""}`.trim();
}

async function safeJson(res: Response): Promise<GoogleErrorPayload | null> {
  try {
    return (await res.json()) as GoogleErrorPayload;
  } catch {
    return null;
  }
}

function rankGeminiModels(models: NonNullable<GoogleErrorPayload["models"]>) {
  const stripped = (n?: string) => String(n || "").replace(/^models\//, "");
  const banned =
    /(deep-research|robotics|computer-use|antigravity|transcribe|lyria|nano-banana|tts|image|embedding|vision|omni|gemma)/;
  const usable = models
    .filter(
      (m) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes("generateContent"),
    )
    .map((m) => stripped(m.name))
    .filter((n) => /^gemini-/.test(n) && !banned.test(n));

  const score = (name: string) => {
    const n = name.toLowerCase();
    let s = 0;
    const v = n.match(/^gemini-(\d+(?:\.\d+)?)/);
    if (v) s += parseFloat(v[1] ?? "0") * 100;
    if (n.includes("flash")) s += 30;
    if (n.includes("pro")) s += 20;
    if (n.includes("lite")) s -= 15;
    if (n.includes("preview") || n.includes("exp")) s -= 25;
    return s;
  };
  return usable.sort((a, b) => score(b) - score(a)).slice(0, 4);
}


export type ExtractRecipeResult =
  | { ok: true; recipeJson: string }
  | { ok: false; error: string };

export const extractRecipe = createServerFn({ method: "POST" })
  .validator((data: { text?: string; imageBase64?: string; imageMime?: string }) => {
    const text = typeof data?.text === "string" ? data.text : "";
    const imageBase64 = typeof data?.imageBase64 === "string" ? data.imageBase64 : "";
    const imageMime = typeof data?.imageMime === "string" ? data.imageMime : "image/jpeg";
    if (!text.trim() && !imageBase64) throw new Error("לא נשלח תוכן לניתוח.");
    return { text, imageBase64, imageMime };
  })
  .handler(async ({ data }): Promise<ExtractRecipeResult> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      return {
        ok: false,
        error:
          "לא הוגדר מפתח Gemini בשרת. יש להגדיר את הסוד GEMINI_API_KEY בהגדרות הענן של האפליקציה.",
      };
    }

    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    const listData = await safeJson(listRes);
    if (!listRes.ok) return { ok: false, error: googleErrorMessage(listData, listRes) };

    const candidates = rankGeminiModels(listData?.models ?? []);
    if (candidates.length === 0) {
      return { ok: false, error: "Google API: לא נמצא אף מודל שתומך ב-generateContent." };
    }

    const parts: Array<Record<string, unknown>> = [{ text: EXTRACT_PROMPT }];
    if (data.text) parts.push({ text: `הטקסט לניתוח:\n${data.text}` });
    if (data.imageBase64) {
      parts.push({ inlineData: { mimeType: data.imageMime, data: data.imageBase64 } });
    }

    let lastError = "Google API: לא נמצא מודל זמין.";

    for (const model of candidates) {
      let res: Response;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
            }),
          },
        );
      } catch (e) {
        lastError = (e as Error).message || "שגיאת רשת בפנייה ל-Google.";
        continue;
      }

      const payload = await safeJson(res);
      if (!res.ok) {
        lastError = `${googleErrorMessage(payload, res)} (מודל: ${model})`;
        continue;
      }

      const raw = (payload?.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text || "")
        .join("");
      if (!raw.trim()) {
        lastError = `לא התקבלה תשובה מה-AI (מודל: ${model}).`;
        continue;
      }
      const cleaned = raw
        .trim()
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();
      try {
        JSON.parse(cleaned);
        return { ok: true, recipeJson: cleaned };
      } catch (e) {
        lastError = `שגיאת פענוח JSON מהמודל ${model}: ${(e as Error).message}`;
      }
    }

    return { ok: false, error: lastError };
  });
