import { recalculateRecipe } from '@/lib/ingredient-macros';

function variationUid() {
  return `var-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function asMinutes(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value);
  const match = String(value).replace(',', '.').match(/(\d+(?:\.\d+)?)/);
  if (!match) return '';
  const n = Number(match[1]);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : '';
}

function cloneIngredients(ingredients, { newIds } = {}) {
  return (Array.isArray(ingredients) ? ingredients : []).map((ing) => ({
    ...ing,
    id: newIds || !ing?.id ? variationUid() : String(ing.id),
    name: String(ing?.name || ''),
    amount: Number(ing?.amount) || 0,
    unit: String(ing?.unit || 'גרם'),
  }));
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

export function normalizeVariation(raw, index = 0) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const prepTime = asMinutes(source.prepTime);
  const cookTime = asMinutes(source.cookTime);
  const totalTime = asMinutes(source.totalTime);
  return {
    id: String(source.id || variationUid()),
    name: String(source.name || `גרסה ${index + 1}`).trim() || `גרסה ${index + 1}`,
    isDefault: !!source.isDefault,
    description: String(source.description || ''),
    ingredients: cloneIngredients(source.ingredients, { newIds: !!source._newIds }),
    steps: Array.isArray(source.steps) ? source.steps.map((step) => String(step || '')) : [],
    macros: displayMacros(source.macros),
    prepTime,
    cookTime,
    totalTime,
    servingUnits: Array.isArray(source.servingUnits) ? source.servingUnits : [],
  };
}

export function normalizeVariations(list) {
  const items = (Array.isArray(list) ? list : []).map((item, index) => normalizeVariation(item, index));
  if (!items.length) return [];
  const defaultIndex = items.findIndex((item) => item.isDefault);
  return items.map((item, index) => ({
    ...item,
    isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
  }));
}

export function emptyVariation(recipe, name = 'גרסה חדשה') {
  const prepTime = asMinutes(recipe?.prepTime);
  const cookTime = asMinutes(recipe?.cookTime);
  const total = (Number(prepTime) || 0) + (Number(cookTime) || 0);
  return normalizeVariation({
    id: variationUid(),
    name,
    isDefault: false,
    description: '',
    _newIds: true,
    ingredients: recipe?.ingredients || [],
    steps: recipe?.steps || [],
    macros: recipe?.macros || {},
    prepTime,
    cookTime,
    totalTime: total > 0 ? total : '',
    servingUnits: recipe?.servingUnits || [],
  });
}

export function recalculateVariation(variation) {
  const computed = recalculateRecipe({
    ingredients: variation.ingredients || [],
    macros: variation.macros || {},
  });
  return {
    ...variation,
    ingredients: computed.ingredients,
    macros: { ...(variation.macros || {}), ...(computed.macros || {}) },
  };
}

export function defaultVariationOf(recipe) {
  const variations = normalizeVariations(recipe?.variations);
  return variations.find((item) => item.isDefault) || variations[0] || null;
}

export function applyVariation(recipe, variation) {
  if (!recipe || !variation) return recipe;
  const prepTime = asMinutes(variation.prepTime);
  const cookTime = asMinutes(variation.cookTime);
  const totalTime = asMinutes(variation.totalTime);
  return {
    ...recipe,
    ingredients: Array.isArray(variation.ingredients) ? variation.ingredients : recipe.ingredients,
    steps: Array.isArray(variation.steps) ? variation.steps : recipe.steps,
    macros: { ...(recipe.macros || {}), ...(variation.macros || {}) },
    prepTime: prepTime === '' ? recipe.prepTime : prepTime,
    cookTime: cookTime === '' ? recipe.cookTime : cookTime,
    totalTime: totalTime === '' ? recipe.totalTime : totalTime,
    servingUnits: variation.servingUnits?.length ? variation.servingUnits : recipe.servingUnits,
    activeVariationId: variation.id,
    activeVariationName: variation.name,
  };
}

export function recipeWithDefaultVariation(recipe) {
  const variations = normalizeVariations(recipe?.variations);
  if (!variations.length) return { ...recipe, variations: [] };
  const next = applyVariation({ ...recipe, variations }, defaultVariationOf({ ...recipe, variations }));
  return { ...next, variations };
}

export function setDefaultVariation(variations, id) {
  return normalizeVariations(variations).map((item) => ({
    ...item,
    isDefault: String(item.id) === String(id),
  }));
}

export function moveVariation(variations, id, direction) {
  const items = normalizeVariations(variations);
  const index = items.findIndex((item) => String(item.id) === String(id));
  if (index < 0) return items;
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = items.slice();
  const [removed] = next.splice(index, 1);
  next.splice(target, 0, removed);
  return next;
}

export function persistableVariations(variations) {
  return normalizeVariations(variations).map((item) => {
    const cleaned = {
      ...item,
      ingredients: (item.ingredients || []).filter((ing) => ing.name && String(ing.name).trim()),
      steps: (item.steps || []).filter((step) => step && String(step).trim()),
    };
    return recalculateVariation(cleaned);
  });
}
