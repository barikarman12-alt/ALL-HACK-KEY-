import { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface ProductKey {
  category: string;
  value: string;
  label: string;
  price: number;
  stock: number;
  keys: string[];
}

const defaultInventory: ProductKey[] = [
  { category: 'ARMAN X STORE NON-ROOT', label: 'Day 1', value: 'nonroot_day1', price: 100, stock: 0, keys: [] },
  { category: 'ARMAN X STORE NON-ROOT', label: 'Day 3', value: 'nonroot_day3', price: 200, stock: 0, keys: [] },
  { category: 'ARMAN X STORE NON-ROOT', label: 'Day 7', value: 'nonroot_day7', price: 330, stock: 0, keys: [] },
  { category: 'ARMAN X STORE NON-ROOT', label: 'Day 15', value: 'nonroot_day15', price: 630, stock: 0, keys: [] },
  { category: 'ARMAN X STORE NON-ROOT', label: 'Day 30', value: 'nonroot_day30', price: 830, stock: 0, keys: [] },
  { category: 'ARMAN X STORE ROOT', label: 'Day 1', value: 'root_day1', price: 100, stock: 0, keys: [] },
  { category: 'ARMAN X STORE ROOT', label: 'Day 3', value: 'root_day3', price: 200, stock: 0, keys: [] },
  { category: 'ARMAN X STORE ROOT', label: 'Day 7', value: 'root_day7', price: 330, stock: 0, keys: [] },
  { category: 'ARMAN X STORE ROOT', label: 'Day 15', value: 'root_day15', price: 630, stock: 0, keys: [] },
  { category: 'ARMAN X STORE ROOT', label: 'Day 30', value: 'root_day30', price: 830, stock: 0, keys: [] }
];

export interface ProductCategory {
  id: string;
  name: string;
  logoUrl: string;
  theme: 'light' | 'dark';
  popular?: boolean;
}

export interface PurchaseRecord {
  id: string;
  userId?: string;
  value: string;
  category: string;
  label: string;
  keys: string[];
  date: string;
}

export interface ProductSettings {
  siteName: string;
  siteLogoUrl: string;
  nonRootName: string;
  nonRootLogoUrl: string;
  rootName: string;
  rootLogoUrl: string;
  categories: ProductCategory[];
}

const defaultSettings: ProductSettings = {
  siteName: 'ARMAN X STORE',
  siteLogoUrl: '/logo.png',
  nonRootName: 'ARMAN X STORE NON-ROOT',
  nonRootLogoUrl: 'https://images.unsplash.com/photo-1614064641936-732732f1a63c?auto=format&fit=crop&q=80&w=200',
  rootName: 'ARMAN X STORE ROOT',
  rootLogoUrl: '/logo.png',
  categories: [
    {
      id: 'ARMAN X STORE NON-ROOT',
      name: 'ARMAN X STORE NON-ROOT',
      logoUrl: 'https://images.unsplash.com/photo-1614064641936-732732f1a63c?auto=format&fit=crop&q=80&w=200',
      theme: 'light'
    },
    {
      id: 'ARMAN X STORE ROOT',
      name: 'ARMAN X STORE ROOT',
      logoUrl: '/logo.png',
      theme: 'dark',
      popular: true
    }
  ]
};

let inventory: ProductKey[] = defaultInventory;
let settings: ProductSettings = defaultSettings;
let purchases: PurchaseRecord[] = [];
let balances: Record<string, number> = {};

const listeners = new Set<() => void>();
let initialized = false;

// Sync functions
const syncToStorage = async () => {
  try {
    localStorage.setItem('appDataGlobal', JSON.stringify({ inventory, settings, balances }));
    // Only attempt to sync if user is logged in
    if (auth.currentUser) {
      await setDoc(doc(db, 'appData', 'global'), { inventory, settings, balances }, { merge: true });
    }
  } catch (e: any) {
    console.warn('Failed to sync to Firestore (this is expected if not logged in as admin):', e.message);
  }
};

const syncPurchasesToStorage = async () => {
  try {
    localStorage.setItem('appDataPurchases', JSON.stringify(purchases));
    if (auth.currentUser) {
      await setDoc(doc(db, 'appData', 'purchases'), { purchases }, { merge: true });
    }
  } catch (e: any) {
    console.warn('Failed to sync purchases to Firestore (this is expected if not logged in as admin):', e.message);
  }
};

// Initialization and Realtime Listeners
const initializeData = async () => {
  if (initialized) return;
  initialized = true;

  try {
    const globalDoc = await getDoc(doc(db, 'appData', 'global'));
    const purchasesDoc = await getDoc(doc(db, 'appData', 'purchases'));

    if (globalDoc.exists()) {
      const data = globalDoc.data();
      if (data.inventory) inventory = data.inventory;
      if (data.settings) settings = data.settings;
      if (data.balances) balances = data.balances;
    } else {
      // First time? Load from localStorage if any, then sync up to Firestore
      const savedGlobal = localStorage.getItem('appDataGlobal');
      if (savedGlobal) {
        const data = JSON.parse(savedGlobal);
        if (data.inventory) inventory = data.inventory;
        if (data.settings) settings = data.settings;
        if (data.balances) balances = data.balances;
      }
      if (auth.currentUser) {
        await syncToStorage();
      }
    }

    if (purchasesDoc.exists()) {
      const data = purchasesDoc.data();
      if (data.purchases) purchases = data.purchases;
    } else {
      const savedPurchases = localStorage.getItem('appDataPurchases');
      if (savedPurchases) {
        purchases = JSON.parse(savedPurchases);
      }
      if (auth.currentUser) {
        await syncPurchasesToStorage();
      }
    }
    
    store.notify();

    // Listen to real-time changes
    onSnapshot(doc(db, 'appData', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.inventory) inventory = data.inventory;
        if (data.settings) settings = data.settings;
        if (data.balances) balances = data.balances;
        store.notify();
      }
    });

    onSnapshot(doc(db, 'appData', 'purchases'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.purchases) purchases = data.purchases;
        store.notify();
      }
    });

  } catch (e) {
    console.warn("Could not load from Firestore (expected if unauthenticated). Falling back to local storage:", e);
    // Fallback logic
    const savedGlobal = localStorage.getItem('appDataGlobal');
    if (savedGlobal) {
      const data = JSON.parse(savedGlobal);
      if (data.inventory) inventory = data.inventory;
      if (data.settings) settings = data.settings;
      if (data.balances) balances = data.balances;
    }
    
    const savedPurchases = localStorage.getItem('appDataPurchases');
    if (savedPurchases) {
      purchases = JSON.parse(savedPurchases);
    }
    store.notify();
  }
};

