export const DEFAULT_GROCERY_LIST_NAMES = ['קניות שבועיות', 'מוצרי בסיס', 'ירקן'];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const META_SOURCE_ID = '__meta';

/** Household essentials kept out of the primary shopping checklist by default. */
export const PANTRY_STAPLES = [
  // תבלינים ומלחים
  'מלח',
  'מלח גס',
  'פלפל שחור',
  'פפריקה',
  'פפריקה מתוקה',
  'פפריקה חריפה',
  'כמון',
  'כורכום',
  'אבקת שום',
  'שום גבישי',
  'אורגנו',
  'קינמון',
  'סודה לשתייה',
  'אבקת אפייה',
  'אבקת אפיה',
  'קורנפלור',
  'תמצית וניל',
  // שמנים ונוזלים בסיסיים
  'מים',
  'שמן קנולה',
  'שמן לטיגון',
  'שמן זית',
  'ספריי שמן',
  'שמן',
  'חומץ',
  'רוטב סויה',
  'סילאן',
  'דבש',
  'סוכר',
  // ביצים
  'ביצים',
  'ביצה',
  'ביצה לשימון',
  'ביצים לשימון',
  // מתכלים ועזרים
  'נייר אפייה',
  'נייר אלומיניום',
  'ניילון נצמד',
  'שקיות קוקי',
];

/** Shopping-friendly labels when promoting a staple into the active list. */
const STAPLE_SHOPPING_LABELS = [
  { match: ['ביצה', 'ביצים', 'ביצה לשימון', 'ביצים לשימון'], name: 'תבנית ביצים', amount: 1, unit: 'יחידה' },
  { match: ['שמן זית'], name: 'בקבוק שמן זית', amount: 1, unit: 'יחידה' },
  { match: ['שמן קנולה', 'שמן לטיגון', 'שמן', 'ספריי שמן'], name: 'בקבוק שמן', amount: 1, unit: 'יחידה' },
  { match: ['מלח', 'מלח גס'], name: 'מלח', amount: 1, unit: 'יחידה' },
  { match: ['פלפל שחור'], name: 'פלפל שחור', amount: 1, unit: 'יחידה' },
  { match: ['רוטב סויה'], name: 'בקבוק רוטב סויה', amount: 1, unit: 'יחידה' },
  { match: ['חומץ'], name: 'בקבוק חומץ', amount: 1, unit: 'יחידה' },
  { match: ['דבש', 'סילאן'], name: null, amount: 1, unit: 'יחידה' },
  { match: ['נייר אפייה', 'נייר אלומיניום', 'ניילון נצמד', 'שקיות קוקי'], name: null, amount: 1, unit: 'יחידה' },
];

export const GROCERY_AISLES = [
  { id: 'produce', label: 'ירקות ופירות' },
  { id: 'meat', label: 'קצביה, בשר ודגים' },
  { id: 'dairy', label: 'מקרר ומוצרי חלב' },
  { id: 'pantry', label: 'יבשים, מזווה ומאפים' },
  { id: 'snacks', label: 'תוספים וחטיפים' },
];

