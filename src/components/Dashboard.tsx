import { 
  Users, 
  DollarSign, 
  Activity, 
  Package, 
  ArrowUpRight, 
  Settings, 
  Bell, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Check, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Tag, 
  Percent, 
  Plus, 
  Copy, 
  Sparkles, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle, 
  Clock,
  Mail,
  Shield,
  Eye,
  Key,
  Wallet,
  Calendar,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Download,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Info,
  History,
  ArrowDownLeft,
  RefreshCw,
  EyeOff,
  QrCode,
  ShieldCheck,
  Zap,
  CheckCircle,
  XCircle,
  HelpCircle,
  Cpu,
  Gift,
  Dices,
  Phone,
  MessageCircle,
  User,
  Edit3,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Layers,
  MessageSquareQuote,
  Send,
  ShieldAlert
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useInventory, useCoupons, useUsers, useWalletTransactions, usePendingOrders, useFAQs, Coupon, FAQItem, defaultFAQs, PendingOrder, WalletTransaction, UserWithStats, getCouponRemainingTime, resolveProductName, defaultSpinWheelSettings } from '../store';
import { testFamApiKeyConnection, verifyFamGatewayOrder, DEFAULT_FAM_API_KEY } from '../lib/famPay';
import { useAuth } from '../lib/useAuth';
import { Helmet } from './Helmet';
import { TableSkeleton, ButtonSpinner, DashboardOverviewSkeleton, LoadingOverlay } from './Skeletons';

export interface DashboardProps {
  initialTab?: string;
  onNavigateHome?: () => void;
}

