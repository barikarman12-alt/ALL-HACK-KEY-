import { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
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
  customerName?: string;
  customerPhone?: string;
  orderId?: string;
  value: string;
  category: string;
  label: string;
  keys: string[];
  date: string;
  amount?: number;
  couponCode?: string;
}

export interface PaymentGatewaySettings {
  provider: 'famgateway' | 'custom_upi' | 'manual_qr';
  famApiKey: string;
  merchantId?: string;
  upiId?: string;
  upiName?: string;
  qrImageUrl?: string;
  isPaymentEnabled?: boolean;
  minDepositAmount?: number;
  customEndpoint?: string;
  webhookSecret?: string;
  noticeMessage?: string;
  updatedAt?: string;
}

export const defaultPaymentSettings: PaymentGatewaySettings = {
  provider: 'famgateway',
  famApiKey: 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf',
  merchantId: '',
  upiId: 'fatherxsir@upi',
  upiName: 'Arman X Store',
  qrImageUrl: '',
  isPaymentEnabled: true,
  minDepositAmount: 10,
  customEndpoint: '',
  noticeMessage: 'Instant UPI / QR Auto Delivery',
  updatedAt: new Date().toISOString()
};

export interface SpinWheelSettings {
  isEnabled: boolean;
  prob0: number; // e.g. 50 (50%)
  prob10: number; // e.g. 20 (20%)
  prob20: number; // e.g. 20 (20%)
  prob50: number; // e.g. 10 (10%)
  discountSlice1?: number; // e.g. 10 (%)
  discountSlice2?: number; // e.g. 20 (%)
  discountSlice3?: number; // e.g. 50 (%) -> Configurable Jackpot discount
  couponExpiryDays: number; // e.g. 3 days
  couponUsageLimit: number; // e.g. 1 usage
  freeSpinsPerKey: number; // e.g. 1
  updatedAt?: string;
}

export const defaultSpinWheelSettings: SpinWheelSettings = {
  isEnabled: true,
  prob0: 50,
  prob10: 20,
  prob20: 20,
  prob50: 10,
  discountSlice1: 10,
  discountSlice2: 20,
  discountSlice3: 50,
  couponExpiryDays: 3,
  couponUsageLimit: 1,
  freeSpinsPerKey: 1,
  updatedAt: new Date().toISOString()
};

export interface ProductSettings {
  siteName: string;
  siteLogoUrl: string;
  nonRootName: string;
  nonRootLogoUrl: string;
  rootName: string;
  rootLogoUrl: string;
  categories: ProductCategory[];
  payment?: PaymentGatewaySettings;
  spinWheel?: SpinWheelSettings;
  faqTelegramLink?: string;
  requireCustomerPhone?: boolean;
  announcementText?: string;
  announcementEnabled?: boolean;
  whatsappSupportNumber?: string;
  supportTelegramUsername?: string;
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
  lastKeys?: string[];
  lastOrderId?: string;
  lastProductName?: string;
  lastOrderDate?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  type: 'deposit' | 'refund' | 'adjustment' | 'deduction' | 'debit' | 'purchase';
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

export interface LiveQROrder {
  id: string;
  orderId: string;
  userId?: string;
  userEmail?: string;
  customerName?: string;
  customerPhone?: string;
  deliveredKeys?: string[];
  type: 'balance' | 'keys' | 'qr_deposit' | 'direct_purchase';
  amount: number;
  status: 'pending' | 'completed' | 'success' | 'failed' | 'expired';
  productName?: string;
  durationLabel?: string;
  durationValue?: string;
  quantity?: number;
  couponCode?: string;
  checkoutUrl?: string;
  upiIntent?: string;
  qrUrl?: string;
  paymentMethod?: string;
  createdAt: string;
  dateFormatted?: string;
  paidAt?: string;
  updatedAt?: string;
}

export type PendingOrder = LiveQROrder;

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isActive: boolean;
  updatedAt?: string;
}

export const defaultFAQs: FAQItem[] = [
  {
    id: 'faq_delivery_instant',
    question: 'Payment ke baad VIP License Key kaise aur kitni der me milti hai?',
    answer: 'Jaise hi aap UPI QR code ya Gateway ke through payment complete karte hain, system turant automated verify karta hai aur screen par confetti celebration ke sath aapki VIP License Key show ho jaati hai. Delivery 100% instant aur automatic hoti hai (kisi manual wait ki zaroorat nahi).',
    category: 'Purchases & Delivery',
    order: 1,
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq_key_history',
    question: 'Pehle khareedi hui keys kahan check kar sakte hain?',
    answer: 'Aap store ke Header me bane "My Keys" ya "Key History" button par click karke apni sabhi purchased keys, unka purchase date, duration aur Order ID dekh sakte hain. Yahan se aap key ko 1-click copy bhi kar sakte hain.',
    category: 'Purchases & Delivery',
    order: 2,
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq_payment_methods',
    question: 'Kaun-kaun se payment methods aur UPI apps supported hain?',
    answer: 'Aap kisi bhi UPI app (Google Pay, PhonePe, Paytm, BHIM, CRED, Amazon Pay) ya banking app se direct QR scan karke pay kar sakte hain. Iske alawa agar aapke account me Wallet Balance hai toh aap direct 1-click wallet balance se bhi keys purchase kar sakte hain.',
    category: 'Payment & UPI',
    order: 3,
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq_wallet_deposit',
    question: 'Wallet me balance kaise add karein?',
    answer: 'Header me diye gaye Wallet (+) icon par click karein. Jitna amount add karna chahte hain (min ₹10) wo enter karein aur UPI QR scan karke payment karein. Payment verify hote hi balance turant aapke account me jud jata hai.',
    category: 'Wallet & Balance',
    order: 4,
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq_device_compatibility',
    question: 'Kya ye keys Non-Root aur Root dono devices me work karti hain?',
    answer: 'Haan! Arman X Store par Non-Root (No-Root / Virtual space) aur Rooted (KernelSU / Magisk) dono type ke devices ke liye separate optimized keys aur loaders available hain. Aap apni zaroorat ke anusaar plan choose kar sakte hain.',
    category: 'Activation & Keys',
    order: 5,
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq_key_issues',
    question: 'Agar key activate na ho ya error aaye toh kya karein?',
    answer: 'Aap seedha hamare WhatsApp Support ya Live Support Chat par apna Order ID message kar sakte hain. Agar stock ya key me koi bhi fault hoga toh hamari team turant new replacement key provide karti hai ya wallet me refund credit kar deti hai.',
    category: 'Support & Help',
    order: 6,
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'faq_spin_wheel',
    question: 'Lucky Spin Wheel me free discount coupons kaise jeetein?',
    answer: 'Header me diye gaye "🎡 Spin to Win" par tap karein. Har user ko daily free spin milta hai jisme aap 10%, 20% ya 50% tak ke VIP coupons jeet sakte hain. Jeeta hua coupon code checkout par automatically apply ho jata hai.',
    category: 'Coupons & Rewards',
    order: 7,
    isActive: true,
    updatedAt: new Date().toISOString()
  }
];

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
  categories: [],
  payment: defaultPaymentSettings,
  spinWheel: defaultSpinWheelSettings,
  faqTelegramLink: 'https://t.me/FATHERXSIR',
  requireCustomerPhone: false
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
        sett = { 
          ...defaultSettings, 
          ...parsed.settings,
          payment: {
            ...defaultPaymentSettings,
            ...(parsed.settings.payment || {})
          },
          spinWheel: {
            ...defaultSpinWheelSettings,
            ...(parsed.settings.spinWheel || {})
          },
          faqTelegramLink: parsed.settings.faqTelegramLink || defaultSettings.faqTelegramLink,
          requireCustomerPhone: parsed.settings.requireCustomerPhone ?? defaultSettings.requireCustomerPhone
        };
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
  const map = new Map<string, PurchaseRecord>();
  try {
    const saved = localStorage.getItem('appDataPurchases');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach(p => {
          if (p && (p.id || p.orderId)) {
            map.set(p.id || p.orderId, p);
          }
        });
      }
    }
  } catch (e) {}

  // Also read latestReceivedKey
  try {
    const latestRaw = localStorage.getItem('latestReceivedKey');
    if (latestRaw) {
      const l = JSON.parse(latestRaw);
      if (l && l.keys && Array.isArray(l.keys) && l.keys.length > 0) {
        const id = l.orderId || `ord_${Date.now()}`;
        if (!map.has(id)) {
          map.set(id, {
            id,
            userId: l.userId || 'anonymous',
            userEmail: l.customerEmail || '',
            customerName: l.customerName || '',
            customerPhone: l.customerPhone || '',
            orderId: l.orderId,
            value: 'vip_key',
            category: l.productName || 'VIP Key',
            label: l.durationLabel || 'Active',
            keys: l.keys,
            amount: l.amount,
            couponCode: l.couponCode,
            date: l.date || new Date().toISOString()
          });
        }
      }
    }
  } catch (e) {}

  // Also read pendingOrders with deliveredKeys
  try {
    const pendingRaw = localStorage.getItem('appDataPendingOrders');
    if (pendingRaw) {
      const pList = JSON.parse(pendingRaw);
      if (Array.isArray(pList)) {
        pList.forEach(po => {
          if (po && po.orderId && po.deliveredKeys && po.deliveredKeys.length > 0 && !map.has(po.orderId)) {
            map.set(po.orderId, {
              id: po.orderId,
              userId: po.userId || 'anonymous',
              userEmail: po.userEmail || '',
              customerName: po.customerName || '',
              customerPhone: po.customerPhone || '',
              orderId: po.orderId,
              value: po.durationValue || 'key',
              category: po.productName || 'VIP Key',
              label: po.durationLabel || 'Active',
              keys: po.deliveredKeys,
              amount: po.amount,
              couponCode: po.couponCode,
              date: po.paidAt || po.createdAt || new Date().toISOString()
            });
          }
        });
      }
    }
  } catch (e) {}

  return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

