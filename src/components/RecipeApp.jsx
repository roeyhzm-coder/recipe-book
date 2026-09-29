import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchRecipes, syncRecipes, upsertRecipes, isSoftDeleteSupported } from '@/lib/recipes-db';
import { extractRecipe } from '@/lib/extract-recipe.functions';
import {
  Search, Star, Plus, X, ArrowRight, Settings, Download, Upload,
  Trash2, Pencil, Check, Clock, RotateCcw, Sun, Moon, Flame, Scale,
  UtensilsCrossed, Snowflake, Thermometer, Timer as TimerIcon, Soup,
  Refrigerator, Wrench, ChefHat, Utensils, ImagePlus, ChevronDown, ChevronUp,
  Dumbbell, Wheat, Droplet, AlertTriangle, ShoppingCart, Pin, EyeOff, Eye, GripVertical
} from 'lucide-react';
import { useGroceryLists } from '@/hooks/useGroceryLists';
import BottomNav from '@/components/grocery/BottomNav';
import GroceryLists from '@/components/grocery/GroceryLists';
import AddToGroceryModal from '@/components/grocery/AddToGroceryModal';
import { MEAL_PREP_RECIPES } from '@/data/meal-prep-recipes';
import { SIDE_DISH_RECIPES } from '@/data/side-dishes';
import { WEEKEND_CATEGORY, WEEKEND_RECIPES } from '@/data/weekend-recipes';

/* ---------------------------------- data & storage ---------------------------------- */

const STORAGE_KEY = 'mitbach_recipes_v1';
const CATEGORIES_STORAGE_KEY = 'mitbach_categories_v1';
const MERGED_CATEGORIES_STORAGE_KEY = 'mitbach_merged_categories_v1';
const HOME_CATEGORY_STORAGE_KEY = 'mitbach_home_category_v1';
const SAFETY_BACKUP_KEY = 'recipes_safety_backup';
const MAX_SAFETY_SNAPSHOTS = 5;
const PROTEIN_SCOOP_GRAMS = 25;

const ICE_CREAM_CATEGORY_NAMES = ['גלידות חלבון', "נינג'ה קרימי", 'דל קלוריות'];
const QUICK_SIDE_CATEGORY_NAMES = ['מהיר וקליל', 'תוספות בריאות'];
const AUTO_MERGED_CATEGORY_NAMES = [...ICE_CREAM_CATEGORY_NAMES, 'עוף', ...QUICK_SIDE_CATEGORY_NAMES, WEEKEND_CATEGORY];
const DEFAULT_CATEGORY_NAMES = [
  'ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'עתיר חלבון', 'בשרי', 'נשנושים', 'גלידות',
  'דגים', 'דל פחמימה', 'קינוחים', 'שייקים', 'סלטים', 'מהיר להכנה', 'Meal Prep', 'עוף',
  WEEKEND_CATEGORY,
  ...QUICK_SIDE_CATEGORY_NAMES,
  ...ICE_CREAM_CATEGORY_NAMES,
];
const PINNED_BY_DEFAULT = ['ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'עתיר חלבון', 'גלידות חלבון', WEEKEND_CATEGORY];
const UNIT_LIST = ['גרם', 'ק"ג', 'מ"ל', 'ליטר', 'כוס', 'כפות', 'כפית', 'יחידה', 'חופן', 'קורט'];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function isProtectedCategory(name) {
  return String(name || '') === 'הכל';
}

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
  if (value > 8.0) return 'bg-emerald-50';
  if (value > 7.0) return 'bg-lime-50';
  if (value > 5.0) return 'bg-amber-50';
  return 'bg-rose-50';
}

function defaultCategories() {
  return DEFAULT_CATEGORY_NAMES.map((name) => ({
    id: uid(),
    name,
    pinned: PINNED_BY_DEFAULT.includes(name),
    hidden: false,
  }));
}

// Categories added after a user's list was saved are merged in once, so deleting them later sticks.
function mergeNewCategories(categories) {
  let merged = [];
  try {
    merged = JSON.parse(localStorage.getItem(MERGED_CATEGORIES_STORAGE_KEY) || '[]');
  } catch (e) {}
  const pending = AUTO_MERGED_CATEGORY_NAMES.filter(
    (name) => !merged.includes(name) && !categories.some((c) => c.name === name)
  );
  try {
    localStorage.setItem(MERGED_CATEGORIES_STORAGE_KEY, JSON.stringify([...new Set([...merged, ...AUTO_MERGED_CATEGORY_NAMES])]));
  } catch (e) {}
  if (!pending.length) return categories.map(normalizeCategory);
  return [
    ...categories.map(normalizeCategory),
    ...pending.map((name) => ({
      id: uid(),
      name,
      pinned: PINNED_BY_DEFAULT.includes(name),
      hidden: false,
    })),
  ];
}

function normalizeCategory(category) {
  if (!category || typeof category !== 'object') return null;
  return {
    id: category.id || uid(),
    name: String(category.name || '').trim(),
    pinned: !!category.pinned,
    hidden: !!category.hidden,
  };
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return mergeNewCategories(parsed.map(normalizeCategory).filter((c) => c && c.name));
      }
    }
  } catch (e) {}
  return defaultCategories();
}

function saveCategories(categories) {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {}
}

function loadHomeCategory() {
  try {
    const raw = sessionStorage.getItem(HOME_CATEGORY_STORAGE_KEY);
    if (raw) return raw;
  } catch (e) {}
  return 'הכל';
}

