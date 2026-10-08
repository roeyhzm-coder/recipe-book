import { amountToGrams } from '@/lib/ingredientUnits';

export const MACRO_KEYS = ['calories', 'protein', 'carbs', 'fat'];

export const MACRO_FIELD_META = [
  { key: 'calories', label: 'קלוריות', unit: '' },
  { key: 'protein', label: "חלבון (ג')", short: 'חלבון', unit: "ג'" },
  { key: 'carbs', label: "פחמימות (ג')", short: 'פחמימות', unit: "ג'" },
  { key: 'fat', label: "שומן (ג')", short: 'שומן', unit: "ג'" },
];

export function roundMacro(value) {
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(n)) return '';
  return Math.round(n * 100) / 100;
}

export function parseMacroInput(raw) {
  if (raw === '' || raw == null) return '';
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? roundMacro(n) : '';
}

export function formatMacro(value) {
  const n = roundMacro(value);
  if (n === '') return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export function emptyMacroSet() {
  return { calories: '', protein: '', carbs: '', fat: '' };
}

export function nutritionBasisOf(recipe) {
  return recipe?.nutritionBasis || recipe?.macros?.nutritionBasis || 'recipe';
}

export function servingsOf(recipe) {
  const n = Number(recipe?.baseServings);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function unitWeightOf(recipe) {
  const n = Number(recipe?.unitWeightGrams ?? recipe?.macros?.unitWeightGrams);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function totalRecipeGrams(ingredients, recipeUnitWeight = 0) {
  let total = 0;
  let counted = false;
  for (const ing of ingredients || []) {
    const grams = amountToGrams(
      ing?.amount,
      ing?.unit,
      ing?.name,
      ing?.unitWeightGrams || recipeUnitWeight,
    );
    if (grams > 0) {
      total += grams;
      counted = true;
    }
  }
  return counted ? roundMacro(total) : 0;
}

export function hasAutoIngredientMacros(ingredients) {
  return (ingredients || []).some((ing) => MACRO_KEYS.some((key) => {
    const n = Number(ing?.[key]);
    return ing?.[key] !== '' && ing?.[key] != null && Number.isFinite(n);
  }));
}

function scaleMacroSet(macros, factor) {
  const next = emptyMacroSet();
  for (const key of MACRO_KEYS) {
    const raw = macros?.[key];
    if (raw === '' || raw == null) {
      next[key] = '';
      continue;
    }
    const n = Number(raw);
    next[key] = Number.isFinite(n) ? roundMacro(n * factor) : '';
  }
  if (macros?.fiber !== '' && macros?.fiber != null) {
    const n = Number(macros.fiber);
    if (Number.isFinite(n)) next.fiber = roundMacro(n * factor);
  }
  return next;
}

export function storedMacrosToRecipeTotal(macros, { servings = 1, basis = 'recipe', totalGrams = 0 } = {}) {
  const safeServings = Number(servings) > 0 ? Number(servings) : 1;
  if (basis === 'serving') return scaleMacroSet(macros, safeServings);
  if ((basis === '100g' || basis === '100ml') && Number(totalGrams) > 0) {
    return scaleMacroSet(macros, Number(totalGrams) / 100);
  }
  return scaleMacroSet(macros, 1);
}

function servingFactor({ servings = 1, totalGrams = 0, unitWeightGrams = 0 } = {}) {
  const unitGrams = Number(unitWeightGrams);
  const grams = Number(totalGrams);
  if (unitGrams > 0 && grams > 0) return unitGrams / grams;
  const safeServings = Number(servings) > 0 ? Number(servings) : 1;
  return 1 / safeServings;
}

export function recipeTotalToView(totalMacros, mode, ctx = {}) {
  const { totalGrams = 0 } = ctx;
  if (mode === 'serving') return scaleMacroSet(totalMacros, servingFactor(ctx));
  if (mode === '100g' && Number(totalGrams) > 0) {
    return scaleMacroSet(totalMacros, 100 / Number(totalGrams));
  }
  return scaleMacroSet(totalMacros, 1);
}

export function viewValueToRecipeTotal(value, mode, ctx = {}) {
  const parsed = parseMacroInput(value);
  if (parsed === '') return '';
  const { servings = 1, totalGrams = 0, unitWeightGrams = 0 } = ctx;
  if (mode === 'serving') {
    const factor = servingFactor({ servings, totalGrams, unitWeightGrams });
    return factor ? roundMacro(parsed / factor) : parsed;
  }
  if (mode === '100g' && Number(totalGrams) > 0) {
    return roundMacro(parsed * Number(totalGrams) / 100);
  }
  return parsed;
}

export function recipeTotalToStored(totalMacros, { servings = 1, basis = 'recipe', totalGrams = 0 } = {}) {
  if (basis === 'serving') return recipeTotalToView(totalMacros, 'serving', { servings, totalGrams });
  if (basis === '100g' || basis === '100ml') {
    return recipeTotalToView(totalMacros, '100g', { servings, totalGrams });
  }
  return recipeTotalToView(totalMacros, 'recipe', { servings, totalGrams });
}

export function servingDisplayName(recipe) {
  const units = Array.isArray(recipe?.servingUnits) ? recipe.servingUnits : [];
  const named = units.find((unit) => /מנה|שניצל|יחידה|כדור|פרוסה/.test(String(unit?.label || '')));
  if (named?.label) return String(named.label).replace(/\s*\(.*\)\s*$/, '').trim();
  const title = String(recipe?.title || '').replace(/\s*\*+\s*$/u, '').trim();
  return title || 'מנה';
}

export function nutritionHint(mode, { servings = 1, totalGrams = 0, unitWeightGrams = 0, servingName = 'מנה' } = {}) {
  const unitGrams = Number(unitWeightGrams);
  if (mode === 'serving') {
    if (unitGrams > 0) return `מציג ערכים ל${servingName} / יחידה אחת (${formatMacro(unitGrams)} גרם)`;
    return `מציג ערכים ל${servingName} / מנה אחת בלבד`;
  }
  if (mode === '100g') {
    const gramsLabel = formatMacro(totalGrams);
    return gramsLabel
      ? `מציג ערכים ל-100 גרם (משקל כולל ${gramsLabel} גרם)`
      : 'מציג ערכים ל-100 גרם';
  }
  const count = Number(servings) > 0 ? Number(servings) : 1;
  return `מציג ערכים לכל המתכון השלם (${count} מנות)`;
}

export function nutritionTabOptions({ servings = 1, totalGrams = 0, unitWeightGrams = 0 } = {}) {
  const count = Number(servings) > 0 ? Number(servings) : 1;
  const unitGrams = Number(unitWeightGrams);
  const servingLabel = unitGrams > 0
    ? `מנה / יחידה בודדת (1 × ${formatMacro(unitGrams)} גרם)`
    : `מנה / יחידה בודדת (1 מתוך ${count})`;
  const tabs = [
    { id: 'serving', label: servingLabel },
    { id: 'recipe', label: `כל המתכון השלם (${count} מנות)` },
  ];
  if (Number(totalGrams) > 0) {
    tabs.push({ id: '100g', label: 'ל-100 גרם' });
  }
  return tabs;
}

export function defaultNutritionMode(recipe) {
  const basis = nutritionBasisOf(recipe);
  if (basis === '100g' || basis === '100ml') return '100g';
  if (basis === 'serving') return 'serving';
  return 'serving';
}

export function hydrateRecipeMacrosForForm(recipe) {
  const servings = servingsOf(recipe);
  const grams = totalRecipeGrams(recipe?.ingredients, unitWeightOf(recipe));
  const basis = nutritionBasisOf(recipe);
  const macros = storedMacrosToRecipeTotal(recipe?.macros, {
    servings,
    basis,
    totalGrams: grams,
  });
  return {
    ...recipe,
    macros: {
      ...macros,
      ...(recipe?.macros?.fiber !== '' && recipe?.macros?.fiber != null && macros.fiber == null
        ? { fiber: recipe.macros.fiber }
        : {}),
    },
  };
}
