import { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minSpend?: number;
  active: boolean;
  usageCount?: number;
  maxUses?: number; // How many times this coupon can be used (0 or undefined = unlimited)
  applicableScope?: 'all' | 'specific'; // 'all' = all products, 'specific' = selected products only
  applicableProducts?: string[]; // Array of product values when scope is 'specific'
  description?: string;
  createdAt: string;
  validHours?: number; // How many hours the coupon is valid for (0 or undefined = lifetime)
  expiresAt?: string | null; // ISO timestamp when coupon expires
}

export function getCouponRemainingTime(expiresAt?: string | null): { expired: boolean; text: string } {
  if (!expiresAt) return { expired: false, text: 'Lifetime / No Expiry' };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, text: 'Expired' };
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return { expired: false, text: `${days}d ${remHours}h left` };
  }
  if (hours > 0) {
    return { expired: false, text: `${hours}h ${minutes}m left` };
  }
  return { expired: false, text: `${Math.max(1, minutes)}m left` };
}

export function resolveProductName(
  rawCategoryOrId?: string,
  categories: ProductCategory[] = [],
  inventoryList: ProductKey[] = []
): string {
  if (!rawCategoryOrId) return 'Premium Key';

  const clean = String(rawCategoryOrId).trim();

  // 1. Direct match by category ID
  const matchedById = categories.find(
    c => c.id === clean || c.id.toLowerCase() === clean.toLowerCase()
  );
  if (matchedById && matchedById.name?.trim()) {
    return matchedById.name.trim();
  }

  // 2. Direct match by category Name
  const matchedByName = categories.find(
    c => c.name.toLowerCase() === clean.toLowerCase()
  );
  if (matchedByName && matchedByName.name?.trim()) {
    return matchedByName.name.trim();
  }

  // 3. Search inventory item by value or category
  const invItem = inventoryList.find(
    i => i.value === clean || i.category === clean
  );
  if (invItem) {
    const invCat = categories.find(c => c.id === invItem.category);
    if (invCat && invCat.name?.trim()) {
      return invCat.name.trim();
    }
  }

  // 4. If rawCategoryOrId starts with "CATEGORY_" or "category_" (raw generated ID)
  if (/^category_/i.test(clean)) {
    // If there is only one category in store, it's definitely that one!
    if (categories.length === 1 && categories[0]?.name?.trim()) {
      return categories[0].name.trim();
    }
    if (categories.length > 0) {
      return categories[0].name.trim();
    }
    return 'Premium Product';
  }

  return clean;
}

export interface ProductKey {
  category: string;
  value: string;
  label: string;
  price: number;
  stock: number;
  keys: string[];
}

const defaultInventory: ProductKey[] = [];

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
  userEmail?: string;
  value: string;
  category: string;
  label: string;
  keys: string[];
  date: string;
  amount?: number;
  couponCode?: string;
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

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  customId?: string;
  photoURL?: string;
  role?: 'owner' | 'admin' | 'customer';
  createdAt?: string;
  lastLoginAt?: string;
  balance?: number;
  phone?: string;
  status?: 'active' | 'suspended';
}

export interface UserWithStats extends UserProfile {
  totalOrders: number;
  totalSpent: number;
  totalKeys: number;
  balance: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  type: 'deposit' | 'refund' | 'adjustment' | 'deduction';
  amount: number;
  method: string; // e.g. 'UPI / QR Gateway (FamPay)', 'Manual Admin Credit', 'Auto-Refund (Stock Out)', 'Admin Order Refund'
  referenceId?: string; // Order ID or UTR / Gateway Order ID
  note?: string;
  date: string; // ISO date string
  status: 'completed' | 'success' | 'failed' | 'pending';
  balanceAfter?: number;
}

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'refund' | 'deposit' | 'order' | 'system';
  amount?: number;
  date: string;
  read: boolean;
  orderId?: string;
  productName?: string;
}

const defaultCoupons: Coupon[] = [
  {
    id: 'coupon_off20',
    code: 'OFF20',
    discountType: 'percentage',
    discountValue: 20,
    active: true,
    description: 'Special Offer: 20% OFF on all keys',
    createdAt: new Date().toISOString()
  },
  {
    id: 'coupon_arman30',
    code: 'ARMAN30',
    discountType: 'percentage',
    discountValue: 30,
    active: true,
    description: 'Owner Flash Sale: 30% OFF',
    createdAt: new Date().toISOString()
  }
];

const defaultSettings: ProductSettings = {
  siteName: 'ARMAN X STORE',
  siteLogoUrl: '/logo.png',
  nonRootName: '',
  nonRootLogoUrl: '',
  rootName: '',
  rootLogoUrl: '',
  categories: []
};

const loadInitialGlobal = (): { inventory: ProductKey[]; settings: ProductSettings; balances: Record<string, number> } => {
  let inv = defaultInventory;
  let sett = defaultSettings;
  let bals: Record<string, number> = {};
  try {
    const saved = localStorage.getItem('appDataGlobal');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.inventory && Array.isArray(parsed.inventory)) {
        inv = parsed.inventory.filter((item: ProductKey) => !item.category.includes('NON-ROOT') && !item.category.includes('ROOT'));
      }
      if (parsed.settings) {
        sett = { ...defaultSettings, ...parsed.settings };
        if (sett.categories && Array.isArray(sett.categories)) {
          sett.categories = sett.categories.filter((c: ProductCategory) => !c.id.includes('NON-ROOT') && !c.id.includes('ROOT'));
        }
      }
      if (parsed.balances) {
        bals = parsed.balances;
      }
    }
  } catch (e) {}
  return { inventory: inv, settings: sett, balances: bals };
};

