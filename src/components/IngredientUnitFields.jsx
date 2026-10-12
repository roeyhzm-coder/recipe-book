import { useMemo, useState } from 'react';
import { Minus, PencilLine, Plus } from 'lucide-react';
import {
  CUSTOM_UNIT_PORTION,
  bindCatalogSelection,
  findCatalogItem,
  formatLiveGramsHint,
  getPortionOptions,
  israeliFoodSuggestions,
  normalizeFoodName,
  portionOption,
} from '@/lib/food-portions';
import { amountToGrams, findIngredientNutrition, macrosForIngredient } from '@/lib/ingredient-macros';

const DECIMAL_INPUT_RE = /^[0-9]*[.,]?[0-9]*$/;
const PARTIAL_DECIMAL_RE = /^[0-9]*\.([0-9]*0)?$/;
const MACRO_FIELDS = [
  { key: 'calories', label: 'קלוריות', unit: 'קק"ל', tone: 'text-amber-800 bg-amber-50 border-amber-200' },
  { key: 'protein', label: 'חלבון', unit: 'ג׳', tone: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  { key: 'carbs', label: 'פחמימות', unit: 'ג׳', tone: 'text-sky-800 bg-sky-50 border-sky-200' },
  { key: 'fat', label: 'שומן', unit: 'ג׳', tone: 'text-rose-800 bg-rose-50 border-rose-200' },
];
const EMPTY_PER100 = { calories: '', protein: '', carbs: '', fat: '' };

function normalizeDecimalText(raw) {
  return String(raw ?? '').replace(',', '.');
}

function parseAmount(raw) {
  const n = Number(normalizeDecimalText(raw));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function formatMacro(key, value) {
  const n = Number(value) || 0;
  if (key === 'calories') return String(Math.round(n));
  return String(Math.round(n * 10) / 10);
}

function hasNutritionData(ingredient) {
  const per100 = ingredient?.per100;
  if (per100 && typeof per100 === 'object' && Object.values(per100).some((v) => String(v ?? '').trim() !== '')) return true;
  if (findIngredientNutrition(ingredient?.name)) return true;
  return ['calories', 'protein', 'carbs', 'fat'].some((k) => Number(ingredient?.[k]) > 0);
}

function optionWeight(option, customWeight) {
  if (option?.requiresWeight) {
    const n = Number(customWeight);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  return Number(option?.grams) > 0 ? Number(option.grams) : 0;
}

export default function IngredientUnitFields({
  amount,
  unit,
  name,
  unitWeightGrams,
  onChange,
  showName = true,
  per100,
  customNutrition = false,
  catalogLabel,
  storedMacros,
  showMacros = false,
  allowCustom = false,
}) {
  const [nameOpen, setNameOpen] = useState(false);
  // A row picked from the list stays bound to that catalog item while its name is edited freely.
  const linked = !customNutrition && !!catalogLabel;
  const lookupName = linked ? catalogLabel : name;
  const options = useMemo(
    () => getPortionOptions(lookupName, { unit, unitWeightGrams }),
    [lookupName, unit, unitWeightGrams],
  );
  const selected = options.find((option) => option.unit === unit || option.label === unit)
    || options.find((option) => option.id === 'gram')
    || options[0];
  const suggestions = useMemo(
    () => (nameOpen && !customNutrition && String(name || '').trim() ? israeliFoodSuggestions(name) : []),
    [nameOpen, customNutrition, name],
  );
  const matched = findCatalogItem(lookupName);
  const hint = formatLiveGramsHint(amount, unit, lookupName, unitWeightGrams);
  const liveIngredient = { amount, unit, name, catalogLabel: linked ? catalogLabel : undefined, unitWeightGrams, per100, ...(storedMacros || {}) };
  const liveMacros = showMacros ? macrosForIngredient(liveIngredient) : null;
  const liveGrams = showMacros ? amountToGrams(amount, unit, lookupName, unitWeightGrams) : 0;
  const showLinkChip = linked && normalizeFoodName(name) !== normalizeFoodName(catalogLabel);
  const hasData = showMacros && (customNutrition || hasNutritionData(liveIngredient));
  const needsWeight = !customNutrition && !matched && !!(selected?.requiresWeight || (selected?.kind === 'piece' && !(optionWeight(selected, unitWeightGrams) > 0)));

  function patch(next) {
    onChange?.({
      amount,
      unit,
      name,
      unitWeightGrams,
      ...next,
    });
  }

  function toggleCustom() {
    if (customNutrition) {
      patch({ customNutrition: false, per100: matched?.per100 || undefined });
      return;
    }
    const grams = amountToGrams(amount, unit, lookupName, unitWeightGrams);
    const base = per100 && typeof per100 === 'object' ? per100 : matched?.per100;
    patch({
      customNutrition: true,
      unit: 'גרם',
      amount: grams > 0 ? Math.round(grams * 100) / 100 : '',
      unitWeightGrams: '',
      per100: { ...EMPTY_PER100, ...(base || {}) },
    });
  }

  function handlePer100(key, raw) {
    const text = String(raw ?? '').trim();
    if (text !== '' && !DECIMAL_INPUT_RE.test(text)) return;
    patch({ per100: { ...EMPTY_PER100, ...(per100 || {}), [key]: normalizeDecimalText(text) } });
  }

  function setAmountValue(value) {
    const next = Math.max(0, Math.round(Number(value) * 100) / 100);
    patch({ amount: next });
  }

  function handleAmountInput(raw) {
    const text = normalizeDecimalText(String(raw ?? '').trim());
    if (text !== '' && !DECIMAL_INPUT_RE.test(text)) return;
    // Keep partial decimals ("1.", "0.0", "2.50") as text so the dot survives typing.
    if (text === '' || PARTIAL_DECIMAL_RE.test(text)) {
      patch({ amount: text });
      return;
    }
    patch({ amount: parseAmount(text) });
  }

  function handleAmountBlur() {
    if (typeof amount !== 'string') return;
    if (amount === '' || amount === '.') return;
    patch({ amount: parseAmount(amount) });
  }

  function handleUnit(optionId) {
    const option = options.find((row) => row.id === optionId) || portionOption(CUSTOM_UNIT_PORTION);
    const previous = parseAmount(amount);
    const nextWeight = option.requiresWeight
      ? (Number(unitWeightGrams) > 0 ? Number(unitWeightGrams) : '')
      : (option.kind === 'piece' || option.kind === 'household' || Number(option.grams) > 1 ? option.grams : '');
    // Convert through grams: 200 גרם → קופסה (100ג) becomes 2, and back again.
    const totalGrams = amountToGrams(previous, unit, lookupName, unitWeightGrams);
    const newUnitGrams = option.requiresWeight ? Number(nextWeight) : Number(option.grams);
    let nextAmount = previous > 0 ? previous : 1;
    if (totalGrams > 0 && newUnitGrams > 0) {
      nextAmount = Math.round((totalGrams / newUnitGrams) * 100) / 100 || 0.01;
    }
    patch({
      amount: nextAmount,
      unit: option.unit,
      unitWeightGrams: nextWeight,
    });
  }

  // Free typing: the raw value is stored as-is (no trim, no auto-binding) so spaces and
  // multi-word names are never swallowed. Binding happens only on an explicit list pick.
  function handleName(nextName) {
    setNameOpen(true);
    if (customNutrition || linked) {
      patch({ name: nextName });
      return;
    }
    // Unlinked rows re-resolve their macros from the new name instead of keeping stale ones.
    patch({ name: nextName, per100: undefined, calories: '', protein: '', carbs: '', fat: '' });
  }

  function handleNameBlur() {
    setTimeout(() => setNameOpen(false), 180);
    const trimmed = String(name ?? '').replace(/\s+/g, ' ').trim();
    if (trimmed !== name) patch({ name: trimmed });
  }

  function unlinkCatalog() {
    patch({ catalogLabel: undefined, per100: undefined, calories: '', protein: '', carbs: '', fat: '' });
  }

  function handleSelectSuggestion(suggestion) {
    patch({ ...bindCatalogSelection(suggestion.item || suggestion, amount), customNutrition: false });
    setNameOpen(false);
  }

  const amountStep = customNutrition || selected?.grams === 1 ? 10 : 0.5;
  const stepButton = 'min-h-11 min-w-11 w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center active:bg-stone-200';

  return (
    <div className="flex flex-col gap-2" dir="rtl">
      <div className="flex gap-2 items-center">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAmountValue(Math.max(0, parseAmount(amount) - amountStep))}
            className={stepButton}
            aria-label="הפחת כמות"
          >
            <Minus className="w-3.5 h-3.5 text-stone-600" />
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountInput(e.target.value)}
            onBlur={handleAmountBlur}
            aria-label={customNutrition ? 'משקל כולל בגרמים' : 'כמות'}
            className="w-16 min-h-11 bg-white border border-stone-200 rounded-lg px-1.5 py-1.5 text-sm text-center text-stone-900 tabular-nums"
          />
          <button
            type="button"
            onClick={() => setAmountValue(parseAmount(amount) + amountStep)}
            className={stepButton}
            aria-label="הוסף כמות"
          >
            <Plus className="w-3.5 h-3.5 text-stone-600" />
          </button>
        </div>
        {customNutrition ? (
          <span className="min-h-11 flex-1 min-w-0 flex items-center px-2.5 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-600">
            גרם · משקל כולל
          </span>
        ) : (
          <select
            value={selected?.id || 'gram'}
            onChange={(e) => handleUnit(e.target.value)}
            className="min-h-11 flex-1 min-w-0 bg-white border border-stone-200 rounded-lg px-1.5 py-1.5 text-sm text-stone-900"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {showName && (
        <div className="relative">
          <input
            value={name}
            onChange={(e) => handleName(e.target.value)}
            onFocus={() => setNameOpen(true)}
            onBlur={handleNameBlur}
            placeholder="שם המצרך"
            className="w-full min-h-11 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div
              role="listbox"
              className="absolute z-50 top-full inset-x-0 mt-1 max-h-60 overflow-y-auto overscroll-contain touch-pan-y rounded-xl border border-stone-200 bg-white shadow-lg"
              style={{ WebkitOverflowScrolling: 'touch' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full min-h-11 px-3 text-right text-sm text-stone-800 hover:bg-amber-50"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {showName && showLinkChip && (
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
          <span className="truncate">ערכים לפי: {catalogLabel}</span>
          <button
            type="button"
            onClick={unlinkCatalog}
            className="min-h-8 shrink-0 px-2 rounded-full border border-stone-200 bg-white text-stone-600"
          >
            ניתוק
          </button>
        </div>
      )}
      {needsWeight && (
        <input
          type="text"
          inputMode="decimal"
          value={unitWeightGrams ?? ''}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (raw !== '' && !DECIMAL_INPUT_RE.test(raw)) return;
            if (raw === '' || raw === '.' || raw === ',') {
              patch({ unitWeightGrams: raw });
              return;
            }
            const next = Number(normalizeDecimalText(raw));
            if (Number.isFinite(next) && next > 0) patch({ unitWeightGrams: next });
          }}
          placeholder="משקל יחידה בגרמים (חובה)"
          className="w-full min-h-11 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 text-sm text-center text-stone-900 placeholder:text-amber-700/70"
        />
      )}
      {!customNutrition && hint ? (
        <p className="text-[11px] text-stone-500 leading-relaxed">
          {hint}
          {matched ? ' · לפי המאגר הישראלי' : ' · מידה אוניברסלית'}
        </p>
      ) : null}
      {allowCustom && (
        <button
          type="button"
          onClick={toggleCustom}
          aria-pressed={customNutrition}
          className={`self-start min-h-9 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs transition ${
            customNutrition
              ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
              : 'bg-white border-stone-200 text-stone-600'
          }`}
        >
          <PencilLine className="w-3.5 h-3.5" />
          {customNutrition ? 'הזנה ידנית פעילה · חזרה למאגר' : 'הזנת ערכים ידנית'}
        </button>
      )}
      {customNutrition && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2">
          <p className="text-[11px] text-amber-900 mb-1.5">ערכים תזונתיים ל-100 גרם</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {MACRO_FIELDS.map((field) => (
              <label key={field.key} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-stone-500">{field.label} ({field.unit})</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={per100?.[field.key] ?? ''}
                  onChange={(e) => handlePer100(field.key, e.target.value)}
                  placeholder="0"
                  className="min-h-10 bg-white border border-stone-200 rounded-lg px-1.5 text-sm text-center text-stone-900 tabular-nums"
                />
              </label>
            ))}
          </div>
        </div>
      )}
      {showMacros && (
        hasData ? (
          <div aria-live="polite">
            <p className="text-[10px] text-stone-400 mb-1">
              תרומת המצרך{liveGrams > 0 ? ` · ${formatMacro('protein', liveGrams)} גרם` : ''}
            </p>
            <div className="grid grid-cols-4 gap-1">
              {MACRO_FIELDS.map((field) => (
                <div key={field.key} className={`rounded-lg border px-1 py-1 text-center ${field.tone}`}>
                  <div className="text-sm font-semibold tabular-nums leading-tight">
                    {formatMacro(field.key, liveMacros?.[field.key])}
                  </div>
                  <div className="text-[10px] leading-tight opacity-80">
                    {field.key === 'calories' ? field.unit : `${field.label} (${field.unit})`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-stone-400">
            אין נתונים תזונתיים למצרך{allowCustom ? ' — אפשר להזין ידנית' : ''}
          </p>
        )
      )}
    </div>
  );
}
