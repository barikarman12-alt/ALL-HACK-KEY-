import { useState, useEffect } from 'react';

export interface ProductKey {
  category: string;
  value: string;
  label: string;
  price: number;
  stock: number;
  keys: string[];
}

const defaultInventory: ProductKey[] = [
  { category: 'DRIPCLINT NON-ROOT', label: 'Day 1', value: 'nonroot_day1', price: 100, stock: 0, keys: [] },
  { category: 'DRIPCLINT NON-ROOT', label: 'Day 3', value: 'nonroot_day3', price: 200, stock: 0, keys: [] },
  { category: 'DRIPCLINT NON-ROOT', label: 'Day 7', value: 'nonroot_day7', price: 330, stock: 0, keys: [] },
  { category: 'DRIPCLINT NON-ROOT', label: 'Day 15', value: 'nonroot_day15', price: 630, stock: 0, keys: [] },
  { category: 'DRIPCLINT NON-ROOT', label: 'Day 30', value: 'nonroot_day30', price: 830, stock: 0, keys: [] },
  { category: 'DRIPCLINT ROOT', label: 'Day 1', value: 'root_day1', price: 100, stock: 0, keys: [] },
  { category: 'DRIPCLINT ROOT', label: 'Day 3', value: 'root_day3', price: 200, stock: 0, keys: [] },
  { category: 'DRIPCLINT ROOT', label: 'Day 7', value: 'root_day7', price: 330, stock: 0, keys: [] },
  { category: 'DRIPCLINT ROOT', label: 'Day 15', value: 'root_day15', price: 630, stock: 0, keys: [] },
  { category: 'DRIPCLINT ROOT', label: 'Day 30', value: 'root_day30', price: 830, stock: 0, keys: [] }
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
  nonRootName: string;
  nonRootLogoUrl: string;
  rootName: string;
  rootLogoUrl: string;
  categories: ProductCategory[];
}

const defaultSettings: ProductSettings = {
  nonRootName: 'DRIPCLINT NON-ROOT',
  nonRootLogoUrl: 'https://images.unsplash.com/photo-1614064641936-732732f1a63c?auto=format&fit=crop&q=80&w=200',
  rootName: 'DRIPCLINT ROOT',
  rootLogoUrl: '/logo.png',
  categories: [
    {
      id: 'DRIPCLINT NON-ROOT',
      name: 'DRIPCLINT NON-ROOT',
      logoUrl: 'https://images.unsplash.com/photo-1614064641936-732732f1a63c?auto=format&fit=crop&q=80&w=200',
      theme: 'light'
    },
    {
      id: 'DRIPCLINT ROOT',
      name: 'DRIPCLINT ROOT',
      logoUrl: '/logo.png',
      theme: 'dark',
      popular: true
    }
  ]
};

let inventory: ProductKey[] = defaultInventory;
let settings: ProductSettings = defaultSettings;
let purchases: PurchaseRecord[] = [];

const listeners = new Set<() => void>();

// Load from localStorage
const loadFromStorage = () => {
  try {
    const savedGlobal = localStorage.getItem('appDataGlobal');
    if (savedGlobal) {
      const data = JSON.parse(savedGlobal);
      if (data.inventory) inventory = data.inventory;
      if (data.settings) settings = data.settings;
    }
    
    const savedPurchases = localStorage.getItem('appDataPurchases');
    if (savedPurchases) {
      purchases = JSON.parse(savedPurchases);
    }
  } catch (e) {
    console.error("Failed to parse local storage", e);
  }
};

loadFromStorage();

const syncToStorage = () => {
  localStorage.setItem('appDataGlobal', JSON.stringify({ inventory, settings }));
};

const syncPurchasesToStorage = () => {
  localStorage.setItem('appDataPurchases', JSON.stringify(purchases));
};

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
        return { ...item, stock: item.stock - purchased.length, keys: remainingKeys };
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

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify: () => {
    listeners.forEach(listener => listener());
  }
};

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
      }
    });
  }, [userId]);

  useEffect(() => {
    if (userId) {
      const userPurchases = store.getPurchases().filter(p => p.userId === userId);
      setPurchasesState(userPurchases);
    }
  }, [userId]);

  return {
    items,
    settings: settingsState,
    purchases: purchasesState,
    updateSettings: store.updateSettings,
    addStock: store.addStock,
    addKeys: store.addKeys,
    addProduct: store.addProduct,
    deleteProduct: store.deleteProduct,
    purchaseKeys: store.purchaseKeys
  };
}