const loadInitialPendingOrders = (): PendingOrder[] => {
  try {
    const saved = localStorage.getItem('appDataPendingOrders');
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
    let localList: Coupon[] = [];
    if (dedicated) {
      const parsed = JSON.parse(dedicated);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localList = parsed;
      }
    }
    const global = localStorage.getItem('appDataGlobal');
    if (global) {
      const parsed = JSON.parse(global);
      if (parsed && Array.isArray(parsed.coupons) && parsed.coupons.length > 0) {
        localList = mergeCoupons(localList, parsed.coupons);
      }
    }
    if (localList.length > 0) {
      return mergeCoupons(defaultCoupons, localList);
    }
  } catch (e) {}
  return defaultCoupons;
};

const mergeCoupons = (baseList: Coupon[], incomingList: Coupon[]): Coupon[] => {
  const map = new Map<string, Coupon>();
  (baseList || []).forEach(c => {
    if (c && c.code) {
      const key = c.code.trim().toUpperCase();
      map.set(key, { ...c, code: key, discountValue: Math.max(1, Number(c.discountValue) || 1) });
    }
  });
  (incomingList || []).forEach(c => {
    if (c && c.code) {
      const key = c.code.trim().toUpperCase();
      const existing = map.get(key);
      if (existing) {
        map.set(key, { 
          ...existing, 
          ...c, 
          code: key,
          discountValue: Math.max(1, Number(c.discountValue ?? existing.discountValue) || 1),
          usageCount: Math.max(existing.usageCount || 0, c.usageCount || 0),
          active: c.active !== undefined ? c.active : existing.active
        });
      } else {
        map.set(key, { ...c, code: key, discountValue: Math.max(1, Number(c.discountValue) || 1) });
      }
    }
  });
  return Array.from(map.values());
};