const AISLE_KEYWORDS = {
  produce: [
    'עגבניה', 'עגבנייה', 'עגבניות', 'עגבניות שרי', 'עגבניית שרי',
    'מלפפון', 'מלפפונים',
    'בצל', 'בצלים', 'בצל סגול', 'בצל ירוק',
    'שום', 'ראש שום', 'שיני שום', 'שן שום',
    'גזר', 'גזרים',
    'חסה', 'עלי בייבי', 'עלים ירוקים', 'ירוקים', 'תרד', 'רוקט', 'קייל', 'מנגולד',
    'לימון', 'לימונים', 'ליים',
    'קישוא', 'קישואים',
    'תפוח אדמה', 'תפוחי אדמה', 'בטטה', 'בטטות',
    'חציל', 'חצילים', 'כרובית', 'ברוקולי', 'כרוב',
    'פטרוזיליה', 'כוסברה', 'שמיר', 'בזיליקום', 'נענע', 'עשבי תיבול',
    'פלפל אדום', 'פלפל ירוק', 'פלפל צהוב', 'פלפל חריף', 'פלפלים',
    'תפוח', 'תפוחים', 'בננה', 'בננות', 'תות', 'תותים', 'מנגו', 'אבוקדו',
    'פטריות', 'תירס', 'אפונה', 'שעועית ירוקה', 'אדממה',
    'פירות יער', 'אוכמני', 'אפרסק', 'אגס', 'אננס', 'אבטיח', 'מלון', 'רימון',
    'סלרי', 'כרישה', 'קולורבי', 'דלעת', 'דלורית', 'ירק', 'פירות',
  ],
  meat: [
    'עוף', 'חזה עוף', 'שוקי', 'פרגית', 'פרגיות', 'שניצל', 'הודו',
    'בקר', 'בשר', 'טחון', 'בשר טחון', 'סטייק', 'כבש',
    'דג', 'דגים', 'סלמון', 'טונה', 'פילה', 'שרימפ', 'פירות ים',
    'נקניק', 'בייקון', 'פסטרמה',
  ],
  dairy: [
    'חלב', 'יוגורט', 'גבינה', 'גבינות', 'קוטג', 'קוטג׳',
    'שמנת', 'חמאה', 'ביצה', 'ביצים', 'תבנית ביצים',
    'מוצרלה', 'פטה', 'צ׳דר', 'צדר', 'מסקרפונה', 'ריקוטה', 'לבנה', 'סקיר', 'קפיר', 'קרם',
  ],
  snacks: [
    'אבקת חלבון', 'חלבון', 'פרוטאין', 'חטיף', 'חטיפים', 'גרנולה',
    'שוקולד', 'קקאו', 'וופל', 'ביסקוויט',
    'חמוציות', 'צימוקים', 'תוסף', 'ויטמין', 'קריאטין', 'בר חלבון',
  ],
  pantry: [
    'אורז', 'פסטה', 'מקרוני', 'קוסקוס', 'קינואה', 'שיבולת', 'קוואקר', 'קמח',
    'לחם', 'פירורי לחם', 'פיתה', 'טורטי', 'מחמצת',
    'שימורים', 'קופסאות שימורים', 'רוטב', 'קטשופ', 'מיונז', 'חרדל', 'חומוס',
    'טחינה', 'שעועית', 'עדשים', 'גרגירי', 'חומוס יבש', 'סויה', 'טופו',
    'צנובר', 'צנוברים', 'אגוז', 'אגוזים', 'שקדים', 'קשיו', 'בוטנים', 'גרעינים',
    'חמאת בוטנים', 'חמאת שקדים',
    'אבקת', 'תבלין', 'פפריקה', 'כמון', 'כורכום', 'אורגנו', 'קינמון',
    'דבש', 'סילאן', 'סירופ', 'חומץ', 'רוטב סויה',
    'שמרים', 'אבקת אפיה', 'אבקת אפייה', 'סודה לשתייה', 'קורנפלור', 'תמצית וניל',
    'בקבוק שמן', 'בקבוק שמן זית', 'שמן זית', 'שמן קנולה', 'שמן לטיגון',
    'פודינג', 'ג׳לי', 'גלידה', 'קרח',
  ],
};

