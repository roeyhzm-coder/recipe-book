import React, { useState, useEffect, useRef, useMemo } from 'react';
import { fetchRecipes, syncRecipes, upsertRecipes, deleteRecipesByIds, formatRecipesDbError } from '@/lib/recipes-db';
import { extractRecipe } from '@/lib/extract-recipe.functions';
import { registerPwaUpdates } from '@/lib/pwa-register';
import { recalculateRecipe } from '@/lib/ingredient-macros';
import { convertIngredientUnit, RECIPE_UNIT_LIST, amountToGrams } from '@/lib/ingredientUnits';
import {
  applyVariation,
  defaultVariationOf,
  normalizeVariations,
  persistableVariations,
  recipeWithDefaultVariation,
} from '@/lib/recipe-variations';
import RecipeVariationsEditor from '@/components/RecipeVariationsEditor';
import {
  Search, Star, Plus, Minus, X, ArrowRight, Settings, Download, Upload,
  Trash2, Pencil, Check, Clock, RotateCcw, Sun, Moon, Flame, Scale,
  UtensilsCrossed, Snowflake, Thermometer, Timer as TimerIcon, Soup,
  Refrigerator, Wrench, ChefHat, Utensils, ImagePlus, ChevronDown,
  Dumbbell, Wheat, Droplet, AlertTriangle, ShoppingCart, Pin
} from 'lucide-react';
import { useGroceryLists } from '@/hooks/useGroceryLists';
import BottomNav from '@/components/grocery/BottomNav';
import GroceryLists from '@/components/grocery/GroceryLists';
import AddToGroceryModal from '@/components/grocery/AddToGroceryModal';
import { WEEKEND_CATEGORY } from '@/data/weekend-recipes';
import { PANTRY_CATEGORY } from '@/data/pantry-ingredients';
import { SYSTEM_SEED_RECIPES } from '@/data/side-dishes';

/* ---------------------------------- data & storage ---------------------------------- */

const STORAGE_KEY = 'mitbach_recipes_v1';
const DELETED_IDS_KEY = 'mitbach_deleted_recipe_ids_v1';
const CATEGORIES_STORAGE_KEY = 'mitbach_categories_v1';
const MERGED_CATEGORIES_STORAGE_KEY = 'mitbach_merged_categories_v1';
const HOME_CATEGORY_STORAGE_KEY = 'mitbach_home_category_v1';
const SAFETY_BACKUP_KEY = 'recipes_safety_backup';
const MAX_SAFETY_SNAPSHOTS = 5;
const PROTEIN_SCOOP_GRAMS = 25;

const ICE_CREAM_CATEGORY_NAMES = ['גלידות חלבון', "נינג'ה קרימי", 'דל קלוריות'];
const QUICK_SIDE_CATEGORY_NAMES = ['מהיר וקליל', 'תוספות בריאות'];
const AUTO_MERGED_CATEGORY_NAMES = [
  ...ICE_CREAM_CATEGORY_NAMES,
  'עוף',
  ...QUICK_SIDE_CATEGORY_NAMES,
  'תוספות',
  'אייר פרייר',
  WEEKEND_CATEGORY,
  PANTRY_CATEGORY,
];
const DEFAULT_CATEGORY_NAMES = [
  'ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'עתיר חלבון', 'בשרי', 'נשנושים', PANTRY_CATEGORY, 'גלידות',
  'דגים', 'דל פחמימה', 'קינוחים', 'שייקים', 'סלטים', 'מהיר להכנה', 'Meal Prep', 'עוף',
  WEEKEND_CATEGORY,
  ...QUICK_SIDE_CATEGORY_NAMES,
  'תוספות',
  'אייר פרייר',
  ...ICE_CREAM_CATEGORY_NAMES,
];
const PINNED_BY_DEFAULT = [
  'ארוחת בוקר',
  'ארוחת צהריים',
  'ארוחת ערב',
  'עתיר חלבון',
  PANTRY_CATEGORY,
  'גלידות חלבון',
  WEEKEND_CATEGORY,
];
const UNIT_LIST = RECIPE_UNIT_LIST;

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
  { keys: ['גריל', 'תנור', 'כיריים', 'אש', 'טוסטר', 'איירפרייר', 'אייר פרייר', 'air fryer'], icon: Flame },
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

function parseMinutes(value) {
  if (value === '' || value === null || value === undefined) return '';
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : '';
}