const loadInitialFAQs = (): FAQItem[] => {
  try {
    const dedicated = localStorage.getItem('appDataFAQs');
    if (dedicated) {
      const parsed = JSON.parse(dedicated);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return defaultFAQs;
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
let pendingOrders: PendingOrder[] = loadInitialPendingOrders();
let faqs: FAQItem[] = loadInitialFAQs();

// Permanent Registry of all Delivered / Used License Keys to guarantee 1 KEY IS NEVER DISPENSED TWICE
const loadInitialUsedKeys = (): Set<string> => {
  const set = new Set<string>();
  try {
    const saved = localStorage.getItem('appDataUsedKeys');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach(k => {
          if (typeof k === 'string' && k.trim()) set.add(k.trim().toUpperCase());
        });
      }
    }
  } catch (e) {}

  // Collect from all completed purchases
  try {
    purchases.forEach(p => {
      (p.keys || []).forEach(k => {
        if (typeof k === 'string' && k.trim()) set.add(k.trim().toUpperCase());
      });
    });
  } catch (e) {}

  // Collect from all pending orders with delivered keys
  try {
    pendingOrders.forEach(o => {
      (o.deliveredKeys || []).forEach(k => {
        if (typeof k === 'string' && k.trim()) set.add(k.trim().toUpperCase());
      });
    });
  } catch (e) {}

  return set;
};

let usedKeysSet: Set<string> = loadInitialUsedKeys();

export const isKeyUsed = (key: string): boolean => {
  if (!key || typeof key !== 'string') return false;
  return usedKeysSet.has(key.trim().toUpperCase());
};

export const getUsedKeysCount = (): number => {
  return usedKeysSet.size;
};

const listeners = new Set<() => void>();
let initialized = (settings.categories && settings.categories.length > 0);
let listenersRegistered = false;

// Sync functions
const syncUsedKeysToStorage = async () => {
  try {
    const arr = Array.from(usedKeysSet);
    localStorage.setItem('appDataUsedKeys', JSON.stringify(arr));
    try {
      await setDoc(doc(db, 'appData', 'usedKeys'), { 
        keys: arr, 
        count: arr.length,
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    } catch (e: any) {
      console.warn('Firestore usedKeys sync notice:', e?.message || e);
    }
  } catch (e: any) {
    console.warn('Local usedKeys sync notice:', e?.message || e);
  }
};
const syncFAQsToStorage = async () => {
  try {
    localStorage.setItem('appDataFAQs', JSON.stringify(faqs));
    try {
      await setDoc(doc(db, 'appData', 'faqs'), { faqs, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e: any) {
      console.warn('Firestore FAQs sync notice:', e?.message || e);
    }
  } catch (e: any) {
    console.warn('Local FAQs sync notice:', e?.message || e);
  }
};
const syncCouponsToStorage = async () => {
  try {
    localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
    try {
      await setDoc(doc(db, 'appData', 'coupons'), { coupons, updatedAt: new Date().toISOString() }, { merge: true });
      // Also sync each individual coupon doc for high-availability Firestore collection queries
      for (const c of coupons) {
        if (c && c.id) {
          setDoc(doc(db, 'coupons', c.id), c, { merge: true }).catch(() => {});
        }
      }
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
    await setDoc(doc(db, 'appData', 'purchases'), { purchases, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    
    // Also save top purchases individually to collection
    try {
      const batchList = purchases.slice(0, 30);
      for (const p of batchList) {
        if (p && p.id) {
          setDoc(doc(db, 'purchases', p.id), p, { merge: true }).catch(() => {});
        }
      }
    } catch (e) {}
  } catch (e: any) {
    console.warn('Failed to sync purchases to Firestore:', e?.message || e);
  }
};

const syncUsersToStorage = async () => {
  try {
    localStorage.setItem('appDataUsersRegistry', JSON.stringify(registeredUsers));
    
    // Safely merge with any existing remote users to prevent overwrites between devices
    try {
      const snap = await getDoc(doc(db, 'appData', 'usersRegistry')).catch(() => null);
      let mergedUsers = [...registeredUsers];
      if (snap && snap.exists()) {
        const remoteUsers: UserProfile[] = snap.data()?.users || [];
        const map = new Map<string, UserProfile>();
        remoteUsers.forEach(u => { if (u && u.uid) map.set(u.uid, u); });
        registeredUsers.forEach(u => { if (u && u.uid) map.set(u.uid, { ...map.get(u.uid), ...u }); });
        mergedUsers = Array.from(map.values());
        registeredUsers = mergedUsers;
        localStorage.setItem('appDataUsersRegistry', JSON.stringify(registeredUsers));
      }
      await setDoc(doc(db, 'appData', 'usersRegistry'), { users: mergedUsers, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    } catch {
      await setDoc(doc(db, 'appData', 'usersRegistry'), { users: registeredUsers, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    }
  } catch (e: any) {
    console.warn('Failed to sync users registry to Firestore:', e?.message || e);
  }
};

const syncTransactionsToStorage = async () => {
  try {
    localStorage.setItem('appDataWalletTransactions', JSON.stringify(walletTransactions));
    await setDoc(doc(db, 'appData', 'walletTransactions'), { transactions: walletTransactions.slice(0, 300) }, { merge: true }).catch(() => {});
  } catch (e: any) {
    console.warn('Failed to sync wallet transactions:', e?.message || e);
  }
};

const syncNotificationsToStorage = async () => {
  try {
    localStorage.setItem('appDataNotifications', JSON.stringify(userNotifications));
    await setDoc(doc(db, 'appData', 'notifications'), { notifications: userNotifications.slice(0, 200) }, { merge: true }).catch(() => {});
  } catch (e: any) {
    console.warn('Failed to sync notifications:', e?.message || e);
  }
};

const syncPendingOrdersToStorage = async () => {
  try {
    localStorage.setItem('appDataPendingOrders', JSON.stringify(pendingOrders));
    await setDoc(doc(db, 'appData', 'pendingOrders'), { orders: pendingOrders.slice(0, 100) }, { merge: true }).catch(() => {});
  } catch (e: any) {
    console.warn('Failed to sync pending orders:', e?.message || e);
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
    const [globalRes, couponsRes, couponsColRes, faqsRes, purchasesDocRes, purchasesColRes, usersDocRes, usersColRes, txRes, notifRes] = await Promise.allSettled([
      getDoc(doc(db, 'appData', 'global')),
      getDoc(doc(db, 'appData', 'coupons')),
      getDocs(collection(db, 'coupons')),
      getDoc(doc(db, 'appData', 'faqs')),
      getDoc(doc(db, 'appData', 'purchases')),
      getDocs(collection(db, 'purchases')),
      getDoc(doc(db, 'appData', 'usersRegistry')),
      getDocs(collection(db, 'users')),
      getDoc(doc(db, 'appData', 'walletTransactions')),
      getDoc(doc(db, 'appData', 'notifications'))
    ]);

    // Handle FAQs
    if (faqsRes.status === 'fulfilled' && faqsRes.value.exists()) {
      const fData = faqsRes.value.data();
      if (Array.isArray(fData.faqs) && fData.faqs.length > 0) {
        faqs = fData.faqs;
        localStorage.setItem('appDataFAQs', JSON.stringify(faqs));
      }
    }

    // Handle Coupons from doc
    if (couponsRes.status === 'fulfilled' && couponsRes.value.exists()) {
      const cData = couponsRes.value.data();
      if (Array.isArray(cData.coupons) && cData.coupons.length > 0) {
        coupons = mergeCoupons(coupons, cData.coupons);
        localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
      }
    }

    // Handle Coupons from collection
    if (couponsColRes.status === 'fulfilled' && !couponsColRes.value.empty) {
      const remoteCoupons: Coupon[] = [];
      couponsColRes.value.forEach(d => {
        const c = d.data() as Coupon;
        if (c && c.code) remoteCoupons.push({ ...c, id: c.id || d.id });
      });
      if (remoteCoupons.length > 0) {
        coupons = mergeCoupons(coupons, remoteCoupons);
        localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
      }
    }

    // Handle Global (Inventory, Settings, Balances)
    if (globalRes.status === 'fulfilled' && globalRes.value.exists()) {
      const data = globalRes.value.data();
      if (data.inventory) inventory = data.inventory.filter((item: ProductKey) => !item.category.includes('NON-ROOT') && !item.category.includes('ROOT'));
      if (data.settings) {
        settings = { ...defaultSettings, ...data.settings };
        if (settings.categories) {
          settings.categories = settings.categories.filter((c: ProductCategory) => !c.id.includes('NON-ROOT') && !c.id.includes('ROOT'));
        }
      }
      if (data.balances) {
        balances = { ...balances, ...data.balances };
      }
      if ((!coupons || coupons.length === 0) && data.coupons && Array.isArray(data.coupons) && data.coupons.length > 0) {
        coupons = data.coupons;
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

    // Handle Pending Orders
    const pendingOrdersRes = await getDoc(doc(db, 'appData', 'pendingOrders')).catch(() => null);
    if (pendingOrdersRes && pendingOrdersRes.exists()) {
      const pData = pendingOrdersRes.data();
      if (Array.isArray(pData.orders)) {
        const map = new Map<string, PendingOrder>();
        pendingOrders.forEach(o => map.set(o.orderId, o));
        pData.orders.forEach((o: PendingOrder) => {
          if (o && o.orderId) map.set(o.orderId, o);
        });
        pendingOrders = Array.from(map.values());
      }
    }
    
    store.notify();

    // Listen to real-time changes if not already registered
    if (!listenersRegistered) {
      listenersRegistered = true;

      onSnapshot(doc(db, 'appData', 'coupons'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.coupons)) {
            coupons = mergeCoupons(coupons, data.coupons);
            localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
            store.notify();
          }
        }
      }, (err) => {
        console.warn('Coupons snapshot offline/notice:', err?.message || err);
      });

      onSnapshot(collection(db, 'coupons'), (snapshot) => {
        if (!snapshot.empty) {
          const remoteList: Coupon[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as Coupon;
            if (data && data.code) {
              remoteList.push({ ...data, id: data.id || docSnap.id });
            }
          });
          if (remoteList.length > 0) {
            coupons = mergeCoupons(coupons, remoteList);
            localStorage.setItem('appDataCoupons', JSON.stringify(coupons));
            store.notify();
          }
        }
      }, (err) => {
        console.warn('Coupons collection snapshot notice:', err?.message || err);
      });

      onSnapshot(doc(db, 'appData', 'faqs'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.faqs)) {
            faqs = data.faqs;
            localStorage.setItem('appDataFAQs', JSON.stringify(faqs));
            store.notify();
          }
        }
      }, (err) => {
        console.warn('FAQs snapshot offline/notice:', err?.message || err);
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
      }, (err) => {
        console.warn('Global snapshot offline/notice:', err?.message || err);
      });

      onSnapshot(doc(db, 'appData', 'purchases'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.purchases)) {
            const map = new Map<string, PurchaseRecord>();
            purchases.forEach(p => { if (p && p.id) map.set(p.id, p); });
            data.purchases.forEach((p: PurchaseRecord) => { if (p && p.id) map.set(p.id, p); });
            purchases = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            localStorage.setItem('appDataPurchases', JSON.stringify(purchases));
            store.notify();
          }
        }
      }, (err) => {
        console.warn('Purchases snapshot offline/notice:', err?.message || err);
      });

      onSnapshot(collection(db, 'purchases'), (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, PurchaseRecord>();
          purchases.forEach(p => { if (p && p.id) map.set(p.id, p); });
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as PurchaseRecord;
            if (data && (data.id || docSnap.id)) {
              const id = data.id || docSnap.id;
              map.set(id, { ...data, id });
            }
          });
          purchases = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          localStorage.setItem('appDataPurchases', JSON.stringify(purchases));
          store.notify();
        }
      }, (err) => {
        console.warn('Purchases collection snapshot notice:', err?.message || err);
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
      }, (err) => {
        console.warn('Users registry snapshot offline/notice:', err?.message || err);
      });

      // REAL-TIME SYNC FOR USERS COLLECTION ACROSS DEVICES
      onSnapshot(collection(db, 'users'), (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, UserProfile>();
          registeredUsers.forEach(u => { if (u && u.uid) map.set(u.uid, u); });
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            if (id) {
              const existing = map.get(id);
              map.set(id, {
                uid: id,
                email: data.email || existing?.email || '',
                displayName: data.displayName || data.customId || existing?.displayName || 'User',
                customId: data.customId || existing?.customId || id.substring(0, 8),
                photoURL: data.photoURL || existing?.photoURL || '',
                role: data.role || (data.email?.includes('barikarman') ? 'owner' : (existing?.role || 'customer')),
                createdAt: data.createdAt || existing?.createdAt || new Date().toISOString(),
                lastLoginAt: data.lastLoginAt || existing?.lastLoginAt || new Date().toISOString(),
                status: data.status || existing?.status || 'active',
                phone: data.phone || existing?.phone || '',
                balance: data.balance ?? existing?.balance ?? 0
              });
              if (data.balance !== undefined && balances[id] === undefined) {
                balances[id] = data.balance;
              }
            }
          });
          registeredUsers = Array.from(map.values());
          localStorage.setItem('appDataUsersRegistry', JSON.stringify(registeredUsers));
          store.notify();
        }
      }, (err) => {
        console.warn('Users collection realtime snapshot notice:', err?.message || err);
      });

      // REAL-TIME SYNC FOR PURCHASES COLLECTION
      onSnapshot(collection(db, 'purchases'), (snapshot) => {
        if (!snapshot.empty) {
          const map = new Map<string, PurchaseRecord>();
          purchases.forEach(p => map.set(p.id, p));
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as PurchaseRecord;
            if (data && (data.id || docSnap.id)) {
              const recId = data.id || docSnap.id;
              map.set(recId, { ...data, id: recId });
            }
          });
          purchases = Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          localStorage.setItem('appDataPurchases', JSON.stringify(purchases));
          store.notify();
        }
      }, (err) => {
        console.warn('Purchases collection realtime snapshot notice:', err?.message || err);
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
      }, (err) => {
        console.warn('Wallet transactions snapshot offline/notice:', err?.message || err);
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
      }, (err) => {
        console.warn('Notifications snapshot offline/notice:', err?.message || err);
      });

      onSnapshot(doc(db, 'appData', 'pendingOrders'), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.orders)) {
            const map = new Map<string, PendingOrder>();
            pendingOrders.forEach(o => map.set(o.orderId, o));
            data.orders.forEach((o: PendingOrder) => {
              if (o && o.orderId) map.set(o.orderId, o);
            });
            pendingOrders = Array.from(map.values());
            store.notify();
          }
        }
      }, (err) => {
        console.warn('Pending orders snapshot offline/notice:', err?.message || err);
      });
    }

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
          if (typeof data.lastDailySpinTime === 'number') {
            if (data.lastDailySpinTime > memoryLastDailySpinTime) {
              memoryLastDailySpinTime = data.lastDailySpinTime;
              try {
                localStorage.setItem('daily_spin_last_timestamp', data.lastDailySpinTime.toString());
                localStorage.setItem(`spin_last_time_${user.uid}`, data.lastDailySpinTime.toString());
              } catch(e) {}
              store.notify();
            }
          }
        }
      }, () => {});
    } catch(e) {}
  }
});

