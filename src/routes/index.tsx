import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const RecipeApp = lazy(() => import("@/components/RecipeApp.jsx"));

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
  return (
    <div dir="rtl">
      <Suspense
        fallback={<div className="flex min-h-screen items-center justify-center">טוען…</div>}
      >
        <RecipeApp />
      </Suspense>
    </div>
  );
}
