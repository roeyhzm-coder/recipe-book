import { PANTRY_NAMES, PANTRY_NUTRITION, macrosAt } from '@/data/pantry-ingredients';
import { NUTRITION_FOODS } from '@/data/nutrition-foods';
import { amountToGrams as gramsFromUnit, getPieceWeightGrams } from '@/lib/ingredientUnits';
import { findCatalogItem } from '@/lib/food-portions';

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function emptyMacros() {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/["״'`]/g, '')
    .replace(/[()[\]{},./\\|_+\-–—:*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIAS_INDEX = [];

function addAlias(key, per100, piece) {
  const normalized = normalizeName(key);
  if (!normalized) return;
  ALIAS_INDEX.push({ key: normalized, per100, piece: piece || 0, length: normalized.length });
}

for (const food of NUTRITION_FOODS) {
  for (const key of food.keys) addAlias(key, food.per100, food.piece);
}

for (const [pantryKey, title] of Object.entries(PANTRY_NAMES)) {
  const per100 = PANTRY_NUTRITION[pantryKey];
  if (!per100) continue;
  const piece = pantryKey === 'eggL' ? 60 : pantryKey === 'schnitzelAirfryer' ? 70 : getPieceWeightGrams(title);
  addAlias(title, per100, piece);
  addAlias(pantryKey, per100, piece);
}

ALIAS_INDEX.sort((a, b) => b.length - a.length);

export function findIngredientNutrition(name) {
  const catalog = findCatalogItem(name);
  if (catalog?.per100) {
    return { per100: catalog.per100, piece: catalog.piece || 0 };
  }

  const hay = normalizeName(name);
  if (!hay) return null;
  for (const entry of ALIAS_INDEX) {
    if (hay === entry.key || hay.startsWith(`${entry.key} `) || hay.includes(` ${entry.key}`)) {
      return { per100: entry.per100, piece: entry.piece };
    }
  }
  return null;
}

function per100Of(ingredient) {
  const stored = ingredient?.per100;
  if (stored && typeof stored === 'object') {
    const calories = Number(stored.calories);
    if (Number.isFinite(calories)) return stored;
  }
  return findIngredientNutrition(ingredient?.name)?.per100 || null;
}

export function amountToGrams(amount, unit, name, unitWeightGrams) {
  return gramsFromUnit(amount, unit, name, unitWeightGrams);
}

export function macrosForIngredient(ingredient) {
  const amount = Number(ingredient?.amount);
  const name = ingredient?.name || '';
  const unit = ingredient?.unit || 'גרם';
  const per100 = per100Of(ingredient);
  if (per100) {
    const grams = amountToGrams(amount, unit, name, ingredient?.unitWeightGrams);
    return macrosAt(per100, grams);
  }
  if (Number.isFinite(amount) && amount > 0) {
    const stored = {
      calories: Number(ingredient.calories),
      protein: Number(ingredient.protein),
      carbs: Number(ingredient.carbs),
      fat: Number(ingredient.fat),
    };
    if (Object.values(stored).some((n) => Number.isFinite(n))) {
      return {
        calories: Number.isFinite(stored.calories) ? round2(stored.calories) : 0,
        protein: Number.isFinite(stored.protein) ? round2(stored.protein) : 0,
        carbs: Number.isFinite(stored.carbs) ? round2(stored.carbs) : 0,
        fat: Number.isFinite(stored.fat) ? round2(stored.fat) : 0,
      };
    }
  }
  return emptyMacros();
}

export function scaleIngredient(ingredient) {
  const macros = macrosForIngredient(ingredient);
  const per100 = per100Of(ingredient);
  return { ...ingredient, ...macros, ...(per100 ? { per100 } : {}) };
}

export function sumIngredientMacros(ingredients) {
  const totals = emptyMacros();
  for (const ing of ingredients || []) {
    const macros = macrosForIngredient(ing);
    totals.calories += macros.calories;
    totals.protein += macros.protein;
    totals.carbs += macros.carbs;
    totals.fat += macros.fat;
  }
  return {
    calories: round2(totals.calories),
    protein: round2(totals.protein),
    carbs: round2(totals.carbs),
    fat: round2(totals.fat),
  };
}

export function recalculateRecipe(recipe) {
  const ingredients = (recipe.ingredients || []).map(scaleIngredient);
  const totals = sumIngredientMacros(ingredients);
  return {
    ...recipe,
    ingredients,
    macros: { ...(recipe.macros || {}), ...totals },
  };
}

export function recipesNeedMacroUpdate(previous, next) {
  return JSON.stringify(previous?.macros || {}) !== JSON.stringify(next?.macros || {})
    || JSON.stringify(previous?.ingredients || []) !== JSON.stringify(next?.ingredients || []);
}

export function batchRecalculateRecipes(recipes) {
  return (recipes || []).map((recipe) => recalculateRecipe(recipe));
}
