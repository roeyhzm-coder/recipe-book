import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import RecipeApp from "@/components/RecipeApp.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "מטבח – ספר המתכונים החכם שלי" },
      {
        name: "description",
        content:
          "ניהול מתכונים בעברית: חיפוש, מועדפים, קטגוריות, טיימרים, ערכים תזונתיים וייבוא חכם.",
      },
      { property: "og:title", content: "מטבח – ספר המתכונים החכם שלי" },
      {
        property: "og:description",
        content:
          "ניהול מתכונים בעברית: חיפוש, מועדפים, קטגוריות, טיימרים וערכים תזונתיים.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        טוען…
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950">
      <RecipeApp />
    </div>
  );
}
