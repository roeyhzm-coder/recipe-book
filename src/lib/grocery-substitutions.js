import { normalizeItemName } from '@/lib/grocery-utils';

const CONTEXT_GROUPS = [
  { id: 'cake', keys: ['עוגה', 'קינוח', 'עוגיות', 'בראוניז', 'מאפה', 'לחם מתוק'] },
  { id: 'shake', keys: ['שייק', 'קערה', 'אסאי', 'חלבון', 'פרוטאין'] },
  { id: 'ice', keys: ['גלידה', "נינג'ה", 'נינגה', 'קרימי'] },
  { id: 'salad', keys: ['סלט', 'ירק'] },
  { id: 'savory', keys: ['בשרי', 'ערב', 'צהריים', 'מרק', 'תבשיל', 'עוף', 'בקר', 'דג'] },
];

const CATALOG = [
  {
    keys: ['חלב', 'מילק', 'חלב 3', 'חלב 1'],
    default: ['משקה שיבולת שועל', 'חלב סויה', 'חלב שקדים'],
    contexts: {
      cake: ['משקה שיבולת שועל', 'חלב סויה', 'יוגורט טבעי'],
      shake: ['חלב 3%', 'משקה שקדים', 'מים + קרח'],
      ice: ['חלב קוקוס', 'משקה שקדים', 'שמנת מתוקה'],
    },
  },
  {
    keys: ['חזה עוף', 'עוף', 'חזה'],
    default: ['הודו נקבה', 'פרגית', 'טופו'],
    contexts: {
      salad: ['הודו נקבה', 'טונה', 'טופו'],
      savory: ['הודו נקבה', 'פרגית', 'שוקיים'],
    },
  },
  {
    keys: ['שמן זית'],
    default: ['שמן אבוקדו', 'שמן קנולה', 'שמן חמניות'],
    contexts: {
      cake: ['שמן קנולה', 'שמן קוקוס', 'חמאה'],
      salad: ['שמן אבוקדו', 'שמן קנולה', 'טחינה'],
    },
  },
  {
    keys: ['סילאן', 'סילאן תמרים'],
    default: ['דבש', 'סירופ מייפל', 'סילאן תמרים'],
  },
  {
    keys: ['דבש'],
    default: ['סילאן', 'סירופ מייפל', 'סוכר חום'],
    contexts: {
      cake: ['סוכר חום', 'סילאן', 'סירופ מייפל'],
    },
  },
  {
    keys: ['חמאת בוטנים', 'חמאת בוטנים טבעית'],
    default: ['חמאת שקדים', 'טחינה גולמית', 'חמאת קשיו'],
  },
  {
    keys: ['יוגורט', 'גביע יוגורט'],
    default: ['יוגורט סויה', 'קוטג׳', 'סקיר'],
    contexts: {
      cake: ['שמנת חמוצה', 'יוגורט סויה', 'מסקרפונה'],
      shake: ['סקיר', 'קוטג׳', 'חלבון יווני'],
    },
  },
  {
    keys: ['אבקת חלבון'],
    default: ['אבקת חלבון איזולט', 'יוגורט פרו', 'טופו משי'],
    contexts: {
      ice: ['אבקת חלבון וניל', 'חלב קוקוס', 'יוגורט יווני'],
    },
  },
  {
    keys: ['שיבולת שועל', 'שיבולת שועל דקה'],
    default: ['קוואקר', 'שיבולת שועל ללא גלוטן', 'קינואה פתיתים'],
  },
  {
    keys: ['לחם', 'פרוסות לחם', 'לחם אגוזים', 'מחמצת'],
    default: ['לחם מלא', 'טורטייה', 'לחם ללא גלוטן'],
  },
  {
    keys: ['בננה'],
    default: ['תמר מג׳הול', 'תפוח עץ', 'פירה בננה קפואה'],
    contexts: {
      shake: ['פירות יער', 'תמר מג׳הול', 'מנגו'],
      ice: ['בננה קפואה', 'מנגו', 'חלב קוקוס'],
    },
  },
  {
    keys: ['תותים', 'פירות יער', 'מנגו'],
    default: ['פירות יער קפואים', 'אוכמניות', 'אפרסק'],
  },
  {
    keys: ['אורז', 'אורז בסמטי'],
    default: ['אורז מלא', 'קינואה', 'קוסקוס'],
  },
  {
    keys: ['קמח'],
    default: ['קמח מלא', 'קמח שקדים', 'קמח כוסמין'],
    contexts: {
      cake: ['קמח שקדים', 'קמח כוסמין', 'תערובת ללא גלוטן'],
    },
  },
  {
    keys: ['סוכר'],
    default: ['סוכר חום', 'סילאן', 'אריתריטול'],
    contexts: {
      cake: ['סוכר חום', 'אריתריטול', 'סילאן'],
    },
  },
  {
    keys: ['חמאה'],
    default: ['מרגרינה', 'שמן קוקוס', 'שמן זית'],
    contexts: {
      cake: ['שמן קוקוס', 'רסק תפוחים', 'יוגורט'],
    },
  },
  {
    keys: ['שמנת', 'שמנת מתוקה'],
    default: ['חלב קוקוס', 'יוגורט יווני', 'שמנת צמחית'],
  },
  {
    keys: ['ביצים', 'ביצה'],
    default: ['תחליף ביצה', 'רסק תפוחים', 'יוגורט'],
    contexts: {
      savory: ['טופו', 'חלבונים', 'חומוס'],
    },
  },
  {
    keys: ['טונה'],
    default: ['סלמון מעושן', 'סרדינים', 'טופו'],
  },
  {
    keys: ['סלמון'],
    default: ['טונה', 'בקלה', 'פילה דג לבן'],
  },
  {
    keys: ['בקר', 'בשר בקר', 'סינטה'],
    default: ['הודו טחון', 'עוף טחון', 'עדשים'],
  },
  {
    keys: ['טחינה'],
    default: ['חמאת בוטנים', 'יוגורט', 'שמן זית'],
  },
  {
    keys: ['חומוס'],
    default: ['עדשים', 'שעועית לבנה', 'טופו'],
  },
  {
    keys: ['לימון', 'מיץ לימון'],
    default: ['ליים', 'חומץ תפוחים', 'חומץ יין'],
  },
  {
    keys: ['אבוקדו'],
    default: ['חומוס', 'יוגורט יווני', 'טחינה'],
  },
  {
    keys: ['פסטה'],
    default: ['פסטה מלאה', 'קישקסו', 'קינואה'],
  },
  {
    keys: ['תפוחי אדמה', 'תפוח אדמה'],
    default: ['בטטה', 'כרובית', 'אורז'],
  },
  {
    keys: ['ברוקולי'],
    default: ['כרובית', 'שעועית ירוקה', 'קישוא'],
  },
  {
    keys: ['תרד'],
    default: ['מנגולד', 'רוקט', 'קייל'],
  },
  {
    keys: ['גזר'],
    default: ['בטטה', 'דלעת', 'קישוא'],
  },
  {
    keys: ['מלפפון'],
    default: ['קישוא', 'סלרי', 'עגבניית שרי'],
  },
  {
    keys: ['פלפל', 'פלפל אדום'],
    default: ['עגבנייה', 'קישוא', 'גזר'],
  },
  {
    keys: ['צילי', 'צ׳ילי', "צ'ילי", 'צ׳ילי מתוק', "צ'ילי מתוק"],
    default: ['הרבנה', 'פפריקה חריפה', 'סריראצ׳ה'],
  },
  {
    keys: ['גבינה', 'גבינה צהובה', 'מוצרלה'],
    default: ['גבינה בולגרית', 'גבינה טבעונית', 'קוטג׳'],
  },
  {
    keys: ['שקדים', 'אגוזי מלך', 'אגוזים'],
    default: ['אגוזי מלך', 'קשיו', 'גרעיני דלעת'],
  },
  {
    keys: ['גרנולה'],
    default: ['שיבולת שועל קלויה', 'אגוזים קצוצים', 'קוקוס'],
  },
  {
    keys: ['קקאו', 'אבקת קקאו'],
    default: ['שוקולד מריר', 'קקאו לא ממותק', 'חלבון בטעם שוקולד'],
  },
  {
    keys: ['קוקוס', 'חלב קוקוס'],
    default: ['חלב שקדים', 'שמנת צמחית', 'יוגורט קוקוס'],
  },
];

