export const DEFAULT_GROCERY_LIST_NAMES = ['קניות שבועיות', 'מוצרי בסיס', 'ירקן'];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const PREP_PHRASES = [
  'חתוך לקוביות', 'חתוכה לקוביות', 'חתוכים לקוביות', 'חתוכות לקוביות',
  'חתוך דק', 'חתוכה דק', 'חתוך גס', 'חתוכה גס',
  'קצוץ דק', 'קצוצה דק', 'קצוץ גס', 'קצוצים דק',
  'טחון דק', 'טחון גס', 'טחונה דק',
  'פרוס דק', 'פרוסה דק',
  'מבושל', 'מבושלת', 'מבושלים', 'מבושלות',
  'אפוי', 'אפויה', 'אפויים', 'אפויות',
  'קלוי', 'קלויה', 'קלויים', 'קלויות',
  'טחון', 'טחונה', 'טחונים', 'טחונות',
  'קצוץ', 'קצוצה', 'קצוצים', 'קצוצות',
  'מקולף', 'מקולפת', 'מקולפים', 'מקולפות',
  'פרוס', 'פרוסה', 'פרוסים', 'פרוסות',
  'מגורר', 'מגוררת', 'מגוררים',
  'שטוף', 'שטופה', 'שטופים',
  'מיובש', 'מיובשת', 'מיובשים',
  'קפוא', 'קפואה', 'קפואים', 'קפואות',
  'טרי', 'טריה', 'טרייה', 'טריים', 'טריות',
  'נקי', 'נקיה', 'נקייה', 'נקיים',
  'מטוגן', 'מטוגנת', 'מטוגנים',
  'מופשר', 'מופשרת', 'מופשרים',
  'מעוך', 'מעוכה',
  'מרוסק', 'מרוסקת',
  'שלם', 'שלמה', 'שלמים',
  'לפי הטעם', 'לפי הרצון',
  'כף שטוחה', 'כפית שטוחה',
  'אופציונלי', 'לא חובה',
];

const UNIT_ALIASES = {
  "ג'": 'גרם',
  ג: 'גרם',
  gram: 'גרם',
  grams: 'גרם',
  מל: 'מ"ל',
  'מ״ל': 'מ"ל',
  ml: 'מ"ל',
  'ק״ג': 'ק"ג',
  קג: 'ק"ג',
  kg: 'ק"ג',
  כף: 'כפות',
  כפיות: 'כפית',
  יח: 'יחידה',
  "יח'": 'יחידה',
  יחידות: 'יחידה',
  ליטרים: 'ליטר',
  כוסות: 'כוס',
};

const UNIT_FAMILIES = {
  גרם: { family: 'mass', toBase: 1, label: 'גרם' },
  'ק"ג': { family: 'mass', toBase: 1000, label: 'ק"ג' },
  'מ"ל': { family: 'volume', toBase: 1, label: 'מ"ל' },
  ליטר: { family: 'volume', toBase: 1000, label: 'ליטר' },
  כפות: { family: 'tbsp', toBase: 1, label: 'כפות' },
  כפית: { family: 'tsp', toBase: 1, label: 'כפית' },
  כוס: { family: 'cup', toBase: 1, label: 'כוס' },
  יחידה: { family: 'unit', toBase: 1, label: "יח'" },
  חופן: { family: 'handful', toBase: 1, label: 'חופן' },
  קורט: { family: 'pinch', toBase: 1, label: 'קורט' },
};

const DISPLAY_UNIT = {
  mass: [
    { unit: 'ק"ג', factor: 1000 },
    { unit: 'גרם', factor: 1 },
  ],
  volume: [
    { unit: 'ליטר', factor: 1000 },
    { unit: 'מ"ל', factor: 1 },
  ],
};

export function normalizeGroceryUnit(unit) {
  const raw = String(unit || '').trim();
  if (!raw) return '';
  return UNIT_ALIASES[raw] || UNIT_ALIASES[raw.toLowerCase()] || raw;
}

