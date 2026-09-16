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
    id: 'demo-1',
    title: "חזה עוף בנינג'ה עתיר חלבון",
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&q=80',
    categories: ['ארוחת צהריים', 'עתיר חלבון', 'בשרי'],
    equipment: ["נינג'ה גריל", 'משקל מזון'],
    ingredients: [
      makeIngredient(500, 'גרם', 'חזה עוף', 550, 95, 0, 12),
      makeIngredient(1, 'כפות', 'שמן זית', 120, 0, 0, 14),
      makeIngredient(1, 'כפית', 'פפריקה מתוקה'),
      makeIngredient(0.5, 'כפית', 'מלח'),
      makeIngredient(0.25, 'כפית', 'פלפל שחור גרוס'),
      makeIngredient(2, 'יחידה', 'שיני שום כתושות'),
    ],
    steps: [
      "חממו את הנינג'ה גריל במצב Max Grill במשך 5 דקות עד שהוא מוכן לבישול.",
      'ייבשו את חזה העוף במגבת נייר ותבלו משני הצדדים בשמן זית, פפריקה, מלח, פלפל שחור ושום כתוש.',
      "סדרו את החזה עוף על פלטת הגריל של הנינג'ה וסגרו את המכסה.",
      'בשלו 12 דקות, הפכו לצד השני ובשלו עוד 10 דקות נוספות עד להשחמה יפה.',
      'הוציאו את הבשר ותנו לו לנוח 5 דקות לפני החיתוך, כדי שהמיצים יישמרו בפנים.',
    ],
    macros: { calories: 850, protein: 95, carbs: 4, fat: 45 },
    rating: 9.2,
    baseServings: 2,
    favorite: true,
    createdAt: Date.now() - 300000,
  },
  {
    id: 'demo-2',
    title: 'גלידת חלבון בננה',
    image: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&q=80',
    categories: ['נשנושים', 'גלידות', 'עתיר חלבון'],
    equipment: ['בלנדר או מעבד מזון'],
    ingredients: [
      makeIngredient(2, 'יחידה', 'בננות קפואות ופרוסות', 210, 3, 54, 1),
      makeIngredient(30, 'גרם', 'אבקת חלבון בטעם וניל', 110, 24, 3, 1),
      makeIngredient(100, 'מ"ל', 'חלב שקדים לא ממותק', 15, 1, 1, 1),
      makeIngredient(1, 'כפות', 'חמאת בוטנים', 95, 4, 3, 8),
    ],
    steps: [
      'קלפו את הבננות, חתכו לפרוסות והקפיאו לפחות 3 שעות מראש בשקית סגורה.',
      'הכניסו את כל המצרכים לבלנדר או מעבד מזון חזק.',
      'טחנו כ-3 דקות עד לקבלת מרקם חלק ואחיד, תוך עצירה וגירוד הדפנות לפי הצורך.',
      'העבירו לתבנית הקפאה מוכנה והקפיאו לפחות 60 דקות לקבלת מרקם גלידה.',
      'הוציאו מהפריזר, קשטו לפי הטעם והגישו מיד.',
    ],
    macros: { calories: 420, protein: 38, carbs: 45, fat: 10 },
    rating: 8.6,
    baseServings: 2,
    favorite: false,
    createdAt: Date.now() - 200000,
  },
  {
    id: 'demo-3',
    title: 'שיבולת שועל לילה לבוקר',
    image: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=800&q=80',
    categories: ['ארוחת בוקר'],
    equipment: ['משקל מזון'],
    ingredients: [
      makeIngredient(60, 'גרם', 'שיבולת שועל', 220, 8, 38, 4),
      makeIngredient(150, 'מ"ל', 'חלב', 95, 5, 7, 5),
      makeIngredient(100, 'גרם', 'יוגורט יווני', 65, 10, 4, 0),
      makeIngredient(1, 'כפית', 'דבש', 20, 0, 6, 0),
      makeIngredient(1, 'חופן', 'פירות יער'),
    ],
    steps: [
      'שימו את שיבולת השועל, החלב, היוגורט והדבש בקערה או כלי אחסון.',
      'ערבבו היטב עם כפית עד לקבלת תערובת אחידה.',
      'הכניסו למקרר למנוחה של 6 שעות לפחות, רצוי לילה שלם.',
      'הוציאו מהמקרר, קשטו בפירות יער טריים והגישו.',
    ],
    macros: { calories: 380, protein: 22, carbs: 55, fat: 8 },
    rating: 7.4,
    baseServings: 1,
    favorite: false,
    createdAt: Date.now() - 100000,
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
/* המרה משוערת לכלי מטבח נפוצים: כפית 5, כף 15, כוס 240 */
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
  const fmt = (n) => {
    const r = Math.round(n * 4) / 4;
    return r % 1 === 0 ? String(r) : String(r);
  };
  if (v >= CUP * 0.75) return `כ-${fmt(v / CUP)} כוס`;
  if (v >= TBSP) return `כ-${fmt(v / TBSP)} כף`;
  if (v >= TSP / 2) return `כ-${fmt(v / TSP)} כפית`;
  return 'פחות מכפית';
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

/* הקריאה ל-Gemini מתבצעת בשרת דרך extractRecipe */



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
    <div className="flex flex-col items-center justify-center gap-0.5 px-1 py-2">
      <Icon className="w-4 h-4 text-slate-500" />
      <span className="text-sm font-semibold text-slate-800 tabular-nums">
        {value === '' || value === undefined ? '—' : `${value}${unit}`}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
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

/* ------------------------------ rating badge ------------------------------ */
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
      className={`text-right cursor-pointer ${getRatingCardClass(recipe.rating)} rounded-2xl border border-slate-200 overflow-hidden flex flex-col active:scale-95 transition`}
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
        {recipe.rating !== '' && recipe.rating !== undefined && (
          <div className="flex items-center gap-1 text-sm font-semibold text-slate-700">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{Number(recipe.rating).toFixed(1)}</span>
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
        <div className="mt-auto grid grid-cols-4 divide-x divide-x-reverse divide-slate-200 border-t border-slate-200 pt-2 -mx-1">
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
    const reader = new FileReader();
    reader.onload = () => update('image', reader.result);
    reader.readAsDataURL(file);
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
        {/* AI info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-serif text-base text-slate-900 mb-1">ייבוא חכם עם AI</h2>
          <p className="text-sm text-slate-500">
            הייבוא החכם פועל דרך השרת של האפליקציה — אין צורך במפתח אישי.
          </p>
        </div>


        {/* backup */}
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

        {/* reset */}
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
        if (rows.length) {
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