/** Kitchen volume/mass weights and average produce piece weights, in grams. */

export const RECIPE_UNIT_LIST = [
  'גרם',
  'ק"ג',
  'מ"ל',
  'ליטר',
  'כוס',
  'כף',
  'כפות',
  'כף שטוחה',
  'כפית',
  'סקופ',
  'יחידה',
  'יחידות',
  'פרוסה',
  'גביע',
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
  פרוסות: 'פרוסה',
  פריסה: 'פרוסה',
  גביעים: 'גביע',
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
  'כף שטוחה': 15,
  כפית: 5,
  סקופ: 25,
  פרוסה: 30,
  גביע: 250,
  חופן: 15,
  קורט: 1,
  'שן שום': 4,
  'ראש שום': 40,
  'תבנית ביצים': 660,
};

const PIECE_UNITS = new Set(['יחידה', 'פרוסה', 'גביע', 'שן שום', 'ראש שום', 'תבנית ביצים']);

const DENSITY_OVERRIDES: { keys: string[]; units: Record<string, number> }[] = [
  { keys: ['קורנפלור', 'עמילן תירס'], units: { כפות: 12, כף: 12 } },
];

type PieceRule = {
  keys: string[];
  grams: number;
  exclude?: string[];
};

const PIECE_WEIGHTS: PieceRule[] = [
  { keys: ['תפוח אדמה בייבי', 'תפוחי אדמה בייבי', 'תפוחי אדמה לבנים קטנים', 'תפוחי אדמה קטנים', 'תפוח אדמה קטן'], grams: 75 },
  { keys: ['תפוח אדמה', 'תפוחי אדמה'], grams: 150 },
  { keys: ['בטטה', 'בטטות'], grams: 350 },
  { keys: ['שניצל'], grams: 70 },
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
function getDensityOverride(unit: string, ingredientName?: string | null): number | null {
  const hay = normalizeName(ingredientName);
  if (!hay) return null;
  const normalized = normalizeIngredientUnit(unit);
  for (const rule of DENSITY_OVERRIDES) {
    if (!rule.keys.some((key) => hay.includes(normalizeName(key)))) continue;
    const grams = rule.units[unit] ?? rule.units[normalized];
    if (typeof grams === 'number' && grams > 0) return grams;
  }
  return null;
}

export function getUnitWeight(unit: string | null | undefined, ingredientName?: string | null): number {
  const override = getDensityOverride(String(unit || ''), ingredientName);
  if (override) return override;

  const normalized = normalizeIngredientUnit(unit);

  if (normalized === 'יחידה' || normalized === 'פרוסה' || normalized === 'גביע') {
    const piece = getPieceWeightGrams(ingredientName);
    if (piece !== UNKNOWN_PIECE_GRAMS) return piece;
    if (normalized === 'פרוסה') return 30;
    if (normalized === 'גביע') return 250;
    return UNKNOWN_PIECE_GRAMS;
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

export function formatGramsNumber(grams: number): string {
  const n = roundTo1(grams);
  return Number.isInteger(n) ? String(n) : String(n);
}

const MASS_UNITS = new Set(['גרם']);

export function isGramUnit(unit: string | null | undefined): boolean {
  return MASS_UNITS.has(normalizeIngredientUnit(unit));
}

export function formatQuantityWithGrams(
  amount: number | string | null | undefined,
  unit: string | null | undefined,
  ingredientName?: string | null,
): string {
  const value = Number(amount);
  const qty = Number.isFinite(value)
    ? (Number.isInteger(roundTo1(value)) ? String(roundTo1(value)) : String(roundTo1(value)))
    : String(amount ?? '');
  const unitLabel = String(unit || '').trim();
  if (!unitLabel) return qty;

  if (isGramUnit(unitLabel)) {
    return `${qty} ${unitLabel}`;
  }

  const grams = amountToGrams(amount, unitLabel, ingredientName);
  if (!(grams > 0)) return `${qty} ${unitLabel}`;
  return `${qty} ${unitLabel} (${formatGramsNumber(grams)} גרם)`;
}

export function formatServingUnitLabel(unit: {
  label?: string | null;
  amount?: number | string | null;
  unit?: string | null;
  calories?: number | string | null;
  name?: string | null;
}): string {
  const label = String(unit?.label || '').trim();
  const unitName = String(unit?.unit || '').trim();
  const grams = amountToGrams(unit?.amount, unitName || 'גרם', unit?.name);
  const hasGramsInLabel = /גרם/.test(label);
  let main = label;

  if (!main) {
    main = formatQuantityWithGrams(unit?.amount, unitName, unit?.name);
  } else if (!hasGramsInLabel && grams > 0 && !isGramUnit(unitName) && normalizeIngredientUnit(unitName) !== 'מנה') {
    main = `${label} (${formatGramsNumber(grams)} גרם)`;
  } else if (!hasGramsInLabel && isGramUnit(unitName) && grams > 0 && !label.includes(String(unit?.amount ?? ''))) {
    main = `${label} (${formatGramsNumber(grams)} גרם)`;
  }

  const calories = unit?.calories;
  if (calories !== '' && calories != null) {
    return `${main} - ${calories} קק״ל`;
  }
  return main;
}
