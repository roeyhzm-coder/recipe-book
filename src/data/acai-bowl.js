import { PANTRY_NAMES, pantryPortion } from '@/data/pantry-ingredients';

export const ACAI_BOWL_ID = 'breakfast-1';
export const ACAI_BOWL_TITLE = 'קערת אסאי וחלבון';

export const ACAI_BOWL_MACROS = {
  calories: 477,
  protein: 28.9,
  carbs: 54.2,
  fat: 16.6,
};

export const ACAI_BOWL_RECIPE = {
  id: ACAI_BOWL_ID,
  title: ACAI_BOWL_TITLE,
  image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80',
  categories: ['ארוחת בוקר', 'עתיר חלבון', 'מהיר להכנה'],
  equipment: ['בלנדר', 'משקל מזון'],
  ingredients: [
    { id: 'b1-1', amount: 25, unit: 'גרם', name: PANTRY_NAMES.proteinMyprotein, ...pantryPortion('proteinMyprotein', 25, { calories: 102, protein: 20 }) },
    { id: 'b1-2', amount: 80, unit: 'גרם', name: 'בננה (כ-2/3 בננה)', calories: 70, protein: 1, carbs: 18, fat: 0 },
    { id: 'b1-3', amount: 50, unit: 'גרם', name: 'תותים קפואים / מנגו', calories: 20, protein: 0, carbs: 5, fat: 0 },
    { id: 'b1-4', amount: 15, unit: 'גרם', name: PANTRY_NAMES.pbBd, ...pantryPortion('pbBd', 15, { calories: 95, protein: 3.9 }) },
    { id: 'b1-5', amount: 40, unit: 'גרם', name: 'גרנולה ביתית', calories: 190, protein: 4, carbs: 27, fat: 7 },
  ],
  steps: [
    `הכניסו לבלנדר ${PANTRY_NAMES.proteinMyprotein} (סקופ 25 גרם), בננה, תותים וכף ${PANTRY_NAMES.pbBd}.`,
    'טחנו במשך 60 שניות עד לקבלת מרקם סמיך וחלק.',
    'מזגו לקערה ופזרו 40 גרם גרנולה מעל.',
  ],
  macros: { ...ACAI_BOWL_MACROS },
  rating: 9.5,
  baseServings: 1,
  favorite: true,
  createdAt: 1727190000000,
};

export function isAcaiBowlRecipe(recipe) {
  return String(recipe?.id || '') === ACAI_BOWL_ID || recipe?.title === ACAI_BOWL_TITLE;
}

export function isAlmondDrinkIngredient(ingredient) {
  const name = String(ingredient?.name || '');
  return name.includes('משקה שקדים') || /alpro/i.test(name);
}

export function applyCanonicalAcaiBowl(recipe) {
  if (!isAcaiBowlRecipe(recipe)) return recipe;
  const hasAlmond = (recipe.ingredients || []).some(isAlmondDrinkIngredient)
    || (recipe.steps || []).some((step) => /משקה שקדים|alpro/i.test(String(step)));
  if (!hasAlmond) return recipe;
  return {
    ...recipe,
    title: ACAI_BOWL_TITLE,
    ingredients: ACAI_BOWL_RECIPE.ingredients.map((ing) => ({ ...ing })),
    steps: [...ACAI_BOWL_RECIPE.steps],
    macros: { ...(recipe.macros || {}), ...ACAI_BOWL_MACROS },
  };
}