function detectContexts(item) {
  const haystack = [
    item?.name,
    ...((item?.sourceRecipes || []).flatMap((source) => [source.title, ...(source.categories || [])])),
  ].filter(Boolean).join(' ').toLowerCase();

  return CONTEXT_GROUPS.filter((group) => group.keys.some((key) => haystack.includes(key))).map((group) => group.id);
}

function hasWordSequence(haystack, needle) {
  if (!haystack.length || !needle.length || needle.length > haystack.length) return false;
  return haystack.some((_, index) => needle.every((word, offset) => haystack[index + offset] === word));
}

function catalogMatch(itemName) {
  const key = normalizeItemName(itemName);
  if (!key) return null;
  const itemWords = key.split(' ').filter(Boolean);
  return CATALOG.find((entry) => entry.keys.some((candidate) => {
    const normalized = normalizeItemName(candidate);
    if (!normalized) return false;
    if (key === normalized) return true;
    const candidateWords = normalized.split(' ').filter(Boolean);
    return hasWordSequence(itemWords, candidateWords) || hasWordSequence(candidateWords, itemWords);
  })) || null;
}

export function getGrocerySubstitutions(item) {
  const entry = catalogMatch(item?.name);
  if (!entry) return [];
  const contexts = detectContexts(item);
  const contextual = contexts.map((id) => entry.contexts?.[id]).find((options) => Array.isArray(options) && options.length);
  const options = (contextual || entry.default || []).filter((option) => normalizeItemName(option) !== normalizeItemName(item.name));
  return [...new Set(options)].slice(0, 3);
}
