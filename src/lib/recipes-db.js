import { supabase } from "@/integrations/supabase/client";

function rowToRecipe(row) {
  return {
    id: row.id,
    title: row.title || "",
    image: row.image || "",
    categories: Array.isArray(row.categories) ? row.categories : [],
    equipment: Array.isArray(row.equipment) ? row.equipment : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    steps: Array.isArray(row.steps) ? row.steps : [],
    macros: row.macros && typeof row.macros === "object" ? row.macros : {},
    rating: row.rating === null || row.rating === undefined ? '' : Number(row.rating),
    baseServings: Number(row.base_servings) || 1,
    favorite: !!row.favorite,
    createdAt: Number(row.created_at_ms) || 0,

  };
}

function recipeToRow(recipe) {
  return {
    id: String(recipe.id),
    title: recipe.title || "",
    image: recipe.image || "",
    categories: recipe.categories || [],
    equipment: recipe.equipment || [],
    ingredients: recipe.ingredients || [],
    steps: recipe.steps || [],
    macros: recipe.macros || {},
    rating: recipe.rating === '' || recipe.rating === undefined || recipe.rating === null
      ? null
      : Number(recipe.rating),
    base_servings: Number(recipe.baseServings) || 1,
    favorite: !!recipe.favorite,

    created_at_ms: Number(recipe.createdAt) || Date.now(),
  };
}

export async function fetchRecipes() {
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at_ms", { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToRecipe);
}

export async function upsertRecipes(recipes) {
  if (!recipes.length) return;
  const { error } = await supabase.from("recipes").upsert(recipes.map(recipeToRow));
  if (error) throw error;
}

export async function deleteRecipes(ids) {
  if (!ids.length) return;
  const { error } = await supabase.from("recipes").delete().in("id", ids);
  if (error) throw error;
}

function sameRecipe(a, b) {
  return JSON.stringify(recipeToRow(a)) === JSON.stringify(recipeToRow(b));
}

export async function syncRecipes(previous, next) {
  const prevMap = new Map(previous.map((r) => [String(r.id), r]));
  const nextIds = new Set(next.map((r) => String(r.id)));

  const changed = next.filter((r) => {
    const prev = prevMap.get(String(r.id));
    return !prev || !sameRecipe(prev, r);
  });
  const removed = previous.map((r) => String(r.id)).filter((id) => !nextIds.has(id));

  await upsertRecipes(changed);
  await deleteRecipes(removed);
}