const loadInitialPurchases = (): PurchaseRecord[] => {
  try {
    const saved = localStorage.getItem('appDataPurchases');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const loadInitialUsers = (): UserProfile[] => {
  try {
    const saved = localStorage.getItem('appDataUsersRegistry');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const loadInitialTransactions = (): WalletTransaction[] => {
  try {
    const saved = localStorage.getItem('appDataWalletTransactions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const loadInitialNotifications = (): UserNotification[] => {
  try {
    const saved = localStorage.getItem('appDataNotifications');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const loadInitialCoupons = (): Coupon[] => {
  try {
    const dedicated = localStorage.getItem('appDataCoupons');
    if (dedicated) {
      const parsed = JSON.parse(dedicated);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const global = localStorage.getItem('appDataGlobal');
    if (global) {
      const parsed = JSON.parse(global);
      if (parsed && Array.isArray(parsed.coupons) && parsed.coupons.length > 0) return parsed.coupons;
    }
  } catch (e) {}
  return defaultCoupons;
};

const mergeCoupons = (baseList: Coupon[], incomingList: Coupon[]): Coupon[] => {
  const map = new Map<string, Coupon>();
  (baseList || []).forEach(c => {
    if (c && c.code) map.set(c.code.trim().toUpperCase(), c);
  });
  (incomingList || []).forEach(c => {
    if (c && c.code) {
      const key = c.code.trim().toUpperCase();
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, ...c, usageCount: Math.max(existing.usageCount || 0, c.usageCount || 0) });
      } else {
        map.set(key, c);
      }
    }
  });
  return Array.from(map.values());
};

const initialGlobal = loadInitialGlobal();
let inventory: ProductKey[] = initialGlobal.inventory;
let settings: ProductSettings = initialGlobal.settings;
let purchases: PurchaseRecord[] = loadInitialPurchases();
let balances: Record<string, number> = initialGlobal.balances;
let coupons: Coupon[] = loadInitialCoupons();
let registeredUsers: UserProfile[] = loadInitialUsers();
let walletTransactions: WalletTransaction[] = loadInitialTransactions();
let userNotifications: UserNotification[] = loadInitialNotifications();

const listeners = new Set<() => void>();
let initialized = (settings.categories && settings.categories.length > 0);

// Sync functions
const syncCouponsToStorage = async () => {
  try {
    localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
    localStorage.setItem('appDataGlobal', JSON.stringify({ inventory, settings, balances, coupons }));
    
    // Always attempt syncing to Firestore appData/coupons and appData/global
    try {
      await setDoc(doc(db, 'appData', 'coupons'), { coupons, updatedAt: new Date().toISOString() }, { merge: true });
      await setDoc(doc(db, 'appData', 'global'), { inventory, settings, balances, coupons }, { merge: true });
    } catch (e: any) {
      console.warn('Firestore coupons sync notice:', e?.message || e);
    }
  } catch (e: any) {
    console.warn('Failed to sync coupons to storage:', e?.message || e);
  }
};

const syncToStorage = async () => {
  try {
    localStorage.setItem('appDataGlobal', JSON.stringify({ inventory, settings, balances, coupons }));
    localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
    
    try {
      await setDoc(doc(db, 'appData', 'global'), { inventory, settings, balances, coupons }, { merge: true });
      await setDoc(doc(db, 'appData', 'coupons'), { coupons, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e: any) {
      console.warn('Firestore sync notice:', e?.message || e);
    }
  } catch (e: any) {
    console.warn('Failed to sync to storage:', e?.message || e);
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

const syncUsersToStorage = async () => {
  try {
    localStorage.setItem('appDataUsersRegistry', JSON.stringify(registeredUsers));
    if (auth.currentUser) {
      await setDoc(doc(db, 'appData', 'usersRegistry'), { users: registeredUsers }, { merge: true });
    }
  } catch (e: any) {
    console.warn('Failed to sync users registry to Firestore:', e.message);
  }
};

const syncTransactionsToStorage = async () => {
  try {
    localStorage.setItem('appDataWalletTransactions', JSON.stringify(walletTransactions));
    if (auth.currentUser) {
      await setDoc(doc(db, 'appData', 'walletTransactions'), { transactions: walletTransactions.slice(0, 300) }, { merge: true });
    }
  } catch (e: any) {
    console.warn('Failed to sync wallet transactions:', e.message);
  }
};

const syncNotificationsToStorage = async () => {
  try {
    localStorage.setItem('appDataNotifications', JSON.stringify(userNotifications));
    if (auth.currentUser) {
      await setDoc(doc(db, 'appData', 'notifications'), { notifications: userNotifications.slice(0, 200) }, { merge: true });
    }
  } catch (e: any) {
    console.warn('Failed to sync notifications:', e.message);
  }
};

// Initialization and Realtime Listeners
const initializeData = async () => {
  if (initialized && settings.categories && settings.categories.length > 0) {
    // Already fast-booted from cache, now refresh in parallel
  }
  initialized = true;

  try {
    // 1. First ensure any locally created coupons are loaded
    const localSavedCoupons = localStorage.getItem('appDataCoupons');
    if (localSavedCoupons) {
      try {
        const parsed = JSON.parse(localSavedCoupons);
        if (Array.isArray(parsed) && parsed.length > 0) {
          coupons = mergeCoupons(coupons, parsed);
        }
      } catch (e) {}
    }

    // Parallel fetch from Firestore
    const [globalRes, couponsRes, purchasesDocRes, purchasesColRes, usersDocRes, usersColRes, txRes, notifRes] = await Promise.allSettled([
      getDoc(doc(db, 'appData', 'global')),
      getDoc(doc(db, 'appData', 'coupons')),
      getDoc(doc(db, 'appData', 'purchases')),
      getDocs(collection(db, 'purchases')),
      getDoc(doc(db, 'appData', 'usersRegistry')),
      getDocs(collection(db, 'users')),
      getDoc(doc(db, 'appData', 'walletTransactions')),
      getDoc(doc(db, 'appData', 'notifications'))
    ]);

    // Handle Coupons
    if (couponsRes.status === 'fulfilled' && couponsRes.value.exists()) {
      const cData = couponsRes.value.data();
      if (Array.isArray(cData.coupons)) {
        coupons = mergeCoupons(coupons, cData.coupons);
      }
    }

    // Handle Global (Inventory, Settings, Balances)
    if (globalRes.status === 'fulfilled' && globalRes.value.exists()) {
      const data = globalRes.value.data();
      if (data.inventory) inventory = data.inventory.filter((item: ProductKey) => !item.category.includes('NON-ROOT') && !item.category.includes('ROOT'));
      if (data.settings) {
        settings = data.settings;
        if (settings.categories) {
          settings.categories = settings.categories.filter((c: ProductCategory) => !c.id.includes('NON-ROOT') && !c.id.includes('ROOT'));
        }
      }
      if (data.balances) {
        balances = { ...balances, ...data.balances };
      }
      if (data.coupons && Array.isArray(data.coupons)) {
        coupons = mergeCoupons(coupons, data.coupons);
      }
      localStorage.setItem('appDataGlobal', JSON.stringify({ inventory, settings, balances, coupons }));
    }

    // Always cache the merged coupons to local storage
    localStorage.setItem('appDataCoupons', JSON.stringify(coupons));

    // Hydrate any local user balances from localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_balance_')) {
          const uid = key.replace('user_balance_', '');
          const val = parseFloat(localStorage.getItem(key) || '0');
          if (!isNaN(val) && val > (balances[uid] || 0)) {
            balances[uid] = val;
          }
        }
      }
    } catch(e) {}

    // Handle Purchases
    if (purchasesDocRes.status === 'fulfilled' && purchasesDocRes.value.exists()) {
      const data = purchasesDocRes.value.data();
      if (data.purchases) purchases = data.purchases;
    }
    if (purchasesColRes.status === 'fulfilled' && !purchasesColRes.value.empty) {
      const remoteList: PurchaseRecord[] = [];
      purchasesColRes.value.forEach(d => remoteList.push(d.data() as PurchaseRecord));
      const merged = new Map<string, PurchaseRecord>();
      purchases.forEach(p => merged.set(p.id, p));
      remoteList.forEach(p => merged.set(p.id, p));
      purchases = Array.from(merged.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Handle Registered Users
    if (usersDocRes.status === 'fulfilled' && usersDocRes.value.exists()) {
      const uData = usersDocRes.value.data();
      if (Array.isArray(uData.users)) {
        const map = new Map<string, UserProfile>();
        registeredUsers.forEach(u => map.set(u.uid, u));
        uData.users.forEach((u: UserProfile) => {
          if (u && u.uid) map.set(u.uid, { ...map.get(u.uid), ...u });
        });
        registeredUsers = Array.from(map.values());
      }
    }
    if (usersColRes.status === 'fulfilled' && !usersColRes.value.empty) {
      const map = new Map<string, UserProfile>();
      registeredUsers.forEach(u => map.set(u.uid, u));
      usersColRes.value.forEach(d => {
        const u = d.data();
        map.set(d.id, {
          uid: d.id,
          email: u.email || '',
          displayName: u.displayName || u.email?.split('@')[0] || 'User',
          customId: u.customId || u.email?.split('@')[0] || d.id.substring(0, 8),
          photoURL: u.photoURL || '',
          role: u.role || (u.email?.includes('barikarman') ? 'owner' : 'customer'),
          createdAt: u.createdAt || '',
          lastLoginAt: u.lastLoginAt || '',
          status: u.status || 'active',
          phone: u.phone || '',
          ...map.get(d.id)
        });
      });
      registeredUsers = Array.from(map.values());
    }

    // Handle Wallet Transactions
    if (txRes.status === 'fulfilled' && txRes.value.exists()) {
      const tData = txRes.value.data();
      if (Array.isArray(tData.transactions)) {
        const map = new Map<string, WalletTransaction>();
        walletTransactions.forEach(t => map.set(t.id, t));
        tData.transactions.forEach((t: WalletTransaction) => {
          if (t && t.id) map.set(t.id, t);
        });
        walletTransactions = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    }

    // Handle Notifications
    if (notifRes.status === 'fulfilled' && notifRes.value.exists()) {
      const nData = notifRes.value.data();
      if (Array.isArray(nData.notifications)) {
        const map = new Map<string, UserNotification>();
        userNotifications.forEach(n => map.set(n.id, n));
        nData.notifications.forEach((n: UserNotification) => {
          if (n && n.id) map.set(n.id, n);
        });
        userNotifications = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
    }
    
    store.notify();

    // Listen to real-time changes
    onSnapshot(doc(db, 'appData', 'coupons'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.coupons && Array.isArray(data.coupons)) {
          coupons = mergeCoupons(coupons, data.coupons);
          localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
          store.notify();
        }
      }
    });

    onSnapshot(doc(db, 'appData', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.inventory) inventory = data.inventory.filter((item: ProductKey) => !item.category.includes('NON-ROOT') && !item.category.includes('ROOT'));
        if (data.settings) {
          settings = data.settings;
          if (settings.categories) {
            settings.categories = settings.categories.filter((c: ProductCategory) => !c.id.includes('NON-ROOT') && !c.id.includes('ROOT'));
          }
        }
        if (data.coupons && Array.isArray(data.coupons)) {
          coupons = mergeCoupons(coupons, data.coupons);
          localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
        }
        if (data.balances) {
          balances = { ...balances, ...data.balances };
          // Preserve local storage user balances
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('user_balance_')) {
                const uid = key.replace('user_balance_', '');
                const val = parseFloat(localStorage.getItem(key) || '0');
                if (!isNaN(val) && val > (balances[uid] || 0)) {
                  balances[uid] = val;
                }
              }
            }
          } catch(e) {}
        }
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

    onSnapshot(doc(db, 'appData', 'usersRegistry'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.users)) {
          const map = new Map<string, UserProfile>();
          registeredUsers.forEach(u => map.set(u.uid, u));
          data.users.forEach((u: UserProfile) => {
            if (u && u.uid) map.set(u.uid, { ...map.get(u.uid), ...u });
          });
          registeredUsers = Array.from(map.values());
          store.notify();
        }
      }
    });

    onSnapshot(doc(db, 'appData', 'walletTransactions'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.transactions)) {
          const map = new Map<string, WalletTransaction>();
          walletTransactions.forEach(t => map.set(t.id, t));
          data.transactions.forEach((t: WalletTransaction) => {
            if (t && t.id) map.set(t.id, t);
          });
          walletTransactions = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          store.notify();
        }
      }
    });

    onSnapshot(doc(db, 'appData', 'notifications'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.notifications)) {
          const map = new Map<string, UserNotification>();
          userNotifications.forEach(n => map.set(n.id, n));
          data.notifications.forEach((n: UserNotification) => {
            if (n && n.id) map.set(n.id, n);
          });
          userNotifications = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          store.notify();
        }
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

// Initialize store data immediately
let userDocUnsub: (() => void) | null = null;
initializeData();

onAuthStateChanged(auth, (user) => {
  if (!initialized) {
    initializeData();
  }
  if (userDocUnsub) {
    userDocUnsub();
    userDocUnsub = null;
  }
  if (user) {
    try {
      userDocUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.balance === 'number') {
            const current = store.getBalance(user.uid);
            if (data.balance !== current) {
              balances[user.uid] = data.balance;
              try {
                localStorage.setItem('user_balance_' + user.uid, data.balance.toString());
              } catch(e) {}
              store.notify();
            }
          }
        }
      }, () => {});
    } catch(e) {}
  }
});