function saveHomeCategory(category) {
  try {
    sessionStorage.setItem(HOME_CATEGORY_STORAGE_KEY, category || 'הכל');
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

// Selecting "גלידות" also matches sub-categories such as "גלידות חלבון".
const PREFIX_MATCH_CATEGORIES = ['גלידות'];

function recipeCategoryMatches(recipeCategory, selected) {
  if (recipeCategory === selected) return true;
  return PREFIX_MATCH_CATEGORIES.includes(selected) && String(recipeCategory).startsWith(selected);
}

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
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281024?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1599921841143-8190e5a557aa?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80',
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
    image: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=800&q=80',
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
  {
    id: 'snack-6',
    title: 'כדורי שוקולד חלבון עשירים',
    image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80',
    categories: ['נשנושים', 'עתיר חלבון', 'חטיפי חלבון', 'קינוחים', 'מהיר להכנה', 'ללא אפייה'],
    equipment: ['משקל מזון', 'קערה', 'מקרר'],
    ingredients: [
      { id: 's6-1', amount: 60, unit: 'גרם', name: 'אבקת חלבון בטעם שוקולד (או וניל) – 2 סקופים', calories: 230, protein: 48, carbs: 4, fat: 2 },
      { id: 's6-2', amount: 80, unit: 'גרם', name: 'שיבולת שועל דקה (או טחונה)', calories: 295, protein: 11, carbs: 51, fat: 5 },
      { id: 's6-3', amount: 15, unit: 'גרם', name: 'אבקת קקאו איכותית ללא סוכר (כף וחצי)', calories: 45, protein: 3, carbs: 3, fat: 3 },
      { id: 's6-4', amount: 50, unit: 'גרם', name: 'חמאת בוטנים טבעית (כ-2 כפות גדושות)', calories: 310, protein: 12.5, carbs: 10, fat: 25 },
      { id: 's6-5', amount: 30, unit: 'גרם', name: 'סילאן טבעי או סירופ מייפל טהור (2 כפות)', calories: 90, protein: 0, carbs: 22, fat: 0 },
      { id: 's6-6', amount: 50, unit: 'מ"ל', name: 'חלב (או חלב צמחי/מים) – להוסיף בהדרגה לפי הצורך', calories: 30, protein: 1.7, carbs: 2.4, fat: 1.6 },
      { id: 's6-7', amount: 1, unit: 'קורט', name: 'מלח דק', calories: 0, protein: 0, carbs: 0, fat: 0 },
      { id: 's6-8', amount: 15, unit: 'גרם', name: 'לציפוי (אופציונלי): קוקוס טחון או מעט אבקת קקאו', calories: 90, protein: 1, carbs: 3.5, fat: 8.5 },
    ],
    steps: [
      'בקערה בינונית מערבבים היטב את היבשים: שיבולת שועל, אבקת חלבון, קקאו וקורט מלח.',
      'מוסיפים את חמאת הבוטנים והסילאן ומערבבים.',
      'מוסיפים את החלב בהדרגה (כף אחרי כף) ומערבבים בידיים עד לקבלת בצק אחיד, רך ונוח לכדרור.',
      'יוצרים 10 כדורים שווים בגודלם.',
      'מגלגלים בקוקוס טחון או קקאו לציפוי (לא חובה).',
      'מעבירים למקרר בכלי אטום לחצי שעה להתייצבות.',
    ],
    macros: { calories: 99, protein: 7.4, carbs: 8.6, fat: 3.8 },
    prepTime: 10,
    cookTime: 0,
    rating: 9.4,
    baseServings: 10,
    favorite: false,
    createdAt: 1727190020000,
  },
  {
    id: 'creami-1',
    title: 'סורבה אבטיח וליים מרענן',
    image: '/recipes/creami_02.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'דל קלוריות'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'בלנדר'],
    ingredients: [
      { id: 'cr1-1', amount: 300, unit: 'גרם', name: 'אבטיח טרי חתוך', calories: 90, protein: 2, carbs: 22, fat: 0 },
      { id: 'cr1-2', amount: 115, unit: 'גרם', name: 'מים', calories: 0, protein: 0, carbs: 0, fat: 0 },
      { id: 'cr1-3', amount: 15, unit: 'גרם', name: 'מיץ מחצי ליים סחוט', calories: 2, protein: 0, carbs: 0, fat: 0 },
      { id: 'cr1-4', amount: 5, unit: 'גרם', name: 'ממתיק אפס קלוריות', calories: 0, protein: 0, carbs: 0, fat: 0 },
      { id: 'cr1-5', amount: 1, unit: 'קורט', name: 'מלח ים', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ],
    steps: [
      'טחנו את כל המרכיבים בבלנדר קטן עד לקבלת מרקם חלק לחלוטין.',
      'מזגו למכל נינג\'ה קרימי והקפיאו ללא מכסה (למניעת גבעה במרכז) למשך 24 שעות.',
      'הכניסו למכשיר והפעילו על תוכנית Sorbet.',
      'הפעילו פעם נוספת על תוכנית Sorbet לקבלת מרקם ברד איטלקי מושלם.',
    ],
    macros: { calories: 92, protein: 2, carbs: 22, fat: 0 },
    rating: 9.0,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190021000,
  },
  {
    id: 'creami-2',
    title: 'סורבה תותים איטלקי',
    image: '/recipes/creami_03.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'דל קלוריות'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'בלנדר'],
    ingredients: [
      { id: 'cr2-1', amount: 300, unit: 'גרם', name: 'תותים טריים', calories: 96, protein: 2, carbs: 24, fat: 0 },
      { id: 'cr2-2', amount: 130, unit: 'גרם', name: 'מים', calories: 0, protein: 0, carbs: 0, fat: 0 },
      { id: 'cr2-3', amount: 6, unit: 'גרם', name: 'ממתיק אפס קלוריות', calories: 0, protein: 0, carbs: 0, fat: 0 },
      { id: 'cr2-4', amount: 1, unit: 'קורט', name: 'מלח ים', calories: 0, protein: 0, carbs: 0, fat: 0 },
    ],
    steps: [
      'טחנו את כל המרכיבים בבלנדר ומזגו למכל הקרימי. הקפיאו במקפיא.',
      'לפני העירבול, שטפו את דפנות המכל במים חמים למשך 60 שניות כדי למנוע הידבקות קרח לדפנות.',
      'הפעילו על תוכנית Sorbet ולאחר מכן בצעו Re-spin.',
      "צרו גומה במרכז, הוסיפו תוספות רצויות (כגון שוקולד צ'יפס) והפעילו Mix-in.",
    ],
    macros: { calories: 96, protein: 2, carbs: 24, fat: 0 },
    rating: 9.1,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190022000,
  },
  {
    id: 'creami-3',
    title: 'גלידת פרוסטד לימונדה חלבון',
    image: '/recipes/creami_04.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr3-1', amount: 220, unit: 'גרם', name: 'דיאט לימונדה', calories: 5, protein: 0, carbs: 1, fat: 0 },
      { id: 'cr3-2', amount: 240, unit: 'גרם', name: 'חלב דל שומן / מועשר בחלבון', calories: 100, protein: 13, carbs: 12, fat: 0 },
      { id: 'cr3-3', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 22, carbs: 2, fat: 1 },
      { id: 'cr3-4', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג שוקולד לבן ללא סוכר', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr3-5', amount: 15, unit: 'גרם', name: 'מיץ וגרידת חצי לימון', calories: 5, protein: 0, carbs: 1, fat: 0 },
    ],
    steps: [
      'ערבבו במכל את הלימונדה, החלב, אבקת החלבון, הפודינג, מיץ וגרידת הלימון והממתיק עד לקבלת בלילה חלקה.',
      'הקפיאו במקפיא למשך הלילה.',
      'הכניסו למכשיר והפעילו פעם אחת בלבד על תוכנית Lite Ice Cream.',
    ],
    macros: { calories: 246, protein: 35, carbs: 22, fat: 2 },
    rating: 9.2,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190023000,
  },
  {
    id: 'creami-4',
    title: 'גלידת וניל קלאסית (75 קלוריות)',
    image: '/recipes/creami_05.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'דל קלוריות'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr4-1', amount: 400, unit: 'גרם', name: 'חלב שקדים ללא סוכר בטעם וניל', calories: 40, protein: 2, carbs: 2, fat: 4 },
      { id: 'cr4-2', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג וניל ללא סוכר', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr4-3', amount: 1, unit: 'גרם', name: 'קסנטן גאם', calories: 5, protein: 0, carbs: 0, fat: 0 },
      { id: 'cr4-4', amount: 5, unit: 'גרם', name: 'תמצית וניל איכותית וממתיק', calories: 5, protein: 0, carbs: 0, fat: 0 },
    ],
    steps: [
      'ערבבו את כל המרכיבים במכל הקרימי באמצעות מקציף חלב ידני והקפיאו למשך הלילה.',
      'שטפו את דפנות המכל במים חמים למשך 60 שניות.',
      'הפעילו על תוכנית Lite Ice Cream. אם המרקם מעט פירורי, הוסיפו שלוק קטן של חלב שקדים ובצעו Re-spin.',
    ],
    macros: { calories: 75, protein: 2, carbs: 8, fat: 4 },
    rating: 8.9,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190024000,
  },
  {
    id: 'creami-5',
    title: 'גלידת עוגת יום הולדת חלבון',
    image: '/recipes/creami_06.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr5-1', amount: 225, unit: 'גרם', name: 'חלב מועשר בחלבון דל שומן', calories: 90, protein: 12, carbs: 8, fat: 0 },
      { id: 'cr5-2', amount: 225, unit: 'גרם', name: 'חלב שקדים ללא סוכר', calories: 25, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr5-3', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 23, carbs: 2, fat: 1 },
      { id: 'cr5-4', amount: 8, unit: 'גרם', name: "אינסטנט פודינג צ'יזקייק ללא סוכר", calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr5-5', amount: 20, unit: 'גרם', name: 'סוכריות צבעוניות (Mix-in)', calories: 80, protein: 0, carbs: 18, fat: 1 },
    ],
    steps: [
      'ערבבו את כל המרכיבים (למעט הסוכריות) בעזרת מקציף והקפיאו ל-24 שעות.',
      'הוציאו ושטפו את הדפנות במים חמים לדקה. הפעילו על תוכנית Lite Ice Cream.',
      'צרו גומה במרכז, שפכו את הסוכריות הצבעוניות והפעילו על תוכנית Mix-in.',
    ],
    macros: { calories: 255, protein: 36, carbs: 17, fat: 4 },
    rating: 9.4,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190025000,
  },
  {
    id: 'creami-6',
    title: "גלידת צ'יזקייק תות חלבון",
    image: '/recipes/creami_07.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'בלנדר'],
    ingredients: [
      { id: 'cr6-1', amount: 200, unit: 'גרם', name: 'תותים טריים', calories: 65, protein: 1, carbs: 15, fat: 0 },
      { id: 'cr6-2', amount: 240, unit: 'גרם', name: 'חלב מועשר בחלבון דל שומן', calories: 100, protein: 13, carbs: 9, fat: 0 },
      { id: 'cr6-3', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr6-4', amount: 8, unit: 'גרם', name: "אינסטנט פודינג צ'יזקייק ללא סוכר", calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr6-5', amount: 28, unit: 'גרם', name: 'קוביות גבינת שמנת מופחתת שומן קפואות (Mix-in)', calories: 50, protein: 2, carbs: 2, fat: 4 },
      { id: 'cr6-6', amount: 15, unit: 'גרם', name: 'עוגיית פתיבר / קרקר מפורר (Mix-in)', calories: 60, protein: 1, carbs: 11, fat: 1 },
    ],
    steps: [
      'טחנו בבלנדר תותים, חלב, אבקת חלבון, פודינג וממתיק. מזגו למכל והקפיאו למשך הלילה.',
      'הקפיאו בנפרד קוביות גבינת שמנת עבור התוספת.',
      'הפעילו על תוכנית Lite Ice Cream.',
      'צרו גומה במרכז, הוסיפו את קוביות הגבינה, תותים טריים ועוגיות מפוררות והפעילו Mix-in.',
    ],
    macros: { calories: 350, protein: 46, carbs: 38, fat: 2 },
    rating: 9.6,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190026000,
  },
  {
    id: 'creami-7',
    title: 'גלידת חלב דגנים פרוטי פבלס',
    image: '/recipes/creami_08.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מסננת'],
    ingredients: [
      { id: 'cr7-1', amount: 240, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 100, protein: 13, carbs: 9, fat: 0 },
      { id: 'cr7-2', amount: 240, unit: 'גרם', name: 'חלב שקדים', calories: 30, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr7-3', amount: 56, unit: 'גרם', name: 'דגני בוקר צבעוניים (להשריה)', calories: 80, protein: 1, carbs: 18, fat: 1 },
      { id: 'cr7-4', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr7-5', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג שוקולד לבן ללא סוכר', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr7-6', amount: 21, unit: 'גרם', name: 'דגנים פריכים לתוספת (Mix-in)', calories: 80, protein: 1, carbs: 18, fat: 1 },
    ],
    steps: [
      'השרו את דגני הבוקר בשני סוגי החלב במקרר למשך 6-7 שעות וסננו היטב לקבלת חלב בטעם דגנים.',
      'הוסיפו חלב להשלמת הנפח, ערבבו עם אבקת החלבון והפודינג והקפיאו למשך הלילה.',
      'הפעילו על תוכנית Lite Ice Cream פעם אחת.',
      'צרו גומה במרכז, הוסיפו דגנים פריכים והפעילו Mix-in.',
    ],
    macros: { calories: 284, protein: 36, carbs: 26, fat: 4 },
    rating: 9.3,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190027000,
  },
  {
    id: 'creami-8',
    title: "גלידת צ'יזקייק סינמון טוסט קראנץ'",
    image: '/recipes/creami_09.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr8-1', amount: 225, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 90, protein: 12, carbs: 8, fat: 0 },
      { id: 'cr8-2', amount: 225, unit: 'גרם', name: 'חלב שקדים וניל', calories: 25, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr8-3', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr8-4', amount: 15, unit: 'גרם', name: 'אבקת חמאת בוטנים / אבקת עוגיות', calories: 60, protein: 7, carbs: 4, fat: 1.5 },
      { id: 'cr8-5', amount: 8, unit: 'גרם', name: "אינסטנט פודינג צ'יזקייק ללא סוכר וקינמון", calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr8-6', amount: 10, unit: 'גרם', name: "דגני סינמון טוסט קראנץ' (Mix-in)", calories: 40, protein: 1, carbs: 8, fat: 1 },
    ],
    steps: [
      'ערבבו את כל המרכיבים (פרט לתוספות) במקציף והקפיאו למשך הלילה.',
      'הפעילו על תוכנית Ice Cream פעם אחת.',
      "צרו גומה במרכז, הוסיפו קוביות גבינת שמנת קפואות ודגני סינמון טוסט קראנץ' והפעילו Mix-in.",
    ],
    macros: { calories: 301, protein: 44, carbs: 20, fat: 5 },
    rating: 9.5,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190028000,
  },
  {
    id: 'creami-9',
    title: 'גלידת חלב דגנים סינמון טוסט',
    image: '/recipes/creami_10.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מסננת'],
    ingredients: [
      { id: 'cr9-1', amount: 240, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 100, protein: 13, carbs: 9, fat: 0 },
      { id: 'cr9-2', amount: 240, unit: 'גרם', name: 'חלב שקדים', calories: 30, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr9-3', amount: 56, unit: 'גרם', name: "דגני סינמון טוסט קראנץ' (להשריה)", calories: 80, protein: 1, carbs: 17, fat: 1 },
      { id: 'cr9-4', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr9-5', amount: 8, unit: 'גרם', name: "אינסטנט פודינג צ'יזקייק ללא סוכר וקינמון", calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr9-6', amount: 21, unit: 'גרם', name: 'דגני סינמון טוסט לתוספת (Mix-in)', calories: 85, protein: 1, carbs: 17, fat: 2 },
    ],
    steps: [
      'השרו את דגני הקינמון בחלב למשך 6-7 שעות וסננו היטב.',
      'השלימו חלב, ערבבו עם אבקת החלבון והפודינג והקפיאו ל-24 שעות.',
      'הפעילו על תוכנית Lite Ice Cream.',
      "הוסיפו דגני סינמון קראנצ'יים במרכז והפעילו Mix-in.",
    ],
    macros: { calories: 284, protein: 36, carbs: 26, fat: 4 },
    rating: 9.4,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190029000,
  },
  {
    id: 'creami-10',
    title: 'גלידת פאי תפוחים חלבון',
    image: '/recipes/creami_11.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr10-1', amount: 240, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 100, protein: 13, carbs: 9, fat: 0 },
      { id: 'cr10-2', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 23, carbs: 2, fat: 1 },
      { id: 'cr10-3', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג שוקולד לבן ללא סוכר', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr10-4', amount: 200, unit: 'גרם', name: 'מלית תפוחי עץ ללא תוספת סוכר וקינמון', calories: 80, protein: 0, carbs: 20, fat: 0 },
      { id: 'cr10-5', amount: 2, unit: 'יחידה', name: 'עוגיות לוטוס / ביסקוף (Mix-in)', calories: 75, protein: 1, carbs: 11, fat: 3 },
    ],
    steps: [
      'ערבבו את החלב, אבקת החלבון, הפודינג והתבלינים. קפלו פנימה את מלית התפוחים והקפיאו ללילה.',
      'הפעילו על תוכנית Lite Ice Cream פעם אחת.',
      'צרו גומה, הוסיפו 2 עוגיות לוטוס שבורות והפעילו Mix-in.',
    ],
    macros: { calories: 285, protein: 36, carbs: 33, fat: 1 },
    rating: 9.5,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190030000,
  },
  {
    id: 'creami-11',
    title: 'גלידת פאי דלעת ותבלינים',
    image: '/recipes/creami_12.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'דל קלוריות'],
    equipment: ["נינג'ה קרימי", 'משקל מזון'],
    ingredients: [
      { id: 'cr11-1', amount: 60, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 230, protein: 46, carbs: 4, fat: 2 },
      { id: 'cr11-2', amount: 300, unit: 'גרם', name: 'מחית דלעת טבעית ללא סוכר', calories: 78, protein: 2, carbs: 18, fat: 0.5 },
      { id: 'cr11-3', amount: 3, unit: 'גרם', name: "תערובת תבליני פאי דלעת (קינמון, ג'ינג'ר, מוסקט)", calories: 5, protein: 0, carbs: 1, fat: 0 },
      { id: 'cr11-4', amount: 225, unit: 'גרם', name: 'קצפת קלה / חלבון מוקצף דל שומן', calories: 80, protein: 2, carbs: 10, fat: 2 },
    ],
    steps: [
      'ערבבו את אבקת החלבון והתבלינים עם מעט מים קרים למרקם של זיגוג.',
      'קפלו פנימה את מחית הדלעת והקצפת הקלה בעדינות.',
      'מזגו לתבנית או מכל והקפיאו לפחות 6 שעות עד להתייצבות מלאה.',
    ],
    macros: { calories: 80, protein: 6, carbs: 13, fat: 0.5 },
    rating: 8.8,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190031000,
  },
  {
    id: 'creami-12',
    title: "גלידת קפה אוריאו שוקולד צ'יפ",
    image: '/recipes/creami_13.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr12-1', amount: 240, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 100, protein: 13, carbs: 9, fat: 0 },
      { id: 'cr12-2', amount: 240, unit: 'גרם', name: 'קפה קולד ברו (נטול קפאין או רגיל)', calories: 5, protein: 0, carbs: 1, fat: 0 },
      { id: 'cr12-3', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr12-4', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג שוקולד לבן ללא סוכר', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr12-5', amount: 2, unit: 'יחידה', name: 'עוגיות אוריאו דקות (Oreo Thins)', calories: 65, protein: 1, carbs: 10, fat: 2.5 },
      { id: 'cr12-6', amount: 10, unit: 'גרם', name: "מיני שוקולד צ'יפס מריר", calories: 50, protein: 1, carbs: 6, fat: 3 },
    ],
    steps: [
      'ערבבו את הקפה, החלב, אבקת החלבון, הפודינג והממתיק והקפיאו ל-24 שעות.',
      'הפעילו על תוכנית Lite Ice Cream.',
      "צרו גומה במרכז, פזרו את עוגיות האוריאו והשוקולד צ'יפס והפעילו Mix-in.",
    ],
    macros: { calories: 226, protein: 36, carbs: 16, fat: 2 },
    rating: 9.4,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190032000,
  },
  {
    id: 'creami-13',
    title: 'גלידת לוטוס בתוספת חלבון',
    image: '/recipes/creami_14.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr13-1', amount: 225, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 90, protein: 12, carbs: 8, fat: 0 },
      { id: 'cr13-2', amount: 225, unit: 'גרם', name: 'חלב שקדים וניל', calories: 25, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr13-3', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr13-4', amount: 8, unit: 'גרם', name: "אינסטנט פודינג צ'יזקייק ללא סוכר", calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr13-5', amount: 16, unit: 'גרם', name: 'ממרח לוטוס מומס (Mix-in)', calories: 95, protein: 0, carbs: 9, fat: 6 },
      { id: 'cr13-6', amount: 2, unit: 'יחידה', name: 'עוגיות לוטוס שבורות (Mix-in)', calories: 75, protein: 1, carbs: 11, fat: 3 },
    ],
    steps: [
      'ערבבו את החלב, חלב השקדים, אבקת החלבון והפודינג במקציף והקפיאו ל-24 שעות.',
      'הפעילו על תוכנית Lite Ice Cream פעם אחת לקבלת גלידת וניל קרמית.',
      'צרו גומה במרכז, שפכו את ממרח הלוטוס ואת העוגיות המפוררות והפעילו תוכנית Mix-in.',
    ],
    macros: { calories: 400, protein: 38, carbs: 35, fat: 12 },
    rating: 9.8,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190033000,
  },
  {
    id: 'creami-14',
    title: "גלידת קראנץ' בר חלבון",
    image: '/recipes/creami_15.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון'],
    ingredients: [
      { id: 'cr14-1', amount: 225, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 90, protein: 12, carbs: 8, fat: 0 },
      { id: 'cr14-2', amount: 225, unit: 'גרם', name: 'חלב שקדים', calories: 25, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr14-3', amount: 30, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr14-4', amount: 8, unit: 'גרם', name: "אינסטנט פודינג צ'יזקייק ללא סוכר", calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr14-5', amount: 1, unit: 'יחידה', name: "חטיף שוקולד קראנץ' קטן (Mix-in)", calories: 60, protein: 1, carbs: 8, fat: 3 },
      { id: 'cr14-6', amount: 20, unit: 'גרם', name: "שוקולד צ'יפס מומס מעורבב עם פצפוצי אורז (ציפוי קראנץ')", calories: 100, protein: 1, carbs: 14, fat: 4 },
    ],
    steps: [
      'ערבבו את רכיבי הבסיס והקפיאו ל-24 שעות.',
      'הפעילו על תוכנית Lite Ice Cream, הוסיפו את חטיף השוקולד בגומה במרכז והפעילו Mix-in.',
      'ערבבו 10 גרם שוקולד מומס עם 10 גרם פצפוצי אורז, מרחו כשכבה עליונה והחזירו למקפיא לחצי שעה לקבלת מעטפת מתפצחת.',
    ],
    macros: { calories: 393, protein: 38, carbs: 40, fat: 9 },
    rating: 9.5,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190034000,
  },
  {
    id: 'creami-15',
    title: 'גלידת קוסמיק בראוני שוקולד עשיר',
    image: '/recipes/creami_16.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr15-1', amount: 225, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 90, protein: 12, carbs: 8, fat: 0 },
      { id: 'cr15-2', amount: 225, unit: 'גרם', name: 'חלב שקדים', calories: 25, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr15-3', amount: 30, unit: 'גרם', name: 'אבקת חלבון שוקולד', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr15-4', amount: 10, unit: 'גרם', name: 'אבקת עוגיות שוקולד / בראוני', calories: 35, protein: 4, carbs: 2, fat: 1 },
      { id: 'cr15-5', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג שוקולד לבן ללא סוכר', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr15-6', amount: 5, unit: 'גרם', name: 'קקאו כהה איכותי (Black Cocoa)', calories: 15, protein: 1, carbs: 1, fat: 1 },
    ],
    steps: [
      'ערבבו את כל המרכיבים בעזרת מקציף עד לקבלת בלילת שוקולד כהה ואחידה.',
      'הקפיאו ל-24 שעות במקפיא.',
      "הפעילו על תוכנית Ice Cream פעם אחת עד לקבלת מרקם פאדג'י עשיר.",
    ],
    macros: { calories: 297, protein: 42, carbs: 21, fat: 5 },
    rating: 9.6,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190035000,
  },
  {
    id: 'creami-16',
    title: 'גלידת חלב דגנים ריסז פאפס',
    image: '/recipes/creami_17.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מסננת'],
    ingredients: [
      { id: 'cr16-1', amount: 240, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 100, protein: 13, carbs: 9, fat: 0 },
      { id: 'cr16-2', amount: 240, unit: 'גרם', name: 'חלב שקדים', calories: 30, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr16-3', amount: 56, unit: 'גרם', name: 'דגני ריסז פאפס (להשריה)', calories: 85, protein: 2, carbs: 16, fat: 2 },
      { id: 'cr16-4', amount: 15, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 58, protein: 12, carbs: 1, fat: 0.5 },
      { id: 'cr16-5', amount: 30, unit: 'גרם', name: 'אבקת חמאת בוטנים (PB2)', calories: 110, protein: 12, carbs: 8, fat: 2.5 },
      { id: 'cr16-6', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג באטרסקוטש / וניל', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr16-7', amount: 15, unit: 'גרם', name: 'דגני ריסז פאפס פריכים (Mix-in)', calories: 65, protein: 1, carbs: 11, fat: 2 },
    ],
    steps: [
      'השרו את דגני הריסז בשני סוגי החלב ל-6 שעות וסננו היטב.',
      'השלימו חלב, הוסיפו אבקת חלבון, אבקת חמאת בוטנים ופודינג והקפיאו ל-24 שעות.',
      'הפעילו על תוכנית Ice Cream, צרו גומה והוסיפו דגני ריסז פאפס בתוכנית Mix-in.',
    ],
    macros: { calories: 351, protein: 41, carbs: 31, fat: 7 },
    rating: 9.4,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190036000,
  },
  {
    id: 'creami-17',
    title: 'גלידת ריסז חמאת בוטנים עשירה',
    image: '/recipes/creami_18.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr17-1', amount: 225, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 90, protein: 12, carbs: 8, fat: 0 },
      { id: 'cr17-2', amount: 225, unit: 'גרם', name: 'חלב שקדים', calories: 25, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr17-3', amount: 15, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 58, protein: 12, carbs: 1, fat: 0.5 },
      { id: 'cr17-4', amount: 30, unit: 'גרם', name: 'אבקת חמאת בוטנים (PB2)', calories: 110, protein: 12, carbs: 8, fat: 2.5 },
      { id: 'cr17-5', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג באטרסקוטש / וניל', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr17-6', amount: 1, unit: 'יחידה', name: 'חטיף ריסז קאפ קטן חתוך (Mix-in)', calories: 85, protein: 2, carbs: 9, fat: 5 },
    ],
    steps: [
      'ערבבו את כל מרכיבי הבסיס בעזרת מקציף והקפיאו למשך הלילה.',
      'הפעילו על תוכנית Lite Ice Cream פעם אחת.',
      'צרו גומה במרכז, הוסיפו את חטיף הריסז הקצוץ והפעילו Mix-in.',
    ],
    macros: { calories: 404, protein: 53, carbs: 30, fat: 8 },
    rating: 9.7,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190037000,
  },
  {
    id: 'creami-18',
    title: 'גלידת חלב דגנים אוריאו',
    image: '/recipes/creami_19.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מסננת'],
    ingredients: [
      { id: 'cr18-1', amount: 240, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 100, protein: 13, carbs: 9, fat: 0 },
      { id: 'cr18-2', amount: 240, unit: 'גרם', name: 'חלב שקדים', calories: 30, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr18-3', amount: 56, unit: 'גרם', name: 'דגני בוקר אוריאו (להשריה)', calories: 85, protein: 1, carbs: 18, fat: 1.5 },
      { id: 'cr18-4', amount: 30, unit: 'גרם', name: 'אבקת חלבון שוקולד', calories: 115, protein: 24, carbs: 2, fat: 1 },
      { id: 'cr18-5', amount: 12, unit: 'גרם', name: 'קקאו כהה (Black Cocoa)', calories: 25, protein: 2, carbs: 2, fat: 1 },
      { id: 'cr18-6', amount: 8, unit: 'גרם', name: "אינסטנט פודינג צ'יזקייק ללא סוכר", calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr18-7', amount: 2, unit: 'יחידה', name: 'עוגיות אוריאו דקות (Mix-in)', calories: 65, protein: 1, carbs: 10, fat: 2.5 },
    ],
    steps: [
      'השרו את דגני האוריאו בחלב למשך 6 שעות וסננו היטב.',
      'השלימו חלב, ערבבו עם אבקת החלבון, הקקאו והפודינג והקפיאו ל-24 שעות.',
      'הפעילו על תוכנית Lite Ice Cream, הוסיפו עוגיות אוריאו שבורות והפעילו Mix-in.',
    ],
    macros: { calories: 301, protein: 38, carbs: 26, fat: 5 },
    rating: 9.3,
    baseServings: 1,
    favorite: false,
    createdAt: 1727190038000,
  },
  {
    id: 'creami-19',
    title: 'גלידת אוריאו עוגיות ושמנת',
    image: '/recipes/creami_20.jpg',
    categories: ['גלידות', 'גלידות חלבון', "נינג'ה קרימי", 'עתיר חלבון'],
    equipment: ["נינג'ה קרימי", 'משקל מזון', 'מקציף ידני'],
    ingredients: [
      { id: 'cr19-1', amount: 225, unit: 'גרם', name: 'חלב מועשר דל שומן', calories: 90, protein: 12, carbs: 8, fat: 0 },
      { id: 'cr19-2', amount: 225, unit: 'גרם', name: 'חלב שקדים וניל', calories: 25, protein: 1, carbs: 1, fat: 2 },
      { id: 'cr19-3', amount: 15, unit: 'גרם', name: 'אבקת חלבון וניל', calories: 58, protein: 12, carbs: 1, fat: 0.5 },
      { id: 'cr19-4', amount: 8, unit: 'גרם', name: 'אינסטנט פודינג שוקולד לבן ללא סוכר', calories: 25, protein: 0, carbs: 6, fat: 0 },
      { id: 'cr19-5', amount: 4, unit: 'יחידה', name: 'עוגיות אוריאו דקות (Mix-in)', calories: 130, protein: 2, carbs: 20, fat: 5 },
    ],
    steps: [
      'ערבבו את רכיבי הבסיס במקציף ידני והקפיאו למשך 24 שעות.',
      'הפעילו על תוכנית Lite Ice Cream פעם אחת.',
      'צרו גומה במרכז, הוסיפו 4 עוגיות אוריאו דקות שבורות והפעילו Mix-in.',
    ],
    macros: { calories: 255, protein: 53, carbs: 30, fat: 8 },
    rating: 9.6,
    baseServings: 1,
    favorite: true,
    createdAt: 1727190039000,
  },
  ...MEAL_PREP_RECIPES,
  ...SIDE_DISH_RECIPES,
  ...WEEKEND_RECIPES,
];

