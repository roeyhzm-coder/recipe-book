import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchGrocery,
  isGrocerySyncSupported,
  loadLocalGrocery,
  mergeGroceryState,
  saveLocalGrocery,
  syncGrocery,
} from '@/lib/grocery-db';
import {
  addManualItemToItems,
  addRecipeIngredientsToItems,
  createList,
  sortGroceryItems,
} from '@/lib/grocery-utils';

export function useGroceryLists() {
  const [state, setState] = useState(loadLocalGrocery);
  const [syncMode, setSyncMode] = useState('loading');
  const lastSyncedRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadLocalGrocery();
      try {
        const remote = await fetchGrocery();
        if (cancelled) return;
        const next = mergeGroceryState(local, remote);
        lastSyncedRef.current = next;
        setState(next);
        setSyncMode(isGrocerySyncSupported() ? 'cloud' : 'offline');
      } catch (error) {
        if (cancelled) return;
        lastSyncedRef.current = local;
        setState(local);
        setSyncMode('offline');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (syncMode === 'loading') return;
    saveLocalGrocery(state);
    if (syncMode !== 'cloud') return;
    const previous = lastSyncedRef.current;
    lastSyncedRef.current = state;
    syncGrocery(previous, state).catch(() => {
      // Keep the optimistic local state; the next edit retries the cloud write.
    });
  }, [state, syncMode]);

  const lists = useMemo(
    () => state.lists.slice().sort((a, b) => (a.sortOrder - b.sortOrder) || (a.createdAt - b.createdAt)),
    [state.lists]
  );

  const activeList = lists.find((list) => list.id === state.activeListId) || lists[0] || null;

  const activeItems = useMemo(() => {
    if (!activeList) return [];
    return sortGroceryItems(state.items.filter((item) => item.listId === activeList.id));
  }, [state.items, activeList]);

  function updateState(updater) {
    setState((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...current, ...next };
    });
  }

  function setActiveListId(listId) {
    updateState((current) => ({ activeListId: listId, lastUsedListId: listId }));
  }

  function addList(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;
    const list = createList(trimmed, state.lists.length);
    updateState((current) => ({
      lists: [...current.lists, list],
      activeListId: list.id,
      lastUsedListId: list.id,
    }));
    return list;
  }

  function renameList(listId, name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return;
    updateState((current) => ({
      lists: current.lists.map((list) => (
        list.id === listId ? { ...list, name: trimmed, updatedAt: Date.now() } : list
      )),
    }));
  }

  function deleteList(listId) {
    if (state.lists.length <= 1) return false;
    updateState((current) => {
      const lists = current.lists.filter((list) => list.id !== listId);
      const items = current.items.filter((item) => item.listId !== listId);
      const nextActive = lists.find((list) => list.id === current.activeListId)?.id || lists[0]?.id || null;
      return {
        lists,
        items,
        activeListId: nextActive,
        lastUsedListId: current.lastUsedListId === listId ? nextActive : current.lastUsedListId,
      };
    });
    return true;
  }

  function addManualItem(name, listId = state.activeListId) {
    if (!listId) return { merged: false };
    let result = { merged: false };
    updateState((current) => {
      result = addManualItemToItems(current.items, listId, name);
      return { items: result.items };
    });
    return result;
  }

  function addRecipeToList(recipe, listId) {
    const targetId = listId || state.lastUsedListId || state.activeListId;
    if (!targetId || !recipe) return { added: 0, merged: 0, listId: targetId };
    let result = { added: 0, merged: 0, items: state.items };
    updateState((current) => {
      result = addRecipeIngredientsToItems(current.items, targetId, recipe);
      return { items: result.items, lastUsedListId: targetId, activeListId: targetId };
    });
    return { added: result.added, merged: result.merged, listId: targetId };
  }

  function toggleItem(itemId) {
    updateState((current) => ({
      items: current.items.map((item) => (
        item.id === itemId ? { ...item, checked: !item.checked, updatedAt: Date.now() } : item
      )),
    }));
  }

  function deleteItem(itemId) {
    updateState((current) => ({
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  function clearChecked(listId = state.activeListId) {
    updateState((current) => ({
      items: current.items.filter((item) => item.listId !== listId || !item.checked),
    }));
  }

  function clearList(listId = state.activeListId) {
    updateState((current) => ({
      items: current.items.filter((item) => item.listId !== listId),
    }));
  }

  return {
    lists,
    items: state.items,
    activeList,
    activeItems,
    activeListId: activeList?.id || null,
    lastUsedListId: state.lastUsedListId,
    syncMode,
    setActiveListId,
    addList,
    renameList,
    deleteList,
    addManualItem,
    addRecipeToList,
    toggleItem,
    deleteItem,
    clearChecked,
    clearList,
  };
}
