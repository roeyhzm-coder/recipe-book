import { supabase } from "@/integrations/supabase/client";
import { normalizeVariations } from "@/lib/recipe-variations";

// Soft-delete column may still exist; the app never relies on it for visibility.
let softDeleteSupported = false;

export function isSoftDeleteSupported() {
  return softDeleteSupported;
}

async function detectSoftDelete() {
  const { error } = await supabase.from("recipes").select("deleted_at_ms").limit(1);
  softDeleteSupported = !error;
}

function parseStoredMinutes(value) {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : '';
}

function displayMacros(macros) {
  const raw = macros && typeof macros === 'object' ? macros : {};
  const next = {
    calories: raw.calories ?? '',
    protein: raw.protein ?? '',
    carbs: raw.carbs ?? '',
    fat: raw.fat ?? '',
  };
  if (raw.fiber !== '' && raw.fiber != null) next.fiber = raw.fiber;
  return next;
}

function normalizeServingUnits(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((unit) => unit && typeof unit === 'object')
    .map((unit) => ({
      label: String(unit.label || '').trim(),
      amount: Number(unit.amount) || 0,
      unit: String(unit.unit || '').trim(),
      calories: unit.calories ?? '',
      protein: unit.protein ?? '',
      carbs: unit.carbs ?? '',
      fat: unit.fat ?? '',
      ...(unit.fiber !== '' && unit.fiber != null ? { fiber: unit.fiber } : {}),
    }))
    .filter((unit) => unit.label && unit.amount > 0);
}

function persistMacros(recipe) {
  const macros = displayMacros(recipe.macros);
  const prepTime = parseStoredMinutes(recipe.prepTime);
  const cookTime = parseStoredMinutes(recipe.cookTime);
  if (prepTime !== '') macros.prepTime = prepTime;
  if (cookTime !== '') macros.cookTime = cookTime;
  const servingUnits = normalizeServingUnits(recipe.servingUnits || recipe.macros?.servingUnits);
  if (servingUnits.length) macros.servingUnits = servingUnits;
  const nutritionBasis = recipe.nutritionBasis || recipe.macros?.nutritionBasis;
  if (nutritionBasis) macros.nutritionBasis = nutritionBasis;
  const recipeType = recipe.recipeType || recipe.macros?.recipeType;
  if (recipeType) macros.recipeType = recipeType;
  const imageUrl = recipe.imageUrl || recipe.image;
  if (imageUrl) macros.imageUrl = imageUrl;
  const updatedAt = Number(recipe.updatedAt);
  if (Number.isFinite(updatedAt) && updatedAt > 0) macros.clientUpdatedAt = updatedAt;
  const fiber = recipe.macros?.fiber;
  if (fiber !== '' && fiber != null) macros.fiber = fiber;
  const variations = normalizeVariations(recipe.variations || recipe.macros?.variations);
  if (variations.length) macros.variations = variations;
  return macros;
}

function rowToRecipe(row) {
  const rawMacros = row.macros && typeof row.macros === "object" ? row.macros : {};
  return {
    id: row.id,
    title: row.title || "",
    image: row.image || rawMacros.imageUrl || "",
    imageUrl: rawMacros.imageUrl || row.image || "",
    categories: Array.isArray(row.categories) ? row.categories : [],
    equipment: Array.isArray(row.equipment) ? row.equipment : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    steps: Array.isArray(row.steps) ? row.steps : [],
    macros: displayMacros(rawMacros),
    servingUnits: normalizeServingUnits(rawMacros.servingUnits),
    variations: normalizeVariations(rawMacros.variations),
    nutritionBasis: rawMacros.nutritionBasis || '',
    recipeType: rawMacros.recipeType || '',
    prepTime: parseStoredMinutes(rawMacros.prepTime),
    cookTime: parseStoredMinutes(rawMacros.cookTime),
    rating: row.rating === null || row.rating === undefined ? '' : Number(row.rating),
    baseServings: Number(row.base_servings) || 1,
    favorite: !!row.favorite,
    createdAt: Number(row.created_at_ms) || 0,
    updatedAt: Number(rawMacros.clientUpdatedAt)
      || (row.updated_at ? Date.parse(row.updated_at) : 0)
      || Number(row.created_at_ms)
      || 0,
    deletedAt: null,
  };
}

function recipeToRow(recipe) {
  const row = {
    id: String(recipe.id),
    title: recipe.title || "",
    image: recipe.image || recipe.imageUrl || "",
    categories: recipe.categories || [],
    equipment: recipe.equipment || [],
    ingredients: recipe.ingredients || [],
    steps: recipe.steps || [],
    macros: persistMacros(recipe),
    rating: recipe.rating === '' || recipe.rating === undefined || recipe.rating === null
      ? null
      : Number(recipe.rating),
    base_servings: Number(recipe.baseServings) || 1,
    favorite: !!recipe.favorite,
    created_at_ms: Number(recipe.createdAt) || Date.now(),
  };
  if (softDeleteSupported) row.deleted_at_ms = null;
  return row;
}

export async function fetchRecipes() {
  await detectSoftDelete();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at_ms", { ascending: false });
  if (error) throw error;
  const rows = data || [];
  if (softDeleteSupported) {
    const trashIds = rows.filter((row) => row.deleted_at_ms != null).map((row) => String(row.id));
    if (trashIds.length) await deleteRecipesByIds(trashIds);
    return rows.filter((row) => row.deleted_at_ms == null).map(rowToRecipe);
  }
  return rows.map(rowToRecipe);
}

export function formatRecipesDbError(error) {
  const message = error?.message || String(error || "שגיאה לא ידועה");
  const code = error?.code ? ` (${error.code})` : "";
  const details = error?.details ? ` — ${error.details}` : "";
  const hint = error?.hint ? ` — ${error.hint}` : "";
  return `${message}${code}${details}${hint}`;
}

export async function upsertRecipes(recipes) {
  if (!recipes.length) return;
  const { error } = await supabase.from("recipes").upsert(recipes.map(recipeToRow));
  if (error) throw error;
}

export async function deleteRecipesByIds(ids) {
  const unique = [...new Set((ids || []).map(String).filter(Boolean))];
  if (!unique.length) return;
  const { error } = await supabase.from("recipes").delete().in("id", unique);
  if (error) throw error;
}

function sameRecipe(a, b) {
  return JSON.stringify(recipeToRow(a)) === JSON.stringify(recipeToRow(b));
}

export async function syncRecipes(previous, next) {
  const nextIds = new Set(next.map((r) => String(r.id)));
  const deletedIds = previous
    .map((r) => String(r.id))
    .filter((id) => !nextIds.has(id));
  if (deletedIds.length) await deleteRecipesByIds(deletedIds);

  const prevMap = new Map(previous.map((r) => [String(r.id), r]));
  const changed = next.filter((r) => {
    const prev = prevMap.get(String(r.id));
    return !prev || !sameRecipe(prev, r);
  });
  await upsertRecipes(changed);
}
