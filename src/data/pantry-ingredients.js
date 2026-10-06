import { amountToGrams, formatGramsNumber } from '@/lib/ingredientUnits';

export const PANTRY_CATEGORY = 'רכיבים ומוצרי בסיס';

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

export function macrosAt(per100, amount) {
  const factor = Number(amount) / 100;
  return {
    calories: round1(per100.calories * factor),
    protein: round1(per100.protein * factor),
    carbs: round1(per100.carbs * factor),
    fat: round1(per100.fat * factor),
  };
}

export function pantryPortion(key, amount, overrides = {}) {
  const per100 = PANTRY_NUTRITION[key];
  if (!per100) return { calories: '', protein: '', carbs: '', fat: '', ...overrides };
  return { ...macrosAt(per100, amount), ...overrides };
}

export const PANTRY_NUTRITION = {
  cottageTnuva: { calories: 95, protein: 10.7, carbs: 1.8, fat: 5 },
  cottageStrauss: { calories: 93, protein: 11, carbs: 1.5, fat: 5 },
  breadAngel: { calories: 227, protein: 11.2, carbs: 36.6, fat: 2.4 },
  proteinMyprotein: { calories: 408, protein: 80, carbs: 7.5, fat: 7.2 },
  pbBd: { calories: 630, protein: 26, carbs: 15, fat: 52 },
  alproAlmond: { calories: 15, protein: 0.5, carbs: 0, fat: 1.2 },
  oatsQuaker: { calories: 374, protein: 11, carbs: 69, fat: 8 },
  mozzGad: { calories: 285, protein: 21, carbs: 0, fat: 22 },
  noamTara: { calories: 201, protein: 30, carbs: 0, fat: 9 },
  pomodoroYm: { calories: 40, protein: 1.8, carbs: 6.5, fat: 0 },
  ketchupHeinz: { calories: 119, protein: 1, carbs: 27.2, fat: 0 },
  pastaBarilla: { calories: 359, protein: 13, carbs: 71, fat: 2 },
  riceDaawatCooked: { calories: 123, protein: 2.8, carbs: 27, fat: 0 },
  riceDaawatDry: { calories: 350, protein: 8.8, carbs: 78, fat: 0 },
  tortillaShkadia: { calories: 310, protein: 8.5, carbs: 54, fat: 6.5 },
  tortillaMasterChef: { calories: 298, protein: 9, carbs: 52, fat: 5.5 },
  chipsSweetango: { calories: 389, protein: 3.6, carbs: 44.8, fat: 37 },
  chipsLilys: { calories: 429, protein: 6.5, carbs: 57.1, fat: 28.6 },
  chipsMimunsDark: { calories: 508, protein: 0, carbs: 75.3, fat: 23 },
  chipsMimunsWhite: { calories: 530, protein: 0, carbs: 68, fat: 29 },
  cocoaAlmandos: { calories: 389, protein: 24, carbs: 13, fat: 21 },
  nutella: { calories: 539, protein: 6.3, carbs: 57.5, fat: 30.9 },
  olivesYavne: { calories: 118, protein: 1, carbs: 2.4, fat: 11 },
  olivesRami: { calories: 204, protein: 1.5, carbs: 4.5, fat: 20 },
  eggL: { calories: 133, protein: 12.5, carbs: 0.7, fat: 9.2 },
  schnitzelAirfryer: { calories: 215, protein: 24, carbs: 13, fat: 7 },
  friesAirfryer: { calories: 125, protein: 2.5, carbs: 23, fat: 2.8 },
  sweetPotatoAirfryer: { calories: 95, protein: 1.8, carbs: 21, fat: 0.3 },
  greenOnion: { calories: 32, protein: 1.8, carbs: 7.3, fat: 0.2 },
};

