import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import {
  CUSTOM_UNIT_PORTION,
  bindCatalogSelection,
  findCatalogItem,
  formatLiveGramsHint,
  getPortionOptions,
  israeliFoodSuggestions,
  portionOption,
} from '@/lib/food-portions';

const DECIMAL_INPUT_RE = /^[0-9]*[.,]?[0-9]*$/;
const AMOUNT_PRESETS = [0.5, 1, 1.5, 2];

function normalizeDecimalText(raw) {
  return String(raw ?? '').replace(',', '.');
}

function parseAmount(raw) {
  const n = Number(normalizeDecimalText(raw));
  return Number.isFinite(n) && n >= 0 ? n : 0;
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
  showPresets = true,
}) {
  const [nameOpen, setNameOpen] = useState(false);
  const options = useMemo(
    () => getPortionOptions(name, { unit, unitWeightGrams }),
    [name, unit, unitWeightGrams],
  );
  const selected = options.find((option) => option.unit === unit || option.label === unit)
    || options.find((option) => option.id === 'gram')
    || options[0];
  const suggestions = useMemo(
    () => (nameOpen && String(name || '').trim() ? israeliFoodSuggestions(name) : []),
    [nameOpen, name],
  );
  const matched = findCatalogItem(name);
  const hint = formatLiveGramsHint(amount, unit, name, unitWeightGrams);
  const needsWeight = !matched && !!(selected?.requiresWeight || (selected?.kind === 'piece' && !(optionWeight(selected, unitWeightGrams) > 0)));

  function patch(next) {
    onChange?.({
      amount,
      unit,
      name,
      unitWeightGrams,
      ...next,
    });
  }

  function setAmountValue(value) {
    const next = Math.max(0, Math.round(Number(value) * 100) / 100);
    patch({ amount: next });
  }

  function handleAmountInput(raw) {
    if (raw !== '' && !DECIMAL_INPUT_RE.test(raw)) return;
    if (raw === '' || raw === '.' || raw === ',') {
      patch({ amount: raw });
      return;
    }
    patch({ amount: parseAmount(raw) });
  }

  function handleUnit(optionId) {
    const option = options.find((row) => row.id === optionId) || portionOption(CUSTOM_UNIT_PORTION);
    const previous = parseAmount(amount);
    const nextAmount = previous > 0 ? previous : 1;
    const nextWeight = option.requiresWeight
      ? (Number(unitWeightGrams) > 0 ? Number(unitWeightGrams) : '')
      : (option.kind === 'piece' || option.kind === 'household' || Number(option.grams) > 1 ? option.grams : '');
    patch({
      amount: nextAmount,
      unit: option.unit,
      unitWeightGrams: nextWeight,
    });
  }

  function handleName(nextName) {
    setNameOpen(true);
    const exact = findCatalogItem(nextName);
    const normalized = String(nextName || '').trim();
    if (exact && String(exact.label || '').trim() === normalized) {
      patch(bindCatalogSelection(exact, amount));
      setNameOpen(false);
      return;
    }
    patch({ name: nextName });
  }

  function handleSelectSuggestion(suggestion) {
    patch(bindCatalogSelection(suggestion.item || suggestion, amount));
    setNameOpen(false);
  }

  return (
    <div className="flex flex-col gap-1.5" dir="rtl">
      <div className="flex gap-1.5 items-center">
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setAmountValue(Math.max(0, parseAmount(amount) - 0.5))}
            className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center"
            aria-label="הפחת כמות"
          >
            <Minus className="w-3.5 h-3.5 text-stone-600" />
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountInput(e.target.value)}
            className="w-14 min-h-11 bg-white border border-stone-200 rounded-lg px-1.5 py-1.5 text-sm text-center text-stone-900 tabular-nums"
          />
          <button
            type="button"
            onClick={() => setAmountValue(parseAmount(amount) + 0.5)}
            className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center"
            aria-label="הוסף כמות"
          >
            <Plus className="w-3.5 h-3.5 text-stone-600" />
          </button>
        </div>
        <select
          value={selected?.id || 'gram'}
          onChange={(e) => handleUnit(e.target.value)}
          className="min-h-11 flex-1 bg-white border border-stone-200 rounded-lg px-1.5 py-1.5 text-sm text-stone-900"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {showName && (
        <div className="relative">
          <input
            value={name}
            onChange={(e) => handleName(e.target.value)}
            onFocus={() => setNameOpen(true)}
            onBlur={() => setTimeout(() => setNameOpen(false), 180)}
            placeholder="שם המצרך"
            className="w-full min-h-11 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm text-stone-900 placeholder:text-stone-400"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-20 top-full inset-x-0 mt-1 rounded-xl border border-stone-200 bg-white shadow-lg overflow-hidden">
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
      {showPresets && (
        <div className="grid grid-cols-4 gap-1.5">
          {AMOUNT_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAmountValue(value)}
              className={`min-h-11 rounded-lg border text-xs transition ${
                Number(normalizeDecimalText(amount)) === value
                  ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                  : 'bg-white border-stone-200 text-stone-600'
              }`}
            >
              {value}
            </button>
          ))}
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
      {hint ? (
        <p className="text-[11px] text-stone-500 leading-relaxed">
          {hint}
          {matched ? ' · לפי המאגר הישראלי' : ' · מידה אוניברסלית'}
        </p>
      ) : null}
    </div>
  );
}
