import { useEffect, useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';

export default function AddToGroceryModal({ open, recipe, lists, defaultListId, onClose, onConfirm }) {
  const [listId, setListId] = useState(defaultListId || lists[0]?.id || '');

  useEffect(() => {
    if (open) setListId(defaultListId || lists[0]?.id || '');
  }, [open, defaultListId, lists]);

  if (!open || !recipe) return null;

  const count = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.filter((item) => String(item?.name || '').trim()).length
    : 0;

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

        <button
          type="button"
          disabled={!listId || count === 0}
          onClick={() => onConfirm(listId)}
          className="w-full min-h-11 py-2.5 rounded-xl bg-amber-500 text-amber-950 text-sm font-medium disabled:opacity-40 hover:bg-amber-400 transition"
        >
          הוסף מצרכים לרשימה
        </button>
      </div>
    </div>
  );
}