export const PANTRY_NAMES = {
  cottageTnuva: "קוטג' 5% תנובה",
  cottageStrauss: "קוטג' 5% שטראוס",
  breadAngel: "לחם 100% קמח מלא (אנג'ל)",
  proteinMyprotein: 'אבקת חלבון Myprotein שוקולד לבן',
  pbBd: 'חמאת בוטנים טבעית B&D',
  alproAlmond: 'משקה שקדים Alpro ללא סוכר',
  oatsQuaker: 'שיבולת שועל Quaker להכנה מהירה',
  mozzGad: 'מוצרלה מגוררת 22% גד',
  noamTara: 'גבינת נועם 9% טרה',
  pomodoroYm: 'רוטב עגבניות פומודורו יד מרדכי (ללא שמן וסוכר)',
  ketchupHeinz: 'קטשופ היינץ',
  pastaBarilla: 'פסטה פנה ברילה',
  riceDaawatCooked: 'אורז בסמטי Daawat (מבושל)',
  riceDaawatDry: 'אורז בסמטי Daawat (יבש)',
  tortillaShkadia: 'טורטייה חיטה שקדיה',
  tortillaMasterChef: 'טורטייה חיטה וכוסמין מאסטר שף',
  chipsSweetango: "שוקולד צ'יפס ללא סוכר Sweetango",
  chipsLilys: "נטיפי שוקולד קרמל מלוח Lily's",
  chipsMimunsDark: 'נטיפי שוקולד חום מימונס',
  chipsMimunsWhite: 'נטיפי שוקולד לבן מימונס',
  cocoaAlmandos: 'אבקת קקאו 20%-22% אלמנדוס',
  nutella: 'ממרח נוטלה',
  olivesYavne: 'זיתים ירוקים קבוצת יבנה',
  olivesRami: 'מיקס זיתים רמי לוי',
  eggL: 'ביצה L',
  schnitzelAirfryer: 'שניצל דק ביתי אייר פרייר',
  friesAirfryer: 'צ\'יפס תפו"א באייר פרייר',
  sweetPotatoAirfryer: 'בטטה באייר פרייר',
  greenOnion: 'בצל ירוק',
};

function servingLabelWithGrams(label, amount, unit, name) {
  const text = String(label || '').trim();
  if (/גרם/.test(text)) return text;
  const grams = amountToGrams(amount, unit || 'גרם', name);
  if (!(grams > 0)) return text;
  return `${text} (${formatGramsNumber(grams)} גרם)`;
}

function serving(label, amount, unit, macros) {
  return { label, amount, unit, ...macros };
}

function pantryItem({
  id,
  key,
  unit = 'גרם',
  image = '',
  servings = [],
  servingUnits: customServingUnits,
  nutritionBasis,
  ingredientAmount,
  ingredientUnit,
  ingredientMacros,
  recipeMacros,
  createdAt,
  updatedAt,
}) {
  const title = PANTRY_NAMES[key];
  const per100 = PANTRY_NUTRITION[key];
  const servingUnits = Array.isArray(customServingUnits) && customServingUnits.length
    ? customServingUnits
    : [
      serving(`100 ${unit}`, 100, unit, per100),
      ...servings.map((item) => {
        const itemUnit = item.unit || unit;
        return serving(
          servingLabelWithGrams(item.label, item.amount, itemUnit, title),
          item.amount,
          itemUnit,
          {
            ...macrosAt(per100, item.amount),
            ...(item.macros || {}),
          },
        );
      }),
    ];
  const servingNotes = servingUnits.map((item) => {
    const proteinNote = item.protein !== '' && item.protein != null
      ? `, ${item.protein}ג׳ חלבון`
      : '';
    return `${item.label} = ${item.calories} קק״ל${proteinNote}`;
  });
  const ingAmount = ingredientAmount ?? 100;
  const ingUnit = ingredientUnit || unit;
  const ingMacros = ingredientMacros || per100;
  const basis = nutritionBasis || (unit === 'מ"ל' ? '100ml' : '100g');

  return {
    id,
    title,
    image,
    imageUrl: image,
    categories: [PANTRY_CATEGORY],
    equipment: [],
    ingredients: [
      { id: `${id}-100`, amount: ingAmount, unit: ingUnit, name: title, ...ingMacros },
    ],
    steps: [
      basis === 'serving'
        ? 'ערכים תזונתיים למנה ברירת המחדל.'
        : `ערכים תזונתיים מדויקים ל-100 ${unit}.`,
      ...(servingNotes.length ? [`מנות מוכנות: ${servingNotes.join(' · ')}.`] : []),
    ],
    macros: { ...(recipeMacros || per100) },
    servingUnits,
    nutritionBasis: basis,
    recipeType: 'ingredient',
    prepTime: 0,
    cookTime: 0,
    rating: '',
    baseServings: 1,
    favorite: false,
    createdAt,
    updatedAt: updatedAt || createdAt,
  };
}

