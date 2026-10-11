export const MEAL_PREP_CATEGORY = 'Meal Prep';
export const MEAL_PREP_PERCENTS = [25, 30, 33, 50, 75, 100];

export function isMealPrepRecipe(recipe) {
  if (recipe?.isMealPrep === true || recipe?.is_meal_prep === true) return true;
  if (recipe?.isMealPrep === false || recipe?.is_meal_prep === false) return false;
  return (recipe?.categories || []).some((name) => String(name).trim().toLowerCase() === 'meal prep');
}

export function totalPortionsOf(recipe) {
  const n = Number(recipe?.totalPortions ?? recipe?.total_portions ?? recipe?.baseServings);
  return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n)) : 1;
}

export function normalizeMealPrepPercent(value, fallback = 100) {
  const n = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(1000, Math.round(n * 100) / 100);
}

export function formatMealPrepNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0.00';
  return n.toFixed(2);
}

export function mealPrepDisplayFactor(recipe, percent) {
  const portions = totalPortionsOf(recipe);
  return (normalizeMealPrepPercent(percent) / 100) / portions;
}

export function mealPrepGroceryServings(recipe, percent) {
  const portions = totalPortionsOf(recipe);
  const base = Number(recipe?.baseServings) > 0 ? Number(recipe.baseServings) : portions;
  return base * mealPrepDisplayFactor(recipe, percent);
}

export function withMealPrep(recipe, enabled) {
  const categories = Array.isArray(recipe?.categories) ? [...recipe.categories] : [];
  const hasCategory = categories.some((name) => String(name).trim().toLowerCase() === 'meal prep');
  if (enabled && !hasCategory) categories.push(MEAL_PREP_CATEGORY);
  const portions = totalPortionsOf(recipe);
  return {
    ...recipe,
    isMealPrep: !!enabled,
    totalPortions: portions,
    baseServings: Number(recipe?.baseServings) > 0 ? recipe.baseServings : portions,
    categories,
    updatedAt: Date.now(),
  };
}
