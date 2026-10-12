import { ISRAELI_FOODS } from '@/data/israeli-foods';
import { NUTRITION_FOODS } from '@/data/nutrition-foods';

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

function wordsOf(name) {
  return normalizeFoodName(name).split(' ').filter(Boolean);
}

function round2(value) {
  return Math.round(Number(value) * 100) / 100;
}

function macrosFromPer100(per100, grams) {
  const factor = Number(grams) > 0 ? Number(grams) / 100 : 0;
  return {
    calories: round2((Number(per100?.calories) || 0) * factor),
    protein: round2((Number(per100?.protein) || 0) * factor),
    carbs: round2((Number(per100?.carbs) || 0) * factor),
    fat: round2((Number(per100?.fat) || 0) * factor),
  };
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

function upsertCatalog(map, item) {
  const label = String(item.label || item.keys?.[0] || '').trim();
  if (!label) return;
  const id = normalizeFoodName(label);
  const prev = map.get(id) || {};
  const keys = [...new Set([...(prev.keys || []), ...(item.keys || []), label])].filter(Boolean);
  map.set(id, {
    ...prev,
    ...item,
    id,
    label,
    keys,
    known: true,
    portions: (item.portions && item.portions.length) ? item.portions : prev.portions,
    per100: item.per100 || prev.per100,
    defaultUnit: item.defaultUnit || prev.defaultUnit,
    exclude: item.exclude || prev.exclude,
    piece: item.piece || prev.piece,
  });
}

function buildCatalog() {
  const map = new Map();
  for (const food of ISRAELI_FOODS) {
    upsertCatalog(map, {
      label: food.keys[0],
      keys: food.keys,
      portions: food.portions,
      defaultUnit: food.defaultUnit,
      per100: food.per100,
      exclude: food.exclude,
    });
  }
  for (const food of NUTRITION_FOODS) {
    upsertCatalog(map, {
      label: food.keys[0],
      keys: food.keys,
      per100: food.per100,
      piece: food.piece,
    });
  }
  return [...map.values()];
}

const CATALOG = buildCatalog();

function itemExcluded(item, hay) {
  return item.exclude?.some((token) => hay.includes(normalizeFoodName(token)));
}

function lookupScore(hay, key) {
  if (!key) return 0;
  if (hay === key) return 400 + key.length;
  if (hay.startsWith(`${key} `) || hay.startsWith(key)) return 300 + key.length;
  if (wordsOf(hay).some((word) => word === key || word.startsWith(`${key}`))) return 200 + key.length;
  return 0;
}

export function findCatalogItem(name) {
  const hay = normalizeFoodName(name);
  if (!hay) return null;
  let best = null;
  let bestScore = 0;
  for (const item of CATALOG) {
    if (itemExcluded(item, hay)) continue;
    for (const rawKey of item.keys) {
      const key = normalizeFoodName(rawKey);
      const score = lookupScore(hay, key);
      if (score > bestScore) {
        bestScore = score;
        best = item;
      }
    }
  }
  return best;
}

export function findIsraeliFood(name) {
  return findCatalogItem(name);
}

function prefixScore(text, query) {
  const value = normalizeFoodName(text);
  if (!value || !query) return 0;
  if (value.startsWith(query)) return 2;
  if (wordsOf(value).some((word) => word.startsWith(query))) return 1;
  return 0;
}

export function searchFoodCatalog(query, limit = 8) {
  const hay = normalizeFoodName(query);
  if (!hay) return [];
  const ranked = [];
  for (const item of CATALOG) {
    let score = 0;
    for (const key of item.keys) {
      score = Math.max(score, prefixScore(key, hay), prefixScore(item.label, hay));
    }
    if (score > 0) {
      ranked.push({
        item,
        score,
        length: normalizeFoodName(item.label).length,
      });
    }
  }
  ranked.sort((a, b) => b.score - a.score || a.length - b.length || a.item.label.localeCompare(b.item.label, 'he'));
  return ranked.slice(0, limit).map((row) => row.item);
}

export function searchIsraeliFoods(query, limit = 8) {
  return searchFoodCatalog(query, limit);
}

export function israeliFoodSuggestions(query, limit = 40) {
  const hay = normalizeFoodName(query);
  return searchFoodCatalog(query, limit).map((item) => {
    const matchedKey = item.keys.find((key) => prefixScore(key, hay) > 0) || item.label;
    return {
      label: matchedKey,
      item: { ...item, label: matchedKey },
    };
  });
}

export function getPortionOptions(name, current = {}) {
  const food = findCatalogItem(name);
  const options = food?.portions?.length
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
  const food = findCatalogItem(name);
  if (!food?.portions?.length) return UNIVERSAL_PORTIONS[0];
  return food.portions.find((portion) => portion.unit === food.defaultUnit || portion.label === food.defaultUnit)
    || food.portions[0];
}

export function resolvePortionGrams(name, unit, unitWeightGrams) {
  const custom = Number(unitWeightGrams);
  const hasCustom = Number.isFinite(custom) && custom > 0;
  const food = findCatalogItem(name);
  const normalized = String(unit || '').trim();

  if (food?.portions?.length) {
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

  if (hasCustom && /יחידה|מנה|פרוסה|גביע|שן|ראש|שרי|סלסלה|חלמון|חלבון|קופסה/.test(normalized)) {
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
  const qtyLabel = Number.isInteger(safeQty) ? String(safeQty) : String(round2(safeQty));
  const unitLabel = option?.label || unit || 'יחידה';

  if (!(total > 0)) {
    if (option?.requiresWeight || /יחידה|מנה/.test(String(unit || ''))) {
      return 'הזינו משקל יחידה בגרמים כדי לכלול בחישוב';
    }
    if (safeQty > 0 && unitLabel) return `${qtyLabel} × ${unitLabel} = 0 גרם`;
    return '';
  }

  const totalLabel = Number.isInteger(total) ? String(total) : String(round2(total));
  return `${qtyLabel} × ${unitLabel} = ${totalLabel} גרם`;
}

export function bindCatalogSelection(item, currentAmount) {
  const food = item?.item || item;
  if (!food) return null;
  const options = getPortionOptions(food.label);
  const preferred = options.find((option) => option.unit === food.defaultUnit || option.label === food.defaultUnit)
    || options.find((option) => option.id === 'gram')
    || options[0];
  const parsed = Number(String(currentAmount ?? '').replace(',', '.'));
  const amount = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const unitWeightGrams = preferred?.requiresWeight
    ? ''
    : (preferred?.kind === 'piece' || preferred?.kind === 'household' || preferred?.grams > 1 ? preferred.grams : '');
  const grams = amount * (Number(preferred?.grams) > 0 ? Number(preferred.grams) : 0);
  const macros = food.per100 ? macrosFromPer100(food.per100, grams || (amount * (preferred?.grams === 1 ? 1 : 0))) : {};
  return {
    name: food.label,
    unit: preferred?.unit || 'גרם',
    unitWeightGrams,
    amount,
    per100: food.per100 || undefined,
    calories: macros.calories ?? '',
    protein: macros.protein ?? '',
    carbs: macros.carbs ?? '',
    fat: macros.fat ?? '',
  };
}
