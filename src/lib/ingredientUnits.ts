/** Kitchen volume/mass weights and average produce piece weights, in grams. */

export const RECIPE_UNIT_LIST = [
  'גרם',
  'ק"ג',
  'מ"ל',
  'ליטר',
  'כוס',
  'כפות',
  'כפית',
  'סקופ',
  'יחידה',
  'חופן',
  'קורט',
] as const;

export const UNKNOWN_PIECE_GRAMS = 100;

const UNIT_ALIASES: Record<string, string> = {
  "ג'": 'גרם',
  ג: 'גרם',
  gram: 'גרם',
  grams: 'גרם',
  g: 'גרם',
  מל: 'מ"ל',
  'מ״ל': 'מ"ל',
  ml: 'מ"ל',
  'ק״ג': 'ק"ג',
  קג: 'ק"ג',
  kg: 'ק"ג',
  כף: 'כפות',
  כפיות: 'כפית',
  כוסות: 'כוס',
  יחידות: 'יחידה',
  יח: 'יחידה',
  "יח'": 'יחידה',
  "יח' בינונית": 'יחידה',
  "יח' בינוניות": 'יחידה',
  ליטרים: 'ליטר',
  'שיני שום': 'שן שום',
};

/** Grams represented by one of this unit (not produce-specific). */
const UNIT_GRAMS: Record<string, number> = {
  גרם: 1,
  'ק"ג': 1000,
  'מ"ל': 1,
  ליטר: 1000,
  כוס: 240,
  כפות: 15,
  כפית: 5,
  סקופ: 25,
  חופן: 15,
  קורט: 1,
  'שן שום': 4,
  'ראש שום': 40,
  'תבנית ביצים': 660,
};

const PIECE_UNITS = new Set(['יחידה', 'שן שום', 'ראש שום', 'תבנית ביצים']);

type PieceRule = {
  keys: string[];
  grams: number;
  exclude?: string[];
};

const PIECE_WEIGHTS: PieceRule[] = [
  { keys: ['תפוח אדמה בייבי', 'תפוחי אדמה בייבי', 'תפוחי אדמה קטנים', 'תפוח אדמה קטן'], grams: 65 },
  { keys: ['תפוח אדמה', 'תפוחי אדמה'], grams: 150 },
  { keys: ['בטטה', 'בטטות'], grams: 350 },
  { keys: ['שן שום', 'שיני שום'], grams: 4, exclude: ['אבקת', 'גבישי'] },
  { keys: ['בצל ירוק'], grams: 15 },
  { keys: ['בצל', 'בצלים'], grams: 120 },
  { keys: ['ביצה', 'ביצים'], grams: 55 },
  { keys: ['פריסת לחם', 'פרוסת לחם', 'פרוסות לחם', 'לחם'], grams: 30, exclude: ['פירור'] },
  { keys: ['גביע', 'קוטג', "קוטג'"], grams: 250 },
  { keys: ['קופסת שימורים', 'שימורים', 'טונה'], grams: 160 },
];

export function normalizeIngredientUnit(unit: string | null | undefined): string {
  const raw = String(unit || '').trim();
  if (!raw) return 'גרם';
  return UNIT_ALIASES[raw] || UNIT_ALIASES[raw.toLowerCase()] || raw;
}

function normalizeName(name: string | null | undefined): string {
  return String(name || '')
    .toLowerCase()
    .replace(/["״'`׳]/g, '')
    .replace(/[()[\]{},./\\|_+\-–—:*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function roundTo1(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 10) / 10;
}

export function getPieceWeightGrams(name: string | null | undefined): number {
  const hay = normalizeName(name);
  if (!hay) return UNKNOWN_PIECE_GRAMS;

  for (const rule of PIECE_WEIGHTS) {
    if (rule.exclude?.some((token) => hay.includes(token))) continue;
    if (rule.keys.some((key) => hay.includes(normalizeName(key)))) {
      return rule.grams;
    }
  }

  if (hay.includes('שום') && !hay.includes('אבקה') && !hay.includes('גבישי')) {
    return 4;
  }

  return UNKNOWN_PIECE_GRAMS;
}

/**
 * Grams represented by a single unit of this ingredient
 * (1 כפית of salt → 5, 1 יחידה of sweet potato → 350).
 */
export function getUnitWeight(unit: string | null | undefined, ingredientName?: string | null): number {
  const normalized = normalizeIngredientUnit(unit);

  if (normalized === 'יחידה') {
    return getPieceWeightGrams(ingredientName);
  }

  const fixed = UNIT_GRAMS[normalized];
  if (typeof fixed === 'number' && fixed > 0) return fixed;

  if (PIECE_UNITS.has(normalized)) {
    return getPieceWeightGrams(ingredientName);
  }

  // Unknown labels: treat as 1 g per unit (gram-like), not as a produce piece.
  return 1;
}

export function amountToGrams(
  amount: number | string | null | undefined,
  unit: string | null | undefined,
  name?: string | null,
): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value * getUnitWeight(unit, name);
}

export function convertAmountOnUnitChange(
  amount: number | string | null | undefined,
  oldUnit: string | null | undefined,
  newUnit: string | null | undefined,
  ingredientName?: string | null,
): number {
  const nextUnit = normalizeIngredientUnit(newUnit);
  const prevUnit = normalizeIngredientUnit(oldUnit);
  const current = Number(amount);
  const safeAmount = Number.isFinite(current) ? current : 0;

  if (prevUnit === nextUnit) return roundTo1(safeAmount);

  const oldWeight = getUnitWeight(oldUnit, ingredientName);
  const newWeight = getUnitWeight(newUnit, ingredientName);
  if (!(oldWeight > 0) || !(newWeight > 0)) return roundTo1(safeAmount);

  return roundTo1((safeAmount * oldWeight) / newWeight);
}

export type ConvertibleIngredient = {
  amount?: number | string | null;
  unit?: string | null;
  name?: string | null;
  [key: string]: unknown;
};

export function convertIngredientUnit<T extends ConvertibleIngredient>(ingredient: T, newUnit: string): T {
  return {
    ...ingredient,
    amount: convertAmountOnUnitChange(ingredient.amount, ingredient.unit, newUnit, ingredient.name),
    unit: newUnit,
  };
}