function guessRecipeTimes(recipe) {
  const hay = [recipe.id, recipe.title, ...(recipe.categories || []), ...(recipe.equipment || [])]
    .join(' ')
    .toLowerCase();
  if ((recipe.categories || []).includes(PANTRY_CATEGORY)) return { prepTime: 0, cookTime: 0 };
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

function asUserRecipe(recipe) {
  const baseServings = servingsCount(recipe);
  const next = {
    ...ensureRecipeTimes(recipe),
    baseServings,
    title: titleWithServingMarker(recipe?.title, baseServings),
    deletedAt: null,
  };
  delete next.isDefault;
  delete next.is_default;
  delete next.locked;
  return next;
}

function totalRecipeMinutes(recipe) {
  const explicit = Number(recipe?.totalTime);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const prep = Number(recipe?.prepTime);
  const cook = Number(recipe?.cookTime);
  const total = (Number.isFinite(prep) ? prep : 0) + (Number.isFinite(cook) ? cook : 0);
  return total > 0 ? total : null;
}

function applyMacrosFromIngredients(recipe) {
  return recalculateRecipe(recipe);
}

function upsertRecipeInList(list, recipe) {
  const exists = list.some((r) => String(r.id) === String(recipe.id));
  return exists ? list.map((r) => (String(r.id) === String(recipe.id) ? recipe : r)) : [recipe, ...list];
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

const DECIMAL_INPUT_RE = /^[0-9]*[.,]?[0-9]*$/;

function normalizeDecimalText(raw) {
  return String(raw ?? '').replace(',', '.');
}

function parsePositiveDecimal(raw, fallback = 1) {
  const n = Number(normalizeDecimalText(raw));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function servingsCount(recipe) {
  const n = Number(recipe?.baseServings);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function stripServingMarker(title) {
  return String(title || '').replace(/\s*\*+\s*$/u, '').trim();
}

function titleWithServingMarker(title, servings) {
  const base = stripServingMarker(title);
  if (!base) return '';
  return servingsCount({ baseServings: servings }) > 1 ? `${base} *` : base;
}

function scaleAmount(amount, multiplier) {
  const factor = Number(multiplier);
  const v = Number(amount || 0) * (Number.isFinite(factor) && factor > 0 ? factor : 0);
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
  return /אבקת\s*חלבון|חלבון\s*(וניל|שוקולד|איזולט|טבע|בננה|תות)|myprotein|protein\s*powder|whey/.test(text);
}

function proteinScoopLabel(amount, unit, name) {
  if (!isProteinPowderName(name)) return '';
  const grams = amountToGrams(amount, unit, name);
  if (!grams) return '';
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
  const n = Number(v) * multiplier;
  if (!Number.isFinite(n)) return '';
  return Math.round(n * 10) / 10;
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

function loadRawLocalRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((r) => r && r.id != null);
    }
  } catch (e) {}
  return [];
}

function loadLocalRecipes() {
  return loadRawLocalRecipes().filter((r) => !r.deletedAt);
}

function saveLocalRecipes(recipes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch (e) {}
}

function loadDeletedRecipeIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DELETED_IDS_KEY) || '[]');
    return new Set((Array.isArray(parsed) ? parsed : []).map(String));
  } catch (e) {
    return new Set();
  }
}

function persistDeletedRecipeIds(ids) {
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify([...ids]));
  } catch (e) {}
}

function rememberDeletedRecipeIds(ids) {
  const next = loadDeletedRecipeIds();
  ids.forEach((id) => next.add(String(id)));
  persistDeletedRecipeIds(next);
  return next;
}

function forgetDeletedRecipeIds(ids) {
  const next = loadDeletedRecipeIds();
  ids.forEach((id) => next.delete(String(id)));
  persistDeletedRecipeIds(next);
  return next;
}

function mergeRecipesById(current, incoming) {
  const incomingById = new Map(incoming.map((r) => [String(r.id), r]));
  const currentIds = new Set(current.map((r) => String(r.id)));
  return [
    ...current.map((r) => incomingById.get(String(r.id)) ?? r),
    ...incoming.filter((r) => !currentIds.has(String(r.id))),
  ];
}

