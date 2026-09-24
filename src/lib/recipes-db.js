import { supabase } from "@/integrations/supabase/client";

// Until the deleted_at_ms migration is applied, trash state lives only in the local cache.
let softDeleteSupported = false;

export function isSoftDeleteSupported() {
  return softDeleteSupported;
}

async function detectSoftDelete() {
  const { error } = await supabase.from("recipes").select("deleted_at_ms").limit(1);
  softDeleteSupported = !error;
}

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
    deletedAt: row.deleted_at_ms === null || row.deleted_at_ms === undefined ? null : Number(row.deleted_at_ms),
  };
}

function recipeToRow(recipe) {
  const row = {
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
  if (softDeleteSupported) row.deleted_at_ms = recipe.deletedAt ? Number(recipe.deletedAt) : null;
  return row;
}

export async function fetchRecipes() {
  await detectSoftDelete();
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

function sameRecipe(a, b) {
  return JSON.stringify(recipeToRow(a)) === JSON.stringify(recipeToRow(b));
}

// Only ever upserts. Rows are never deleted from Supabase; deletion is a soft flag on the row.
export async function syncRecipes(previous, next) {
  if (!next.length) return;
  const prevMap = new Map(previous.map((r) => [String(r.id), r]));
  const changed = next.filter((r) => {
    const prev = prevMap.get(String(r.id));
    return !prev || !sameRecipe(prev, r);
  });
  await upsertRecipes(changed);
}
