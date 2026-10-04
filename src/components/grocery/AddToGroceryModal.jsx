import { useEffect, useState } from 'react';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';

const QUICK_SERVINGS = [0.25, 0.5, 1, 2, 4];
const DECIMAL_INPUT_RE = /^[0-9]*[.,]?[0-9]*$/;

function normalizeDecimalText(raw) {
  return String(raw ?? '').replace(',', '.');
}

function parsePositiveDecimal(raw, fallback = 1) {
  const n = Number(normalizeDecimalText(raw));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default function AddToGroceryModal({ open, recipe, lists, defaultListId, onClose, onConfirm }) {
  const [listId, setListId] = useState(defaultListId || lists[0]?.id || '');
  const [servingsInput, setServingsInput] = useState('1');

  useEffect(() => {
    if (!open) return;
    setListId(defaultListId || lists[0]?.id || '');
    const base = Number(recipe?.baseServings);
    const next = Number.isFinite(base) && base > 0 ? base : 1;
    setServingsInput(String(next));
  }, [open, defaultListId, lists, recipe]);

  if (!open || !recipe) return null;

  const count = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.filter((item) => String(item?.name || '').trim()).length
    : 0;
  const baseServings = Number(recipe.baseServings) || 1;
  const servings = parsePositiveDecimal(servingsInput, 1);

  function setServingsValue(value) {
    const next = Math.max(0.01, Math.min(24, Number(value) || 1));
    setServingsInput(String(next));
  }

  function bump(delta) {
    setServingsValue(servings + delta);
  }

  function handleServingsInput(raw) {
    const value = String(raw).trim();
    if (value !== '' && !DECIMAL_INPUT_RE.test(value)) return;
    setServingsInput(value);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-stone-200"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-stone-900">הוספה לרשימת קניות</h3>
              <p className="text-sm text-stone-500 mt-1 leading-relaxed">
                {count} מצרכים מתוך "{recipe.title}"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>

        <p className="text-xs text-stone-500 mb-2">בחרו רשימה</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => setListId(list.id)}
              className={`min-h-11 px-3.5 py-2 rounded-full border text-sm transition ${
                listId === list.id
                  ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {list.name}
            </button>
          ))}
        </div>

        <p className="text-xs text-stone-500 mb-2">מספר מנות</p>
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 mb-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => bump(-0.25)}
              className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-700"
              aria-label="הפחת מנה"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center min-w-0 flex-1">
              <input
                type="text"
                inputMode="decimal"
                min="0.01"
                step="any"
                value={servingsInput}
                onChange={(e) => handleServingsInput(e.target.value)}
                className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-2 py-1.5 font-serif text-2xl text-stone-900 tabular-nums text-center"
              />
              <p className="text-[11px] text-stone-400 mt-1">בסיס המתכון: {baseServings}</p>
            </div>
            <button
              type="button"
              onClick={() => bump(0.25)}
              className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-700"
              aria-label="הוסף מנה"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2 mt-3">
            {QUICK_SERVINGS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setServingsValue(value)}
                className={`min-h-11 rounded-xl border text-sm transition ${
                  Number(normalizeDecimalText(servingsInput)) === value
                    ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                    : 'bg-white border-stone-200 text-stone-600'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={!listId || count === 0 || !(Number(normalizeDecimalText(servingsInput)) > 0)}
          onClick={() => onConfirm(listId, servings)}
          className="w-full min-h-11 py-2.5 rounded-xl bg-amber-500 text-amber-950 text-sm font-medium disabled:opacity-40 hover:bg-amber-400 transition"
        >
          הוסף {servings} מנות לרשימה
        </button>
      </div>
    </div>
  );
}