function parseMinutes(value) {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : '';
}

function guessRecipeTimes(recipe) {
  const hay = [recipe.id, recipe.title, ...(recipe.categories || []), ...(recipe.equipment || [])]
    .join(' ')
    .toLowerCase();
  if (hay.includes('קרימי') || hay.includes('גליד') || hay.includes('creami')) return { prepTime: 8, cookTime: 3 };
  if (hay.includes('overnight') || hay.includes('קרה')) return { prepTime: 5, cookTime: 0 };
  if (hay.includes('ארוחת בוקר')) return { prepTime: 5, cookTime: 5 };
  if (hay.includes('אייר') || hay.includes('נינג')) return { prepTime: 8, cookTime: 12 };
  if (hay.includes('meal prep')) return { prepTime: 15, cookTime: 25 };
  if (hay.includes('ארוחת ערב')) return { prepTime: 8, cookTime: 10 };
  if (hay.includes('נשנוש') || String(recipe.id || '').startsWith('snack')) return { prepTime: 5, cookTime: 3 };
  return { prepTime: 10, cookTime: 15 };
}

function ensureRecipeTimes(recipe) {
  const prepTime = parseMinutes(recipe.prepTime);
  const cookTime = parseMinutes(recipe.cookTime);
  if (prepTime !== '' && cookTime !== '') return { ...recipe, prepTime, cookTime };
  const guessed = guessRecipeTimes(recipe);
  return {
    ...recipe,
    prepTime: prepTime === '' ? guessed.prepTime : prepTime,
    cookTime: cookTime === '' ? guessed.cookTime : cookTime,
  };
}

