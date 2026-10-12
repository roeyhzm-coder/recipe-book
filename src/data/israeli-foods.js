/**
 * Local israeli_foods catalog: named household portions with explicit gram weights.
 * There is no remote israeli_foods table in this project; this array is the source of truth.
 */

function portion(label, grams, extras = {}) {
  return {
    id: extras.id || label,
    label,
    unit: extras.unit || label,
    grams,
    kind: extras.kind || 'piece',
    defaultAmount: extras.defaultAmount,
  };
}

const G = (grams = 1) => portion('גרם', grams, { unit: 'גרם', kind: 'mass', id: 'gram' });
const G100 = () => portion('100 גרם', 100, { unit: '100 גרם', kind: 'mass', id: '100g' });
const PASTA_PORTIONS = () => [
  portion('חבילה (500ג)', 500, { unit: 'חבילה' }),
  portion('מנה אישית יבשה (100ג)', 100, { unit: 'מנה יבשה' }),
  G(),
];
const TUNA_PORTIONS = () => [
  portion('קופסה מסוננת (112ג)', 112, { unit: 'קופסה' }),
  G100(),
  G(),
];

export const ISRAELI_FOODS = [
  {
    keys: ['רסק עגבניות', 'רסק עגבניות יכין', 'יכין רסק עגבניות', 'רסק עגבניות 22%'],
    defaultUnit: 'כף',
    per100: { calories: 82, protein: 4.3, carbs: 18.9, fat: 0.5 },
    portions: [
      portion('קופסה קטנה (100ג)', 100, { unit: 'קופסה קטנה' }),
      portion('שפופרת (130ג)', 130, { unit: 'שפופרת' }),
      portion('כף (30ג)', 30, { unit: 'כף', kind: 'household' }),
      portion('כפית (10ג)', 10, { unit: 'כפית', kind: 'household' }),
      G(),
    ],
  },
  {
    keys: [
      'עגבניות מרוסקות',
      'עגבניות מרוסקות יכין',
      'עגבניות מרוסקות מוטי',
      'עגבניות מרוסקות פחית',
      'מוטי עגבניות מרוסקות',
      'mutti',
      'מוטי',
      'פולפה',
      'פומודורו',
      'פחית עגבניות',
    ],
    defaultUnit: 'פחית',
    per100: { calories: 32, protein: 1.6, carbs: 5.5, fat: 0.3 },
    portions: [
      portion('פחית (400ג)', 400, { unit: 'פחית' }),
      portion('חצי פחית (200ג)', 200, { unit: 'חצי פחית' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['פסטה פנה ברילה', 'פנה ברילה', 'ברילה פנה', 'barilla penne'],
    defaultUnit: 'מנה יבשה',
    per100: { calories: 359, protein: 13, carbs: 71, fat: 2 },
    portions: PASTA_PORTIONS(),
  },
  {
    keys: ['פסטה ספגטי ברילה', 'ספגטי ברילה', 'ברילה ספגטי', 'barilla spaghetti'],
    defaultUnit: 'מנה יבשה',
    per100: { calories: 359, protein: 13, carbs: 71, fat: 2 },
    portions: PASTA_PORTIONS(),
  },
  {
    keys: ['פסטה', 'פסטה יבשה', 'ספגטי', 'פנה', 'מקרוני', 'פוזילי', 'ברילה', 'barilla'],
    defaultUnit: 'מנה יבשה',
    per100: { calories: 359, protein: 13, carbs: 71, fat: 1.5 },
    portions: PASTA_PORTIONS(),
  },
  {
    keys: ['טונה בשמן', 'טונה בשמן מסוננת', 'טונה בשמן סטארקיסט'],
    defaultUnit: 'קופסה',
    per100: { calories: 198, protein: 29, carbs: 0, fat: 8.2 },
    portions: TUNA_PORTIONS(),
  },
  {
    keys: ['טונה במים', 'טונה', 'טונה במים מסוננת', 'טונה במים סטארקיסט'],
    defaultUnit: 'קופסה',
    per100: { calories: 116, protein: 25.5, carbs: 0, fat: 0.8 },
    portions: TUNA_PORTIONS(),
  },
  {
    keys: ['רוטב סויה'],
    defaultUnit: 'כף',
    per100: { calories: 53, protein: 8, carbs: 5, fat: 0.1 },
    portions: [
      portion('כף', 15, { unit: 'כף', kind: 'household' }),
      portion('כפית', 5, { unit: 'כפית', kind: 'household' }),
      G(),
    ],
  },
  {
    keys: ['ריבה'],
    defaultUnit: 'כף',
    per100: { calories: 278, protein: 0.4, carbs: 69, fat: 0.1 },
    portions: [
      portion('כף', 20, { unit: 'כף', kind: 'household' }),
      portion('כפית', 7, { unit: 'כפית', kind: 'household' }),
      G(),
    ],
  },
  {
    keys: ['רוטב ברביקיו', 'ברביקיו'],
    defaultUnit: 'כף',
    per100: { calories: 172, protein: 0.8, carbs: 41, fat: 0.6 },
    portions: [
      portion('כף', 15, { unit: 'כף', kind: 'household' }),
      portion('כפית', 5, { unit: 'כפית', kind: 'household' }),
      G(),
    ],
  },
  {
    keys: ['רוטב חריף'],
    defaultUnit: 'כפית',
    per100: { calories: 93, protein: 2, carbs: 19, fat: 0.8 },
    portions: [
      portion('כף', 15, { unit: 'כף', kind: 'household' }),
      portion('כפית', 5, { unit: 'כפית', kind: 'household' }),
      G(),
    ],
  },
  {
    keys: ['מלפפון', 'מלפפונים'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה קטנה', 70),
      portion('יחידה בינונית', 100),
      portion('יחידה גדולה', 140),
      G100(),
      G(),
    ],
  },
  {
    keys: ['עגבניות שרי', 'עגבניית שרי', 'עגבנייה שרי', 'עגבניה שרי'],
    defaultUnit: 'שרי',
    portions: [
      portion('שרי', 15, { unit: 'שרי' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['עגבניה', 'עגבנייה', 'עגבניות'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה בינונית', 120),
      portion('יחידה קטנה', 90),
      portion('שרי', 15, { unit: 'שרי' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['קוטג', "קוטג'", 'גביע קוטג', 'גבינה לבנה', 'גבינת נועם', 'גביע נועם'],
    defaultUnit: 'גביע',
    portions: [
      portion('גביע', 250, { unit: 'גביע' }),
      portion('חצי גביע', 125, { unit: 'חצי גביע' }),
      portion('כף', 30, { unit: 'כף', kind: 'household' }),
      portion('כף שטוחה', 20, { unit: 'כף שטוחה', kind: 'household' }),
      G(),
    ],
  },
  {
    keys: ['גבינת שמנת', 'קרם צ׳ז', "קרם צ'ז", 'cream cheese'],
    defaultUnit: 'כף',
    portions: [
      portion('גביע', 200, { unit: 'גביע' }),
      portion('חצי גביע', 100, { unit: 'חצי גביע' }),
      portion('כף', 30, { unit: 'כף', kind: 'household' }),
      portion('כף שטוחה', 20, { unit: 'כף שטוחה', kind: 'household' }),
      G(),
    ],
  },
  {
    keys: ['יוגורט', 'מעדן', 'גביע יוגורט'],
    defaultUnit: 'גביע',
    portions: [
      portion('גביע', 150, { unit: 'גביע' }),
      portion('חצי גביע', 75, { unit: 'חצי גביע' }),
      portion('כף', 25, { unit: 'כף', kind: 'household' }),
      G(),
    ],
  },
  {
    keys: ['בננה', 'בננות'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה קטנה', 90),
      portion('יחידה בינונית', 120),
      portion('יחידה גדולה', 150),
      G100(),
      G(),
    ],
  },
  {
    keys: ['תפוח עץ', 'תפוחים'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה קטנה', 110),
      portion('יחידה בינונית', 150),
      portion('יחידה גדולה', 200),
      G100(),
      G(),
    ],
  },
  {
    keys: ['מנגו'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה בינונית', 200),
      portion('יחידה גדולה', 300),
      G100(),
      G(),
    ],
  },
  {
    keys: ['תות שדה', 'תותים'],
    defaultUnit: 'יחידה ממוצעת',
    portions: [
      portion('יחידה ממוצעת', 18),
      portion('סלסלה', 250, { unit: 'סלסלה' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['לימון', 'לימונים'],
    defaultUnit: 'יחידה',
    portions: [
      portion('יחידה', 60, { unit: 'יחידה' }),
      portion('חצי יחידה', 30, { unit: 'חצי יחידה' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['תפוח אדמה בייבי', 'תפוחי אדמה בייבי', 'תפוחי אדמה לבנים קטנים', 'תפוחי אדמה קטנים', 'תפוח אדמה קטן'],
    defaultUnit: 'יחידה',
    portions: [
      portion('יחידה', 75, { unit: 'יחידה' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['תפוח אדמה', 'תפוחי אדמה'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה קטנה', 100),
      portion('יחידה בינונית', 150),
      portion('יחידה גדולה', 220),
      G100(),
      G(),
    ],
  },
  {
    keys: ['בטטה', 'בטטות'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה בינונית', 200),
      portion('יחידה גדולה', 350),
      G100(),
      G(),
    ],
  },
  {
    keys: ['בצל ירוק'],
    defaultUnit: 'גבעול בינוני',
    portions: [
      portion('גבעול בינוני', 15, { unit: 'גבעול בינוני' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['בצל', 'בצלים'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה קטנה', 80),
      portion('יחידה בינונית', 150),
      portion('יחידה גדולה', 220),
      G100(),
      G(),
    ],
  },
  {
    keys: ['פלפל אדום', 'פלפל צהוב', 'פלפל כתום', 'פלפל ירוק', 'פלפל גמבה', 'גמבה'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה קטנה', 80),
      portion('יחידה בינונית', 120),
      portion('יחידה גדולה', 180),
      G100(),
      G(),
    ],
  },
  {
    keys: ['ביצה', 'ביצים'],
    defaultUnit: 'יחידה',
    portions: [
      portion('יחידה', 55, { unit: 'יחידה' }),
      portion('חלמון', 18, { unit: 'חלמון' }),
      portion('חלבון', 33, { unit: 'חלבון' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['שן שום', 'שיני שום', 'שום כתוש', 'מחית שום'],
    defaultUnit: 'שן שום',
    portions: [
      portion('שן שום', 4, { unit: 'שן שום' }),
      portion('ראש שום', 40, { unit: 'ראש שום' }),
      G(),
    ],
  },
  {
    keys: ['שום'],
    exclude: ['אבקת', 'גבישי'],
    defaultUnit: 'שן שום',
    portions: [
      portion('שן שום', 4, { unit: 'שן שום' }),
      portion('ראש שום', 40, { unit: 'ראש שום' }),
      G(),
    ],
  },
  {
    keys: ['פיתה', 'פיתות'],
    defaultUnit: 'יחידה',
    portions: [
      portion('יחידה', 60, { unit: 'יחידה' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['פרוסת לחם', 'פריסת לחם', 'פרוסות לחם'],
    defaultUnit: 'פרוסה',
    portions: [
      portion('פרוסה', 30, { unit: 'פרוסה' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['טורטייה', 'טורטיה'],
    defaultUnit: 'יחידה',
    portions: [
      portion('יחידה', 45, { unit: 'יחידה' }),
      G100(),
      G(),
    ],
  },
  {
    keys: ['גזר', 'גזרים'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה בינונית', 80),
      G100(),
      G(),
    ],
  },
  {
    keys: ['קישוא', 'קישואים'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה בינונית', 150),
      G100(),
      G(),
    ],
  },
  {
    keys: ['אבוקדו'],
    defaultUnit: 'יחידה בינונית',
    portions: [
      portion('יחידה בינונית', 150),
      G100(),
      G(),
    ],
  },
  {
    keys: ['שניצל'],
    defaultUnit: 'יחידה',
    portions: [
      portion('יחידה', 70, { unit: 'יחידה' }),
      G100(),
      G(),
    ],
  },
];