const PANTRY_IMAGES = {
  ketchupHeinz: '/images/ingredients/heinz-ketchup.jpeg',
  alproAlmond: '/images/ingredients/alpro-almond.jpeg',
  mozzGad: '/images/ingredients/gad-mozzarella.jpeg',
  noamTara: '/images/ingredients/tara-noam.jpg',
  olivesRami: '/images/ingredients/olives.jpeg',
  olivesYavne: '/images/ingredients/olives.jpeg',
  oatsQuaker: '/images/ingredients/quaker-oats.jpeg',
  pastaBarilla: '/images/ingredients/barilla-penne.jpeg',
  breadAngel: '/images/ingredients/angel-bread.jpg',
  riceDaawatCooked: '/images/ingredients/daawat-rice.jpeg',
  riceDaawatDry: '/images/ingredients/daawat-rice.jpeg',
  pomodoroYm: '/images/ingredients/pomodoro-sauce.jpeg',
  chipsLilys: '/images/ingredients/lilys-chips.jpg',
  chipsMimunsDark: '/images/ingredients/maimons-dark-chips.jpeg',
  chipsMimunsWhite: '/images/ingredients/maimons-white-chips.jpeg',
  chipsSweetango: '/images/ingredients/sweetango-chips.jpg',
  cocoaAlmandos: '/images/ingredients/almandos-cocoa.jpg',
  nutella: '/images/ingredients/nutella.jpeg',
  tortillaShkadia: '/images/ingredients/shkedia-tortilla.jpg',
  tortillaMasterChef: '/images/ingredients/masterchef-tortilla.jpg',
  proteinMyprotein: '/images/ingredients/myprotein-whey.jpeg',
  cottageTnuva: '',
  cottageStrauss: '',
  pbBd: '',
  eggL: '',
  schnitzelAirfryer: '',
  friesAirfryer: '',
  sweetPotatoAirfryer: '',
  greenOnion: '',
};

