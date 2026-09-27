import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Pencil, Plus, RefreshCw, ShoppingCart, Trash2, X } from 'lucide-react';
import { formatQuantityLabel, groupItemsByAisle, UNIT_LIST } from '@/lib/grocery-utils';
import { getGrocerySubstitutions } from '@/lib/grocery-substitutions';

const QUANTITY_UNITS = UNIT_LIST;

function ConfirmDialog({ open, title, message, confirmLabel = 'אישור', danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-stone-200">
        <h3 className="font-serif text-lg text-stone-900">{title}</h3>
        <p className="text-sm text-stone-500 mt-1 leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 min-h-11 py-2.5 rounded-xl border border-stone-200 text-stone-800 text-sm font-medium hover:bg-stone-100"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 min-h-11 py-2.5 rounded-xl text-white text-sm font-medium ${
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

function NameDialog({ open, title, initialValue = '', placeholder, confirmLabel, onConfirm, onCancel }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) setValue(initialValue);
  }, [open, initialValue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4" onClick={onCancel}>
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const next = value.trim();
          if (!next) return;
          onConfirm(next);
        }}
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-stone-200"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-xl text-stone-900">{title}</h3>
          <button type="button" onClick={onCancel} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <input
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="w-full min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
        />
        <button type="submit" disabled={!value.trim()} className="w-full min-h-11 mt-4 py-2.5 rounded-xl bg-amber-500 text-amber-950 text-sm font-medium disabled:opacity-40 hover:bg-amber-400 transition">
          {confirmLabel}
        </button>
      </form>
    </div>
  );
}

function QuantityDialog({ open, item, onConfirm, onCancel }) {
  const initial = item?.quantities?.[0] || {};
  const [amount, setAmount] = useState(initial.amount != null ? String(initial.amount) : '');
  const [unit, setUnit] = useState(initial.unit || 'גרם');

  useEffect(() => {
    if (!open || !item) return;
    const part = item.quantities?.[0] || {};
    setAmount(part.amount != null ? String(part.amount) : '');
    setUnit(part.unit || 'גרם');
  }, [open, item]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4" onClick={onCancel}>
      <form
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          const value = parseFloat(String(amount).replace(',', '.'));
          if (!Number.isFinite(value) || value <= 0) {
            onConfirm(null, '');
            return;
          }
          onConfirm(value, unit);
        }}
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-stone-200"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif text-xl text-stone-900">עריכת כמות</h3>
            <p className="text-sm text-stone-500 mt-1">{item.name}</p>
          </div>
          <button type="button" onClick={onCancel} className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            autoFocus
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="כמות"
            className="flex-1 min-h-11 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
          />
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className="min-h-11 w-28 bg-white border border-stone-200 rounded-xl px-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/70"
          >
            {QUANTITY_UNITS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="w-full min-h-11 mt-4 py-2.5 rounded-xl bg-amber-500 text-amber-950 text-sm font-medium hover:bg-amber-400 transition">
          שמור כמות
        </button>
      </form>
    </div>
  );
}