/** Produce items sold as whole units — convert grams → medium-size counts. */
const PRODUCE_UNIT_WEIGHTS = [
  { keys: ['מלפפון', 'מלפפונים'], grams: 90 },
  { keys: ['עגבניה', 'עגבנייה', 'עגבניות'], grams: 135 },
  { keys: ['בצל', 'בצלים', 'בצל סגול'], grams: 150 },
  { keys: ['לימון', 'לימונים'], grams: 100 },
  { keys: ['תפוח אדמה', 'תפוחי אדמה'], grams: 175 },
  { keys: ['גזר', 'גזרים'], grams: 80 },
  { keys: ['קישוא', 'קישואים'], grams: 150 },
  { keys: ['בטטה', 'בטטות'], grams: 200 },
  { keys: ['אבוקדו'], grams: 150 },
];

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
  'לשימון', 'להברשה',
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
  "יח' בינונית": { family: 'medium_unit', toBase: 1, label: "יח' בינונית" },
  "יח' בינוניות": { family: 'medium_unit', toBase: 1, label: "יח' בינוניות" },
  'שיני שום': { family: 'garlic_clove', toBase: 1, label: 'שיני שום' },
  'ראש שום': { family: 'garlic_head', toBase: 1, label: 'ראש שום' },
  'תבנית ביצים': { family: 'egg_carton', toBase: 1, label: 'תבנית ביצים' },
  חופן: { family: 'handful', toBase: 1, label: 'חופן' },
  קורט: { family: 'pinch', toBase: 1, label: 'קורט' },
};

export const UNIT_LIST = Object.keys(UNIT_FAMILIES);

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

const WHOLE_UNIT_FAMILIES = new Set([
  'unit', 'medium_unit', 'garlic_clove', 'garlic_head', 'egg_carton', 'handful', 'pinch', 'tbsp', 'tsp', 'cup',
]);

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

function hasWordSequence(haystackWords, needleWords) {
  if (!haystackWords.length || !needleWords.length || needleWords.length > haystackWords.length) return false;
  return haystackWords.some((_, index) => needleWords.every((word, offset) => haystackWords[index + offset] === word));
}

function nameMatchesKeyword(normalizedName, keyword) {
  const key = normalizeItemName(keyword);
  if (!key || !normalizedName) return false;
  if (normalizedName === key) return true;

  const nameWords = normalizedName.split(' ').filter(Boolean);
  const keyWords = key.split(' ').filter(Boolean);

  if (hasWordSequence(nameWords, keyWords)) return true;

  // Stem match for single-token Hebrew keywords (עגבני → עגבניות) without over-matching short stems.
  if (keyWords.length === 1 && nameWords.some((word) => {
    if (word === key) return true;
    if (key.length >= 4 && word.startsWith(key)) return true;
    if (word.length >= 4 && key.startsWith(word)) return true;
    return false;
  })) return true;

  return false;
}

function findBestKeywordMatch(normalizedName, keywords) {
  let best = null;
  keywords.forEach((keyword) => {
    if (!nameMatchesKeyword(normalizedName, keyword)) return;
    const key = normalizeItemName(keyword);
    if (!best || key.length > best.length) best = key;
  });
  return best;
}

/** True for pantry staples (spices, oils, eggs, consumables). */
export function isPantryStaple(name) {
  const key = normalizeItemName(name);
  if (!key) return false;

  // Garlic powder / granulated garlic are staples; fresh garlic cloves are produce.
  if (key.includes('אבקת שום') || key.includes('שום גבישי')) return true;
  if (isGarlicCloveName(key) || key === 'שום' || key.startsWith('שום ') || key.includes(' ראש שום')) {
    return false;
  }

  for (const staple of PANTRY_STAPLES) {
    const stapleKey = normalizeItemName(staple);
    if (!stapleKey) continue;
    if (key === stapleKey) return true;
    if (key.startsWith(`${stapleKey} `)) return true;
    if (stapleKey.length >= 4 && nameMatchesKeyword(key, staple)) return true;
  }
  return false;
}

function isGarlicCloveName(nameOrKey) {
  const key = normalizeItemName(nameOrKey);
  return key.includes('שיני שום') || key.includes('שן שום') || key === 'שיני שום' || key === 'שן שום';
}

function isEggName(nameOrKey) {
  const key = normalizeItemName(nameOrKey);
  if (!key) return false;
  if (key.includes('תבנית ביצ')) return true;
  return key === 'ביצה' || key === 'ביצים'
    || key.startsWith('ביצה ') || key.startsWith('ביצים ')
    || key.includes(' ביצה') || key.includes(' ביצים');
}

