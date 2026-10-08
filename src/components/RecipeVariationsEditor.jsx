import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Star, Trash2 } from 'lucide-react';
import { emptyVariation, moveVariation, recalculateVariation, setDefaultVariation } from '@/lib/recipe-variations';
import { convertIngredientUnit, RECIPE_UNIT_LIST } from '@/lib/ingredientUnits';
import NutritionMacrosPanel from '@/components/NutritionMacrosPanel';
import { hasAutoIngredientMacros, servingsOf, totalRecipeGrams, unitWeightOf } from '@/lib/nutrition-macros';

const UNIT_LIST = RECIPE_UNIT_LIST;

export default function RecipeVariationsEditor({
  form,
  variations,
  expandedId,
  onExpandedId,
  onChange,
  makeIngredient,
}) {
  const list = Array.isArray(variations) ? variations : [];
  const [nutritionMode, setNutritionMode] = useState('serving');

  function patchList(next) {
    onChange(next);
  }

  function patchVariation(id, updater) {
    patchList(list.map((item) => {
      if (String(item.id) !== String(id)) return item;
      const next = typeof updater === 'function' ? updater(item) : { ...item, ...updater };
      return recalculateVariation(next);
    }));
  }

  function addVariation() {
    const created = emptyVariation(form, list.length ? 'שדרוג חדש' : 'גרסה קלאסית');
    if (!list.length) created.isDefault = true;
    patchList([...list, created]);
    onExpandedId(created.id);
  }

  function removeVariation(id) {
    const next = list.filter((item) => String(item.id) !== String(id));
    if (next.length && !next.some((item) => item.isDefault)) next[0].isDefault = true;
    patchList(next);
    if (expandedId === id) onExpandedId(next[0]?.id || null);
  }

  function updateIngredient(variationId, ingredientId, field, value) {
    patchVariation(variationId, (item) => ({
      ...item,
      ingredients: item.ingredients.map((ing) => (ing.id === ingredientId ? { ...ing, [field]: value } : ing)),
    }));
  }

  function onUnitChange(variationId, ingredientId, newUnit) {
    patchVariation(variationId, (item) => ({
      ...item,
      ingredients: item.ingredients.map((ing) => (
        ing.id === ingredientId ? convertIngredientUnit(ing, newUnit, form?.unitWeightGrams) : ing
      )),
    }));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <label className="text-sm text-stone-800 font-medium block">גרסאות ושדרוגים למתכון</label>
          <p className="text-xs text-stone-500 mt-0.5">כל גרסה עם מצרכים, שלבים וערכים משלה</p>
        </div>
      </div>
      <button
        type="button"
        onClick={addVariation}
        className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 text-amber-900 text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        + הוסף גרסה / שדרוג
      </button>

      <div className="flex flex-col gap-3 mt-3">
        {list.map((variation, index) => {
          const open = expandedId === variation.id;
          return (
            <div key={variation.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => onExpandedId(open ? null : variation.id)}
                  className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0"
                  aria-label={open ? 'כווץ גרסה' : 'הרחב גרסה'}
                >
                  <ChevronDown className={`w-4 h-4 text-stone-500 transition ${open ? 'rotate-180' : ''}`} />
                </button>
                <input
                  value={variation.name}
                  onChange={(e) => patchVariation(variation.id, { name: e.target.value })}
                  placeholder="שם הגרסה"
                  className="flex-1 min-h-11 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm text-stone-900"
                />
                <button
                  type="button"
                  onClick={() => patchList(setDefaultVariation(list, variation.id))}
                  className={`min-h-11 min-w-11 w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${
                    variation.isDefault ? 'bg-amber-500 border-amber-500' : 'bg-stone-100 border-stone-200'
                  }`}
                  aria-label="קבע כברירת מחדל"
                  title="ברירת מחדל"
                >
                  <Star className={`w-4 h-4 ${variation.isDefault ? 'fill-amber-950 text-amber-950' : 'text-stone-500'}`} />
                </button>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => patchList(moveVariation(list, variation.id, -1))}
                  className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 disabled:opacity-30"
                  aria-label="הזז למעלה"
                >
                  <ArrowUp className="w-4 h-4 text-stone-600" />
                </button>
                <button
                  type="button"
                  disabled={index === list.length - 1}
                  onClick={() => patchList(moveVariation(list, variation.id, 1))}
                  className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0 disabled:opacity-30"
                  aria-label="הזז למטה"
                >
                  <ArrowDown className="w-4 h-4 text-stone-600" />
                </button>
                <button
                  type="button"
                  onClick={() => removeVariation(variation.id)}
                  className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0"
                  aria-label="מחק גרסה"
                  title="מחק גרסה"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                </button>
              </div>

              {open && (
                <div className="px-3 pb-3 flex flex-col gap-3 border-t border-stone-100 pt-3">
                  <input
                    value={variation.description || ''}
                    onChange={(e) => patchVariation(variation.id, { description: e.target.value })}
                    placeholder="תיאור קצר (אופציונלי)"
                    className="w-full min-h-11 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm text-stone-900"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['prepTime', 'הכנה'],
                      ['cookTime', 'בישול'],
                      ['totalTime', 'סה״כ'],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <input
                          type="number"
                          min="0"
                          value={variation[key] ?? ''}
                          onChange={(e) => patchVariation(variation.id, {
                            [key]: e.target.value === '' ? '' : Number(e.target.value),
                          })}
                          className="w-full min-h-11 bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-center text-stone-900"
                        />
                        <p className="text-[11px] text-stone-500 text-center mt-1">{label} (דק׳)</p>
                      </div>
                    ))}
                  </div>

                  <NutritionMacrosPanel
                    totalMacros={variation.macros}
                    servings={servingsOf(form)}
                    totalGrams={totalRecipeGrams(variation.ingredients, unitWeightOf(form))}
                    unitWeightGrams={unitWeightOf(form)}
                    mode={nutritionMode}
                    onModeChange={setNutritionMode}
                    servingName={variation.name || form?.title || 'מנה'}
                    autoCalculated={hasAutoIngredientMacros(variation.ingredients)}
                  />

                  <p className="text-xs text-stone-500">מצרכים</p>
                  <div className="flex flex-col gap-2">
                    {(variation.ingredients || []).map((ing) => (
                      <div key={ing.id} className="flex gap-1.5 items-center">
                        <input
                          type="number"
                          value={ing.amount}
                          onChange={(e) => updateIngredient(variation.id, ing.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-14 min-h-11 bg-white border border-stone-200 rounded-lg px-1.5 text-sm text-center"
                        />
                        <select
                          value={ing.unit}
                          onChange={(e) => onUnitChange(variation.id, ing.id, e.target.value)}
                          className="min-h-11 bg-white border border-stone-200 rounded-lg px-1 text-sm"
                        >
                          {UNIT_LIST.map((unit) => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                        <input
                          value={ing.name}
                          onChange={(e) => updateIngredient(variation.id, ing.id, 'name', e.target.value)}
                          placeholder="שם המצרך"
                          className="flex-1 min-h-11 bg-white border border-stone-200 rounded-lg px-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => patchVariation(variation.id, {
                            ingredients: variation.ingredients.filter((item) => item.id !== ing.id),
                          })}
                          className="min-h-11 min-w-11 w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0"
                          aria-label="מחק מצרך"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => patchVariation(variation.id, {
                      ingredients: [...(variation.ingredients || []), makeIngredient(1, 'גרם', '')],
                    })}
                    className="min-h-11 flex items-center gap-1.5 text-sm text-stone-600"
                  >
                    <Plus className="w-4 h-4" /> הוסף מצרך
                  </button>

                  <p className="text-xs text-stone-500">שלבי הכנה</p>
                  <div className="flex flex-col gap-2">
                    {(variation.steps || []).map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-1.5">
                        <span className="mt-2 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-1 shrink-0">{stepIndex + 1}</span>
                        <textarea
                          value={step}
                          onChange={(e) => patchVariation(variation.id, {
                            steps: variation.steps.map((s, i) => (i === stepIndex ? e.target.value : s)),
                          })}
                          rows={2}
                          className="flex-1 min-h-11 bg-white border border-stone-200 rounded-lg px-2 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => patchVariation(variation.id, {
                            steps: variation.steps.filter((_, i) => i !== stepIndex),
                          })}
                          className="min-h-11 min-w-11 w-11 h-11 mt-1 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0"
                          aria-label="מחק שלב"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => patchVariation(variation.id, { steps: [...(variation.steps || []), ''] })}
                    className="min-h-11 flex items-center gap-1.5 text-sm text-stone-600"
                  >
                    <Plus className="w-4 h-4" /> הוסף שלב
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
