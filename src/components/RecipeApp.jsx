import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchRecipes, syncRecipes, upsertRecipes } from '@/lib/recipes-db';
import { extractRecipe } from '@/lib/extract-recipe.functions';
import {
  Search, Star, Plus, X, ArrowRight, Settings, Download, Upload,
  Trash2, Pencil, Check, Clock, RotateCcw, Sun, Moon, Flame, Scale,
  UtensilsCrossed, Snowflake, Thermometer, Timer as TimerIcon, Soup,
  Refrigerator, Wrench, ChefHat, Utensils, ImagePlus, ChevronDown, ChevronUp,
  Dumbbell, Wheat, Droplet, AlertTriangle
} from 'lucide-react';

/* ---------------------------------- data & storage ---------------------------------- */

const STORAGE_KEY = 'mitbach_recipes_v1';
const CATEGORIES_STORAGE_KEY = 'mitbach_categories_v1';

const DEFAULT_CATEGORY_NAMES = [
  'ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'עתיר חלבון', 'בשרי', 'נשנושים', 'גלידות',
  'דגים', 'דל פחמימה', 'קינוחים', 'שייקים', 'סלטים', 'מהיר להכנה', 'Meal Prep',
];
const PINNED_BY_DEFAULT = ['ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'עתיר חלבון'];
const UNIT_LIST = ['גרם', 'ק"ג', 'מ"ל', 'ליטר', 'כוס', 'כפות', 'כפית', 'יחידה', 'חופן', 'קורט'];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return '';
  return Math.min(10, Math.max(1, Math.round(rating * 10) / 10));
}

function getRatingCardClass(rating) {
  const value = Number(rating);
  if (!Number.isFinite(value)) return 'bg-white';
  if (value > 9.5) return 'bg-sky-50';
  if (value > 9.0) return 'bg-teal-50';
  if (value > 8.0) return 'bg-green-50';
  if (value > 7.0) return 'bg-lime-50';
  if (value > 5.0) return 'bg-amber-50';
  return 'bg-red-50';
}

function defaultCategories() {
  return DEFAULT_CATEGORY_NAMES.map((name) => ({ id: uid(), name, pinned: PINNED_BY_DEFAULT.includes(name) }));
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return defaultCategories();
}

function saveCategories(categories) {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {}
}

const EQUIPMENT_ICON_MAP = [
  { keys: ['גריל', 'תנור', 'כיריים', 'אש', 'טוסטר', 'איירפרייר', 'air fryer'], icon: Flame },
  { keys: ['משקל'], icon: Scale },
  { keys: ['סכין', 'קרש'], icon: UtensilsCrossed },
  { keys: ['הקפאה', 'פריזר', 'קרח'], icon: Snowflake },
  { keys: ['מקרר'], icon: Refrigerator },
  { keys: ['בלנדר', 'מעבד', 'שייקר', 'מיקסר'], icon: Utensils },
  { keys: ['תרמומטר', 'מדחום'], icon: Thermometer },
  { keys: ['טיימר', 'שעון'], icon: TimerIcon },
  { keys: ['סיר', 'מחבת'], icon: Soup },
];

function getEquipmentIcon(name) {
  const found = EQUIPMENT_ICON_MAP.find((e) => e.keys.some((k) => name.toLowerCase().includes(k)));
  return found ? found.icon : Wrench;
}

function makeIngredient(amount, unit, name, calories = '', protein = '', carbs = '', fat = '') {
  return { id: uid(), amount, unit, name, calories, protein, carbs, fat };
}