function totalRecipeMinutes(recipe) {
  const prep = Number(recipe?.prepTime);
  const cook = Number(recipe?.cookTime);
  const total = (Number.isFinite(prep) ? prep : 0) + (Number.isFinite(cook) ? cook : 0);
  return total > 0 ? total : null;
}

function isGenericRecipeImage(image) {
  const value = String(image || '');
  return !value || value.includes('unsplash.com');
}

function patchSystemRecipes(recipes) {
  const byId = new Map(DEMO_RECIPES.map((recipe) => [String(recipe.id), recipe]));
  return recipes.map((recipe) => {
    const system = byId.get(String(recipe.id));
    if (!system) return ensureRecipeTimes(recipe);
    const existingCategories = Array.isArray(recipe.categories) ? recipe.categories : [];
    const systemCategories = Array.isArray(system.categories) ? system.categories : [];
    const categories = [...existingCategories];
    for (const cat of systemCategories) {
      if (!categories.includes(cat)) categories.push(cat);
    }
    return ensureRecipeTimes({
      ...recipe,
      image: isGenericRecipeImage(recipe.image) ? system.image : recipe.image,
      categories,
      prepTime: parseMinutes(recipe.prepTime) === '' ? system.prepTime : recipe.prepTime,
      cookTime: parseMinutes(recipe.cookTime) === '' ? system.cookTime : recipe.cookTime,
    });
  });
}

// Merge any DEMO_RECIPES entry that is not yet in the user's list (by id) into local/cloud state.
function appendMissingSystemRecipes(recipes) {
  const existingIds = new Set(recipes.map((r) => String(r.id)));
  const missing = DEMO_RECIPES.filter((r) => !existingIds.has(String(r.id)));
  return patchSystemRecipes(missing.length ? [...recipes, ...missing] : recipes);
}

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

function isProteinPowderName(name) {
  const text = String(name || '').toLowerCase();
  return /אבקת\s*חלבון|חלבון\s*(וניל|שוקולד|איזולט|טבע|בננה|תות)|protein\s*powder|whey/.test(text);
}

function amountToGrams(amount, unit) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  const u = String(unit || '').trim();
  if (u === 'גרם' || u === "ג'") return value;
  if (u === 'ק"ג' || u === 'ק״ג') return value * 1000;
  return null;
}

/** MyProtein scoop standard: 1 scoop = 25g. */
function proteinScoopLabel(amount, unit, name) {
  if (!isProteinPowderName(name)) return '';
  const grams = amountToGrams(amount, unit);
  if (grams == null) return '';
  const scoops = Math.round((grams / PROTEIN_SCOOP_GRAMS) * 10) / 10;
  if (scoops <= 0) return '';
  const whole = Number.isInteger(scoops);
  const formatted = whole ? String(scoops) : String(scoops);
  if (whole && scoops === 1) return '1 סקופ';
  return whole ? `${formatted} סקופ` : `כ-${formatted} סקופ`;
}

