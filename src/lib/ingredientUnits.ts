/** Verified kitchen units only. Produce piece weights come from israeli_foods. */

import {
  findIsraeliFood,
  resolvePortionGrams,
} from '@/lib/food-portions';

export const RECIPE_UNIT_LIST = [
  'גרם',
  'מ"ל',
  'כף',
  'כפית',
  'כוס',
  'ק"ג',
  'ליטר',
  'כפות',
  'כף שטוחה',
  'סקופ',
  'יחידה',
  'יחידות',
  'פרוסה',
  'גביע',
  'חצי גביע',
] as const;

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
  כפות: 'כף',
  כפיות: 'כפית',
  כוסות: 'כוס',
  יחידות: 'יחידה',
  יח: 'יחידה',
  "יח'": 'יחידה',
  ליטרים: 'ליטר',
  'שיני שום': 'שן שום',
};

/** Household kitchen dictionary used for conversions and UI copy. */
export const HOUSEHOLD_UNIT_GRAMS = {
  כף: 15,
  כפות: 15,
  כפית: 5,
  כוס: 240,
} as const;

/** Grams represented by one of this verified unit (never a produce guess). */
const UNIT_GRAMS: Record<string, number> = {
  גרם: 1,
  '100 גרם': 100,
  'ק"ג': 1000,
  'מ"ל': 1,
  ליטר: 1000,
  כוס: HOUSEHOLD_UNIT_GRAMS['כוס'],
  כף: HOUSEHOLD_UNIT_GRAMS['כף'],
  כפות: HOUSEHOLD_UNIT_GRAMS['כפות'],
  כפית: HOUSEHOLD_UNIT_GRAMS['כפית'],
};

const PIECE_LIKE = /יחידה|מנה|פרוסה|גביע|שן|ראש|שרי|סלסלה|חלמון|חלבון|גבעול/;

