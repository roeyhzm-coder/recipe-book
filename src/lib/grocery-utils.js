export const DEFAULT_GROCERY_LIST_NAMES = ['קניות שבועיות', 'מוצרי בסיס', 'ירקן'];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function normalizeItemName(name) {
  return String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[''`׳״"‘’“”]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createList(name, sortOrder = 0) {
  const now = Date.now();
  return {
    id: uid(),
    name: String(name || '').trim() || 'רשימה חדשה',
    createdAt: now,
    updatedAt: now,
    sortOrder,
  };
}

export function createItem(listId, name, sourceRecipes = [], sortOrder = 0) {
  const now = Date.now();
  return {
    id: uid(),
    listId,
    name: String(name || '').trim(),
    checked: false,
    sourceRecipes: Array.isArray(sourceRecipes) ? sourceRecipes : [],
    createdAt: now,
    updatedAt: now,
    sortOrder,
  };
}

export function createDefaultGroceryState() {
  const lists = DEFAULT_GROCERY_LIST_NAMES.map((name, index) => createList(name, index));
  return {
    lists,
    items: [],
    activeListId: lists[0].id,
    lastUsedListId: lists[0].id,
  };
}

export function findMatchingItem(items, name, listId) {
  const key = normalizeItemName(name);
  if (!key) return null;
  return items.find((item) => item.listId === listId && normalizeItemName(item.name) === key) || null;
}

function withRecipeSource(item, recipe) {
  const sources = Array.isArray(item.sourceRecipes) ? item.sourceRecipes : [];
  if (sources.some((source) => String(source.id) === String(recipe.id))) {
    return {
      ...item,
      sourceRecipes: sources.map((source) => (
        String(source.id) === String(recipe.id) ? { ...source, title: recipe.title } : source
      )),
      updatedAt: Date.now(),
    };
  }
  return {
    ...item,
    checked: false,
    sourceRecipes: [...sources, { id: String(recipe.id), title: recipe.title || 'מתכון' }],
    updatedAt: Date.now(),
  };
}

export function addRecipeIngredientsToItems(items, listId, recipe) {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  let next = items.slice();
  let added = 0;
  let merged = 0;

  ingredients.forEach((ingredient) => {
    const name = String(ingredient?.name || '').trim();
    if (!name) return;
    const existing = findMatchingItem(next, name, listId);
    if (existing) {
      next = next.map((item) => (item.id === existing.id ? withRecipeSource(item, recipe) : item));
      merged += 1;
      return;
    }
    next = [...next, createItem(listId, name, [{ id: String(recipe.id), title: recipe.title || 'מתכון' }], next.length)];
    added += 1;
  });

  return { items: next, added, merged };
}

export function addManualItemToItems(items, listId, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return { items, item: null, merged: false };
  const existing = findMatchingItem(items, trimmed, listId);
  if (existing) {
    const next = items.map((item) => (
      item.id === existing.id
        ? { ...item, checked: false, updatedAt: Date.now() }
        : item
    ));
    return { items: next, item: existing, merged: true };
  }
  const item = createItem(listId, trimmed, [], items.length);
  return { items: [...items, item], item, merged: false };
}

export function sortGroceryItems(items) {
  return items.slice().sort((a, b) => {
    if (!!a.checked !== !!b.checked) return a.checked ? 1 : -1;
    return (a.sortOrder - b.sortOrder) || (a.createdAt - b.createdAt);
  });
}
