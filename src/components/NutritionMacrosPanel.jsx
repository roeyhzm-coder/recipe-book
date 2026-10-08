import React, { useEffect, useState } from 'react';
import { Flame, Dumbbell, Wheat, Droplet } from 'lucide-react';
import {
  MACRO_FIELD_META,
  formatMacro,
  nutritionHint,
  nutritionTabOptions,
  recipeTotalToView,
  viewValueToRecipeTotal,
} from '@/lib/nutrition-macros';

const ICONS = {
  calories: Flame,
  protein: Dumbbell,
  carbs: Wheat,
  fat: Droplet,
};

const DECIMAL_DRAFT_RE = /^[0-9]*[.,]?[0-9]*$/;

export default function NutritionMacrosPanel({
  totalMacros,
  servings = 1,
  totalGrams = 0,
  mode = 'serving',
  onModeChange,
  onChangeTotalMacros,
  servingName = 'מנה',
  autoCalculated = false,
  editable = false,
}) {
  const safeServings = Number(servings) > 0 ? Number(servings) : 1;
  const ctx = { servings: safeServings, totalGrams };
  const tabs = nutritionTabOptions(ctx);
  const activeMode = tabs.some((tab) => tab.id === mode) ? mode : 'serving';
  const viewMacros = recipeTotalToView(totalMacros, activeMode, ctx);
  const servingMacros = recipeTotalToView(totalMacros, 'serving', ctx);
  const recipeMacros = recipeTotalToView(totalMacros, 'recipe', ctx);
  const per100Macros = Number(totalGrams) > 0
    ? recipeTotalToView(totalMacros, '100g', ctx)
    : null;
  const [focusedKey, setFocusedKey] = useState(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setFocusedKey(null);
  }, [activeMode, safeServings, totalGrams]);

  function setMode(nextMode) {
    if (nextMode === activeMode) return;
    setFocusedKey(null);
    onModeChange?.(nextMode);
  }

  function onFieldChange(key, raw) {
    if (raw !== '' && !DECIMAL_DRAFT_RE.test(raw)) return;
    setDraft(raw);
    if (!onChangeTotalMacros) return;
    if (raw === '' || raw === '.' || raw === ',') {
      onChangeTotalMacros({ ...totalMacros, [key]: '' });
      return;
    }
    const total = viewValueToRecipeTotal(raw, activeMode, ctx);
    onChangeTotalMacros({ ...totalMacros, [key]: total });
  }

  const hint = nutritionHint(activeMode, {
    servings: safeServings,
    totalGrams,
    servingName,
  });

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-600">ערכים תזונתיים</p>
        {autoCalculated && (
          <span className="self-start rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
            מחושב מהמצרכים
          </span>
        )}
      </div>

      <div
        role="tablist"
        className="grid grid-cols-1 gap-1 rounded-2xl border border-stone-200 bg-stone-100 p-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeMode;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(tab.id)}
              className={`min-h-11 rounded-xl px-2.5 py-2 text-center text-[11px] leading-tight transition sm:text-xs ${
                active
                  ? 'bg-amber-500 font-medium text-amber-950 shadow-sm'
                  : 'text-stone-600 hover:bg-white/70'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MACRO_FIELD_META.map(({ key, label, unit }) => {
          const Icon = ICONS[key];
          const servingVal = formatMacro(servingMacros[key]);
          const recipeVal = formatMacro(recipeMacros[key]);
          const per100Val = per100Macros ? formatMacro(per100Macros[key]) : '';
          return (
            <div key={key} className="min-w-0 rounded-xl border border-stone-200 bg-white px-2 py-2">
              <div className="mb-1 flex items-center justify-center gap-1 text-emerald-700">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-[10px]">{label}</span>
              </div>
              {editable ? (
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={focusedKey === key ? draft : formatMacro(viewMacros[key])}
                  onFocus={() => {
                    setFocusedKey(key);
                    setDraft(formatMacro(viewMacros[key]));
                  }}
                  onBlur={() => setFocusedKey(null)}
                  onChange={(e) => onFieldChange(key, e.target.value)}
                  className="w-full min-h-11 rounded-lg border border-stone-200 bg-white px-1.5 py-1.5 text-center text-sm font-semibold tabular-nums text-stone-900"
                />
              ) : (
                <p className="min-h-11 flex items-center justify-center text-sm font-bold tabular-nums text-emerald-900">
                  {formatMacro(viewMacros[key]) === '' ? '—' : `${formatMacro(viewMacros[key])}${unit}`}
                </p>
              )}
              <p className="mt-1 text-center text-[10px] leading-snug text-stone-500">
                <span className="font-semibold text-stone-700">
                  {servingVal === '' ? '—' : servingVal}
                </span>
                <span> למנה</span>
                <span className="block">
                  {recipeVal === '' ? '—' : recipeVal}
                  {' '}
                  כולל
                </span>
                {per100Val !== '' && (
                  <span className="block text-stone-400">
                    {per100Val}
                    {' '}
                    / 100ג׳
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-xs leading-relaxed text-stone-500">{hint}</p>
    </div>
  );
}