export const store = {
  getInventory: () => inventory,
  getSettings: () => settings,
  getPurchases: () => purchases,
  isInitialized: () => initialized,

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

  purchaseKeys: async (value: string, count: number, userId?: string, userEmail?: string, meta?: { amount?: number; couponCode?: string }): Promise<string[]> => {
    let purchased: string[] = [];
    let record: PurchaseRecord | null = null;

    inventory = inventory.map(item => {
      if (item.value === value) {
        const remainingKeys = [...item.keys];
        purchased = remainingKeys.splice(0, count);
        
        if (purchased.length > 0) {
          const productDisplayName = resolveProductName(item.category, settings.categories, inventory);
          record = {
            id: 'ord_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            userId: userId || 'anonymous',
            userEmail: userEmail || '',
            value: item.value,
            category: productDisplayName,
            label: item.label,
            keys: purchased,
            amount: meta?.amount,
            couponCode: meta?.couponCode,
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
      if (meta?.couponCode) {
        const codeUpper = meta.couponCode.trim().toUpperCase();
        coupons = coupons.map(c => {
          if (c.code.toUpperCase() === codeUpper) {
            return { ...c, usageCount: (c.usageCount || 0) + 1 };
          }
          return c;
        });
        syncToStorage();
      }
      try {
        if (auth.currentUser) {
          setDoc(doc(db, 'purchases', (record as PurchaseRecord).id), record).catch(() => {});
        }
      } catch (e) {}
      store.notify();
    }
    
    return purchased;
  },

  setPurchases: (newPurchases: PurchaseRecord[]) => {
    purchases = newPurchases;
    store.notify();
  },

  // Coupon management
  getCoupons: () => coupons,

  addCoupon: (newCouponData: Omit<Coupon, 'id' | 'createdAt'>) => {
    const code = newCouponData.code.trim().toUpperCase();
    const newCoupon: Coupon = {
      ...newCouponData,
      id: 'coupon_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      code,
      discountValue: Math.max(1, Number(newCouponData.discountValue) || 1),
      usageCount: 0,
      createdAt: new Date().toISOString()
    };
    // Replace if exists, or prepend
    coupons = [newCoupon, ...coupons.filter(c => c.code.trim().toUpperCase() !== code)];
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
    return newCoupon;
  },

  updateCoupon: (id: string, updates: Partial<Coupon>) => {
    coupons = coupons.map(c => {
      if (c.id === id) {
        const updated = { ...c, ...updates };
        if (updates.code) updated.code = updates.code.trim().toUpperCase();
        if (typeof updates.discountValue !== 'undefined') updated.discountValue = Math.max(1, Number(updates.discountValue) || 1);
        return updated;
      }
      return c;
    });
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
  },

  deleteCoupon: (id: string) => {
    coupons = coupons.filter(c => c.id !== id);
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
  },

  toggleCoupon: (id: string) => {
    coupons = coupons.map(c => c.id === id ? { ...c, active: !c.active } : c);
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
  },

  incrementCouponUsage: (rawCode: string) => {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) return;
    coupons = coupons.map(c => {
      if (c.code.toUpperCase() === code) {
        return { ...c, usageCount: (c.usageCount || 0) + 1 };
      }
      return c;
    });
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
  },

  validateCoupon: (rawCode: string, currentTotal: number, productValue?: string) => {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: 'Please enter a coupon code.' };
    }
    let found = coupons.find(c => c.code.toUpperCase() === code);
    if (!found) {
      // Fallback check from localStorage in case memory state was reloaded
      try {
        const dedicated = localStorage.getItem('appDataCoupons');
        if (dedicated) {
          const parsed: Coupon[] = JSON.parse(dedicated);
          const fallback = parsed.find(c => c.code && c.code.toUpperCase() === code);
          if (fallback) {
            found = fallback;
            coupons = mergeCoupons(coupons, [fallback]);
            store.notify();
          }
        }
      } catch (e) {}
    }
    if (!found) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon code "${code}" is invalid.` };
    }
    if (!found.active) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon code "${code}" is currently disabled.` };
    }
    if (found.expiresAt) {
      const expiryTime = new Date(found.expiresAt).getTime();
      if (!isNaN(expiryTime) && Date.now() > expiryTime) {
        return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon code "${code}" has expired.` };
      }
    }
    if (found.maxUses && found.maxUses > 0 && (found.usageCount || 0) >= found.maxUses) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon code "${code}" has reached its maximum usage limit (${found.maxUses} times).` };
    }
    if (found.applicableScope === 'specific' && found.applicableProducts && found.applicableProducts.length > 0) {
      if (productValue && !found.applicableProducts.includes(productValue)) {
        return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon "${code}" is not valid for this specific product.` };
      }
    }
    if (found.minSpend && currentTotal < found.minSpend) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: `Minimum cart amount of ₹${found.minSpend} required for this coupon.` };
    }

    let discount = 0;
    if (found.discountType === 'percentage') {
      discount = Math.round((currentTotal * found.discountValue) / 100);
    } else {
      discount = Math.round(found.discountValue);
    }

    // Ensure user pays at least 1 rupee
    discount = Math.min(discount, Math.max(0, currentTotal - 1));
    const finalPrice = Math.max(1, currentTotal - discount);

    return {
      valid: true,
      coupon: found,
      discount,
      finalPrice,
      message: `🎉 Coupon "${found.code}" applied! You saved ₹${discount}`
    };
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

  getBalance: (userId: string) => {
    if (!userId) return 0;
    if (typeof balances[userId] === 'number') return balances[userId];
    try {
      const saved = localStorage.getItem('user_balance_' + userId);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed)) {
          balances[userId] = parsed;
          return parsed;
        }
      }
    } catch(e) {}
    return 0;
  },
  
  addBalance: (
    userId: string,
    amount: number,
    txDetails?: {
      method?: string;
      referenceId?: string;
      note?: string;
      type?: 'deposit' | 'refund' | 'adjustment';
      userEmail?: string;
    }
  ) => {
    if (!userId || amount <= 0) return;
    const current = store.getBalance(userId);
    const newBal = current + amount;
    balances[userId] = newBal;
    try {
      localStorage.setItem('user_balance_' + userId, newBal.toString());
      if (auth.currentUser?.uid === userId || auth.currentUser?.email?.includes('barikarman')) {
        setDoc(doc(db, 'users', userId), { balance: newBal, lastUpdated: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
    } catch(e) {}
    syncToStorage();

    const isRefund = txDetails?.type === 'refund';
    const tx: WalletTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userEmail: txDetails?.userEmail || registeredUsers.find(u => u.uid === userId)?.email || '',
      type: txDetails?.type || 'deposit',
      amount,
      method: txDetails?.method || (isRefund ? 'Auto-Refund (Stock Out)' : 'UPI / QR Gateway (FamPay)'),
      referenceId: txDetails?.referenceId || `order_${Date.now()}`,
      note: txDetails?.note || (isRefund ? 'Refund credited to wallet' : 'Wallet balance recharge'),
      date: new Date().toISOString(),
      status: 'completed',
      balanceAfter: newBal
    };
    walletTransactions.unshift(tx);
    syncTransactionsToStorage();

    if (isRefund) {
      store.addNotification({
        userId,
        title: '💰 Refund Credited to Wallet',
        message: `₹${amount} has been refunded to your wallet.${txDetails?.note ? ` Details: ${txDetails.note}` : ''} (Balance: ₹${newBal})`,
        type: 'refund',
        amount,
        orderId: txDetails?.referenceId
      });
    } else {
      store.addNotification({
        userId,
        title: '💵 Money Added to Wallet',
        message: `₹${amount} has been added to your wallet balance.${txDetails?.note ? ` Details: ${txDetails.note}` : ''} (Balance: ₹${newBal})`,
        type: 'deposit',
        amount,
        orderId: txDetails?.referenceId
      });
    }

    store.notify();
  },

  deductBalance: (userId: string, amount: number): boolean => {
    if (!userId || amount <= 0) return false;
    const current = store.getBalance(userId);
    if (current >= amount) {
      const newBal = current - amount;
      balances[userId] = newBal;
      try {
        localStorage.setItem('user_balance_' + userId, newBal.toString());
        if (auth.currentUser?.uid === userId) {
          setDoc(doc(db, 'users', userId), { balance: newBal, lastUpdated: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
      } catch(e) {}
      syncToStorage();
      store.notify();
      return true;
    }
    return false;
  },

  addTransaction: (tx: Omit<WalletTransaction, 'id' | 'date'> & { id?: string; date?: string }) => {
    const newTx: WalletTransaction = {
      ...tx,
      id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      date: tx.date || new Date().toISOString(),
      status: tx.status || 'completed'
    };
    walletTransactions.unshift(newTx);
    syncTransactionsToStorage();
    store.notify();
    return newTx;
  },

  getTransactions: (userId?: string): WalletTransaction[] => {
    if (!userId) return walletTransactions;
    return walletTransactions.filter(t => t.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getAllTransactions: (): WalletTransaction[] => {
    return walletTransactions;
  },

  addNotification: async (notifData: Omit<UserNotification, 'id' | 'date' | 'read'> & { id?: string; date?: string; read?: boolean }) => {
    const notif: UserNotification = {
      id: notifData.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: notifData.userId,
      title: notifData.title,
      message: notifData.message,
      type: notifData.type || 'refund',
      amount: notifData.amount,
      date: notifData.date || new Date().toISOString(),
      read: notifData.read || false,
      orderId: notifData.orderId,
      productName: notifData.productName
    };
    userNotifications.unshift(notif);
    syncNotificationsToStorage();
    try {
      await setDoc(doc(db, 'notifications', notif.id), notif, { merge: true });
    } catch(e) {}
    store.notify();
    return notif;
  },

  getNotifications: (userId?: string): UserNotification[] => {
    if (!userId) return [];
    return userNotifications.filter(n => n.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  markNotificationAsRead: async (notifId: string) => {
    userNotifications = userNotifications.map(n => n.id === notifId ? { ...n, read: true } : n);
    syncNotificationsToStorage();
    try {
      await setDoc(doc(db, 'notifications', notifId), { read: true }, { merge: true });
    } catch(e) {}
    store.notify();
  },

  markAllNotificationsAsRead: async (userId: string) => {
    if (!userId) return;
    userNotifications = userNotifications.map(n => n.userId === userId ? { ...n, read: true } : n);
    syncNotificationsToStorage();
    store.notify();
  },

  clearNotifications: async (userId: string) => {
    if (!userId) return;
    userNotifications = userNotifications.filter(n => n.userId !== userId);
    syncNotificationsToStorage();
    store.notify();
  },

  issueRefund: async (params: {
    orderId: string;
    userId: string;
    amount: number;
    reason?: string;
    productName?: string;
  }) => {
    const { orderId, userId, amount, reason, productName } = params;
    if (!userId || amount <= 0) return;

    const current = store.getBalance(userId);
    const newBal = current + amount;
    balances[userId] = newBal;
    try {
      localStorage.setItem('user_balance_' + userId, newBal.toString());
      await setDoc(doc(db, 'users', userId), { balance: newBal, lastUpdated: new Date().toISOString() }, { merge: true }).catch(() => {});
    } catch(e) {}
    syncToStorage();

    const tx: WalletTransaction = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      userEmail: registeredUsers.find(u => u.uid === userId)?.email || '',
      type: 'refund',
      amount,
      method: 'Admin Order Refund',
      referenceId: orderId,
      note: reason ? `Refund: ${reason}` : `Order #${orderId} refunded (${productName || 'License Key'})`,
      date: new Date().toISOString(),
      status: 'completed',
      balanceAfter: newBal
    };
    walletTransactions.unshift(tx);
    syncTransactionsToStorage();

    const pIdx = purchases.findIndex(p => p.id === orderId);
    if (pIdx >= 0) {
      (purchases[pIdx] as any).refunded = true;
      (purchases[pIdx] as any).refundAmount = amount;
      (purchases[pIdx] as any).refundReason = reason || 'Admin Order Refund';
      (purchases[pIdx] as any).refundDate = new Date().toISOString();
      syncPurchasesToStorage();
    }

    await store.addNotification({
      userId,
      title: '💰 Order Refund Credited',
      message: `₹${amount} has been refunded to your wallet for Order #${orderId} (${productName || 'Product'}). ${reason ? `Reason: ${reason}` : ''}`,
      type: 'refund',
      amount,
      orderId,
      productName
    });

    store.notify();
  },

  getAllBalances: () => balances,

  getUsers: (): UserWithStats[] => {
    const userMap = new Map<string, UserWithStats>();

    // 1. Registered users from database / storage
    registeredUsers.forEach(u => {
      if (u && u.uid) {
        userMap.set(u.uid, {
          ...u,
          balance: balances[u.uid] ?? (u.balance || 0),
          totalOrders: 0,
          totalSpent: 0,
          totalKeys: 0
        });
      }
    });

    // 2. Discover from purchases
    purchases.forEach(p => {
      const uid = p.userId || 'anonymous';
      if (uid !== 'anonymous') {
        const existing = userMap.get(uid);
        const email = p.userEmail || existing?.email || (uid.includes('@') ? uid : `${uid}@user.store`);
        const customId = existing?.customId || email.split('@')[0] || uid.substring(0, 8);
        const displayName = existing?.displayName || customId;
        const currentBalance = balances[uid] ?? (existing?.balance || 0);

        if (!existing) {
          userMap.set(uid, {
            uid,
            email,
            displayName,
            customId,
            createdAt: p.date,
            lastLoginAt: p.date,
            role: (email.includes('barikarman') ? 'owner' : 'customer'),
            status: 'active',
            balance: currentBalance,
            totalOrders: 0,
            totalSpent: 0,
            totalKeys: 0
          });
        }
      }
    });

    // 3. Discover from balances
    Object.keys(balances || {}).forEach(uid => {
      if (uid && uid !== 'anonymous' && !userMap.has(uid)) {
        const email = uid.includes('@') ? uid : `${uid}@armanxstore.com`;
        const customId = email.split('@')[0] || uid.substring(0, 8);
        userMap.set(uid, {
          uid,
          email,
          displayName: customId,
          customId,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          role: (email.includes('barikarman') ? 'owner' : 'customer'),
          status: 'active',
          balance: balances[uid] || 0,
          totalOrders: 0,
          totalSpent: 0,
          totalKeys: 0
        });
      }
    });

    // 4. Calculate total orders, spent, and keys from purchases
    purchases.forEach(p => {
      const uid = p.userId;
      if (uid && userMap.has(uid)) {
        const u = userMap.get(uid)!;
        u.totalOrders += 1;
        u.totalKeys += (p.keys?.length || 0);
        let orderAmount = p.amount;
        if (typeof orderAmount !== 'number') {
          const itm = inventory.find(i => i.value === p.value);
          orderAmount = (itm ? itm.price : 0) * (p.keys?.length || 1);
        }
        u.totalSpent += (orderAmount || 0);

        if (p.date && (!u.lastLoginAt || new Date(p.date).getTime() > new Date(u.lastLoginAt).getTime())) {
          u.lastLoginAt = p.date;
        }
      }
    });

    return Array.from(userMap.values()).map(u => ({
      ...u,
      balance: balances[u.uid] ?? (u.balance || 0)
    }));
  },

  registerOrUpdateUser: async (profile: Partial<UserProfile> & { uid: string }) => {
    if (!profile.uid) return;
    const existingIdx = registeredUsers.findIndex(u => u.uid === profile.uid);
    const updated: UserProfile = {
      uid: profile.uid,
      email: profile.email || '',
      displayName: profile.displayName || profile.email?.split('@')[0] || 'User',
      customId: profile.customId || profile.email?.split('@')[0] || profile.uid.substring(0, 8),
      photoURL: profile.photoURL,
      role: profile.role || (profile.email?.includes('barikarman') ? 'owner' : 'customer'),
      createdAt: profile.createdAt || (existingIdx >= 0 ? registeredUsers[existingIdx].createdAt : new Date().toISOString()),
      lastLoginAt: new Date().toISOString(),
      status: profile.status || (existingIdx >= 0 ? registeredUsers[existingIdx].status : 'active'),
      phone: profile.phone || (existingIdx >= 0 ? registeredUsers[existingIdx].phone : '')
    };

    if (existingIdx >= 0) {
      registeredUsers[existingIdx] = { ...registeredUsers[existingIdx], ...updated };
    } else {
      registeredUsers.push(updated);
    }

    syncUsersToStorage();
    try {
      await setDoc(doc(db, 'users', profile.uid), updated, { merge: true });
    } catch (e) {}
    store.notify();
  },

  updateUserBalance: async (
    userId: string,
    newBalance: number,
    note?: string,
    actionDetails?: {
      action?: 'add' | 'deduct' | 'refund';
      method?: string;
      amount?: number;
      referenceId?: string;
    }
  ) => {
    if (!userId) return;
    const oldBal = store.getBalance(userId);
    const safeBal = Math.max(0, Math.round(newBalance * 100) / 100);
    const diff = safeBal - oldBal;
    balances[userId] = safeBal;
    try {
      localStorage.setItem('user_balance_' + userId, safeBal.toString());
      await setDoc(doc(db, 'users', userId), { balance: safeBal, lastBalanceUpdate: new Date().toISOString(), balanceNote: note || '' }, { merge: true }).catch(() => {});
    } catch (e) {}
    syncToStorage();

    const isRefund = actionDetails?.action === 'refund' || (Boolean(note) && /refund/i.test(note || ''));
    const isDeduct = actionDetails?.action === 'deduct' || diff < 0;
    const absAmt = actionDetails?.amount ?? Math.abs(diff);

    if (absAmt > 0) {
      const txType = isRefund ? 'refund' : (isDeduct ? 'deduction' : 'adjustment');
      const txMethod = actionDetails?.method || (isRefund ? 'Admin Refund' : (isDeduct ? 'Manual Admin Debit' : 'Manual Admin Credit'));
      
      const tx: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        userEmail: registeredUsers.find(u => u.uid === userId)?.email || '',
        type: txType,
        amount: absAmt,
        method: txMethod,
        referenceId: actionDetails?.referenceId || `adj_${Date.now()}`,
        note: note || (isRefund ? 'Admin refund adjustment' : 'Admin wallet adjustment'),
        date: new Date().toISOString(),
        status: 'completed',
        balanceAfter: safeBal
      };
      walletTransactions.unshift(tx);
      syncTransactionsToStorage();

      if (isRefund) {
        await store.addNotification({
          userId,
          title: '💰 Refund Credited to Wallet',
          message: `₹${absAmt} has been refunded to your wallet balance by Support / Admin.${note ? ` Note: ${note}` : ''} (Current Balance: ₹${safeBal})`,
          type: 'refund',
          amount: absAmt,
          orderId: actionDetails?.referenceId
        });
      } else if (isDeduct) {
        await store.addNotification({
          userId,
          title: '📉 Wallet Balance Deducted',
          message: `₹${absAmt} was deducted from your wallet balance by Admin.${note ? ` Reason: ${note}` : ''} (Current Balance: ₹${safeBal})`,
          type: 'system',
          amount: absAmt,
          orderId: actionDetails?.referenceId
        });
      } else {
        await store.addNotification({
          userId,
          title: '💵 Money Added to Wallet',
          message: `₹${absAmt} has been added to your wallet balance by Admin!${note ? ` Note: ${note}` : ''} (Current Balance: ₹${safeBal})`,
          type: 'deposit',
          amount: absAmt,
          orderId: actionDetails?.referenceId
        });
      }
    }

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

export function useWalletTransactions(userId?: string) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>(store.getTransactions(userId));

  useEffect(() => {
    setTransactions(store.getTransactions(userId));
    return store.subscribe(() => {
      setTransactions([...store.getTransactions(userId)]);
    });
  }, [userId]);

  return {
    transactions,
    allTransactions: store.getAllTransactions(),
    addTransaction: store.addTransaction
  };
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<UserNotification[]>(userId ? store.getNotifications(userId) : []);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (userId) {
      setNotifications(store.getNotifications(userId));
    } else {
      setNotifications([]);
    }
    return store.subscribe(() => {
      if (userId) {
        setNotifications([...store.getNotifications(userId)]);
      } else {
        setNotifications([]);
      }
    });
  }, [userId]);

  return {
    notifications,
    unreadCount,
    addNotification: store.addNotification,
    markAsRead: store.markNotificationAsRead,
    markAllAsRead: () => userId && store.markAllNotificationsAsRead(userId),
    clearNotifications: () => userId && store.clearNotifications(userId)
  };
}