function findProduceWeight(name) {
  const key = normalizeItemName(name);
  if (!key) return null;
  // Prefer longer key matches (בצל סגול over בצל).
  let best = null;
  PRODUCE_UNIT_WEIGHTS.forEach((entry) => {
    entry.keys.forEach((candidate) => {
      const candidateKey = normalizeItemName(candidate);
      if (!nameMatchesKeyword(key, candidate)) return;
      if (!best || candidateKey.length > best.keyLength) {
        best = { grams: entry.grams, keyLength: candidateKey.length };
      }
    });
  });
  return best?.grams || null;
}

export function getItemAisleId(name) {
  const key = normalizeItemName(name);
  if (!key) return 'pantry';

  // Spiced / powdered garlic belongs in dry goods, not produce.
  if (key.includes('אבקת שום') || key.includes('שום גבישי')) return 'pantry';

  const scored = ['produce', 'meat', 'dairy', 'snacks', 'pantry']
    .map((aisleId) => {
      const match = findBestKeywordMatch(key, AISLE_KEYWORDS[aisleId] || []);
      return match ? { aisleId, score: match.length } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.aisleId || 'pantry';
}

export function groupItemsByAisle(items) {
  const buckets = new Map(GROCERY_AISLES.map((aisle) => [aisle.id, []]));
  (items || []).forEach((item) => {
    if (item?.pantryDrawer) return;
    const aisleId = getItemAisleId(item?.name);
    const bucket = buckets.get(aisleId) || buckets.get('pantry');
    bucket.push(item);
  });
  return GROCERY_AISLES
    .map((aisle) => ({
      ...aisle,
      items: sortGroceryItems(buckets.get(aisle.id) || []),
    }))
    .filter((group) => group.items.length > 0);
}

export function getPantryDrawerItems(items) {
  return sortGroceryItems((items || []).filter((item) => item?.pantryDrawer));
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

function ceilWhole(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(1, Math.ceil(value - 1e-9));
}

function mediumUnitLabel(count) {
  return count === 1 ? "יח' בינונית" : "יח' בינוניות";
}

function toQuantityPart(amount, unit) {
  const value = Number(amount);
  const normalizedUnit = normalizeGroceryUnit(unit);
  if (!Number.isFinite(value) || value <= 0 || !normalizedUnit) return null;
  return { amount: Math.round(value * 100) / 100, unit: normalizedUnit };
}

function gramsFromPart(part) {
  const unit = normalizeGroceryUnit(part?.unit);
  const amount = Number(part?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (unit === 'גרם') return amount;
  if (unit === 'ק"ג') return amount * 1000;
  return null;
}

/**
 * Convert recipe quantities into sensible supermarket buying units.
 * - Whole produce in grams → medium-size counts
 * - Eggs → whole counts / cartons (never fractions)
 * - Garlic cloves → clove/head counts
 * - Other countable / spoon units → rounded up (no 0.25 ביצה)
 */
export function toShoppingQuantities(name, quantities) {
  const parts = mergeQuantities(quantities);
  if (!parts.length) return [];

  if (isEggName(name)) {
    let eggs = 0;
    parts.forEach((part) => {
      const unit = normalizeGroceryUnit(part.unit);
      const meta = UNIT_FAMILIES[unit];
      if (unit === 'תבנית ביצים' || meta?.family === 'egg_carton') {
        eggs += (Number(part.amount) || 0) * 12;
      } else {
        eggs += Number(part.amount) || 0;
      }
    });
    const whole = ceilWhole(eggs);
    if (!whole) return [];
    if (whole >= 6) {
      return [{ amount: Math.max(1, Math.ceil(whole / 12)), unit: 'תבנית ביצים' }];
    }
    return [{ amount: whole, unit: 'יחידה' }];
  }

  if (isGarlicCloveName(name) || normalizeItemName(name) === 'שום') {
    let cloves = 0;
    let usedCloveUnits = false;
    parts.forEach((part) => {
      const unit = normalizeGroceryUnit(part.unit);
      const meta = UNIT_FAMILIES[unit];
      if (meta?.family === 'garlic_head' || unit === 'ראש שום') {
        cloves += (Number(part.amount) || 0) * 10;
        usedCloveUnits = true;
      } else if (meta?.family === 'garlic_clove' || unit === 'שיני שום' || meta?.family === 'unit' || unit === 'יחידה') {
        cloves += Number(part.amount) || 0;
        usedCloveUnits = true;
      } else {
        const grams = gramsFromPart(part);
        if (grams != null) {
          cloves += grams / 5;
          usedCloveUnits = true;
        }
      }
    });
    if (usedCloveUnits) {
      const whole = ceilWhole(cloves);
      if (!whole) return [];
      if (whole >= 8) {
        return [{ amount: Math.max(1, Math.round(whole / 10) || 1), unit: 'ראש שום' }];
      }
      return [{ amount: whole, unit: 'שיני שום' }];
    }
  }

  const gramsPerUnit = findProduceWeight(name);
  if (gramsPerUnit) {
    let totalGrams = 0;
    let totalUnits = 0;
    let hasMass = false;
    let hasUnits = false;
    parts.forEach((part) => {
      const grams = gramsFromPart(part);
      if (grams != null) {
        totalGrams += grams;
        hasMass = true;
        return;
      }
      const unit = normalizeGroceryUnit(part.unit);
      const meta = UNIT_FAMILIES[unit];
      if (meta?.family === 'unit' || meta?.family === 'medium_unit' || unit === 'יחידה') {
        totalUnits += Number(part.amount) || 0;
        hasUnits = true;
      }
    });
    if (hasMass || hasUnits) {
      const fromGrams = hasMass ? totalGrams / gramsPerUnit : 0;
      const count = ceilWhole(fromGrams + totalUnits);
      if (!count) return [];
      return [{ amount: count, unit: mediumUnitLabel(count) }];
    }
  }

  return parts.map((part) => {
    const unit = normalizeGroceryUnit(part.unit);
    const meta = UNIT_FAMILIES[unit];
    if (meta && WHOLE_UNIT_FAMILIES.has(meta.family)) {
      const whole = ceilWhole(part.amount);
      if (!whole) return null;
      return { amount: whole, unit };
    }
    return { amount: Math.round(part.amount * 100) / 100, unit };
  }).filter(Boolean);
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

export function deriveQuantities(sourceRecipes, fallback = [], name = '') {
  const fromSources = (sourceRecipes || [])
    .filter((source) => source?.id !== META_SOURCE_ID)
    .map((source) => toQuantityPart(source?.amount, source?.unit))
    .filter(Boolean);
  const merged = fromSources.length ? mergeQuantities(fromSources) : mergeQuantities(fallback);
  return name ? toShoppingQuantities(name, merged) : merged;
}

export function formatQuantityLabel(quantities) {
  const parts = mergeQuantities(quantities);
  if (!parts.length) return '';
  return parts.map((part) => {
    const meta = UNIT_FAMILIES[part.unit];
    const label = meta?.label || part.unit;
    // Unit labels that already include the noun (שיני שום / תבנית ביצים) skip a bare number+unit look.
    if (part.unit === 'שיני שום' || part.unit === 'ראש שום' || part.unit === 'תבנית ביצים') {
      return `${formatQuantityValue(part.amount)} ${label}`;
    }
    if (part.unit === "יח' בינונית" || part.unit === "יח' בינוניות") {
      return `${formatQuantityValue(part.amount)} ${label}`;
    }
    return `${formatQuantityValue(part.amount)} ${label}`;
  }).join(' + ');
}

function stripMetaSources(sourceRecipes) {
  return (Array.isArray(sourceRecipes) ? sourceRecipes : []).filter((source) => source?.id !== META_SOURCE_ID);
}

function withItemMeta(item) {
  const sources = stripMetaSources(item.sourceRecipes);
  if (item.pantryDrawer || item.isStaple) {
    sources.push({
      id: META_SOURCE_ID,
      title: '',
      pantryDrawer: !!item.pantryDrawer,
      isStaple: !!item.isStaple,
      amount: null,
      unit: '',
      categories: [],
    });
  }
  return { ...item, sourceRecipes: sources };
}

export function extractItemMeta(sourceRecipes) {
  const meta = (Array.isArray(sourceRecipes) ? sourceRecipes : []).find((source) => source?.id === META_SOURCE_ID);
  return {
    pantryDrawer: !!meta?.pantryDrawer,
    isStaple: !!meta?.isStaple,
  };
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

export function createItem(listId, name, sourceRecipes = [], sortOrder = 0, quantities = [], flags = {}) {
  const now = Date.now();
  const sources = stripMetaSources(sourceRecipes);
  const cleanedName = sanitizeGroceryName(name) || String(name || '').trim();
  return {
    id: uid(),
    listId,
    name: cleanedName,
    checked: false,
    sourceRecipes: sources,
    quantities: deriveQuantities(sources, quantities, cleanedName),
    pantryDrawer: !!flags.pantryDrawer,
    isStaple: !!flags.isStaple,
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

export function findMatchingItem(items, name, listId, exceptId = null, { pantryDrawer } = {}) {
  const key = normalizeItemName(name);
  if (!key) return null;
  return items.find((item) => (
    item.listId === listId
    && item.id !== exceptId
    && normalizeItemName(item.name) === key
    && (pantryDrawer === undefined || !!item.pantryDrawer === !!pantryDrawer)
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
  const sources = stripMetaSources(item.sourceRecipes);
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
    quantities: deriveQuantities(nextSources, item.quantities, item.name),
    updatedAt: Date.now(),
  };
}

function getStapleShoppingLabel(name) {
  const key = normalizeItemName(name);
  for (const entry of STAPLE_SHOPPING_LABELS) {
    if (entry.match.some((candidate) => nameMatchesKeyword(key, candidate) || key === normalizeItemName(candidate))) {
      return {
        name: entry.name || sanitizeGroceryName(name) || name,
        amount: entry.amount,
        unit: entry.unit,
      };
    }
  }
  return {
    name: sanitizeGroceryName(name) || name,
    amount: 1,
    unit: 'יחידה',
  };
}

export function promotePantryStaple(items, itemId) {
  const current = items.find((item) => item.id === itemId);
  if (!current || !current.pantryDrawer) return { items, item: null };

  const shopping = getStapleShoppingLabel(current.name);
  const existing = findMatchingItem(items, shopping.name, current.listId, itemId, { pantryDrawer: false });

  if (existing) {
    const mergedSources = [
      ...stripMetaSources(existing.sourceRecipes),
      ...stripMetaSources(current.sourceRecipes).filter((source) => (
        !stripMetaSources(existing.sourceRecipes).some((row) => String(row.id) === String(source.id))
      )),
    ];
    const merged = {
      ...existing,
      checked: false,
      isStaple: true,
      pantryDrawer: false,
      sourceRecipes: mergedSources,
      quantities: toShoppingQuantities(shopping.name, [
        ...(existing.quantities || []),
        { amount: shopping.amount, unit: shopping.unit },
      ]),
      updatedAt: Date.now(),
    };
    return {
      items: items.filter((item) => item.id !== itemId).map((item) => (item.id === existing.id ? merged : item)),
      item: merged,
    };
  }

  const promoted = {
    ...current,
    name: shopping.name,
    pantryDrawer: false,
    isStaple: true,
    checked: false,
    quantities: [{ amount: shopping.amount, unit: shopping.unit }],
    sourceRecipes: stripMetaSources(current.sourceRecipes),
    updatedAt: Date.now(),
  };
  return {
    items: items.map((item) => (item.id === itemId ? promoted : item)),
    item: promoted,
  };
}

export function demotePantryStaple(items, itemId) {
  const current = items.find((item) => item.id === itemId);
  if (!current) return { items, item: null, demoted: false };

  if (!current.isStaple && !isPantryStaple(current.name)) {
    return {
      items: items.filter((item) => item.id !== itemId),
      item: null,
      demoted: false,
    };
  }

  // Restore a friendly staple name (e.g. תבנית ביצים → ביצים).
  let restoredName = current.name;
  if (normalizeItemName(current.name).includes('תבנית ביצ')) restoredName = 'ביצים';
  if (normalizeItemName(current.name).includes('בקבוק שמן זית')) restoredName = 'שמן זית';
  if (normalizeItemName(current.name) === 'בקבוק שמן') restoredName = 'שמן';
  if (normalizeItemName(current.name).includes('בקבוק רוטב סויה')) restoredName = 'רוטב סויה';
  if (normalizeItemName(current.name).includes('בקבוק חומץ')) restoredName = 'חומץ';

  const existing = findMatchingItem(items, restoredName, current.listId, itemId, { pantryDrawer: true });
  if (existing) {
    const mergedSources = [
      ...stripMetaSources(existing.sourceRecipes),
      ...stripMetaSources(current.sourceRecipes).filter((source) => (
        !stripMetaSources(existing.sourceRecipes).some((row) => String(row.id) === String(source.id))
      )),
    ];
    const merged = {
      ...existing,
      isStaple: true,
      pantryDrawer: true,
      checked: false,
      sourceRecipes: mergedSources,
      quantities: deriveQuantities(mergedSources, existing.quantities, restoredName),
      updatedAt: Date.now(),
    };
    return {
      items: items.filter((item) => item.id !== itemId).map((item) => (item.id === existing.id ? merged : item)),
      item: merged,
      demoted: true,
    };
  }

  const demoted = {
    ...current,
    name: restoredName,
    pantryDrawer: true,
    isStaple: true,
    checked: false,
    quantities: deriveQuantities(current.sourceRecipes, current.quantities, restoredName),
    sourceRecipes: stripMetaSources(current.sourceRecipes),
    updatedAt: Date.now(),
  };
  return {
    items: items.map((item) => (item.id === itemId ? demoted : item)),
    item: demoted,
    demoted: true,
  };
}

export function addRecipeIngredientsToItems(items, listId, recipe, servings = 1) {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const baseServings = Number(recipe?.baseServings) || 1;
  const multiplier = Math.max(0.25, Number(servings) || 1) / Math.max(0.25, baseServings);
  let next = items.slice();
  let added = 0;
  let merged = 0;
  let stapled = 0;

  ingredients.forEach((ingredient) => {
    const name = sanitizeGroceryName(ingredient?.name);
    if (!name) return;
    const amount = scaleGroceryAmount(ingredient?.amount, multiplier);
    const unit = normalizeGroceryUnit(ingredient?.unit);
    const staple = isPantryStaple(name) || isPantryStaple(ingredient?.name);

    if (staple) {
      const existingDrawer = findMatchingItem(next, name, listId, null, { pantryDrawer: true });
      const existingMain = findMatchingItem(next, name, listId, null, { pantryDrawer: false });
      // Already promoted to the main list — merge there.
      if (existingMain && !existingMain.pantryDrawer) {
        next = next.map((item) => (item.id === existingMain.id ? withRecipeSource(item, recipe, amount, unit) : item));
        merged += 1;
        return;
      }
      if (existingDrawer) {
        next = next.map((item) => (item.id === existingDrawer.id
          ? { ...withRecipeSource(item, recipe, amount, unit), pantryDrawer: true, isStaple: true }
          : item));
        merged += 1;
        stapled += 1;
        return;
      }
      const source = recipeSource(recipe, amount, unit);
      next = [...next, createItem(listId, name, [source], next.length, [{ amount, unit }], { pantryDrawer: true, isStaple: true })];
      added += 1;
      stapled += 1;
      return;
    }

    const existing = findMatchingItem(next, name, listId, null, { pantryDrawer: false });
    if (existing) {
      next = next.map((item) => (item.id === existing.id ? withRecipeSource(item, recipe, amount, unit) : item));
      merged += 1;
      return;
    }
    const source = recipeSource(recipe, amount, unit);
    next = [...next, createItem(listId, name, [source], next.length, [{ amount, unit }])];
    added += 1;
  });

  return { items: next, added, merged, skipped: stapled, stapled };
}

export function setItemQuantity(items, itemId, amount, unit) {
  const part = toQuantityPart(amount, unit);
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const sources = stripMetaSources(item.sourceRecipes);
    const nextSources = sources.length
      ? sources.map((source, index) => (
        index === 0
          ? { ...source, amount: part?.amount ?? null, unit: part?.unit || '' }
          : { ...source, amount: null, unit: '' }
      ))
      : (part
        ? [{ id: 'manual', title: 'עריכה ידנית', amount: part.amount, unit: part.unit, categories: [] }]
        : []);
    return {
      ...item,
      sourceRecipes: nextSources,
      quantities: deriveQuantities(nextSources, part ? [part] : [], item.name),
      updatedAt: Date.now(),
    };
  });
}

export function addManualItemToItems(items, listId, name) {
  const trimmed = sanitizeGroceryName(name) || String(name || '').trim();
  if (!trimmed) return { items, item: null, merged: false };
  const existing = findMatchingItem(items, trimmed, listId, null, { pantryDrawer: false });
  if (existing) {
    const next = items.map((item) => (
      item.id === existing.id
        ? { ...item, checked: false, pantryDrawer: false, updatedAt: Date.now() }
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

  const other = findMatchingItem(items, cleaned, current.listId, itemId, { pantryDrawer: !!current.pantryDrawer });
  if (!other) {
    return {
      items: items.map((item) => (
        item.id === itemId
          ? {
            ...item,
            name: cleaned,
            quantities: toShoppingQuantities(cleaned, item.quantities),
            updatedAt: Date.now(),
          }
          : item
      )),
      merged: false,
    };
  }

  const sourceRecipes = [
    ...stripMetaSources(other.sourceRecipes),
    ...stripMetaSources(current.sourceRecipes).filter((source) => (
      !stripMetaSources(other.sourceRecipes).some((existing) => String(existing.id) === String(source.id))
    )),
  ];
  const mergedItem = {
    ...other,
    name: sanitizeGroceryName(other.name) || cleaned,
    checked: false,
    sourceRecipes,
    quantities: toShoppingQuantities(
      sanitizeGroceryName(other.name) || cleaned,
      [...(other.quantities || []), ...(current.quantities || [])],
    ),
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
  const rawSources = Array.isArray(item.sourceRecipes) ? item.sourceRecipes : [];
  const meta = extractItemMeta(rawSources);
  const sourceRecipes = stripMetaSources(rawSources);
  const pantryDrawer = item.pantryDrawer != null ? !!item.pantryDrawer : meta.pantryDrawer;
  const isStaple = item.isStaple != null ? !!item.isStaple : meta.isStaple;
  const name = item.name || '';
  return {
    ...item,
    name,
    sourceRecipes,
    pantryDrawer,
    isStaple,
    quantities: deriveQuantities(sourceRecipes, item.quantities, name),
  };
}

/** Prepare an item for persistence (embeds pantry flags into sourceRecipes for cloud sync). */
export function serializeGroceryItem(item) {
  if (!item || typeof item !== 'object') return item;
  const hydrated = hydrateGroceryItem(item);
  return withItemMeta(hydrated);
}