const DENSITY_OVERRIDES: { keys: string[]; units: Record<string, number> }[] = [
  { keys: ['קורנפלור', 'עמילן תירס'], units: { כפות: 12, כף: 12 } },
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

function pieceOverrideGrams(unitWeightGrams?: number | string | null): number {
  const n = Number(unitWeightGrams);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Catalog piece weight only — never a hardcoded unknown fallback.
 * Returns 0 when the food has no defined unit weight.
 */
export function getPieceWeightGrams(name: string | null | undefined): number {
  const food = findIsraeliFood(name);
  if (!food) return 0;
  const preferred = food.portions.find((portion) => (
    portion.label === food.defaultUnit || portion.unit === food.defaultUnit
  ));
  const piece = preferred || food.portions.find((portion) => portion.kind === 'piece' && Number(portion.grams) > 0);
  return Number(piece?.grams) > 0 ? Number(piece.grams) : 0;
}

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

export function getUnitWeight(
  unit: string | null | undefined,
  ingredientName?: string | null,
  unitWeightGrams?: number | string | null,
): number {
  const override = getDensityOverride(String(unit || ''), ingredientName);
  if (override) return override;

  const rawUnit = String(unit || '').trim();
  const normalized = normalizeIngredientUnit(unit);
  const customPiece = pieceOverrideGrams(unitWeightGrams);
  const catalog = resolvePortionGrams(ingredientName, rawUnit, unitWeightGrams)
    || resolvePortionGrams(ingredientName, normalized, unitWeightGrams);

  if (catalog > 0) return catalog;
  if (customPiece > 0 && PIECE_LIKE.test(rawUnit || normalized)) return customPiece;

  const fixed = UNIT_GRAMS[normalized] ?? UNIT_GRAMS[rawUnit];
  if (typeof fixed === 'number' && fixed > 0) return fixed;

  if (normalized === 'כף שטוחה') {
    const foodGrams = resolvePortionGrams(ingredientName, 'כף שטוחה', unitWeightGrams);
    return foodGrams > 0 ? foodGrams : 0;
  }

  return 0;
}

export function amountToGrams(
  amount: number | string | null | undefined,
  unit: string | null | undefined,
  name?: string | null,
  unitWeightGrams?: number | string | null,
): number {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const weight = getUnitWeight(unit, name, unitWeightGrams);
  if (!(weight > 0)) return 0;
  return value * weight;
}

export function convertAmountOnUnitChange(
  amount: number | string | null | undefined,
  oldUnit: string | null | undefined,
  newUnit: string | null | undefined,
  ingredientName?: string | null,
  unitWeightGrams?: number | string | null,
  nextUnitWeightGrams?: number | string | null,
): number {
  const nextUnit = normalizeIngredientUnit(newUnit);
  const prevUnit = normalizeIngredientUnit(oldUnit);
  const current = Number(amount);
  const safeAmount = Number.isFinite(current) ? current : 0;

  if (prevUnit === nextUnit && String(oldUnit || '') === String(newUnit || '')) {
    return roundTo1(safeAmount);
  }

  const oldWeight = getUnitWeight(oldUnit, ingredientName, unitWeightGrams);
  const newWeight = getUnitWeight(newUnit, ingredientName, nextUnitWeightGrams ?? unitWeightGrams);
  if (!(oldWeight > 0) || !(newWeight > 0)) return roundTo1(safeAmount);

  return Math.round(((safeAmount * oldWeight) / newWeight) * 100) / 100;
}

export type ConvertibleIngredient = {
  amount?: number | string | null;
  unit?: string | null;
  name?: string | null;
  unitWeightGrams?: number | string | null;
  [key: string]: unknown;
};

export function convertIngredientUnit<T extends ConvertibleIngredient>(
  ingredient: T,
  newUnit: string,
  nextUnitWeightGrams?: number | string | null,
): T {
  const nextWeight = nextUnitWeightGrams ?? ingredient.unitWeightGrams;
  return {
    ...ingredient,
    amount: convertAmountOnUnitChange(
      ingredient.amount,
      ingredient.unit,
      newUnit,
      ingredient.name,
      ingredient.unitWeightGrams,
      nextWeight,
    ),
    unit: newUnit,
    ...(nextWeight != null ? { unitWeightGrams: nextWeight } : {}),
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
  unitWeightGrams?: number | string | null,
): string {
  const value = Number(amount);
  const qty = Number.isFinite(value)
    ? (Number.isInteger(roundTo1(value)) ? String(roundTo1(value)) : String(roundTo1(value)))
    : String(amount ?? '');
  const unitLabel = String(unit || '').trim();
  if (!unitLabel) return qty;

  if (isGramUnit(unitLabel) && getUnitWeight(unitLabel, ingredientName, unitWeightGrams) === 1) {
    return `${qty} ${unitLabel}`;
  }

  const grams = amountToGrams(amount, unitLabel, ingredientName, unitWeightGrams);
  if (!(grams > 0)) return `${qty} ${unitLabel}`;
  if (isGramUnit(unitLabel) && Math.abs(grams - Number(value)) < 0.05) return `${qty} ${unitLabel}`;
  return `${qty} ${unitLabel} (${formatGramsNumber(grams)} גרם)`;
}

export function formatServingUnitLabel(unit: {
  label?: string | null;
  amount?: number | string | null;
  unit?: string | null;
  calories?: number | string | null;
  name?: string | null;
  unitWeightGrams?: number | string | null;
}): string {
  const label = String(unit?.label || '').trim();
  const unitName = String(unit?.unit || '').trim();
  const grams = amountToGrams(unit?.amount, unitName || 'גרם', unit?.name, unit?.unitWeightGrams);
  const hasGramsInLabel = /גרם/.test(label);
  let main = label;

  if (!main) {
    main = formatQuantityWithGrams(unit?.amount, unitName, unit?.name, unit?.unitWeightGrams);
  } else if (!hasGramsInLabel && grams > 0 && !isGramUnit(unitName)) {
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