function ingredientSecondaryLabel(amount, unit, name) {
  const scoop = proteinScoopLabel(amount, unit, name);
  if (scoop) return scoop;
  return householdConversion(amount, unit);
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

function loadLocalRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveLocalRecipes(recipes) {
  if (!recipes.length) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch (e) {}
}

function mergeRecipesById(current, incoming) {
  const incomingById = new Map(incoming.map((r) => [String(r.id), r]));
  const currentIds = new Set(current.map((r) => String(r.id)));
  return [
    ...current.map((r) => incomingById.get(String(r.id)) ?? r),
    ...incoming.filter((r) => !currentIds.has(String(r.id))),
  ];
}

function loadSafetySnapshots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAFETY_BACKUP_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

// Newest first; older snapshots are dropped when localStorage runs out of space.
function saveSafetySnapshot(reason, recipes) {
  if (!recipes.length) return;
  let snapshots = [
    { id: uid(), createdAt: Date.now(), reason, recipes },
    ...loadSafetySnapshots(),
  ].slice(0, MAX_SAFETY_SNAPSHOTS);
  while (snapshots.length) {
    try {
      localStorage.setItem(SAFETY_BACKUP_KEY, JSON.stringify(snapshots));
      return;
    } catch (e) {
      snapshots = snapshots.slice(0, -1);
    }
  }
}

/* -------------------------------- small UI -------------------------------- */

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-32 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
      <div className="bg-stone-800 text-stone-900 text-sm px-5 py-3 rounded-full shadow-lg border border-stone-200 backdrop-blur-md max-w-xs text-center">
        {message}
      </div>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel = 'אישור', danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-stone-200 backdrop-blur-xl">
        <div className="flex items-start gap-3 mb-2">
          <div className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-stone-900">{title}</h3>
            <p className="text-sm text-stone-500 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 min-h-11 py-2.5 rounded-xl border border-stone-200 text-stone-800 text-sm font-medium active:scale-95 transition hover:bg-stone-100"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 min-h-11 py-2.5 rounded-xl text-white text-sm font-medium active:scale-95 transition ${
              danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-500 text-amber-950 hover:bg-amber-400'
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto border border-stone-200 backdrop-blur-xl"
        style={{ maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-serif text-xl text-stone-900">✨ ייבוא חכם עם AI</h3>
          <button
            onClick={handleClose}
            disabled={loading}
            className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <p className="text-sm text-stone-500 mb-5 leading-relaxed">הדביקו פוסט או טקסט מתכון, או העלו צילום מסך — ה-AI ימלא עבורכם את כל השדות.</p>

        <div className="flex bg-stone-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setTab('text')}
            className={`flex-1 min-h-11 py-2 rounded-lg text-sm font-medium transition ${tab === 'text' ? 'bg-amber-500 text-amber-950 shadow-sm' : 'text-stone-500'}`}
          >
            הדבקת טקסט
          </button>
          <button
            onClick={() => setTab('image')}
            className={`flex-1 min-h-11 py-2 rounded-lg text-sm font-medium transition ${tab === 'image' ? 'bg-amber-500 text-amber-950 shadow-sm' : 'text-stone-500'}`}
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
            className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
          />
        ) : (
          <div>
            {imageData ? (
              <div className="relative">
                <img src={imageData.previewUrl} alt="תצוגה מקדימה" className="w-full h-48 object-cover rounded-xl border border-stone-200" />
                <button
                  onClick={() => setImageData(null)}
                  className="absolute top-2 left-2 min-h-11 min-w-11 w-11 h-11 rounded-full bg-white/90 border border-stone-200 flex items-center justify-center shadow"
                >
                  <X className="w-3.5 h-3.5 text-stone-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current && fileRef.current.click()}
                className="w-full h-40 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 text-stone-500 hover:border-amber-400 hover:text-amber-700 transition"
              >
                <ImagePlus className="w-6 h-6" />
                <span className="text-sm">העלאת צילום מסך</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-700 mt-3 whitespace-pre-wrap break-words border border-rose-200 bg-rose-50 rounded-xl p-3">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-5 w-full min-h-11 py-3 rounded-xl bg-amber-500 text-amber-950 font-medium flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-amber-400 transition"
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
    <div className="flex flex-col items-center justify-center py-2 px-1 min-w-0">
      <Icon className="w-3.5 h-3.5 text-emerald-700 mb-1 shrink-0" />
      <span className="text-xs font-bold text-emerald-800 tabular-nums truncate">
        {value === '' || value === undefined ? '—' : `${value}${unit}`}
      </span>
      <span className="text-[10px] text-emerald-600 truncate">{label}</span>
    </div>
  );
}

function CategoryPill({ label, active, onClick, onDelete, small }) {
  const canDelete = typeof onDelete === 'function' && !isProtectedCategory(label);
  return (
    <div
      className={`shrink-0 rounded-full border transition whitespace-nowrap inline-flex items-center ${
        small ? 'min-h-8 text-xs' : 'min-h-11 text-sm'
      } ${
        active
          ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={
          canDelete
            ? small
              ? 'pl-2.5 pr-1 py-1'
              : 'pl-4 pr-1.5 py-2'
            : small
              ? 'px-2.5 py-1'
              : 'px-4 py-2'
        }
      >
        {label}
      </button>
      {canDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(label);
          }}
          className={`inline-flex items-center justify-center rounded-full mr-1.5 ${
            small ? 'w-5 h-5 min-w-5' : 'w-6 h-6 min-w-6 min-h-6'
          } ${
            active
              ? 'bg-amber-950/15 text-amber-950 hover:bg-amber-950/25'
              : 'bg-stone-100 text-stone-500 hover:bg-rose-50 hover:text-rose-600'
          }`}
          aria-label={`מחק קטגוריה ${label}`}
          title="מחק קטגוריה"
        >
          <X className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

function CategoryModal({ open, categories, active, onSelect, onClose, onManage, manageMode }) {
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (!open) setPendingDelete(null);
  }, [open]);

  if (!open) return null;
  const visible = categories.filter((c) => !c.hidden);
  const all = manageMode ? categories : [{ id: 'all', name: 'הכל', pinned: false, hidden: false }, ...visible];

  function requestDelete(name) {
    if (isProtectedCategory(name)) return;
    setPendingDelete(name);
  }

  function confirmDelete() {
    if (!pendingDelete || isProtectedCategory(pendingDelete)) {
      setPendingDelete(null);
      return;
    }
    onManage?.('delete', pendingDelete);
    setPendingDelete(null);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl overflow-y-auto border border-stone-200 backdrop-blur-xl"
          style={{ maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-serif text-xl text-stone-900">
              {manageMode ? 'ניהול קטגוריות' : 'כל הקטגוריות'}
            </h3>
            <button onClick={onClose} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
          {onManage && (
            <button
              type="button"
              onClick={() => onManage(!manageMode)}
              className="mb-4 text-xs text-amber-700 hover:text-amber-800"
            >
              {manageMode ? '← חזרה לבחירה' : 'ניהול: נעיצה, הסתרה, סידור ומחיקה'}
            </button>
          )}

          {manageMode ? (
            <div className="flex flex-col gap-2">
              {categories.map((c, index) => (
                  <div
                    key={c.id || c.name}
                    className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
                      c.hidden ? 'bg-stone-50 border-stone-100 opacity-60' : 'bg-stone-50 border-stone-200'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-stone-300 shrink-0" />
                    <span className="flex-1 text-sm text-stone-800 truncate">{c.name}</span>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => onManage('reorder', c.name, index - 1)}
                      className="min-h-9 min-w-9 rounded-lg border border-stone-200 flex items-center justify-center disabled:opacity-30"
                      aria-label="הזז למעלה"
                    >
                      <ChevronUp className="w-4 h-4 text-stone-600" />
                    </button>
                    <button
                      type="button"
                      disabled={index === categories.length - 1}
                      onClick={() => onManage('reorder', c.name, index + 1)}
                      className="min-h-9 min-w-9 rounded-lg border border-stone-200 flex items-center justify-center disabled:opacity-30"
                      aria-label="הזז למטה"
                    >
                      <ChevronDown className="w-4 h-4 text-stone-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onManage('toggle-pin', c.name)}
                      className={`min-h-9 min-w-9 rounded-lg border flex items-center justify-center ${
                        c.pinned ? 'bg-amber-100 border-amber-300 text-amber-800' : 'border-stone-200 text-stone-400'
                      }`}
                      aria-label={c.pinned ? 'בטל נעיצה' : 'נעץ'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onManage('toggle-hidden', c.name)}
                      className={`min-h-9 min-w-9 rounded-lg border flex items-center justify-center ${
                        c.hidden ? 'bg-stone-200 border-stone-300 text-stone-600' : 'border-stone-200 text-stone-400'
                      }`}
                      aria-label={c.hidden ? 'הצג' : 'הסתר'}
                    >
                      {c.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(c.name)}
                      className="min-h-9 min-w-9 rounded-lg border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-50"
                      aria-label={`מחק קטגוריה ${c.name}`}
                      title="מחק קטגוריה"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {all.map((c) => {
                const label = typeof c === 'string' ? c : c.name;
                const canDelete = !isProtectedCategory(label);
                return (
                  <div
                    key={label}
                    className={`rounded-xl border min-h-11 flex items-center transition ${
                      active === label ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium' : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => { onSelect(label); onClose(); }}
                      className={`flex-1 min-h-11 py-2.5 text-sm text-center ${canDelete ? 'pr-1 pl-3' : 'px-3'}`}
                    >
                      {label}
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          requestDelete(label);
                        }}
                        className={`min-h-9 min-w-9 mr-1.5 rounded-full flex items-center justify-center ${
                          active === label
                            ? 'bg-amber-950/15 text-amber-950'
                            : 'bg-white text-stone-500 hover:bg-rose-50 hover:text-rose-600'
                        }`}
                        aria-label={`מחק קטגוריה ${label}`}
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="מחיקת קטגוריה"
        message={`האם למחוק את הקטגוריה '${pendingDelete || ''}'?`}
        confirmLabel="מחק"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
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
  if (!isFinite(n)) return 'bg-stone-100 text-stone-600 border-stone-200';
  if (n <= 5.0) return 'bg-rose-50 text-rose-700 border-rose-200';
  if (n <= 7.0) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (n <= 8.0) return 'bg-lime-50 text-lime-800 border-lime-200';
  if (n <= 9.0) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (n <= 9.5) return 'bg-teal-50 text-teal-800 border-teal-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
}

function RecipeCard({ recipe, onOpen, onToggleFavorite, onAddToGrocery }) {
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
      className={`text-right cursor-pointer ${getRatingCardClass(recipe.rating)} rounded-2xl border border-stone-200 overflow-hidden flex flex-col active:scale-[0.98] transition-all duration-200 shadow-sm hover:shadow-md`}
    >
      <div className="relative bg-stone-100" style={{ aspectRatio: '4 / 3' }}>
        {!imgError && recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-stone-100">
            <ChefHat className="w-10 h-10 text-stone-400" />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(recipe.id);
          }}
          className="absolute top-2 left-2 min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-900/40 backdrop-blur-md border border-stone-200 flex items-center justify-center shadow-sm"
        >
          <Star className={`w-4 h-4 ${recipe.favorite ? 'fill-amber-400 text-amber-400' : 'text-stone-500'}`} />
        </button>
        {hasRating(recipe.rating) && (
          <span
            className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${ratingBadgeClass(recipe.rating)}`}
          >
            {formatRating(recipe.rating)}
          </span>
        )}
        {totalRecipeMinutes(recipe) != null && (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 text-stone-800 border border-stone-200 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            {totalRecipeMinutes(recipe)} דק׳
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        <h3 className="font-serif text-base leading-snug text-stone-900 line-clamp-2">{recipe.title}</h3>
        {hasRating(recipe.rating) && (
          <div className="flex items-center gap-1 text-sm font-semibold text-stone-800">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{formatRating(recipe.rating)}</span>
            <span className="text-xs font-normal text-stone-500">/ 10</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {recipe.categories.slice(0, 2).map((c) => (
            <span key={c} className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {c}
            </span>
          ))}
        </div>
        <div className="mt-auto grid grid-cols-4 divide-x divide-x-reverse divide-stone-200 border-t border-stone-200 pt-2 -mx-1">
          <MacroBadge icon={Flame} value={recipe.macros.calories} label="קלוריות" />
          <MacroBadge icon={Dumbbell} value={recipe.macros.protein} label="חלבון" unit="ג'" />
          <MacroBadge icon={Wheat} value={recipe.macros.carbs} label="פחמימות" unit="ג'" />
          <MacroBadge icon={Droplet} value={recipe.macros.fat} label="שומן" unit="ג'" />
        </div>
        {onAddToGrocery && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToGrocery(recipe);
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-2 text-[11px] font-medium text-amber-800 flex items-center justify-center gap-1.5 hover:bg-amber-100 transition"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            + הוסף לרשימת קניות
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- home view -------------------------------- */

function HomeView({
  recipes,
  categories,
  category,
  onCategoryChange,
  onManageCategories,
  onOpen,
  onToggleFavorite,
  onAdd,
  onOpenSettings,
  onOpenSmartImport,
  onAddCategory,
  onAddToGrocery,
}) {
  const [search, setSearch] = useState('');
  const [favOnly, setFavOnly] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  const pinnedNames = useMemo(
    () => categories.filter((c) => c.pinned && !c.hidden).map((c) => c.name),
    [categories]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return recipes.filter((r) => {
      if (favOnly && !r.favorite) return false;
      if (category !== 'הכל' && !r.categories.some((c) => recipeCategoryMatches(c, category))) return false;
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
    onCategoryChange(name);
    setQuickCategoryName('');
    setShowQuickCategory(false);
  }

  function handleManage(action, name, toIndex) {
    if (action === true || action === false) {
      setManageMode(action);
      return;
    }
    onManageCategories?.(action, name, toIndex);
  }

  function requestDeleteCategory(name) {
    if (isProtectedCategory(name)) return;
    setPendingDelete(name);
  }

  function confirmDeleteCategory() {
    if (!pendingDelete || isProtectedCategory(pendingDelete)) {
      setPendingDelete(null);
      return;
    }
    onManageCategories?.('delete', pendingDelete);
    setPendingDelete(null);
  }

  return (
    <div className="pb-36">
      <div className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-xl border-b border-stone-200">
        <div className="flex items-center justify-between px-4 pt-5">
          <div>
            <p className="text-xs tracking-wide text-amber-700">ברוכים הבאים</p>
            <h1 className="font-serif text-3xl text-stone-900 mt-0.5">המתכונים שלי</h1>
          </div>
          <button
            onClick={onOpenSettings}
            className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center backdrop-blur-md"
          >
            <Settings className="w-5 h-5 text-stone-600" />
          </button>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-500 absolute top-1/2 -translate-y-1/2 right-3.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם או מצרך..."
              className="w-full min-h-11 bg-white border border-stone-200 rounded-full py-2.5 pr-10 pl-4 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70 focus:border-amber-500/50 backdrop-blur-md"
            />
          </div>
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={`min-h-11 min-w-11 w-11 h-11 shrink-0 rounded-full border flex items-center justify-center transition ${
              favOnly ? 'bg-amber-500 border-amber-500' : 'bg-white border-stone-200'
            }`}
          >
            <Star className={`w-5 h-5 ${favOnly ? 'fill-amber-950 text-amber-950' : 'text-stone-500'}`} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 px-4 pb-4">
          <CategoryPill label="הכל" active={category === 'הכל'} onClick={() => onCategoryChange('הכל')} />
          {pinnedNames.map((c) => (
            <CategoryPill
              key={c}
              label={c}
              active={category === c}
              onClick={() => onCategoryChange(c)}
              onDelete={requestDeleteCategory}
            />
          ))}
          <button
            onClick={() => { setManageMode(false); setShowCategoryModal(true); }}
            className={`shrink-0 rounded-full border transition whitespace-nowrap min-h-11 px-4 py-2 text-sm flex items-center gap-1.5 ${
              category !== 'הכל' && !pinnedNames.includes(category)
                ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                : 'bg-white border-stone-200 text-stone-600'
            }`}
          >
            {category !== 'הכל' && !pinnedNames.includes(category) ? category : 'כל הקטגוריות'}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowQuickCategory(true)}
            className="shrink-0 rounded-full border border-amber-300 bg-amber-50 min-h-11 px-4 py-2 text-sm text-amber-800 flex items-center gap-1"
          >
            + קטגוריה
          </button>
        </div>
      </div>

      {showQuickCategory && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4" onClick={() => setShowQuickCategory(false)}>
          <form
            onSubmit={submitQuickCategory}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-stone-200 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-xl text-stone-900">קטגוריה חדשה</h3>
              <button type="button" onClick={() => setShowQuickCategory(false)} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                <X className="w-4 h-4 text-stone-500" />
              </button>
            </div>
            <input
              autoFocus
              value={quickCategoryName}
              onChange={(e) => setQuickCategoryName(e.target.value)}
              placeholder="לדוגמה: ללא גלוטן"
              className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
            />
            <button type="submit" disabled={!quickCategoryName.trim()} className="w-full min-h-11 mt-4 py-2.5 rounded-xl bg-amber-500 text-amber-950 text-sm font-medium disabled:opacity-40 hover:bg-amber-400 transition">
              הוסף קטגוריה
            </button>
          </form>
        </div>
      )}

      <CategoryModal
        open={showCategoryModal}
        categories={categories}
        active={category}
        manageMode={manageMode}
        onSelect={onCategoryChange}
        onManage={handleManage}
        onClose={() => { setShowCategoryModal(false); setManageMode(false); }}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title="מחיקת קטגוריה"
        message={`האם למחוק את הקטגוריה '${pendingDelete || ''}'?`}
        confirmLabel="מחק"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDeleteCategory}
      />

      <div className="px-4 mt-5">
        <button
          onClick={onOpenSmartImport}
          className="w-full min-h-11 flex items-center justify-between gap-3 bg-white border border-amber-200 rounded-2xl px-4 py-3.5 text-right backdrop-blur-md"
        >
          <div>
            <p className="text-sm font-medium text-amber-800">✨ ייבוא חכם עם AI</p>
            <p className="text-xs text-amber-700 mt-0.5">הדביקו טקסט או תמונה ואנחנו נמלא את המתכון</p>
          </div>
          <ChevronDown className="w-4 h-4 text-amber-400 shrink-0" style={{ transform: 'rotate(90deg)' }} />
        </button>
      </div>

      <div className="px-4 mt-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-24 gap-3">
            <div className="w-16 h-16 rounded-full bg-white border border-stone-200 flex items-center justify-center">
              <ChefHat className="w-7 h-7 text-stone-500" />
            </div>
            <p className="text-stone-800 font-medium">לא נמצאו מתכונים</p>
            <p className="text-stone-500 text-sm max-w-xs">נסו לשנות את החיפוש או לבטל סינונים</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpen={onOpen} onToggleFavorite={onToggleFavorite} onAddToGrocery={onAddToGrocery} />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onAdd}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 min-h-11 bg-amber-500 text-amber-950 rounded-full pl-5 pr-4 py-3.5 shadow-lg shadow-amber-200/60 flex items-center gap-2 font-medium active:scale-95 transition z-30 hover:bg-amber-400"
      >
        <Plus className="w-5 h-5" />
        הוסף מתכון
      </button>
    </div>
  );
}

/* -------------------------------- detail view -------------------------------- */

function DetailView({ recipe, onBack, onEdit, onDelete, onToggleFavorite, onAddToGrocery }) {
  const [multiplier, setMultiplier] = useState(1);
  const [customOpen, setCustomOpen] = useState(false);
  const [checkedEquipment, setCheckedEquipment] = useState({});
  const [timers, setTimers] = useState({});
  const [wakeLockOn, setWakeLockOn] = useState(false);
  const wakeLockRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [recipe?.id]);

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
            className={`inline-flex items-center gap-1 min-h-11 px-3 py-1 rounded-full border text-sm transition ${
              finished
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : running
                ? 'bg-amber-500 border-amber-500 text-amber-950'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {t ? formatSeconds(t.remaining) : m[0]}
            {finished && <Check className="w-3.5 h-3.5" />}
          </button>
          {t && t.remaining !== t.total && (
            <button
              onClick={(e) => resetTimer(key, seconds, e)}
              className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center"
            >
              <RotateCcw className="w-3 h-3 text-stone-500" />
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
    <div className="pb-28">
      <div className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-xl border-b border-stone-200 flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-stone-600" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(recipe.id)}
            className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center"
          >
            <Star className={`w-5 h-5 ${recipe.favorite ? 'fill-amber-400 text-amber-400' : 'text-stone-500'}`} />
          </button>
          <button
            onClick={() => onEdit(recipe)}
            className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center"
          >
            <Pencil className="w-4 h-4 text-stone-600" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
          </button>
        </div>
      </div>

      <div className="relative bg-stone-100" style={{ aspectRatio: '16 / 10' }}>
        <img
          src={recipe.image}
          alt={recipe.title}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="px-4 -mt-6 relative">
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xl backdrop-blur-xl">
          <h1 className="font-serif text-3xl text-stone-900 leading-tight">{recipe.title}</h1>
          {(parseMinutes(recipe.prepTime) !== '' || parseMinutes(recipe.cookTime) !== '') && (
            <div className="mt-4 flex flex-wrap gap-2">
              {parseMinutes(recipe.prepTime) !== '' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-900 border border-amber-200">
                  <Clock className="w-4 h-4" />
                  הכנה {recipe.prepTime} דק׳
                </span>
              )}
              {parseMinutes(recipe.cookTime) !== '' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-stone-100 text-stone-800 border border-stone-200">
                  <Flame className="w-4 h-4 text-amber-700" />
                  בישול / נינג׳ה {recipe.cookTime} דק׳
                </span>
              )}
              {totalRecipeMinutes(recipe) != null && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white text-stone-800 border border-stone-200">
                  סה״כ {totalRecipeMinutes(recipe)} דק׳
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {recipe.categories.map((c) => (
              <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                {c}
              </span>
            ))}
          </div>

          {hasRating(recipe.rating) && (
            <div className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold border ${ratingBadgeClass(recipe.rating)}`}>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              דירוג {formatRating(recipe.rating)} מתוך 10
            </div>
          )}

          <div className="mt-5 grid grid-cols-4 divide-x divide-x-reverse divide-stone-200 border border-stone-200 rounded-2xl overflow-hidden bg-stone-50">
            <MacroBadge icon={Flame} value={scaledMacros.calories} label="קלוריות" />
            <MacroBadge icon={Dumbbell} value={scaledMacros.protein} label="חלבון" unit="ג'" />
            <MacroBadge icon={Wheat} value={scaledMacros.carbs} label="פחמימות" unit="ג'" />
            <MacroBadge icon={Droplet} value={scaledMacros.fat} label="שומן" unit="ג'" />
          </div>
          {onAddToGrocery && (
            <button
              type="button"
              onClick={() => onAddToGrocery(recipe)}
              className="mt-4 min-h-11 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-800 flex items-center justify-center gap-2 hover:bg-amber-100 transition"
            >
              <ShoppingCart className="w-4 h-4" />
              + הוסף לרשימת קניות
            </button>
          )}
        </div>

        {/* portion scaler */}
        <div className="mt-5 flex items-center justify-between bg-white rounded-2xl border border-stone-200 p-4 backdrop-blur-md gap-3">
          <span className="text-sm text-stone-600">כמות מנות</span>
          <div className="inline-flex bg-stone-100 rounded-full p-1">
            {[1, 1.5, 2].map((p) => (
              <button
                key={p}
                onClick={() => { setMultiplier(p); setCustomOpen(false); }}
                className={`min-h-11 px-3.5 py-1.5 rounded-full text-sm transition ${
                  multiplier === p && !customOpen ? 'bg-amber-500 text-amber-950 font-medium' : 'text-stone-500'
                }`}
              >
                {p}x
              </button>
            ))}
            <button
              onClick={() => setCustomOpen((v) => !v)}
              className={`min-h-11 px-3.5 py-1.5 rounded-full text-sm transition ${customOpen ? 'bg-amber-500 text-amber-950 font-medium' : 'text-stone-500'}`}
            >
              מותאם
            </button>
          </div>
        </div>
        {customOpen && (
          <div className="mt-3 flex items-center gap-3 bg-white rounded-2xl border border-stone-200 p-4 backdrop-blur-md">
            <span className="text-sm text-stone-500 shrink-0">מכפיל אישי:</span>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={multiplier}
              onChange={(e) => setMultiplier(Math.max(0.25, parseFloat(e.target.value) || 1))}
              className="w-24 min-h-11 bg-white border border-stone-200 rounded-xl px-2 py-1.5 text-sm text-center text-stone-900"
            />
          </div>
        )}

        {/* equipment */}
        {recipe.equipment.length > 0 && (
          <section className="mt-8">
            <h2 className="font-serif text-xl text-stone-900 mb-3">ציוד ומכשור נדרש</h2>
            <div className="grid grid-cols-2 gap-3">
              {recipe.equipment.map((eq, i) => {
                const Icon = getEquipmentIcon(eq);
                const checked = checkedEquipment[i];
                return (
                  <button
                    key={i}
                    onClick={() => setCheckedEquipment((prev) => ({ ...prev, [i]: !prev[i] }))}
                    className={`flex items-center gap-2.5 rounded-xl border min-h-11 p-3 text-sm text-right transition ${
                      checked ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${checked ? 'bg-amber-500' : 'bg-stone-100'}`}>
                      {checked ? <Check className="w-3.5 h-3.5 text-amber-950" /> : <Icon className="w-3.5 h-3.5 text-stone-500" />}
                    </span>
                    <span className="leading-tight">{eq}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ingredients */}
        <section className="mt-8">
          <h2 className="font-serif text-xl text-stone-900 mb-3">מצרכים וערכים</h2>
          <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-200 backdrop-blur-md">
            {recipe.ingredients.map((ing) => {
              const hasMacro = [ing.calories, ing.protein, ing.carbs, ing.fat].some((v) => v !== '' && v !== undefined);
              const scaledAmount = Number(ing.amount || 0) * multiplier;
              const secondary = ingredientSecondaryLabel(scaledAmount, ing.unit, ing.name);
              return (
                <div key={ing.id} className="flex items-center justify-between px-4 py-3.5 gap-3">
                  <span className="text-sm text-stone-800 leading-relaxed">{ing.name}</span>
                  <div className="text-left shrink-0">
                    <span className="text-sm font-medium text-stone-900 tabular-nums">
                      {scaleAmount(ing.amount, multiplier)} {ing.unit}
                      {secondary && (
                        <span className="text-xs text-stone-500 font-normal">
                          {' '}({secondary})
                        </span>
                      )}
                    </span>

                    {hasMacro && (
                      <div className="text-xs text-emerald-700 tabular-nums mt-0.5">
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
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="font-serif text-xl text-stone-900">אופן ההכנה</h2>
            <button
              onClick={toggleWakeLock}
              className={`flex items-center gap-1.5 rounded-full min-h-11 px-3.5 py-1.5 text-xs border transition ${
                wakeLockOn ? 'bg-amber-500 border-amber-500 text-amber-950' : 'bg-white border-stone-200 text-stone-600'
              }`}
            >
              {wakeLockOn ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              מסך דולק
            </button>
          </div>
          <ol className="flex flex-col gap-4">
            {recipe.steps.map((step, i) => (
              <li key={i} className="bg-white rounded-2xl border border-stone-200 p-4 backdrop-blur-md">
                <span className="inline-block text-xs font-medium text-amber-800 bg-amber-50 border border-amber-500/20 rounded-full px-2.5 py-0.5 mb-2.5">
                  שלב {i + 1}
                </span>
                <p className="text-sm text-stone-800 leading-loose">{renderStepWithTimers(step, `s${i}`)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <ConfirmModal
        open={confirmDelete}
        title="מחיקת מתכון"
        message={`להעביר את "${recipe.title}" לסל המחזור? אפשר לשחזר אותו בהגדרות.`}
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
    prepTime: '',
    cookTime: '',
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
      prepTime: parseMinutes(form.prepTime),
      cookTime: parseMinutes(form.cookTime),
      ingredients: form.ingredients.filter((i) => i.name.trim()),
      steps: form.steps.filter((s) => s.trim()),
      createdAt: form.createdAt || Date.now(),
    };
    onSave(clean);
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-xl border-b border-stone-200 flex items-center justify-between px-4 py-3">
        <button onClick={onCancel} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center">
          <X className="w-5 h-5 text-stone-600" />
        </button>
        <h1 className="font-serif text-xl text-stone-900">{initial ? 'עריכת מתכון' : 'מתכון חדש'}</h1>
        <div className="w-11" />
      </div>

      <div className="px-4 mt-5 flex flex-col gap-7">
        <button
          onClick={() => setShowSmartImport(true)}
          className="w-full min-h-11 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 text-amber-800 text-sm font-medium"
        >
          ✨ ייבוא חכם עם AI — מלאו את הטופס אוטומטית
        </button>

        {/* title & image */}
        <div>
          <label className="text-sm text-stone-500 mb-2 block">שם המתכון</label>
          <input
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="לדוגמה: פסטו תרד ביתי"
            className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
          />
        </div>

        <div>
          <label className="text-sm text-stone-500 mb-2 block">תמונה</label>
          <div className="flex gap-2">
            <input
              value={form.image}
              onChange={(e) => update('image', e.target.value)}
              placeholder="הדביקו כתובת URL של תמונה"
              className="flex-1 min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
            />
            <button
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0"
            >
              <ImagePlus className="w-5 h-5 text-stone-600" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
          {form.image && (
            <img src={form.image} alt="תצוגה מקדימה" className="mt-3 w-full h-32 object-cover rounded-xl border border-stone-200" />
          )}
        </div>

        {/* categories */}
        <div>
          <label className="text-sm text-stone-500 mb-2 block">קטגוריות</label>
          <div className="flex flex-wrap gap-2.5">
            {categories.map((c) => (
              <CategoryPill key={c} label={c} active={form.categories.includes(c)} onClick={() => toggleCategory(c)} />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              placeholder="קטגוריה חדשה"
              className="flex-1 min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400"
            />
            <button onClick={addCategory} className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0" aria-label="הוסף קטגוריה">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* rating */}
        <div>
          <label className="text-sm text-stone-500 mb-2 block">דירוג המתכון (1 עד 10)</label>
          <input
            type="number"
            min="1"
            max="10"
            step="0.1"
            value={form.rating}
            onChange={(e) => update('rating', e.target.value === '' ? '' : normalizeRating(e.target.value))}
            placeholder="לדוגמה: 8.5"
            className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400"
          />
        </div>

        <div>
          <label className="text-sm text-stone-500 mb-2 block">זמני עבודה</label>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <input
                type="number"
                min="0"
                step="1"
                value={form.prepTime}
                onChange={(e) => update('prepTime', e.target.value === '' ? '' : parseMinutes(e.target.value))}
                placeholder="0"
                className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-center text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
              />
              <p className="text-xs text-stone-500 text-center mt-1.5">זמן הכנה (דקות)</p>
            </div>
            <div>
              <input
                type="number"
                min="0"
                step="1"
                value={form.cookTime}
                onChange={(e) => update('cookTime', e.target.value === '' ? '' : parseMinutes(e.target.value))}
                placeholder="0"
                className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-center text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
              />
              <p className="text-xs text-stone-500 text-center mt-1.5">זמן בישול / נינג׳ה (דקות)</p>
            </div>
          </div>
        </div>

        {/* macros */}
        <div>
          <label className="text-sm text-stone-500 mb-2 block">ערכים תזונתיים כוללים (למנה בסיסית x1)</label>
          <div className="grid grid-cols-4 gap-2.5">
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
                  className="w-full min-h-11 bg-white border border-emerald-200 rounded-xl px-2 py-2 text-sm text-center text-emerald-800"
                />
                <p className="text-xs text-emerald-700 text-center mt-1.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* equipment */}
        <div>
          <label className="text-sm text-stone-500 mb-2 block">ציוד ומכשור נדרש</label>
          <div className="flex gap-2 mb-3">
            <input
              value={equipInput}
              onChange={(e) => setEquipInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEquipment())}
              placeholder="מכשור מרכזי בלבד (נינג'ה גריל, בלנדר, משקל מזון)"
              className="flex-1 min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400"
            />
            <button onClick={addEquipment} className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.equipment.map((eq, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 rounded-full pl-2 pr-3 py-1.5 text-sm text-stone-800">
                {eq}
                <button onClick={() => removeEquipment(i)}>
                  <X className="w-3.5 h-3.5 text-stone-500" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ingredients */}
        <div>
          <label className="text-sm text-stone-500 mb-2 block">מצרכים</label>
          <textarea
            value={ingPaste}
            onChange={(e) => setIngPaste(e.target.value)}
            placeholder={'הדביקו רשימת מצרכים (שורה לכל מצרך)'}
            rows={3}
            className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400"
          />
          <button onClick={applyIngredientPaste} className="mt-2 min-h-11 text-sm text-amber-800 font-medium">
            פרק לרשימה מובנית ←
          </button>

          <div className="flex flex-col gap-3 mt-4">
            {form.ingredients.map((ing) => (
              <div key={ing.id} className="border border-stone-200 bg-white rounded-xl p-3 backdrop-blur-md">
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(ing.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-16 min-h-11 bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-center text-stone-900"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                    className="min-h-11 bg-white border border-stone-200 rounded-lg px-1.5 py-1.5 text-sm text-stone-900"
                  >
                    {UNIT_LIST.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    value={ing.name}
                    onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                    placeholder="שם המצרך"
                    className="flex-1 min-h-11 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400"
                  />
                  <button
                    onClick={() => setExpandedIng((prev) => ({ ...prev, [ing.id]: !prev[ing.id] }))}
                    className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0"
                  >
                    <ChevronDown className={`w-4 h-4 text-stone-500 transition ${expandedIng[ing.id] ? 'rotate-180' : ''}`} />
                  </button>
                  <button onClick={() => removeIngredient(ing.id)} className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  </button>
                </div>
                {expandedIng[ing.id] && (
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {['calories', 'protein', 'carbs', 'fat'].map((k) => (
                      <input
                        key={k}
                        type="number"
                        value={ing[k]}
                        onChange={(e) => updateIngredient(ing.id, k, e.target.value)}
                        placeholder={k === 'calories' ? 'קק"ל' : k === 'protein' ? "חלבון" : k === 'carbs' ? "פחמימות" : "שומן"}
                        className="min-h-11 bg-white border border-emerald-200 rounded-lg px-1.5 py-1.5 text-xs text-center text-emerald-800 placeholder:text-emerald-400"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button onClick={addBlankIngredient} className="mt-3 min-h-11 flex items-center gap-1.5 text-sm text-stone-600">
            <Plus className="w-4 h-4" /> הוסף מצרך ידנית
          </button>
        </div>

        {/* steps */}
        <div>
          <label className="text-sm text-stone-500 mb-2 block">אופן ההכנה</label>
          <textarea
            value={stepPaste}
            onChange={(e) => setStepPaste(e.target.value)}
            placeholder={'הדביקו את שלבי ההכנה (שורה לכל שלב)'}
            rows={3}
            className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400"
          />
          <button onClick={applyStepPaste} className="mt-2 min-h-11 text-sm text-amber-800 font-medium">
            פרק לרשימת שלבים ←
          </button>

          <div className="flex flex-col gap-3 mt-4">
            {form.steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-500/20 rounded-full px-2.5 py-1 shrink-0">{i + 1}</span>
                <textarea
                  value={s}
                  onChange={(e) => updateStep(i, e.target.value)}
                  rows={2}
                  className="flex-1 min-h-11 bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900"
                />
                <button onClick={() => removeStep(i)} className="min-h-11 min-w-11 w-11 h-11 mt-1 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addBlankStep} className="mt-3 min-h-11 flex items-center gap-1.5 text-sm text-stone-600">
            <Plus className="w-4 h-4" /> הוסף שלב ידנית
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-stone-50/95 backdrop-blur-xl border-t border-stone-200 p-4 flex gap-3">
        <button onClick={onCancel} className="flex-1 min-h-11 py-3 rounded-xl border border-stone-200 text-stone-800 font-medium hover:bg-stone-100 transition">
          ביטול
        </button>
        <button
          onClick={handleSubmit}
          disabled={!form.title.trim()}
          className="flex-1 min-h-11 py-3 rounded-xl bg-amber-500 text-amber-950 font-medium disabled:opacity-40 hover:bg-amber-400 transition"
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

function formatDateTime(ms) {
  return new Date(ms).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SettingsView({
  recipes, categories, onBack, onImport, onAddMissingSystemRecipes, trashedRecipes, onRestoreRecipe,
  safetySnapshots, onRestoreSnapshot, notify,
}) {
  const fileRef = useRef(null);
  const [confirmAddSystem, setConfirmAddSystem] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState(null);

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
      <div className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-xl border-b border-stone-200 flex items-center gap-3 px-4 py-3">
        <button onClick={onBack} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-stone-600" />
        </button>
        <h1 className="font-serif text-xl text-stone-900">הגדרות</h1>
      </div>

      <div className="px-4 mt-5 flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 backdrop-blur-md">
          <h2 className="font-serif text-lg text-stone-900 mb-1.5">ייבוא חכם עם AI</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            הייבוא החכם פועל דרך השרת של האפליקציה — אין צורך במפתח אישי.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 backdrop-blur-md">
          <h2 className="font-serif text-lg text-stone-900 mb-1.5">גיבוי ושחזור</h2>
          <div className="flex flex-col gap-2.5 mt-4">
            <button onClick={exportData} className="min-h-11 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 text-amber-950 text-sm font-medium hover:bg-amber-400 transition">
              <Download className="w-4 h-4" /> ייצוא נתונים
            </button>
            <button
              onClick={() => fileRef.current && fileRef.current.click()}
              className="min-h-11 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 text-stone-800 text-sm font-medium hover:bg-stone-100 transition"
            >
              <Upload className="w-4 h-4" /> ייבוא נתונים
            </button>
            <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 backdrop-blur-md">
          <h2 className="font-serif text-lg text-stone-900 mb-1.5 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-stone-500" /> סל מחזור
          </h2>
          {trashedRecipes.length === 0 ? (
            <p className="text-sm text-stone-500">סל המחזור ריק.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-stone-200 mt-2">
              {trashedRecipes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-stone-800 truncate">{r.title || 'ללא שם'}</p>
                    <p className="text-xs text-stone-500">נמחק ב-{formatDateTime(r.deletedAt)}</p>
                  </div>
                  <button
                    onClick={() => onRestoreRecipe(r.id)}
                    className="shrink-0 min-h-11 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-800 text-xs font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> שחזר
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 backdrop-blur-md">
          <h2 className="font-serif text-lg text-stone-900 mb-1.5">גיבויי בטיחות אוטומטיים</h2>
          <p className="text-sm text-stone-500 leading-relaxed">נשמרים במכשיר לפני כל ייבוא, הוספת מתכוני מערכת או שחזור.</p>
          {safetySnapshots.length === 0 ? (
            <p className="text-sm text-stone-500 mt-2">אין עדיין גיבויים.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-stone-200 mt-2">
              {safetySnapshots.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-stone-800 truncate">{s.reason}</p>
                    <p className="text-xs text-stone-500">
                      {formatDateTime(s.createdAt)} · {s.recipes.length} מתכונים
                    </p>
                  </div>
                  <button
                    onClick={() => setSnapshotToRestore(s)}
                    className="shrink-0 min-h-11 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 text-stone-800 text-xs font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> שחזר
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 backdrop-blur-md">
          <h2 className="font-serif text-lg text-stone-900 mb-1.5">מתכוני מערכת</h2>
          <button onClick={() => setConfirmAddSystem(true)} className="mt-3 min-h-11 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-stone-200 text-stone-800 text-sm font-medium w-full hover:bg-stone-100 transition">
            <Plus className="w-4 h-4" /> הוסף מתכוני מערכת חסרים
          </button>
        </div>
      </div>

      <ConfirmModal
        open={confirmAddSystem}
        title="הוספת מתכוני מערכת"
        message="מתכוני מערכת שחסרים יתווספו. מתכונים קיימים לא יימחקו ולא ישתנו. להמשיך?"
        confirmLabel="הוסף"
        onCancel={() => setConfirmAddSystem(false)}
        onConfirm={() => {
          setConfirmAddSystem(false);
          const added = onAddMissingSystemRecipes();
          notify(added ? `נוספו ${added} מתכוני מערכת` : 'כל מתכוני המערכת כבר קיימים');
        }}
      />

      <ConfirmModal
        open={!!snapshotToRestore}
        title="שחזור גיבוי"
        message={
          snapshotToRestore
            ? `המתכונים מהגיבוי (${formatDateTime(snapshotToRestore.createdAt)}) יוחזרו לגרסה השמורה. מתכונים שנוספו מאז לא יימחקו. להמשיך?`
            : ''
        }
        confirmLabel="שחזר"
        onCancel={() => setSnapshotToRestore(null)}
        onConfirm={() => {
          const id = snapshotToRestore.id;
          setSnapshotToRestore(null);
          onRestoreSnapshot(id);
        }}
      />
    </div>
  );
}

/* ----------------------------------- main app ----------------------------------- */

export default function RecipeApp() {
  const [recipes, setRecipes] = useState([]);
  // 'loading' → no writes at all; 'cloud' → local cache + Supabase; 'offline' → local cache only.
  const [syncMode, setSyncMode] = useState('loading');
  const lastSyncedRef = useRef([]);
  const [safetySnapshots, setSafetySnapshots] = useState(loadSafetySnapshots);
  const [categories, setCategories] = useState(loadCategories);
  const [homeCategory, setHomeCategory] = useState(loadHomeCategory);

  const [view, setView] = useState('home');
  const [selectedId, setSelectedId] = useState(null);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [toast, setToast] = useState('');
  const [showSmartImportHome, setShowSmartImportHome] = useState(false);
  const [appScreen, setAppScreen] = useState('recipes');
  const [groceryRecipe, setGroceryRecipe] = useState(null);
  const grocery = useGroceryLists();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadLocalRecipes();
      try {
        const remote = await fetchRecipes();
        if (cancelled) return;
        const remoteIds = new Set(remote.map((r) => String(r.id)));
        const localById = new Map(local.map((r) => [String(r.id), r]));
        const fromCloud = isSoftDeleteSupported()
          ? remote
          : remote.map((r) => {
              const cached = localById.get(String(r.id));
              return cached && cached.deletedAt ? { ...r, deletedAt: cached.deletedAt } : r;
            });
        let next = [...fromCloud, ...local.filter((r) => !remoteIds.has(String(r.id)))];
        next = appendMissingSystemRecipes(next.length ? next : DEMO_RECIPES);
        const remoteById = new Map(fromCloud.map((r) => [String(r.id), r]));
        await upsertRecipes(next.filter((r) => {
          const prev = remoteById.get(String(r.id));
          if (!prev) return true;
          return (
            prev.image !== r.image
            || parseMinutes(prev.prepTime) === ''
            || parseMinutes(prev.cookTime) === ''
          );
        }));
        if (cancelled) return;
        lastSyncedRef.current = next;
        setRecipes(next);
        setSyncMode('cloud');
      } catch (e) {
        if (cancelled) return;
        setRecipes(appendMissingSystemRecipes(local.length ? local : DEMO_RECIPES));
        setSyncMode('offline');
        setToast('אין חיבור לענן — השינויים יישמרו במכשיר בלבד');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (syncMode === 'loading') return;
    saveLocalRecipes(recipes);
    if (syncMode !== 'cloud' || !recipes.length) return;
    const previous = lastSyncedRef.current;
    lastSyncedRef.current = recipes;
    syncRecipes(previous, recipes).catch(() => {
      setToast('שמירה בענן נכשלה, נסו שוב');
    });
  }, [recipes, syncMode]);

  useEffect(() => saveCategories(categories), [categories]);
  useEffect(() => saveHomeCategory(homeCategory), [homeCategory]);
  useEffect(() => {
    if (homeCategory === 'הכל') return;
    const match = categories.find((c) => c.name === homeCategory);
    if (!match || match.hidden) setHomeCategory('הכל');
  }, [categories, homeCategory]);

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
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, deletedAt: Date.now() } : r)));
    notify('המתכון הועבר לסל המחזור');
    setView('home');
  }

  function restoreRecipe(id) {
    setRecipes((rs) => rs.map((r) => (r.id === id ? { ...r, deletedAt: null } : r)));
    notify('המתכון שוחזר');
  }

  function takeSafetySnapshot(reason) {
    saveSafetySnapshot(reason, recipes);
    setSafetySnapshots(loadSafetySnapshots());
  }

  function restoreSnapshot(snapshotId) {
    const snapshot = safetySnapshots.find((s) => s.id === snapshotId);
    if (!snapshot || !Array.isArray(snapshot.recipes)) return;
    takeSafetySnapshot('לפני שחזור גיבוי');
    setRecipes((current) => mergeRecipesById(current, snapshot.recipes));
    notify('הגיבוי שוחזר');
  }

  // Import merges into existing data: same-id recipes are updated, nothing is ever removed.
  function handleImport(parsed) {
    const importedRecipes = Array.isArray(parsed) ? parsed : parsed?.recipes;
    const importedCategories = Array.isArray(parsed) ? null : parsed?.categories;

    if (Array.isArray(importedRecipes)) {
      const valid = importedRecipes.filter((r) => r && typeof r === 'object' && r.id != null).map(ensureRecipeTimes);
      if (valid.length) {
        takeSafetySnapshot('לפני ייבוא');
        setRecipes((current) => mergeRecipesById(current, valid));
      }
    }

    if (Array.isArray(importedCategories)) {
      setCategories((current) => {
        const names = new Set(current.map((c) => c.name));
        const added = importedCategories.filter((c) => c && c.name && !names.has(c.name));
        return [...current, ...added.map((c) => ({
          id: c.id || uid(),
          name: c.name,
          pinned: !!c.pinned,
          hidden: !!c.hidden,
        }))];
      });
    }
  }

  function addCategory(name) {
    setCategories((current) => {
      if (current.some((category) => category.name.toLowerCase() === name.toLowerCase())) return current;
      return [...current, { id: uid(), name, pinned: false, hidden: false }];
    });
    notify('הקטגוריה נוספה');
  }

  function manageCategories(action, name, toIndex) {
    if (action === 'delete') {
      if (!name || isProtectedCategory(name)) return;
      setCategories((current) => current.filter((c) => c.name !== name));
      if (homeCategory === name) setHomeCategory('הכל');
      notify(`הקטגוריה "${name}" נמחקה`);
      return;
    }
    setCategories((current) => {
      if (action === 'toggle-pin') {
        return current.map((c) => (c.name === name ? { ...c, pinned: !c.pinned } : c));
      }
      if (action === 'toggle-hidden') {
        return current.map((c) => (
          c.name === name ? { ...c, hidden: !c.hidden, pinned: c.hidden ? c.pinned : false } : c
        ));
      }
      if (action === 'reorder' && typeof toIndex === 'number') {
        const fromIndex = current.findIndex((c) => c.name === name);
        if (fromIndex < 0 || toIndex < 0 || toIndex >= current.length) return current;
        const next = current.slice();
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      }
      return current;
    });
  }

  // Appends system recipes and default categories that are missing; existing ones (including trashed) are untouched.
  function addMissingSystemRecipes() {
    const existingIds = new Set(recipes.map((r) => String(r.id)));
    const missing = DEMO_RECIPES.filter((r) => !existingIds.has(String(r.id))).map(ensureRecipeTimes);
    if (missing.length) {
      takeSafetySnapshot('לפני הוספת מתכוני מערכת');
      setRecipes((current) => {
        const ids = new Set(current.map((r) => String(r.id)));
        return [...current, ...missing.filter((r) => !ids.has(String(r.id)))];
      });
    }
    setCategories((current) => {
      const names = new Set(current.map((c) => c.name));
      const added = defaultCategories().filter((c) => !names.has(c.name));
      return added.length ? [...current, ...added] : current;
    });
    return missing.length;
  }

  function handleHomeSmartImportExtracted(draft) {
    setEditingRecipe({ ...emptyRecipeForm(), ...draft });
    setShowSmartImportHome(false);
    setView('form');
  }

  function openAddToGrocery(recipe) {
    setGroceryRecipe(recipe);
  }

  function confirmAddToGrocery(listId, servings = 1) {
    if (!groceryRecipe) return;
    const result = grocery.addRecipeToList(groceryRecipe, listId, servings);
    const listName = grocery.lists.find((list) => list.id === listId)?.name || 'הרשימה';
    const parts = [];
    if (result.added) parts.push(`${result.added} חדשים`);
    if (result.merged) parts.push(`${result.merged} אוחדו`);
    if (result.stapled) parts.push(`${result.stapled} במזווה הביתי`);
    else if (result.skipped) parts.push(`${result.skipped} בסיסיים דולגו`);
    notify(parts.length ? `נוסף ל${listName} (${parts.join(', ')})` : `המצרכים כבר ב${listName}`);
    setGroceryRecipe(null);
  }

  function changeAppScreen(screen) {
    setAppScreen(screen);
    if (screen === 'recipes' && (view === 'form' || view === 'settings')) {
      setView('home');
    }
  }

  const showBottomNav = appScreen === 'grocery' || view === 'home' || view === 'detail';

  const activeRecipes = useMemo(() => recipes.filter((r) => !r.deletedAt), [recipes]);
  const trashedRecipes = useMemo(
    () => recipes.filter((r) => r.deletedAt).sort((a, b) => b.deletedAt - a.deletedAt),
    [recipes]
  );
  const selectedRecipe = activeRecipes.find((r) => r.id === selectedId) || null;

  return (
    <div dir="rtl" lang="he" className="min-h-screen bg-stone-50 text-stone-900" style={{ fontFamily: "'Assistant', sans-serif" }}>
      <div className="max-w-lg mx-auto min-h-screen bg-stone-50 relative bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.08),_transparent_55%)]">
        {appScreen === 'grocery' ? (
          <GroceryLists
            lists={grocery.lists}
            activeList={grocery.activeList}
            activeItems={grocery.activeItems}
            pantryDrawerItems={grocery.pantryDrawerItems}
            onSelectList={grocery.setActiveListId}
            onAddList={grocery.addList}
            onRenameList={grocery.renameList}
            onDeleteList={grocery.deleteList}
            onAddManualItem={grocery.addManualItem}
            onToggleItem={grocery.toggleItem}
            onDeleteItem={grocery.deleteItem}
            onClearChecked={grocery.clearChecked}
            onClearList={grocery.clearList}
            onSubstituteItem={grocery.substituteItem}
            onUpdateItemQuantity={grocery.updateItemQuantity}
            onPromoteStaple={grocery.promoteStaple}
            onDemoteStaple={grocery.demoteStaple}
            onNotify={notify}
          />
        ) : (
          <>
        {view === 'home' && (
          <HomeView
            recipes={activeRecipes}
            categories={categories}
            category={homeCategory}
            onCategoryChange={setHomeCategory}
            onManageCategories={manageCategories}
            onOpen={openRecipe}
            onToggleFavorite={toggleFavorite}
            onAdd={startAdd}
            onOpenSettings={() => setView('settings')}
            onOpenSmartImport={() => setShowSmartImportHome(true)}
            onAddCategory={addCategory}
            onAddToGrocery={openAddToGrocery}
          />
        )}
        {view === 'detail' && selectedRecipe && (
          <DetailView
            recipe={selectedRecipe}
            onBack={() => setView('home')}
            onEdit={startEdit}
            onDelete={deleteRecipe}
            onToggleFavorite={toggleFavorite}
            onAddToGrocery={openAddToGrocery}
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
            onAddMissingSystemRecipes={addMissingSystemRecipes}
            trashedRecipes={trashedRecipes}
            onRestoreRecipe={restoreRecipe}
            safetySnapshots={safetySnapshots}
            onRestoreSnapshot={restoreSnapshot}
            notify={notify}
          />
        )}
          </>
        )}
        {showBottomNav && (
          <BottomNav active={appScreen} onChange={changeAppScreen} />
        )}
      </div>

      <AddToGroceryModal
        open={!!groceryRecipe}
        recipe={groceryRecipe}
        lists={grocery.lists}
        defaultListId={grocery.activeListId || grocery.lastUsedListId}
        onClose={() => setGroceryRecipe(null)}
        onConfirm={confirmAddToGrocery}
      />

      <SmartImportModal
        open={showSmartImportHome}
        onClose={() => setShowSmartImportHome(false)}
        onExtracted={handleHomeSmartImportExtracted}
      />

      <Toast message={toast} />
    </div>
  );
}