let memoryLastDailySpinTime = 0;

export function getLastSpinTimestamp(userId?: string): number {
  let latest = memoryLastDailySpinTime;
  try {
    const keysToCheck = [
      'daily_spin_last_timestamp',
      'spin_last_time_global',
      'spin_last_time_guest'
    ];
    if (userId) {
      keysToCheck.push(`spin_last_time_${userId}`);
      keysToCheck.push(`daily_spin_user_${userId}`);
    }
    for (const k of keysToCheck) {
      const val = localStorage.getItem(k);
      if (val) {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > latest) {
          latest = num;
        }
      }
    }
  } catch {}
  return latest;
}

export function getDailySpinCycle() {
  const now = new Date();
  // Daily Reset at 12:01 AM (00:01:00.000)
  const todayReset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1, 0, 0);

  let currentCycleStart: Date;
  let nextReset: Date;

  if (now.getTime() >= todayReset.getTime()) {
    currentCycleStart = todayReset;
    nextReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0, 0);
  } else {
    currentCycleStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 1, 0, 0);
    nextReset = todayReset;
  }

  const msUntilNextReset = Math.max(0, nextReset.getTime() - now.getTime());
  const totalSec = Math.floor(msUntilNextReset / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const formatted = `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

  return {
    now,
    currentCycleStart,
    nextReset,
    msUntilNextReset,
    hours,
    minutes,
    seconds,
    formatted
  };
}

export const store = {
  getInventory: () => inventory,
  getSettings: () => settings,
  getPurchases: () => {
    const map = new Map<string, PurchaseRecord>();
    purchases.forEach(p => { if (p && (p.id || p.orderId)) map.set(p.id || p.orderId!, p); });

    try {
      const latestRaw = localStorage.getItem('latestReceivedKey');
      if (latestRaw) {
        const l = JSON.parse(latestRaw);
        if (l && l.keys && Array.isArray(l.keys) && l.keys.length > 0) {
          const id = l.orderId || `ord_${Date.now()}`;
          if (!map.has(id)) {
            map.set(id, {
              id,
              userId: l.userId || 'anonymous',
              userEmail: l.customerEmail || '',
              customerName: l.customerName || '',
              customerPhone: l.customerPhone || '',
              orderId: l.orderId,
              value: 'vip_key',
              category: l.productName || 'VIP Key',
              label: l.durationLabel || 'Active',
              keys: l.keys,
              amount: l.amount,
              couponCode: l.couponCode,
              date: l.date || new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {}

    try {
      const pendingRaw = localStorage.getItem('appDataPendingOrders');
      if (pendingRaw) {
        const pList = JSON.parse(pendingRaw);
        if (Array.isArray(pList)) {
          pList.forEach(po => {
            if (po && po.orderId && po.deliveredKeys && po.deliveredKeys.length > 0 && !map.has(po.orderId)) {
              map.set(po.orderId, {
                id: po.orderId,
                userId: po.userId || 'anonymous',
                userEmail: po.userEmail || '',
                customerName: po.customerName || '',
                customerPhone: po.customerPhone || '',
                orderId: po.orderId,
                value: po.durationValue || 'key',
                category: po.productName || 'VIP Key',
                label: po.durationLabel || 'Active',
                keys: po.deliveredKeys,
                amount: po.amount,
                couponCode: po.couponCode,
                date: po.paidAt || po.createdAt || new Date().toISOString()
              });
            }
          });
        }
      }
    } catch (e) {}

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  },
  isInitialized: () => initialized,

  refreshPurchases: async (): Promise<PurchaseRecord[]> => {
    try {
      const [colRes, docRes] = await Promise.allSettled([
        getDocs(collection(db, 'purchases')),
        getDoc(doc(db, 'appData', 'purchases'))
      ]);

      const map = new Map<string, PurchaseRecord>();
      purchases.forEach(p => { if (p && (p.id || p.orderId)) map.set(p.id || p.orderId!, p); });

      if (docRes.status === 'fulfilled' && docRes.value.exists()) {
        const d = docRes.value.data();
        if (Array.isArray(d?.purchases)) {
          d.purchases.forEach((p: PurchaseRecord) => {
            if (p && (p.id || p.orderId)) map.set(p.id || p.orderId!, p);
          });
        }
      }

      if (colRes.status === 'fulfilled' && !colRes.value.empty) {
        colRes.value.forEach(docSnap => {
          const p = docSnap.data() as PurchaseRecord;
          if (p && (p.id || docSnap.id)) {
            const id = p.id || docSnap.id;
            map.set(id, { ...p, id });
          }
        });
      }

      try {
        const latestRaw = localStorage.getItem('latestReceivedKey');
        if (latestRaw) {
          const l = JSON.parse(latestRaw);
          if (l && l.keys && Array.isArray(l.keys) && l.keys.length > 0) {
            const id = l.orderId || `ord_${Date.now()}`;
            map.set(id, {
              id,
              userId: l.userId || 'anonymous',
              userEmail: l.customerEmail || '',
              customerName: l.customerName || '',
              customerPhone: l.customerPhone || '',
              orderId: l.orderId,
              value: 'vip_key',
              category: l.productName || 'VIP Key',
              label: l.durationLabel || 'Active',
              keys: l.keys,
              amount: l.amount,
              couponCode: l.couponCode,
              date: l.date || new Date().toISOString()
            });
          }
        }
      } catch (e) {}

      purchases = Array.from(map.values()).sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        return timeB - timeA;
      });

      localStorage.setItem('appDataPurchases', JSON.stringify(purchases));
      store.notify();
      return purchases;
    } catch (e) {
      return purchases;
    }
  },

  getPaymentSettings: (): PaymentGatewaySettings => {
    return settings.payment || defaultPaymentSettings;
  },

  updatePaymentSettings: (newPayment: Partial<PaymentGatewaySettings>) => {
    const currentPayment = settings.payment || defaultPaymentSettings;
    const updatedPayment: PaymentGatewaySettings = {
      ...currentPayment,
      ...newPayment,
      updatedAt: new Date().toISOString()
    };
    settings = {
      ...settings,
      payment: updatedPayment
    };
    syncToStorage();
    store.notify();
  },

  getSpinWheelSettings: (): SpinWheelSettings => {
    return settings.spinWheel || defaultSpinWheelSettings;
  },

  updateSpinWheelSettings: (newSpin: Partial<SpinWheelSettings>) => {
    const currentSpin = settings.spinWheel || defaultSpinWheelSettings;
    const updatedSpin: SpinWheelSettings = {
      ...currentSpin,
      ...newSpin,
      updatedAt: new Date().toISOString()
    };
    settings = {
      ...settings,
      spinWheel: updatedSpin
    };
    syncToStorage();
    store.notify();
  },

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

  addKeys: (value: string, newKeys: string[]): { addedCount: number; duplicateCount: number; usedCount: number } => {
    // 1. Clean, trim, and unique the incoming key list
    const incomingCleaned = Array.from(
      new Set(
        newKeys
          .map(k => (typeof k === 'string' ? k.trim() : ''))
          .filter(k => k.length > 0)
      )
    );

    let duplicateCount = 0;
    let usedCount = 0;
    let addedCount = 0;

    // 2. Filter against already delivered / used keys across the entire store history
    const validBrandNewKeys: string[] = [];
    incomingCleaned.forEach(k => {
      const upper = k.toUpperCase();
      if (usedKeysSet.has(upper)) {
        usedCount++;
      } else {
        validBrandNewKeys.push(k);
      }
    });

    inventory = inventory.map(item => {
      if (item.value === value) {
        const existingUpper = new Set(item.keys.map(k => k.toUpperCase()));
        const uniqueToAdd: string[] = [];
        
        validBrandNewKeys.forEach(k => {
          if (existingUpper.has(k.toUpperCase())) {
            duplicateCount++;
          } else {
            uniqueToAdd.push(k);
            existingUpper.add(k.toUpperCase());
          }
        });

        addedCount = uniqueToAdd.length;
        const updatedKeys = [...item.keys, ...uniqueToAdd];
        return { ...item, stock: updatedKeys.length, keys: updatedKeys };
      }
      return item;
    });

    syncToStorage();
    store.notify();
    return { addedCount, duplicateCount, usedCount };
  },

  removeKey: (value: string, keyToRemove: string) => {
    inventory = inventory.map(item => {
      if (item.value === value) {
        const updatedKeys = item.keys.filter(k => k !== keyToRemove && k.trim().toUpperCase() !== keyToRemove.trim().toUpperCase());
        return { ...item, keys: updatedKeys, stock: updatedKeys.length };
      }
      return item;
    });
    syncToStorage();
    store.notify();
  },

  purchaseKeys: async (
    value: string, 
    count: number, 
    userId?: string, 
    userEmail?: string, 
    meta?: { 
      amount?: number; 
      couponCode?: string; 
      customerName?: string; 
      customerPhone?: string; 
      orderId?: string; 
    }
  ): Promise<string[]> => {
    // 1. Idempotency check: If orderId was already completed/fulfilled, return its already delivered keys
    if (meta?.orderId) {
      const existingPurchase = purchases.find(p => p.id === meta.orderId || p.orderId === meta.orderId);
      if (existingPurchase && existingPurchase.keys && existingPurchase.keys.length > 0) {
        return existingPurchase.keys;
      }
      const existingPending = pendingOrders.find(o => o.orderId === meta.orderId);
      if (existingPending && existingPending.deliveredKeys && existingPending.deliveredKeys.length > 0) {
        return existingPending.deliveredKeys;
      }
    }

    let purchased: string[] = [];
    let record: PurchaseRecord | null = null;

    const targetVal = (value || '').trim().toLowerCase();
    const cleanTargetVal = targetVal.replace(/[^a-zA-Z0-9]/g, '');

    inventory = inventory.map(item => {
      const itemVal = (item.value || '').trim().toLowerCase();
      const cleanItemVal = itemVal.replace(/[^a-zA-Z0-9]/g, '');
      const isMatch = item.value === value || itemVal === targetVal || (cleanItemVal.length > 0 && cleanItemVal === cleanTargetVal);

      if (isMatch) {
        // Filter out any key that has ever been used/delivered
        const availableUnusedKeys = (item.keys || []).filter(
          k => typeof k === 'string' && k.trim().length > 0 && !usedKeysSet.has(k.trim().toUpperCase())
        );
        
        // Take required count from strictly unused keys
        purchased = availableUnusedKeys.slice(0, count);

        // Mark all chosen keys permanently in usedKeysSet
        purchased.forEach(k => {
          usedKeysSet.add(k.trim().toUpperCase());
        });

        // Remaining keys left in this product
        const remainingKeys = (item.keys || []).filter(
          k => !purchased.includes(k) && !usedKeysSet.has(k.trim().toUpperCase())
        );

        const productDisplayName = resolveProductName(item.category, settings.categories, inventory);
        record = {
          id: meta?.orderId || ('ord_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)),
          userId: userId || 'anonymous',
          userEmail: userEmail || '',
          customerName: meta?.customerName || '',
          customerPhone: meta?.customerPhone || '',
          orderId: meta?.orderId,
          value: item.value,
          category: productDisplayName,
          label: item.label,
          keys: purchased,
          amount: meta?.amount,
          couponCode: meta?.couponCode,
          date: new Date().toISOString()
        };

        return { ...item, stock: remainingKeys.length, keys: remainingKeys };
      }
      return item;
    });

    syncToStorage();
    syncUsedKeysToStorage();

    if (record) {
      purchases = [record, ...purchases];
      syncPurchasesToStorage();

      // Register or update user with contact info
      if (userId || userEmail || meta?.customerPhone || meta?.customerName) {
        const cleanPhone = (meta?.customerPhone || '').replace(/[^0-9]/g, '');
        const effectiveUid = userId && userId !== 'anonymous' 
          ? userId 
          : (cleanPhone ? `phone_${cleanPhone}` : (userEmail || (record as PurchaseRecord).id));
        store.registerOrUpdateUser({
          uid: effectiveUid,
          email: userEmail || (cleanPhone ? `${cleanPhone}@customer.phone` : ''),
          displayName: meta?.customerName || userEmail?.split('@')[0] || (cleanPhone ? `Customer (${cleanPhone})` : 'Customer'),
          phone: meta?.customerPhone || '',
          role: 'customer'
        }).catch(() => {});
      }

      if (userId && userId !== 'anonymous') {
        try {
          const userKey = `user_orders_${userId}`;
          const existing = JSON.parse(localStorage.getItem(userKey) || '[]');
          if (!existing.includes((record as PurchaseRecord).id)) {
            existing.unshift((record as PurchaseRecord).id);
            localStorage.setItem(userKey, JSON.stringify(existing.slice(0, 100)));
          }
        } catch (e) {}
      }
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
        setDoc(doc(db, 'purchases', (record as PurchaseRecord).id), record).catch(() => {});
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
  getActiveCoupons: () => coupons.filter(c => c.active !== false),

  addCoupon: (newCouponData: Omit<Coupon, 'id' | 'createdAt'>) => {
    const code = newCouponData.code.trim().toUpperCase().replace(/^#/, '');
    const discVal = Math.max(1, Number(newCouponData.discountValue) || 1);
    const newCoupon: Coupon = {
      ...newCouponData,
      id: 'coupon_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      code,
      discountType: newCouponData.discountType || 'percentage',
      discountValue: discVal,
      active: newCouponData.active !== false,
      usageCount: 0,
      minSpend: Math.max(0, Number(newCouponData.minSpend) || 0),
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
        if (updates.code) updated.code = updates.code.trim().toUpperCase().replace(/^#/, '');
        if (typeof updates.discountValue !== 'undefined') updated.discountValue = Math.max(1, Number(updates.discountValue) || 1);
        if (typeof updates.minSpend !== 'undefined') updated.minSpend = Math.max(0, Number(updates.minSpend) || 0);
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
    try {
      deleteDoc(doc(db, 'coupons', id)).catch(() => {});
    } catch (e) {}
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
  },

  quickAdjustCouponDiscount: (id: string, deltaPercent: number) => {
    coupons = coupons.map(c => {
      if (c.id === id) {
        const currentVal = Number(c.discountValue) || 10;
        const newVal = Math.max(1, Math.min(90, currentVal + deltaPercent));
        return {
          ...c,
          discountValue: newVal,
          description: c.discountType === 'percentage' 
            ? `${newVal}% Off on all products` 
            : c.description
        };
      }
      return c;
    });
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
  },

  setCouponDiscountPercent: (id: string, newPercent: number) => {
    coupons = coupons.map(c => {
      if (c.id === id) {
        const val = Math.max(1, Math.min(90, newPercent));
        return {
          ...c,
          discountType: 'percentage',
          discountValue: val,
          description: `${val}% Off on all products`
        };
      }
      return c;
    });
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
  },

  toggleCoupon: (id: string) => {
    coupons = coupons.map(c => c.id === id ? { ...c, active: c.active === false ? true : false } : c);
    syncCouponsToStorage();
    syncToStorage();
    store.notify();
  },

  saveAllCoupons: async (updatedList?: Coupon[]) => {
    if (Array.isArray(updatedList) && updatedList.length > 0) {
      coupons = updatedList;
    }
    await syncCouponsToStorage();
    await syncToStorage();
    store.notify();
    return coupons;
  },

  incrementCouponUsage: (rawCode: string) => {
    const code = (rawCode || '').trim().toUpperCase().replace(/^#/, '');
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
    const code = (rawCode || '').trim().toUpperCase().replace(/^#/, '');
    if (!code) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: 'Please enter a coupon code.' };
    }
    let found = coupons.find(c => c.code && c.code.trim().toUpperCase() === code);
    if (!found) {
      // Fallback check from localStorage in case memory state was reloaded
      try {
        const dedicated = localStorage.getItem('appDataCoupons');
        if (dedicated) {
          const parsed: Coupon[] = JSON.parse(dedicated);
          const fallback = parsed.find(c => c.code && c.code.trim().toUpperCase() === code);
          if (fallback) {
            found = fallback;
            coupons = mergeCoupons(coupons, [fallback]);
            store.notify();
          }
        }
      } catch (e) {}
    }
    if (!found) {
      // Also check global backup storage
      try {
        const glob = localStorage.getItem('appDataGlobal');
        if (glob) {
          const parsedGlob = JSON.parse(glob);
          if (parsedGlob && Array.isArray(parsedGlob.coupons)) {
            const fallback = parsedGlob.coupons.find((c: Coupon) => c.code && c.code.trim().toUpperCase() === code);
            if (fallback) {
              found = fallback;
              coupons = mergeCoupons(coupons, [fallback]);
              store.notify();
            }
          }
        }
      } catch (e) {}
    }

    if (!found) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon code "${code}" is invalid or does not exist.` };
    }
    if (found.active === false) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon code "${found.code}" is currently disabled by admin.` };
    }
    if (found.expiresAt && found.expiresAt !== 'null' && found.expiresAt !== 'undefined') {
      const expiryTime = new Date(found.expiresAt).getTime();
      if (!isNaN(expiryTime) && Date.now() > expiryTime) {
        return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon code "${found.code}" has expired.` };
      }
    }
    if (found.maxUses && Number(found.maxUses) > 0 && (found.usageCount || 0) >= Number(found.maxUses)) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon code "${found.code}" has reached its maximum usage limit (${found.maxUses} times).` };
    }
    if (found.applicableScope === 'specific' && found.applicableProducts && found.applicableProducts.length > 0) {
      if (productValue && !found.applicableProducts.includes(productValue)) {
        return { valid: false, discount: 0, finalPrice: currentTotal, message: `Coupon "${found.code}" is valid only for specific selected products.` };
      }
    }
    const minSpend = Number(found.minSpend) || 0;
    if (minSpend > 0 && currentTotal < minSpend) {
      return { valid: false, discount: 0, finalPrice: currentTotal, message: `Minimum cart amount of ₹${minSpend} required to use "${found.code}".` };
    }

    const discountVal = Math.max(1, Number(found.discountValue) || 1);
    let discount = 0;
    if (found.discountType === 'percentage') {
      discount = Math.round((currentTotal * Math.min(99, discountVal)) / 100);
    } else {
      discount = Math.round(discountVal);
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

  deductBalance: (
    userId: string, 
    amount: number, 
    txDetails?: { 
      method?: string; 
      referenceId?: string; 
      note?: string; 
      productName?: string; 
      userEmail?: string;
    }
  ): boolean => {
    if (!userId || amount <= 0) return false;
    const current = store.getBalance(userId);
    if (current >= amount) {
      const newBal = current - amount;
      balances[userId] = newBal;
      try {
        localStorage.setItem('user_balance_' + userId, newBal.toString());
        if (auth.currentUser?.uid === userId || auth.currentUser?.email?.includes('barikarman')) {
          setDoc(doc(db, 'users', userId), { balance: newBal, lastUpdated: new Date().toISOString() }, { merge: true }).catch(() => {});
        }
      } catch(e) {}
      syncToStorage();

      const tx: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        userEmail: txDetails?.userEmail || registeredUsers.find(u => u.uid === userId)?.email || '',
        type: 'debit',
        amount,
        method: txDetails?.method || 'Wallet Balance',
        referenceId: txDetails?.referenceId || `debit_${Date.now()}`,
        note: txDetails?.note || (txDetails?.productName ? `Purchased: ${txDetails.productName}` : 'Wallet balance deduction'),
        date: new Date().toISOString(),
        status: 'completed',
        balanceAfter: newBal
      };
      walletTransactions.unshift(tx);
      syncTransactionsToStorage();

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
    const emailToUid = new Map<string, string>();
    const phoneToUid = new Map<string, string>();
    const customIdToUid = new Map<string, string>();

    // Helper to register index mappings
    const registerIndex = (uid: string, email?: string, phone?: string, customId?: string) => {
      if (email && email.trim()) {
        const clean = email.trim().toLowerCase();
        emailToUid.set(clean, uid);
      }
      if (phone && phone.trim()) {
        const cp = phone.replace(/[^0-9]/g, '');
        if (cp) phoneToUid.set(cp, uid);
      }
      if (customId && customId.trim()) {
        customIdToUid.set(customId.trim().toLowerCase(), uid);
      }
    };

    // 1. Registered users from database / storage (Real authenticated & Google users)
    registeredUsers.forEach(u => {
      if (u && u.uid) {
        const email = u.email || '';
        const displayName = u.displayName || (email ? email.split('@')[0] : u.customId) || 'Customer';
        const customId = u.customId || (email ? email.split('@')[0] : u.uid.substring(0, 8));

        userMap.set(u.uid, {
          ...u,
          email,
          displayName,
          customId,
          balance: balances[u.uid] ?? (u.balance || 0),
          totalOrders: 0,
          totalSpent: 0,
          totalKeys: 0,
          phone: u.phone || '',
          lastKeys: []
        });

        registerIndex(u.uid, email, u.phone, customId);
      }
    });

    // 2. Discover from balances (if not yet in userMap)
    Object.keys(balances || {}).forEach(uid => {
      if (uid && uid !== 'anonymous' && !userMap.has(uid)) {
        const isEmailUid = uid.includes('@');
        const email = isEmailUid ? uid : '';
        const customId = isEmailUid ? uid.split('@')[0] : uid.substring(0, 8);
        const displayName = customId;

        userMap.set(uid, {
          uid,
          email,
          displayName,
          customId,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          role: (email.includes('barikarman') || uid.includes('barikarman')) ? 'owner' : 'customer',
          status: 'active',
          balance: balances[uid] || 0,
          totalOrders: 0,
          totalSpent: 0,
          totalKeys: 0,
          lastKeys: []
        });

        registerIndex(uid, email, undefined, customId);
      }
    });

    // Helper to find existing user for an order/purchase/transaction
    const findUserIdForRecord = (userId?: string, userEmail?: string, customerPhone?: string): string | undefined => {
      if (userId && userId !== 'anonymous' && userMap.has(userId)) return userId;
      const cleanEmail = (userEmail || '').trim().toLowerCase();
      if (cleanEmail && emailToUid.has(cleanEmail)) return emailToUid.get(cleanEmail);
      const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
      if (cleanPhone && phoneToUid.has(cleanPhone)) return phoneToUid.get(cleanPhone);
      if (userId && customIdToUid.has(userId.trim().toLowerCase())) return customIdToUid.get(userId.trim().toLowerCase());
      return undefined;
    };

    // 3. Discover new customer accounts from purchases (guest checkouts & direct orders)
    purchases.forEach(p => {
      const cleanPhone = (p.customerPhone || '').replace(/[^0-9]/g, '');
      const cleanEmail = (p.userEmail || '').trim().toLowerCase();
      let matchedUid = findUserIdForRecord(p.userId, p.userEmail, p.customerPhone);

      if (!matchedUid) {
        matchedUid = (p.userId && p.userId !== 'anonymous') 
          ? p.userId 
          : (cleanEmail ? `email_${cleanEmail}` : (cleanPhone ? `phone_${cleanPhone}` : `cust_${p.id}`));
      }

      const existing = userMap.get(matchedUid);
      const email = p.userEmail || existing?.email || '';
      const customId = existing?.customId || (email ? email.split('@')[0] : cleanPhone) || (p.customerName ? p.customerName.replace(/\s+/g, '_').toLowerCase() : matchedUid.substring(0, 8));
      const displayName = p.customerName || existing?.displayName || (email ? email.split('@')[0] : (cleanPhone ? `Customer (${cleanPhone})` : 'Store Customer'));
      const phone = p.customerPhone || existing?.phone || '';
      const currentBalance = balances[matchedUid] ?? (existing?.balance || 0);

      if (!existing) {
        userMap.set(matchedUid, {
          uid: matchedUid,
          email,
          displayName,
          customId,
          phone,
          createdAt: p.date,
          lastLoginAt: p.date,
          role: (email.includes('barikarman') ? 'owner' : 'customer'),
          status: 'active',
          balance: currentBalance,
          totalOrders: 0,
          totalSpent: 0,
          totalKeys: 0,
          lastKeys: p.keys || [],
          lastOrderId: p.orderId || p.id,
          lastProductName: `${p.category || 'Product'} (${p.label || 'Plan'})`,
          lastOrderDate: p.date
        });
        registerIndex(matchedUid, email, phone, customId);
      } else {
        if (!existing.email && email) {
          existing.email = email;
          registerIndex(matchedUid, email);
        }
        if (!existing.phone && phone) existing.phone = phone;
        if ((!existing.displayName || existing.displayName === 'Customer' || existing.displayName === 'Store User' || existing.displayName === 'Store Customer') && p.customerName) {
          existing.displayName = p.customerName;
        }
      }
    });

    // 4. Calculate total orders, spent, and keys from all purchases
    purchases.forEach(p => {
      const matchedUid = findUserIdForRecord(p.userId, p.userEmail, p.customerPhone);
      if (matchedUid && userMap.has(matchedUid)) {
        const u = userMap.get(matchedUid)!;
        u.totalOrders += 1;
        const keysCount = (p.keys && p.keys.length > 0) ? p.keys.length : 1;
        u.totalKeys += (p.keys ? p.keys.length : 0);
        let orderAmount = p.amount;
        if (typeof orderAmount !== 'number') {
          const itm = inventory.find(i => i.value === p.value);
          orderAmount = (itm ? itm.price : 0) * keysCount;
        }
        u.totalSpent += (orderAmount || 0);

        if (p.date && (!u.lastLoginAt || new Date(p.date).getTime() > new Date(u.lastLoginAt).getTime())) {
          u.lastLoginAt = p.date;
        }
        if (!u.lastKeys || u.lastKeys.length === 0 || (p.keys && p.keys.length > 0)) {
          u.lastKeys = p.keys || [];
          u.lastOrderId = p.orderId || p.id;
          u.lastProductName = `${p.category || 'Product'} (${p.label || 'Plan'})`;
          u.lastOrderDate = p.date;
        }
        if (p.userEmail && !u.email) {
          u.email = p.userEmail;
        }
      }
    });

    // 5. Calculate from completed pending orders if not already in purchases
    pendingOrders.forEach(po => {
      if (po.status === 'completed' || po.status === 'success') {
        const alreadyInPurchases = purchases.some(p => p.id === po.orderId || p.orderId === po.orderId);
        if (!alreadyInPurchases) {
          const matchedUid = findUserIdForRecord(po.userId, po.userEmail, po.customerPhone);
          if (matchedUid && userMap.has(matchedUid)) {
            const u = userMap.get(matchedUid)!;
            u.totalOrders += 1;
            if (po.deliveredKeys && po.deliveredKeys.length > 0) {
              u.totalKeys += po.deliveredKeys.length;
              if (!u.lastKeys || u.lastKeys.length === 0) {
                u.lastKeys = po.deliveredKeys;
                u.lastOrderId = po.orderId;
                u.lastProductName = `${po.productName || 'Product'} (${po.durationLabel || 'Plan'})`;
                u.lastOrderDate = po.paidAt || po.createdAt;
              }
            }
            u.totalSpent += (po.amount || 0);
          }
        }
      }
    });

    // 6. Inspect wallet transactions for debit/purchase logs
    walletTransactions.forEach(t => {
      const matchedUid = findUserIdForRecord(t.userId, t.userEmail);
      if (matchedUid && userMap.has(matchedUid)) {
        const u = userMap.get(matchedUid)!;
        if (t.type === 'debit' || t.type === 'purchase') {
          if (!u.lastProductName && t.note) {
            u.lastProductName = t.note.replace(/^Purchased:\s*/i, '').replace(/^Wallet purchase:\s*/i, '');
          }
          if (u.totalSpent === 0 && t.amount > 0) {
            u.totalSpent = t.amount;
          }
          if (u.totalOrders === 0) {
            u.totalOrders = 1;
          }
        }
        if (t.userEmail && !u.email) {
          u.email = t.userEmail;
        }
      }
    });

    return Array.from(userMap.values()).map(u => ({
      ...u,
      balance: balances[u.uid] ?? (u.balance || 0)
    }));
  },

  refreshUsers: async (): Promise<UserWithStats[]> => {
    try {
      const [colRes, docRes] = await Promise.allSettled([
        getDocs(collection(db, 'users')),
        getDoc(doc(db, 'appData', 'usersRegistry'))
      ]);

      const map = new Map<string, UserProfile>();
      registeredUsers.forEach(u => { if (u && u.uid) map.set(u.uid, u); });

      if (docRes.status === 'fulfilled' && docRes.value.exists()) {
        const d = docRes.value.data();
        if (Array.isArray(d?.users)) {
          d.users.forEach((u: UserProfile) => {
            if (u && u.uid) map.set(u.uid, { ...map.get(u.uid), ...u });
          });
        }
      }

      if (colRes.status === 'fulfilled' && !colRes.value.empty) {
        colRes.value.forEach(docSnap => {
          const u = docSnap.data();
          map.set(docSnap.id, {
            uid: docSnap.id,
            email: u.email || '',
            displayName: u.displayName || u.customId || 'User',
            customId: u.customId || docSnap.id.substring(0, 8),
            photoURL: u.photoURL || '',
            role: u.role || (u.email?.includes('barikarman') ? 'owner' : 'customer'),
            createdAt: u.createdAt || '',
            lastLoginAt: u.lastLoginAt || '',
            status: u.status || 'active',
            phone: u.phone || '',
            balance: u.balance ?? 0,
            ...map.get(docSnap.id)
          });
        });
      }

      registeredUsers = Array.from(map.values());
      localStorage.setItem('appDataUsersRegistry', JSON.stringify(registeredUsers));
      store.notify();
      return store.getUsers();
    } catch (e) {
      console.warn('Manual refresh users notice:', e);
      return store.getUsers();
    }
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

  savePendingOrder: async (order: PendingOrder) => {
    pendingOrders = [order, ...pendingOrders.filter(o => o.orderId !== order.orderId)];
    syncPendingOrdersToStorage();
    try {
      await setDoc(doc(db, 'pendingOrders', order.orderId), order, { merge: true }).catch(() => {});
    } catch (e) {}
    store.notify();
    return order;
  },

  updatePendingOrderStatus: async (
    orderId: string, 
    status: 'pending' | 'completed' | 'success' | 'failed', 
    paidAt?: string,
    extra?: { deliveredKeys?: string[]; customerName?: string; customerPhone?: string; }
  ) => {
    const now = new Date().toISOString();
    pendingOrders = pendingOrders.map(o => {
      if (o.orderId === orderId) {
        return {
          ...o,
          status,
          updatedAt: now,
          paidAt: paidAt || (status === 'completed' || status === 'success' ? now : o.paidAt),
          ...(extra?.deliveredKeys ? { deliveredKeys: extra.deliveredKeys } : {}),
          ...(extra?.customerName ? { customerName: extra.customerName } : {}),
          ...(extra?.customerPhone ? { customerPhone: extra.customerPhone } : {})
        };
      }
      return o;
    });
    syncPendingOrdersToStorage();
    try {
      await setDoc(doc(db, 'pendingOrders', orderId), { 
        status, 
        updatedAt: now, 
        ...(paidAt || status === 'completed' || status === 'success' ? { paidAt: paidAt || now } : {}),
        ...(extra?.deliveredKeys ? { deliveredKeys: extra.deliveredKeys } : {}),
        ...(extra?.customerName ? { customerName: extra.customerName } : {}),
        ...(extra?.customerPhone ? { customerPhone: extra.customerPhone } : {})
      }, { merge: true }).catch(() => {});
    } catch (e) {}
    store.notify();
  },

  completePendingOrder: async (orderId: string) => {
    return store.updatePendingOrderStatus(orderId, 'completed', new Date().toISOString());
  },

  getPendingOrders: (userId?: string): PendingOrder[] => {
    if (!userId) return pendingOrders.filter(o => o.status === 'pending');
    return pendingOrders.filter(o => (o.userId === userId || o.userId === 'anonymous') && o.status === 'pending');
  },

  getAllPendingOrders: (): PendingOrder[] => {
    return [...pendingOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  hasUsedDailySpin: (userId?: string): boolean => {
    try {
      const cycle = getDailySpinCycle();
      const lastSpinTime = getLastSpinTimestamp(userId);
      return Boolean(lastSpinTime && lastSpinTime >= cycle.currentCycleStart.getTime());
    } catch {
      return false;
    }
  },

  getSpinBalance: (userId?: string): number => {
    try {
      const hasUsed = store.hasUsedDailySpin(userId);
      if (hasUsed) {
        return 0;
      }
      return 1;
    } catch {
      return 0;
    }
  },

  addSpins: (userId: string | undefined, count: number): number => {
    return store.getSpinBalance(userId);
  },

  deductSpin: (userId?: string): boolean => {
    const cycle = getDailySpinCycle();
    const hasUsed = store.hasUsedDailySpin(userId);
    if (hasUsed) {
      return false;
    }

    const nowTime = Date.now();
    memoryLastDailySpinTime = nowTime;

    try {
      localStorage.setItem('daily_spin_last_timestamp', nowTime.toString());
      localStorage.setItem('spin_last_time_global', nowTime.toString());
      localStorage.setItem('spin_last_time_guest', nowTime.toString());
      if (userId && userId !== 'guest' && userId !== 'anonymous') {
        localStorage.setItem(`spin_last_time_${userId}`, nowTime.toString());
        localStorage.setItem(`daily_spin_user_${userId}`, nowTime.toString());
        setDoc(doc(db, 'users', userId), {
          lastDailySpinTime: nowTime,
          lastDailySpinCycle: cycle.currentCycleStart.toISOString()
        }, { merge: true }).catch(() => {});
      }
    } catch {}

    store.notify();
    return true;
  },

  getFAQs: () => faqs,

  addFAQ: (faq: Omit<FAQItem, 'id' | 'updatedAt'>) => {
    const newFaq: FAQItem = {
      ...faq,
      id: `faq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      updatedAt: new Date().toISOString()
    };
    faqs = [...faqs, newFaq];
    syncFAQsToStorage();
    store.notify();
    return newFaq;
  },

  updateFAQ: (id: string, updates: Partial<FAQItem>) => {
    faqs = faqs.map(f => f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f);
    syncFAQsToStorage();
    store.notify();
  },

  deleteFAQ: (id: string) => {
    faqs = faqs.filter(f => f.id !== id);
    syncFAQsToStorage();
    store.notify();
  },

  toggleFAQ: (id: string) => {
    faqs = faqs.map(f => f.id === id ? { ...f, isActive: !f.isActive, updatedAt: new Date().toISOString() } : f);
    syncFAQsToStorage();
    store.notify();
  },

  resetDefaultFAQs: () => {
    faqs = [...defaultFAQs];
    syncFAQsToStorage();
    store.notify();
  },

  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
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
    saveAllCoupons: store.saveAllCoupons,
    validateCoupon: store.validateCoupon,
    incrementCouponUsage: store.incrementCouponUsage,
    quickAdjustCouponDiscount: store.quickAdjustCouponDiscount,
    setCouponDiscountPercent: store.setCouponDiscountPercent
  };
}