// Delay initialization until Auth state is known to avoid initial permission errors
onAuthStateChanged(auth, (user) => {
  if (!initialized) {
    initializeData();
  }
});

export const store = {
  getInventory: () => inventory,
  getSettings: () => settings,
  getPurchases: () => purchases,

  updateSettings: (newSettings: Partial<ProductSettings>) => {
    settings = { ...settings, ...newSettings };
    syncToStorage();
    store.notify();
  },
  
  addStock: (value: string, amount: number) => {
    inventory = inventory.map(item => 
      item.value === value 
        ? { ...item, stock: item.stock + amount } 
        : item
    );
    syncToStorage();
    store.notify();
  },

  addKeys: (value: string, newKeys: string[]) => {
    inventory = inventory.map(item => 
      item.value === value 
        ? { ...item, stock: item.stock + newKeys.length, keys: [...item.keys, ...newKeys] } 
        : item
    );
    syncToStorage();
    store.notify();
  },

  removeKey: (value: string, keyToRemove: string) => {
    inventory = inventory.map(item => {
      if (item.value === value) {
        const updatedKeys = item.keys.filter(k => k !== keyToRemove);
        return { ...item, keys: updatedKeys, stock: updatedKeys.length };
      }
      return item;
    });
    syncToStorage();
    store.notify();
  },

  purchaseKeys: async (value: string, count: number, userId?: string, userEmail?: string): Promise<string[]> => {
    let purchased: string[] = [];
    let record: PurchaseRecord | null = null;

    inventory = inventory.map(item => {
      if (item.value === value) {
        const remainingKeys = [...item.keys];
        purchased = remainingKeys.splice(0, count);
        
        if (purchased.length > 0) {
          record = {
            id: Math.random().toString(36).substring(2, 11),
            userId: userId || 'anonymous',
            value: item.value,
            category: item.category,
            label: item.label,
            keys: purchased,
            date: new Date().toISOString()
          };
        }
        
        // Don't reduce stock below 0
        const newStock = Math.max(0, item.stock - purchased.length);
        return { ...item, stock: newStock, keys: remainingKeys };
      }
      return item;
    });

    syncToStorage();

    if (record) {
      purchases = [record, ...purchases];
      syncPurchasesToStorage();
      store.notify();
    }
    
    return purchased;
  },

  setPurchases: (newPurchases: PurchaseRecord[]) => {
    purchases = newPurchases;
    store.notify();
  },

  addProduct: (category: string, label: string, value: string, price: number) => {
    if (!inventory.some(item => item.value === value)) {
      inventory = [...inventory, { category, label, value, price, stock: 0, keys: [] }];
      syncToStorage();
      store.notify();
    }
  },

  deleteProduct: (value: string) => {
    inventory = inventory.filter(item => item.value !== value);
    syncToStorage();
    store.notify();
  },

  getBalance: (userId: string) => balances[userId] || 0,
  
  addBalance: (userId: string, amount: number) => {
    if (!userId) return;
    const current = balances[userId] || 0;
    balances[userId] = current + amount;
    syncToStorage();
    store.notify();
  },

  deductBalance: (userId: string, amount: number): boolean => {
    if (!userId) return false;
    const current = balances[userId] || 0;
    if (current >= amount) {
      balances[userId] = current - amount;
      syncToStorage();
      store.notify();
      return true;
    }
    return false;
  },

  getAllBalances: () => balances,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify: () => {
    listeners.forEach(listener => listener());
  }
};