export function Dashboard({ initialTab, onNavigateHome }: DashboardProps = {}) {
  const { isAdmin, isOwner, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    try {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) return tab;
    } catch {}
    return 'menu';
  });

  if (!authLoading && !isAdmin && !isOwner) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-display text-white mb-2">Access Denied (403 Forbidden)</h2>
        <p className="text-zinc-400 text-sm max-w-md mb-6">
          This administrative dashboard is restricted to verified store owners only. Your account does not have administrator privileges.
        </p>
        <button
          type="button"
          onClick={onNavigateHome}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer"
        >
          Return to Store
        </button>
      </div>
    );
  }

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    try {
      const url = new URL(window.location.href);
      if (tab === 'menu') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };
  const { items: inventory, addKeys, removeKey, settings, updateSettings, updatePaymentSettings, updateSpinWheelSettings, purchases, balances, addProduct, deleteProduct } = useInventory();
  const { coupons, addCoupon, updateCoupon, deleteCoupon, toggleCoupon, saveAllCoupons, quickAdjustCouponDiscount, setCouponDiscountPercent } = useCoupons();
  const { faqs, addFAQ, updateFAQ, deleteFAQ, toggleFAQ, resetDefaultFAQs } = useFAQs();
  const { users, refreshUsers, updateUserBalance, issueRefund } = useUsers();
  const { allTransactions: allWalletTransactions } = useWalletTransactions();
  const { allPendingOrders, updatePendingOrderStatus } = usePendingOrders();
  const [newKeysInput, setNewKeysInput] = useState<{ [key: string]: string }>({});
  const [manageKeysProduct, setManageKeysProduct] = useState<string | null>(null);
  const [deleteKeyConfirmIdx, setDeleteKeyConfirmIdx] = useState<number | null>(null);

  // User Sync & Refresh State
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [refreshUsersMsg, setRefreshUsersMsg] = useState('');

  const handleRefreshUsers = async () => {
    setIsRefreshingUsers(true);
    setRefreshUsersMsg('');
    try {
      const list = await refreshUsers();
      setRefreshUsersMsg(`✅ Live synced ${list.length} user accounts from database!`);
    } catch {
      setRefreshUsersMsg('Users synced.');
    } finally {
      setIsRefreshingUsers(false);
      setTimeout(() => setRefreshUsersMsg(''), 4500);
    }
  };

  // Live QR & Order Tracker States
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [qrActionMsg, setQrActionMsg] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [qrStatusFilter, setQrStatusFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all');
  const [qrSearchQuery, setQrSearchQuery] = useState('');

  // Payment Gateway Management States
  const [draftPaymentProvider, setDraftPaymentProvider] = useState<'famgateway' | 'custom_upi' | 'manual_qr'>(
    settings.payment?.provider || 'famgateway'
  );
  const [draftFamApiKey, setDraftFamApiKey] = useState(
    settings.payment?.famApiKey ?? DEFAULT_FAM_API_KEY
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [draftUpiId, setDraftUpiId] = useState(
    settings.payment?.upiId || 'fatherxsir@upi'
  );
  const [draftUpiName, setDraftUpiName] = useState(
    settings.payment?.upiName || 'Arman X Store'
  );
  const [draftQrImageUrl, setDraftQrImageUrl] = useState(
    settings.payment?.qrImageUrl || ''
  );
  const [draftIsPaymentEnabled, setDraftIsPaymentEnabled] = useState(
    settings.payment?.isPaymentEnabled !== false
  );
  const [draftMinDepositAmount, setDraftMinDepositAmount] = useState(
    (settings.payment?.minDepositAmount || 10).toString()
  );
  const [draftCustomEndpoint, setDraftCustomEndpoint] = useState(
    settings.payment?.customEndpoint || ''
  );
  const [draftNoticeMessage, setDraftNoticeMessage] = useState(
    settings.payment?.noticeMessage || 'Instant UPI / QR Auto Delivery'
  );

  const [deleteApiKeyConfirm, setDeleteApiKeyConfirm] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [testApiKeyResult, setTestApiKeyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const [paymentErrorMsg, setPaymentErrorMsg] = useState('');
  const [copiedApiKey, setCopiedApiKey] = useState(false);

  // Sync payment settings from store when changed
  useEffect(() => {
    if (settings.payment) {
      setDraftPaymentProvider(settings.payment.provider || 'famgateway');
      setDraftFamApiKey(settings.payment.famApiKey ?? DEFAULT_FAM_API_KEY);
      setDraftUpiId(settings.payment.upiId || 'fatherxsir@upi');
      setDraftUpiName(settings.payment.upiName || 'Arman X Store');
      setDraftQrImageUrl(settings.payment.qrImageUrl || '');
      setDraftIsPaymentEnabled(settings.payment.isPaymentEnabled !== false);
      setDraftMinDepositAmount((settings.payment.minDepositAmount || 10).toString());
      setDraftCustomEndpoint(settings.payment.customEndpoint || '');
      setDraftNoticeMessage(settings.payment.noticeMessage || 'Instant UPI / QR Auto Delivery');
    }
  }, [settings.payment]);

  const handleSavePaymentSettings = () => {
    try {
      const minAmt = parseFloat(draftMinDepositAmount) || 10;
      updatePaymentSettings({
        provider: draftPaymentProvider,
        famApiKey: draftFamApiKey.trim(),
        upiId: draftUpiId.trim(),
        upiName: draftUpiName.trim(),
        qrImageUrl: draftQrImageUrl.trim(),
        isPaymentEnabled: draftIsPaymentEnabled,
        minDepositAmount: minAmt,
        customEndpoint: draftCustomEndpoint.trim(),
        noticeMessage: draftNoticeMessage.trim(),
        updatedAt: new Date().toISOString()
      });
      setPaymentSuccessMsg('Payment gateway & API Key saved successfully and synced live across the store!');
      setPaymentErrorMsg('');
      setTimeout(() => setPaymentSuccessMsg(''), 4000);
    } catch (e: any) {
      setPaymentErrorMsg(e?.message || 'Failed to save payment settings');
      setTimeout(() => setPaymentErrorMsg(''), 4000);
    }
  };

  const handleDeleteApiKey = () => {
    setDraftFamApiKey('');
    updatePaymentSettings({ famApiKey: '' });
    setDeleteApiKeyConfirm(false);
    setTestApiKeyResult(null);
    setPaymentSuccessMsg('API Key has been deleted! Enter a new API Key below and click Save.');
    setTimeout(() => setPaymentSuccessMsg(''), 4000);
  };

  const handleTestApiKey = async () => {
    if (!draftFamApiKey.trim()) {
      setTestApiKeyResult({ success: false, message: 'Please enter an API Key to test.' });
      return;
    }
    setIsTestingApiKey(true);
    setTestApiKeyResult(null);
    try {
      const res = await testFamApiKeyConnection(draftFamApiKey.trim());
      setTestApiKeyResult(res);
    } catch (err: any) {
      setTestApiKeyResult({ success: false, message: err?.message || 'Connection test failed' });
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handleResetDefaultApiKey = () => {
    setDraftFamApiKey(DEFAULT_FAM_API_KEY);
    setTestApiKeyResult(null);
    setPaymentSuccessMsg('Default FamGateway API Key restored. Click Save to apply.');
    setTimeout(() => setPaymentSuccessMsg(''), 3000);
  };

  const handleQrUpload = (file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDraftQrImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Spin Wheel Management States
  const [draftSpinEnabled, setDraftSpinEnabled] = useState(
    settings.spinWheel?.isEnabled !== false
  );
  const [draftProb0, setDraftProb0] = useState(
    (settings.spinWheel?.prob0 ?? 50).toString()
  );
  const [draftProb10, setDraftProb10] = useState(
    (settings.spinWheel?.prob10 ?? 20).toString()
  );
  const [draftProb20, setDraftProb20] = useState(
    (settings.spinWheel?.prob20 ?? 20).toString()
  );
  const [draftProb50, setDraftProb50] = useState(
    (settings.spinWheel?.prob50 ?? 10).toString()
  );
  // Configurable discount percentage per slice (Slice 1 = 0%, Slice 2, Slice 3, Slice 4 / Jackpot)
  const [draftDiscount1, setDraftDiscount1] = useState(
    (settings.spinWheel?.discountSlice1 ?? 10).toString()
  );
  const [draftDiscount2, setDraftDiscount2] = useState(
    (settings.spinWheel?.discountSlice2 ?? 20).toString()
  );
  const [draftDiscount3, setDraftDiscount3] = useState(
    (settings.spinWheel?.discountSlice3 ?? 50).toString()
  );
  const [draftCouponExpiryDays, setDraftCouponExpiryDays] = useState(
    (settings.spinWheel?.couponExpiryDays ?? 3).toString()
  );
  const [draftCouponUsageLimit, setDraftCouponUsageLimit] = useState(
    (settings.spinWheel?.couponUsageLimit ?? 1).toString()
  );
  const [draftFreeSpinsPerKey, setDraftFreeSpinsPerKey] = useState(
    (settings.spinWheel?.freeSpinsPerKey ?? 1).toString()
  );
  const [spinSuccessMsg, setSpinSuccessMsg] = useState('');
  const [spinErrorMsg, setSpinErrorMsg] = useState('');

  // Sync spinWheel settings from store when changed
  useEffect(() => {
    if (settings.spinWheel) {
      setDraftSpinEnabled(settings.spinWheel.isEnabled !== false);
      setDraftProb0((settings.spinWheel.prob0 ?? 50).toString());
      setDraftProb10((settings.spinWheel.prob10 ?? 20).toString());
      setDraftProb20((settings.spinWheel.prob20 ?? 20).toString());
      setDraftProb50((settings.spinWheel.prob50 ?? 10).toString());
      setDraftDiscount1((settings.spinWheel.discountSlice1 ?? 10).toString());
      setDraftDiscount2((settings.spinWheel.discountSlice2 ?? 20).toString());
      setDraftDiscount3((settings.spinWheel.discountSlice3 ?? 50).toString());
      setDraftCouponExpiryDays((settings.spinWheel.couponExpiryDays ?? 3).toString());
      setDraftCouponUsageLimit((settings.spinWheel.couponUsageLimit ?? 1).toString());
      setDraftFreeSpinsPerKey((settings.spinWheel.freeSpinsPerKey ?? 1).toString());
    }
  }, [settings.spinWheel]);

  const handleSaveSpinWheelSettings = () => {
    try {
      const p0 = Math.max(0, parseFloat(draftProb0) || 0);
      const p10 = Math.max(0, parseFloat(draftProb10) || 0);
      const p20 = Math.max(0, parseFloat(draftProb20) || 0);
      const p50 = Math.max(0, parseFloat(draftProb50) || 0);
      const d1 = Math.max(1, parseFloat(draftDiscount1) || 10);
      const d2 = Math.max(1, parseFloat(draftDiscount2) || 20);
      const d3 = Math.max(1, parseFloat(draftDiscount3) || 50);
      const expiry = Math.max(1, parseInt(draftCouponExpiryDays, 10) || 3);
      const usage = Math.max(1, parseInt(draftCouponUsageLimit, 10) || 1);
      const spins = Math.max(1, parseInt(draftFreeSpinsPerKey, 10) || 1);

      const sum = p0 + p10 + p20 + p50;
      if (sum <= 0) {
        setSpinErrorMsg('Total probability sum cannot be 0%');
        setTimeout(() => setSpinErrorMsg(''), 4000);
        return;
      }

      updateSpinWheelSettings({
        isEnabled: draftSpinEnabled,
        prob0: p0,
        prob10: p10,
        prob20: p20,
        prob50: p50,
        discountSlice1: d1,
        discountSlice2: d2,
        discountSlice3: d3,
        couponExpiryDays: expiry,
        couponUsageLimit: usage,
        freeSpinsPerKey: spins,
        updatedAt: new Date().toISOString()
      });

      setSpinSuccessMsg('🎡 Spin Wheel settings, discount percentages & probabilities saved and synced live!');
      setSpinErrorMsg('');
      setTimeout(() => setSpinSuccessMsg(''), 4000);
    } catch (e: any) {
      setSpinErrorMsg(e?.message || 'Failed to save spin wheel settings');
      setTimeout(() => setSpinErrorMsg(''), 4000);
    }
  };

  const handleApplyProbPreset = (p0: number, p10: number, p20: number, p50: number) => {
    setDraftProb0(p0.toString());
    setDraftProb10(p10.toString());
    setDraftProb20(p20.toString());
    setDraftProb50(p50.toString());
  };

  // User Management & Details States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'buyers' | 'phone' | 'leads' | 'balance' | 'vip'>('all');
  const [userSortBy, setUserSortBy] = useState<'recent' | 'spent' | 'orders' | 'balance' | 'name'>('recent');
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserWithStats | null>(null);
  const [userModalTab, setUserModalTab] = useState<'deposits' | 'orders'>('deposits');
  const [balanceAdjustUser, setBalanceAdjustUser] = useState<UserWithStats | null>(null);
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct'>('add');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [balanceSuccessMsg, setBalanceSuccessMsg] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // FAQ Management States & Handlers
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [faqCategoryFilter, setFaqCategoryFilter] = useState('all');
  const [faqStatusFilter, setFaqStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [faqFormQuestion, setFaqFormQuestion] = useState('');
  const [faqFormAnswer, setFaqFormAnswer] = useState('');
  const [faqFormCategory, setFaqFormCategory] = useState('Purchases & Delivery');
  const [faqFormCustomCategory, setFaqFormCustomCategory] = useState('');
  const [faqFormOrder, setFaqFormOrder] = useState('1');
  const [faqFormActive, setFaqFormActive] = useState(true);
  const [faqFormError, setFaqFormError] = useState('');
  const [faqSuccessMsg, setFaqSuccessMsg] = useState('');
  const [deleteFaqConfirmId, setDeleteFaqConfirmId] = useState<string | null>(null);
  const [resetFaqConfirm, setResetFaqConfirm] = useState(false);
  const [expandedFaqCardId, setExpandedFaqCardId] = useState<string | null>(null);

  // Telegram Channel / Bot Link in FAQ tab
  const [draftFaqTelegramLink, setDraftFaqTelegramLink] = useState(
    settings.faqTelegramLink || 'https://t.me/FATHERXSIR'
  );
  const [faqTelegramSavedMsg, setFaqTelegramSavedMsg] = useState('');

  useEffect(() => {
    if (settings.faqTelegramLink) {
      setDraftFaqTelegramLink(settings.faqTelegramLink);
    }
  }, [settings.faqTelegramLink]);

  const handleSaveFaqTelegramLink = () => {
    const link = draftFaqTelegramLink.trim() || 'https://t.me/FATHERXSIR';
    updateSettings({ faqTelegramLink: link });
    setFaqTelegramSavedMsg('✅ Telegram link saved! Homepage FAQ section will now direct customers to this link.');
    setTimeout(() => setFaqTelegramSavedMsg(''), 4000);
  };

  const handleOpenAddFaq = () => {
    setEditingFaq(null);
    setFaqFormQuestion('');
    setFaqFormAnswer('');
    setFaqFormCategory('Purchases & Delivery');
    setFaqFormCustomCategory('');
    setFaqFormOrder((faqs.length + 1).toString());
    setFaqFormActive(true);
    setFaqFormError('');
    setIsFaqModalOpen(true);
  };

  const handleOpenEditFaq = (faq: FAQItem) => {
    setEditingFaq(faq);
    setFaqFormQuestion(faq.question);
    setFaqFormAnswer(faq.answer);
    const standardCategories = ['Purchases & Delivery', 'Payment & UPI', 'Activation & Keys', 'Wallet & Balance', 'Support & Help', 'Coupons & Rewards'];
    if (standardCategories.includes(faq.category)) {
      setFaqFormCategory(faq.category);
      setFaqFormCustomCategory('');
    } else {
      setFaqFormCategory('Custom');
      setFaqFormCustomCategory(faq.category || '');
    }
    setFaqFormOrder((faq.order || 1).toString());
    setFaqFormActive(faq.isActive);
    setFaqFormError('');
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = () => {
    setFaqFormError('');
    if (!faqFormQuestion.trim()) {
      setFaqFormError('Question cannot be empty.');
      return;
    }
    if (!faqFormAnswer.trim()) {
      setFaqFormError('Answer cannot be empty.');
      return;
    }

    const finalCategory = faqFormCategory === 'Custom' 
      ? (faqFormCustomCategory.trim() || 'General') 
      : faqFormCategory;

    const finalOrder = parseInt(faqFormOrder) || 1;

    if (editingFaq) {
      updateFAQ(editingFaq.id, {
        question: faqFormQuestion.trim(),
        answer: faqFormAnswer.trim(),
        category: finalCategory,
        order: finalOrder,
        isActive: faqFormActive
      });
      setFaqSuccessMsg('FAQ question updated successfully!');
    } else {
      addFAQ({
        question: faqFormQuestion.trim(),
        answer: faqFormAnswer.trim(),
        category: finalCategory,
        order: finalOrder,
        isActive: faqFormActive
      });
      setFaqSuccessMsg('New FAQ question added to Homepage!');
    }

    setIsFaqModalOpen(false);
    setTimeout(() => setFaqSuccessMsg(''), 4000);
  };

  const handleMoveFaqOrder = (faq: FAQItem, direction: 'up' | 'down') => {
    const sorted = [...faqs].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sorted.findIndex(f => f.id === faq.id);
    if (idx < 0) return;
    if (direction === 'up' && idx > 0) {
      const prev = sorted[idx - 1];
      const curOrder = faq.order || (idx + 1);
      const prevOrder = prev.order || idx;
      updateFAQ(faq.id, { order: prevOrder });
      updateFAQ(prev.id, { order: curOrder });
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const next = sorted[idx + 1];
      const curOrder = faq.order || (idx + 1);
      const nextOrder = next.order || (idx + 2);
      updateFAQ(faq.id, { order: nextOrder });
      updateFAQ(next.id, { order: curOrder });
    }
  };

  const handleAddPresetFaq = (preset: { question: string; answer: string; category: string }) => {
    addFAQ({
      question: preset.question,
      answer: preset.answer,
      category: preset.category,
      order: faqs.length + 1,
      isActive: true
    });
    setFaqSuccessMsg(`Added FAQ template: "${preset.question.slice(0, 32)}..."`);
    setTimeout(() => setFaqSuccessMsg(''), 3000);
  };

  const handleResetFaqs = () => {
    resetDefaultFAQs();
    setResetFaqConfirm(false);
    setFaqSuccessMsg('Standard FAQ questions restored to defaults!');
    setTimeout(() => setFaqSuccessMsg(''), 3500);
  };

  // CSV Export States & Handlers
  const [csvExportSuccessMsg, setCsvExportSuccessMsg] = useState('');
  const [txnSearchQuery, setTxnSearchQuery] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState<'all' | 'orders' | 'deposits' | 'refunds'>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // CSV Generator Helper for Bookkeeping
  const downloadCSV = (filename: string, headers: string[], rows: (string | number | undefined | null)[][]) => {
    const escapeCell = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvContent = '\uFEFF' + [
      headers.map(escapeCell).join(','),
      ...rows.map(row => row.map(escapeCell).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Standard date formatter for Accounting Software (ISO/Standard YYYY-MM-DD HH:mm:ss)
  const formatCsvDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const pad = (n: number) => (n < 10 ? '0' + n : String(n));
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      const secs = pad(d.getSeconds());
      return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
    } catch {
      return dateStr || '';
    }
  };

  // Human Readable Full Date & Time with seconds (for Owner Live Monitoring)
  const formatFullDateTime = (isoDate?: string) => {
    if (!isoDate) return 'N/A';
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return isoDate;
    }
  };

  // Verify live order status directly with FamGateway API
  const handleVerifyLiveOrder = async (targetOrder: PendingOrder) => {
    setVerifyingOrderId(targetOrder.orderId);
    setQrActionMsg('');
    try {
      const res = await verifyFamGatewayOrder(targetOrder.orderId);
      if (res.verified || res.status === 'success') {
        await updatePendingOrderStatus(targetOrder.orderId, 'success', new Date().toISOString());
        setQrActionMsg(`✅ Order #${targetOrder.orderId} verified as SUCCESS! ₹${targetOrder.amount} status updated.`);
      } else {
        setQrActionMsg(`⏳ Order #${targetOrder.orderId} is currently PENDING on payment gateway.`);
      }
    } catch (err: any) {
      setQrActionMsg(`⚠️ Verification check notice: ${err?.message || 'Gateway response pending'}`);
    } finally {
      setVerifyingOrderId(null);
      setTimeout(() => setQrActionMsg(''), 6000);
    }
  };

  // Manual mark as success & credit for Owner override
  const handleManualMarkOrderSuccess = async (targetOrder: PendingOrder) => {
    if (confirm(`Manually mark Order #${targetOrder.orderId} (₹${targetOrder.amount}) as SUCCESS / COMPLETED?`)) {
      await updatePendingOrderStatus(targetOrder.orderId, 'success', new Date().toISOString());
      if (targetOrder.userId && targetOrder.userId !== 'anonymous') {
        const currentBal = balances[targetOrder.userId] || 0;
        await updateUserBalance(
          targetOrder.userId, 
          currentBal + targetOrder.amount, 
          `Manual approval for Order #${targetOrder.orderId}`,
          { action: 'add', amount: targetOrder.amount, referenceId: targetOrder.orderId }
        );
      }
      setQrActionMsg(`✅ Order #${targetOrder.orderId} marked as SUCCESS and recorded.`);
      setTimeout(() => setQrActionMsg(''), 5000);
    }
  };

  const handleCopyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedOrderId(id);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // 1. Consolidated All Transactions Export (Purchases + Wallet Logs)
  const handleExportAllTransactionsCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `all-transactions-bookkeeping-${dateStr}.csv`;

    const headers = [
      'User Email',
      'Customer Name',
      'Customer Phone / WhatsApp',
      'Purchase Date',
      'Product Name',
      'Payment Amount',
      'Currency',
      'Transaction ID',
      'Transaction Type',
      'User UID',
      'Category / Plan',
      'Quantity',
      'License Keys Delivered',
      'Payment Method',
      'Reference / UTR ID',
      'Status',
      'Coupon Code',
      'Notes'
    ];

    const combinedRows: { date: number; row: (string | number)[] }[] = [];

    // Map purchases
    purchases.forEach((p) => {
      const user = users.find(u => u.uid === p.userId || (p.userEmail && u.email === p.userEmail));
      const productName = resolveProductName(p.category, settings.categories, inventory);
      const invItem = inventory.find(i => i.value === p.value);
      const calculatedAmount = p.amount ?? (invItem?.price ? invItem.price * p.keys.length : 0);
      const d = new Date(p.date);
      const timestamp = isNaN(d.getTime()) ? Date.now() : d.getTime();

      combinedRows.push({
        date: timestamp,
        row: [
          p.userEmail || user?.email || (p.userId === 'anonymous' ? 'guest@store.local' : 'N/A'),
          p.customerName || user?.displayName || user?.customId || 'Customer',
          p.customerPhone || user?.phone || '',
          formatCsvDate(p.date),
          `${productName} - ${p.label}`,
          calculatedAmount,
          'INR',
          p.id,
          'Key Purchase Order',
          p.userId || 'anonymous',
          p.category,
          p.keys.length,
          p.keys.join(' ; '),
          'Wallet Balance',
          p.couponCode ? `Coupon: ${p.couponCode}` : 'Wallet Checkout',
          'Completed',
          p.couponCode || '',
          p.couponCode ? `Discount Applied (${p.couponCode})` : 'Order Key Delivery'
        ]
      });
    });

    // Map wallet transactions
    allWalletTransactions.forEach((t) => {
      const user = users.find(u => u.uid === t.userId || (t.userEmail && u.email === t.userEmail));
      const typeLabel = t.type === 'deposit' 
        ? 'Wallet Deposit (UPI/QR)' 
        : t.type === 'refund' 
        ? 'Wallet Refund' 
        : t.type === 'adjustment' 
        ? 'Balance Adjustment' 
        : 'Wallet Deduction';

      const prodName = t.type === 'deposit'
        ? 'Wallet Deposit / Top-up'
        : t.type === 'refund'
        ? 'Order Refund'
        : t.type === 'adjustment'
        ? 'Balance Adjustment'
        : 'Wallet Deduction';

      const d = new Date(t.date);
      const timestamp = isNaN(d.getTime()) ? Date.now() : d.getTime();

      combinedRows.push({
        date: timestamp,
        row: [
          t.userEmail || user?.email || 'N/A',
          user?.displayName || user?.customId || 'Customer',
          user?.phone || '',
          formatCsvDate(t.date),
          prodName,
          t.amount,
          'INR',
          t.id,
          typeLabel,
          t.userId,
          t.type,
          1,
          '',
          t.method || (t.type === 'deposit' ? 'FamGateway UPI' : 'Internal Wallet'),
          t.referenceId || 'N/A',
          t.status || 'Completed',
          '',
          t.note || ''
        ]
      });
    });

    // Sort newest first
    combinedRows.sort((a, b) => b.date - a.date);

    downloadCSV(filename, headers, combinedRows.map(item => item.row));
    setCsvExportSuccessMsg(`Exported ${combinedRows.length} transactions to ${filename} for offline bookkeeping!`);
    setShowExportMenu(false);
    setTimeout(() => setCsvExportSuccessMsg(''), 4500);
  };

  // 2. Key Purchase Orders Only Export
  const handleExportOrdersCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `key-orders-history-${dateStr}.csv`;

    const headers = [
      'User Email',
      'Customer Name',
      'Customer Phone / WhatsApp',
      'Purchase Date',
      'Product Name',
      'Payment Amount',
      'Currency',
      'Order ID',
      'User UID',
      'Plan / Duration',
      'Quantity',
      'License Keys Delivered',
      'Coupon Code',
      'Payment Method',
      'Status'
    ];

    const rows = purchases.map((p) => {
      const user = users.find(u => u.uid === p.userId || (p.userEmail && u.email === p.userEmail));
      const productName = resolveProductName(p.category, settings.categories, inventory);
      const invItem = inventory.find(i => i.value === p.value);
      const calculatedAmount = p.amount ?? (invItem?.price ? invItem.price * p.keys.length : 0);

      return [
        p.userEmail || user?.email || (p.userId === 'anonymous' ? 'guest@store.local' : 'N/A'),
        p.customerName || user?.displayName || user?.customId || 'Customer',
        p.customerPhone || user?.phone || '',
        formatCsvDate(p.date),
        `${productName} - ${p.label}`,
        calculatedAmount,
        'INR',
        p.id,
        p.userId || 'anonymous',
        p.label,
        p.keys.length,
        p.keys.join(' ; '),
        p.couponCode || 'None',
        'Wallet Balance',
        'Completed'
      ];
    });

    downloadCSV(filename, headers, rows);
    setCsvExportSuccessMsg(`Exported ${rows.length} key orders to ${filename}!`);
    setShowExportMenu(false);
    setTimeout(() => setCsvExportSuccessMsg(''), 4500);
  };

  // 3. Wallet Transactions & UPI Deposits Only Export
  const handleExportWalletTxnsCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `wallet-deposits-refunds-${dateStr}.csv`;

    const headers = [
      'User Email',
      'Purchase Date',
      'Product Name',
      'Payment Amount',
      'Currency',
      'Transaction ID',
      'Customer Name',
      'User UID',
      'Transaction Type',
      'Payment Method',
      'Reference / UTR ID',
      'Balance After',
      'Status',
      'Note / Reason'
    ];

    const rows = allWalletTransactions.map((t) => {
      const user = users.find(u => u.uid === t.userId || (t.userEmail && u.email === t.userEmail));
      const prodName = t.type === 'deposit' 
        ? 'Wallet Deposit / Top-up' 
        : t.type === 'refund' 
        ? 'Wallet Refund' 
        : t.type === 'adjustment' 
        ? 'Balance Adjustment' 
        : 'Wallet Deduction';

      return [
        t.userEmail || user?.email || 'N/A',
        formatCsvDate(t.date),
        prodName,
        t.amount,
        'INR',
        t.id,
        user?.displayName || user?.customId || 'Customer',
        t.userId,
        t.type.toUpperCase(),
        t.method || 'UPI / Gateway',
        t.referenceId || 'N/A',
        t.balanceAfter ?? 'N/A',
        t.status || 'Completed',
        t.note || ''
      ];
    });

    downloadCSV(filename, headers, rows);
    setCsvExportSuccessMsg(`Exported ${rows.length} wallet transactions to ${filename}!`);
    setShowExportMenu(false);
    setTimeout(() => setCsvExportSuccessMsg(''), 4500);
  };

  // 4. Customer Directory Summary Export
  const handleExportCustomersSummaryCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `customer-accounts-${dateStr}.csv`;

    const headers = [
      'User Email',
      'Customer Name',
      'Customer Phone / WhatsApp',
      'User UID',
      'Account Role',
      'Current Wallet Balance',
      'Total Orders Placed',
      'Total Amount Spent',
      'Total Keys Purchased',
      'Last Delivered Keys',
      'Currency',
      'Joined Date',
      'Last Login Date'
    ];

    const rows = users.map((u) => [
      u.email || 'N/A',
      u.displayName || u.customId || 'User',
      u.phone || '',
      u.uid,
      u.role || 'customer',
      u.balance || 0,
      u.totalOrders || 0,
      u.totalSpent || 0,
      u.totalKeys || 0,
      (u.lastKeys || []).join(' ; '),
      'INR',
      formatCsvDate(u.createdAt) || formatUserDate(u.createdAt),
      formatCsvDate(u.lastLoginAt) || formatUserDate(u.lastLoginAt)
    ]);

    downloadCSV(filename, headers, rows);
    setCsvExportSuccessMsg(`Exported ${rows.length} customer accounts to ${filename}!`);
    setShowExportMenu(false);
    setTimeout(() => setCsvExportSuccessMsg(''), 4500);
  };

  // 5. Single User Statement Export
  const handleExportUserStatementCSV = (user: UserWithStats) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `statement-${(user.displayName || user.email || user.uid).replace(/[^a-zA-Z0-9]/g, '_')}-${dateStr}.csv`;

    const headers = [
      'User Email',
      'Purchase Date',
      'Product Name',
      'Payment Amount',
      'Currency',
      'Transaction ID',
      'Customer Name',
      'Transaction Type',
      'Payment Method',
      'Reference / Keys',
      'Status',
      'Note'
    ];

    const userPurchases = purchases.filter(p => p.userId === user.uid || (user.email && p.userEmail === user.email));
    const userTxns = allWalletTransactions.filter(t => t.userId === user.uid || (user.email && t.userEmail === user.email));

    const combined: { date: number; row: (string | number)[] }[] = [];

    userPurchases.forEach(p => {
      const productName = resolveProductName(p.category, settings.categories, inventory);
      const invItem = inventory.find(i => i.value === p.value);
      const amt = p.amount ?? (invItem?.price ? invItem.price * p.keys.length : 0);
      const d = new Date(p.date);
      combined.push({
        date: isNaN(d.getTime()) ? Date.now() : d.getTime(),
        row: [
          p.userEmail || user.email || 'N/A',
          formatCsvDate(p.date),
          `${productName} - ${p.label}`,
          -amt,
          'INR',
          p.id,
          user.displayName || user.customId || 'Customer',
          'Key Purchase',
          'Wallet Balance',
          p.keys.join(' ; '),
          'Completed',
          p.couponCode ? `Coupon: ${p.couponCode}` : ''
        ]
      });
    });

    userTxns.forEach(t => {
      const d = new Date(t.date);
      const prodName = t.type === 'deposit' 
        ? 'Wallet Deposit' 
        : t.type === 'refund' 
        ? 'Wallet Refund' 
        : t.type === 'adjustment' 
        ? 'Balance Adjustment' 
        : 'Wallet Deduction';

      combined.push({
        date: isNaN(d.getTime()) ? Date.now() : d.getTime(),
        row: [
          user.email || t.userEmail || 'N/A',
          formatCsvDate(t.date),
          prodName,
          t.type === 'deposit' || t.type === 'refund' || (t.type === 'adjustment' && t.amount > 0) ? t.amount : -Math.abs(t.amount),
          'INR',
          t.id,
          user.displayName || user.customId || 'Customer',
          t.type.toUpperCase(),
          t.method || 'UPI / Gateway',
          t.referenceId || '',
          t.status || 'Completed',
          t.note || ''
        ]
      });
    });

    combined.sort((a, b) => b.date - a.date);

    downloadCSV(filename, headers, combined.map(c => c.row));
    setCsvExportSuccessMsg(`Statement exported for ${user.displayName || user.email}!`);
    setTimeout(() => setCsvExportSuccessMsg(''), 4000);
  };

  // 6. Live QR & Payment Orders CSV Export
  const handleExportLiveQrOrdersCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `live-qr-orders-${dateStr}.csv`;
    const headers = [
      'Order ID',
      'Date & Time Created',
      'Live Status',
      'User Email',
      'Customer Name',
      'Payment Amount',
      'Currency',
      'Product / Purpose',
      'Payment Method',
      'Paid Date & Time',
      'Checkout Link'
    ];

    const rows = allPendingOrders.map(o => [
      o.orderId,
      formatCsvDate(o.createdAt) || o.dateFormatted || formatUserDate(o.createdAt),
      (o.status || 'pending').toUpperCase(),
      o.userEmail || 'N/A',
      o.customerName || (o.userEmail ? o.userEmail.split('@')[0] : 'Customer'),
      o.amount,
      'INR',
      o.productName || (o.type === 'qr_deposit' ? 'Wallet Top-up' : 'Key Purchase'),
      o.paymentMethod || 'FamGateway UPI QR',
      o.paidAt ? (formatCsvDate(o.paidAt) || formatUserDate(o.paidAt)) : 'Pending',
      o.checkoutUrl || ''
    ]);

    downloadCSV(filename, headers, rows);
    setCsvExportSuccessMsg(`Exported ${rows.length} live QR orders to ${filename}!`);
    setShowExportMenu(false);
    setTimeout(() => setCsvExportSuccessMsg(''), 4500);
  };

  // Helper to live check payment status for any QR order from FamGateway API
  const handleCheckLiveOrderStatus = async (orderId: string) => {
    setVerifyingOrderId(orderId);
    try {
      const res = await verifyFamGatewayOrder(orderId);
      if (res.verified || res.status === 'success') {
        await updatePendingOrderStatus(orderId, 'success', new Date().toISOString());
        setQrActionMsg(`✅ Order #${orderId}: Payment SUCCESS! Verified on FamGateway.`);
      } else {
        setQrActionMsg(`⏳ Order #${orderId}: Status is PENDING. Waiting for customer payment.`);
      }
    } catch (err: any) {
      setQrActionMsg(`⚠️ Order #${orderId}: Verification notice: ${err?.message || 'Gateway unreachable'}`);
    } finally {
      setVerifyingOrderId(null);
      setTimeout(() => setQrActionMsg(''), 4500);
    }
  };

  // Helper to manually set QR order status
  const handleManualSetOrderStatus = async (orderId: string, status: 'pending' | 'success' | 'failed') => {
    await updatePendingOrderStatus(orderId, status, status === 'success' ? new Date().toISOString() : undefined);
    setQrActionMsg(`Order #${orderId} status updated to ${status.toUpperCase()}!`);
    setTimeout(() => setQrActionMsg(''), 4000);
  };

  // Dedicated Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState<{
    orderId?: string;
    userId: string;
    userEmail?: string;
    amount: number;
    productName: string;
  } | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundReasonInput, setRefundReasonInput] = useState('');
  const [refundSuccessMsg, setRefundSuccessMsg] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatUserDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch(e) {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      if (isNaN(diff)) return 'Recently';
      const mins = Math.floor(diff / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      return `${Math.floor(days / 30)}mo ago`;
    } catch(e) {
      return 'Recently';
    }
  };

  // Coupon Management States
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [newDiscountValue, setNewDiscountValue] = useState('20');
  const [newMinSpend, setNewMinSpend] = useState('0');
  const [newValidHours, setNewValidHours] = useState('0'); // 0 = Lifetime (Never expires)
  const [newMaxUses, setNewMaxUses] = useState('0'); // 0 = unlimited
  const [newApplicableScope, setNewApplicableScope] = useState<'all' | 'specific'>('all');
  const [newSelectedProducts, setNewSelectedProducts] = useState<string[]>([]);
  const [newDescription, setNewDescription] = useState('');
  const [couponFormError, setCouponFormError] = useState('');
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');
  const [deleteCouponConfirmId, setDeleteCouponConfirmId] = useState<string | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);

  // Edit Coupon Modal States
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editCouponCode, setEditCouponCode] = useState('');
  const [editDiscountType, setEditDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [editDiscountValue, setEditDiscountValue] = useState('20');
  const [editMinSpend, setEditMinSpend] = useState('0');
  const [editValidHours, setEditValidHours] = useState('0');
  const [editMaxUses, setEditMaxUses] = useState('0');
  const [editApplicableScope, setEditApplicableScope] = useState<'all' | 'specific'>('all');
  const [editSelectedProducts, setEditSelectedProducts] = useState<string[]>([]);
  const [editDescription, setEditDescription] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState('');

  const handleOpenEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setEditCouponCode(coupon.code);
    setEditDiscountType(coupon.discountType || 'percentage');
    setEditDiscountValue((coupon.discountValue || 1).toString());
    setEditMinSpend((coupon.minSpend || 0).toString());
    setEditValidHours((coupon.validHours || 0).toString());
    setEditMaxUses((coupon.maxUses || 0).toString());
    setEditApplicableScope(coupon.applicableScope || 'all');
    setEditSelectedProducts(coupon.applicableProducts || []);
    setEditDescription(coupon.description || '');
    setEditActive(coupon.active !== false);
    setEditError('');
  };

  const handleSaveEditedCoupon = () => {
    if (!editingCoupon) return;
    const val = parseFloat(editDiscountValue);
    if (isNaN(val) || val <= 0) {
      setEditError('Please enter a valid discount value greater than 0.');
      return;
    }
    if (editDiscountType === 'percentage' && val > 90) {
      setEditError('Percentage discount cannot exceed 90%.');
      return;
    }
    const hoursNum = parseFloat(editValidHours);
    const validHours = (!isNaN(hoursNum) && hoursNum > 0) ? hoursNum : undefined;
    const expiresAt = validHours ? new Date(Date.now() + validHours * 3600 * 1000).toISOString() : null;
    const maxUsesNum = parseInt(editMaxUses);
    const maxUses = (!isNaN(maxUsesNum) && maxUsesNum > 0) ? maxUsesNum : undefined;

    updateCoupon(editingCoupon.id, {
      code: editCouponCode.trim().toUpperCase() || editingCoupon.code,
      discountType: editDiscountType,
      discountValue: val,
      minSpend: parseFloat(editMinSpend) || 0,
      description: editDescription.trim() || `${val}${editDiscountType === 'percentage' ? '% Off' : '₹ Flat Off'}`,
      active: editActive,
      validHours,
      expiresAt,
      maxUses,
      applicableScope: editApplicableScope,
      applicableProducts: editApplicableScope === 'specific' ? editSelectedProducts : undefined
    });

    setCouponSuccessMsg(`✅ Coupon "${editCouponCode}" updated to ${val}${editDiscountType === 'percentage' ? '%' : '₹'} discount!`);
    setEditingCoupon(null);
    setTimeout(() => setCouponSuccessMsg(''), 4000);
  };

  const [isSavingCoupons, setIsSavingCoupons] = useState(false);

  const handleSaveAllCoupons = async () => {
    setIsSavingCoupons(true);
    try {
      await saveAllCoupons();
      setCouponSuccessMsg('✅ All coupon codes saved & applied live to website!');
      setTimeout(() => setCouponSuccessMsg(''), 4500);
    } catch (err: any) {
      setCouponFormError('Notice while saving coupons: ' + (err?.message || 'Saved to store'));
    } finally {
      setIsSavingCoupons(false);
    }
  };
  
  // Dynamic Stats Calculation
  const totalRevenue = purchases.reduce((acc, order) => {
    const item = inventory.find(i => i.value === order.value);
    const price = item ? item.price : 0;
    return acc + (order.keys.length * price);
  }, 0);

  const activeCustomers = new Set(purchases.map(p => p.userId)).size;
  const totalKeysSold = purchases.reduce((acc, order) => acc + order.keys.length, 0);
  const outOfStockItems = inventory.filter(item => item.stock === 0);

  const stats = [
    { name: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, change: '+100%', trend: 'up', icon: DollarSign, tab: 'overview' },
    { name: 'Registered Users', value: users.length.toString(), change: `${users.filter(u => u.totalOrders > 0).length} buyers • ${users.filter(u => !!u.phone).length} phone`, trend: 'up', icon: Users, tab: 'customers' },
    { name: 'Total Keys Sold', value: totalKeysSold.toString(), change: 'All time', trend: 'up', icon: ShoppingCart, tab: 'orders' },
    { 
      name: 'Stock Alerts', 
      value: outOfStockItems.length.toString(), 
      change: outOfStockItems.length > 0 ? `${outOfStockItems.length} items empty` : 'All stocked', 
      trend: outOfStockItems.length > 0 ? 'down' : 'up', 
      icon: Package,
      tab: 'inventory'
    },
  ];

  const [keysFeedbackMsg, setKeysFeedbackMsg] = useState<{ [key: string]: string }>({});

  const handleAddKeys = (value: string) => {
    const text = newKeysInput[value] || '';
    const keysArray = text.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    if (keysArray.length > 0) {
      const res = addKeys(value, keysArray);
      let msg = `✅ Added ${res.addedCount} new unique keys!`;
      if (res.usedCount > 0) {
        msg += ` ⚠️ Skipped ${res.usedCount} keys (Already sold previously - 1 key is never provided 2 times!)`;
      }
      if (res.duplicateCount > 0) {
        msg += ` (${res.duplicateCount} duplicates ignored)`;
      }
      setKeysFeedbackMsg(prev => ({ ...prev, [value]: msg }));
      setNewKeysInput(prev => ({ ...prev, [value]: '' }));
      setTimeout(() => {
        setKeysFeedbackMsg(prev => {
          const copy = { ...prev };
          delete copy[value];
          return copy;
        });
      }, 6000);
    }
  };

  const [newProduct, setNewProduct] = useState<{
    category: string;
    label: string;
    price: string;
  }>({ category: 'ARMAN X STORE NON-ROOT', label: '', price: '' });

  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<string | null>(null);

  const [deleteProductConfirmId, setDeleteProductConfirmId] = useState<string | null>(null);

  const [draftCategories, setDraftCategories] = useState(settings.categories);
  const [draftSiteName, setDraftSiteName] = useState(settings.siteName || 'ARMAN X STORE');
  const [draftSiteLogoUrl, setDraftSiteLogoUrl] = useState(settings.siteLogoUrl || '/logo.png');
  const [draftAnnouncementText, setDraftAnnouncementText] = useState(settings.announcementText || '⚡ Flash Sale Live: Instant UPI Delivery 24/7. Use coupon VIP20 for special discounts!');
  const [draftAnnouncementEnabled, setDraftAnnouncementEnabled] = useState(settings.announcementEnabled !== false);
  const [draftWhatsappSupport, setDraftWhatsappSupport] = useState(settings.whatsappSupportNumber || '919876543210');
  const [draftTelegramSupport, setDraftTelegramSupport] = useState(settings.supportTelegramUsername || 'FATHERXSIR');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync drafts with global settings if no unsaved changes
  useEffect(() => {
    if (!hasChanges) {
      setDraftCategories(settings.categories);
      setDraftSiteName(settings.siteName || 'ARMAN X STORE');
      setDraftSiteLogoUrl(settings.siteLogoUrl || '/logo.png');
      setDraftAnnouncementText(settings.announcementText || '⚡ Flash Sale Live: Instant UPI Delivery 24/7. Use coupon VIP20 for special discounts!');
      setDraftAnnouncementEnabled(settings.announcementEnabled !== false);
      setDraftWhatsappSupport(settings.whatsappSupportNumber || '919876543210');
      setDraftTelegramSupport(settings.supportTelegramUsername || 'FATHERXSIR');
    }
  }, [settings, hasChanges]);

  const handleSaveSettings = () => {
    updateSettings({ 
      categories: draftCategories,
      siteName: draftSiteName,
      siteLogoUrl: draftSiteLogoUrl,
      announcementText: draftAnnouncementText.trim(),
      announcementEnabled: draftAnnouncementEnabled,
      whatsappSupportNumber: draftWhatsappSupport.trim(),
      supportTelegramUsername: draftTelegramSupport.trim().replace(/^@/, '')
    });
    setHasChanges(false);
  };

  const handleDiscardChanges = () => {
    setDraftCategories(settings.categories);
    setDraftSiteName(settings.siteName || 'ARMAN X STORE');
    setDraftSiteLogoUrl(settings.siteLogoUrl || '/logo.png');
    setDraftAnnouncementText(settings.announcementText || '');
    setDraftAnnouncementEnabled(settings.announcementEnabled !== false);
    setDraftWhatsappSupport(settings.whatsappSupportNumber || '');
    setDraftTelegramSupport(settings.supportTelegramUsername || '');
    setHasChanges(false);
    setDeleteCategoryConfirmId(null);
  };

  // Full Store Database Backup Export (JSON)
  const handleExportStoreBackupJSON = () => {
    const backupData = {
      app: 'Arman X Store',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      storeName: settings.siteName || 'Arman X Store',
      settings,
      inventory: inventory.map(item => ({
        category: item.category,
        label: item.label,
        value: item.value,
        price: item.price,
        stock: item.stock,
        keys: item.keys || []
      })),
      coupons,
      purchases,
      pendingOrders: allPendingOrders,
      walletTransactions: allWalletTransactions,
      faqs,
      users: users.map(u => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        phone: u.phone,
        balance: u.balance,
        role: u.role,
        createdAt: u.createdAt
      }))
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arman-x-store-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCsvExportSuccessMsg('✅ Full store database backup downloaded as JSON file!');
    setTimeout(() => setCsvExportSuccessMsg(''), 4500);
  };

  const handleCreateProduct = () => {
    if (newProduct.label && newProduct.price) {
      const value = newProduct.category.toLowerCase().replace(/\s+/g, '_') + '_' + newProduct.label.toLowerCase().replace(/\s+/g, '');
      addProduct(newProduct.category, newProduct.label, value, parseInt(newProduct.price) || 0);
      setNewProduct({ ...newProduct, label: '', price: '' });
    }
  };

  const handleLogoUpload = (categoryId: string, file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedCategories = draftCategories.map(c => 
          c.id === categoryId ? { ...c, logoUrl: reader.result as string } : c
        );
        setDraftCategories(updatedCategories);
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCategory = () => {
    const newCategory = {
      id: `CATEGORY_${Date.now()}`,
      name: 'New Product',
      logoUrl: 'https://images.unsplash.com/photo-1614064641936-732732f1a63c?auto=format&fit=crop&q=80&w=200',
      theme: 'light' as const
    };
    setDraftCategories([...draftCategories, newCategory]);
    setHasChanges(true);
  };

  const handleCreateCoupon = () => {
    const code = newCouponCode.trim().toUpperCase();
    if (!code) {
      setCouponFormError('Coupon code is required.');
      return;
    }
    const val = parseFloat(newDiscountValue);
    if (isNaN(val) || val <= 0) {
      setCouponFormError('Please enter a valid discount value greater than 0.');
      return;
    }
    if (newDiscountType === 'percentage' && val > 90) {
      setCouponFormError('Percentage discount cannot exceed 90%.');
      return;
    }

    const hoursNum = parseFloat(newValidHours);
    const validHours = (!isNaN(hoursNum) && hoursNum > 0) ? hoursNum : undefined;
    const expiresAt = validHours ? new Date(Date.now() + validHours * 60 * 60 * 1000).toISOString() : null;

    const maxUsesNum = parseInt(newMaxUses);
    const maxUses = (!isNaN(maxUsesNum) && maxUsesNum > 0) ? maxUsesNum : undefined;

    const existingCoupon = coupons.find(c => c.code.toUpperCase() === code);
    if (existingCoupon) {
      // Direct update for existing coupon
      updateCoupon(existingCoupon.id, {
        discountType: newDiscountType,
        discountValue: val,
        minSpend: parseFloat(newMinSpend) || 0,
        description: newDescription.trim() || `${val}${newDiscountType === 'percentage' ? '% Off' : '₹ Flat Off'}`,
        validHours,
        expiresAt,
        maxUses,
        applicableScope: newApplicableScope,
        applicableProducts: newApplicableScope === 'specific' ? newSelectedProducts : undefined
      });
      setNewCouponCode('');
      setNewDescription('');
      setCouponFormError('');
      setCouponSuccessMsg(`✅ Existing Coupon "${code}" updated to ${val}${newDiscountType === 'percentage' ? '%' : '₹'} discount!`);
      setTimeout(() => setCouponSuccessMsg(''), 4000);
      return;
    }

    if (newApplicableScope === 'specific' && newSelectedProducts.length === 0) {
      setCouponFormError('Please select at least one product for Specific Products scope.');
      return;
    }

    addCoupon({
      code,
      discountType: newDiscountType,
      discountValue: val,
      minSpend: parseFloat(newMinSpend) || 0,
      description: newDescription.trim() || `${val}${newDiscountType === 'percentage' ? '% Off' : '₹ Flat Off'}`,
      active: true,
      validHours,
      expiresAt,
      maxUses,
      applicableScope: newApplicableScope,
      applicableProducts: newApplicableScope === 'specific' ? newSelectedProducts : undefined
    });

    setNewCouponCode('');
    setNewDiscountValue('20');
    setNewMinSpend('0');
    setNewValidHours('24');
    setNewMaxUses('0');
    setNewApplicableScope('all');
    setNewSelectedProducts([]);
    setNewDescription('');
    setCouponFormError('');
    setCouponSuccessMsg(`Coupon "${code}" created successfully! ${validHours ? `(${validHours}h validity)` : '(Lifetime)'} ${maxUses ? `(${maxUses} uses max)` : '(Unlimited uses)'}`);
    setTimeout(() => setCouponSuccessMsg(''), 3000);
  };

  const handleApplyPreset = (code: string, type: 'percentage' | 'flat', val: number, desc: string, hours: number = 0, maxUses: number = 0) => {
    setNewCouponCode(code);
    setNewDiscountType(type);
    setNewDiscountValue(val.toString());
    setNewDescription(desc);
    setNewValidHours(hours.toString());
    setNewMaxUses(maxUses.toString());
    setNewApplicableScope('all');
    setNewSelectedProducts([]);
    setCouponFormError('');
  };

  const dashboardTabTitle = activeTab && activeTab !== 'menu'
    ? `Dashboard (${activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}) - ${settings?.siteName || 'Arman X Store'}`
    : `Dashboard - ${settings?.siteName || 'Arman X Store'}`;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pt-20 transition-colors duration-300 theme-section">
      <Helmet 
        title={dashboardTabTitle}
        description={`${settings?.siteName || 'Arman X Store'} Administrator Dashboard: Live sales tracker, license inventory, user accounts, and bookkeeping.`}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'menu' ? (
          <div>
            <h1 className="text-3xl font-display font-bold text-white mb-8 theme-text-title">
              Owner Dashboard
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {['Overview', 'Inventory', 'Orders', 'Coupons', 'Spin Wheel', 'Payment Gateway', 'FAQs', 'Customers', 'Analytics', 'Settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleSelectTab(tab.toLowerCase().replace(' ', '-'))}
                  className="p-8 bg-[#121215]/90 border border-white/10 rounded-2xl text-left hover:border-indigo-500/50 hover:bg-[#18181f] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.2)] flex justify-between items-center group cursor-pointer backdrop-blur-xl theme-card"
                >
                  <div className="flex items-center gap-3">
                    {tab === 'FAQs' && (
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                    )}
                    <span className="text-xl font-bold text-white theme-text-title">{tab}</span>
                  </div>
                  <ArrowRight className="w-6 h-6 text-zinc-500 group-hover:text-indigo-400 transition-colors transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center mb-8">
              <button
                onClick={() => handleSelectTab('menu')}
                className="mr-4 p-2 bg-zinc-900/80 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer theme-pill"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-display font-bold text-white theme-text-title">
                {activeTab === 'faqs' || activeTab === 'faq' ? 'Frequently Asked Questions (FAQ)' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
              </h1>
            </div>

            {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Live Pending Gateway Orders Banner for Owner */}
            {allPendingOrders.some(o => o.status === 'pending') && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.15)] animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                    <CreditCard className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-amber-200 flex items-center gap-2">
                      <span>{allPendingOrders.filter(o => o.status === 'pending').length} Active Gateway Orders Pending</span>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                    </h4>
                    <p className="text-xs text-amber-300/80">
                      Customers have initiated payment gateway orders awaiting confirmation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all cursor-pointer shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                >
                  <span>Open Live Orders</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div 
                  key={index} 
                  onClick={() => stat.tab && setActiveTab(stat.tab)}
                  className="bg-[#121215]/90 border border-white/10 hover:border-indigo-500/40 p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] relative overflow-hidden group transition-all backdrop-blur-xl theme-card cursor-pointer"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <stat.icon className="w-16 h-16 text-indigo-500 -mt-4 -mr-4 transform rotate-12" />
                  </div>
                  <div className="relative z-10 flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 rounded-xl">
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-zinc-400 font-medium text-sm mb-1 theme-text-sub">{stat.name}</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-display font-bold text-white theme-text-title">{stat.value}</span>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className={stat.trend === 'up' ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                        {stat.change}
                      </span>
                      <span className="text-zinc-500 ml-1 text-xs">vs last month</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Orders */}
              <div className="lg:col-span-2 bg-[#121215]/90 rounded-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[500px] backdrop-blur-xl theme-card">
                <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0 theme-modal-section">
                  <h2 className="text-lg font-bold text-white theme-text-title">Recent Transactions</h2>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportAllTransactionsCSV}
                      className="text-xs text-emerald-400 font-semibold hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      title="Download transaction history CSV for offline bookkeeping"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('orders')}
                      className="text-sm text-indigo-400 font-medium hover:text-indigo-300 flex items-center transition-colors cursor-pointer"
                    >
                      View All <ArrowUpRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto overflow-y-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-black/80 backdrop-blur-md">
                      <tr>
                        <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Order ID</th>
                        <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Timestamp</th>
                        <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Customer & WhatsApp</th>
                        <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10 text-right">Amount (₹)</th>
                        <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10 text-center">Payment Status</th>
                        <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Product & Keys</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {purchases.slice(0, 10).map((order) => {
                        const invItem = inventory.find(i => i.value === order.value);
                        const orderAmt = order.amount ?? (invItem?.price ? invItem.price * order.keys.length : 0);
                        const user = users.find(u => u.uid === order.userId || (order.userEmail && u.email === order.userEmail));
                        const custName = order.customerName || user?.displayName || (order.userEmail ? order.userEmail.split('@')[0] : 'Customer');
                        const custPhone = order.customerPhone || user?.phone;
                        
                        return (
                          <tr key={order.id} className="hover:bg-white/[0.03] transition-colors">
                            {/* Order ID */}
                            <td className="py-3.5 px-5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                  {order.id}
                                </span>
                                <button
                                  onClick={() => handleCopyOrderId(order.id)}
                                  className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-white/5 rounded transition-colors"
                                  title="Copy Order ID"
                                >
                                  {copiedOrderId === order.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Timestamp */}
                            <td className="py-3.5 px-5 text-xs text-zinc-300 font-mono">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-500" />
                                <span>{formatFullDateTime(order.date)}</span>
                              </div>
                            </td>

                            {/* Customer & WhatsApp */}
                            <td className="py-3.5 px-5 text-xs text-zinc-300">
                              <div className="font-bold text-white truncate max-w-[180px] flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span>{custName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {custPhone ? (
                                  <a
                                    href={`https://wa.me/91${custPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${custName}, aapka Arman X Store order #${order.id} verified hai.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 transition-colors shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                    title="Click to chat with customer on WhatsApp"
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>+91 {custPhone}</span>
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-zinc-400 font-mono">
                                    {order.userEmail || (order.userId === 'anonymous' ? 'Web Buyer' : `UID: ${order.userId?.slice(0, 8)}`)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="py-3.5 px-5 text-xs font-bold text-emerald-400 font-mono text-right">
                              ₹{orderAmt.toLocaleString()}
                            </td>

                            {/* Payment Status */}
                            <td className="py-3.5 px-5 text-xs text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                <span>Success</span>
                              </span>
                            </td>

                            {/* Product / Details & Keys */}
                            <td className="py-3.5 px-5 text-xs text-zinc-300">
                              <div className="font-medium text-zinc-200">
                                {resolveProductName(order.category, settings.categories, inventory)} - {order.label}
                              </div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                <span>{order.keys.length} {order.keys.length === 1 ? 'Key' : 'Keys'}</span>
                                {order.keys.length > 0 && (
                                  <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-500/20 truncate max-w-[160px]">
                                    {order.keys[0]}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {purchases.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-zinc-500 text-sm">No recent transactions.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Real-time Inventory & Stock Alerts */}
              <div className="bg-[#121215]/90 rounded-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col backdrop-blur-xl theme-card">
                <div className="px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0 theme-modal-section">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white theme-text-title">Live Key Inventory</h2>
                      <p className="text-[11px] text-zinc-400 theme-text-sub">Real-time stock levels & automatic replenishment</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('inventory')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Manage All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto max-h-96 space-y-5">
                  <div className="space-y-5">
                    {settings.categories.map(category => {
                      const catItems = inventory.filter(i => i.category === category.id);
                      if (catItems.length === 0) return null;

                      return (
                        <div key={category.id} className="space-y-2.5">
                          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                            <span>{category.name}</span>
                            <span className="text-[10px] text-zinc-500 lowercase font-normal">{catItems.length} plans</span>
                          </h3>
                          <div className="space-y-2">
                            {catItems.map((item, i) => {
                              const isLow = item.stock > 0 && item.stock <= 3;
                              const isOut = item.stock === 0;

                              return (
                                <div 
                                  key={i} 
                                  className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all group"
                                >
                                  <div>
                                    <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                                      <span>{item.label}</span>
                                      {isOut && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                          EMPTY
                                        </span>
                                      )}
                                      {isLow && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                          LOW
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-zinc-400 font-mono">
                                      ₹{item.price} • {item.stock} keys in stock
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                                      isOut 
                                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                                        : isLow 
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    }`}>
                                      {item.stock > 0 ? `${item.stock} Available` : 'Out of Stock'}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setActiveTab('inventory');
                                        setManageKeysProduct(item.value);
                                      }}
                                      className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg border border-indigo-500/30 transition-all text-xs font-bold cursor-pointer"
                                      title={`Restock ${item.label}`}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => setActiveTab('inventory')} 
                    className="w-full mt-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Manage & Restock Licenses</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] p-6 overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-6 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">Manage Inventory</h2>
            <div className="space-y-8">
              {settings.categories.map((category) => (
                <div key={category.id}>
                  <h3 className="text-lg font-bold text-fuchsia-400 mb-4 drop-shadow-[0_0_5px_rgba(224,0,255,0.5)]">{category.name}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-950/50">
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Product</th>
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-center">Price</th>
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-center">Current Stock</th>
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {inventory.filter(i => i.category === category.id).map((item) => (
                          <tr key={item.value} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="py-4 px-6 text-sm font-medium text-zinc-300">{item.label}</td>
                            <td className="py-4 px-6 text-sm text-zinc-400 text-center font-medium">₹{item.price}</td>
                            <td className="py-4 px-6 text-sm text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${item.stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]'}`}>
                                {item.stock} Available
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center justify-end space-x-2">
                                  <textarea
                                    rows={1}
                                    value={newKeysInput[item.value] || ''}
                                    onChange={(e) => setNewKeysInput({...newKeysInput, [item.value]: e.target.value})}
                                    placeholder="Paste keys (1/line)"
                                    className="w-48 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-600 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 resize-y min-h-[38px]"
                                  />
                                  <button
                                    onClick={() => handleAddKeys(item.value)}
                                    disabled={!newKeysInput[item.value]?.trim()}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_10px_rgba(99,102,241,0.3)] shrink-0 h-[38px] cursor-pointer"
                                  >
                                    Add Keys
                                  </button>
                                  <button
                                    onClick={() => setManageKeysProduct(item.value)}
                                    className="px-4 py-2 bg-zinc-800 text-white text-sm font-semibold rounded-lg hover:bg-zinc-700 transition-colors shadow-[0_0_10px_rgba(255,255,255,0.05)] shrink-0 h-[38px] cursor-pointer"
                                  >
                                    Manage Keys
                                  </button>

                                  {deleteProductConfirmId === item.value ? (
                                    <div className="flex flex-col items-end gap-1 ml-2">
                                      <span className="text-xs text-zinc-400">Are you sure?</span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            deleteProduct(item.value);
                                            setDeleteProductConfirmId(null);
                                          }}
                                          className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-colors"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          onClick={() => setDeleteProductConfirmId(null)}
                                          className="px-2 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded text-xs transition-colors"
                                        >
                                          No
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setDeleteProductConfirmId(item.value)}
                                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                                      title="Delete Product"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                                {keysFeedbackMsg[item.value] && (
                                  <div className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg animate-in fade-in max-w-sm text-right">
                                    {keysFeedbackMsg[item.value]}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-bold text-white mb-4">Add New Product</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full sm:w-auto px-4 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20"
                >
                  <option value="" disabled>Select Product</option>
                  {settings.categories.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Plan / Duration (e.g. 1 Day, 30 Days)"
                  value={newProduct.label}
                  onChange={(e) => setNewProduct({ ...newProduct, label: e.target.value })}
                  className="w-full sm:w-64 px-4 py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20"
                />
                <div className="relative w-full sm:w-48">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">₹</span>
                  <input
                    type="number"
                    placeholder="Price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20"
                  />
                </div>
                <button
                  onClick={handleCreateProduct}
                  disabled={!newProduct.label || !newProduct.price}
                  className="w-full sm:w-auto px-6 py-2 bg-fuchsia-600 text-white text-sm font-medium rounded-xl hover:bg-fuchsia-500 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(224,0,255,0.4)] hover:shadow-[0_0_20px_rgba(224,0,255,0.6)]"
                >
                  Create Product
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] p-6 overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-6 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">Store Settings</h2>
            
            <div className="space-y-8 max-w-2xl">
              <div className="border-b border-zinc-800 pb-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Site Name</label>
                  <input
                    type="text"
                    value={draftSiteName}
                    onChange={(e) => {
                      setDraftSiteName(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Site Logo URL (or upload)</label>
                  <div className="flex items-center gap-3">
                    {draftSiteLogoUrl && <img src={draftSiteLogoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0" />}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setDraftSiteLogoUrl(reader.result as string);
                            setHasChanges(true);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-fuchsia-500/10 file:text-fuchsia-400 hover:file:bg-fuchsia-500/20 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-300">Products (Catalog)</h3>
                  <p className="text-xs text-zinc-500">Configure product names, logos, and appearances</p>
                </div>
                <button
                  onClick={handleCreateCategory}
                  className="px-4 py-2 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 text-sm font-medium rounded-xl hover:bg-fuchsia-500/20 transition-colors shadow-[0_0_10px_rgba(224,0,255,0.1)]"
                >
                  + Add Product
                </button>
              </div>

              {draftCategories.map((category, index) => (
                <div key={category.id} className={index > 0 ? "border-t border-zinc-800 pt-8" : ""}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-white">{category.name || 'New Product'}</h4>
                    {deleteCategoryConfirmId === category.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">Are you sure?</span>
                        <button
                          onClick={() => {
                            const updated = draftCategories.filter(c => c.id !== category.id);
                            setDraftCategories(updated);
                            setHasChanges(true);
                            setDeleteCategoryConfirmId(null);
                          }}
                          className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                        >
                          Yes, Delete
                        </button>
                        <button
                          onClick={() => setDeleteCategoryConfirmId(null)}
                          className="px-3 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteCategoryConfirmId(category.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Product Name</label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => {
                          const updated = draftCategories.map(c => c.id === category.id ? { ...c, name: e.target.value } : c);
                          setDraftCategories(updated);
                          setHasChanges(true);
                        }}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Logo (Upload / File)</label>
                      <div className="flex items-center gap-3">
                        {category.logoUrl && <img src={category.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0" />}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(category.id, e.target.files?.[0] || null)}
                          className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-fuchsia-500/10 file:text-fuchsia-400 hover:file:bg-fuchsia-500/20 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Broadcast Announcement Banner Setting */}
              <div className="p-5 bg-[#121215]/90 border border-white/10 rounded-2xl space-y-4 backdrop-blur-xl theme-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Storewide Announcement Banner</h4>
                      <p className="text-xs text-zinc-400">Broadcast discounts, news or alert ticker to all customers on the store</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftAnnouncementEnabled(!draftAnnouncementEnabled);
                      setHasChanges(true);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      draftAnnouncementEnabled
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {draftAnnouncementEnabled ? 'Active / Visible' : 'Hidden'}
                  </button>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Announcement Ticker Text</label>
                  <input
                    type="text"
                    value={draftAnnouncementText}
                    onChange={(e) => {
                      setDraftAnnouncementText(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder="e.g. ⚡ Flash Sale Live: Instant UPI Delivery 24/7. Use coupon VIP20 for special discounts!"
                    className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              {/* Customer Support Channels */}
              <div className="p-5 bg-[#121215]/90 border border-white/10 rounded-2xl space-y-4 backdrop-blur-xl theme-card">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Direct Support Channels</h4>
                    <p className="text-xs text-zinc-400">Configure your official WhatsApp & Telegram support links</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">WhatsApp Number (with country code)</label>
                    <input
                      type="text"
                      value={draftWhatsappSupport}
                      onChange={(e) => {
                        setDraftWhatsappSupport(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="919876543210"
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Telegram Username (without @)</label>
                    <input
                      type="text"
                      value={draftTelegramSupport}
                      onChange={(e) => {
                        setDraftTelegramSupport(e.target.value);
                        setHasChanges(true);
                      }}
                      placeholder="FATHERXSIR"
                      className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Full Store Database Backup (JSON Export) */}
              <div className="p-5 bg-gradient-to-r from-emerald-950/30 via-cyan-950/20 to-black/40 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Full Store Database Backup (JSON)
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Download a single JSON file containing all products, license keys, coupons, orders, and customer accounts.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportStoreBackupJSON}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 shrink-0 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup JSON</span>
                </button>
              </div>

              {/* Payment Gateway Shortcut Banner */}
              <div className="p-5 bg-gradient-to-r from-indigo-950/40 via-violet-950/30 to-zinc-950 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      Payment Gateway & API Keys
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {settings.payment?.isPaymentEnabled !== false ? 'Active' : 'Disabled'}
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Configure FamGateway, delete or enter new API keys, custom UPI ID & QR codes.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('payment-gateway')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)] flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  Manage Payment System
                </button>
              </div>

              {hasChanges && (
                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-end gap-4 relative z-10">
                  <button
                    onClick={handleDiscardChanges}
                    className="px-6 py-2.5 bg-zinc-800 text-zinc-300 font-semibold rounded-xl hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save All Changes</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Export Success Toast */}
            {csvExportSuccessMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-emerald-400 animate-in fade-in shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-emerald-300">CSV Export Complete</h5>
                    <p className="text-xs text-emerald-400/90">{csvExportSuccessMsg}</p>
                  </div>
                </div>
                <button
                  onClick={() => setCsvExportSuccessMsg('')}
                  className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick KPI Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#121215]/90 border border-white/10 p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl theme-card">
                <span className="text-xs text-zinc-400 block mb-1 theme-text-sub">Total Key Sales Revenue</span>
                <div className="text-2xl font-bold text-emerald-400 font-display">₹{totalRevenue.toLocaleString()}</div>
                <span className="text-[11px] text-zinc-500 mt-1 block">From {purchases.length} completed key orders</span>
              </div>

              <div className="bg-[#121215]/90 border border-white/10 p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl theme-card">
                <span className="text-xs text-zinc-400 block mb-1 theme-text-sub">Total Wallet Deposits</span>
                <div className="text-2xl font-bold text-cyan-400 font-display">
                  ₹{allWalletTransactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + (t.amount || 0), 0).toLocaleString()}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">From UPI / QR Gateway top-ups</span>
              </div>

              <div className="bg-[#121215]/90 border border-white/10 p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl theme-card">
                <span className="text-xs text-zinc-400 block mb-1 theme-text-sub">Active QR & Orders Feed</span>
                <div className="text-2xl font-bold text-amber-400 font-display">
                  {allPendingOrders.filter(o => o.status === 'pending').length} Pending
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">Live QR generated by users</span>
              </div>

              <div className="bg-[#121215]/90 border border-white/10 p-5 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl theme-card">
                <span className="text-xs text-zinc-400 block mb-1 theme-text-sub">Total Transaction Logs</span>
                <div className="text-2xl font-bold text-fuchsia-400 font-display">
                  {purchases.length + allWalletTransactions.length}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">Combined order & payment records</span>
              </div>
            </div>

            {/* LIVE GATEWAY ORDERS & REAL-TIME TRANSACTION MONITOR */}
            <div className="bg-[#121215]/90 rounded-2xl border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.1)] overflow-hidden flex flex-col backdrop-blur-xl theme-card">
              <div className="p-6 border-b border-white/10 space-y-4 theme-modal-section bg-gradient-to-r from-amber-500/10 via-transparent to-purple-500/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <h2 className="text-lg font-bold text-white theme-text-title flex items-center gap-2">
                        <span>Live Payment Gateway Orders Monitor</span>
                        <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                          <span>Real-time Feed</span>
                        </span>
                      </h2>
                    </div>
                    <p className="text-xs text-zinc-400 theme-text-sub">
                      जैसे ही कोई कस्टमर पेमेंट गेटवे पर ऑर्डर शुरू करता है, उसका ऑर्डर आईडी (Order ID), तारीख और समय (Date & Time) और लाइव स्टेटस (Pending / Success / Failed) यहाँ तुरंत दिखाई देता है।
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                    {(['all', 'pending', 'success', 'failed'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => setQrStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                          qrStatusFilter === st
                            ? 'bg-amber-500 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.4)] font-bold'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {st === 'all' ? `All (${allPendingOrders.length})` : st === 'pending' ? `🟡 Pending (${allPendingOrders.filter(o => o.status === 'pending').length})` : st === 'success' ? `🟢 Success (${allPendingOrders.filter(o => o.status === 'completed' || o.status === 'success').length})` : `🔴 Failed (${allPendingOrders.filter(o => o.status === 'failed').length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Search & Toast Status message */}
                {qrActionMsg && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between animate-in fade-in">
                    <span>{qrActionMsg}</span>
                    <button onClick={() => setQrActionMsg('')} className="text-zinc-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={qrSearchQuery}
                    onChange={(e) => setQrSearchQuery(e.target.value)}
                    placeholder="Search by Order ID (fg_...), Customer Email, UID, or Product..."
                    className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {qrSearchQuery && (
                    <button
                      onClick={() => setQrSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* QR Orders Table */}
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950/80 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Order ID & Type</th>
                      <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Date & Time</th>
                      <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Customer</th>
                      <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Amount</th>
                      <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10">Live Status</th>
                      <th className="py-3 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-white/10 text-right">Owner Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {allPendingOrders
                      .filter(o => {
                        if (qrStatusFilter !== 'all' && (o.status === 'completed' ? 'success' : o.status) !== qrStatusFilter) return false;
                        if (qrSearchQuery) {
                          const q = qrSearchQuery.toLowerCase();
                          return (
                            (o.orderId || '').toLowerCase().includes(q) ||
                            (o.customerName || '').toLowerCase().includes(q) ||
                            (o.customerPhone || '').toLowerCase().includes(q) ||
                            (o.userEmail || '').toLowerCase().includes(q) ||
                            (o.userId || '').toLowerCase().includes(q) ||
                            (o.productName || '').toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((ord) => {
                        const isSuccess = ord.status === 'completed' || ord.status === 'success';
                        const isPending = ord.status === 'pending';
                        const isFailed = ord.status === 'failed';
                        const isVerifying = verifyingOrderId === ord.orderId;

                        return (
                          <tr key={ord.orderId} className="hover:bg-white/[0.03] transition-colors">
                            {/* Order ID */}
                            <td className="py-3.5 px-5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                  {ord.orderId}
                                </span>
                                <button
                                  onClick={() => handleCopyOrderId(ord.orderId)}
                                  className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-white/5 rounded transition-colors"
                                  title="Copy Order ID"
                                >
                                  {copiedOrderId === ord.orderId ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-1">
                                {ord.productName || (ord.type === 'balance' ? 'Wallet Deposit (QR)' : 'Key Purchase')}
                              </div>
                            </td>

                            {/* Date & Time */}
                            <td className="py-3.5 px-5 text-xs text-zinc-300">
                              <div className="font-medium text-white flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-zinc-500" />
                                <span>{formatFullDateTime(ord.createdAt)}</span>
                              </div>
                              {ord.paidAt && (
                                <div className="text-[10px] text-emerald-400 mt-0.5">
                                  Paid: {formatFullDateTime(ord.paidAt)}
                                </div>
                              )}
                            </td>

                            {/* Customer Details */}
                            <td className="py-3.5 px-5 text-xs text-zinc-300">
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span>{ord.customerName || (ord.userEmail ? ord.userEmail.split('@')[0] : 'Customer')}</span>
                              </div>
                              
                              {/* Customer Gmail / Email ID */}
                              {ord.userEmail ? (
                                <div className="flex items-center gap-1 mt-1 text-xs font-mono text-zinc-200 bg-zinc-900/80 px-2 py-0.5 rounded border border-white/10 max-w-[220px]">
                                  <Mail className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span className="truncate">{ord.userEmail}</span>
                                  <button
                                    onClick={() => handleCopyText(ord.userEmail!, `email_ord_${ord.orderId}`)}
                                    className="text-zinc-500 hover:text-white ml-auto shrink-0 p-0.5"
                                    title="Copy Customer Gmail ID"
                                  >
                                    {copiedText === `email_ord_${ord.orderId}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1">
                                  <Mail className="w-2.5 h-2.5 text-zinc-600" />
                                  <span>No email provided</span>
                                </div>
                              )}

                              {ord.customerPhone ? (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="font-mono text-emerald-400 font-semibold text-xs">+91 {ord.customerPhone}</span>
                                  <a
                                    href={`https://wa.me/91${ord.customerPhone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(ord.customerName || 'Customer')},%20regarding%20your%20order%20${ord.orderId}%20at%20Arman%20X%20Store`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                    title="Open WhatsApp Chat"
                                  >
                                    <MessageCircle className="w-2.5 h-2.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                </div>
                              ) : null}

                              {ord.deliveredKeys && ord.deliveredKeys.length > 0 && (
                                <div className="mt-1.5 p-1 px-2 rounded bg-black/70 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 flex items-center justify-between gap-1">
                                  <span className="truncate max-w-[130px] font-bold">{ord.deliveredKeys[0]}</span>
                                  <button
                                    onClick={() => handleCopyText(ord.deliveredKeys![0], `key_${ord.orderId}`)}
                                    className="text-zinc-400 hover:text-white"
                                    title="Copy Delivered Key"
                                  >
                                    {copiedText === `key_${ord.orderId}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Amount */}
                            <td className="py-3.5 px-5 text-xs font-bold text-emerald-400 font-mono">
                              ₹{ord.amount}
                            </td>

                            {/* Live Status */}
                            <td className="py-3.5 px-5 text-xs">
                              {isSuccess ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  <span>SUCCESS / PAID</span>
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse">
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                  <span>PENDING (Waiting Scan)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/60 text-rose-400 border border-rose-500/30">
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                  <span>FAILED / EXPIRED</span>
                                </span>
                              )}
                            </td>

                            {/* Owner Actions */}
                            <td className="py-3.5 px-5 text-xs text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleVerifyLiveOrder(ord)}
                                  disabled={isVerifying}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg border border-white/10 transition-colors cursor-pointer text-[11px] font-semibold disabled:opacity-50"
                                  title="Check with FamGateway API"
                                >
                                  <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
                                  <span>{isVerifying ? 'Checking...' : 'Verify'}</span>
                                </button>

                                {isPending && (
                                  <button
                                    onClick={() => handleManualMarkOrderSuccess(ord)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-semibold transition-colors cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                    title="Manually mark as paid & credit user"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Mark Paid</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {allPendingOrders.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                          No active QR or payment orders generated yet. As soon as a user generates a QR, it will appear here in real-time.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Main Transactions Card */}
            <div className="bg-[#121215]/90 rounded-2xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col min-h-[550px] backdrop-blur-xl theme-card">
              {/* Header & Export Toolbar */}
              <div className="p-6 border-b border-white/10 space-y-4 theme-modal-section">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white theme-text-title flex items-center gap-2.5">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      All Transactions & Bookkeeping
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5 theme-text-sub">
                      Export transaction history of all users to CSV for offline bookkeeping, sales reports, and accounting.
                    </p>
                  </div>

                  {/* Action Buttons: Primary Download CSV + Dropdown */}
                  <div className="flex items-center gap-2.5 relative shrink-0">
                    <button
                      onClick={handleExportAllTransactionsCSV}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all cursor-pointer border border-emerald-400/30"
                      title="Download full consolidated transaction CSV for offline bookkeeping"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download CSV</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className="p-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Export options"
                      >
                        <span>Export Options</span>
                        <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${showExportMenu ? 'rotate-90' : ''}`} />
                      </button>

                      {showExportMenu && (
                        <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] py-2 z-50 animate-in fade-in zoom-in-95">
                          <div className="px-4 py-2 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            Choose CSV Format
                          </div>
                          
                          <button
                            onClick={handleExportAllTransactionsCSV}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-800/80 text-xs text-white flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="font-semibold text-emerald-300">All Transactions (Full Bookkeeping)</div>
                              <div className="text-[10px] text-zinc-500">Consolidated orders, deposits, & refunds</div>
                            </div>
                          </button>

                          <button
                            onClick={handleExportOrdersCSV}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-800/80 text-xs text-white flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <ShoppingCart className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="font-semibold text-zinc-200">Key Purchase Orders Only</div>
                              <div className="text-[10px] text-zinc-500">Key codes, product plans & quantities</div>
                            </div>
                          </button>

                          <button
                            onClick={handleExportWalletTxnsCSV}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-800/80 text-xs text-white flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <Wallet className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="font-semibold text-zinc-200">Wallet Deposits & Refunds</div>
                              <div className="text-[10px] text-zinc-500">UPI gateway top-ups & UTR references</div>
                            </div>
                          </button>

                          <button
                            onClick={handleExportLiveQrOrdersCSV}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-800/80 text-xs text-white flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <QrCode className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="font-semibold text-amber-300">Live QR & Generated Orders</div>
                              <div className="text-[10px] text-zinc-500">All generated QRs, Order IDs, Date & Time, & Statuses</div>
                            </div>
                          </button>

                          <button
                            onClick={handleExportCustomersSummaryCSV}
                            className="w-full text-left px-4 py-2.5 hover:bg-zinc-800/80 text-xs text-white flex items-center gap-2.5 transition-colors cursor-pointer group"
                          >
                            <Users className="w-4 h-4 text-fuchsia-400 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="font-semibold text-zinc-200">Customer Accounts Directory</div>
                              <div className="text-[10px] text-zinc-500">User balances, lifetime spend & dates</div>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                  <div className="md:col-span-8 relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={txnSearchQuery}
                      onChange={(e) => setTxnSearchQuery(e.target.value)}
                      placeholder="Search by Order ID, Txn ID, User Email, UID, Product, or UTR..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                    {txnSearchQuery && (
                      <button
                        onClick={() => setTxnSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="md:col-span-4">
                    <select
                      value={txnTypeFilter}
                      onChange={(e) => setTxnTypeFilter(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-zinc-300 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Types ({purchases.length + allWalletTransactions.length})</option>
                      <option value="orders">Key Purchase Orders ({purchases.length})</option>
                      <option value="deposits">Wallet Deposits ({allWalletTransactions.filter(t => t.type === 'deposit').length})</option>
                      <option value="refunds">Refunds & Adjustments ({allWalletTransactions.filter(t => t.type !== 'deposit').length})</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950/60 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="py-3.5 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Order ID</th>
                      <th className="py-3.5 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Timestamp</th>
                      <th className="py-3.5 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Customer & WhatsApp</th>
                      <th className="py-3.5 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right">Amount (₹)</th>
                      <th className="py-3.5 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-center">Payment Status</th>
                      <th className="py-3.5 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Type</th>
                      <th className="py-3.5 px-5 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Item & Keys</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {(() => {
                      const query = txnSearchQuery.trim().toLowerCase();

                      // Prepare list of rows
                      type DisplayTxn = {
                        id: string;
                        date: string;
                        timestamp: number;
                        type: 'order' | 'deposit' | 'refund' | 'adjustment' | 'deduction' | 'qr_pending';
                        userId: string;
                        userEmail?: string;
                        customerName?: string;
                        customerPhone?: string;
                        displayName?: string;
                        title: string;
                        subtitle: string;
                        reference: string;
                        keysCount?: number;
                        keys?: string[];
                        amount: number;
                        status: string;
                        coupon?: string;
                      };

                      const rows: DisplayTxn[] = [];

                      // Add purchases
                      if (txnTypeFilter === 'all' || txnTypeFilter === 'orders') {
                        purchases.forEach((p) => {
                          const user = users.find(u => u.uid === p.userId || (p.userEmail && u.email === p.userEmail));
                          const productName = resolveProductName(p.category, settings.categories, inventory);
                          const invItem = inventory.find(i => i.value === p.value);
                          const calculatedAmount = p.amount ?? (invItem?.price ? invItem.price * p.keys.length : 0);
                          const d = new Date(p.date);

                          rows.push({
                            id: p.id,
                            date: p.date,
                            timestamp: isNaN(d.getTime()) ? 0 : d.getTime(),
                            type: 'order',
                            userId: p.userId,
                            userEmail: p.userEmail || user?.email,
                            customerName: p.customerName || user?.displayName,
                            customerPhone: p.customerPhone || user?.phone,
                            displayName: p.customerName || user?.displayName || user?.customId || 'Customer',
                            title: `${productName} - ${p.label}`,
                            subtitle: p.category,
                            reference: p.couponCode ? `Coupon: ${p.couponCode}` : 'Key Purchase',
                            keysCount: p.keys.length,
                            keys: p.keys,
                            amount: calculatedAmount,
                            status: 'Success',
                            coupon: p.couponCode
                          });
                        });
                      }

                      // Add wallet transactions
                      if (txnTypeFilter === 'all' || txnTypeFilter === 'deposits' || txnTypeFilter === 'refunds') {
                        allWalletTransactions.forEach((t) => {
                          if (txnTypeFilter === 'deposits' && t.type !== 'deposit') return;
                          if (txnTypeFilter === 'refunds' && t.type === 'deposit') return;

                          const user = users.find(u => u.uid === t.userId || (t.userEmail && u.email === t.userEmail));
                          const d = new Date(t.date);

                          rows.push({
                            id: t.id,
                            date: t.date,
                            timestamp: isNaN(d.getTime()) ? 0 : d.getTime(),
                            type: t.type,
                            userId: t.userId,
                            userEmail: t.userEmail || user?.email,
                            customerName: user?.displayName,
                            customerPhone: user?.phone,
                            displayName: user?.displayName || user?.customId || 'Customer',
                            title: t.type === 'deposit' 
                              ? 'Wallet Deposit' 
                              : t.type === 'refund' 
                              ? 'Wallet Refund' 
                              : t.type === 'adjustment' 
                              ? 'Balance Adjustment' 
                              : 'Wallet Deduction',
                            subtitle: t.method || (t.type === 'deposit' ? 'UPI Gateway' : 'Store Admin'),
                            reference: t.referenceId ? `Ref: ${t.referenceId}` : (t.note || 'N/A'),
                            amount: t.amount,
                            status: t.status === 'completed' || t.status === 'success' ? 'Success' : t.status === 'pending' ? 'Pending' : (t.status || 'Success')
                          });
                        });
                      }

                      // Add active pending and live QR orders
                      allPendingOrders.forEach((po) => {
                        if (rows.some(r => r.id === po.orderId)) return;
                        const user = users.find(u => u.uid === po.userId || (po.userEmail && u.email === po.userEmail));
                        const d = new Date(po.createdAt);
                        const isDeposit = po.type === 'qr_deposit' || po.productName?.toLowerCase().includes('balance') || po.productName?.toLowerCase().includes('wallet');

                        if (txnTypeFilter === 'orders' && isDeposit) return;
                        if (txnTypeFilter === 'deposits' && !isDeposit) return;
                        if (txnTypeFilter === 'refunds') return;

                        rows.push({
                          id: po.orderId,
                          date: po.createdAt,
                          timestamp: isNaN(d.getTime()) ? Date.now() : d.getTime(),
                          type: isDeposit ? 'deposit' : 'order',
                          userId: po.userId || 'anonymous',
                          userEmail: po.userEmail || user?.email,
                          customerName: po.customerName || user?.displayName,
                          customerPhone: po.customerPhone || user?.phone,
                          displayName: po.customerName || user?.displayName || user?.customId || 'Customer',
                          title: po.productName || (isDeposit ? 'Wallet Deposit (UPI QR)' : 'Direct Key Purchase'),
                          subtitle: po.durationLabel || po.paymentMethod || 'FamGateway QR',
                          reference: po.paymentMethod || 'FamGateway UPI QR',
                          keysCount: isDeposit ? 0 : (po.deliveredKeys?.length || 1),
                          keys: po.deliveredKeys,
                          amount: po.amount,
                          status: po.status === 'completed' || po.status === 'success' ? 'Success' : po.status === 'failed' ? 'Failed' : 'Pending',
                          coupon: po.couponCode
                        });
                      });

                      // Filter by search query
                      const filtered = rows.filter(r => {
                        if (!query) return true;
                        return (
                          r.id.toLowerCase().includes(query) ||
                          r.userId.toLowerCase().includes(query) ||
                          (r.userEmail && r.userEmail.toLowerCase().includes(query)) ||
                          (r.customerName && r.customerName.toLowerCase().includes(query)) ||
                          (r.customerPhone && r.customerPhone.toLowerCase().includes(query)) ||
                          (r.displayName && r.displayName.toLowerCase().includes(query)) ||
                          r.title.toLowerCase().includes(query) ||
                          r.reference.toLowerCase().includes(query) ||
                          r.status.toLowerCase().includes(query) ||
                          (r.keys && r.keys.some(k => k.toLowerCase().includes(query)))
                        );
                      });

                      // Sort newest first
                      filtered.sort((a, b) => b.timestamp - a.timestamp);

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="py-16 text-center text-zinc-500">
                              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                              <p className="text-base font-medium text-zinc-300">No transactions match your search</p>
                              <p className="text-xs text-zinc-500 mt-1">Try clearing filters or search terms.</p>
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((txn) => {
                        const isOrder = txn.type === 'order';
                        const isDeposit = txn.type === 'deposit';
                        const isRefund = txn.type === 'refund';
                        const isAdjustment = txn.type === 'adjustment';
                        const isSuccess = txn.status.toLowerCase() === 'success' || txn.status.toLowerCase() === 'completed';
                        const isPending = txn.status.toLowerCase() === 'pending';

                        return (
                          <tr key={txn.id} className="hover:bg-zinc-800/40 transition-colors group">
                            {/* Order ID */}
                            <td className="py-4 px-5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                  {txn.id}
                                </span>
                                <button
                                  onClick={() => handleCopyOrderId(txn.id)}
                                  className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-white/5 rounded transition-colors cursor-pointer"
                                  title="Copy Order ID"
                                >
                                  {copiedOrderId === txn.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Timestamp */}
                            <td className="py-4 px-5 text-xs text-zinc-300 font-mono">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                                <span>{formatFullDateTime(txn.date)}</span>
                              </div>
                            </td>

                            {/* Customer & WhatsApp */}
                            <td className="py-4 px-5 text-xs">
                              <div className="font-bold text-white text-sm truncate max-w-[200px] flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span>{txn.customerName || txn.displayName || (txn.userId === 'anonymous' ? 'Customer' : txn.userId)}</span>
                              </div>

                              {/* Customer Gmail ID */}
                              {txn.userEmail ? (
                                <div className="flex items-center gap-1 mt-1 text-[11px] font-mono text-zinc-300 bg-zinc-900/80 px-2 py-0.5 rounded border border-white/10 max-w-[220px]">
                                  <Mail className="w-3 h-3 text-indigo-400 shrink-0" />
                                  <span className="truncate">{txn.userEmail}</span>
                                  <button
                                    onClick={() => handleCopyText(txn.userEmail!, `email_txn_${txn.id}`)}
                                    className="text-zinc-500 hover:text-white ml-auto shrink-0 p-0.5"
                                    title="Copy Customer Gmail ID"
                                  >
                                    {copiedText === `email_txn_${txn.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              ) : (
                                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                  {txn.userId === 'anonymous' ? 'Web Buyer' : `@${txn.userId.substring(0, 10)}`}
                                </div>
                              )}

                              {/* WhatsApp Contact Link */}
                              {txn.customerPhone && (
                                <div className="mt-1">
                                  <a
                                    href={`https://wa.me/91${txn.customerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${txn.customerName || ''}, aapka Arman X Store order #${txn.id} verified hai.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 transition-colors shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                    title="Click to chat on WhatsApp"
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span>+91 {txn.customerPhone}</span>
                                  </a>
                                </div>
                              )}
                            </td>

                            {/* Amount */}
                            <td className="py-4 px-5 text-right font-mono">
                              <span className={`text-sm font-bold ${
                                isDeposit || isRefund || (isAdjustment && txn.amount > 0)
                                  ? 'text-emerald-400'
                                  : 'text-zinc-200'
                              }`}>
                                {isDeposit || isRefund || (isAdjustment && txn.amount > 0) ? '+' : ''}₹{txn.amount.toLocaleString()}
                              </span>
                            </td>

                            {/* Payment Status */}
                            <td className="py-4 px-5 text-center">
                              {isSuccess ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  <span>Success</span>
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)] animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  <span>Pending</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-500/30">
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                  <span>{txn.status}</span>
                                </span>
                              )}
                            </td>

                            {/* Type Badge */}
                            <td className="py-4 px-5">
                              {isOrder && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                  <ShoppingCart className="w-3 h-3" />
                                  Key Order
                                </span>
                              )}
                              {isDeposit && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <ArrowDownLeft className="w-3 h-3" />
                                  Deposit (UPI)
                                </span>
                              )}
                              {isRefund && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <RefreshCw className="w-3 h-3" />
                                  Refund
                                </span>
                              )}
                              {isAdjustment && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                                  <Wallet className="w-3 h-3" />
                                  Adjustment
                                </span>
                              )}
                              {!isOrder && !isDeposit && !isRefund && !isAdjustment && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  Deduction
                                </span>
                              )}
                            </td>

                            {/* Item & Keys */}
                            <td className="py-4 px-5 text-xs text-zinc-300">
                              <div className="font-medium text-zinc-200">{txn.title}</div>
                              {txn.keys && txn.keys.length > 0 ? (
                                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                  {txn.keys.map((k, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                                      <Key className="w-2.5 h-2.5 text-emerald-400" />
                                      <span>{k}</span>
                                      <button
                                        onClick={() => handleCopyText(k, `key_${txn.id}_${i}`)}
                                        className="text-zinc-400 hover:text-white p-0.5"
                                        title="Copy key"
                                      >
                                        {copiedText === `key_${txn.id}_${i}` ? (
                                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                                        ) : (
                                          <Copy className="w-2.5 h-2.5" />
                                        )}
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[11px] text-zinc-500 mt-0.5">
                                  {txn.reference}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with quick download shortcut */}
              <div className="p-4 border-t border-white/10 bg-zinc-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Real-time records from Firebase & LocalStore</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleExportAllTransactionsCSV}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer underline underline-offset-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Complete CSV File (.csv)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-8">
            {/* Top User Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Users</p>
                  <p className="text-3xl font-bold font-display text-white">{users.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">All registered accounts</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Active Buyers</p>
                  <p className="text-3xl font-bold font-display text-emerald-400">{users.filter(u => u.totalOrders > 0).length}</p>
                  <p className="text-xs text-zinc-500 mt-1">Users with completed orders</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShoppingCart className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Customer Spend</p>
                  <p className="text-3xl font-bold font-display text-white">₹{users.reduce((sum, u) => sum + (u.totalSpent || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-1">Lifetime user purchases</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Wallet Funds</p>
                  <p className="text-3xl font-bold font-display text-fuchsia-400">₹{users.reduce((sum, u) => sum + (u.balance || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-1">Circulating user balances</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Main Users Table Container */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] overflow-hidden flex flex-col">
              {/* Table Toolbar */}
              <div className="p-6 border-b border-zinc-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                      User Accounts & Customer Details
                    </h2>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      View all user profiles, emails, joined dates, balances, and inspect complete order histories.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
                    <button
                      onClick={handleRefreshUsers}
                      disabled={isRefreshingUsers}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600/25 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.2)] disabled:opacity-50"
                      title="Fetch latest registered users live from Firestore database"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshingUsers ? 'animate-spin' : ''}`} />
                      <span>{isRefreshingUsers ? 'Syncing...' : 'Live Sync Users'}</span>
                    </button>
                    {refreshUsersMsg && (
                      <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg animate-in fade-in">
                        {refreshUsersMsg}
                      </span>
                    )}
                    <button
                      onClick={handleExportAllTransactionsCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      title="Download all user transactions CSV for offline bookkeeping"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Download Transactions CSV</span>
                    </button>
                    <button
                      onClick={handleExportCustomersSummaryCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                      title="Export customer list & balances to CSV"
                    >
                      <Users className="w-3.5 h-3.5 text-fuchsia-400" />
                      <span>Export Customers</span>
                    </button>
                    <div className="text-xs text-zinc-400 font-mono bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                      Showing <span className="text-fuchsia-400 font-bold">{
                        users.filter(u => {
                          const q = userSearchQuery.trim().toLowerCase();
                          const matchesQuery = !q || 
                            (u.displayName && u.displayName.toLowerCase().includes(q)) ||
                            (u.email && u.email.toLowerCase().includes(q)) ||
                            (u.customId && u.customId.toLowerCase().includes(q)) ||
                            (u.uid && u.uid.toLowerCase().includes(q));
                          if (!matchesQuery) return false;
                          if (userFilter === 'buyers') return u.totalOrders > 0;
                          if (userFilter === 'leads') return u.totalOrders === 0;
                          if (userFilter === 'balance') return (u.balance || 0) > 0;
                          if (userFilter === 'vip') return (u.totalSpent || 0) >= 1000;
                          return true;
                        }).length
                      }</span> of {users.length} users
                    </div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                  {/* Search Input */}
                  <div className="md:col-span-6 relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search by name, email, custom ID, or UID..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
                    />
                    {userSearchQuery && (
                      <button
                        onClick={() => setUserSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="md:col-span-3 flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-fuchsia-500"
                    >
                      <option value="all">All Users & Customers ({users.length})</option>
                      <option value="buyers">Active Buyers ({users.filter(u => u.totalOrders > 0).length})</option>
                      <option value="phone">With WhatsApp / Phone ({users.filter(u => !!u.phone).length})</option>
                      <option value="leads">Zero Orders ({users.filter(u => u.totalOrders === 0).length})</option>
                      <option value="balance">Has Balance ({users.filter(u => (u.balance || 0) > 0).length})</option>
                      <option value="vip">VIP Spenders ₹1k+ ({users.filter(u => (u.totalSpent || 0) >= 1000).length})</option>
                    </select>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={userSortBy}
                      onChange={(e) => setUserSortBy(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-fuchsia-500"
                    >
                      <option value="recent">Sort: Most Recent Activity</option>
                      <option value="spent">Sort: Highest Spent (₹)</option>
                      <option value="orders">Sort: Most Orders</option>
                      <option value="balance">Sort: Highest Balance (₹)</option>
                      <option value="name">Sort: Name (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950/60">
                    <tr>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Customer Profile</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">WhatsApp & Contact</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Dates & Activity</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Orders & Keys Delivered</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right">Wallet Balance</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {(() => {
                      const userList = users.filter(u => {
                        const q = userSearchQuery.trim().toLowerCase();
                        const matchesQuery = !q || 
                          (u.displayName && u.displayName.toLowerCase().includes(q)) ||
                          (u.email && u.email.toLowerCase().includes(q)) ||
                          (u.phone && u.phone.includes(q)) ||
                          (u.customId && u.customId.toLowerCase().includes(q)) ||
                          (u.uid && u.uid.toLowerCase().includes(q));

                        if (!matchesQuery) return false;

                        if (userFilter === 'buyers') return u.totalOrders > 0;
                        if (userFilter === 'phone') return !!u.phone;
                        if (userFilter === 'leads') return u.totalOrders === 0;
                        if (userFilter === 'balance') return (u.balance || 0) > 0;
                        if (userFilter === 'vip') return (u.totalSpent || 0) >= 1000;
                        return true;
                      }).sort((a, b) => {
                        if (userSortBy === 'spent') return (b.totalSpent || 0) - (a.totalSpent || 0);
                        if (userSortBy === 'orders') return (b.totalOrders || 0) - (a.totalOrders || 0);
                        if (userSortBy === 'balance') return (b.balance || 0) - (a.balance || 0);
                        if (userSortBy === 'name') return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
                        const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
                        const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
                        return timeB - timeA;
                      });

                      if (userList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-16 text-center text-zinc-500">
                              <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-zinc-400" />
                              <p className="text-base font-medium text-zinc-300">No customers found</p>
                              <p className="text-xs text-zinc-500 mt-1">Try adjusting your search query or filter options.</p>
                            </td>
                          </tr>
                        );
                      }

                      return userList.map((user) => {
                        const isOwner = user.role === 'owner' || user.email === 'barikarman12@gmail.com' || user.email === 'barikarman207@gmail.com';
                        const isVip = (user.totalSpent || 0) >= 1000;
                        const initialLetter = (user.displayName || user.email || 'U').charAt(0).toUpperCase();

                        return (
                          <tr key={user.uid} className="hover:bg-zinc-800/40 transition-colors group">
                            {/* Profile Info */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                  isOwner 
                                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]' 
                                    : isVip 
                                    ? 'bg-gradient-to-tr from-fuchsia-600 to-purple-400 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                                    : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                                }`}>
                                  {initialLetter}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-white text-sm truncate max-w-[180px]">
                                      {user.displayName || user.customId || 'Store Customer'}
                                    </span>
                                    {isOwner ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                        👑 Owner
                                      </span>
                                    ) : isVip ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30">
                                        💎 VIP
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                        Customer
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-zinc-400 flex items-center gap-1 font-mono mt-0.5">
                                    <span>@{user.customId || user.email?.split('@')[0] || 'customer'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Contact / WhatsApp */}
                            <td className="py-4 px-6 text-sm">
                              <div className="space-y-1">
                                {user.phone ? (
                                  <div className="flex items-center gap-1.5">
                                    <a
                                      href={`https://wa.me/91${user.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${user.displayName || ''}, welcome to Arman X Store!`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 transition-colors shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                      title="Open WhatsApp chat with customer"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span>+91 {user.phone}</span>
                                    </a>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-zinc-600" />
                                    <span>No phone recorded</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                  <span className="text-zinc-300 text-xs font-mono truncate max-w-[170px]">
                                    {user.email || 'No email associated'}
                                  </span>
                                  {user.email && (
                                    <button
                                      onClick={() => handleCopyText(user.email, `email_${user.uid}`)}
                                      className="text-zinc-500 hover:text-fuchsia-400 transition-colors p-0.5"
                                      title="Copy email"
                                    >
                                      {copiedText === `email_${user.uid}` ? (
                                        <Check className="w-3 h-3 text-green-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                                  <span>UID:</span>
                                  <span className="truncate max-w-[110px]">{user.uid}</span>
                                </div>
                              </div>
                            </td>

                            {/* Dates & Activity */}
                            <td className="py-4 px-6 text-sm">
                              <div className="space-y-1 text-xs">
                                <div className="text-zinc-300 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                                  <span>Active: <strong className="text-zinc-200 font-normal">{formatTimeAgo(user.lastLoginAt)}</strong></span>
                                </div>
                                <div className="text-zinc-500 flex items-center gap-1 text-[11px]">
                                  <Calendar className="w-3 h-3 text-zinc-600 shrink-0" />
                                  <span>Joined: {formatUserDate(user.createdAt).split(',')[0]}</span>
                                </div>
                              </div>
                            </td>

                            {/* Orders & Keys Delivered */}
                            <td className="py-4 px-6 text-sm">
                              <div>
                                <div className="text-white font-medium text-xs flex items-center gap-1.5">
                                  <span>{user.totalOrders} {user.totalOrders === 1 ? 'order' : 'orders'}</span>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-zinc-400">{user.totalKeys} keys</span>
                                </div>
                                <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                                  ₹{user.totalSpent.toLocaleString()} spent
                                </div>
                                {user.lastKeys && user.lastKeys.length > 0 && (
                                  <div className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30 truncate max-w-[180px]">
                                    <Key className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                    <span className="truncate">{user.lastKeys[0]}</span>
                                    <button
                                      onClick={() => handleCopyText(user.lastKeys![0], `last_key_${user.uid}`)}
                                      className="text-zinc-400 hover:text-white p-0.5 shrink-0"
                                      title="Copy license key"
                                    >
                                      {copiedText === `last_key_${user.uid}` ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Wallet Balance */}
                            <td className="py-4 px-6 text-sm text-right">
                              <div className="inline-flex flex-col items-end">
                                <span className="font-bold text-base text-fuchsia-400 drop-shadow-[0_0_8px_rgba(224,0,255,0.3)]">
                                  ₹{(user.balance || 0).toLocaleString()}
                                </span>
                                <button
                                  onClick={() => {
                                    setBalanceAdjustUser(user);
                                    setBalanceAction('add');
                                    setBalanceAmount('');
                                    setBalanceNote('');
                                    setBalanceSuccessMsg('');
                                  }}
                                  className="text-[11px] text-zinc-400 hover:text-fuchsia-300 underline underline-offset-2 transition-colors mt-0.5 flex items-center gap-0.5"
                                >
                                  <Wallet className="w-2.5 h-2.5" />
                                  Adjust
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setSelectedUserDetail(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-fuchsia-600/20 hover:border-fuchsia-500/40 border border-zinc-700 text-xs font-medium text-white transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)] hover:shadow-[0_0_15px_rgba(224,0,255,0.2)] group-hover:border-zinc-600"
                              >
                                <Eye className="w-3.5 h-3.5 text-fuchsia-400" />
                                <span>All Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CUSTOMER 360° ALL DETAILS MODAL */}
            {selectedUserDetail && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full my-8 overflow-hidden shadow-[0_0_50px_rgba(224,0,255,0.15)] flex flex-col max-h-[90vh]">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/70 shrink-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${
                        selectedUserDetail.role === 'owner' || selectedUserDetail.email === 'barikarman12@gmail.com'
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                          : 'bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-[0_0_20px_rgba(224,0,255,0.3)]'
                      }`}>
                        {(selectedUserDetail.displayName || selectedUserDetail.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-bold text-white">
                            {selectedUserDetail.displayName || selectedUserDetail.customId || 'User Profile'}
                          </h3>
                          {selectedUserDetail.role === 'owner' || selectedUserDetail.email === 'barikarman12@gmail.com' ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              👑 Store Owner
                            </span>
                          ) : (selectedUserDetail.totalSpent || 0) >= 1000 ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30">
                              💎 VIP Customer
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Customer
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active Account
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-1">
                          @{selectedUserDetail.customId || selectedUserDetail.email?.split('@')[0] || 'user'} • UID: {selectedUserDetail.uid}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportUserStatementCSV(selectedUserDetail)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer"
                        title="Export this user's statement to CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download User CSV</span>
                      </button>
                      <button
                        onClick={() => setSelectedUserDetail(null)}
                        className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body (Scrollable) */}
                  <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    
                    {/* User KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                        <span className="text-xs text-zinc-400 block mb-1">Wallet Balance</span>
                        <div className="text-2xl font-bold text-fuchsia-400">₹{(selectedUserDetail.balance || 0).toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setBalanceAdjustUser(selectedUserDetail);
                              setBalanceAction('add');
                              setBalanceAmount('');
                              setBalanceNote('');
                              setBalanceSuccessMsg('');
                            }}
                            className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 font-medium underline"
                          >
                            + Add / - Deduct
                          </button>
                          <span className="text-zinc-600 text-xs">•</span>
                          <button
                            onClick={() => {
                              setRefundModalOrder({
                                userId: selectedUserDetail.uid,
                                userEmail: selectedUserDetail.email,
                                amount: 100,
                                productName: 'Direct Wallet Refund'
                              });
                              setRefundAmountInput('');
                              setRefundReasonInput('');
                              setRefundSuccessMsg('');
                            }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            Refund
                          </button>
                        </div>
                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                        <span className="text-xs text-zinc-400 block mb-1">Total Orders</span>
                        <div className="text-2xl font-bold text-white">{selectedUserDetail.totalOrders}</div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Completed purchases</span>
                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                        <span className="text-xs text-zinc-400 block mb-1">Total Spent</span>
                        <div className="text-2xl font-bold text-emerald-400">₹{selectedUserDetail.totalSpent.toLocaleString()}</div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Lifetime value</span>
                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                        <span className="text-xs text-zinc-400 block mb-1">Keys Purchased</span>
                        <div className="text-2xl font-bold text-cyan-400">{selectedUserDetail.totalKeys}</div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">License keys issued</span>
                      </div>
                    </div>

                    {/* Detailed Information Grid */}
                    <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-5">
                      <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-fuchsia-400" />
                        Account & Identity Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                          <span className="text-zinc-500 font-medium block">Full User ID (UID)</span>
                          <div className="flex items-center justify-between font-mono text-zinc-300">
                            <span className="break-all">{selectedUserDetail.uid}</span>
                            <button
                              onClick={() => handleCopyText(selectedUserDetail.uid, 'modal_uid')}
                              className="text-zinc-500 hover:text-fuchsia-400 ml-2 shrink-0 p-1"
                              title="Copy UID"
                            >
                              {copiedText === 'modal_uid' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                          <span className="text-zinc-500 font-medium block">Email Address</span>
                          <div className="flex items-center justify-between font-mono text-zinc-300">
                            <span className="break-all">{selectedUserDetail.email || 'None'}</span>
                            {selectedUserDetail.email && (
                              <button
                                onClick={() => handleCopyText(selectedUserDetail.email, 'modal_email')}
                                className="text-zinc-500 hover:text-fuchsia-400 ml-2 shrink-0 p-1"
                                title="Copy Email"
                              >
                                {copiedText === 'modal_email' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                          <span className="text-zinc-500 font-medium block">Registration / Joined Date</span>
                          <div className="text-zinc-300 font-mono">
                            {formatUserDate(selectedUserDetail.createdAt)}
                          </div>
                        </div>

                        <div className="space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                          <span className="text-zinc-500 font-medium block">Last Login / Activity</span>
                          <div className="text-zinc-300 font-mono flex items-center justify-between">
                            <span>{formatUserDate(selectedUserDetail.lastLoginAt)}</span>
                            <span className="text-zinc-500 text-[11px]">({formatTimeAgo(selectedUserDetail.lastLoginAt)})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Activity & Transaction Navigation Tabs */}
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <button
                        onClick={() => setUserModalTab('deposits')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                          userModalTab === 'deposits'
                            ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-[0_0_15px_rgba(224,0,255,0.15)]'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        Money Added & Payment Sources
                        {(() => {
                          const userTxCount = allWalletTransactions.filter(
                            t => t.userId === selectedUserDetail.uid || (selectedUserDetail.email && t.userEmail === selectedUserDetail.email)
                          ).length;
                          return userTxCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-fuchsia-500/30 text-fuchsia-200">
                              {userTxCount}
                            </span>
                          ) : null;
                        })()}
                      </button>

                      <button
                        onClick={() => setUserModalTab('orders')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                          userModalTab === 'orders'
                            ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-[0_0_15px_rgba(224,0,255,0.15)]'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        Orders & Delivered Keys
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
                          {purchases.filter(p => p.userId === selectedUserDetail.uid).length}
                        </span>
                      </button>
                    </div>

                    {/* TAB 1: MONEY ADDED & PAYMENT SOURCES (Payment history, UPI/Gateway, Reference/UTR, Note, Refunds) */}
                    {userModalTab === 'deposits' && (
                      <div className="space-y-4">
                        {(() => {
                          const userTxList = allWalletTransactions.filter(
                            t => t.userId === selectedUserDetail.uid || (selectedUserDetail.email && t.userEmail === selectedUserDetail.email)
                          );
                          const totalDeposited = userTxList
                            .filter(t => t.type === 'deposit')
                            .reduce((acc, t) => acc + (t.amount || 0), 0);
                          const totalRefunded = userTxList
                            .filter(t => t.type === 'refund')
                            .reduce((acc, t) => acc + (t.amount || 0), 0);

                          return (
                            <>
                              {/* Source Summary Ribbon */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
                                  <span className="text-[11px] text-zinc-400 font-medium block">Total Money Deposited</span>
                                  <div className="text-lg font-bold text-emerald-400 mt-0.5">₹{totalDeposited.toLocaleString()}</div>
                                  <span className="text-[10px] text-zinc-500">From UPI / QR / Payment gateway</span>
                                </div>
                                <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
                                  <span className="text-[11px] text-zinc-400 font-medium block">Total Refunded to Wallet</span>
                                  <div className="text-lg font-bold text-amber-400 mt-0.5">₹{totalRefunded.toLocaleString()}</div>
                                  <span className="text-[10px] text-zinc-500">Auto stock refunds & admin refunds</span>
                                </div>
                                <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl flex flex-col justify-between">
                                  <div>
                                    <span className="text-[11px] text-zinc-400 font-medium block">Total Recorded Logs</span>
                                    <div className="text-lg font-bold text-white mt-0.5">{userTxList.length} Transactions</div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <button
                                      onClick={() => {
                                        setBalanceAdjustUser(selectedUserDetail);
                                        setBalanceAction('add');
                                        setBalanceAmount('');
                                        setBalanceNote('Manual deposit verification');
                                        setBalanceSuccessMsg('');
                                      }}
                                      className="text-[10px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 underline"
                                    >
                                      + Add Money
                                    </button>
                                    <span className="text-zinc-600 text-xs">•</span>
                                    <button
                                      onClick={() => {
                                        setRefundModalOrder({
                                          userId: selectedUserDetail.uid,
                                          userEmail: selectedUserDetail.email,
                                          amount: 100,
                                          productName: 'Direct Wallet Credit'
                                        });
                                        setRefundAmountInput('');
                                        setRefundReasonInput('');
                                        setRefundSuccessMsg('');
                                      }}
                                      className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 underline"
                                    >
                                      + Issue Refund
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Transaction list */}
                              {userTxList.length === 0 ? (
                                <div className="bg-zinc-950/30 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-500">
                                  <ArrowDownLeft className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
                                  <p className="text-sm text-zinc-400 font-medium">No payment or deposit records yet</p>
                                  <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">
                                    When this user adds money via UPI QR, payment gateways, or receives an auto-refund, the payment source, through method, UTR reference number, and timestamp will be logged here.
                                  </p>
                                  <button
                                    onClick={() => {
                                      setBalanceAdjustUser(selectedUserDetail);
                                      setBalanceAction('add');
                                      setBalanceAmount('');
                                      setBalanceNote('UPI Deposit verification');
                                      setBalanceSuccessMsg('');
                                    }}
                                    className="mt-4 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
                                  >
                                    + Add Money to User
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {userTxList.map((tx) => {
                                    const isDeposit = tx.type === 'deposit';
                                    const isRefund = tx.type === 'refund';
                                    const isAdjustment = tx.type === 'adjustment';

                                    return (
                                      <div
                                        key={tx.id}
                                        className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                                          <div className="flex items-center gap-2">
                                            {isDeposit && (
                                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                                Money Added / Deposit
                                              </span>
                                            )}
                                            {isRefund && (
                                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Refund Credited
                                              </span>
                                            )}
                                            {isAdjustment && (
                                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
                                                <Wallet className="w-3.5 h-3.5" />
                                                Balance Adjustment
                                              </span>
                                            )}
                                            {!isDeposit && !isRefund && !isAdjustment && (
                                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                Purchase / Deduct
                                              </span>
                                            )}

                                            <span className="text-xs text-zinc-500 font-mono">
                                              {formatUserDate(tx.date)}
                                            </span>
                                          </div>

                                          <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                                            <div className={`text-base font-bold font-mono ${
                                              isDeposit || isRefund || (isAdjustment && tx.amount > 0)
                                                ? 'text-emerald-400'
                                                : 'text-rose-400'
                                            }`}>
                                              {isDeposit || isRefund || (isAdjustment && tx.amount > 0) ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString()}
                                            </div>
                                            {typeof tx.balanceAfter === 'number' && (
                                              <span className="text-[10px] text-zinc-500 font-mono">
                                                Bal after: ₹{tx.balanceAfter.toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Method & Source Breakdown */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/40 space-y-0.5">
                                            <span className="text-[10px] text-zinc-500 font-medium block">
                                              Payment Source / Through Method:
                                            </span>
                                            <span className="font-semibold text-white flex items-center gap-1.5">
                                              <CreditCard className="w-3.5 h-3.5 text-fuchsia-400" />
                                              {tx.method || (isDeposit ? 'UPI / QR Payment' : isRefund ? 'Auto Refund System' : 'Internal System')}
                                            </span>
                                          </div>

                                          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/40 space-y-0.5">
                                            <span className="text-[10px] text-zinc-500 font-medium block">
                                              Transaction / Reference ID:
                                            </span>
                                            <div className="flex items-center justify-between font-mono text-zinc-300">
                                              <span className="break-all text-[11px] select-all">
                                                {tx.referenceId || tx.id}
                                              </span>
                                              <button
                                                onClick={() => handleCopyText(tx.referenceId || tx.id, `tx_${tx.id}`)}
                                                className="text-zinc-500 hover:text-white ml-1.5 p-1 shrink-0"
                                                title="Copy Reference ID"
                                              >
                                                {copiedText === `tx_${tx.id}` ? (
                                                  <Check className="w-3 h-3 text-green-400" />
                                                ) : (
                                                  <Copy className="w-3 h-3" />
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Notes & Reason */}
                                        {tx.note && (
                                          <div className="text-xs bg-zinc-900/40 px-3 py-2 rounded-xl border border-zinc-800/30 text-zinc-300 flex items-start gap-2">
                                            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                                            <span>{tx.note}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* TAB 2: ORDER HISTORY & DELIVERED KEYS */}
                    {userModalTab === 'orders' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                            <History className="w-4 h-4 text-fuchsia-400" />
                            Order History & Delivered Keys ({
                              purchases.filter(p => p.userId === selectedUserDetail.uid).length
                            })
                          </h4>
                          <span className="text-xs text-zinc-500">
                            Refund an order with 1 click to notify user
                          </span>
                        </div>

                        {(() => {
                          const userOrders = purchases.filter(p => p.userId === selectedUserDetail.uid);
                          if (userOrders.length === 0) {
                            return (
                              <div className="bg-zinc-950/30 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-500">
                                <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-zinc-400" />
                                <p className="text-sm text-zinc-400">No orders placed by this user yet.</p>
                                <p className="text-xs text-zinc-600 mt-1">When this user buys keys or redeems balances, their full order logs will appear here.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {userOrders.map((order, idx) => {
                                const item = inventory.find(i => i.value === order.value);
                                const orderPrice = typeof order.amount === 'number' 
                                  ? order.amount 
                                  : (item ? item.price : 0) * (order.keys?.length || 1);
                                const isOrderRefunded = (order as any).refunded;
                                const refundAmt = (order as any).refundAmount || orderPrice;

                                return (
                                  <div key={order.id || idx} className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                    {/* Order Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-white text-sm">
                                            {resolveProductName(order.category, settings.categories, inventory)} • {order.label}
                                          </span>
                                          {isOrderRefunded ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                              <RefreshCw className="w-3 h-3" />
                                              Refunded (₹{refundAmt})
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                              Completed
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                                          <span>Order #{order.id}</span>
                                          <span>•</span>
                                          <span>{formatUserDate(order.date)}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <div className="text-sm font-bold text-emerald-400">
                                            ₹{orderPrice.toLocaleString()}
                                          </div>
                                          <div className="text-[11px] text-zinc-500">
                                            {order.keys.length} {order.keys.length === 1 ? 'key' : 'keys'} delivered
                                          </div>
                                        </div>

                                        {/* Refund Order Button */}
                                        {!isOrderRefunded ? (
                                          <button
                                            onClick={() => {
                                              setRefundModalOrder({
                                                orderId: order.id,
                                                userId: selectedUserDetail.uid,
                                                userEmail: selectedUserDetail.email,
                                                amount: orderPrice,
                                                productName: `${resolveProductName(order.category, settings.categories, inventory)} (${order.label})`
                                              });
                                              setRefundAmountInput(orderPrice.toString());
                                              setRefundReasonInput('Key issue / customer refund request');
                                              setRefundSuccessMsg('');
                                            }}
                                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                                            title="Issue refund and notify customer"
                                          >
                                            <RefreshCw className="w-3 h-3" />
                                            Refund Order
                                          </button>
                                        ) : (
                                          <div className="text-[11px] text-zinc-500 font-mono italic">
                                            {(order as any).refundReason ? `Reason: ${(order as any).refundReason}` : 'Refund processed'}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Keys Display */}
                                    <div>
                                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                                        <span className="flex items-center gap-1 font-medium text-zinc-300">
                                          <Key className="w-3.5 h-3.5 text-cyan-400" />
                                          Delivered Keys ({order.keys.length}):
                                        </span>
                                        {order.keys.length > 1 && (
                                          <button
                                            onClick={() => handleCopyText(order.keys.join('\n'), `all_keys_${order.id}`)}
                                            className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-1 font-mono"
                                          >
                                            {copiedText === `all_keys_${order.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                            Copy All Keys
                                          </button>
                                        )}
                                      </div>
                                      <div className="space-y-1.5">
                                        {order.keys.map((keyStr, kIdx) => (
                                          <div
                                            key={kIdx}
                                            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex items-center justify-between font-mono text-xs text-zinc-200 hover:border-zinc-700 transition-colors"
                                          >
                                            <span className="break-all select-all text-fuchsia-300 font-semibold">{keyStr}</span>
                                            <button
                                              onClick={() => handleCopyText(keyStr, `key_${order.id}_${kIdx}`)}
                                              className="text-zinc-500 hover:text-white p-1 ml-2 shrink-0 transition-colors"
                                              title="Copy Key"
                                            >
                                              {copiedText === `key_${order.id}_${kIdx}` ? (
                                                <Check className="w-3.5 h-3.5 text-green-400" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-zinc-500">
                      Viewing profile data for <span className="text-zinc-300 font-medium">{selectedUserDetail.email || selectedUserDetail.uid}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const summary = `USER PROFILE:\nName: ${selectedUserDetail.displayName}\nUsername: @${selectedUserDetail.customId}\nEmail: ${selectedUserDetail.email}\nUID: ${selectedUserDetail.uid}\nBalance: ₹${selectedUserDetail.balance}\nOrders: ${selectedUserDetail.totalOrders}\nTotal Spent: ₹${selectedUserDetail.totalSpent}\nJoined: ${selectedUserDetail.createdAt}`;
                          handleCopyText(summary, 'user_summary');
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-medium text-white transition-colors flex items-center gap-1.5"
                      >
                        {copiedText === 'user_summary' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy User Summary
                      </button>
                      <button
                        onClick={() => setSelectedUserDetail(null)}
                        className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl text-xs font-medium text-white transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QUICK ADJUST WALLET BALANCE MODAL */}
            {balanceAdjustUser && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-[0_0_40px_rgba(224,0,255,0.15)] p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Adjust Customer Balance</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        User: <span className="text-zinc-200 font-medium">{balanceAdjustUser.displayName || balanceAdjustUser.email}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setBalanceAdjustUser(null)}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Current Balance */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Current Balance:</span>
                    <span className="text-xl font-bold text-fuchsia-400">₹{(balanceAdjustUser.balance || 0).toLocaleString()}</span>
                  </div>

                  {/* Action Mode (Add vs Deduct) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceAction('add')}
                      className={`py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border transition-all ${
                        balanceAction === 'add'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Balance (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceAction('deduct')}
                      className={`py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border transition-all ${
                        balanceAction === 'deduct'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="font-bold text-sm">−</span>
                      Deduct Balance (−)
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500"
                      />
                    </div>
                  </div>

                  {/* Note / Reason */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Reason / Reference Note (Optional)</label>
                    <input
                      type="text"
                      value={balanceNote}
                      onChange={(e) => setBalanceNote(e.target.value)}
                      placeholder="e.g. UPI Deposit Verification / Bonus / Refund"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>

                  {/* Computed New Balance Preview */}
                  {balanceAmount && parseFloat(balanceAmount) > 0 && (
                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs flex justify-between items-center font-mono">
                      <span className="text-zinc-400">New Balance after update:</span>
                      <span className="font-bold text-white text-sm">
                        ₹{Math.max(0, (balanceAdjustUser.balance || 0) + (balanceAction === 'add' ? parseFloat(balanceAmount) : -parseFloat(balanceAmount))).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Notification confirmation badge */}
                  <div className="bg-fuchsia-950/30 border border-fuchsia-500/20 rounded-xl p-2.5 text-[11px] text-fuchsia-300 flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                    <span>
                      {balanceAction === 'add' ? 'User will receive a notification of +₹' + (balanceAmount || '0') + ' added to wallet.' : 'User will receive a notification of -₹' + (balanceAmount || '0') + ' deducted from wallet.'}
                    </span>
                  </div>

                  {balanceSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{balanceSuccessMsg}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBalanceAdjustUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!balanceAmount || parseFloat(balanceAmount) <= 0}
                      onClick={async () => {
                        const amt = parseFloat(balanceAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        const current = balanceAdjustUser.balance || 0;
                        const target = balanceAction === 'add' ? current + amt : Math.max(0, current - amt);
                        await updateUserBalance(balanceAdjustUser.uid, target, balanceNote, {
                          action: balanceAction,
                          amount: amt,
                          method: balanceAction === 'add' ? 'Manual Admin Credit' : 'Manual Admin Debit',
                          referenceId: `adj_${Date.now()}`
                        });
                        
                        // Update selected modal user if open
                        if (selectedUserDetail && selectedUserDetail.uid === balanceAdjustUser.uid) {
                          setSelectedUserDetail(prev => prev ? { ...prev, balance: target } : null);
                        }

                        setBalanceSuccessMsg(`Balance updated to ₹${target} & user notified!`);
                        setTimeout(() => {
                          setBalanceAdjustUser(null);
                        }, 1200);
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(224,0,255,0.3)]"
                    >
                      Confirm & Send Notification
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DEDICATED REFUND ORDER & NOTIFICATION MODAL */}
            {refundModalOrder && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Issue Refund to Customer</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Instant wallet credit + real-time notification
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!isProcessingRefund) setRefundModalOrder(null);
                      }}
                      className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Customer Info Card */}
                  <div className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Customer:</span>
                      <span className="font-semibold text-zinc-200">{refundModalOrder.userEmail || refundModalOrder.userId}</span>
                    </div>
                    {refundModalOrder.orderId && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Order Reference:</span>
                        <span className="font-mono text-fuchsia-300">#{refundModalOrder.orderId}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Product / Plan:</span>
                      <span className="font-medium text-white">{refundModalOrder.productName}</span>
                    </div>
                  </div>

                  {/* Refund Amount Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-zinc-300">Refund Amount (₹)</label>
                      {refundModalOrder.amount > 0 && (
                        <button
                          type="button"
                          onClick={() => setRefundAmountInput(refundModalOrder.amount.toString())}
                          className="text-[11px] text-amber-400 hover:underline font-medium"
                        >
                          Fill Full Amount (₹{refundModalOrder.amount})
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={refundAmountInput}
                        onChange={(e) => setRefundAmountInput(e.target.value)}
                        placeholder={refundModalOrder.amount ? refundModalOrder.amount.toString() : "Enter amount"}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Refund Reason / Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Reason / Message for User
                    </label>
                    <input
                      type="text"
                      value={refundReasonInput}
                      onChange={(e) => setRefundReasonInput(e.target.value)}
                      placeholder="e.g. License key defective, Out of stock, Customer request"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[11px] text-zinc-500">
                      This note will be sent directly in the user's notification bell.
                    </p>
                  </div>

                  {refundSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{refundSuccessMsg}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isProcessingRefund}
                      onClick={() => setRefundModalOrder(null)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingRefund || !refundAmountInput || parseFloat(refundAmountInput) <= 0}
                      onClick={async () => {
                        const amt = parseFloat(refundAmountInput);
                        if (isNaN(amt) || amt <= 0) return;
                        setIsProcessingRefund(true);
                        try {
                          await issueRefund({
                            orderId: refundModalOrder.orderId || `dir_ref_${Date.now()}`,
                            userId: refundModalOrder.userId,
                            amount: amt,
                            reason: refundReasonInput.trim() || 'Order Refund Processed',
                            productName: refundModalOrder.productName
                          });

                          // Update selected modal user if open
                          if (selectedUserDetail && selectedUserDetail.uid === refundModalOrder.userId) {
                            setSelectedUserDetail(prev => prev ? { ...prev, balance: (prev.balance || 0) + amt } : null);
                          }

                          setRefundSuccessMsg(`₹${amt} refunded to wallet and user notified!`);
                          setTimeout(() => {
                            setRefundModalOrder(null);
                            setRefundSuccessMsg('');
                            setIsProcessingRefund(false);
                          }, 1400);
                        } catch(err) {
                          console.error(err);
                          setIsProcessingRefund(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2"
                    >
                      {isProcessingRefund ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirm Refund & Send Notification
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="space-y-8">
            {/* Header Action Card with Save Button */}
            <div className="bg-[#121215]/90 rounded-3xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-6 sm:p-8 backdrop-blur-xl theme-card relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 shadow-[0_0_20px_rgba(224,0,255,0.3)]">
                    <Tag className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2.5">
                      <span>Discount Coupons Manager</span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono">
                        ● Live Synced with Store
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Create, edit discount percentage, enable/disable codes, and sync changes instantly to customer checkout.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isSavingCoupons}
                    onClick={handleSaveAllCoupons}
                    className="flex-1 sm:flex-initial px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(224,0,255,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
                  >
                    {isSavingCoupons ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving to Cloud...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save All Coupon Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {couponSuccessMsg && (
                <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in shadow-[0_0_15px_rgba(16,185,129,0.15)] font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{couponSuccessMsg}</span>
                </div>
              )}

              {couponFormError && (
                <div className="mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in shadow-[0_0_15px_rgba(244,63,94,0.15)] font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{couponFormError}</span>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Coupons</p>
                  <p className="text-3xl font-bold font-display text-white">{coupons.length}</p>
                </div>
                <div className="p-3 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl">
                  <Tag className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Active Coupons</p>
                  <p className="text-3xl font-bold font-display text-emerald-400">{coupons.filter(c => c.active).length}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Times Used</p>
                  <p className="text-3xl font-bold font-display text-fuchsia-400">
                    {coupons.reduce((acc, c) => acc + (c.usageCount || 0), 0)}
                  </p>
                </div>
                <div className="p-3 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl">
                  <Percent className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Create Coupon Card */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Tag className="w-5 h-5 text-fuchsia-400" />
                    Create New Coupon
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Generate promotional discount codes (percentage or flat discount) applicable at checkout.
                  </p>
                </div>

                {/* Quick 1-Click Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-500">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('SAVE20', 'percentage', 20, '20% Off on all products')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-fuchsia-300 border border-zinc-700 rounded-lg transition-colors font-mono"
                  >
                    20% OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('SAVE30', 'percentage', 30, '30% Off special discount')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-fuchsia-300 border border-zinc-700 rounded-lg transition-colors font-mono"
                  >
                    30% OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('MEGA50', 'percentage', 50, '50% Off mega sale')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-fuchsia-300 border border-zinc-700 rounded-lg transition-colors font-mono"
                  >
                    50% OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('FLAT50', 'flat', 50, '₹50 Flat discount')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-fuchsia-300 border border-zinc-700 rounded-lg transition-colors font-mono"
                  >
                    ₹50 FLAT
                  </button>
                </div>
              </div>

              {couponSuccessMsg && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{couponSuccessMsg}</span>
                </div>
              )}

              {couponFormError && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 text-rose-400 text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{couponFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Coupon Code */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => {
                      setNewCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                      if (couponFormError) setCouponFormError('');
                    }}
                    placeholder="e.g. DISCOUNT20"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                {/* Discount Type */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setNewDiscountType('percentage')}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                        newDiscountType === 'percentage'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDiscountType('flat')}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                        newDiscountType === 'flat'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      ₹ Flat
                    </button>
                  </div>
                </div>

                {/* Discount Value */}
                <div className="lg:col-span-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase text-zinc-400">
                      Discount Value {newDiscountType === 'percentage' ? '(%)' : '(₹)'} *
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={newDiscountType === 'percentage' ? '90' : '99999'}
                      value={newDiscountValue}
                      onChange={(e) => setNewDiscountValue(e.target.value)}
                      placeholder={newDiscountType === 'percentage' ? '20' : '50'}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500 font-mono font-bold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">
                      {newDiscountType === 'percentage' ? '% OFF' : '₹ FLAT'}
                    </span>
                  </div>
                  {newDiscountType === 'percentage' && (
                    <div className="flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => setNewDiscountValue((prev) => Math.max(1, (parseFloat(prev) || 20) - 5).toString())}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-rose-300 rounded text-[10px] font-bold"
                        title="Reduce by 5%"
                      >
                        -5%
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewDiscountValue((prev) => Math.max(1, (parseFloat(prev) || 20) - 10).toString())}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-rose-400 rounded text-[10px] font-bold"
                        title="Reduce by 10%"
                      >
                        -10%
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewDiscountValue((prev) => Math.min(90, (parseFloat(prev) || 20) + 5).toString())}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded text-[10px] font-bold"
                        title="Increase by 5%"
                      >
                        +5%
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewDiscountValue((prev) => Math.min(90, (parseFloat(prev) || 20) + 10).toString())}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-emerald-300 rounded text-[10px] font-bold"
                        title="Increase by 10%"
                      >
                        +10%
                      </button>
                    </div>
                  )}
                </div>

                {/* Validity Hours (Kitne Hours Kaam Karega) */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
                    Valid Hours *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newValidHours}
                    onChange={(e) => setNewValidHours(e.target.value)}
                    placeholder="24 (0 = Lifetime)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                {/* Max Uses Limit (Kitni Baar Use Ho Sakta Hai) */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-fuchsia-400" />
                    Max Uses Limit *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value)}
                    placeholder="0 (Unlimited)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                {/* Min Spend */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Min Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMinSpend}
                    onChange={(e) => setNewMinSpend(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>

              {/* Presets Bar: Hours & Usage Limits */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                {/* Hours Presets */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-400 font-medium mr-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
                      Hours Presets:
                    </span>
                    {[
                      { label: '1 Hour', val: '1' },
                      { label: '6 Hours', val: '6' },
                      { label: '12 Hours', val: '12' },
                      { label: '24 Hours (1 Day)', val: '24' },
                      { label: '48 Hours (2 Days)', val: '48' },
                      { label: '7 Days (168h)', val: '168' },
                      { label: '♾️ Lifetime', val: '0' }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setNewValidHours(preset.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          newValidHours === preset.val
                            ? 'bg-fuchsia-600 text-white shadow-[0_0_8px_rgba(224,0,255,0.3)]'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-right">
                    {parseFloat(newValidHours) > 0 ? (
                      <span className="text-amber-300">
                        ⏳ Expire in <strong>{newValidHours}h</strong> on{' '}
                        <span className="text-white font-medium">
                          {new Date(Date.now() + parseFloat(newValidHours) * 3600 * 1000).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">
                        ♾️ Lifetime validity (Never expires)
                      </span>
                    )}
                  </div>
                </div>

                {/* Usage Limits Presets (How Many Times Use Kar Sakte Hain) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-400 font-medium mr-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-fuchsia-400" />
                      Usage Limit Presets:
                    </span>
                    {[
                      { label: '♾️ Unlimited', val: '0' },
                      { label: '1 Time (Single Use)', val: '1' },
                      { label: '5 Times', val: '5' },
                      { label: '10 Times', val: '10' },
                      { label: '25 Times', val: '25' },
                      { label: '50 Times', val: '50' },
                      { label: '100 Times', val: '100' }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setNewMaxUses(preset.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          newMaxUses === preset.val
                            ? 'bg-fuchsia-600 text-white shadow-[0_0_8px_rgba(224,0,255,0.3)]'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-right">
                    {parseInt(newMaxUses) > 0 ? (
                      <span className="text-amber-300 font-medium">
                        🎯 Can be redeemed maximum <strong>{newMaxUses} time{parseInt(newMaxUses) > 1 ? 's' : ''}</strong>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">
                        ♾️ Unlimited redeems allowed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Scope: Specific Products ya All Products */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-fuchsia-400" />
                      Product Scope (Applicable Products)
                    </label>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Coupon all products par chalega ya sirf specific selected products par.
                    </p>
                  </div>

                  {/* Segmented button */}
                  <div className="inline-flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setNewApplicableScope('all');
                        setCouponFormError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        newApplicableScope === 'all'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      🌐 All Products
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewApplicableScope('specific');
                        if (newSelectedProducts.length === 0 && inventory.length > 0) {
                          setNewSelectedProducts([inventory[0].value]);
                        }
                        setCouponFormError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        newApplicableScope === 'specific'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      🎯 Specific Products ({newSelectedProducts.length})
                    </button>
                  </div>
                </div>

                {/* If Specific Products is selected, show item selector */}
                {newApplicableScope === 'specific' && (
                  <div className="pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-300 font-medium">
                        Select which products this coupon can be applied to ({newSelectedProducts.length} selected):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNewSelectedProducts(inventory.map(i => i.value))}
                          className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline"
                        >
                          Select All ({inventory.length})
                        </button>
                        <span className="text-zinc-600 text-xs">•</span>
                        <button
                          type="button"
                          onClick={() => setNewSelectedProducts([])}
                          className="text-xs text-zinc-400 hover:text-white underline"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {inventory.map((item) => {
                        const isSelected = newSelectedProducts.includes(item.value);
                        return (
                          <div
                            key={item.value}
                            onClick={() => {
                              if (isSelected) {
                                setNewSelectedProducts(newSelectedProducts.filter(v => v !== item.value));
                              } else {
                                setNewSelectedProducts([...newSelectedProducts, item.value]);
                              }
                              setCouponFormError('');
                            }}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                              isSelected
                                ? 'bg-fuchsia-950/40 border-fuchsia-500 shadow-[0_0_10px_rgba(224,0,255,0.15)] text-white'
                                : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{resolveProductName(item.category, settings.categories, inventory)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-zinc-400">{item.label}</span>
                                <span className="text-[11px] font-semibold text-emerald-400">₹{item.price}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'border-zinc-700 bg-zinc-950'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Description and Submit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="flex-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Description / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g. Special weekend deal for BGMI keys"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div className="sm:self-end">
                  <button
                    type="button"
                    onClick={handleCreateCoupon}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(224,0,255,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save & Add Coupon Code</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Coupons List */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">Active & Configured Coupons</h2>
                  <p className="text-xs text-zinc-400">All coupons are live synced with the website checkout</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs text-zinc-400 font-medium">{coupons.length} total coupons</span>
                  <button
                    type="button"
                    disabled={isSavingCoupons}
                    onClick={handleSaveAllCoupons}
                    className="px-4 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold rounded-xl transition-all shadow-[0_0_12px_rgba(224,0,255,0.3)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save All Changes</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950">
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Coupon Code</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Discount</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scope / Products</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Validity / Time Left</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Usage / Limit</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Min Spend</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-4 px-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-base tracking-wider bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
                              {coupon.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(coupon.code);
                                setCopiedCouponCode(coupon.code);
                                setTimeout(() => setCopiedCouponCode(null), 2000);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                              title="Copy Code"
                            >
                              {copiedCouponCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-sm">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                                coupon.discountType === 'percentage'
                                  ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT`}
                              </span>
                            </div>

                            {/* Quick Percent Steppers */}
                            {coupon.discountType === 'percentage' && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    quickAdjustCouponDiscount(coupon.id, -10);
                                    setCouponSuccessMsg(`📉 Reduced "${coupon.code}" discount to ${Math.max(1, coupon.discountValue - 10)}%`);
                                    setTimeout(() => setCouponSuccessMsg(''), 3000);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/20 rounded text-[10px] font-bold transition-all cursor-pointer"
                                  title="Reduce discount by 10%"
                                >
                                  -10%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    quickAdjustCouponDiscount(coupon.id, -5);
                                    setCouponSuccessMsg(`📉 Reduced "${coupon.code}" discount to ${Math.max(1, coupon.discountValue - 5)}%`);
                                    setTimeout(() => setCouponSuccessMsg(''), 3000);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-[10px] font-medium transition-all cursor-pointer"
                                  title="Reduce discount by 5%"
                                >
                                  -5%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    quickAdjustCouponDiscount(coupon.id, 5);
                                    setCouponSuccessMsg(`📈 Increased "${coupon.code}" discount to ${Math.min(90, coupon.discountValue + 5)}%`);
                                    setTimeout(() => setCouponSuccessMsg(''), 3000);
                                  }}
                                  className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-medium transition-all cursor-pointer"
                                  title="Increase discount by 5%"
                                >
                                  +5%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    quickAdjustCouponDiscount(coupon.id, 10);
                                    setCouponSuccessMsg(`📈 Increased "${coupon.code}" discount to ${Math.min(90, coupon.discountValue + 10)}%`);
                                    setTimeout(() => setCouponSuccessMsg(''), 3000);
                                  }}
                                  className="px-1.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 rounded text-[10px] font-bold transition-all cursor-pointer"
                                  title="Increase discount by 10%"
                                >
                                  +10%
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Scope / Products Column */}
                        <td className="py-4 px-6 text-sm">
                          {coupon.applicableScope === 'specific' && coupon.applicableProducts && coupon.applicableProducts.length > 0 ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 w-max">
                                🎯 {coupon.applicableProducts.length} Product{coupon.applicableProducts.length > 1 ? 's' : ''}
                              </span>
                              <span 
                                className="text-[11px] text-zinc-400 mt-1 max-w-[150px] truncate"
                                title={coupon.applicableProducts.map(pVal => {
                                  const item = inventory.find(i => i.value === pVal);
                                  return item ? `${resolveProductName(item.category, settings.categories, inventory)} (${item.label})` : pVal;
                                }).join(', ')}
                              >
                                {coupon.applicableProducts.map(pVal => {
                                  const item = inventory.find(i => i.value === pVal);
                                  return item ? resolveProductName(item.category, settings.categories, inventory) : pVal;
                                }).slice(0, 2).join(', ')}{coupon.applicableProducts.length > 2 ? '...' : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                              🌐 All Products
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-sm">
                          {(() => {
                            const remaining = getCouponRemainingTime(coupon.expiresAt);
                            if (!coupon.expiresAt) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  <span>♾️ Lifetime</span>
                                </span>
                              );
                            }
                            if (remaining.expired) {
                              return (
                                <div className="flex flex-col">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 w-max">
                                    Expired
                                  </span>
                                  <span className="text-[11px] text-zinc-500 mt-0.5">
                                    {new Date(coupon.expiresAt).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 w-max">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  {remaining.text}
                                </span>
                                <span className="text-[10px] text-zinc-400 mt-0.5" title={new Date(coupon.expiresAt).toLocaleString('en-IN')}>
                                  Ends: {new Date(coupon.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({new Date(coupon.expiresAt).toLocaleDateString('en-IN')})
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Usage / Limit Column */}
                        <td className="py-4 px-6 text-sm">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">
                              {coupon.usageCount || 0} / {coupon.maxUses && coupon.maxUses > 0 ? coupon.maxUses : '∞'}
                            </span>
                            {coupon.maxUses && coupon.maxUses > 0 && (coupon.usageCount || 0) >= coupon.maxUses ? (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded w-max mt-0.5">
                                Limit Reached
                              </span>
                            ) : coupon.maxUses && coupon.maxUses > 0 ? (
                              <span className="text-[10px] text-amber-400 mt-0.5">
                                {Math.max(0, coupon.maxUses - (coupon.usageCount || 0))} left
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 mt-0.5">
                                Unlimited
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-sm text-zinc-400">
                          {coupon.minSpend && coupon.minSpend > 0 ? `₹${coupon.minSpend}` : 'No min.'}
                        </td>

                        <td className="py-4 px-6 text-sm text-zinc-300">
                          {coupon.description || '—'}
                        </td>

                        <td className="py-4 px-6 text-sm">
                          <button
                            type="button"
                            onClick={() => toggleCoupon(coupon.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                              coupon.active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${coupon.active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                            {coupon.active ? 'Active' : 'Disabled'}
                          </button>
                        </td>

                        <td className="py-4 px-6 text-sm text-right">
                          {deleteCouponConfirmId === coupon.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-rose-400">Delete?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteCoupon(coupon.id);
                                  setDeleteCouponConfirmId(null);
                                }}
                                className="px-2 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteCouponConfirmId(null)}
                                className="px-2 py-1 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded text-xs transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCoupon(coupon)}
                                className="p-1.5 text-zinc-400 hover:text-fuchsia-300 hover:bg-fuchsia-950/30 rounded-lg transition-colors cursor-pointer"
                                title="Edit Coupon Discount % & Rules"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteCouponConfirmId(coupon.id)}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                                title="Delete Coupon"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}

                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 text-sm">
                          No coupons created yet. Create one above to give discounts to your customers!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'spin-wheel' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header & Save Action */}
            <div className="bg-[#121215]/90 rounded-3xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-6 sm:p-8 backdrop-blur-xl theme-card relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <Gift className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
                      <span>Lucky Spin Wheel Controls</span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        draftSpinEnabled 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {draftSpinEnabled ? '● LIVE & ACTIVE' : '○ PAUSED'}
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Control the user spin wheel event, discount slice probabilities, coupon validity duration, and redemption limits.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSpinWheelSettings}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-extrabold text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Spin Settings</span>
                </button>
              </div>

              {spinSuccessMsg && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{spinSuccessMsg}</span>
                </div>
              )}

              {spinErrorMsg && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{spinErrorMsg}</span>
                </div>
              )}
            </div>

            {/* Master Toggle Card */}
            <div className="bg-[#121215]/90 rounded-2xl border border-white/10 p-6 backdrop-blur-xl theme-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Spin Wheel System Toggle (ON / OFF)</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    When enabled, the Lucky Spin button is shown in the store header and customers can spin to win discount coupons.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDraftSpinEnabled(!draftSpinEnabled)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                    draftSpinEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  {draftSpinEnabled ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                      <span>Event Enabled (Active)</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-zinc-500" />
                      <span>Event Disabled (Paused)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Discount Percentages & Jackpot Controls Card (50% Control) */}
            <div className="bg-[#121215]/90 rounded-2xl border border-white/10 p-6 backdrop-blur-xl theme-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-400" />
                    <span>Wheel Slices Discount Values & 50% Jackpot Control</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Customize the exact discount percentage given on each slice. You can lower the 50% Jackpot to 15%, 25%, 30% or any percentage.
                  </p>
                </div>

                {/* Quick Jackpot Discount Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-zinc-400 font-medium mr-1">Jackpot Presets:</span>
                  {[
                    { label: '15% Off', val: '15' },
                    { label: '25% Off', val: '25' },
                    { label: '30% Off', val: '30' },
                    { label: '40% Off', val: '40' },
                    { label: '50% Off (Max)', val: '50' }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setDraftDiscount3(p.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        draftDiscount3 === p.val
                          ? 'bg-amber-500 text-zinc-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                          : 'bg-zinc-900 text-zinc-300 hover:text-white border border-white/10'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Slice 2 Discount */}
                <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-indigo-300">Slice 2 Discount Value</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={draftDiscount1}
                      onChange={(e) => setDraftDiscount1(e.target.value)}
                      className="w-full bg-zinc-900 border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      placeholder="10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-bold">% OFF</span>
                  </div>
                  <p className="text-[11px] text-indigo-300/70">Applies on winning Slice 2</p>
                </div>

                {/* Slice 3 Discount */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-emerald-300">Slice 3 Discount Value</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={draftDiscount2}
                      onChange={(e) => setDraftDiscount2(e.target.value)}
                      className="w-full bg-zinc-900 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-bold">% OFF</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/70">Applies on winning Slice 3</p>
                </div>

                {/* Slice 4 / Jackpot Discount */}
                <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 space-y-2 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jackpot Discount Value</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded-full">
                      Full Control
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={draftDiscount3}
                      onChange={(e) => setDraftDiscount3(e.target.value)}
                      className="w-full bg-zinc-900 border border-amber-500/50 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-400"
                      placeholder="50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 font-bold">% OFF</span>
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    Generates <code className="text-white">JACKPOT{draftDiscount3}-XXXX</code> with {draftDiscount3}% off
                  </p>
                </div>
              </div>
            </div>

            {/* Probability Percentages Configuration Card */}
            <div className="bg-[#121215]/90 rounded-2xl border border-white/10 p-6 backdrop-blur-xl theme-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Dices className="w-4 h-4 text-indigo-400" />
                    <span>Slice Probability Percentages (%)</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Define the exact winning chance for each discount slice on the wheel (Calculated using strict <code className="text-indigo-300">Math.random()</code>).
                  </p>
                </div>

                {/* Total Probability Status Pill */}
                {(() => {
                  const p0 = parseFloat(draftProb0) || 0;
                  const p10 = parseFloat(draftProb10) || 0;
                  const p20 = parseFloat(draftProb20) || 0;
                  const p50 = parseFloat(draftProb50) || 0;
                  const total = p0 + p10 + p20 + p50;
                  const isValid = total === 100;

                  return (
                    <div className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                      isValid 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}>
                      <span>Total: {total}%</span>
                      {isValid ? (
                        <span className="text-[10px] text-emerald-400">✓ 100% Balanced</span>
                      ) : (
                        <span className="text-[10px] text-amber-400">⚠ Will Normalize</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium mr-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Quick Presets:
                </span>
                {[
                  { label: '🎯 Standard (50 / 20 / 20 / 10)', p0: 50, p10: 20, p20: 20, p50: 10 },
                  { label: '🎁 Generous (30 / 30 / 30 / 10)', p0: 30, p10: 30, p20: 30, p50: 10 },
                  { label: '💎 High Stakes (70 / 10 / 10 / 10)', p0: 70, p10: 10, p20: 10, p50: 10 },
                  { label: '⚡ Equal 25% (25 / 25 / 25 / 25)', p0: 25, p10: 25, p20: 25, p50: 25 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyProbPreset(preset.p0, preset.p10, preset.p20, preset.p50)}
                    className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Probability Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 0% OFF */}
                <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">0% OFF (No Discount)</span>
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full font-mono">Slice 1</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draftProb0}
                      onChange={(e) => setDraftProb0(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      placeholder="50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">"Better luck next time" outcome</p>
                </div>

                {/* Slice 2 */}
                <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300">{draftDiscount1}% OFF Chance</span>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-900/60 text-indigo-300 rounded-full font-mono">Slice 2</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draftProb10}
                      onChange={(e) => setDraftProb10(e.target.value)}
                      className="w-full bg-zinc-900 border border-indigo-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400 font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-indigo-300/70">Winning chance for {draftDiscount1}% discount</p>
                </div>

                {/* Slice 3 */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300">{draftDiscount2}% OFF Chance</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded-full font-mono">Slice 3</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draftProb20}
                      onChange={(e) => setDraftProb20(e.target.value)}
                      className="w-full bg-zinc-900 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="20"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-emerald-300/70">Winning chance for {draftDiscount2}% discount</p>
                </div>

                {/* Slice 4 / Jackpot */}
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">🎉 {draftDiscount3}% JACKPOT Chance</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-900/60 text-amber-300 rounded-full font-mono">Slice 4</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draftProb50}
                      onChange={(e) => setDraftProb50(e.target.value)}
                      className="w-full bg-zinc-900 border border-amber-500/30 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                      placeholder="10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-amber-300/70">Winning chance for {draftDiscount3}% Jackpot</p>
                </div>
              </div>
            </div>

            {/* Coupon Rules: Expiry & Usage Limits Card */}
            <div className="bg-[#121215]/90 rounded-2xl border border-white/10 p-6 backdrop-blur-xl theme-card space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Won Coupon Rules & Expiration Controls</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Set how long won coupons remain valid and how many times they can be redeemed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Expiry in Days */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Coupon Expiry Duration (Days)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      step="1"
                      value={draftCouponExpiryDays}
                      onChange={(e) => setDraftCouponExpiryDays(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                      placeholder="3"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">Days</span>
                  </div>

                  {/* Expiry presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['1', '3', '7', '14', '30'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDraftCouponExpiryDays(d)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                          draftCouponExpiryDays === d
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                        }`}
                      >
                        {d} Day{parseInt(d) > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Usage Limit per Coupon */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Coupon Usage Limit (Redemptions)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="1"
                      value={draftCouponUsageLimit}
                      onChange={(e) => setDraftCouponUsageLimit(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      placeholder="1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">Uses</span>
                  </div>

                  {/* Usage presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {['1', '2', '5', '10'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setDraftCouponUsageLimit(u)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                          draftCouponUsageLimit === u
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                        }`}
                      >
                        {u} Time{parseInt(u) > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free Spins per Key Buy */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Spins Awarded per 1 Key Purchased</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="1"
                      value={draftFreeSpinsPerKey}
                      onChange={(e) => setDraftFreeSpinsPerKey(e.target.value)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">Spins</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    E.g. If customer buys 1 Key, they get <strong>{draftFreeSpinsPerKey}</strong> spin chance.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-between p-6 bg-zinc-900/60 rounded-2xl border border-white/10">
              <div>
                <h4 className="text-sm font-bold text-white">Apply Live Configuration</h4>
                <p className="text-xs text-zinc-400">All changes take effect immediately across all customer store sessions.</p>
              </div>

              <button
                type="button"
                onClick={handleSaveSpinWheelSettings}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-extrabold text-sm rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'payment-gateway' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Payment Header & Save Action */}
            <div className="bg-[#121215]/90 rounded-3xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-6 sm:p-8 backdrop-blur-xl theme-card relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight theme-text-title">
                      Payment Gateway & API System
                    </h2>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 theme-text-sub">
                      Configure store payment gateways, manage/delete API keys, and set custom UPI & QR codes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSavePaymentSettings}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4" />
                    Save Payment System
                  </button>
                </div>
              </div>

              {/* Alert / Notification Feedback */}
              {paymentSuccessMsg && (
                <div className="mt-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{paymentSuccessMsg}</span>
                </div>
              )}

              {paymentErrorMsg && (
                <div className="mt-5 p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{paymentErrorMsg}</span>
                </div>
              )}
            </div>

            {/* Live Store Payment Power Switch */}
            <div className="bg-[#121215]/90 rounded-3xl border border-white/10 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl theme-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${
                  draftIsPaymentEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 theme-text-title">
                    Online Payments & Wallet Recharge
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      draftIsPaymentEnabled 
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                    }`}>
                      {draftIsPaymentEnabled ? '● Online & Accepting Orders' : '✕ Disabled / Maintenance'}
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 theme-text-sub">
                    {draftIsPaymentEnabled 
                      ? 'Customers can add balance and buy keys directly using UPI gateway / QR.'
                      : 'Payment checkout is paused. Customers will be informed that payments are temporarily undergoing maintenance.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDraftIsPaymentEnabled(!draftIsPaymentEnabled)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  draftIsPaymentEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {draftIsPaymentEnabled ? (
                  <>
                    <ToggleRight className="w-4 h-4 text-emerald-400" />
                    Payments Enabled
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 text-zinc-500" />
                    Payments Paused
                  </>
                )}
              </button>
            </div>

            {/* Gateway Mode Selection Cards */}
            <div className="bg-[#121215]/90 rounded-3xl border border-white/10 p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl theme-card space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 theme-text-title">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  Choose Payment Gateway Provider
                </h3>
                <p className="text-xs text-zinc-400 mt-1 theme-text-sub">
                  Select which payment routing system you want your store to use for instant orders & wallet deposits.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Mode 1: FamGateway */}
                <div
                  onClick={() => setDraftPaymentProvider('famgateway')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                    draftPaymentProvider === 'famgateway'
                      ? 'bg-indigo-950/40 border-indigo-500/60 shadow-[0_0_25px_rgba(99,102,241,0.2)] text-white'
                      : 'bg-zinc-900/40 border-white/5 hover:border-white/20 text-zinc-400 hover:bg-zinc-900/80 theme-card'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold text-sm">
                        ⚡
                      </div>
                      {draftPaymentProvider === 'famgateway' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          Selected
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white theme-text-title">FamGateway / UPI Gateway</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed theme-text-sub">
                      Automated instant UPI checkout link generation with real-time webhook & auto key delivery.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-indigo-300 font-medium">
                    ✓ 0% Setup • Instant API Key Verification
                  </div>
                </div>

                {/* Mode 2: Direct Custom UPI */}
                <div
                  onClick={() => setDraftPaymentProvider('custom_upi')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                    draftPaymentProvider === 'custom_upi'
                      ? 'bg-violet-950/40 border-violet-500/60 shadow-[0_0_25px_rgba(139,92,246,0.2)] text-white'
                      : 'bg-zinc-900/40 border-white/5 hover:border-white/20 text-zinc-400 hover:bg-zinc-900/80 theme-card'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 font-bold text-sm">
                        📱
                      </div>
                      {draftPaymentProvider === 'custom_upi' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                          Selected
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white theme-text-title">Direct UPI & Dynamic QR</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed theme-text-sub">
                      Accept payments directly to your personal or business UPI ID (GPay, PhonePe, Paytm, BHIM).
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-violet-300 font-medium">
                    ✓ Direct UPI ID • Instant QR Code Display
                  </div>
                </div>

                {/* Mode 3: Custom Gateway API */}
                <div
                  onClick={() => setDraftPaymentProvider('manual_qr')}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                    draftPaymentProvider === 'manual_qr'
                      ? 'bg-purple-950/40 border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.2)] text-white'
                      : 'bg-zinc-900/40 border-white/5 hover:border-white/20 text-zinc-400 hover:bg-zinc-900/80 theme-card'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-sm">
                        ⚙️
                      </div>
                      {draftPaymentProvider === 'manual_qr' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          Selected
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-white theme-text-title">Custom Endpoint / Webhook</h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed theme-text-sub">
                      Connect custom payment server, third-party webhook handler, or merchant proxy endpoints.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-purple-300 font-medium">
                    ✓ Custom Proxy • Developer Webhook
                  </div>
                </div>
              </div>
            </div>

            {/* API Key Management Center (Delete, Add New, Test Ping) */}
            <div className="bg-[#121215]/90 rounded-3xl border border-white/10 p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl theme-card space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-white/10 theme-modal-section">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 theme-text-title">
                    <Key className="w-5 h-5 text-indigo-400" />
                    Payment API Key Management Center
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 theme-text-sub">
                    Delete old keys, enter new API credentials, and test live connection before deploying.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultApiKey}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Restore Default Key
                  </button>
                </div>
              </div>

              {/* Current Active API Key Box */}
              <div className="bg-[#18181f]/80 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 theme-card">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 theme-text-title">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    CURRENT ACTIVE API KEY
                  </span>
                  {draftFamApiKey ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ● Active & Configured
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                      ✕ No API Key Set
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? "text" : "password"}
                      readOnly
                      value={draftFamApiKey || '(No API Key configured - please enter below)'}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-zinc-200 focus:outline-none theme-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 transition-colors"
                      title={showApiKey ? "Hide Key" : "Show Key"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {draftFamApiKey && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(draftFamApiKey);
                          setCopiedApiKey(true);
                          setTimeout(() => setCopiedApiKey(false), 2000);
                        }}
                        className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedApiKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedApiKey ? 'Copied' : 'Copy Key'}
                      </button>

                      {/* Delete API Key Button */}
                      {deleteApiKeyConfirm ? (
                        <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-500/40 p-1 rounded-xl animate-in fade-in">
                          <span className="text-[11px] text-rose-300 font-bold px-1.5">Delete?</span>
                          <button
                            type="button"
                            onClick={handleDeleteApiKey}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteApiKeyConfirm(false)}
                            className="px-2 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteApiKeyConfirm(true)}
                          className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Delete API Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Key
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Input for Entering New API Key */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                  ENTER / REPLACE WITH NEW API KEY
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={draftFamApiKey}
                      onChange={(e) => {
                        setDraftFamApiKey(e.target.value);
                        setTestApiKeyResult(null);
                      }}
                      placeholder="e.g. fam_b498f3cf06ce60dd253667adc30a6a2b142584cf"
                      className="w-full bg-[#131317] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all theme-input"
                    />
                    {draftFamApiKey && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-mono">
                        {draftFamApiKey.length} chars
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isTestingApiKey || !draftFamApiKey.trim()}
                    onClick={handleTestApiKey}
                    className="px-5 py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                  >
                    {isTestingApiKey ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                        Testing Ping...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-indigo-400" />
                        Test Connection
                      </>
                    )}
                  </button>
                </div>

                {/* Test Connection Status Result Box */}
                {testApiKeyResult && (
                  <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in ${
                    testApiKeyResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                  }`}>
                    {testApiKeyResult.success ? (
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span className="font-medium">{testApiKeyResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* UPI ID & Merchant Customization */}
            <div className="bg-[#121215]/90 rounded-3xl border border-white/10 p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-xl theme-card space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 theme-text-title">
                  <QrCode className="w-5 h-5 text-indigo-400" />
                  UPI & Receiver Information
                </h3>
                <p className="text-xs text-zinc-400 mt-1 theme-text-sub">
                  Set your UPI ID, receiver business name, and optional custom QR code image for payment displays.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Receiver UPI ID */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                    PRIMARY RECEIVER UPI ID
                  </label>
                  <input
                    type="text"
                    value={draftUpiId}
                    onChange={(e) => setDraftUpiId(e.target.value)}
                    placeholder="e.g. fatherxsir@upi or barikarman@okaxis"
                    className="w-full bg-[#131317] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 theme-input"
                  />
                  <p className="text-[11px] text-zinc-500 theme-text-sub">
                    Direct payment requests and QR intents will be routed to this VPA.
                  </p>
                </div>

                {/* Receiver Business Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                    MERCHANT / BUSINESS NAME
                  </label>
                  <input
                    type="text"
                    value={draftUpiName}
                    onChange={(e) => setDraftUpiName(e.target.value)}
                    placeholder="e.g. ARMAN X STORE"
                    className="w-full bg-[#131317] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 theme-input"
                  />
                  <p className="text-[11px] text-zinc-500 theme-text-sub">
                    Appears as payee title on UPI verification and invoice screens.
                  </p>
                </div>

                {/* Minimum Deposit Limit */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                    MINIMUM WALLET DEPOSIT AMOUNT (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={draftMinDepositAmount}
                      onChange={(e) => setDraftMinDepositAmount(e.target.value)}
                      placeholder="10"
                      className="w-full bg-[#131317] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-xs sm:text-sm font-mono font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 theme-input"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 theme-text-sub">
                    Minimum allowed amount for "Add Balance" modal (default: ₹10).
                  </p>
                </div>

                {/* Custom Notice Message */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                    CHECKOUT NOTICE / INSTRUCTION
                  </label>
                  <input
                    type="text"
                    value={draftNoticeMessage}
                    onChange={(e) => setDraftNoticeMessage(e.target.value)}
                    placeholder="e.g. Instant payment • Auto-delivery within 5 seconds"
                    className="w-full bg-[#131317] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 theme-input"
                  />
                  <p className="text-[11px] text-zinc-500 theme-text-sub">
                    Displayed below the payment checkout button.
                  </p>
                </div>
              </div>

              {/* Custom QR Code Upload & Preview */}
              <div className="pt-2 border-t border-white/5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 theme-text-title">
                  CUSTOM QR CODE IMAGE (OPTIONAL)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {draftQrImageUrl ? (
                    <div className="w-20 h-20 rounded-2xl bg-white p-1 border border-white/20 overflow-hidden shrink-0 shadow-lg relative group">
                      <img src={draftQrImageUrl} alt="QR Code" className="w-full h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setDraftQrImageUrl('')}
                        className="absolute inset-0 bg-black/70 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 shrink-0">
                      <QrCode className="w-6 h-6" />
                      <span className="text-[9px] mt-1">No Image</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleQrUpload(e.target.files?.[0] || null)}
                      className="w-full text-xs text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/30 cursor-pointer"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Upload your Google Pay / Paytm / PhonePe Merchant QR code for manual payment display fallback.
                    </p>
                  </div>
                </div>
              </div>

              {/* Final Save Action Bar */}
              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Changes are saved instantly to Firebase Firestore & synced with all customers.</span>
                </div>

                <button
                  type="button"
                  onClick={handleSavePaymentSettings}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_25px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  Save Payment System Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {(activeTab === 'faqs' || activeTab === 'faq') && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header Box */}
            <div className="bg-[#121215]/90 rounded-3xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-6 sm:p-8 backdrop-blur-xl theme-card relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight theme-text-title flex items-center gap-2">
                      <span>FAQ & Help Center Management</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {faqs.length} Questions
                      </span>
                    </h2>
                    <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 theme-text-sub">
                      Manage customer questions & answers shown in the Homepage FAQ accordion. Add, edit, reorder and publish in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  {onNavigateHome && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateHome();
                        setTimeout(() => {
                          const el = document.getElementById('faq');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="px-3.5 py-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer theme-pill"
                      title="Preview on Homepage"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Live FAQ</span>
                    </button>
                  )}

                  {resetFaqConfirm ? (
                    <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-500/40 p-1 rounded-xl animate-in fade-in">
                      <span className="text-[11px] text-amber-300 font-bold px-1.5">Reset to defaults?</span>
                      <button
                        type="button"
                        onClick={handleResetFaqs}
                        className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Yes, Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetFaqConfirm(false)}
                        className="px-2 py-1.5 bg-zinc-800 text-zinc-400 hover:text-white text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setResetFaqConfirm(true)}
                      className="px-3.5 py-2.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer theme-pill"
                      title="Restore Standard Default Questions"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Reset Defaults</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenAddFaq}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Question</span>
                  </button>
                </div>
              </div>

              {/* Toast Feedback */}
              {faqSuccessMsg && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{faqSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Telegram Community & FAQ Channel Configuration Box */}
            <div className="bg-gradient-to-r from-sky-950/30 via-[#121215] to-[#121215] rounded-3xl border border-sky-500/30 p-6 sm:p-7 shadow-[0_4px_25px_rgba(14,165,233,0.12)] backdrop-blur-xl theme-card space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/10 theme-modal-section">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.25)]">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 theme-text-title">
                      <span>Telegram Channel & Bot Community Link</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        Live on FAQ Section
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400 theme-text-sub">
                      Customer FAQ section aur Help banner par display hone wala official Telegram link configure karein.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftFaqTelegramLink('https://t.me/FATHERXSIR');
                    }}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-sky-300 hover:text-white border border-sky-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Preset: t.me/FATHERXSIR
                  </button>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 pt-1">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sky-400">
                    <Send className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={draftFaqTelegramLink}
                    onChange={(e) => setDraftFaqTelegramLink(e.target.value)}
                    placeholder="e.g. https://t.me/FATHERXSIR or t.me/FATHERXSIR"
                    className="w-full bg-[#16161c] border border-sky-500/30 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 transition-all theme-input"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={draftFaqTelegramLink.startsWith('http') ? draftFaqTelegramLink : `https://${draftFaqTelegramLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test Link</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleSaveFaqTelegramLink}
                    className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Telegram Link</span>
                  </button>
                </div>
              </div>

              {faqTelegramSavedMsg && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{faqTelegramSavedMsg}</span>
                </div>
              )}
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#121215]/90 border border-white/10 rounded-2xl p-4 sm:p-5 theme-card">
                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mb-1 theme-text-sub">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Total Questions
                </span>
                <div className="text-2xl font-bold text-white theme-text-title">{faqs.length}</div>
                <span className="text-[11px] text-zinc-500 mt-1 block">In database store</span>
              </div>

              <div className="bg-[#121215]/90 border border-white/10 rounded-2xl p-4 sm:p-5 theme-card">
                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mb-1 theme-text-sub">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Published (Active)
                </span>
                <div className="text-2xl font-bold text-emerald-400">{faqs.filter(f => f.isActive).length}</div>
                <span className="text-[11px] text-emerald-500/80 mt-1 block">Live on store homepage</span>
              </div>

              <div className="bg-[#121215]/90 border border-white/10 rounded-2xl p-4 sm:p-5 theme-card">
                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mb-1 theme-text-sub">
                  <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                  Hidden (Drafts)
                </span>
                <div className="text-2xl font-bold text-amber-400">{faqs.filter(f => !f.isActive).length}</div>
                <span className="text-[11px] text-amber-500/80 mt-1 block">Not visible to customers</span>
              </div>

              <div className="bg-[#121215]/90 border border-white/10 rounded-2xl p-4 sm:p-5 theme-card">
                <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mb-1 theme-text-sub">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  Categories
                </span>
                <div className="text-2xl font-bold text-purple-400">{Array.from(new Set(faqs.map(f => f.category))).length}</div>
                <span className="text-[11px] text-zinc-500 mt-1 block">Unique topic groups</span>
              </div>
            </div>

            {/* Quick Starter Templates */}
            <div className="bg-[#121215]/90 rounded-2xl border border-white/10 p-4 sm:p-5 theme-card">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold text-white theme-text-title">
                    ⚡ Quick Starter Templates (1-Click Add Common Questions)
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">Tap any template to add to your FAQ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  {
                    question: 'How do I download and install the loader APK?',
                    answer: 'After purchasing your key, download the recommended Loader APK from our Telegram channel or WhatsApp update link. Install the APK, open it, paste your license key and tap Start.',
                    category: 'Activation & Keys'
                  },
                  {
                    question: 'What happens if a payment gets stuck in banking server?',
                    answer: 'If your money was deducted but order was not verified within 2 minutes, simply note your 12-digit UTR / UPI Ref ID and send it to our WhatsApp support. Our admin will credit keys or wallet instantly.',
                    category: 'Payment & UPI'
                  },
                  {
                    question: 'Can I transfer key to another phone?',
                    answer: 'Keys are hardware-bound upon first activation for anti-sharing security. If you change your phone, contact support with your purchase receipt for a free hardware ID reset.',
                    category: 'Activation & Keys'
                  }
                ].map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPresetFaq(template)}
                    className="p-3 text-left rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-indigo-500/40 transition-all text-xs group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px] text-indigo-400 font-bold mb-1">
                      <span>{template.category}</span>
                      <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-zinc-200 group-hover:text-white font-medium line-clamp-1">
                      {template.question}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-[#121215]/90 rounded-2xl border border-white/10 p-4 sm:p-5 theme-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={faqSearchQuery}
                  onChange={(e) => setFaqSearchQuery(e.target.value)}
                  placeholder="Search questions, answers or categories..."
                  className="w-full bg-[#16161b] border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 theme-input"
                />
                {faqSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFaqSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Filter */}
                <select
                  value={faqCategoryFilter}
                  onChange={(e) => setFaqCategoryFilter(e.target.value)}
                  className="bg-[#16161b] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-indigo-500 theme-input cursor-pointer"
                >
                  <option value="all">All Categories ({faqs.length})</option>
                  {Array.from(new Set(faqs.map(f => f.category))).map(cat => (
                    <option key={cat} value={cat}>
                      {cat} ({faqs.filter(f => f.category === cat).length})
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={faqStatusFilter}
                  onChange={(e) => setFaqStatusFilter(e.target.value as any)}
                  className="bg-[#16161b] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-semibold text-zinc-300 focus:outline-none focus:border-indigo-500 theme-input cursor-pointer"
                >
                  <option value="all">All Statuses ({faqs.length})</option>
                  <option value="active">Active / Published ({faqs.filter(f => f.isActive).length})</option>
                  <option value="inactive">Hidden / Draft ({faqs.filter(f => !f.isActive).length})</option>
                </select>
              </div>
            </div>

            {/* FAQs List */}
            {(() => {
              const q = faqSearchQuery.trim().toLowerCase();
              const filteredList = faqs
                .filter(faq => {
                  const matchesCat = faqCategoryFilter === 'all' || faq.category === faqCategoryFilter;
                  const matchesStatus = 
                    faqStatusFilter === 'all' ? true :
                    faqStatusFilter === 'active' ? faq.isActive : !faq.isActive;
                  const matchesQ = !q ||
                    faq.question.toLowerCase().includes(q) ||
                    faq.answer.toLowerCase().includes(q) ||
                    faq.category.toLowerCase().includes(q);
                  return matchesCat && matchesStatus && matchesQ;
                })
                .sort((a, b) => (a.order || 0) - (b.order || 0));

              if (filteredList.length === 0) {
                return (
                  <div className="bg-[#121215]/90 rounded-3xl border border-white/10 p-12 text-center theme-card">
                    <HelpCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-40" />
                    <h3 className="text-base font-bold text-white mb-1">No FAQ Questions Found</h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                      {faqSearchQuery || faqCategoryFilter !== 'all' || faqStatusFilter !== 'all'
                        ? 'No questions match your current search and filter settings.'
                        : 'No FAQ questions created yet. Add your first question to guide customers on the homepage.'}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      {(faqSearchQuery || faqCategoryFilter !== 'all' || faqStatusFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setFaqSearchQuery('');
                            setFaqCategoryFilter('all');
                            setFaqStatusFilter('all');
                          }}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl"
                        >
                          Clear Filters
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenAddFaq}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                      >
                        + Add Question
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3.5">
                  {filteredList.map((faq, idx) => {
                    const isExpanded = expandedFaqCardId === faq.id;
                    const isConfirmingDelete = deleteFaqConfirmId === faq.id;

                    return (
                      <div
                        key={faq.id}
                        className={`rounded-2xl border transition-all duration-200 overflow-hidden theme-card ${
                          faq.isActive 
                            ? 'bg-[#121215]/90 border-white/10 hover:border-indigo-500/40' 
                            : 'bg-zinc-950/60 border-zinc-800 opacity-75'
                        }`}
                      >
                        {/* Question Card Header */}
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Order & Reorder arrows */}
                            <div className="flex flex-col items-center bg-zinc-900/90 border border-white/5 rounded-xl p-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveFaqOrder(faq, 'up')}
                                disabled={idx === 0}
                                className="p-0.5 text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                title="Move up in order"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[11px] font-mono font-bold text-zinc-400 px-1">
                                #{faq.order || idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleMoveFaqOrder(faq, 'down')}
                                disabled={idx === filteredList.length - 1}
                                className="p-0.5 text-zinc-500 hover:text-white disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                                title="Move down in order"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                                  <Tag className="w-2.5 h-2.5" />
                                  <span>{faq.category}</span>
                                </span>

                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  faq.isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                }`}>
                                  {faq.isActive ? '● Published' : '○ Hidden'}
                                </span>
                              </div>

                              <h3 
                                onClick={() => setExpandedFaqCardId(isExpanded ? null : faq.id)}
                                className="text-sm sm:text-base font-bold text-white theme-text-title cursor-pointer hover:text-indigo-300 transition-colors"
                              >
                                {faq.question}
                              </h3>

                              {/* Collapsed answer sneak peek */}
                              {!isExpanded && (
                                <p className="text-xs text-zinc-400 mt-1 line-clamp-1 theme-text-sub">
                                  {faq.answer}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {/* Toggle Publish / Hidden */}
                            <button
                              type="button"
                              onClick={() => toggleFAQ(faq.id)}
                              className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                faq.isActive
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                                  : 'bg-zinc-900 text-zinc-400 border-white/5 hover:bg-zinc-800'
                              }`}
                              title={faq.isActive ? 'Click to hide from store' : 'Click to publish on store'}
                            >
                              {faq.isActive ? (
                                <ToggleRight className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-zinc-500" />
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditFaq(faq)}
                              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                              title="Edit Question & Answer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {/* Delete Button with Confirmation */}
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-500/40 p-1 rounded-xl animate-in fade-in">
                                <span className="text-[10px] text-rose-300 font-bold px-1">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteFAQ(faq.id);
                                    setDeleteFaqConfirmId(null);
                                    setFaqSuccessMsg('Question deleted.');
                                    setTimeout(() => setFaqSuccessMsg(''), 3000);
                                  }}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteFaqConfirmId(null)}
                                  className="px-2 py-1 bg-zinc-800 text-zinc-400 hover:text-white text-[11px] rounded-lg cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteFaqConfirmId(faq.id)}
                                className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                                title="Delete FAQ Question"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Expand / Collapse Button */}
                            <button
                              type="button"
                              onClick={() => setExpandedFaqCardId(isExpanded ? null : faq.id)}
                              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
                              title={isExpanded ? 'Collapse Answer' : 'Expand Answer'}
                            >
                              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-400' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Full Answer Content */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-black/20 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-2 animate-in fade-in duration-150 theme-text-sub">
                            <div className="font-semibold text-zinc-400 text-[11px] uppercase tracking-wider">
                              Customer Answer:
                            </div>
                            <p className="whitespace-pre-line bg-zinc-900/40 p-3.5 rounded-xl border border-white/5 text-zinc-200">
                              {faq.answer}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                              <span>Display Order: #{faq.order || 1}</span>
                              {faq.updatedAt && (
                                <span>Updated: {new Date(faq.updatedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="py-12 text-center bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)]">
            <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Analytics Module</h3>
            <p className="text-zinc-500">Advanced analytics and revenue charts are being configured.</p>
          </div>
        )}
        
        {activeTab !== 'overview' && activeTab !== 'inventory' && activeTab !== 'settings' && activeTab !== 'orders' && activeTab !== 'customers' && activeTab !== 'coupons' && activeTab !== 'spin-wheel' && activeTab !== 'payment-gateway' && activeTab !== 'faqs' && activeTab !== 'faq' && activeTab !== 'analytics' && activeTab !== 'menu' && (
          <div className="py-12 text-center bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)]">
            <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
            <p className="text-zinc-500">This module is currently under development.</p>
          </div>
        )}
          </div>
        )}

      </div>
      
      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-fuchsia-500/50 shadow-[0_-5px_30px_rgba(224,0,255,0.2)] z-50 animate-in slide-in-from-bottom flex justify-between items-center px-8">
          <div>
            <h4 className="text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">You have unsaved changes</h4>
            <p className="text-sm text-zinc-400">Do you want to save the changes made to your settings?</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleDiscardChanges}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700"
            >
              Discard
            </button>
            <button 
              onClick={handleSaveSettings}
              className="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg transition-colors shadow-[0_0_15px_rgba(224,0,255,0.4)]"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Manage Keys Modal */}
      {manageKeysProduct && (() => {
        const product = inventory.find(i => i.value === manageKeysProduct);
        if (!product) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
              setManageKeysProduct(null);
              setDeleteKeyConfirmIdx(null);
            }}></div>
            <div className="relative bg-zinc-950 border border-fuchsia-500/30 shadow-[0_0_30px_rgba(224,0,255,0.2)] rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-fuchsia-500/20">
                <div>
                  <h3 className="text-2xl font-bold text-white font-display drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                    Manage Keys
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">{resolveProductName(product.category, settings.categories, inventory)} - {product.label}</p>
                </div>
                <button 
                  onClick={() => {
                    setManageKeysProduct(null);
                    setDeleteKeyConfirmIdx(null);
                  }}
                  className="text-zinc-400 hover:text-white hover:bg-fuchsia-500/20 transition-all p-2 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4 flex justify-between items-center">
                  <span className="text-zinc-300 font-medium">Total Unsold Keys: <span className="text-fuchsia-400 font-bold">{product.keys.length}</span></span>
                </div>
                
                {product.keys.length === 0 ? (
                  <div className="text-center py-12 border border-zinc-800 border-dashed rounded-xl bg-zinc-900/30">
                    <p className="text-zinc-500">No available keys in this product.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {product.keys.map((key, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-3 rounded-lg hover:border-fuchsia-500/30 transition-all">
                        <code className="text-sm text-zinc-300 font-mono break-all">{key}</code>
                        {deleteKeyConfirmIdx === idx ? (
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            <span className="text-xs text-zinc-400">Delete?</span>
                            <button
                              onClick={() => {
                                removeKey(product.value, key);
                                setDeleteKeyConfirmIdx(null);
                              }}
                              className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded hover:bg-red-500/30 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteKeyConfirmIdx(null)}
                              className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs font-medium rounded hover:bg-zinc-700 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteKeyConfirmIdx(idx)}
                            className="ml-4 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                            title="Remove Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-fuchsia-500/20 bg-zinc-950">
                <button
                  onClick={() => {
                    setManageKeysProduct(null);
                    setDeleteKeyConfirmIdx(null);
                  }}
                  className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium border border-zinc-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* FAQ Add / Edit Modal */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={() => setIsFaqModalOpen(false)}
          />
          <div className="relative bg-[#121216] border border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.25)] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10 theme-modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-display theme-text-title">
                    {editingFaq ? 'Edit FAQ Question' : 'Add New FAQ Question'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 theme-text-sub">
                    Published questions appear immediately on the customer-facing homepage FAQ accordion.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFaqModalOpen(false)}
                className="text-zinc-400 hover:text-white hover:bg-white/10 transition-all p-2 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {faqFormError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{faqFormError}</span>
                </div>
              )}

              {/* Question Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                  QUESTION TITLE *
                </label>
                <input
                  type="text"
                  value={faqFormQuestion}
                  onChange={(e) => setFaqFormQuestion(e.target.value)}
                  placeholder="e.g. Payment ke baad key kitni der me milti hai?"
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 theme-input"
                />
              </div>

              {/* Category & Order Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                    TOPIC CATEGORY
                  </label>
                  <select
                    value={faqFormCategory}
                    onChange={(e) => setFaqFormCategory(e.target.value)}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 theme-input cursor-pointer"
                  >
                    <option value="Purchases & Delivery">Purchases & Delivery</option>
                    <option value="Payment & UPI">Payment & UPI</option>
                    <option value="Activation & Keys">Activation & Keys</option>
                    <option value="Wallet & Balance">Wallet & Balance</option>
                    <option value="Support & Help">Support & Help</option>
                    <option value="Coupons & Rewards">Coupons & Rewards</option>
                    <option value="Custom">Custom Category...</option>
                  </select>
                </div>

                {/* Display Order */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                    DISPLAY ORDER INDEX (1, 2, 3...)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={faqFormOrder}
                    onChange={(e) => setFaqFormOrder(e.target.value)}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm font-mono text-white focus:outline-none focus:border-indigo-500 theme-input"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Custom Category Input if selected */}
              {faqFormCategory === 'Custom' && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="block text-xs font-bold uppercase tracking-wider text-indigo-400">
                    ENTER CUSTOM CATEGORY NAME
                  </label>
                  <input
                    type="text"
                    value={faqFormCustomCategory}
                    onChange={(e) => setFaqFormCustomCategory(e.target.value)}
                    placeholder="e.g. Android 14 Compatibility"
                    className="w-full bg-[#181820] border border-indigo-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-400 theme-input"
                  />
                </div>
              )}

              {/* Publish Toggle */}
              <div className="p-4 bg-[#181820] border border-white/10 rounded-2xl flex items-center justify-between gap-3 theme-card">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white theme-text-title">
                    Publish on Homepage
                  </h4>
                  <p className="text-[11px] text-zinc-400 theme-text-sub">
                    {faqFormActive ? 'Visible to all customers in the FAQ accordion.' : 'Hidden as draft (not visible on store).'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFaqFormActive(!faqFormActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    faqFormActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {faqFormActive ? (
                    <>
                      <ToggleRight className="w-4 h-4 text-emerald-400" />
                      <span>Published</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4 text-zinc-500" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>
              </div>

              {/* Answer Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 theme-text-title">
                    ANSWER CONTENT *
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {faqFormAnswer.length} chars
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={faqFormAnswer}
                  onChange={(e) => setFaqFormAnswer(e.target.value)}
                  placeholder="Provide clear, step-by-step instructions or information for customers. Multi-line text is preserved..."
                  className="w-full bg-[#181820] border border-white/10 rounded-xl p-4 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 leading-relaxed theme-input"
                />
              </div>

              {/* Live Preview Box */}
              {(faqFormQuestion || faqFormAnswer) && (
                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>Live Customer Preview (Homepage Accordion)</span>
                  </div>
                  <div className="p-3 bg-[#14151b] rounded-xl border border-indigo-500/30">
                    <div className="font-bold text-sm text-white mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] flex items-center justify-center font-mono font-bold">
                        {faqFormOrder || '1'}
                      </span>
                      <span>{faqFormQuestion || 'Your question here...'}</span>
                    </div>
                    <p className="text-xs text-zinc-300 pl-7 whitespace-pre-line leading-relaxed">
                      {faqFormAnswer || 'Your detailed answer preview...'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 bg-[#121216] flex justify-end gap-3 theme-modal-footer">
              <button
                type="button"
                onClick={() => setIsFaqModalOpen(false)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFaq}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>{editingFaq ? 'Update Question' : 'Save Question'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Coupon Modal */}
      {editingCoupon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setEditingCoupon(null)}
          />
          <div className="relative bg-[#121216] border border-fuchsia-500/40 shadow-[0_0_40px_rgba(224,0,255,0.25)] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white font-display">
                    Edit Coupon ({editingCoupon.code})
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Adjust discount percentage, flat rate, validity, limits, and product scope.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {editError && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Coupon Code */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={editCouponCode}
                  onChange={(e) => setEditCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-[#181820] border border-white/10 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setEditDiscountType('percentage')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        editDiscountType === 'percentage'
                          ? 'bg-fuchsia-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      % Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDiscountType('flat')}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        editDiscountType === 'flat'
                          ? 'bg-fuchsia-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      ₹ Flat
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Discount Value {editDiscountType === 'percentage' ? '(%)' : '(₹)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max={editDiscountType === 'percentage' ? '90' : '99999'}
                      value={editDiscountValue}
                      onChange={(e) => setEditDiscountValue(e.target.value)}
                      className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-fuchsia-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">
                      {editDiscountType === 'percentage' ? '%' : '₹'}
                    </span>
                  </div>

                  {/* Percentage Presets & Steppers */}
                  {editDiscountType === 'percentage' && (
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      {['10', '15', '20', '25', '30', '40', '50'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setEditDiscountValue(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            editDiscountValue === p
                              ? 'bg-fuchsia-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Validity & Usage Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Valid Hours (0 = Lifetime)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editValidHours}
                    onChange={(e) => setEditValidHours(e.target.value)}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                    placeholder="24"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Max Uses Limit (0 = Unlimited)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editMaxUses}
                    onChange={(e) => setEditMaxUses(e.target.value)}
                    className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Min Spend */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Minimum Spend (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editMinSpend}
                  onChange={(e) => setEditMinSpend(e.target.value)}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  placeholder="0"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Description / Badge Text
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#181820] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  placeholder="e.g. 20% Off on all keys"
                />
              </div>

              {/* Status Toggle */}
              <div className="p-4 bg-[#181820] border border-white/10 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Coupon Status</h4>
                  <p className="text-xs text-zinc-400">
                    {editActive ? 'Active and redeemable at checkout' : 'Disabled / Paused'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    editActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
                >
                  {editActive ? 'Active' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 bg-[#121216] flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingCoupon(null)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditedCoupon}
                className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(224,0,255,0.4)] cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Save Coupon Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