export function sanitizeGroceryName(name) {
  let next = String(name || '');
  next = next.replace(/\([^)]*\)/g, ' ');
  next = next.replace(/\[[^\]]*\]/g, ' ');
  PREP_PHRASES.forEach((phrase) => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`(?:^|[\\s,./\\-–—])${escaped}(?=$|[\\s,./\\-–—])`, 'gi'), ' ');
  });
  next = next
    .replace(/[|/\\]+/g, ' / ')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+\/\s+/g, ' / ')
    .replace(/^[\s/.\-–—]+|[\s/.\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return next;
}

export function normalizeItemName(name) {
  return sanitizeGroceryName(name)
    .toLowerCase()
    .replace(/[''`׳״"‘’“”]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scaleGroceryAmount(amount, multiplier) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  const scaled = value * (Number(multiplier) || 1);
  if (!Number.isFinite(scaled) || scaled <= 0) return null;
  return Math.round(scaled * 100) / 100;
}

export function formatQuantityValue(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '';
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

function toQuantityPart(amount, unit) {
  const value = Number(amount);
  const normalizedUnit = normalizeGroceryUnit(unit);
  if (!Number.isFinite(value) || value <= 0 || !normalizedUnit) return null;
  return { amount: Math.round(value * 100) / 100, unit: normalizedUnit };
}

export function mergeQuantities(parts) {
  const grouped = new Map();
  (parts || []).forEach((part) => {
    const next = toQuantityPart(part?.amount, part?.unit);
    if (!next) return;
    const meta = UNIT_FAMILIES[next.unit];
    const key = meta?.family || `raw:${next.unit}`;
    const current = grouped.get(key) || { amount: 0, unit: next.unit, family: meta?.family || null };
    const add = meta ? next.amount * meta.toBase : next.amount;
    const currentBase = meta && UNIT_FAMILIES[current.unit]
      ? current.amount * UNIT_FAMILIES[current.unit].toBase
      : current.amount;
    grouped.set(key, {
      amount: currentBase + add,
      unit: meta ? next.unit : current.unit,
      family: current.family,
    });
  });

  return [...grouped.values()].map((entry) => {
    const options = entry.family ? DISPLAY_UNIT[entry.family] : null;
    if (options) {
      const large = options.find((option) => option.factor > 1 && entry.amount >= option.factor);
      const chosen = large || options.find((option) => option.factor === 1) || options[options.length - 1];
      return {
        amount: Math.round((entry.amount / chosen.factor) * 100) / 100,
        unit: chosen.unit,
      };
    }
    return { amount: Math.round(entry.amount * 100) / 100, unit: entry.unit };
  }).filter((part) => part.amount > 0);
}

export function deriveQuantities(sourceRecipes, fallback = []) {
  const fromSources = (sourceRecipes || [])
    .map((source) => toQuantityPart(source?.amount, source?.unit))
    .filter(Boolean);
  if (fromSources.length) return mergeQuantities(fromSources);
  return mergeQuantities(fallback);
}

export function formatQuantityLabel(quantities) {
  const parts = mergeQuantities(quantities);
  if (!parts.length) return '';
  return parts.map((part) => {
    const meta = UNIT_FAMILIES[part.unit];
    const label = meta?.label || part.unit;
    return `${formatQuantityValue(part.amount)} ${label}`;
  }).join(' + ');
}

export function createList(name, sortOrder = 0) {
  const now = Date.now();
  return {
    id: uid(),
    name: String(name || '').trim() || 'רשימה חדשה',
    createdAt: now,
    updatedAt: now,
    sortOrder,
  };
}

export function createItem(listId, name, sourceRecipes = [], sortOrder = 0, quantities = []) {
  const now = Date.now();
  const sources = Array.isArray(sourceRecipes) ? sourceRecipes : [];
  return {
    id: uid(),
    listId,
    name: sanitizeGroceryName(name) || String(name || '').trim(),
    checked: false,
    sourceRecipes: sources,
    quantities: deriveQuantities(sources, quantities),
    createdAt: now,
    updatedAt: now,
    sortOrder,
  };
}

export function createDefaultGroceryState() {
  const lists = DEFAULT_GROCERY_LIST_NAMES.map((name, index) => createList(name, index));
  return {
    lists,
    items: [],
    activeListId: lists[0].id,
    lastUsedListId: lists[0].id,
  };
}

export function findMatchingItem(items, name, listId, exceptId = null) {
  const key = normalizeItemName(name);
  if (!key) return null;
  return items.find((item) => (
    item.listId === listId
    && item.id !== exceptId
    && normalizeItemName(item.name) === key
  )) || null;
}

function recipeSource(recipe, amount, unit) {
  return {
    id: String(recipe.id),
    title: recipe.title || 'מתכון',
    amount,
    unit,
    categories: Array.isArray(recipe.categories) ? recipe.categories : [],
  };
}

function withRecipeSource(item, recipe, amount, unit) {
  const sources = Array.isArray(item.sourceRecipes) ? item.sourceRecipes : [];
  const nextSource = recipeSource(recipe, amount, unit);
  const existingIndex = sources.findIndex((source) => String(source.id) === String(recipe.id));
  const nextSources = existingIndex >= 0
    ? sources.map((source, index) => {
      if (index !== existingIndex) return source;
      const merged = mergeQuantities([
        { amount: source.amount, unit: source.unit },
        { amount, unit },
      ]);
      const part = merged[0] || { amount, unit };
      return {
        ...source,
        title: recipe.title || source.title,
        categories: nextSource.categories.length ? nextSource.categories : source.categories,
        amount: merged.length === 1 ? part.amount : amount,
        unit: merged.length === 1 ? part.unit : unit,
      };
    })
    : [...sources, nextSource];

  return {
    ...item,
    checked: existingIndex >= 0 ? item.checked : false,
    sourceRecipes: nextSources,
    quantities: deriveQuantities(nextSources, item.quantities),
    updatedAt: Date.now(),
  };
}

export function addRecipeIngredientsToItems(items, listId, recipe, servings = 1) {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const baseServings = Number(recipe?.baseServings) || 1;
  const multiplier = Math.max(0.25, Number(servings) || 1) / Math.max(0.25, baseServings);
  let next = items.slice();
  let added = 0;
  let merged = 0;

  ingredients.forEach((ingredient) => {
    const name = sanitizeGroceryName(ingredient?.name);
    if (!name) return;
    const amount = scaleGroceryAmount(ingredient?.amount, multiplier);
    const unit = normalizeGroceryUnit(ingredient?.unit);
    const existing = findMatchingItem(next, name, listId);
    if (existing) {
      next = next.map((item) => (item.id === existing.id ? withRecipeSource(item, recipe, amount, unit) : item));
      merged += 1;
      return;
    }
    const source = recipeSource(recipe, amount, unit);
    next = [...next, createItem(listId, name, [source], next.length, [{ amount, unit }])];
    added += 1;
  });

  return { items: next, added, merged };
}

export function addManualItemToItems(items, listId, name) {
  const trimmed = sanitizeGroceryName(name) || String(name || '').trim();
  if (!trimmed) return { items, item: null, merged: false };
  const existing = findMatchingItem(items, trimmed, listId);
  if (existing) {
    const next = items.map((item) => (
      item.id === existing.id
        ? { ...item, checked: false, updatedAt: Date.now() }
        : item
    ));
    return { items: next, item: existing, merged: true };
  }
  const item = createItem(listId, trimmed, [], items.length);
  return { items: [...items, item], item, merged: false };
}

export function substituteItemName(items, itemId, nextName) {
  const current = items.find((item) => item.id === itemId);
  if (!current) return { items, merged: false };
  const cleaned = sanitizeGroceryName(nextName) || String(nextName || '').trim();
  if (!cleaned) return { items, merged: false };

  const other = findMatchingItem(items, cleaned, current.listId, itemId);
  if (!other) {
    return {
      items: items.map((item) => (
        item.id === itemId ? { ...item, name: cleaned, updatedAt: Date.now() } : item
      )),
      merged: false,
    };
  }

  const sourceRecipes = [
    ...(other.sourceRecipes || []),
    ...(current.sourceRecipes || []).filter((source) => (
      !(other.sourceRecipes || []).some((existing) => String(existing.id) === String(source.id))
    )),
  ];
  const mergedItem = {
    ...other,
    name: sanitizeGroceryName(other.name) || cleaned,
    checked: false,
    sourceRecipes,
    quantities: mergeQuantities([...(other.quantities || []), ...(current.quantities || [])]),
    updatedAt: Date.now(),
  };

  return {
    items: items.filter((item) => item.id !== itemId).map((item) => (item.id === other.id ? mergedItem : item)),
    merged: true,
  };
}

export function sortGroceryItems(items) {
  return items.slice().sort((a, b) => {
    if (!!a.checked !== !!b.checked) return a.checked ? 1 : -1;
    return (a.sortOrder - b.sortOrder) || (a.createdAt - b.createdAt);
  });
}

export function hydrateGroceryItem(item) {
  if (!item || typeof item !== 'object') return item;
  const sourceRecipes = Array.isArray(item.sourceRecipes) ? item.sourceRecipes : [];
  return {
    ...item,
    name: item.name || '',
    sourceRecipes,
    quantities: deriveQuantities(sourceRecipes, item.quantities),
  };
}