const DEMO_RECIPES = [
  {
    id: 'breakfast-1',
    title: 'קערת אסאי וחלבון',
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800&q=80',
    categories: ['ארוחת בוקר', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['בלנדר', 'משקל מזון'],
    ingredients: [
      { id: 'b1-1', amount: 30, unit: 'גרם', name: 'אבקת חלבון', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'b1-2', amount: 80, unit: 'גרם', name: 'בננה (כ-2/3 בננה)', calories: 70, protein: 1, carbs: 18, fat: 0 },
      { id: 'b1-3', amount: 50, unit: 'גרם', name: 'תותים קפואים / מנגו', calories: 20, protein: 0, carbs: 5, fat: 0 },
      { id: 'b1-4', amount: 20, unit: 'גרם', name: 'חמאת בוטנים טבעית', calories: 125, protein: 5, carbs: 4, fat: 10 },
      { id: 'b1-5', amount: 40, unit: 'גרם', name: 'גרנולה ביתית', calories: 190, protein: 4, carbs: 27, fat: 7 },
    ],
    steps: [
      'הכניסו לבלנדר אבקת חלבון, בננה, תותים, חמאת בוטנים וכ-100 מ"ל מים קרים או קרח.',
      'טחנו במשך 60 שניות עד לקבלת מרקם סמיך וחלק.',
      'מזגו לקערה ופזרו 40 גרם גרנולה מעל.',
    ],
    macros: { calories: 520, protein: 34, carbs: 56, fat: 18 },
    rating: 9.5,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190000000,
  },
  {
    id: 'breakfast-2',
    title: "קערת יוגורט וגרנולה קראנצ'ית",
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
    categories: ['ארוחת בוקר', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['משקל מזון'],
    ingredients: [
      { id: 'b2-1', amount: 200, unit: 'גרם', name: "גביע יוגורט PRO (20ג' חלבון)", calories: 120, protein: 20, carbs: 8, fat: 0 },
      { id: 'b2-2', amount: 100, unit: 'גרם', name: 'בננה פרוסה', calories: 90, protein: 1, carbs: 23, fat: 0 },
      { id: 'b2-3', amount: 40, unit: 'גרם', name: 'גרנולה ביתית', calories: 190, protein: 4, carbs: 27, fat: 7 },
      { id: 'b2-4', amount: 10, unit: 'גרם', name: 'סילאן או דבש', calories: 30, protein: 0, carbs: 8, fat: 0 },
      { id: 'b2-5', amount: 10, unit: 'גרם', name: 'אגוזי מלך / שקדים', calories: 65, protein: 2, carbs: 1, fat: 6 },
    ],
    steps: [
      'רוקנו את גביע היוגורט לקערה.',
      'פרסו בננה שלמה מעל היוגורט.',
      'הוסיפו את הגרנולה והאגוזים, וזלפו כפית סילאן מעל.',
    ],
    macros: { calories: 495, protein: 27, carbs: 67, fat: 13 },
    rating: 9.0,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190001000,
  },
  {
    id: 'breakfast-3',
    title: 'שיבולת שועל קרה (Overnight Oats)',
    image: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800&q=80',
    categories: ['ארוחת בוקר', 'Meal Prep', 'עתיר חלבון'],
    equipment: ['משקל מזון', 'מקרר'],
    ingredients: [
      { id: 'b3-1', amount: 50, unit: 'גרם', name: 'שיבולת שועל דקה', calories: 185, protein: 7, carbs: 32, fat: 3 },
      { id: 'b3-2', amount: 30, unit: 'גרם', name: 'אבקת חלבון', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'b3-3', amount: 150, unit: 'מ"ל', name: 'חלב 3%', calories: 90, protein: 5, carbs: 7, fat: 5 },
      { id: 'b3-4', amount: 15, unit: 'גרם', name: 'סילאן או דבש', calories: 45, protein: 0, carbs: 11, fat: 0 },
      { id: 'b3-5', amount: 50, unit: 'גרם', name: 'פירות יער / תותים', calories: 25, protein: 0, carbs: 6, fat: 0 },
    ],
    steps: [
      'ערבבו בצנצנת זכוכית את שיבולת השועל, אבקת החלבון, החלב והסילאן עד לאיחוד.',
      'הכניסו למקרר ל-6 שעות לפחות או למשך הלילה.',
      'בבוקר הוציאו מהמקרר, פזרו פירות יער מעל ואכלו ישירות מהצנצנת.',
    ],
    macros: { calories: 460, protein: 36, carbs: 58, fat: 9 },
    rating: 8.8,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190002000,
  },
  {
    id: 'breakfast-4',
    title: 'טוסט חמאת בוטנים ובננה לצד שייק חלבון',
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80',
    categories: ['ארוחת בוקר', 'מהיר להכנה'],
    equipment: ['טוסטר', 'משקל מזון', 'שייקר'],
    ingredients: [
      { id: 'b4-1', amount: 2, unit: 'יחידה', name: 'פרוסות לחם אגוזים / מחמצת', calories: 180, protein: 6, carbs: 32, fat: 3 },
      { id: 'b4-2', amount: 20, unit: 'גרם', name: 'חמאת בוטנים טבעית', calories: 125, protein: 5, carbs: 4, fat: 10 },
      { id: 'b4-3', amount: 100, unit: 'גרם', name: 'בננה פרוסה', calories: 90, protein: 1, carbs: 23, fat: 0 },
      { id: 'b4-4', amount: 30, unit: 'גרם', name: 'אבקת חלבון (בשייקר עם מים)', calories: 115, protein: 24, carbs: 2, fat: 1 },
    ],
    steps: [
      'קלו 2 פרוסות לחם בטוסטר עד להזהבה פריכה.',
      'מרחו כף חמאת בוטנים על הפרוסות החמות וסדרו פרוסות בננה מעל (אפשר לפזר מעט קינמון).',
      'שקשקו בשייקר סקופ חלבון עם 250 מ"ל מים קרים ושתו לצד הטוסט.',
    ],
    macros: { calories: 510, protein: 36, carbs: 61, fat: 14 },
    rating: 8.7,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190003000,
  },
  {
    id: 'breakfast-5',
    title: 'דייסת שיבולת שועל חמה במיקרוגל',
    image: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&q=80',
    categories: ['ארוחת בוקר', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['משקל מזון'],
    ingredients: [
      { id: 'b5-1', amount: 60, unit: 'גרם', name: 'שיבולת שועל דקה', calories: 220, protein: 8, carbs: 38, fat: 4 },
      { id: 'b5-2', amount: 150, unit: 'מ"ל', name: 'חלב 3%', calories: 90, protein: 5, carbs: 7, fat: 5 },
      { id: 'b5-3', amount: 100, unit: 'מ"ל', name: 'מים', calories: 0, protein: 0, carbs: 0, fat: 0 },
      { id: 'b5-4', amount: 30, unit: 'גרם', name: 'אבקת חלבון', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'b5-5', amount: 80, unit: 'גרם', name: 'בננה פרוסה', calories: 70, protein: 1, carbs: 18, fat: 0 },
    ],
    steps: [
      'ערבבו בקערה עמוקה שיבולת שועל, חלב ומים.',
      'חממו במיקרוגל במשך 2 דקות עד שהדייסה מסמיכה ורותחת.',
      'המתינו דקה אחת לצינון קל, ערבבו פנימה את אבקת החלבון והניחו פרוסות בננה מעל.',
    ],
    macros: { calories: 495, protein: 38, carbs: 65, fat: 10 },
    rating: 8.9,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190004000,
  },
  {
    id: 'lunch-1',
    title: "חזה עוף עסיסי בנינג'ה גריל ואורז",
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&q=80',
    categories: ['ארוחת צהריים', 'עתיר חלבון', 'בשרי', 'Meal Prep'],
    equipment: ["נינג'ה גריל", 'משקל מזון'],
    ingredients: [
      { id: 'l1-1', amount: 200, unit: 'גרם', name: 'חזה עוף נקי', calories: 220, protein: 46, carbs: 0, fat: 4 },
      { id: 'l1-2', amount: 200, unit: 'גרם', name: 'אורז בסמטי מבושל', calories: 260, protein: 6, carbs: 56, fat: 1 },
      { id: 'l1-3', amount: 10, unit: 'גרם', name: 'שמן זית (כף שטוחה)', calories: 90, protein: 0, carbs: 0, fat: 10 },
      { id: 'l1-4', amount: 1, unit: 'כפית', name: 'פפריקה מתוקה, מלח ושום גבישי', calories: 10, protein: 0, carbs: 2, fat: 0 },
    ],
    steps: [
      "חממו מראש את הנינג'ה גריל במצב Grill על עוצמת Max במשך 5 דקות.",
      'צפו את חזה העוף בשמן זית, פפריקה, שום גבישי ומלח.',
      'הניחו על פלטת הגריל ובשלו 10 דקות, הפכו לצד השני ובשלו עוד 4 דקות עד למידת עשייה מושלמת.',
      'הגישו לצד 200 גרם אורז בסמטי חם.',
    ],
    macros: { calories: 580, protein: 52, carbs: 58, fat: 15 },
    rating: 9.4,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190005000,
  },
  {
    id: 'lunch-2',
    title: 'פרגיות באייר פרייר עם תפוחי אדמה קריספיים',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80',
    categories: ['ארוחת צהריים', 'עתיר חלבון', 'בשרי'],
    equipment: ['איירפרייר', 'משקל מזון'],
    ingredients: [
      { id: 'l2-1', amount: 200, unit: 'גרם', name: 'סטייק פרגית נקי משומן', calories: 260, protein: 42, carbs: 0, fat: 10 },
      { id: 'l2-2', amount: 250, unit: 'גרם', name: 'תפוח אדמה חתוך לקוביות', calories: 190, protein: 5, carbs: 43, fat: 0 },
      { id: 'l2-3', amount: 10, unit: 'גרם', name: 'שמן זית לתיבול', calories: 90, protein: 0, carbs: 0, fat: 10 },
      { id: 'l2-4', amount: 1, unit: 'כפית', name: 'תבלין גריל עוף, מלח ורוזמרין', calories: 10, protein: 0, carbs: 2, fat: 0 },
    ],
    steps: [
      'ערבבו את קוביות תפוחי האדמה והפרגיות בקערה עם שמן זית ותבלינים.',
      'חממו את האייר פרייר ל-200 מעלות.',
      'הכניסו לסלסלה ובשלו במשך 18 דקות, תוך ניעור של הסלסלה באמצע ההכנה לקבלת מעטפת פריכה.',
    ],
    macros: { calories: 550, protein: 47, carbs: 45, fat: 20 },
    rating: 9.3,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190006000,
  },
  {
    id: 'lunch-3',
    title: 'פסטה בולונז בקר קלאסית (Meal Prep)',
    image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=800&q=80',
    categories: ['ארוחת צהריים', 'עתיר חלבון', 'בשרי', 'Meal Prep'],
    equipment: ['סיר', 'מחבת', 'משקל מזון'],
    ingredients: [
      { id: 'l3-1', amount: 180, unit: 'גרם', name: 'בשר בקר טחון רזה (עד 5% שומן)', calories: 240, protein: 40, carbs: 0, fat: 8 },
      { id: 'l3-2', amount: 80, unit: 'גרם', name: 'פסטה יבשה (לפני בישול)', calories: 280, protein: 10, carbs: 58, fat: 1 },
      { id: 'l3-3', amount: 120, unit: 'גרם', name: 'רוטב עגבניות / פסקאדו איטלקי', calories: 45, protein: 2, carbs: 8, fat: 1 },
      { id: 'l3-4', amount: 5, unit: 'גרם', name: 'שמן זית לצריבה', calories: 45, protein: 0, carbs: 0, fat: 5 },
    ],
    steps: [
      'בשלו את הפסטה בסיר מים רותחים ומומלחים במשך 9 דקות.',
      'צרבו את הבשר הטחון במחבת חמה עם מעט שמן זית, מלח, פלפל ואורגנו במשך 7 דקות עד להשחמה.',
      'הוסיפו את רוטב העגבניות למחבת ובשלו על אש נמוכה עוד 5 דקות.',
      'ערבבו את הפסטה יחד עם הרוטב וחלקו לקופסאות אחסון.',
    ],
    macros: { calories: 610, protein: 52, carbs: 66, fat: 15 },
    rating: 9.1,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190007000,
  },
  {
    id: 'lunch-4',
    title: "שניצל קראנצ'י באייר פרייר ופירה",
    image: 'https://images.unsplash.com/photo-1599921841143-8190253a93bb?w=800&q=80',
    categories: ['ארוחת צהריים', 'עתיר חלבון', 'בשרי', 'מהיר להכנה'],
    equipment: ['איירפרייר', 'משקל מזון'],
    ingredients: [
      { id: 'l4-1', amount: 200, unit: 'גרם', name: 'חזה עוף דק לשניצל', calories: 220, protein: 46, carbs: 0, fat: 4 },
      { id: 'l4-2', amount: 30, unit: 'גרם', name: 'פירורי לחם מוזהבים / פנקו', calories: 110, protein: 3, carbs: 22, fat: 1 },
      { id: 'l4-3', amount: 5, unit: 'גרם', name: 'ספריי שמן זית לריסוס', calories: 45, protein: 0, carbs: 0, fat: 5 },
      { id: 'l4-4', amount: 250, unit: 'גרם', name: 'פירה תפוחי אדמה ביתי', calories: 210, protein: 4, carbs: 40, fat: 4 },
    ],
    steps: [
      'טבלו את חזה העוף בתערובת תבלינים ומעט שום, וצפו היטב בפירורי הלחם.',
      'רססו קלות בספריי שמן זית משני הצדדים.',
      "הכניסו לאייר פרייר בחום של 190 מעלות למשך 12 דקות, והפכו באמצע לקבלת קראנץ' מקסימלי.",
      'הגישו מיד לצד פירה תפוחי אדמה חם.',
    ],
    macros: { calories: 585, protein: 53, carbs: 62, fat: 14 },
    rating: 9.2,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190008000,
  },
  {
    id: 'lunch-5',
    title: "שווארמה הודו נקבה בנינג'ה עם פיתה וטחינה",
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80',
    categories: ['ארוחת צהריים', 'עתיר חלבון', 'בשרי', 'Meal Prep'],
    equipment: ["נינג'ה גריל", 'משקל מזון'],
    ingredients: [
      { id: 'l5-1', amount: 200, unit: 'גרם', name: 'שווארמה הודו נקבה (רצועות)', calories: 240, protein: 44, carbs: 0, fat: 7 },
      { id: 'l5-2', amount: 1, unit: 'יחידה', name: 'פיתה קלה / פיתה מקמח מלא', calories: 160, protein: 6, carbs: 32, fat: 1 },
      { id: 'l5-3', amount: 20, unit: 'גרם', name: 'טחינה גולמית (מעורבבת עם מים ולימון)', calories: 130, protein: 4, carbs: 3, fat: 11 },
      { id: 'l5-4', amount: 1, unit: 'כפות', name: 'תבלין שווארמה, כמון ומלח', calories: 15, protein: 1, carbs: 3, fat: 0 },
    ],
    steps: [
      'תבלו את רצועות ההודו בתבלין שווארמה, כמון ומעט מלח.',
      "חממו את הנינג'ה גריל במצב Roast או Grill ל-200 מעלות.",
      'צלו את רצועות השווארמה במשך 11 דקות תוך ערבוב קל לקראת הסוף עד להשחמה.',
      'מלאו את הפיתה ברצועות השווארמה וזלפו טחינה מעל.',
    ],
    macros: { calories: 545, protein: 55, carbs: 38, fat: 19 },
    rating: 9.0,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190009000,
  },
  {
    id: 'dinner-1',
    title: "טוסט חלבון מושחת (צהובה 9% וקוטג')",
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80',
    categories: ['ארוחת ערב', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['טוסטר לחיצה', 'משקל מזון'],
    ingredients: [
      { id: 'd1-1', amount: 2, unit: 'יחידה', name: 'פרוסות לחם מחמצת / כפרי', calories: 180, protein: 6, carbs: 32, fat: 3 },
      { id: 'd1-2', amount: 50, unit: 'גרם', name: 'גבינה צהובה 9% (2 פרוסות)', calories: 100, protein: 15, carbs: 0, fat: 4.5 },
      { id: 'd1-3', amount: 100, unit: 'גרם', name: "קוטג' 5%", calories: 95, protein: 11, carbs: 2, fat: 5 },
      { id: 'd1-4', amount: 20, unit: 'גרם', name: 'רוטב פיצה / עגבניות איטלקי', calories: 15, protein: 0, carbs: 3, fat: 0 },
      { id: 'd1-5', amount: 1, unit: 'כפית', name: "אורגנו יבש וצ'ילי גרוס", calories: 5, protein: 0, carbs: 1, fat: 0 },
    ],
    steps: [
      "מרחו את רוטב העגבניות והקוטג' על פרוסה אחת, ופזרו מעט אורגנו.",
      'הניחו מעל את שתי פרוסות הגבינה הצהובה וסגרו עם הפרוסה השנייה.',
      'הכניסו לטוסטר לחיצה למשך 5 דקות עד שהגבינה נמסה לחלוטין והלחם פריך וזהוב.',
    ],
    macros: { calories: 395, protein: 32, carbs: 38, fat: 12.5 },
    rating: 9.3,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190010000,
  },
  {
    id: 'dinner-2',
    title: 'טורטיית ביצה, מוצרלה וירקות במחבת',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
    categories: ['ארוחת ערב', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['מחבת', 'משקל מזון'],
    ingredients: [
      { id: 'd2-1', amount: 1, unit: 'יחידה', name: 'טורטייה גדולה (כ-60 גרם)', calories: 170, protein: 4, carbs: 28, fat: 4 },
      { id: 'd2-2', amount: 2, unit: 'יחידה', name: 'ביצים (L)', calories: 140, protein: 12, carbs: 1, fat: 10 },
      { id: 'd2-3', amount: 40, unit: 'גרם', name: 'גבינת מוצרלה מגוררת 15%', calories: 105, protein: 11, carbs: 1, fat: 6 },
      { id: 'd2-4', amount: 5, unit: 'גרם', name: 'ספריי שמן זית', calories: 40, protein: 0, carbs: 0, fat: 4.5 },
    ],
    steps: [
      'טרפו 2 ביצים עם מלח ופלפל במזלג.',
      'רססו מחבת חמה במעט שמן ושפכו את הביצים, מיד הניחו את הטורטייה ישירות מעל הביצה הנוזלית.',
      'לאחר 2 דקות הפכו את הטורטייה (כשהביצה למעלה), פזרו מוצרלה על מחציתה וקפלו לחצי ירח.',
      "צלו דקה מכל צד עד להמסת הגבינה וקבלת קראנץ'.",
    ],
    macros: { calories: 455, protein: 27, carbs: 30, fat: 24.5 },
    rating: 9.1,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190011000,
  },
  {
    id: 'dinner-3',
    title: 'שקשוקה עשירה מ-3 ביצים עם לחם מחמצת',
    image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=800&q=80',
    categories: ['ארוחת ערב', 'עתיר חלבון'],
    equipment: ['מחבת עם מכסה', 'משקל מזון'],
    ingredients: [
      { id: 'd3-1', amount: 3, unit: 'יחידה', name: 'ביצים טריות (L)', calories: 210, protein: 18, carbs: 1, fat: 15 },
      { id: 'd3-2', amount: 200, unit: 'גרם', name: 'עגבניות מרוסקות / פולפה איטלקית', calories: 60, protein: 2, carbs: 11, fat: 0 },
      { id: 'd3-3', amount: 50, unit: 'גרם', name: 'פלפל אדום מתוק חתוך לקוביות', calories: 15, protein: 1, carbs: 3, fat: 0 },
      { id: 'd3-4', amount: 8, unit: 'גרם', name: 'שמן זית (כפית מלאה)', calories: 70, protein: 0, carbs: 0, fat: 8 },
      { id: 'd3-5', amount: 2, unit: 'יחידה', name: 'פרוסות לחם כפרי / מחמצת', calories: 180, protein: 6, carbs: 32, fat: 3 },
    ],
    steps: [
      'טגנו במחבת חמה את קוביות הפלפל עם שמן זית, שום, פפריקה וכמון במשך 3 דקות.',
      'הוסיפו את העגבניות המרוסקות, תבלו במלח ובשלו ברתיחה עדינה כ-5 דקות.',
      'צרו 3 גומחות ברוטב ושברו פנימה את הביצים.',
      'כסו את המחבת ובשלו על אש נמוכה 6 דקות עד שהחלבון יציב והחלמון רך ונוזלי.',
      'הגישו חם לצד פרוסות הלחם.',
    ],
    macros: { calories: 535, protein: 27, carbs: 47, fat: 26 },
    rating: 9.4,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190012000,
  },
  {
    id: 'dinner-4',
    title: "פיצה-פיתה חלבונית קראנצ'ית באייר פרייר",
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
    categories: ['ארוחת ערב', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['איירפרייר', 'משקל מזון'],
    ingredients: [
      { id: 'd4-1', amount: 1, unit: 'יחידה', name: 'פיתה קלה / מלאה חצויה לשני עיגולים', calories: 160, protein: 6, carbs: 32, fat: 1 },
      { id: 'd4-2', amount: 60, unit: 'גרם', name: 'גבינת מוצרלה מגוררת 15%', calories: 160, protein: 17, carbs: 2, fat: 9 },
      { id: 'd4-3', amount: 30, unit: 'גרם', name: 'רסק עגבניות מתובל לפיצה', calories: 25, protein: 1, carbs: 5, fat: 0 },
      { id: 'd4-4', amount: 15, unit: 'גרם', name: 'זיתים שחורים פרוסים', calories: 20, protein: 0, carbs: 1, fat: 2 },
    ],
    steps: [
      'חצו את הפיתה לשני עיגולים דקים ומירחו על שניהם את רסק העגבניות.',
      'פזרו את המוצרלה באופן שווה והניחו מעל את טבעות הזיתים ומעט אורגנו.',
      'הכניסו לאייר פרייר בחום של 190 מעלות למשך 5 דקות עד שהגבינה מבעבעת והתחתית פריכה לחלוטין.',
    ],
    macros: { calories: 365, protein: 24, carbs: 40, fat: 12 },
    rating: 9.0,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190013000,
  },
  {
    id: 'dinner-5',
    title: 'סלט ביצים, ירקות וגבינה בולגרית עם טוסטונים',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=80',
    categories: ['ארוחת ערב', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['משקל מזון'],
    ingredients: [
      { id: 'd5-1', amount: 3, unit: 'יחידה', name: 'ביצים קשות', calories: 210, protein: 18, carbs: 1, fat: 15 },
      { id: 'd5-2', amount: 50, unit: 'גרם', name: 'גבינה בולגרית / פטה 5%', calories: 55, protein: 8, carbs: 1, fat: 2.5 },
      { id: 'd5-3', amount: 150, unit: 'גרם', name: 'מלפפון, עגבנייה ופלפל קצוצים', calories: 30, protein: 1, carbs: 6, fat: 0 },
      { id: 'd5-4', amount: 10, unit: 'גרם', name: 'שמן זית ומיץ לימון סחוט', calories: 90, protein: 0, carbs: 0, fat: 10 },
      { id: 'd5-5', amount: 1, unit: 'יחידה', name: 'פיתה קלה קלויה כטוסט', calories: 160, protein: 6, carbs: 32, fat: 1 },
    ],
    steps: [
      'מעכו את הביצים הקשות בקערה בעזרת מזלג.',
      'הוסיפו את הירקות הקצוצים והגבינה הבולגרית המפוררת.',
      'תבלו בשמן זית, מיץ לימון, מלח ופלפל שחור וערבבו היטב.',
      'הגישו מיד עם משולשי פיתה קלויים וקריספיים.',
    ],
    macros: { calories: 545, protein: 33, carbs: 40, fat: 28.5 },
    rating: 8.9,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190014000,
  },
  {
    id: 'snack-1',
    title: "גלידת וניל-עוגיות עתירת חלבון בנינג'ה קרימי",
    image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&q=80',
    categories: ['נשנושים', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ["נינג'ה קרימי", 'משקל מזון'],
    ingredients: [
      { id: 's1-1', amount: 250, unit: 'מ"ל', name: 'חלב 3%', calories: 150, protein: 8, carbs: 12, fat: 8 },
      { id: 's1-2', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 's1-3', amount: 7, unit: 'גרם', name: 'אינסטנט פודינג וניל', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 's1-4', amount: 1, unit: 'יחידה', name: 'עוגיית לוטוס / אוראו מפוררת (Mix-In)', calories: 35, protein: 0, carbs: 5, fat: 1.5 },
    ],
    steps: [
      "ערבבו במכל הנינג'ה קרימי את החלב, אבקת החלבון והפודינג בעזרת מקציף ידני עד להמסה מלאה.",
      'הקפיאו במקפיא למשך 24 שעות בטמפרטורה יציבה.',
      'הכניסו למכשיר והפעילו על תוכנית Lite Ice Cream, הוסיפו עוגייה מפוררת והפעילו Mix-In.',
    ],
    macros: { calories: 325, protein: 32, carbs: 25, fat: 10.5 },
    rating: 9.8,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190015000,
  },
  {
    id: 'snack-2',
    title: 'מאג-קייק שוקולד חלבון במיקרוגל (דקה וחצי)',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80',
    categories: ['נשנושים', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['משקל מזון'],
    ingredients: [
      { id: 's2-1', amount: 30, unit: 'גרם', name: 'אבקת חלבון שוקולד', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 's2-2', amount: 20, unit: 'גרם', name: 'שיבולת שועל דקה / טחונה', calories: 75, protein: 3, carbs: 13, fat: 1.5 },
      { id: 's2-3', amount: 5, unit: 'גרם', name: 'אבקת קקאו איכותית', calories: 15, protein: 1, carbs: 1, fat: 1 },
      { id: 's2-4', amount: 60, unit: 'מ"ל', name: 'חלב 3%', calories: 35, protein: 2, carbs: 3, fat: 2 },
      { id: 's2-5', amount: 0.5, unit: 'כפית', name: 'אבקת אפייה וממתיק לפי הטעם', calories: 5, protein: 0, carbs: 1, fat: 0 },
    ],
    steps: [
      'ערבבו בספל מאג את כל המרכיבים היבשים: חלבון, שיבולת שועל, קקאו ואבקת אפייה.',
      'הוסיפו את החלב וערבבו היטב במזלג עד לקבלת בלילה אחידה ללא גושים.',
      'חממו במיקרוגל במשך 75-90 שניות עד שהעוגה תופחת ומוכנה.',
    ],
    macros: { calories: 245, protein: 30, carbs: 20, fat: 5.5 },
    rating: 9.2,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190016000,
  },
  {
    id: 'snack-3',
    title: 'שלישיית פריכיות אורז עם חמאת בוטנים ובננה',
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=800&q=80',
    categories: ['נשנושים', 'מהיר להכנה'],
    equipment: ['משקל מזון'],
    ingredients: [
      { id: 's3-1', amount: 3, unit: 'יחידה', name: 'פריכיות אורז דקות / רגילות', calories: 85, protein: 2, carbs: 18, fat: 0.5 },
      { id: 's3-2', amount: 20, unit: 'גרם', name: 'חמאת בוטנים טבעית', calories: 125, protein: 5, carbs: 4, fat: 10 },
      { id: 's3-3', amount: 60, unit: 'גרם', name: 'בננה פרוסה', calories: 55, protein: 0.5, carbs: 14, fat: 0 },
      { id: 's3-4', amount: 1, unit: 'קורט', name: 'קינמון טחון מעל', calories: 2, protein: 0, carbs: 0.5, fat: 0 },
    ],
    steps: [
      'מרחו את חמאת הבוטנים באופן אחיד על גבי 3 הפריכיות.',
      'סדרו את פרוסות הבננה מעל כל פריכית.',
      'פזרו קורט קינמון מעל ואכלו כנשנוש קריספי ומהיר לפני אימון.',
    ],
    macros: { calories: 267, protein: 7.5, carbs: 36.5, fat: 10.5 },
    rating: 9.0,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190017000,
  },
  {
    id: 'snack-4',
    title: 'קערת פרו שוקולד עם תותים ואגוזי מלך',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80',
    categories: ['נשנושים', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['משקל מזון'],
    ingredients: [
      { id: 's4-1', amount: 200, unit: 'גרם', name: 'גביע יוגורט / מעדן PRO שוקולד', calories: 125, protein: 20, carbs: 9, fat: 1 },
      { id: 's4-2', amount: 60, unit: 'גרם', name: 'תותים טריים / פירות יער חתוכים', calories: 20, protein: 0, carbs: 5, fat: 0 },
      { id: 's4-3', amount: 12, unit: 'גרם', name: 'אגוזי מלך קצוצים', calories: 80, protein: 2, carbs: 1.5, fat: 8 },
    ],
    steps: [
      'העבירו את מעדן ה-PRO לקערית נשנוש.',
      'פזרו מעל את התותים החתוכים ואת שברי אגוזי המלך.',
      'הגישו קר כנשנוש קליל ומשביע.',
    ],
    macros: { calories: 225, protein: 22, carbs: 15.5, fat: 9 },
    rating: 9.1,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190018000,
  },
  {
    id: 'snack-5',
    title: 'תפוח מקורמל בקינמון באייר פרייר עם יוגורט וניל',
    image: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=800&q=80',
    categories: ['נשנושים', 'עתיר חלבון', 'מהיר להכנה'],
    equipment: ['איירפרייר', 'משקל מזון'],
    ingredients: [
      { id: 's5-1', amount: 130, unit: 'גרם', name: 'תפוח עץ חתוך לפלחים דקים', calories: 65, protein: 0.5, carbs: 17, fat: 0 },
      { id: 's5-2', amount: 10, unit: 'גרם', name: 'סילאן טבעי', calories: 30, protein: 0, carbs: 8, fat: 0 },
      { id: 's5-3', amount: 1, unit: 'כפית', name: 'קינמון טחון', calories: 5, protein: 0, carbs: 1, fat: 0 },
      { id: 's5-4', amount: 150, unit: 'גרם', name: 'יוגורט PRO וניל להגשה לצד', calories: 90, protein: 15, carbs: 6, fat: 0.5 },
    ],
    steps: [
      'ערבבו את פלחי התפוח עם הסילאן והקינמון עד לציפוי מלא.',
      'הכניסו לסלסלת האייר פרייר בחום של 190 מעלות למשך 8 דקות עד לריכוך והשחמה.',
      'הגישו חם לצד גביע יוגורט PRO וניל קר כמטבל.',
    ],
    macros: { calories: 190, protein: 15.5, carbs: 32, fat: 0.5 },
    rating: 9.3,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190019000,
  },
];

/* --------------------------------- helpers --------------------------------- */

const TIME_REGEX = /(\d+(?:\.\d+)?)\s*(שעות|שעה|דקות|דקה|שניות|שניה)/g;

function unitToSeconds(value, unit) {
  if (unit.startsWith('שע')) return value * 3600;
  if (unit.startsWith('דק')) return value * 60;
  return value;
}

function formatSeconds(s) {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function scaleAmount(amount, multiplier) {
  const v = Number(amount || 0) * multiplier;
  const rounded = Math.round(v * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(rounded * 10 % 1 === 0 ? 1 : 2);
}

function householdConversion(value, unit) {
  const v = Number(value);
  if (!isFinite(v) || v <= 0) return '';
  const u = String(unit || '').trim();
  const isWeight = u === 'גרם';
  const isVolume = u === 'מ"ל' || u === 'מ״ל';
  if (!isWeight && !isVolume) return '';

  const TSP = 5;
  const TBSP = 15;
  const CUP = 240;
  const fmt = (n) => String(Math.round(n * 4) / 4);
  if (v >= CUP * 0.75) return `כ-${fmt(v / CUP)} כוס`;
  if (v >= TBSP) return `כ-${fmt(v / TBSP)} כף`;
  if (v >= TSP / 2) return `כ-${fmt(v / TSP)} כפית`;
  return 'פחות מכפית';
}

function compressImageFile(file, maxDim = 900, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          resolve(reader.result);
        }
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function scaleMacro(v, multiplier) {
  if (v === '' || v === undefined || v === null) return '';
  return Math.round(Number(v) * multiplier);
}

function normalizeUnit(u) {
  if (!u) return '';
  const map = { "ג'": 'גרם', מל: 'מ"ל', 'מ״ל': 'מ"ל', 'ק״ג': 'ק"ג', קג: 'ק"ג', כף: 'כפות', כפיות: 'כפית' };
  return map[u] || u;
}

function parseIngredientsPaste(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(
        /^([\d.,]+)\s*(גרם|ג'|מ"ל|מ״ל|מל|ליטר|כוסות|כוס|כפות|כף|כפית|כפיות|יחידות|יחידה|ק"ג|ק״ג|קג|חופן|קורט)?\s+(.*)$/
      );
      if (m) {
        return makeIngredient(parseFloat(m[1].replace(',', '.')) || 1, normalizeUnit(m[2]) || 'יחידה', m[3].trim());
      }
      return makeIngredient(1, 'יחידה', line);
    });
}

function parseStepsPaste(text) {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^(שלב\s*\d+[:.]?\s*|\d+[.)]\s*)/, ''))
    .filter(Boolean);
}

/* ------------------------------ AI smart import ------------------------------ */

function draftFromExtracted(parsed) {
  const ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients
        .filter((i) => i && (i.name || '').toString().trim())
        .map((i) =>
          makeIngredient(
            Number(i.amount) || 1,
            (i.unit || 'יחידה').toString(),
            (i.name || '').toString().trim(),
            i.calories ?? '',
            i.protein ?? '',
            i.carbs ?? '',
            i.fat ?? ''
          )
        )
    : [];
  return {
    title: (parsed.title || '').toString().trim(),
    image: '',
    categories: [],
    equipment: Array.isArray(parsed.equipment) ? parsed.equipment.filter(Boolean).map(String) : [],
    ingredients,
    steps: Array.isArray(parsed.steps) ? parsed.steps.filter(Boolean).map(String) : [],
    macros: {
      calories: parsed.macros?.calories ?? '',
      protein: parsed.macros?.protein ?? '',
      carbs: parsed.macros?.carbs ?? '',
      fat: parsed.macros?.fat ?? '',
    },
    rating: '',
    baseServings: 1,
    favorite: false,
  };
}

function loadRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) {}
  return DEMO_RECIPES;
}

/* -------------------------------- small UI -------------------------------- */

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-24 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
      <div className="bg-slate-900 text-slate-50 text-sm px-4 py-2.5 rounded-full shadow-lg max-w-xs text-center">
        {message}
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel = 'אישור', danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900 bg-opacity-40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium active:scale-95 transition"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium active:scale-95 transition ${
              danger ? 'bg-rose-600' : 'bg-sky-600'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SmartImportModal({ open, onClose, onExtracted }) {
  const [tab, setTab] = useState('text');
  const [pastedText, setPastedText] = useState('');
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  if (!open) return null;

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const b64 = result.slice(result.indexOf(',') + 1);
      const mimeMatch = result.slice(0, result.indexOf(',')).match(/data:(.*);base64/);
      setImageData({ base64: b64, mime: mimeMatch ? mimeMatch[1] : 'image/jpeg', previewUrl: result });
      setError('');
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setError('');
    if (tab === 'text' && !pastedText.trim()) {
      setError('הדביקו טקסט לניתוח.');
      return;
    }
    if (tab === 'image' && !imageData) {
      setError('העלו צילום מסך לניתוח.');
      return;
    }
    setLoading(true);
    try {
      const result = await extractRecipe({
        data:
          tab === 'text'
            ? { text: pastedText }
            : { imageBase64: imageData.base64, imageMime: imageData.mime },
      });
      if (!result || !result.ok) {
        setError((result && result.error) || 'אירעה שגיאה בפענוח. נסו שוב.');
        return;
      }
      const draft = draftFromExtracted(JSON.parse(result.recipeJson));
      setPastedText('');
      setImageData(null);
      onExtracted(draft);
    } catch (e) {
      setError(e.message || 'אירעה שגיאה בפענוח. נסו שוב.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setError('');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900 bg-opacity-40 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl overflow-y-auto"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif text-lg text-slate-900">✨ ייבוא חכם עם AI</h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">הדביקו פוסט או טקסט מתכון, או העלו צילום מסך — ה-AI ימלא עבורכם את כל השדות.</p>

        <div className="flex bg-slate-100 rounded-xl p-1 mb-3">
          <button
            onClick={() => setTab('text')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'text' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
          >
            הדבקת טקסט
          </button>
          <button
            onClick={() => setTab('image')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${tab === 'image' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
          >
            צילום מסך
          </button>
        </div>

        {tab === 'text' ? (
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="הדביקו כאן פוסט מאינסטגרם, מתכון מאתר, או כל טקסט חופשי..."
            rows={7}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        ) : (
          <div>
            {imageData ? (
              <div className="relative">
                <img src={imageData.previewUrl} alt="תצוגה מקדימה" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                <button
                  onClick={() => setImageData(null)}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow"
                >
                  <X className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current && fileRef.current.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-2 text-slate-500"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm">העלאת צילום מסך</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-600 mt-3 whitespace-pre-wrap break-words border border-rose-300 bg-rose-50 rounded-lg p-2">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 w-full py-3 rounded-xl bg-sky-600 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              מפענח מתכון...
            </>
          ) : (
            <>✨ פענח מתכון עם AI</>
          )}
        </button>
      </div>
    </div>
  );
}

function MacroBadge({ icon: Icon, value, label, unit = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-1.5 px-0.5 min-w-0">
      <Icon className="w-3.5 h-3.5 text-slate-400 mb-0.5 shrink-0" />
      <span className="text-xs font-bold text-slate-800 tabular-nums truncate">
        {value === '' || value === undefined ? '—' : `${value}${unit}`}
      </span>
      <span className="text-[10px] text-slate-500 truncate">{label}</span>
    </div>
  );
}

function CategoryPill({ label, active, onClick, small }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border transition whitespace-nowrap ${
        small ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
      } ${
        active
          ? 'bg-sky-600 border-sky-600 text-white font-medium'
          : 'bg-white border-slate-300 text-slate-600'
      }`}
    >
      {label}
    </button>
  );
}

function CategoryModal({ open, categories, active, onSelect, onClose }) {
  if (!open) return null;
  const all = ['הכל', ...categories];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900 bg-opacity-40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl overflow-y-auto"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-slate-900">כל הקטגוריות</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {all.map((c) => (
            <button
              key={c}
              onClick={() => { onSelect(c); onClose(); }}
              className={`rounded-xl border py-2.5 px-3 text-sm text-center transition ${
                active === c ? 'bg-sky-500 border-sky-500 text-white font-medium' : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- recipe card -------------------------------- */

function hasRating(v) {
  return v !== '' && v !== null && v !== undefined && isFinite(Number(v));
}

function formatRating(v) {
  const n = Number(v);
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function ratingBadgeClass(v) {
  const n = Number(v);
  if (!isFinite(n)) return 'bg-slate-100 text-slate-600 border-slate-200';
  if (n <= 5.0) return 'bg-red-100 text-red-700 border-red-200';
  if (n <= 7.0) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (n <= 8.0) return 'bg-lime-100 text-lime-700 border-lime-200';
  if (n <= 9.0) return 'bg-green-100 text-green-700 border-green-200';
  if (n <= 9.5) return 'bg-teal-100 text-teal-700 border-teal-200';
  return 'bg-sky-100 text-sky-700 border-sky-200';
}

function RecipeCard({ recipe, onOpen, onToggleFavorite }) {
  const [imgError, setImgError] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(recipe.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(recipe.id);
        }
      }}
      className={`text-right cursor-pointer ${getRatingCardClass(recipe.rating)} rounded-2xl border border-slate-200 overflow-hidden flex flex-col active:scale-95 transition shadow-sm hover:shadow-md`}
    >
      <div className="relative bg-slate-100" style={{ aspectRatio: '4 / 3' }}>
        {!imgError && recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100">
            <ChefHat className="w-10 h-10 text-slate-300" />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
          className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white bg-opacity-90 backdrop-blur flex items-center justify-center shadow-sm"
        >
          <Star className={`w-4 h-4 ${recipe.favorite ? 'fill-sky-500 text-sky-500' : 'text-slate-400'}`} />
        </button>
        {hasRating(recipe.rating) && (
          <span
            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold border ${ratingBadgeClass(recipe.rating)}`}
          >
            {formatRating(recipe.rating)}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="font-serif text-base leading-snug text-slate-900 line-clamp-2">{recipe.title}</h3>
        {hasRating(recipe.rating) && (
          <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{formatRating(recipe.rating)}</span>
            <span className="text-xs font-normal text-slate-500">/ 10</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {recipe.categories.slice(0, 2).map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-4 divide-x divide-x-reverse divide-slate-200 border-t border-slate-200 pt-1.5 -mx-1">
          <MacroBadge icon={Flame} value={recipe.macros.calories} label="קלוריות" />
          <MacroBadge icon={Dumbbell} value={recipe.macros.protein} label="חלבון" unit="ג'" />
          <MacroBadge icon={Wheat} value={recipe.macros.carbs} label="פחמימות" unit="ג'" />
          <MacroBadge icon={Droplet} value={recipe.macros.fat} label="שומן" unit="ג'" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- home view -------------------------------- */

function HomeView({ recipes, categories, onOpen, onToggleFavorite, onAdd, onOpenSettings, onOpenSmartImport, onAddCategory }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('הכל');
  const [favOnly, setFavOnly] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');

  const pinnedNames = useMemo(() => categories.filter((c) => c.pinned).map((c) => c.name), [categories]);
  const allNames = useMemo(() => categories.map((c) => c.name), [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipes.filter((r) => {
      if (favOnly && !r.favorite) return false;
      if (category !== 'הכל' && !r.categories.includes(category)) return false;
      if (!q) return true;
      const inTitle = r.title.toLowerCase().includes(q);
      const inIngredients = r.ingredients.some((i) => i.name.toLowerCase().includes(q));
      return inTitle || inIngredients;
    });
  }, [recipes, search, category, favOnly]);

  function submitQuickCategory(e) {
    e.preventDefault();
    const name = quickCategoryName.trim();
    if (!name) return;
    onAddCategory(name);
    setCategory(name);
    setQuickCategoryName('');
    setShowQuickCategory(false);
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-20 bg-slate-50 bg-opacity-95 backdrop-blur border-b border-slate-200">
        <div className="flex items-center justify-between px-4 pt-4">
          <div>
            <p className="text-xs text-slate-500">ברוכים הבאים</p>
            <h1 className="font-serif text-2xl text-slate-900">המתכונים שלי</h1>
          </div>
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center"
          >
            <Settings className="w-5 h-5 text-slate-600" />
          </button>
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או מצרך..."
              className="w-full bg-white border border-slate-300 rounded-full py-2.5 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center transition ${
              favOnly ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-300'
            }`}
          >
            <Star className={`w-5 h-5 ${favOnly ? 'fill-white text-white' : 'text-slate-500'}`} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <CategoryPill label="הכל" active={category === 'הכל'} onClick={() => setCategory('הכל')} />
          {pinnedNames.map((c) => (
            <CategoryPill key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
          ))}
          <button
            onClick={() => setShowCategoryModal(true)}
            className={`shrink-0 rounded-full border transition whitespace-nowrap px-3.5 py-1.5 text-sm flex items-center gap-1 ${
              category !== 'הכל' && !pinnedNames.includes(category)
                ? 'bg-sky-500 border-sky-500 text-white font-medium'
                : 'bg-white border-slate-300 text-slate-600'
            }`}
          >
            {category !== 'הכל' && !pinnedNames.includes(category) ? category : 'כל הקטגוריות'}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowQuickCategory(true)}
            className="shrink-0 rounded-full border border-sky-300 bg-sky-50 px-3.5 py-1.5 text-sm text-sky-700 flex items-center gap-1"
          >
            + קטגוריה
          </button>
        </div>
      </div>

      {showQuickCategory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900 bg-opacity-40 p-4" onClick={() => setShowQuickCategory(false)}>
          <form
            onSubmit={submitQuickCategory}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg text-slate-900">קטגוריה חדשה</h3>
              <button type="button" onClick={() => setShowQuickCategory(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <input
              autoFocus
              value={quickCategoryName}
              onChange={(e) => setQuickCategoryName(e.target.value)}
              placeholder="לדוגמה: ללא גלוטן"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button type="submit" disabled={!quickCategoryName.trim()} className="w-full mt-3 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-medium disabled:opacity-40">
              הוסף קטגוריה
            </button>
          </form>
        </div>
      )}

      <CategoryModal
        open={showCategoryModal}
        categories={allNames}
        active={category}
        onSelect={setCategory}
        onClose={() => setShowCategoryModal(false)}
      />

      <div className="px-4 mt-3">
        <button
          onClick={onOpenSmartImport}
          className="w-full flex items-center justify-between gap-2 bg-gradient-to-l from-sky-50 to-white border border-sky-200 rounded-2xl px-4 py-3 text-right"
        >
          <div>
            <p className="text-sm font-medium text-sky-800">✨ ייבוא חכם עם AI</p>
            <p className="text-xs text-sky-600">הדביקו טקסט או תמונה ואנחנו נמלא את המתכון</p>
          </div>
          <ChevronDown className="w-4 h-4 text-sky-500 shrink-0" style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>

      <div className="px-4 mt-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <ChefHat className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-700 font-medium">לא נמצאו מתכונים</p>
            <p className="text-slate-500 text-sm max-w-xs">נסו לשנות את החיפוש או לבטל סינונים</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onAdd}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-sky-600 text-white rounded-full pl-5 pr-4 py-3.5 shadow-lg flex items-center gap-2 font-medium active:scale-95 transition z-30"
      >
        <Plus className="w-5 h-5" />
        הוסף מתכון
      </button>
    </div>
  );
}

/* -------------------------------- detail view -------------------------------- */

function DetailView({ recipe, onBack, onEdit, onDelete, onToggleFavorite }) {
  const [multiplier, setMultiplier] = useState(1);
  const [customOpen, setCustomOpen] = useState(false);
  const [checkedEquipment, setCheckedEquipment] = useState({});
  const [timers, setTimers] = useState({});
  const [wakeLockOn, setWakeLockOn] = useState(false);
  const wakeLockRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const hasRunning = Object.values(timers).some((t) => t.running && t.remaining > 0);
    if (!hasRunning) return;
    const iv = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (next[k].running && next[k].remaining > 0) {
            const remaining = next[k].remaining - 1;
            next[k] = { ...next[k], remaining, running: remaining > 0 };
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [timers]);

  useEffect(() => {
    return () => {
      if (wakeLockRef.current) wakeLockRef.current.release().catch(() => {});
    };
  }, []);

  async function toggleWakeLock() {
    try {
      if (!wakeLockOn) {
        if ('wakeLock' in navigator) {
          const wl = await navigator.wakeLock.request('screen');
          wakeLockRef.current = wl;
          wl.addEventListener('release', () => setWakeLockOn(false));
          setWakeLockOn(true);
        }
      } else {
        if (wakeLockRef.current) await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockOn(false);
      }
    } catch (e) {}
  }

  function toggleTimer(key, totalSeconds) {
    setTimers((prev) => {
      const cur = prev[key];
      if (!cur || cur.remaining <= 0) {
        return { ...prev, [key]: { total: totalSeconds, remaining: totalSeconds, running: true } };
      }
      return { ...prev, [key]: { ...cur, running: !cur.running } };
    });
  }

  function resetTimer(key, totalSeconds, e) {
    e.stopPropagation();
    setTimers((prev) => ({ ...prev, [key]: { total: totalSeconds, remaining: totalSeconds, running: false } }));
  }

  function renderStepWithTimers(text, stepId) {
    const parts = [];
    let lastIndex = 0;
    let idx = 0;
    const regex = new RegExp(TIME_REGEX);
    let m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIndex) parts.push(<span key={`${stepId}-pre-${idx}`}>{text.slice(lastIndex, m.index)}</span>);
      const value = parseFloat(m[1]);
      const seconds = unitToSeconds(value, m[2]);
      const key = `${stepId}_${idx}`;
      const t = timers[key];
      const running = t && t.running;
      const finished = t && t.remaining <= 0;
      parts.push(
        <span key={`${stepId}-btn-${idx}`} className="inline-flex items-center gap-1 mx-1 align-middle">
          <button
            onClick={() => toggleTimer(key, seconds)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-sm transition ${
              finished
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : running
                ? 'bg-sky-600 border-sky-600 text-white'
                : 'bg-sky-50 border-sky-300 text-sky-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {t ? formatSeconds(t.remaining) : m[0]}
            {finished && <Check className="w-3.5 h-3.5" />}
          </button>
          {t && t.remaining !== t.total && (
            <button
              onClick={(e) => resetTimer(key, seconds, e)}
              className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </span>
      );
      lastIndex = regex.lastIndex;
      idx++;
    }
    if (lastIndex < text.length) parts.push(<span key={`${stepId}-rest`}>{text.slice(lastIndex)}</span>);
    return parts;
  }

  const scaledMacros = {
    calories: scaleMacro(recipe.macros.calories, multiplier),
    protein: scaleMacro(recipe.macros.protein, multiplier),
    carbs: scaleMacro(recipe.macros.carbs, multiplier),
    fat: scaleMacro(recipe.macros.fat, multiplier),
  };

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-20 bg-slate-50 bg-opacity-95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(recipe.id)}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center"
          >
            <Star className={`w-5 h-5 ${recipe.favorite ? 'fill-sky-500 text-sky-500' : 'text-slate-400'}`} />
          </button>
          <button
            onClick={() => onEdit(recipe)}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center"
          >
            <Pencil className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
          </button>
        </div>
      </div>

      <div className="relative bg-slate-100" style={{ aspectRatio: '16 / 10' }}>
        <img
          src={recipe.image}
          alt={recipe.title}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="px-4 -mt-6 relative">
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
          <h1 className="font-serif text-2xl text-slate-900 leading-tight">{recipe.title}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipe.categories.map((c) => (
              <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">
                {c}
              </span>
            ))}
          </div>

          {hasRating(recipe.rating) && (
            <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border ${ratingBadgeClass(recipe.rating)}`}>
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              דירוג {formatRating(recipe.rating)} מתוך 10
            </div>
          )}

          <div className="mt-4 grid grid-cols-4 divide-x divide-x-reverse divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
            <MacroBadge icon={Flame} value={scaledMacros.calories} label="קלוריות" />
            <MacroBadge icon={Dumbbell} value={scaledMacros.protein} label="חלבון" unit="ג'" />
            <MacroBadge icon={Wheat} value={scaledMacros.carbs} label="פחמימות" unit="ג'" />
            <MacroBadge icon={Droplet} value={scaledMacros.fat} label="שומן" unit="ג'" />
          </div>
        </div>

        {/* portion scaler */}
        <div className="mt-4 flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-3">
          <span className="text-sm text-slate-600">כמות מנות</span>
          <div className="inline-flex bg-slate-100 rounded-full p-1">
            {[1, 1.5, 2].map((p) => (
              <button
                key={p}
                onClick={() => { setMultiplier(p); setCustomOpen(false); }}
                className={`px-3 py-1.5 rounded-full text-sm transition ${
                  multiplier === p && !customOpen ? 'bg-sky-600 text-white' : 'text-slate-600'
                }`}
              >
                {p}x
              </button>
            ))}
            <button
              onClick={() => setCustomOpen((v) => !v)}
              className={`px-3 py-1.5 rounded-full text-sm transition ${customOpen ? 'bg-sky-600 text-white' : 'text-slate-600'}`}
            >
              מותאם
            </button>
          </div>
        </div>
        {customOpen && (
          <div className="mt-2 flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-3">
            <span className="text-sm text-slate-500 shrink-0">מכפיל אישי:</span>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={multiplier}
              onChange={(e) => setMultiplier(Math.max(0.25, parseFloat(e.target.value) || 1))}
              className="w-24 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center"
            />
          </div>
        )}

        {/* equipment */}
        {recipe.equipment.length > 0 && (
          <section className="mt-6">
            <h2 className="font-serif text-lg text-slate-900 mb-2">ציוד ומכשור נדרש</h2>
            <div className="grid grid-cols-2 gap-2">
              {recipe.equipment.map((eq, i) => {
                const Icon = getEquipmentIcon(eq);
                const checked = checkedEquipment[i];
                return (
                  <button
                    key={i}
                    onClick={() => setCheckedEquipment((prev) => ({ ...prev, [i]: !prev[i] }))}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-sm text-right transition ${
                      checked ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${checked ? 'bg-sky-600' : 'bg-slate-100'}`}>
                      {checked ? <Check className="w-3.5 h-3.5 text-white" /> : <Icon className="w-3.5 h-3.5 text-slate-500" />}
                    </span>
                    <span className="leading-tight">{eq}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ingredients */}
        <section className="mt-6">
          <h2 className="font-serif text-lg text-slate-900 mb-2">מצרכים וערכים</h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {recipe.ingredients.map((ing) => {
              const hasMacro = [ing.calories, ing.protein, ing.carbs, ing.fat].some((v) => v !== '' && v !== undefined);
              return (
                <div key={ing.id} className="flex items-center justify-between px-3.5 py-2.5 gap-2">
                  <span className="text-sm text-slate-800">{ing.name}</span>
                  <div className="text-left shrink-0">
                    <span className="text-sm font-medium text-slate-900 tabular-nums">
                      {scaleAmount(ing.amount, multiplier)} {ing.unit}
                      {householdConversion(Number(ing.amount || 0) * multiplier, ing.unit) && (
                        <span className="text-xs text-slate-400 font-normal">
                          {' '}({householdConversion(Number(ing.amount || 0) * multiplier, ing.unit)})
                        </span>
                      )}
                    </span>

                    {hasMacro && (
                      <div className="text-xs text-slate-400 tabular-nums">
                        {ing.calories !== '' && `${scaleMacro(ing.calories, multiplier)} קק"ל `}
                        {ing.protein !== '' && `· ${scaleMacro(ing.protein, multiplier)}ג' חלבון`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* steps */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-lg text-slate-900">אופן ההכנה</h2>
            <button
              onClick={toggleWakeLock}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition ${
                wakeLockOn ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              {wakeLockOn ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              מסך דולק
            </button>
          </div>
          <ol className="flex flex-col gap-3">
            {recipe.steps.map((step, i) => (
              <li key={i} className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <span className="inline-block text-xs font-medium text-sky-700 bg-sky-50 rounded-full px-2.5 py-0.5 mb-2">
                  שלב {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">{renderStepWithTimers(step, `s${i}`)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="מחיקת מתכון"
        message={`האם למחוק את "${recipe.title}"?`}
        confirmLabel="מחק"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete(recipe.id); }}
      />
    </div>
  );
}

/* -------------------------------- form view -------------------------------- */

function emptyRecipeForm() {
  return {
    id: null,
    title: '',
    image: '',
    categories: [],
    equipment: [],
    ingredients: [],
    steps: [],
    macros: { calories: '', protein: '', carbs: '', fat: '' },
    rating: '',
    baseServings: 1,
    favorite: false,
  };
}

function FormView({ initial, categories, onCancel, onSave, onAddCategory }) {
  const [form, setForm] = useState(() => (initial ? JSON.parse(JSON.stringify(initial)) : emptyRecipeForm()));
  const [equipInput, setEquipInput] = useState('');
  const [ingPaste, setIngPaste] = useState('');
  const [stepPaste, setStepPaste] = useState('');
  const [expandedIng, setExpandedIng] = useState({});
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const fileInputRef = useRef(null);

  function applySmartImportDraft(draft) {
    setForm((f) => ({
      ...f,
      title: draft.title || f.title,
      equipment: draft.equipment.length ? draft.equipment : f.equipment,
      ingredients: draft.ingredients.length ? draft.ingredients : f.ingredients,
      steps: draft.steps.length ? draft.steps : f.steps,
      macros: {
        calories: draft.macros.calories !== '' ? draft.macros.calories : f.macros.calories,
        protein: draft.macros.protein !== '' ? draft.macros.protein : f.macros.protein,
        carbs: draft.macros.carbs !== '' ? draft.macros.carbs : f.macros.carbs,
        fat: draft.macros.fat !== '' ? draft.macros.fat : f.macros.fat,
      },
    }));
    setShowSmartImport(false);
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleCategory(c) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c],
    }));
  }

  function addCategory() {
    const name = categoryInput.trim();
    if (!name) return;
    onAddCategory(name);
    setForm((f) => ({ ...f, categories: f.categories.includes(name) ? f.categories : [...f.categories, name] }));
    setCategoryInput('');
  }

  function addEquipment() {
    if (!equipInput.trim()) return;
    setForm((f) => ({ ...f, equipment: [...f.equipment, equipInput.trim()] }));
    setEquipInput('');
  }

  function removeEquipment(i) {
    setForm((f) => ({ ...f, equipment: f.equipment.filter((_, idx) => idx !== i) }));
  }

  function addBlankIngredient() {
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, makeIngredient(1, 'גרם', '')] }));
  }

  function updateIngredient(id, field, value) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)),
    }));
  }

  function removeIngredient(id) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((ing) => ing.id !== id) }));
  }

  function applyIngredientPaste() {
    if (!ingPaste.trim()) return;
    setForm((f) => ({ ...f, ingredients: [...f.ingredients, ...parseIngredientsPaste(ingPaste)] }));
    setIngPaste('');
  }

  function addBlankStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, ''] }));
  }

  function updateStep(i, value) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => (idx === i ? value : s)) }));
  }

  function removeStep(i) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  }

  function applyStepPaste() {
    if (!stepPaste.trim()) return;
    setForm((f) => ({ ...f, steps: [...f.steps, ...parseStepsPaste(stepPaste)] }));
    setStepPaste('');
  }

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    compressImageFile(file).then((dataUrl) => {
      if (dataUrl) update('image', dataUrl);
    });
  }

  function handleSubmit() {
    if (!form.title.trim()) return;
    const clean = {
      ...form,
      id: form.id || uid(),
      title: form.title.trim(),
      ingredients: form.ingredients.filter((i) => i.name.trim()),
      steps: form.steps.filter((s) => s.trim()),
      createdAt: form.createdAt || Date.now(),
    };
    onSave(clean);
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-20 bg-slate-50 bg-opacity-95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 py-3">
        <button onClick={onCancel} className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center">
          <X className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-serif text-lg text-slate-900">{initial ? 'עריכת מתכון' : 'מתכון חדש'}</h1>
        <div className="w-9" />
      </div>

      <div className="px-4 mt-4 flex flex-col gap-6">
        <button
          onClick={() => setShowSmartImport(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 text-sky-700 text-sm font-medium"
        >
          ✨ ייבוא חכם עם AI — מלאו את הטופס אוטומטית
        </button>

        {/* title & image */}
        <div>
          <label className="text-sm text-slate-600 mb-1 block">שם המתכון</label>
          <input
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="לדוגמה: פסטו תרד ביתי"
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="text-sm text-slate-600 mb-1 block">תמונה</label>
          <div className="flex gap-2">
            <input
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
              placeholder="הדביקו כתובת URL של תמונה"
              className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"
            >
              <ImagePlus className="w-5 h-5 text-slate-600" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
          {form.image && (
            <img src={form.image} alt="תצוגה מקדימה" className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-200" />
          )}
        </div>

        {/* categories */}
        <div>
          <label className="text-sm text-slate-600 mb-1 block">קטגוריות</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <CategoryPill key={c} label={c} active={form.categories.includes(c)} onClick={() => toggleCategory(c)} />
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              placeholder="קטגוריה חדשה"
              className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <button onClick={addCategory} className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0" aria-label="הוסף קטגוריה">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* rating */}
        <div>
          <label className="text-sm text-slate-600 mb-1 block">דירוג המתכון (1 עד 10)</label>
          <input
            type="number"
            min="1"
            max="10"
            step="0.1"
            value={form.rating}
            onChange={(e) => update('rating', e.target.value === '' ? '' : normalizeRating(e.target.value))}
            placeholder="לדוגמה: 8.5"
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
          />
        </div>

        {/* macros */}
        <div>
          <label className="text-sm text-slate-600 mb-1 block">ערכים תזונתיים כוללים (למנה בסיסית x1)</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              ['calories', 'קלוריות'],
              ['protein', "חלבון (ג')"],
              ['carbs', "פחמימות (ג')"],
              ['fat', "שומן (ג')"],
            ].map(([key, label]) => (
              <div key={key}>
                <input
                  type="number"
                  value={form.macros[key]}
                  onChange={(e) => update('macros', { ...form.macros, [key]: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-2 py-2 text-sm text-center"
                />
                <p className="text-xs text-slate-500 text-center mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* equipment */}
        <div>
          <label className="text-sm text-slate-600 mb-1 block">ציוד ומכשור נדרש</label>
          <div className="flex gap-2 mb-2">
            <input
              value={equipInput}
              onChange={(e) => setEquipInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
              placeholder="מכשור מרכזי בלבד (נינג'ה גריל, בלנדר, משקל מזון)"
              className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
            />
            <button onClick={addEquipment} className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.equipment.map((eq, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-slate-100 rounded-full pl-2 pr-3 py-1 text-sm text-slate-700">
                {eq}
                <button onClick={() => removeEquipment(i)}>
                  <X className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ingredients */}
        <div>
          <label className="text-sm text-slate-600 mb-1 block">מצרכים</label>
          <textarea
            value={ingPaste}
            onChange={(e) => setIngPaste(e.target.value)}
            placeholder={'הדביקו רשימת מצרכים (שורה לכל מצרך)'}
            rows={3}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button onClick={applyIngredientPaste} className="mt-1 text-sm text-sky-700 font-medium">
            פרק לרשימה מובנית ←
          </button>

          <div className="flex flex-col gap-2 mt-3">
            {form.ingredients.map((ing) => (
              <div key={ing.id} className="border border-slate-200 rounded-xl p-2.5">
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(ing.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                    className="border border-slate-300 rounded-lg px-1.5 py-1.5 text-sm"
                  >
                    {UNIT_LIST.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    value={ing.name}
                    onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                    placeholder="שם המצרך"
                    className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => setExpandedIng((prev) => ({ ...prev, [ing.id]: !prev[ing.id] }))}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"
                  >
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition ${expandedIng[ing.id] ? 'rotate-180' : ''}`} />
                  </button>
                  <button onClick={() => removeIngredient(ing.id)} className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  </button>
                </div>
                {expandedIng[ing.id] && (
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {['calories', 'protein', 'carbs', 'fat'].map((k) => (
                      <input
                        key={k}
                        type="number"
                        value={ing[k]}
                        onChange={(e) => updateIngredient(ing.id, k, e.target.value)}
                        placeholder={k === 'calories' ? 'קק"ל' : k === 'protein' ? "חלבון" : k === 'carbs' ? "פחמימות" : "שומן"}
                        className="border border-slate-200 rounded-lg px-1.5 py-1.5 text-xs text-center"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={addBlankIngredient} className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
            <Plus className="w-4 h-4" /> הוסף מצרך ידנית
          </button>
        </div>

        {/* steps */}
        <div>
          <label className="text-sm text-slate-600 mb-1 block">אופן ההכנה</label>
          <textarea
            value={stepPaste}
            onChange={(e) => setStepPaste(e.target.value)}
            placeholder={'הדביקו את שלבי ההכנה (שורה לכל שלב)'}
            rows={3}
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm"
          />
          <button onClick={applyStepPaste} className="mt-1 text-sm text-sky-700 font-medium">
            פרק לרשימת שלבים ←
          </button>

          <div className="flex flex-col gap-2 mt-3">
            {form.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2 text-xs font-medium text-sky-700 bg-sky-50 rounded-full px-2 py-0.5 shrink-0">{i + 1}</span>
                <textarea
                  value={s}
                  onChange={(e) => updateStep(i, e.target.value)}
                  rows={2}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
                <button onClick={() => removeStep(i)} className="w-8 h-8 mt-1 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addBlankStep} className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
            <Plus className="w-4 h-4" /> הוסף שלב ידנית
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-slate-50 bg-opacity-95 backdrop-blur border-t border-slate-200 p-4 flex gap-2">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium">
          ביטול
        </button>
        <button
          onClick={handleSubmit}
          disabled={!form.title.trim()}
          className="flex-1 py-3 rounded-xl bg-sky-600 text-white font-medium disabled:opacity-40"
        >
          שמירת מתכון
        </button>
      </div>

      <SmartImportModal
        open={showSmartImport}
        onClose={() => setShowSmartImport(false)}
        onExtracted={applySmartImportDraft}
      />
    </div>
  );
}

/* -------------------------------- settings view -------------------------------- */

function SettingsView({ recipes, categories, onBack, onImport, onResetDemo, notify, onAddCategory, onDeleteCategory, onTogglePinCategory, onMoveCategory }) {
  const fileRef = useRef(null);
  const [confirmReset, setConfirmReset] = useState(false);

  function exportData() {
    const blob = new Blob([JSON.stringify({ recipes, categories }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `גיבוי-מתכונים-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notify('הנתונים יוצאו בהצלחה');
  }

  function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        onImport(parsed);
        notify('הנתונים יובאו בהצלחה');
      } catch (err) {
        notify('הקובץ אינו תקין');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="pb-16">
      <div className="sticky top-0 z-20 bg-slate-50 bg-opacity-95 backdrop-blur border-b border-slate-200 flex items-center gap-3 px-4 py-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="font-serif text-lg text-slate-900">הגדרות</h1>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-serif text-base text-slate-900 mb-1">ייבוא חכם עם AI</h2>
          <p className="text-sm text-slate-500">
            הייבוא החכם פועל דרך השרת של האפליקציה — אין צורך במפתח אישי.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-serif text-base text-slate-900 mb-1">גיבוי ושחזור</h2>
          <div className="flex flex-col gap-2 mt-3">
            <button onClick={exportData} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium">
              <Download className="w-4 h-4" /> ייצוא נתונים
            </button>
            <button
              onClick={() => fileRef.current && fileRef.current.click()}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium"
            >
              <Upload className="w-4 h-4" /> ייבוא נתונים
            </button>
            <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-serif text-base text-slate-900 mb-1">איפוס נתונים</h2>
          <button onClick={() => setConfirmReset(true)} className="mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-300 text-rose-700 text-sm font-medium w-full">
            איפוס לנתוני דמו
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmReset}
        title="איפוס נתונים"
        message="פעולה זו תמחק את כל השינויים ותחזיר את נתוני הדמו. להמשיך?"
        confirmLabel="איפוס"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { setConfirmReset(false); onResetDemo(); notify('הנתונים אופסו'); }}
      />
    </div>
  );
}

/* ----------------------------------- main app ----------------------------------- */

export default function RecipeApp() {
  const [recipes, setRecipes] = useState([]);
  const [recipesLoaded, setRecipesLoaded] = useState(false);
  const lastSyncedRef = useRef([]);
  const [categories, setCategories] = useState(loadCategories);

  const [view, setView] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [toast, setToast] = useState('');
  const [showSmartImportHome, setShowSmartImportHome] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchRecipes();
        if (cancelled) return;
        if (rows && rows.length) {
          lastSyncedRef.current = rows;
          setRecipes(rows);
        } else {
          const seeded = loadRecipes();
          await upsertRecipes(seeded);
          if (cancelled) return;
          lastSyncedRef.current = seeded;
          setRecipes(seeded);
        }
      } catch (e) {
        if (!cancelled) setRecipes(loadRecipes());
      } finally {
        if (!cancelled) setRecipesLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!recipesLoaded) return;
    const previous = lastSyncedRef.current;
    lastSyncedRef.current = recipes;
    syncRecipes(previous, recipes).catch(() => {
      setToast('שמירה בענן נכשלה, נסו שוב');
    });
  }, [recipes, recipesLoaded]);

  useEffect(() => saveCategories(categories), [categories]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function notify(msg) {
    setToast(msg);
  }

  function openRecipe(id) {
    setSelectedId(id);
    setView('detail');
  }

  function toggleFavorite(id) {
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)));
  }

  function startAdd() {
    setEditingRecipe(null);
    setView('form');
  }

  function startEdit(recipe) {
    setEditingRecipe(recipe);
    setView('form');
  }

  function saveRecipe(recipe) {
    setRecipes((rs) => {
      const exists = rs.some((r) => r.id === recipe.id);
      return exists ? rs.map((r) => (r.id === recipe.id ? recipe : r)) : [recipe, ...rs];
    });
    setSelectedId(recipe.id);
    notify('המתכון נשמר בהצלחה');
    setView('detail');
  }

  function deleteRecipe(id) {
    setRecipes((rs) => rs.filter((r) => r.id !== id));
    notify('המתכון נמחק');
    setView('home');
  }

  function handleImport(parsed) {
    if (Array.isArray(parsed)) {
      setRecipes(parsed);
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.recipes)) setRecipes(parsed.recipes);
      if (Array.isArray(parsed.categories)) setCategories(parsed.categories);
    }
  }

  function addCategory(name) {
    setCategories((current) => {
      if (current.some((category) => category.name.toLowerCase() === name.toLowerCase())) return current;
      return [...current, { id: uid(), name, pinned: false }];
    });
    notify('הקטגוריה נוספה');
  }

  function resetDemo() {
    setRecipes(DEMO_RECIPES);
    setCategories(defaultCategories());
    setView('home');
  }

  function handleHomeSmartImportExtracted(draft) {
    setEditingRecipe({ ...emptyRecipeForm(), ...draft });
    setShowSmartImportHome(false);
    setView('form');
  }

  const selectedRecipe = recipes.find((r) => r.id === selectedId) || null;

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "'Assistant', sans-serif" }}>
      <div className="max-w-lg mx-auto min-h-screen bg-slate-50 relative">
        {view === 'home' && (
          <HomeView
            recipes={recipes}
            categories={categories}
            onOpen={openRecipe}
            onToggleFavorite={toggleFavorite}
            onAdd={startAdd}
            onOpenSettings={() => setView('settings')}
            onOpenSmartImport={() => setShowSmartImportHome(true)}
            onAddCategory={addCategory}
          />
        )}
        {view === 'detail' && selectedRecipe && (
          <DetailView
            recipe={selectedRecipe}
            onBack={() => setView('home')}
            onEdit={startEdit}
            onDelete={deleteRecipe}
            onToggleFavorite={toggleFavorite}
          />
        )}
        {view === 'form' && (
          <FormView
            initial={editingRecipe}
            categories={categories.map((c) => c.name)}
            onCancel={() => setView(editingRecipe && editingRecipe.id ? 'detail' : 'home')}
            onSave={saveRecipe}
            onAddCategory={addCategory}
          />
        )}
        {view === 'settings' && (
          <SettingsView
            recipes={recipes}
            categories={categories}
            onBack={() => setView('home')}
            onImport={handleImport}
            onResetDemo={resetDemo}
            notify={notify}
          />
        )}
      </div>

      <SmartImportModal
        open={showSmartImportHome}
        onClose={() => setShowSmartImportHome(false)}
        onExtracted={handleHomeSmartImportExtracted}
      />

      <Toast message={toast} />
    </div>
  );
}