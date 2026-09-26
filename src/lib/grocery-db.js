import { supabase } from '@/integrations/supabase/client';
import { createDefaultGroceryState, DEFAULT_GROCERY_LIST_NAMES } from '@/lib/grocery-utils';

export const GROCERY_STORAGE_KEY = 'mitbach_grocery_v1';

let groceryTablesSupported = false;

export function isGrocerySyncSupported() {
  return groceryTablesSupported;
}

function rowToList(row) {
  return {
    id: String(row.id),
    name: row.name || 'רשימה',
    createdAt: Number(row.created_at_ms) || 0,
    updatedAt: Number(row.updated_at_ms) || Number(row.created_at_ms) || 0,
    sortOrder: Number(row.sort_order) || 0,
  };
}

function listToRow(list) {
  return {
    id: String(list.id),
    name: list.name || 'רשימה',
    created_at_ms: Number(list.createdAt) || Date.now(),
    updated_at_ms: Number(list.updatedAt) || Date.now(),
    sort_order: Number(list.sortOrder) || 0,
  };
}

function rowToItem(row) {
  return {
    id: String(row.id),
    listId: String(row.list_id),
    name: row.name || '',
    checked: !!row.checked,
    sourceRecipes: Array.isArray(row.source_recipes) ? row.source_recipes : [],
    createdAt: Number(row.created_at_ms) || 0,
    updatedAt: Number(row.updated_at_ms) || Number(row.created_at_ms) || 0,
    sortOrder: Number(row.sort_order) || 0,
  };
}

function itemToRow(item) {
  return {
    id: String(item.id),
    list_id: String(item.listId),
    name: item.name || '',
    checked: !!item.checked,
    source_recipes: item.sourceRecipes || [],
    created_at_ms: Number(item.createdAt) || Date.now(),
    updated_at_ms: Number(item.updatedAt) || Date.now(),
    sort_order: Number(item.sortOrder) || 0,
  };
}

function normalizeState(raw) {
  const fallback = createDefaultGroceryState();
  if (!raw || typeof raw !== 'object') return fallback;
  const lists = Array.isArray(raw.lists) ? raw.lists.filter((list) => list && list.id && list.name) : [];
  const items = Array.isArray(raw.items) ? raw.items.filter((item) => item && item.id && item.listId && item.name) : [];
  if (!lists.length) return fallback;
  const listIds = new Set(lists.map((list) => String(list.id)));
  const activeListId = listIds.has(String(raw.activeListId)) ? String(raw.activeListId) : lists[0].id;
  const lastUsedListId = listIds.has(String(raw.lastUsedListId)) ? String(raw.lastUsedListId) : activeListId;
  return {
    lists,
    items: items.filter((item) => listIds.has(String(item.listId))),
    activeListId,
    lastUsedListId,
  };
}

export function loadLocalGrocery() {
  try {
    const raw = localStorage.getItem(GROCERY_STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
  } catch (error) {
    // Keep a usable empty list if the cache is corrupt.
  }
  return createDefaultGroceryState();
}

export function saveLocalGrocery(state) {
  try {
    localStorage.setItem(GROCERY_STORAGE_KEY, JSON.stringify(normalizeState(state)));
  } catch (error) {
    // Quota or private-mode failures should never break the UI.
  }
}

async function detectGroceryTables() {
  const { error } = await supabase.from('grocery_lists').select('id').limit(1);
  groceryTablesSupported = !error;
  return groceryTablesSupported;
}

function newerWins(local, remote, getUpdatedAt) {
  const map = new Map();
  remote.forEach((row) => map.set(String(row.id), row));
  local.forEach((row) => {
    const existing = map.get(String(row.id));
    if (!existing || getUpdatedAt(row) >= getUpdatedAt(existing)) {
      map.set(String(row.id), row);
    }
  });
  return [...map.values()];
}

export async function fetchGrocery() {
  const supported = await detectGroceryTables();
  if (!supported) {
    throw new Error('grocery tables unavailable');
  }

  const [listsRes, itemsRes] = await Promise.all([
    supabase.from('grocery_lists').select('*').order('sort_order', { ascending: true }),
    supabase.from('grocery_items').select('*').order('sort_order', { ascending: true }),
  ]);

  if (listsRes.error) throw listsRes.error;
  if (itemsRes.error) throw itemsRes.error;

  return {
    lists: (listsRes.data || []).map(rowToList),
    items: (itemsRes.data || []).map(rowToItem),
  };
}

export function mergeGroceryState(local, remote) {
  const localState = normalizeState(local);
  if (!remote || !Array.isArray(remote.lists) || !remote.lists.length) return localState;

  const remoteListIds = new Set(remote.lists.map((list) => String(list.id)));
  const localOnlyLists = localState.lists.filter((list) => {
    if (remoteListIds.has(String(list.id))) return false;
    const hasItems = localState.items.some((item) => item.listId === list.id);
    const isSeedList = DEFAULT_GROCERY_LIST_NAMES.includes(list.name);
    return hasItems || !isSeedList;
  });

  const lists = newerWins(localOnlyLists, remote.lists, (row) => Number(row.updatedAt) || 0)
    .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.createdAt - b.createdAt));
  const items = newerWins(localState.items, remote.items || [], (row) => Number(row.updatedAt) || 0);
  const listIds = new Set(lists.map((list) => String(list.id)));

  return normalizeState({
    lists,
    items: items.filter((item) => listIds.has(String(item.listId))),
    activeListId: localState.activeListId,
    lastUsedListId: localState.lastUsedListId,
  });
}

function sameRow(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function syncGrocery(previous, next) {
  if (!groceryTablesSupported) return;

  const prevLists = new Map((previous?.lists || []).map((list) => [String(list.id), list]));
  const nextListIds = new Set(next.lists.map((list) => String(list.id)));
  const changedLists = next.lists.filter((list) => {
    const prev = prevLists.get(String(list.id));
    return !prev || !sameRow(listToRow(prev), listToRow(list));
  });
  const deletedListIds = [...prevLists.keys()].filter((id) => !nextListIds.has(id));

  const prevItems = new Map((previous?.items || []).map((item) => [String(item.id), item]));
  const nextItemIds = new Set(next.items.map((item) => String(item.id)));
  const changedItems = next.items.filter((item) => {
    const prev = prevItems.get(String(item.id));
    return !prev || !sameRow(itemToRow(prev), itemToRow(item));
  });
  const deletedItemIds = [...prevItems.keys()].filter((id) => !nextItemIds.has(id));

  if (changedLists.length) {
    const { error } = await supabase.from('grocery_lists').upsert(changedLists.map(listToRow));
    if (error) throw error;
  }
  if (changedItems.length) {
    const { error } = await supabase.from('grocery_items').upsert(changedItems.map(itemToRow));
    if (error) throw error;
  }
  if (deletedItemIds.length) {
    const { error } = await supabase.from('grocery_items').delete().in('id', deletedItemIds);
    if (error) throw error;
  }
  if (deletedListIds.length) {
    const { error } = await supabase.from('grocery_lists').delete().in('id', deletedListIds);
    if (error) throw error;
  }
}