function GroceryItemRow({ item, onToggle, onDelete, onSubstitute, onEditQuantity, onDemoteStaple }) {
  const sources = (item.sourceRecipes || []).map((source) => source.title).filter(Boolean);
  const quantity = formatQuantityLabel(item.quantities);
  const substitutions = getGrocerySubstitutions(item);

  return (
    <div className={`group flex items-start gap-2.5 bg-white rounded-2xl border border-stone-200 px-3 py-3 shadow-sm ${item.checked ? 'opacity-70' : ''}`}>
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-checked={item.checked}
        role="checkbox"
        className={`mt-0.5 min-h-11 min-w-11 w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition ${
          item.checked
            ? 'bg-amber-500 border-amber-500 text-amber-950'
            : 'bg-stone-50 border-stone-200 text-transparent hover:border-amber-300'
        }`}
      >
        <Check className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0 pt-1.5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (item.isStaple && onDemoteStaple) onDemoteStaple(item.id);
            }}
            className={`text-sm text-stone-900 leading-snug text-right ${item.checked ? 'line-through text-stone-400' : ''} ${item.isStaple ? 'hover:text-amber-800' : ''}`}
            title={item.isStaple ? 'החזר ל"כנראה שיש בבית"' : undefined}
          >
            {item.name}
          </button>
          <button
            type="button"
            onClick={() => onEditQuantity(item)}
            className={`inline-flex items-center gap-1 text-sm font-semibold tabular-nums shrink-0 rounded-lg px-1.5 py-0.5 -mx-1.5 hover:bg-amber-50 ${
              item.checked ? 'line-through text-stone-400' : 'text-stone-900'
            }`}
            aria-label="ערוך כמות"
          >
            {quantity || 'הוסף כמות'}
            <Pencil className="w-3 h-3 text-stone-400" />
          </button>
        </div>
        {sources.length > 0 && (
          <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
            {sources.join(' · ')}
          </p>
        )}
      </div>
      {substitutions.length > 0 && (
        <button
          type="button"
          onClick={() => onSubstitute(item, substitutions)}
          className="mt-0.5 min-h-11 min-w-11 w-11 h-11 rounded-xl text-stone-300 hover:text-amber-700 hover:bg-amber-50 flex items-center justify-center shrink-0"
          aria-label="הצג תחליפים"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="mt-0.5 min-h-11 min-w-11 w-11 h-11 rounded-xl text-stone-300 hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0"
        aria-label={item.isStaple ? 'החזר למזווה' : 'מחק פריט'}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function PantryStaplesDrawer({ items, onPromote }) {
  const [open, setOpen] = useState(true);
  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-dashed border-stone-300 bg-stone-100/70 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full min-h-11 flex items-center justify-between gap-3 px-4 py-3 text-right"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-800">כנראה שיש בבית</p>
          <p className="text-[11px] text-stone-500 mt-0.5">לחץ כדי להוסיף לקניות</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-stone-400 tabular-nums">{items.length}</span>
          <ChevronDown className={`w-4 h-4 text-stone-500 transition ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 flex flex-wrap gap-2">
          {items.map((item) => {
            const quantity = formatQuantityLabel(item.quantities);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onPromote(item.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900 transition shadow-sm"
              >
                <span>{item.name}</span>
                {quantity ? <span className="text-[11px] text-stone-400 tabular-nums">{quantity}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SubstituteDialog({ open, item, options, onPick, onClose }) {
  if (!open || !item) return null;
  const context = (item.sourceRecipes || []).map((source) => source.title).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/40 backdrop-blur-md p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-stone-200"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-serif text-lg text-stone-900">תחליפים</h3>
            <p className="text-sm text-stone-500 mt-1">במקום "{item.name}"</p>
            {context.length > 0 && (
              <p className="text-[11px] text-stone-400 mt-1">מותאם ל: {context.join(' · ')}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-stone-500" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onPick(option)}
              className="min-h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-800 text-right hover:bg-amber-50 hover:border-amber-200 transition"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GroceryLists({
  lists,
  activeList,
  activeItems,
  pantryDrawerItems = [],
  onSelectList,
  onAddList,
  onRenameList,
  onDeleteList,
  onAddManualItem,
  onToggleItem,
  onDeleteItem,
  onClearChecked,
  onClearList,
  onSubstituteItem,
  onUpdateItemQuantity,
  onPromoteStaple,
  onDemoteStaple,
  onNotify,
}) {
  const [draft, setDraft] = useState('');
  const [nameDialog, setNameDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [substitute, setSubstitute] = useState(null);
  const [quantityItem, setQuantityItem] = useState(null);

  const checkedCount = activeItems.filter((item) => item.checked).length;
  const aisleGroups = useMemo(() => groupItemsByAisle(activeItems), [activeItems]);
  const hasContent = activeItems.length > 0 || pantryDrawerItems.length > 0;

  function submitManual(event) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    const result = onAddManualItem(name);
    setDraft('');
    onNotify(result?.merged ? 'המוצר כבר ברשימה — עודכן' : 'המוצר נוסף לרשימה');
  }

  function handleDelete(itemId) {
    const result = onDeleteItem(itemId);
    if (result?.demoted) onNotify('הוחזר ל"כנראה שיש בבית"');
  }

  function handleDemote(itemId) {
    const result = onDemoteStaple?.(itemId);
    if (result?.demoted) onNotify('הוחזר ל"כנראה שיש בבית"');
  }

  function handlePromote(itemId) {
    const result = onPromoteStaple?.(itemId);
    if (result?.item) onNotify(`נוסף לרשימה: ${result.item.name}`);
  }

  return (
    <div className="pb-44">
      <div className="sticky top-0 z-20 bg-stone-50/90 backdrop-blur-xl border-b border-stone-200">
        <div className="px-4 pt-5 pb-2">
          <p className="text-xs tracking-wide text-amber-700">קניות חכמות</p>
          <h1 className="font-serif text-3xl text-stone-900 mt-0.5">רשימת קניות</h1>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3">
          {lists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => onSelectList(list.id)}
              className={`shrink-0 min-h-11 px-4 py-2 rounded-full border text-sm whitespace-nowrap transition ${
                activeList?.id === list.id
                  ? 'bg-amber-500 border-amber-500 text-amber-950 font-medium'
                  : 'bg-white border-stone-200 text-stone-600'
              }`}
            >
              {list.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setNameDialog({ mode: 'create', value: '' })}
            className="shrink-0 min-h-11 px-4 py-2 rounded-full border border-amber-300 bg-amber-50 text-sm text-amber-800"
          >
            + רשימה
          </button>
        </div>
      </div>

      {activeList && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl text-stone-900 truncate">{activeList.name}</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNameDialog({ mode: 'rename', value: activeList.name })}
                  className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center"
                  aria-label="שינוי שם רשימה"
                >
                  <Pencil className="w-4 h-4 text-stone-600" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm({
                    mode: 'delete-list',
                    title: 'מחיקת רשימה',
                    message: lists.length <= 1
                      ? 'חייבת להישאר לפחות רשימה אחת.'
                      : `למחוק את "${activeList.name}" ואת כל הפריטים שבה?`,
                    confirmLabel: 'מחק',
                    danger: true,
                    disabled: lists.length <= 1,
                  })}
                  className="min-h-11 min-w-11 w-11 h-11 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center"
                  aria-label="מחיקת רשימה"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                disabled={!checkedCount}
                onClick={() => setConfirm({
                  mode: 'clear-checked',
                  title: 'ניקוי מסומנים',
                  message: `להסיר ${checkedCount} פריטים שסומנו כנקנו?`,
                  confirmLabel: 'נקה מסומנים',
                })}
                className="min-h-11 px-3.5 py-2 rounded-full border border-stone-200 bg-stone-50 text-xs text-stone-600 disabled:opacity-40"
              >
                נקה מסומנים
              </button>
              <button
                type="button"
                disabled={!activeItems.length}
                onClick={() => setConfirm({
                  mode: 'clear-list',
                  title: 'ריקון רשימה',
                  message: `לרוקן את כל הפריטים מ"${activeList.name}"?`,
                  confirmLabel: 'רוקן רשימה',
                  danger: true,
                })}
                className="min-h-11 px-3.5 py-2 rounded-full border border-rose-200 bg-rose-50 text-xs text-rose-700 disabled:opacity-40"
              >
                רוקן רשימה
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 mt-4 flex flex-col gap-5">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center text-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-white border border-stone-200 flex items-center justify-center">
              <ShoppingCart className="w-7 h-7 text-stone-400" />
            </div>
            <p className="text-stone-800 font-medium">הרשימה ריקה</p>
            <p className="text-stone-500 text-sm max-w-xs">הוסיפו מצרכים ממתכון או כתבו מוצר בשורה למטה</p>
          </div>
        ) : (
          <>
            {aisleGroups.map((group) => (
              <section key={group.id}>
                <div className="flex items-center gap-2 mb-2.5 px-0.5">
                  <h3 className="font-serif text-base text-stone-800">{group.label}</h3>
                  <span className="text-[11px] text-stone-400 tabular-nums">{group.items.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {group.items.map((item) => (
                    <GroceryItemRow
                      key={item.id}
                      item={item}
                      onToggle={onToggleItem}
                      onDelete={handleDelete}
                      onDemoteStaple={handleDemote}
                      onSubstitute={(current, options) => setSubstitute({ item: current, options })}
                      onEditQuantity={setQuantityItem}
                    />
                  ))}
                </div>
              </section>
            ))}
            <PantryStaplesDrawer items={pantryDrawerItems} onPromote={handlePromote} />
          </>
        )}
      </div>

      <div className="fixed bottom-[4.75rem] inset-x-0 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4 pointer-events-auto">
          <form
            onSubmit={submitManual}
            className="bg-white/95 backdrop-blur-xl border border-stone-200 shadow-lg rounded-2xl p-2 flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="הוספת מוצר… למשל חלב, לחם"
              className="flex-1 min-h-11 bg-transparent px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="min-h-11 min-w-11 w-11 h-11 rounded-xl bg-amber-500 text-amber-950 flex items-center justify-center disabled:opacity-40 hover:bg-amber-400"
              aria-label="הוסף מוצר"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <NameDialog
        open={nameDialog?.mode === 'create'}
        title="רשימה חדשה"
        initialValue=""
        placeholder="לדוגמה: קניות לשישי"
        confirmLabel="צור רשימה"
        onCancel={() => setNameDialog(null)}
        onConfirm={(name) => {
          onAddList(name);
          setNameDialog(null);
          onNotify('הרשימה נוספה');
        }}
      />
      <NameDialog
        open={nameDialog?.mode === 'rename'}
        title="שינוי שם הרשימה"
        initialValue={nameDialog?.value || ''}
        placeholder="שם הרשימה"
        confirmLabel="שמור שם"
        onCancel={() => setNameDialog(null)}
        onConfirm={(name) => {
          if (activeList) onRenameList(activeList.id, name);
          setNameDialog(null);
          onNotify('שם הרשימה עודכן');
        }}
      />
      <QuantityDialog
        open={!!quantityItem}
        item={quantityItem}
        onCancel={() => setQuantityItem(null)}
        onConfirm={(amount, unit) => {
          if (quantityItem) onUpdateItemQuantity?.(quantityItem.id, amount, unit);
          setQuantityItem(null);
          onNotify('הכמות עודכנה');
        }}
      />
      <SubstituteDialog
        open={!!substitute}
        item={substitute?.item}
        options={substitute?.options || []}
        onClose={() => setSubstitute(null)}
        onPick={(name) => {
          const result = onSubstituteItem?.(substitute.item.id, name);
          setSubstitute(null);
          onNotify(result?.merged ? `עודכן ואוחד עם "${name}"` : `הוחלף ל${name}`);
        }}
      />
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.disabled) {
            onNotify('חייבת להישאר לפחות רשימה אחת');
            setConfirm(null);
            return;
          }
          if (confirm?.mode === 'delete-list' && activeList) {
            const ok = onDeleteList(activeList.id);
            onNotify(ok ? 'הרשימה נמחקה' : 'חייבת להישאר לפחות רשימה אחת');
          }
          if (confirm?.mode === 'clear-checked') {
            onClearChecked();
            onNotify('הפריטים המסומנים הוסרו');
          }
          if (confirm?.mode === 'clear-list') {
            onClearList();
            onNotify('הרשימה רוקנה');
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