export function useBalance(userId?: string) {
  const [balance, setBalance] = useState(userId ? store.getBalance(userId) : 0);

  useEffect(() => {
    if (!userId) {
      setBalance(0);
      return;
    }
    setBalance(store.getBalance(userId));
    
    return store.subscribe(() => {
      setBalance(store.getBalance(userId));
    });
  }, [userId]);

  return { balance, addBalance: store.addBalance, deductBalance: store.deductBalance };
}

export function useInventory(userId?: string) {
  const [items, setItems] = useState(store.getInventory());
  const [settingsState, setSettingsState] = useState(store.getSettings());
  const [purchasesState, setPurchasesState] = useState<PurchaseRecord[]>([]);

  useEffect(() => {
    return store.subscribe(() => {
      setItems(store.getInventory());
      setSettingsState(store.getSettings());
      if (userId) {
         const userPurchases = store.getPurchases().filter(p => p.userId === userId);
         setPurchasesState(userPurchases);
      } else {
         setPurchasesState(store.getPurchases());
      }
    });
  }, [userId]);

  useEffect(() => {
    if (userId) {
      const userPurchases = store.getPurchases().filter(p => p.userId === userId);
      setPurchasesState(userPurchases);
    } else {
      setPurchasesState(store.getPurchases());
    }
  }, [userId]);

  return {
    items,
    settings: settingsState,
    purchases: purchasesState,
    balances: store.getAllBalances(),
    updateSettings: store.updateSettings,
    addStock: store.addStock,
    addKeys: store.addKeys,
    removeKey: store.removeKey,
    addProduct: store.addProduct,
    deleteProduct: store.deleteProduct,
    purchaseKeys: store.purchaseKeys
  };
}
