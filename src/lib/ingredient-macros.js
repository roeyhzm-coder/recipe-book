import { PANTRY_NAMES, PANTRY_NUTRITION, macrosAt } from '@/data/pantry-ingredients';

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function emptyMacros() {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/["״'`]/g, '')
    .replace(/[()[\]{},./\\|_+\-–—:*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNIT_TO_GRAMS = {
  גרם: 1,
  "ג'": 1,
  'ק"ג': 1000,
  'ק״ג': 1000,
  'מ"ל': 1,
  'מ״ל': 1,
  ליטר: 1000,
  כוס: 240,
  כף: 15,
  כפות: 15,
  כפית: 5,
  סקופ: 25,
  חופן: 15,
  קורט: 0.3,
};

const FOODS = [
  { keys: ['בננה'], per100: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 }, piece: 118 },
  { keys: ['תות', 'תותים'], per100: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 } },
  { keys: ['מנגו'], per100: { calories: 60, protein: 0.8, carbs: 15, fat: 0.4 } },
  { keys: ['פירות יער', 'אוכמניות', 'פטל'], per100: { calories: 43, protein: 0.7, carbs: 9.6, fat: 0.3 } },
  { keys: ['אבטיח'], per100: { calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 } },
  { keys: ['תפוח עץ', 'תפוח'], per100: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 }, piece: 150 },
  { keys: ['גרנולה'], per100: { calories: 471, protein: 10, carbs: 64, fat: 20 } },
  { keys: ['סילאן', 'דבש', 'מייפל'], per100: { calories: 304, protein: 0.3, carbs: 82, fat: 0 } },
  { keys: ['אגוזי מלך', 'אגוז מלך'], per100: { calories: 654, protein: 15.2, carbs: 14, fat: 65 } },
  { keys: ['שקדים'], per100: { calories: 579, protein: 21, carbs: 22, fat: 50 } },
  { keys: ['צנוברים'], per100: { calories: 673, protein: 14, carbs: 13, fat: 68 } },
  { keys: ['קוקוס'], per100: { calories: 660, protein: 6.9, carbs: 24, fat: 65 } },
  { keys: ['מים', 'ציר'], per100: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { keys: ['חלב 3', 'חלב מלא'], per100: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
  { keys: ['חלב דל שומן', 'חלב מועשר', 'חלב מרוכז דל'], per100: { calories: 42, protein: 5.3, carbs: 4.8, fat: 0.2 } },
  { keys: ['משקה שקדים', 'alpro'], per100: { calories: 15, protein: 0.5, carbs: 0, fat: 1.2 } },
  { keys: ['יוגורט pro', 'מעדן pro', 'גביע יוגורט pro'], per100: { calories: 60, protein: 10, carbs: 4, fat: 0.3 } },
  { keys: ['יוגורט טבעי', 'יוגורט'], per100: { calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3 } },
  { keys: ['אבקת חלבון', 'חלבון וניל', 'חלבון שוקולד', 'myprotein', 'פרוטאין'], per100: { calories: 408, protein: 80, carbs: 7.5, fat: 7.2 } },
  { keys: ['חמאת בוטנים', 'אבקת חמאת בוטנים'], per100: { calories: 630, protein: 26, carbs: 15, fat: 52 } },
  { keys: ['שיבולת שועל', 'oats', 'quaker'], per100: { calories: 374, protein: 11, carbs: 69, fat: 8 } },
  { keys: ['חזה עוף', 'עוף דק לשניצל'], per100: { calories: 110, protein: 23, carbs: 0, fat: 1.5 } },
  { keys: ['פרגית', 'שוקי עוף'], per100: { calories: 130, protein: 21, carbs: 0, fat: 5 } },
  { keys: ['שווארמה הודו', 'הודו'], per100: { calories: 120, protein: 22, carbs: 0, fat: 3.5 } },
  { keys: ['בקר טחון רזה', 'עד 5% שומן'], per100: { calories: 137, protein: 20.7, carbs: 0, fat: 5.5 } },
  { keys: ['בקר טחון', 'נתח בקר', 'צלי'], per100: { calories: 215, protein: 19, carbs: 0, fat: 15 } },
  { keys: ['אורז בסמטי', 'אורז יבש'], per100: { calories: 350, protein: 8.8, carbs: 78, fat: 0.6 } },
  { keys: ['אורז מבושל'], per100: { calories: 123, protein: 2.8, carbs: 27, fat: 0.3 } },
  { keys: ['פסטה', 'פנה', 'מקרוני', 'barilla'], per100: { calories: 359, protein: 13, carbs: 71, fat: 1.5 } },
  { keys: ['תפוח אדמה', 'תפוחי אדמה', 'פירה'], per100: { calories: 77, protein: 2, carbs: 17, fat: 0.1 } },
  { keys: ['בטטה'], per100: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 } },
  { keys: ['שמן זית', 'olive'], per100: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
  { keys: ['שמן לטיגון', 'שמן '], per100: { calories: 884, protein: 0, carbs: 0, fat: 100 } },
  { keys: ['חמאה'], per100: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81 } },
  { keys: ['פירורי לחם', 'פנקו'], per100: { calories: 367, protein: 10, carbs: 72, fat: 3.3 } },
  { keys: ['קמח תירס'], per100: { calories: 361, protein: 6.9, carbs: 76.8, fat: 3.9 } },
  { keys: ['קמח לחם', 'קמח'], per100: { calories: 364, protein: 10, carbs: 76, fat: 1 } },
  { keys: ['פיתה'], per100: { calories: 275, protein: 9, carbs: 55, fat: 1.2 }, piece: 60 },
  { keys: ['לחם', 'פרוסות'], per100: { calories: 227, protein: 11.2, carbs: 36.6, fat: 2.4 } },
  { keys: ['טורטייה'], per100: { calories: 310, protein: 8.5, carbs: 54, fat: 6.5 }, piece: 45 },
  { keys: ['ביצה', 'ביצים'], per100: { calories: 133, protein: 12.5, carbs: 0.7, fat: 9.2 }, piece: 60 },
  { keys: ['טחינה'], per100: { calories: 595, protein: 17, carbs: 21, fat: 54 } },
  { keys: ['פומודורו', 'רסק עגבניות', 'עגבניות מרוסקות'], per100: { calories: 40, protein: 1.8, carbs: 6.5, fat: 0.2 } },
  { keys: ['עגבני'], per100: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
  { keys: ['מלפפון'], per100: { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 }, piece: 200 },
  { keys: ['פלפל אדום'], per100: { calories: 31, protein: 1, carbs: 6, fat: 0.3 }, piece: 120 },
  { keys: ['פלפל ירוק', 'פלפל'], per100: { calories: 20, protein: 0.9, carbs: 4.6, fat: 0.2 }, piece: 120 },
  { keys: ['בצל סגול', 'בצל אדום', 'בצל מגורד', 'בצל'], per100: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 }, piece: 110 },
  { keys: ['בצל ירוק'], per100: { calories: 32, protein: 1.8, carbs: 7.3, fat: 0.2 }, piece: 15 },
  { keys: ['גזר'], per100: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
  { keys: ['ברוקולי'], per100: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
  { keys: ['שעועית ירוקה'], per100: { calories: 31, protein: 1.8, carbs: 7, fat: 0.2 } },
  { keys: ['אדממה'], per100: { calories: 121, protein: 11.9, carbs: 8.9, fat: 5.2 } },
  { keys: ['אפונה'], per100: { calories: 81, protein: 5.4, carbs: 14, fat: 0.4 } },
  { keys: ['עלים ירוקים', 'חסה', 'פטרוזיליה'], per100: { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 } },
  { keys: ['לימון', 'ליים'], per100: { calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3 }, piece: 60 },
  { keys: ['שום כתוש', 'מחית שום', 'שיני שום', 'אבקת שום', 'שום'], per100: { calories: 149, protein: 6.4, carbs: 33, fat: 0.5 }, piece: 4 },
  { keys: ['גבינה בולגרית', 'פטה'], per100: { calories: 110, protein: 16, carbs: 1.2, fat: 5 } },
  { keys: ['גבינת שמנת'], per100: { calories: 180, protein: 6, carbs: 4, fat: 16 } },
  { keys: ['צדר', "צ'דר"], per100: { calories: 403, protein: 25, carbs: 1.3, fat: 33 } },
  { keys: ['מוצרלה'], per100: { calories: 285, protein: 21, carbs: 0, fat: 22 } },
  { keys: ['נועם', 'קוטג'], per100: { calories: 95, protein: 10.7, carbs: 1.8, fat: 5 } },
  { keys: ['זיתים'], per100: { calories: 118, protein: 1, carbs: 2.4, fat: 11 } },
  { keys: ['רוטב סויה'], per100: { calories: 53, protein: 8, carbs: 5, fat: 0.1 } },
  { keys: ['ברביקיו', 'bbq'], per100: { calories: 172, protein: 0.8, carbs: 41, fat: 0.6 } },
  { keys: ['גוצונג', "גוצ'ונג"], per100: { calories: 180, protein: 4, carbs: 36, fat: 3 } },
  { keys: ['רוטב חריף', 'סרירצ'], per100: { calories: 93, protein: 2, carbs: 19, fat: 0.8 } },
  { keys: ['חרדל'], per100: { calories: 66, protein: 4.4, carbs: 5.8, fat: 3.3 } },
  { keys: ['קטשופ'], per100: { calories: 119, protein: 1, carbs: 27.2, fat: 0.1 } },
  { keys: ['חומץ'], per100: { calories: 18, protein: 0, carbs: 0.6, fat: 0 } },
  { keys: ['שומשום'], per100: { calories: 573, protein: 17, carbs: 23, fat: 50 } },
  { keys: ['קקאו'], per100: { calories: 389, protein: 24, carbs: 13, fat: 21 } },
  { keys: ['נוטלה'], per100: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 } },
  { keys: ['שוקולד', 'נטיפי', 'צ\'יפס'], per100: { calories: 389, protein: 3.6, carbs: 44.8, fat: 37 } },
  { keys: ['אינסטנט פודינג', 'פודינג'], per100: { calories: 360, protein: 0, carbs: 88, fat: 0 } },
  { keys: ['קסנטן'], per100: { calories: 333, protein: 1, carbs: 77, fat: 0 } },
  { keys: ['ממתיק'], per100: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { keys: ['מלח', 'מלח ים', 'מלח גס'], per100: { calories: 0, protein: 0, carbs: 0, fat: 0 } },
  { keys: ['פלפל שחור'], per100: { calories: 251, protein: 10, carbs: 64, fat: 3.3 } },
  { keys: ['פפריקה'], per100: { calories: 282, protein: 14, carbs: 54, fat: 13 } },
  { keys: ['קינמון'], per100: { calories: 247, protein: 4, carbs: 81, fat: 1.2 } },
  { keys: ['כמון'], per100: { calories: 375, protein: 18, carbs: 44, fat: 22 } },
  { keys: ['כורכום'], per100: { calories: 354, protein: 8, carbs: 65, fat: 10 } },
  { keys: ['אורגנו', 'רוזמרין', 'עשבי תיבול', 'כוסברה', 'תבלין', 'צ\'ילי', 'צילי'], per100: { calories: 265, protein: 9, carbs: 69, fat: 4 } },
  { keys: ['אבקת אפייה', 'שמרים'], per100: { calories: 53, protein: 8, carbs: 22, fat: 0 } },
  { keys: ['סוכר'], per100: { calories: 387, protein: 0, carbs: 100, fat: 0 } },
  { keys: ['פריכיות אורז'], per100: { calories: 387, protein: 8, carbs: 82, fat: 2.8 }, piece: 9 },
  { keys: ['דיאט לימונדה'], per100: { calories: 2, protein: 0, carbs: 0.2, fat: 0 } },
  { keys: ['דגני', 'סינמון טוסט', 'קורנפלקס'], per100: { calories: 378, protein: 6, carbs: 84, fat: 2 } },
  { keys: ['סוכריות'], per100: { calories: 394, protein: 0, carbs: 98, fat: 0.2 } },
  { keys: ['אוראו', 'לוטוס', 'פתיבר', 'עוגי'], per100: { calories: 480, protein: 5, carbs: 70, fat: 20 } },
  { keys: ['עלה דפנה'], per100: { calories: 313, protein: 8, carbs: 75, fat: 8 } },
];

const ALIAS_INDEX = [];

function addAlias(key, per100, piece) {
  const normalized = normalizeName(key);
  if (!normalized) return;
  ALIAS_INDEX.push({ key: normalized, per100, piece: piece || 0, length: normalized.length });
}

for (const food of FOODS) {
  for (const key of food.keys) addAlias(key, food.per100, food.piece);
}

for (const [pantryKey, title] of Object.entries(PANTRY_NAMES)) {
  const per100 = PANTRY_NUTRITION[pantryKey];
  if (!per100) continue;
  addAlias(title, per100, pantryKey === 'eggL' ? 60 : 0);
  addAlias(pantryKey, per100, pantryKey === 'eggL' ? 60 : 0);
}

ALIAS_INDEX.sort((a, b) => b.length - a.length);

export function findIngredientNutrition(name) {
  const hay = normalizeName(name);
  if (!hay) return null;
  for (const entry of ALIAS_INDEX) {
    if (hay === entry.key || hay.includes(entry.key)) {
      return { per100: entry.per100, piece: entry.piece };
    }
  }
  return null;
}

export function amountToGrams(amount, unit, name) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const u = String(unit || 'גרם').trim();
  if (UNIT_TO_GRAMS[u]) return value * UNIT_TO_GRAMS[u];
  if (u === 'יחידה') {
    const match = findIngredientNutrition(name);
    return value * (match?.piece || 50);
  }
  return value;
}

export function macrosForIngredient(ingredient) {
  const amount = Number(ingredient?.amount);
  const name = ingredient?.name || '';
  const unit = ingredient?.unit || 'גרם';
  const match = findIngredientNutrition(name);
  if (match?.per100) {
    const grams = amountToGrams(amount, unit, name);
    return macrosAt(match.per100, grams);
  }
  if (Number.isFinite(amount) && amount > 0) {
    const stored = {
      calories: Number(ingredient.calories),
      protein: Number(ingredient.protein),
      carbs: Number(ingredient.carbs),
      fat: Number(ingredient.fat),
    };
    if (Object.values(stored).some((n) => Number.isFinite(n))) {
      return {
        calories: Number.isFinite(stored.calories) ? round1(stored.calories) : 0,
        protein: Number.isFinite(stored.protein) ? round1(stored.protein) : 0,
        carbs: Number.isFinite(stored.carbs) ? round1(stored.carbs) : 0,
        fat: Number.isFinite(stored.fat) ? round1(stored.fat) : 0,
      };
    }
  }
  return emptyMacros();
}

export function scaleIngredient(ingredient) {
  const macros = macrosForIngredient(ingredient);
  return { ...ingredient, ...macros };
}

export function sumIngredientMacros(ingredients) {
  const totals = emptyMacros();
  for (const ing of ingredients || []) {
    const macros = macrosForIngredient(ing);
    totals.calories += macros.calories;
    totals.protein += macros.protein;
    totals.carbs += macros.carbs;
    totals.fat += macros.fat;
  }
  return {
    calories: round1(totals.calories),
    protein: round1(totals.protein),
    carbs: round1(totals.carbs),
    fat: round1(totals.fat),
  };
}

export function recalculateRecipe(recipe) {
  const ingredients = (recipe.ingredients || []).map(scaleIngredient);
  const totals = sumIngredientMacros(ingredients);
  return {
    ...recipe,
    ingredients,
    macros: { ...(recipe.macros || {}), ...totals },
  };
}

export function recipesNeedMacroUpdate(previous, next) {
  return JSON.stringify(previous?.macros || {}) !== JSON.stringify(next?.macros || {})
    || JSON.stringify(previous?.ingredients || []) !== JSON.stringify(next?.ingredients || []);
}

export function batchRecalculateRecipes(recipes) {
  return (recipes || []).map((recipe) => recalculateRecipe(recipe));
}
