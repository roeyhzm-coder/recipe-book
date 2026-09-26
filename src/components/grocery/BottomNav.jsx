import { ChefHat, ShoppingCart } from 'lucide-react';

const TABS = [
  { id: 'recipes', label: 'מתכונים', Icon: ChefHat },
  { id: 'grocery', label: 'רשימת קניות', Icon: ShoppingCart },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-xl border-t border-stone-200 shadow-[0_-8px_30px_rgba(28,25,23,0.06)] px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-2">
            {TABS.map(({ id, label, Icon }) => {
              const selected = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange(id)}
                  className={`min-h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-xs transition ${
                    selected
                      ? 'bg-amber-50 text-amber-800 font-semibold'
                      : 'text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${selected ? 'text-amber-700' : 'text-stone-400'}`} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
