import { ISRAELI_FOODS } from '@/data/israeli-foods';

export const UNIVERSAL_PORTIONS = [
  { id: 'gram', label: 'גרם', unit: 'גרם', grams: 1, kind: 'mass' },
  { id: 'ml', label: 'מ"ל', unit: 'מ"ל', grams: 1, kind: 'volume' },
  { id: 'tbsp', label: 'כף (15ג)', unit: 'כף', grams: 15, kind: 'household' },
  { id: 'tsp', label: 'כפית (5ג)', unit: 'כפית', grams: 5, kind: 'household' },
  { id: 'cup', label: 'כוס (240ג/מ״ל)', unit: 'כוס', grams: 240, kind: 'household' },
];

export const CUSTOM_UNIT_PORTION = {
  id: 'custom-unit',
  label: 'יחידה (הזן משקל)',
  unit: 'יחידה',
  grams: 0,
  kind: 'piece',
  requiresWeight: true,
};

export function normalizeFoodName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/["״'`׳]/g, '')
    .replace(/[()[\]{},./\\|_+\-–—:*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INDEX = ISRAELI_FOODS
  .flatMap((food) => food.keys.map((key) => ({
    key: normalizeFoodName(key),
    food,
    length: normalizeFoodName(key).length,
  })))
  .filter((row) => row.key)
  .sort((a, b) => b.length - a.length);

export function findIsraeliFood(name) {
  const hay = normalizeFoodName(name);
  if (!hay) return null;
  for (const row of INDEX) {
    if (row.food.exclude?.some((token) => hay.includes(normalizeFoodName(token)))) continue;
    if (hay === row.key || hay.includes(row.key)) return row.food;
  }
  return null;
}

export function searchIsraeliFoods(query, limit = 6) {
  const hay = normalizeFoodName(query);
  if (!hay) return [];
  const seen = new Set();
  const hits = [];
  for (const row of INDEX) {
    if (seen.has(row.food)) continue;
    if (row.key.includes(hay) || hay.includes(row.key)) {
      seen.add(row.food);
      hits.push(row.food);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

function optionId(portion) {
  return portion.id || `${portion.unit}:${portion.grams}`;
}

export function portionOption(portion) {
  return {
    id: optionId(portion),
    label: portion.label,
    unit: portion.unit || portion.label,
    grams: Number(portion.grams) || 0,
    kind: portion.kind || 'piece',
    requiresWeight: !!portion.requiresWeight,
    defaultAmount: portion.defaultAmount,
  };
}

export function getPortionOptions(name, current = {}) {
  const food = findIsraeliFood(name);
  const options = food
    ? food.portions.map(portionOption)
    : UNIVERSAL_PORTIONS.map(portionOption);

  if (!food) options.push({ ...CUSTOM_UNIT_PORTION });

  const currentUnit = String(current.unit || '').trim();
  if (currentUnit && !options.some((option) => option.unit === currentUnit || option.label === currentUnit)) {
    const grams = Number(current.unitWeightGrams);
    options.push({
      id: `current:${currentUnit}`,
      label: currentUnit,
      unit: currentUnit,
      grams: Number.isFinite(grams) && grams > 0 ? grams : 0,
      kind: 'custom',
      requiresWeight: !(Number.isFinite(grams) && grams > 0) && /יחידה|מנה|פרוסה|גביע/.test(currentUnit),
    });
  }

  return options;
}

export function findPortionOption(name, unit, unitWeightGrams) {
  const options = getPortionOptions(name, { unit, unitWeightGrams });
  const normalized = String(unit || '').trim();
  return options.find((option) => option.unit === normalized || option.label === normalized)
    || options.find((option) => option.id === 'gram')
    || options[0]
    || null;
}

export function defaultPortionForFood(name) {
  const food = findIsraeliFood(name);
  if (!food) return UNIVERSAL_PORTIONS[0];
  return food.portions.find((portion) => portion.unit === food.defaultUnit || portion.label === food.defaultUnit)
    || food.portions[0];
}

export function resolvePortionGrams(name, unit, unitWeightGrams) {
  const custom = Number(unitWeightGrams);
  const hasCustom = Number.isFinite(custom) && custom > 0;
  const food = findIsraeliFood(name);
  const normalized = String(unit || '').trim();

  if (food) {
    const match = food.portions.find((portion) => portion.unit === normalized || portion.label === normalized);
    if (match) {
      if (match.requiresWeight) return hasCustom ? custom : 0;
      return Number(match.grams) > 0 ? Number(match.grams) : 0;
    }
    if (normalized === 'יחידה' || normalized === 'יחידות' || normalized === 'מנה') {
      const fallback = defaultPortionForFood(name);
      if (fallback?.grams > 0 && fallback.kind === 'piece') return fallback.grams;
    }
  }

  if (hasCustom && /יחידה|מנה|פרוסה|גביע|שן|ראש|שרי|סלסלה|חלמון|חלבון/.test(normalized)) {
    return custom;
  }

  return 0;
}

export function formatLiveGramsHint(amount, unit, name, unitWeightGrams) {
  const qty = Number(amount);
  const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 0;
  const option = findPortionOption(name, unit, unitWeightGrams);
  const unitGrams = resolvePortionGrams(name, unit, unitWeightGrams)
    || (option?.kind === 'mass' ? option.grams : 0)
    || Number(unitWeightGrams)
    || 0;
  const total = safeQty * (Number.isFinite(unitGrams) ? unitGrams : 0);

  if (!(total > 0)) {
    if (option?.requiresWeight || /יחידה|מנה/.test(String(unit || ''))) {
      return 'הזינו משקל יחידה בגרמים כדי לכלול בחישוב';
    }
    return '';
  }

  const qtyLabel = Number.isInteger(safeQty) ? String(safeQty) : String(Math.round(safeQty * 100) / 100);
  const totalLabel = Number.isInteger(total) ? String(total) : String(Math.round(total * 100) / 100);
  const unitLabel = option?.label || unit || 'יחידה';
  if (option?.kind === 'mass' && option.grams === 1) return `${totalLabel} גרם`;
  return `${qtyLabel} × ${unitLabel} = ${totalLabel} גרם`;
}

export function israeliFoodSuggestions(query) {
  return searchIsraeliFoods(query).map((food) => food.keys[0]);
}