export function useFAQs() {
  const [faqList, setFaqList] = useState<FAQItem[]>(store.getFAQs());
  const [settingsState, setSettingsState] = useState<ProductSettings>(store.getSettings());

  useEffect(() => {
    setFaqList(store.getFAQs());
    setSettingsState(store.getSettings());
    return store.subscribe(() => {
      setFaqList([...store.getFAQs()]);
      setSettingsState({ ...store.getSettings() });
    });
  }, []);

  return {
    faqs: faqList,
    activeFaqs: faqList.filter(f => f.isActive).sort((a, b) => (a.order || 0) - (b.order || 0)),
    faqTelegramLink: settingsState.faqTelegramLink || 'https://t.me/FATHERXSIR',
    addFAQ: store.addFAQ,
    updateFAQ: store.updateFAQ,
    deleteFAQ: store.deleteFAQ,
    toggleFAQ: store.toggleFAQ,
    resetDefaultFAQs: store.resetDefaultFAQs,
    updateFaqTelegramLink: (link: string) => {
      store.updateSettings({ faqTelegramLink: link });
    }
  };
}

export function useInventory(userId?: string, userEmail?: string) {
  const [items, setItems] = useState(store.getInventory());
  const [settingsState, setSettingsState] = useState(store.getSettings());
  const [purchasesState, setPurchasesState] = useState<PurchaseRecord[]>([]);
  const [allPurchasesState, setAllPurchasesState] = useState<PurchaseRecord[]>(store.getPurchases());
  const [isInitialized, setIsInitialized] = useState(store.isInitialized());

  const getFilteredUserPurchases = (): PurchaseRecord[] => {
    const all = store.getPurchases();
    
    // 1. If no userId and userEmail provided (Dashboard / Global store view), return ALL purchases!
    if (!userId && !userEmail) {
      return all;
    }

    const cleanEmail = (userEmail || localStorage.getItem('customer_email') || '').trim().toLowerCase();
    const cleanUid = (userId || '').trim();
    const cleanPhone = (localStorage.getItem('customer_phone') || '').replace(/[^0-9]/g, '');

    let localOrderIds: string[] = [];
    if (cleanUid) {
      try {
        const uOrders = JSON.parse(localStorage.getItem(`user_orders_${cleanUid}`) || '[]');
        if (Array.isArray(uOrders)) localOrderIds.push(...uOrders);
      } catch (e) {}
    }
    try {
      const devOrders = JSON.parse(localStorage.getItem('device_all_order_ids') || '[]');
      if (Array.isArray(devOrders)) localOrderIds.push(...devOrders);
    } catch (e) {}

    const filtered = all.filter(p => {
      if (cleanUid && p.userId && p.userId === cleanUid) return true;
      if (cleanEmail && p.userEmail && p.userEmail.trim().toLowerCase() === cleanEmail) return true;
      if (cleanPhone && p.customerPhone && p.customerPhone.replace(/[^0-9]/g, '') === cleanPhone) return true;
      if (p.id && localOrderIds.includes(p.id)) return true;
      if (p.orderId && localOrderIds.includes(p.orderId)) return true;
      return false;
    });

    // Check if there is a latest received key in local storage not yet in the list
    try {
      const latestRaw = localStorage.getItem('latestReceivedKey');
      if (latestRaw) {
        const latest = JSON.parse(latestRaw);
        if (latest?.keys && Array.isArray(latest.keys) && latest.keys.length > 0) {
          const alreadyInList = filtered.some(f => f.id === latest.orderId || f.orderId === latest.orderId);
          if (!alreadyInList) {
            filtered.unshift({
              id: latest.orderId || `ord_${Date.now()}`,
              userId: cleanUid || 'me',
              userEmail: latest.customerEmail || cleanEmail || '',
              customerName: latest.customerName || '',
              customerPhone: latest.customerPhone || cleanPhone || '',
              orderId: latest.orderId,
              value: 'custom_key',
              category: latest.productName || 'VIP Key',
              label: latest.durationLabel || 'Active',
              keys: latest.keys,
              amount: latest.amount,
              couponCode: latest.couponCode,
              date: latest.date || new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {}

    return filtered;
  };

  useEffect(() => {
    return store.subscribe(() => {
      setItems(store.getInventory());
      setSettingsState(store.getSettings());
      setIsInitialized(store.isInitialized());
      setAllPurchasesState(store.getPurchases());
      setPurchasesState(getFilteredUserPurchases());
    });
  }, [userId, userEmail]);

  useEffect(() => {
    setAllPurchasesState(store.getPurchases());
    setPurchasesState(getFilteredUserPurchases());
  }, [userId, userEmail]);

  return {
    items,
    settings: settingsState,
    purchases: purchasesState,
    allPurchases: allPurchasesState,
    balances: store.getAllBalances(),
    updateSettings: store.updateSettings,
    updatePaymentSettings: store.updatePaymentSettings,
    updateSpinWheelSettings: store.updateSpinWheelSettings,
    addStock: store.addStock,
    addKeys: store.addKeys,
    removeKey: store.removeKey,
    addProduct: store.addProduct,
    deleteProduct: store.deleteProduct,
    purchaseKeys: store.purchaseKeys,
    refreshPurchases: store.refreshPurchases,
    isInitialized
  };
}

export function usePendingOrders(userId?: string) {
  const [pendingList, setPendingList] = useState<PendingOrder[]>(store.getPendingOrders(userId));
  const [allList, setAllList] = useState<PendingOrder[]>(store.getAllPendingOrders());

  useEffect(() => {
    setPendingList(store.getPendingOrders(userId));
    setAllList(store.getAllPendingOrders());
    return store.subscribe(() => {
      setPendingList(store.getPendingOrders(userId));
      setAllList(store.getAllPendingOrders());
    });
  }, [userId]);

  return {
    pendingOrders: pendingList,
    allPendingOrders: allList,
    savePendingOrder: store.savePendingOrder,
    updatePendingOrderStatus: store.updatePendingOrderStatus,
    completePendingOrder: store.completePendingOrder,
    getPendingOrders: store.getPendingOrders
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
    refreshUsers: store.refreshUsers,
    updateUserBalance: store.updateUserBalance,
    registerOrUpdateUser: store.registerOrUpdateUser,
    issueRefund: store.issueRefund
  };
}

export function useSpinBalance(userId?: string) {
  const [spinBalance, setSpinBalance] = useState<number>(() => store.getSpinBalance(userId));
  const [countdown, setCountdown] = useState<string>(() => getDailySpinCycle().formatted);
  const [hasUsedToday, setHasUsedToday] = useState<boolean>(() => store.hasUsedDailySpin(userId));

  useEffect(() => {
    const update = () => {
      const cycle = getDailySpinCycle();
      setSpinBalance(store.getSpinBalance(userId));
      setCountdown(cycle.formatted);
      setHasUsedToday(store.hasUsedDailySpin(userId));
    };

    update();
    const interval = setInterval(update, 1000);
    const unsubscribe = store.subscribe(update);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [userId]);

  return {
    spinBalance,
    hasUsedToday,
    countdown,
    addSpins: (count: number) => store.addSpins(userId, count),
    deductSpin: () => store.deductSpin(userId)
  };
}