const PANTRY_DEFS = [
  {
    id: 'pantry-cottage-tnuva-5',
    key: 'cottageTnuva',
    servings: [{ label: 'גביע', amount: 250, macros: { calories: 237, protein: 26.8 } }],
  },
  {
    id: 'pantry-cottage-strauss-5',
    key: 'cottageStrauss',
    servings: [{ label: 'גביע', amount: 250, macros: { calories: 233, protein: 27.5 } }],
  },
  {
    id: 'pantry-bread-angel-ww',
    key: 'breadAngel',
    servings: [{ label: 'פרוסה', amount: 35, macros: { calories: 79, protein: 3.9 } }],
  },
  {
    id: 'pantry-protein-myprotein-white-choc',
    key: 'proteinMyprotein',
    servings: [{ label: 'סקופ', amount: 25, macros: { calories: 102, protein: 20 } }],
  },
  {
    id: 'pantry-pb-bd',
    key: 'pbBd',
    servings: [{ label: 'כף', amount: 15, macros: { calories: 95, protein: 3.9 } }],
  },
  {
    id: 'pantry-alpro-almond',
    key: 'alproAlmond',
    unit: 'מ"ל',
    servings: [{ label: 'כוס', amount: 200, unit: 'מ"ל', macros: { calories: 30, protein: 1 } }],
  },
  {
    id: 'pantry-oats-quaker',
    key: 'oatsQuaker',
    servings: [{ label: 'מנה', amount: 40, macros: { calories: 150, protein: 4.4 } }],
  },
  { id: 'pantry-mozz-gad-22', key: 'mozzGad' },
  {
    id: 'pantry-noam-tara-9',
    key: 'noamTara',
    servings: [{ label: 'פרוסה', amount: 22.5, macros: { calories: 45, protein: 6.75 } }],
  },
  { id: 'pantry-pomodoro-ym', key: 'pomodoroYm' },
  { id: 'pantry-ketchup-heinz', key: 'ketchupHeinz' },
  { id: 'pantry-pasta-barilla-penne', key: 'pastaBarilla' },
  { id: 'pantry-rice-daawat-cooked', key: 'riceDaawatCooked' },
  { id: 'pantry-rice-daawat-dry', key: 'riceDaawatDry' },
  {
    id: 'pantry-tortilla-shkadia',
    key: 'tortillaShkadia',
    servings: [{ label: 'יחידה', amount: 45, macros: { calories: 140, protein: 3.8 } }],
  },
  {
    id: 'pantry-tortilla-masterchef',
    key: 'tortillaMasterChef',
    servings: [{ label: 'יחידה', amount: 40, macros: { calories: 119, protein: 3.6 } }],
  },
  { id: 'pantry-chips-sweetango', key: 'chipsSweetango' },
  {
    id: 'pantry-chips-lilys-salted-caramel',
    key: 'chipsLilys',
    servings: [{ label: 'כף', amount: 14, macros: { calories: 60 } }],
  },
  { id: 'pantry-chips-mimuns-dark', key: 'chipsMimunsDark' },
  { id: 'pantry-chips-mimuns-white', key: 'chipsMimunsWhite' },
  { id: 'pantry-cocoa-almandos', key: 'cocoaAlmandos' },
  { id: 'pantry-nutella', key: 'nutella' },
  { id: 'pantry-olives-yavne-green', key: 'olivesYavne' },
  { id: 'pantry-olives-rami-mix', key: 'olivesRami' },
  {
    id: 'pantry-egg-l',
    key: 'eggL',
    servings: [{ label: 'יחידה', amount: 60, macros: { calories: 80, protein: 7.5 } }],
  },
  {
    id: 'pantry-schnitzel-airfryer',
    key: 'schnitzelAirfryer',
    nutritionBasis: 'serving',
    ingredientAmount: 1,
    ingredientUnit: 'יחידה',
    ingredientMacros: { calories: 151, protein: 16.8, carbs: 9.1, fat: 4.9 },
    recipeMacros: { calories: 151, protein: 16.8, carbs: 9.1, fat: 4.9 },
    servingUnits: [
      serving('1 יחידה דקה (70 גרם)', 1, 'יחידה', { calories: 151, protein: 16.8, carbs: 9.1, fat: 4.9 }),
      serving('100 גרם', 10 / 7, 'מנה', { calories: 215, protein: 24, carbs: 13, fat: 7 }),
      serving('2 יחידות (140 גרם)', 2, 'יחידה', { calories: 302, protein: 33.6, carbs: 18.2, fat: 9.8 }),
    ],
    updatedAt: 1791408000000,
  },
  { id: 'pantry-fries-airfryer', key: 'friesAirfryer' },
  { id: 'pantry-sweet-potato-airfryer', key: 'sweetPotatoAirfryer' },
  { id: 'pantry-green-onion', key: 'greenOnion' },
];

export const PANTRY_INGREDIENT_RECIPES = PANTRY_DEFS.map((def, index) => pantryItem({
  ...def,
  image: PANTRY_IMAGES[def.key] || '',
  createdAt: 1727190100000 + index * 1000,
}));