function mergeSystemSeedRecipes(recipes, deletedIds) {
  const byId = new Map((recipes || []).map((recipe) => [String(recipe.id), recipe]));
  for (const seed of SYSTEM_SEED_RECIPES) {
    const id = String(seed.id);
    if (deletedIds.has(id)) continue;
    const seeded = asUserRecipe({
      ...seed,
      updatedAt: Number(seed.updatedAt) || Number(seed.createdAt) || Date.now(),
    });
    const current = byId.get(id);
    if (!current) {
      byId.set(id, seeded);
      continue;
    }
    const seedUpdated = Number(seeded.updatedAt) || 0;
    const currentUpdated = Number(current.updatedAt) || 0;
    const seedHasVariations = Array.isArray(seed.variations) && seed.variations.length > 0;
    const currentHasVariations = Array.isArray(current.variations) && current.variations.length > 0;
    if (seedUpdated >= currentUpdated || (seedHasVariations && !currentHasVariations)) {
      byId.set(id, asUserRecipe({
        ...seeded,
        favorite: !!current.favorite,
        createdAt: current.createdAt || seeded.createdAt,
        updatedAt: Math.max(seedUpdated, currentUpdated),
      }));
    }
  }
  const mergedIds = new Set(byId.keys());
  const extras = (recipes || []).filter((recipe) => !mergedIds.has(String(recipe.id)));
  const seededOrder = SYSTEM_SEED_RECIPES
    .map((recipe) => byId.get(String(recipe.id)))
    .filter(Boolean);
  const rest = [...byId.values()].filter((recipe) => !SYSTEM_SEED_RECIPES.some((seed) => String(seed.id) === String(recipe.id)));
  return [...seededOrder, ...rest, ...extras];
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
  const error = /נכשל|שגיאה|RLS|error/i.test(message);
  return (
    <div className="fixed bottom-32 inset-x-0 flex justify-center z-50 px-4 pointer-events-none">
      <div className={`${error ? 'bg-rose-700 text-white border-rose-800' : 'bg-stone-800 text-white border-stone-200'} text-sm px-5 py-3 rounded-full shadow-lg border backdrop-blur-md max-w-sm text-center`}>
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

function CategoryPill({ label, active, onClick, small }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border transition whitespace-nowrap ${
        small ? 'min-h-8 px-2.5 py-1 text-xs' : 'min-h-11 px-4 py-2 text-sm'
      } ${
        active
          ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
          : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
      }`}
    >
      {label}
    </button>
  );
}

function CategoryModal({ open, categories, active, onSelect, onClose }) {
  if (!open) return null;
  const visible = categories.filter((c) => !c.hidden);
  const all = [{ id: 'all', name: 'הכל', pinned: false, hidden: false }, ...visible];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl overflow-y-auto border border-stone-200 backdrop-blur-xl"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-xl text-stone-900">כל הקטגוריות</h3>
          <button type="button" onClick={onClose} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {all.map((c) => {
            const label = typeof c === 'string' ? c : c.name;
            return (
              <button
                key={label}
                type="button"
                onClick={() => { onSelect(label); onClose(); }}
                className={`rounded-xl border min-h-11 py-2.5 px-3 text-sm text-center transition ${
                  active === label
                    ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategoryManageModal({ open, categories, onTogglePin, onDelete, onClose }) {
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (!open) setPendingDelete(null);
  }, [open]);

  if (!open) return null;

  const rows = [
    { id: 'all', name: 'הכל', pinned: true, locked: true },
    ...categories.map((c) => ({ ...c, locked: false })),
  ];

  function requestDelete(name) {
    if (isProtectedCategory(name)) return;
    setPendingDelete(name);
  }

  function confirmDelete() {
    if (!pendingDelete || isProtectedCategory(pendingDelete)) {
      setPendingDelete(null);
      return;
    }
    onDelete?.(pendingDelete);
    setPendingDelete(null);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-y-auto border border-stone-200 backdrop-blur-xl"
          style={{ maxHeight: '80vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif text-xl text-stone-900">ניהול קטגוריות</h3>
            <button type="button" onClick={onClose} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
              <X className="w-4 h-4 text-stone-500" />
            </button>
          </div>
          <p className="text-xs text-stone-500 mb-4 leading-relaxed">
            נעץ קטגוריות להצגה בסרגל הבית, או מחק קטגוריה סופית מהמערכת. מתכונים לא נמחקים.
          </p>

          <div className="flex flex-col gap-2">
            {rows.map((c) => {
              const locked = c.locked || isProtectedCategory(c.name);
              return (
                <div
                  key={c.id || c.name}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    locked ? 'bg-stone-50 border-stone-100' : 'bg-white border-stone-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-800 truncate font-medium">{c.name}</p>
                    {locked ? (
                      <p className="text-[11px] text-stone-400 mt-0.5">קטגוריה קבועה · תמיד בסרגל</p>
                    ) : (
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {c.pinned ? 'מוצגת בסרגל הבית' : 'מוסתרת מסרגל הבית'}
                      </p>
                    )}
                  </div>

                  {locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-1 text-[11px] text-stone-500">
                      <Pin className="w-3 h-3" />
                      נעול
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!!c.pinned}
                        onClick={() => onTogglePin?.(c.name)}
                        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition ${
                          c.pinned
                            ? 'bg-amber-500 border-amber-500'
                            : 'bg-stone-200 border-stone-300'
                        }`}
                        title={c.pinned ? 'הסר מסרגל הבית' : 'הצג בסרגל הבית'}
                        aria-label={c.pinned ? `הסר את ${c.name} מסרגל הבית` : `הצג את ${c.name} בסרגל הבית`}
                      >
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
                            c.pinned ? '-translate-x-1' : 'translate-x-5'
                          }`}
                        >
                          <Pin className={`w-3 h-3 ${c.pinned ? 'text-amber-700' : 'text-stone-400'}`} />
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(c.name)}
                        className="min-h-9 min-w-9 rounded-lg border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-50"
                        aria-label={`מחק סופית את הקטגוריה ${c.name}`}
                        title="מחק סופית"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="מחיקת קטגוריה"
        message={`האם למחוק סופית את הקטגוריה '${pendingDelete || ''}' מהמערכת?`}
        confirmLabel="מחק סופית"
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
  const imageSrc = recipe.image || recipe.imageUrl || '';
  useEffect(() => {
    setImgError(false);
  }, [imageSrc]);
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
        {!imgError && imageSrc ? (
          <img
            src={imageSrc}
            alt={recipe.title}
            referrerPolicy="no-referrer"
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
  const [showManageModal, setShowManageModal] = useState(false);
  const [showQuickCategory, setShowQuickCategory] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');

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
      const inVariations = (r.variations || []).some((variation) => (
        String(variation.name || '').toLowerCase().includes(q)
        || (variation.ingredients || []).some((i) => String(i.name || '').toLowerCase().includes(q))
      ));
      return inTitle || inIngredients || inVariations;
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
            <CategoryPill key={c} label={c} active={category === c} onClick={() => onCategoryChange(c)} />
          ))}
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
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
            type="button"
            onClick={() => setShowQuickCategory(true)}
            className="shrink-0 rounded-full border border-amber-300 bg-amber-50 min-h-11 px-4 py-2 text-sm text-amber-800 flex items-center gap-1"
          >
            + קטגוריה
          </button>
          <button
            type="button"
            onClick={() => setShowManageModal(true)}
            className="shrink-0 rounded-full border border-stone-200 bg-white min-h-11 px-4 py-2 text-sm text-stone-700 flex items-center gap-1.5 hover:border-stone-300"
          >
            <Settings className="w-3.5 h-3.5" />
            ניהול
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
        onSelect={onCategoryChange}
        onClose={() => setShowCategoryModal(false)}
      />

      <CategoryManageModal
        open={showManageModal}
        categories={categories}
        onTogglePin={(name) => onManageCategories?.('toggle-pin', name)}
        onDelete={(name) => onManageCategories?.('delete', name)}
        onClose={() => setShowManageModal(false)}
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
  const variations = normalizeVariations(recipe.variations);
  const [variationId, setVariationId] = useState(() => defaultVariationOf(recipe)?.id || '');
  const [multiplier, setMultiplier] = useState(1);
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState('1');
  const [checkedEquipment, setCheckedEquipment] = useState({});
  const [timers, setTimers] = useState({});
  const [wakeLockOn, setWakeLockOn] = useState(false);
  const wakeLockRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setVariationId(defaultVariationOf(recipe)?.id || '');
    setMultiplier(1);
    setCustomOpen(false);
    setCustomInput('1');
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

  const selectedVariation = variations.find((item) => String(item.id) === String(variationId))
    || defaultVariationOf(recipe);
  const displayed = variations.length ? applyVariation(recipe, selectedVariation) : recipe;
  const scaledMacros = {
    calories: scaleMacro(displayed.macros.calories, multiplier),
    protein: scaleMacro(displayed.macros.protein, multiplier),
    carbs: scaleMacro(displayed.macros.carbs, multiplier),
    fat: scaleMacro(displayed.macros.fat, multiplier),
  };
  const scaledFiber = displayed.macros?.fiber !== '' && displayed.macros?.fiber != null
    ? scaleMacro(displayed.macros.fiber, multiplier)
    : '';

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
          src={recipe.image || recipe.imageUrl || ''}
          alt={recipe.title}
          referrerPolicy="no-referrer"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="px-4 -mt-6 relative">
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xl backdrop-blur-xl">
          <h1 className="font-serif text-3xl text-stone-900 leading-tight">{recipe.title}</h1>
          {variations.length > 0 && (
            <div className="mt-4">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {variations.map((variation) => {
                  const active = String(variation.id) === String(selectedVariation?.id);
                  return (
                    <button
                      key={variation.id}
                      type="button"
                      onClick={() => setVariationId(variation.id)}
                      className={`shrink-0 min-h-11 px-3.5 py-1.5 rounded-full border text-sm transition whitespace-nowrap ${
                        active
                          ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                          : 'bg-white border-stone-200 text-stone-600'
                      }`}
                    >
                      {variation.name}
                    </button>
                  );
                })}
              </div>
              {selectedVariation?.description ? (
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">{selectedVariation.description}</p>
              ) : null}
            </div>
          )}
          {(parseMinutes(displayed.prepTime) !== '' || parseMinutes(displayed.cookTime) !== '') && (
            <div className="mt-4 flex flex-wrap gap-2">
              {parseMinutes(displayed.prepTime) !== '' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-amber-50 text-amber-900 border border-amber-200">
                  <Clock className="w-4 h-4" />
                  הכנה {displayed.prepTime} דק׳
                </span>
              )}
              {parseMinutes(displayed.cookTime) !== '' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-stone-100 text-stone-800 border border-stone-200">
                  <Flame className="w-4 h-4 text-amber-700" />
                  בישול / נינג׳ה {displayed.cookTime} דק׳
                </span>
              )}
              {totalRecipeMinutes(displayed) != null && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white text-stone-800 border border-stone-200">
                  סה״כ {totalRecipeMinutes(displayed)} דק׳
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
          {scaledFiber !== '' && (
            <p className="text-xs text-stone-500 mt-2">סיבים: {scaledFiber} ג׳</p>
          )}
          {Array.isArray(displayed.servingUnits) && displayed.servingUnits.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-stone-500 mb-2">
                {displayed.nutritionBasis === '100ml'
                  ? 'מנות מוכנות (בסיס: 100 מ״ל)'
                  : displayed.nutritionBasis === 'recipe' || displayed.nutritionBasis === 'serving'
                    ? 'ערכים למנה'
                    : 'מנות מוכנות (בסיס: 100 גרם)'}
              </p>
              <div className="flex flex-wrap gap-2">
                {displayed.servingUnits.map((unit) => {
                  const unitMultiplier = displayed.nutritionBasis === 'recipe'
                    || displayed.nutritionBasis === 'serving'
                    || unit.unit === 'מנה'
                    ? Number(unit.amount) / Math.max(1, Number(displayed.baseServings) || 1)
                    : Number(unit.amount) / 100;
                  const active = Math.abs(multiplier - unitMultiplier) < 0.001;
                  return (
                    <button
                      key={`${unit.label}-${unit.amount}`}
                      type="button"
                      onClick={() => {
                        setMultiplier(unitMultiplier);
                        setCustomInput(String(unitMultiplier));
                        setCustomOpen(false);
                      }}
                      className={`min-h-11 rounded-full border px-3 py-1.5 text-xs transition ${
                        active
                          ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                          : 'bg-white border-stone-200 text-stone-600'
                      }`}
                    >
                      {unit.label} · {unit.amount}{unit.unit}
                      {unit.calories !== '' && unit.calories != null ? ` · ${unit.calories} קק״ל` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {onAddToGrocery && (
            <button
              type="button"
              onClick={() => onAddToGrocery(displayed)}
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
                onClick={() => {
                  setMultiplier(p);
                  setCustomInput(String(p));
                  setCustomOpen(false);
                }}
                className={`min-h-11 px-3.5 py-1.5 rounded-full text-sm transition ${
                  !customOpen && Math.abs(multiplier - p) < 0.001 ? 'bg-amber-500 text-amber-950 font-medium' : 'text-stone-500'
                }`}
              >
                {p}x
              </button>
            ))}
            <button
              onClick={() => {
                setCustomOpen((open) => {
                  const next = !open;
                  if (next) setCustomInput(String(multiplier));
                  return next;
                });
              }}
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
              type="text"
              inputMode="decimal"
              min="0.01"
              step="any"
              value={customInput}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw !== '' && !DECIMAL_INPUT_RE.test(raw)) return;
                setCustomInput(raw);
                if (raw === '' || raw === '.' || raw === ',') return;
                const next = Number(normalizeDecimalText(raw));
                if (Number.isFinite(next) && next > 0) setMultiplier(next);
              }}
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
            {displayed.ingredients.map((ing) => {
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
            {displayed.steps.map((step, i) => (
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
        message={`למחוק את "${recipe.title}" לצמיתות? המתכון יימחק מהמסד ולא יחזור ברענון.`}
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
    imageUrl: '',
    categories: [],
    equipment: [],
    ingredients: [],
    steps: [],
    macros: { calories: '', protein: '', carbs: '', fat: '' },
    servingUnits: [],
    nutritionBasis: '',
    prepTime: '',
    cookTime: '',
    rating: '',
    baseServings: 1,
    favorite: false,
    variations: [],
  };
}

function FormView({ initial, categories, onCancel, onSave, onAddCategory }) {
  const [form, setForm] = useState(() => {
    const base = initial ? JSON.parse(JSON.stringify(initial)) : emptyRecipeForm();
    base.title = stripServingMarker(base.title);
    base.baseServings = servingsCount(base);
    base.variations = normalizeVariations(base.variations);
    if (base.nutritionBasis === 'serving' || base.macros?.nutritionBasis === 'serving') return base;
    return recalculateRecipe(base);
  });
  const [equipInput, setEquipInput] = useState('');
  const [ingPaste, setIngPaste] = useState('');
  const [stepPaste, setStepPaste] = useState('');
  const [expandedIng, setExpandedIng] = useState({});
  const [expandedVariationId, setExpandedVariationId] = useState(null);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  function applySmartImportDraft(draft) {
    setForm((f) => recalculateRecipe({
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
    setForm((f) => recalculateRecipe({ ...f, ingredients: [...f.ingredients, makeIngredient(1, 'גרם', '')] }));
  }

  function updateIngredient(id, field, value) {
    setForm((f) => applyMacrosFromIngredients({
      ...f,
      ingredients: f.ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)),
    }));
  }

  function onUnitChange(id, newUnit) {
    setForm((f) => applyMacrosFromIngredients({
      ...f,
      ingredients: f.ingredients.map((ing) => (ing.id === id ? convertIngredientUnit(ing, newUnit) : ing)),
    }));
  }

  function removeIngredient(id) {
    setForm((f) => applyMacrosFromIngredients({ ...f, ingredients: f.ingredients.filter((ing) => ing.id !== id) }));
  }

  function applyIngredientPaste() {
    if (!ingPaste.trim()) return;
    setForm((f) => applyMacrosFromIngredients({ ...f, ingredients: [...f.ingredients, ...parseIngredientsPaste(ingPaste)] }));
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
      if (dataUrl) setForm((f) => ({ ...f, image: dataUrl, imageUrl: dataUrl }));
    });
  }

  function handleSubmit(e) {
    e?.preventDefault?.();
    if (!form.title.trim() || saving) return;
    const drafted = {
      ...form,
      id: form.id || uid(),
      title: form.title.trim(),
      baseServings: servingsCount(form),
      image: form.image || form.imageUrl || '',
      imageUrl: form.imageUrl || form.image || '',
      prepTime: parseMinutes(form.prepTime),
      cookTime: parseMinutes(form.cookTime),
      ingredients: form.ingredients.filter((i) => i.name && String(i.name).trim()),
      steps: form.steps.filter((s) => s && String(s).trim()),
      variations: persistableVariations(form.variations),
      createdAt: form.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    const keepServingMacros = drafted.nutritionBasis === 'serving' || drafted.macros?.nutritionBasis === 'serving';
    const clean = recipeWithDefaultVariation(keepServingMacros ? drafted : recalculateRecipe(drafted));
    setSaving(true);
    try {
      onSave(clean);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pb-28" onSubmit={handleSubmit}>
      <div className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-xl border-b border-stone-200 flex items-center justify-between px-4 py-3">
        <button type="button" onClick={onCancel} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center">
          <X className="w-5 h-5 text-stone-600" />
        </button>
        <h1 className="font-serif text-xl text-stone-900">{initial ? 'עריכת מתכון' : 'מתכון חדש'}</h1>
        <div className="w-11" />
      </div>

      <div className="px-4 mt-5 flex flex-col gap-7">
        <button
          type="button"
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
              value={form.image || form.imageUrl || ''}
              onChange={(e) => setForm((f) => ({ ...f, image: e.target.value, imageUrl: e.target.value }))}
              placeholder="הדביקו כתובת URL של תמונה"
              className="flex-1 min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0"
            >
              <ImagePlus className="w-5 h-5 text-stone-600" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
          {(form.image || form.imageUrl) && (
            <img src={form.image || form.imageUrl} alt="תצוגה מקדימה" referrerPolicy="no-referrer" className="mt-3 w-full h-32 object-cover rounded-xl border border-stone-200" />
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
            <button type="button" onClick={addCategory} className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0" aria-label="הוסף קטגוריה">
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
          <label className="text-sm text-stone-500 mb-2 block">מספר מנות</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => update('baseServings', Math.max(1, servingsCount(form) - 1))}
              className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-700"
              aria-label="הפחת מנה"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="text"
              inputMode="decimal"
              value={form.baseServings}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (raw !== '' && !DECIMAL_INPUT_RE.test(raw)) return;
                if (raw === '' || raw === '.' || raw === ',') {
                  update('baseServings', raw);
                  return;
                }
                const next = Number(normalizeDecimalText(raw));
                if (Number.isFinite(next) && next > 0) update('baseServings', next);
              }}
              className="flex-1 min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-center text-stone-900"
            />
            <button
              type="button"
              onClick={() => update('baseServings', servingsCount(form) + 1)}
              className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-700"
              aria-label="הוסף מנה"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[1, 2, 4, 6].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => update('baseServings', value)}
                className={`min-h-11 rounded-xl border text-sm transition ${
                  Number(form.baseServings) === value
                    ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                    : 'bg-white border-stone-200 text-stone-600'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
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
          <label className="text-sm text-stone-500 mb-2 block">ערכים תזונתיים כוללים — מחושבים אוטומטית מהמצרכים</label>
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
                  readOnly
                  value={form.macros[key]}
                  className="w-full min-h-11 bg-emerald-50 border border-emerald-200 rounded-xl px-2 py-2 text-sm text-center text-emerald-800"
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
            <button type="button" onClick={addEquipment} className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.equipment.map((eq, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 rounded-full pl-2 pr-3 py-1.5 text-sm text-stone-800">
                {eq}
                <button type="button" onClick={() => removeEquipment(i)}>
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
          <button type="button" onClick={applyIngredientPaste} className="mt-2 min-h-11 text-sm text-amber-800 font-medium">
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
                    onChange={(e) => onUnitChange(ing.id, e.target.value)}
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
                    type="button"
                    onClick={() => setExpandedIng((prev) => ({ ...prev, [ing.id]: !prev[ing.id] }))}
                    className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0"
                  >
                    <ChevronDown className={`w-4 h-4 text-stone-500 transition ${expandedIng[ing.id] ? 'rotate-180' : ''}`} />
                  </button>
                  <button type="button" onClick={() => removeIngredient(ing.id)} className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
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
          <button type="button" onClick={addBlankIngredient} className="mt-3 min-h-11 flex items-center gap-1.5 text-sm text-stone-600">
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
          <button type="button" onClick={applyStepPaste} className="mt-2 min-h-11 text-sm text-amber-800 font-medium">
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
                <button type="button" onClick={() => removeStep(i)} className="min-h-11 min-w-11 w-11 h-11 mt-1 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addBlankStep} className="mt-3 min-h-11 flex items-center gap-1.5 text-sm text-stone-600">
            <Plus className="w-4 h-4" /> הוסף שלב ידנית
          </button>
        </div>

        <RecipeVariationsEditor
          form={form}
          variations={form.variations || []}
          expandedId={expandedVariationId}
          onExpandedId={setExpandedVariationId}
          makeIngredient={makeIngredient}
          onChange={(variations) => setForm((f) => ({ ...f, variations }))}
        />
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-stone-50/95 backdrop-blur-xl border-t border-stone-200 p-4 flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 min-h-11 py-3 rounded-xl border border-stone-200 text-stone-800 font-medium hover:bg-stone-100 transition">
          ביטול
        </button>
        <button
          type="submit"
          disabled={!form.title.trim() || saving}
          className="flex-1 min-h-11 py-3 rounded-xl bg-amber-500 text-amber-950 font-medium disabled:opacity-40 hover:bg-amber-400 transition"
        >
          {saving ? 'שומר…' : 'שמירת מתכון'}
        </button>
      </div>

      <SmartImportModal
        open={showSmartImport}
        onClose={() => setShowSmartImport(false)}
        onExtracted={applySmartImportDraft}
      />
    </form>
  );
}

/* -------------------------------- settings view -------------------------------- */

function formatDateTime(ms) {
  return new Date(ms).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SettingsView({
  recipes, categories, onBack, onImport, safetySnapshots, onRestoreSnapshot, notify,
}) {
  const fileRef = useRef(null);
  const [snapshotToRestore, setSnapshotToRestore] = useState(null);

  function exportData() {
    const exportRecipes = recipes.map((recipe) => {
      const image = recipe.image || recipe.imageUrl || '';
      return {
        ...recipe,
        image,
        imageUrl: recipe.imageUrl || image,
        servingUnits: Array.isArray(recipe.servingUnits) ? recipe.servingUnits : [],
        nutritionBasis: recipe.nutritionBasis || recipe.macros?.nutritionBasis || '',
        recipeType: recipe.recipeType || recipe.macros?.recipeType || '',
        variations: normalizeVariations(recipe.variations),
        macros: {
          calories: recipe.macros?.calories ?? '',
          protein: recipe.macros?.protein ?? '',
          carbs: recipe.macros?.carbs ?? '',
          fat: recipe.macros?.fat ?? '',
          ...(recipe.macros?.fiber != null && recipe.macros.fiber !== '' ? { fiber: recipe.macros.fiber } : {}),
          ...(Array.isArray(recipe.servingUnits) && recipe.servingUnits.length
            ? { servingUnits: recipe.servingUnits }
            : {}),
          ...(recipe.nutritionBasis ? { nutritionBasis: recipe.nutritionBasis } : {}),
          ...(recipe.recipeType ? { recipeType: recipe.recipeType } : {}),
          ...(Array.isArray(recipe.variations) && recipe.variations.length
            ? { variations: normalizeVariations(recipe.variations) }
            : {}),
        },
      };
    });
    const blob = new Blob([JSON.stringify({ recipes: exportRecipes, categories }, null, 2)], { type: 'application/json' });
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
          <h2 className="font-serif text-lg text-stone-900 mb-1.5">גיבויי בטיחות אוטומטיים</h2>
          <p className="text-sm text-stone-500 leading-relaxed">נשמרים במכשיר לפני כל ייבוא או שחזור.</p>
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

      </div>

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
    registerPwaUpdates();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rawLocal = loadRawLocalRecipes();
      const previouslyTrashed = rawLocal.filter((r) => r.deletedAt).map((r) => String(r.id));
      const deletedIds = rememberDeletedRecipeIds(previouslyTrashed);
      const local = rawLocal
        .filter((r) => !r.deletedAt && !deletedIds.has(String(r.id)))
        .map(asUserRecipe);
      try {
        const remote = await fetchRecipes();
        if (cancelled) return;
        const toPurge = remote.filter((r) => deletedIds.has(String(r.id)));
        let persistError = null;
        if (toPurge.length) {
          try {
            await deleteRecipesByIds(toPurge.map((r) => r.id));
          } catch (purgeError) {
            persistError = purgeError;
          }
        }
        const fromCloud = remote
          .filter((r) => !deletedIds.has(String(r.id)))
          .map(asUserRecipe);
        const remoteIds = new Set(fromCloud.map((r) => String(r.id)));
        const localById = new Map(local.map((r) => [String(r.id), r]));
        const merged = fromCloud.map((remoteRecipe) => {
          const cached = localById.get(String(remoteRecipe.id));
          if (cached && Number(cached.updatedAt || 0) > Number(remoteRecipe.updatedAt || 0)) {
            return cached;
          }
          return remoteRecipe;
        });
        const localOnly = local.filter((r) => !remoteIds.has(String(r.id)));
        const next = mergeSystemSeedRecipes([...merged, ...localOnly].map(asUserRecipe), deletedIds);
        const toPersist = next.filter((recipe) => {
          const prev = fromCloud.find((r) => String(r.id) === String(recipe.id));
          if (!prev) return true;
          if (prev.title !== recipe.title) return true;
          if (Number(prev.baseServings) !== Number(recipe.baseServings)) return true;
          return Number(recipe.updatedAt || 0) > Number(prev.updatedAt || 0);
        });
        if (toPersist.length) {
          try {
            await upsertRecipes(toPersist);
          } catch (writeError) {
            persistError = persistError || writeError;
          }
        }
        if (cancelled) return;
        lastSyncedRef.current = next;
        setRecipes(next);
        setSyncMode('cloud');
        if (persistError) {
          setToast(`שמירה בענן נכשלה: ${formatRecipesDbError(persistError)}`);
        }
      } catch (e) {
        if (cancelled) return;
        setRecipes(mergeSystemSeedRecipes(local, deletedIds));
        setSyncMode('offline');
        setToast(`אין חיבור לענן — השינויים יישמרו במכשיר בלבד. ${formatRecipesDbError(e)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (syncMode === 'loading') return;
    saveLocalRecipes(recipes);
    if (syncMode !== 'cloud') return;
    const previous = lastSyncedRef.current;
    lastSyncedRef.current = recipes;
    syncRecipes(previous, recipes).catch((error) => {
      setToast(`שמירה בענן נכשלה: ${formatRecipesDbError(error)}`);
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
    const t = setTimeout(() => setToast(''), /נכשל|שגיאה|RLS|error/i.test(toast) ? 7000 : 2200);
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
    const existed = recipes.some((r) => String(r.id) === String(recipe.id));
    const keepServingMacros = recipe.nutritionBasis === 'serving' || recipe.macros?.nutritionBasis === 'serving';
    const prepared = keepServingMacros ? recipe : applyMacrosFromIngredients(recipe);
    const nextRecipe = asUserRecipe({
      ...prepared,
      updatedAt: Date.now(),
    });
    forgetDeletedRecipeIds([nextRecipe.id]);
    const nextRecipes = upsertRecipeInList(recipes, nextRecipe);
    lastSyncedRef.current = upsertRecipeInList(lastSyncedRef.current, nextRecipe);
    setRecipes(nextRecipes);
    saveLocalRecipes(nextRecipes);
    setSelectedId(nextRecipe.id);
    setView('detail');
    notify(existed ? 'המתכון עודכן בהצלחה' : 'המתכון נשמר בהצלחה');
    if (syncMode !== 'cloud') return;
    upsertRecipes([nextRecipe]).catch((error) => {
      notify(`שמירת המתכון בענן נכשלה: ${formatRecipesDbError(error)}`);
    });
  }

  function deleteRecipe(id) {
    const target = recipes.find((r) => String(r.id) === String(id));
    if (!target) return;
    rememberDeletedRecipeIds([id]);
    const nextRecipes = recipes.filter((r) => String(r.id) !== String(id));
    lastSyncedRef.current = lastSyncedRef.current.filter((r) => String(r.id) !== String(id));
    setRecipes(nextRecipes);
    saveLocalRecipes(nextRecipes);
    notify('המתכון נמחק לצמיתות');
    setView('home');
    if (syncMode !== 'cloud') return;
    deleteRecipesByIds([id]).catch((error) => {
      notify(`מחיקת המתכון בענן נכשלה: ${formatRecipesDbError(error)}`);
    });
  }

  function takeSafetySnapshot(reason) {
    saveSafetySnapshot(reason, recipes);
    setSafetySnapshots(loadSafetySnapshots());
  }

  function restoreSnapshot(snapshotId) {
    const snapshot = safetySnapshots.find((s) => s.id === snapshotId);
    if (!snapshot || !Array.isArray(snapshot.recipes)) return;
    takeSafetySnapshot('לפני שחזור גיבוי');
    const restored = snapshot.recipes.filter((r) => r && r.id != null).map(asUserRecipe);
    forgetDeletedRecipeIds(restored.map((r) => r.id));
    setRecipes((current) => mergeRecipesById(current, restored));
    notify('הגיבוי שוחזר');
  }

  // Import merges into existing data: same-id recipes are updated, nothing is ever removed.
  function handleImport(parsed) {
    const importedRecipes = Array.isArray(parsed) ? parsed : parsed?.recipes;
    const importedCategories = Array.isArray(parsed) ? null : parsed?.categories;

    if (Array.isArray(importedRecipes)) {
      const valid = importedRecipes.filter((r) => r && typeof r === 'object' && r.id != null).map(asUserRecipe);
      if (valid.length) {
        takeSafetySnapshot('לפני ייבוא');
        forgetDeletedRecipeIds(valid.map((r) => r.id));
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

  const activeRecipes = recipes;
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