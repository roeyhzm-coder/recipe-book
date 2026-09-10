# My Recipe Book

import React, { useState, useEffect, useRef, useMemo } from 'react';

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

const API_KEY_STORAGE_KEY = 'mitbach_gemini_key_v1';

const MODEL_STORAGE_KEY = 'mitbach_gemini_model_v1';

const DEFAULT_CATEGORY_NAMES = [

  'ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'עתיר חלבון', 'בשרי', 'נשנושים', 'גלידות',

  'דגים', 'דל פחמימה', 'קינוחים', 'שייקים', 'סלטים', 'מהיר להכנה', 'Meal Prep',

];

const PINNED_BY_DEFAULT = ['ארוחת בוקר', 'ארוחת צהריים', 'ארוחת ערב', 'עתיר חלבון'];

const UNIT_LIST = ['גרם', 'ק"ג', 'מ"ל', 'ליטר', 'כוס', 'כפות', 'כפית', 'יחידה', 'חופן', 'קורט'];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

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

function loadApiKey() {

  try {

    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';

  } catch (e) {

    return '';

  }

}

function saveApiKey(key) {

  try {

    localStorage.setItem(API_KEY_STORAGE_KEY, key || '');

  } catch (e) {}

}

function loadModelName() {

  try {

    return localStorage.getItem(MODEL_STORAGE_KEY) || 'gemini-2.5-flash';

  } catch (e) {

    return 'gemini-2.5-flash';

  }

}

function saveModelName(model) {

  try {

    localStorage.setItem(MODEL_STORAGE_KEY, model || 'gemini-2.5-flash');

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

const EXTRACT_PROMPT = `אתה מומחה לחילוץ מתכוני בישול מטקסט חופשי או מתמונה של פוסט/מתכון.

החזר אך ורק אובייקט JSON תקין, ללא כל טקסט נוסף, ללא markdown וללא הסברים, במבנה המדויק הבא:

{

  "title": "string - שם המתכון",

  "equipment": ["מערך מחרוזות - רק מכשור חשמלי וכלים מרכזיים בלבד (לדוגמה: נינג'ה גריל, תנור, בלנדר, מעבד מזון, משקל מזון, סיר לחץ, מיקרוגל, כיריים). אסור בהחלט לכלול כלים בסיסיים כמו כפית, מזלג, סכין, קערה, צלחת, צנצנת, מלקחיים או כוסות."],

  "ingredients": [{ "amount": number, "unit": "string ביחידות עבריות כמו גרם/מ״ל/כפות/כפית/יחידה", "name": "string", "calories": number_or_null, "protein": number_or_null, "carbs": number_or_null, "fat": number_or_null }],

  "steps": ["מערך מחרוזות - שלבי הכנה ברורים וממוספרים לוגית"],

  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number }

}

כללים:

- אם ערכים תזונתיים לא מופיעים בטקסט, חשב הערכה תזונתית משוערת לפי המצרכים.

- כל הטקסט בעברית תקנית.

- ציוד שלא נחוץ או כלים פשוטים — לא להוסיף כלל.`;

async function callGeminiExtractRecipe(apiKey, { text, imageBase64, imageMime }, preferredModel) {

  const modelsToTry = preferredModel 

    ? [preferredModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'].filter((v, i, a) => a.indexOf(v) === i)

    : ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

  const parts = [{ text: EXTRACT_PROMPT }];

  if (text) parts.push({ text: `הטקסט לניתוח:\n${text}` });

  if (imageBase64) {

    parts.push({

      inlineData: {

        mimeType: imageMime || 'image/jpeg',

        data: imageBase64,

      },

    });

  }

  let lastErrorMsg = '';

  for (const model of modelsToTry) {

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {

      const res = await fetch(url, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          contents: [{ role: 'user', parts }],

          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },

        }),

      });

      if (res.status === 404) {

        continue;

      }

      const data = await res.json();

      if (!res.ok) {

        throw new Error(data?.error?.message || `שגיאה מהשרת (קוד ${res.status})`);

      }

      const raw = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || [])

        .map((p) => p.text || '')

        .join('');

      if (!raw.trim()) throw new Error('לא התקבלה תשובה מה-AI.');

      const cleaned = raw.trim().replace(/^```json/i, '').replace(/^

הפעל את הקוד המלא הזה בקובץ הראשי של האפליקציה

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://smart-recipe-palette-68.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d08de25b-1e8e-4926-a4ca-9a4a2757888f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