export function useCoupons() {
  const [couponList, setCouponList] = useState<Coupon[]>(store.getCoupons());

  useEffect(() => {
    setCouponList(store.getCoupons());
    return store.subscribe(() => {
      setCouponList([...store.getCoupons()]);
    });
  }, []);

  return {
    coupons: couponList,
    addCoupon: store.addCoupon,
    updateCoupon: store.updateCoupon,
    deleteCoupon: store.deleteCoupon,
    toggleCoupon: store.toggleCoupon,
    validateCoupon: store.validateCoupon,
    incrementCouponUsage: store.incrementCouponUsage
  };
}

export function useInventory(userId?: string) {
  const [items, setItems] = useState(store.getInventory());
  const [settingsState, setSettingsState] = useState(store.getSettings());
  const [purchasesState, setPurchasesState] = useState<PurchaseRecord[]>([]);
  const [allPurchasesState, setAllPurchasesState] = useState<PurchaseRecord[]>(store.getPurchases());
  const [isInitialized, setIsInitialized] = useState(store.isInitialized());

  useEffect(() => {
    return store.subscribe(() => {
      setItems(store.getInventory());
      setSettingsState(store.getSettings());
      setIsInitialized(store.isInitialized());
      setAllPurchasesState(store.getPurchases());
      if (userId) {
         const userPurchases = store.getPurchases().filter(p => p.userId === userId);
         setPurchasesState(userPurchases);
      } else {
         setPurchasesState(store.getPurchases());
      }
    });
  }, [userId]);

  useEffect(() => {
    setAllPurchasesState(store.getPurchases());
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
    allPurchases: allPurchasesState,
    balances: store.getAllBalances(),
    updateSettings: store.updateSettings,
    addStock: store.addStock,
    addKeys: store.addKeys,
    removeKey: store.removeKey,
    addProduct: store.addProduct,
    deleteProduct: store.deleteProduct,
    purchaseKeys: store.purchaseKeys,
    isInitialized
  };
}

export function useUsers() {
  const [users, setUsers] = useState<UserWithStats[]>(store.getUsers());

  useEffect(() => {
    setUsers(store.getUsers());
    return store.subscribe(() => {
      setUsers([...store.getUsers()]);
    });
  }, []);

  return {
    users,
    updateUserBalance: store.updateUserBalance,
    registerOrUpdateUser: store.registerOrUpdateUser,
    issueRefund: store.issueRefund
  };
}
