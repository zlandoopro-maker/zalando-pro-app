import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, FileText, Copy, Check, QrCode } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType, parseUserProfile } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { Screen, UserProfile } from '../types';
import { startHumming } from '../lib/haptics';
import { useNotification } from './NotificationProvider';
import { notifyAdminOfRequest } from '../lib/notificationSystem';
import { QRCodeSVG } from 'qrcode.react';

interface DepositProps {
  onBack: () => void;
  onKyc?: () => void;
  onNavigate?: (s: Screen) => void;
  key?: string;
}

type RecordStatus = 'All' | 'Rejected' | 'Reviewing' | 'Passed' | 'Completed';

interface DepositRecord {
  id: string;
  amount: number;
  paymentMethod: string;
  orderId?: string;
  nowpaymentsInvoiceId?: string;
  status: string;
  timestamp: string;
  remark?: string;
}

// ─── Colors (Matching Withdrawal design) ────────────────────────────────────
const PRIMARY   = '#5B5BD6';
const CYAN      = '#3BBFEF';
const NAV_BG    = '#4040A0';
const PAGE_BG   = '#F5F5FA';

// ─── Nav Icons ───────────────────────────────────────────────────────────────
const NavHomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 4l9 8" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const NavOrderIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="2" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
    <line x1="8" y1="8" x2="16" y2="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="8" y1="16" x2="12" y2="16" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const NavTeamIcon = () => (
  <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="9" r="4" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
    <circle cx="5"  cy="10" r="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8"/>
    <circle cx="21" cy="10" r="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8"/>
    <path d="M1 22c0-3 1.8-5 4-5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M25 22c0-3-1.8-5-4-5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const NavAccountIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.7)" strokeWidth="2"/>
    <circle cx="12" cy="9" r="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8"/>
    <path d="M6 20c0-3 2.7-5 6-5s6 2 6 5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);



// ─── Deposit Record Sub-page ────────────────────────────────────────────────
function DepositRecordPage({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<RecordStatus>('All');
  const [records, setRecords] = useState<DepositRecord[]>([]);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate]   = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  });

  // ── Fetch deposit records from Supabase (realtime) ──────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    const fetchRecords = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'deposit')
        .order('timestamp', { ascending: false });

      if (error) { console.error('[DepositRecord] Supabase error:', error); return; }

      const rows: DepositRecord[] = (data || []).map(d => ({
        id:                   d.id,
        amount:               d.amount || 0,
        paymentMethod:        d.payment_method || 'usdt',
        orderId:              d.order_id || '',
        nowpaymentsInvoiceId: d.nowpayments_invoice_id || '',
        status:               d.status || 'pending',
        timestamp:            d.timestamp || d.created_at || '',
        remark:               d.rejection_reason || '',
      }));
      setRecords(rows);
    };

    fetchRecords();

    // Realtime — auto-updates when webhook changes status in DB
    const channel = supabase
      .channel(`deposit-records-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => { fetchRecords(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Poll NOWPayments API for live status (frontend UI fallback) ───────────
  // Webhook is the primary mechanism. This gives immediate visual feedback.
  useEffect(() => {
    // ✅ FIX: Use nowpaymentsInvoiceId for polling, NOT orderId (which is the Supabase UUID)
    const pendingNowPayments = records.filter(
      r => r.paymentMethod === 'nowpayments' && r.status === 'pending' && r.nowpaymentsInvoiceId
    );
    if (pendingNowPayments.length === 0) return;

    let mounted = true;
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;

    const checkStatuses = async () => {
      for (const record of pendingNowPayments) {
        try {
          const res = await fetch(`${baseUrl}/api/crypto-pay/status/${record.nowpaymentsInvoiceId}`, {
            headers: {
              'Bypass-Tunnel-Reminder': 'true',
              'ngrok-skip-browser-warning': 'true'
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.payment_status && mounted) {
              setLiveStatuses(prev => ({ ...prev, [record.id]: data.payment_status }));
            }
          }
        } catch (e) {
          // Silently ignore — webhook handles persistence
        }
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 10000);

    return () => { mounted = false; clearInterval(interval); };
  }, [records]);

  const statusMap: Record<string, RecordStatus> = {
    pending:   'Reviewing',
    completed: 'Completed',
    failed:    'Rejected',
    passed:    'Passed',
    rejected:  'Rejected',
    reviewing: 'Reviewing',
  };

  const filteredRecords = records.filter(r => {
    if (activeTab !== 'All' && statusMap[r.status] !== activeTab) return false;
    if (r.timestamp) {
      const d = r.timestamp.split('T')[0];
      if (d < startDate || d > endDate) return false;
    }
    return true;
  });

  const formatTs = (ts: string) => {
    try { return ts.replace('T', ' ').substring(0, 19); } catch { return ts; }
  };

  const tabStatuses: RecordStatus[] = ['All', 'Rejected', 'Reviewing', 'Passed', 'Completed'];

  const statusDisplayMap: Record<string, string> = {
    pending:   'Reviewing',
    completed: 'Completed',
    failed:    'Rejected',
    passed:    'Passed',
    rejected:  'Rejected',
    reviewing: 'Reviewing',
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
      style={{ background: PAGE_BG, height: '100%', display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter','Segoe UI',sans-serif", overflow: 'hidden' }}>

      {/* ── LOCKED TOP HEADER BLOCK (Header Title, Tabs & Date Filter Locked at Top) ─────── */}
      <div style={{ background: '#fff', flexShrink: 0, zIndex: 30, borderBottom: '1px solid #EEEEF0', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 16px 10px 16px' }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 4, marginRight: 8, display: 'flex', alignItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#222" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ flex: 1, textAlign: 'center', marginRight: 32 }}>
            <span style={{ fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: '#111' }}>
              Deposit Record
            </span>
          </div>
        </div>

        {/* Status Tabs Row (All, Rejected, Reviewing, Passed, Completed) */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F8', overflowX: 'auto', padding: '0 6px' }}>
          {tabStatuses.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flexShrink: 0, padding: '10px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? PRIMARY : '#777788', 
                position: 'relative', whiteSpace: 'nowrap' }}>
              {tab}
              {activeTab === tab && (
                <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%',
                  height: 2.5, background: PRIMARY, borderRadius: 2 }} />
              )}
            </button>
          ))}
        </div>

        {/* Date Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FAFAFD' }}>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ flex: 1, padding: '6px 8px', border: `1.5px solid ${CYAN}`, borderRadius: 8,
              background: '#EEF9FE', color: '#333', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
          <span style={{ color: '#888', fontWeight: 600, fontSize: 14 }}>-</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ flex: 1, padding: '6px 8px', border: `1.5px solid ${CYAN}`, borderRadius: 8,
              background: '#EEF9FE', color: '#333', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
          <button style={{ background: PRIMARY, color: '#fff', border: 'none', borderRadius: 8,
            padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Search
          </button>
        </div>
      </div>

      {/* ── SCROLLABLE RECORDS LIST CONTAINER ────────────────────────────── */}
      <div style={{ padding: '14px 14px 90px 14px', flex: 1, overflowY: 'auto' }} className="scroll-container">
        {filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <p style={{ fontSize: 13, color: '#AAA', fontWeight: 500, letterSpacing: 1 }}>
              — — No more — —
            </p>
          </div>
        ) : (
          <>
            {filteredRecords.map(record => {
              const liveStatusRaw = liveStatuses[record.id];
              let displayStatus = statusDisplayMap[record.status] || record.status;
              let statusColor = PRIMARY;

              if (liveStatusRaw) {
                if (['finished', 'sending'].includes(liveStatusRaw)) {
                  displayStatus = 'Passed (Auto)';
                  statusColor = '#26A17B';
                } else if (['failed', 'expired', 'refunded'].includes(liveStatusRaw)) {
                  displayStatus = 'Rejected (Auto)';
                  statusColor = '#EF0027';
                } else {
                  displayStatus = 'Waiting Payment';
                  statusColor = '#F59E0B';
                }
              } else if (record.status === 'passed' || record.status === 'completed') {
                statusColor = '#26A17B';
              } else if (record.status === 'failed' || record.status === 'rejected') {
                statusColor = '#EF0027';
              }

              const methodLabel = record.paymentMethod === 'binance' ? 'Binance Pay' : 
                                  record.paymentMethod === 'nowpayments' ? 'NOWPayments (Crypto)' : 'USDT-TRC-20';

              return (
              <div key={record.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px',
                marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #EEEEF8' }}>
                {[
                  { label: 'Deposit status',  value: displayStatus, valueColor: statusColor, valueBold: true },
                  { label: 'Deposit amount',  value: `$${record.amount.toFixed(2)}`, valueColor: '#26A17B', valueBold: true },
                  { label: 'Payment method',  value: methodLabel, valueColor: '#333' },
                  { label: 'Order / TxID',    value: record.orderId || 'N/A',        valueColor: '#555', small: true },
                  { label: 'Deposit time',    value: formatTs(record.timestamp),     valueColor: '#888', small: true },
                  { label: 'Remark',          value: record.remark || '',            valueColor: '#888' },
                ].map(({ label, value, valueColor, valueBold, small }) =>
                  value !== '' && (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10,
                      borderBottom: label === 'Remark' ? 'none' : '1px solid #F5F5FA' }}>
                      <span style={{ fontSize: small ? 12 : 13, color: '#555', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: small ? 12 : 13, color: valueColor,
                        fontWeight: valueBold ? 700 : 500, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>
                        {value}
                      </span>
                    </div>
                  )
                )}
              </div>
            )})}

            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <span style={{ fontSize: 12, color: '#CCC', letterSpacing: 2 }}>— — — No more — — —</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Deposit Component ──────────────────────────────────────────────────
export default function Deposit({ onBack, onKyc, onNavigate }: DepositProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [amount, setAmount]   = useState<number>(50);
  const [step, setStep]       = useState<'select' | 'payment'>('select');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [depositQrUrl, setDepositQrUrl]   = useState('');
  const [userUsdtAddress, setUserUsdtAddress] = useState('');
  const [method, setMethod]   = useState<'usdt' | 'binance' | 'nowpayments'>('nowpayments');
  const [orderId, setOrderId] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [binanceId, setBinanceId] = useState('');
  const [binanceQrUrl, setBinanceQrUrl] = useState('');
  const [showRecord, setShowRecord] = useState(false);

  // NowPayments state
  const [nowPaymentsData, setNowPaymentsData] = useState<{ pay_address: string, pay_amount: number, pay_currency: string, invoice_url?: string } | null>(null);

  const presets = [50, 100, 300, 800, 2000, 5000];

  useEffect(() => {
    // Attempt to load dynamically from global settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.walletAddress) setWalletAddress(data.walletAddress);
        if (data.depositQrUrl)  setDepositQrUrl(data.depositQrUrl);
        if (data.binanceId)     setBinanceId(data.binanceId);
        if (data.binanceQrUrl)  setBinanceQrUrl(data.binanceQrUrl);
      } else {
        const saved = localStorage.getItem('admin_wallet_address');
        if (saved) setWalletAddress(saved);
      }
    }, (err) => {
      console.error("Error fetching admin settings", err);
    });

    // Fetch profile
    const fetchProfile = async () => {
      if (auth.currentUser) {
        try {
          const docRef  = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfile(parseUserProfile(data) as UserProfile);
            if (data.usdtAddress) {
              setUserUsdtAddress(data.usdtAddress);
            }
          }
        } catch (err) {
          console.error("Error fetching profile", err);
        }
      }
    };
    fetchProfile();

    return () => unsubSettings();
  }, []);

  const handleDecrease = () => setAmount(prev => Math.max(10, prev - 10));
  const handleIncrease = () => setAmount(prev => prev + 10);

  const handleConfirm = async () => {
    if (amount < 10) {
      showNotification("Minimum deposit amount is $10.", { type: 'error', title: 'INVALID AMOUNT' });
      return;
    }
    if (method === 'usdt' && !userUsdtAddress) {
      showNotification("Please link your USDT TRC-20 wallet address first.", { type: 'error', title: 'LINK WALLET REQUIRED' });
      if (onNavigate) onNavigate('linked-mobile');
      return;
    }

    if (method === 'nowpayments') {
      if (!auth.currentUser) return;
      setProcessing(true);
      // ✅ Immediately switch to payment page — user sees spinning logo
      setStep('payment');

      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
      let supabaseTransactionId: string | null = null;

      try {
        // Step 1: Insert pending transaction in Supabase
        let inserted;
        let firestoreDocId: string | null = null;
        try {
          const res = await supabase
            .from('transactions')
            .insert({
              user_id: auth.currentUser.uid,
              amount: amount,
              status: 'pending',
              type: 'deposit',
              payment_method: 'nowpayments',
              timestamp: new Date().toISOString()
            })
            .select()
            .single();
          if (res.error) throw res.error;
          inserted = res.data;
        } catch (e: any) {
          throw new Error('Supabase DB Error: ' + e.message);
        }
        
        if (!inserted) throw new Error('Failed to create transaction record');
        supabaseTransactionId = inserted.id;

        try {
          await supabase
            .from('transactions')
            .update({ order_id: supabaseTransactionId })
            .eq('id', supabaseTransactionId);
          
          // Also create Firestore document so pending deposit appears in Admin Panel Pending Txs tab
          await setDoc(doc(db, 'transactions', supabaseTransactionId), {
            id: supabaseTransactionId,
            userId: auth.currentUser.uid,
            amount: amount,
            status: 'pending',
            type: 'deposit',
            paymentMethod: 'nowpayments',
            orderId: supabaseTransactionId,
            timestamp: new Date().toISOString()
          });

          notifyAdminOfRequest('deposit', amount);
        } catch (e) {
          console.warn('[Deposit] Sync for NOWPayments failed (non-critical):', e);
        }

        // Step 2: Create NOWPayments invoice via Express backend
        let data;
        try {
          const res = await fetch(`${apiUrl}/api/crypto-pay/create`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Bypass-Tunnel-Reminder': 'true',
              'ngrok-skip-browser-warning': 'true'
            },
            body: JSON.stringify({
              amount,
              userId: auth.currentUser.uid,
              supabaseTransactionId
            })
          });
          data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || 'Failed to generate payment.');
        } catch (e: any) {
          throw new Error('Backend API Error: ' + e.message);
        }

        // Invoice ready — logo will stop spinning
        setNowPaymentsData(data);
      } catch (err: any) {
        console.error('[NOWPayments] Error:', err);
        if (supabaseTransactionId) {
          await supabase.from('transactions').delete().eq('id', supabaseTransactionId).eq('status', 'pending');
        }
        showNotification(`[URL: ${apiUrl}] ` + (err.message || 'Error generating NOWPayments invoice'), { type: 'error' });
        // ✅ Go back to select step on error
        setStep('select');
      } finally {
        setProcessing(false);
      }
      return;
    }

    setStep('payment');
  };

  const handleDepositComplete = () => {
    setShowOrderModal(true);
  };

  const submitDeposit = async () => {
    if (!orderId.trim()) {
      showNotification("Please enter a valid Order ID / TxID.", { type: 'error', title: 'REQUIRED' });
      return;
    }

    if (processing) return;
    setProcessing(true);
    const stopHumming = startHumming();
    try {
      if (auth.currentUser) {
        const txTimestamp = new Date().toISOString();
        const txData = {
          userId: auth.currentUser.uid,
          amount: amount,
          status: 'pending',
          type: 'deposit',
          paymentMethod: method,
          orderId: orderId.trim(),
          userUsdtAddress: userUsdtAddress,
          timestamp: txTimestamp
        };

        // Write transaction to database (via compatibility layer - creates single record)
        try {
          await addDoc(collection(db, 'transactions'), txData);
          notifyAdminOfRequest('deposit', amount);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'transactions');
        }

        showNotification(`Deposit request for $${amount} submitted! It will reflect in your balance after admin approval.`, { type: 'success', title: 'SUBMITTED' });
      }
      setShowOrderModal(false);
      onBack();
    } catch (e) {
      console.error(e);
      showNotification("Error processing deposit", { type: 'error', title: 'FAILED' });
    } finally {
      stopHumming();
      setProcessing(false);
    }
  };

  // ── Show Record sub-page ─────────────────────────────────────────────────
  if (showRecord) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <DepositRecordPage onBack={() => setShowRecord(false)} />
      </div>
    );
  }

  // ── Main Deposit page ────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: PAGE_BG, minHeight: '100%', display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter','Segoe UI',sans-serif",
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', display: 'flex', alignItems: 'center',
        padding: '16px 16px', borderBottom: '1px solid #EEEEF0',
        position: 'sticky', top: 0, zIndex: 10 }}>
        {/* Back */}
        <button onClick={() => { if (step === 'payment') setStep('select'); else onBack(); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#222" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Title – centered */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 800, fontStyle: 'italic',
            color: '#111', letterSpacing: 1, textTransform: 'uppercase' }}>
            {step === 'select' ? 'DEPOSIT' : (method === 'usdt' ? 'CRYPTO PAYMENT' : method === 'nowpayments' ? 'AUTO CRYPTO DEPOSIT' : 'BINANCE PAYMENT')}
          </span>
        </div>

        {/* Record note icon – top right */}
        <button onClick={() => setShowRecord(true)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer',
            padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="2" width="16" height="20" rx="2" stroke="#444" strokeWidth="1.8"/>
            <line x1="8" y1="7"  x2="16" y2="7"  stroke="#444" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="11" x2="16" y2="11" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="15" x2="13" y2="15" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {step === 'select' ? (
          <motion.div key="select" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            style={{ flex: 1, overflow: 'visible', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── AMOUNT CARD ─────────────────────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #EEEEF8' }}>

              {/* −  $  amount  + row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
                {/* Minus */}
                <button onClick={handleDecrease}
                  style={{ width: 48, height: 48, borderRadius: 10, background: CYAN,
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,191,239,0.35)', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <line x1="5" y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/>
                  </svg>
                </button>

                {/* $ amount input */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 120, justifyContent: 'center' }}>
                  <span style={{ fontSize: 26, color: PRIMARY, fontWeight: 700 }}>$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    style={{ fontSize: 40, fontWeight: 800, color: PRIMARY, letterSpacing: 1, lineHeight: 1,
                      width: 100, textAlign: 'center', background: 'transparent', border: 'none', outline: 'none',
                      fontFamily: 'inherit' }}
                  />
                </div>

                {/* Plus */}
                <button onClick={handleIncrease}
                  style={{ width: 48, height: 48, borderRadius: 10, background: CYAN,
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,191,239,0.35)', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/>
                    <line x1="5"  y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {presets.map((p) => {
                  const sel = amount === p;
                  return (
                    <button key={p} onClick={() => setAmount(p)}
                      style={{ padding: '10px 0', borderRadius: 10,
                        border: sel ? `2px solid ${CYAN}` : '1.5px solid #DDD',
                        background: sel ? '#EEF9FE' : '#fff',
                        color: sel ? CYAN : '#555',
                        fontWeight: sel ? 700 : 500, fontSize: 14,
                        cursor: 'pointer', transition: 'all 0.15s' }}>
                      ${p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── PAYMENT METHODS CARD ────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 }}>
                Select Payment Method
              </span>

              {/* NowPayments (Non-Custodial Auto) */}
              <button onClick={() => setMethod('nowpayments')}
                style={{ width: '100%', borderRadius: 16, padding: '18px', display: 'flex', flexDirection: 'column', gap: 14,
                  background: 'linear-gradient(145deg, #1A1B23 0%, #2A2D3E 100%)', border: '2px solid #5B5BD6',
                  cursor: 'pointer', boxShadow: '0 8px 24px rgba(91,91,214,0.3)', position: 'relative', overflow: 'hidden' }}>
                
                {/* Shine effect overlay */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', 
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
                  transform: 'skewX(-20deg) translateX(-100%)', animation: 'shine 3s infinite' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '14px', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src="/zalando-logo.png" alt="Zalando Pro" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: '14px' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: 16, fontWeight: 900, fontStyle: 'italic', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Crypto Gateway
                      </span>
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#3BBFEF', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                        Powered by NOWPayments
                      </span>
                    </div>
                  </div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#5B5BD6', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                    <Check style={{ width: 14, height: 14, color: '#fff', strokeWidth: 3 }} />
                  </div>
                </div>

                <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.1)' }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 11, color: '#A0A4B8', fontWeight: 600 }}>Supports 300+ Cryptocurrencies</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: -6 }}>
                    {/* Crypto icons (BTC, ETH, USDT, TRX) */}
                    {['#F7931A', '#627EEA', '#26A17B', '#EF0027'].map((color, i) => (
                      <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: color, border: '2px solid #2A2D3E', marginLeft: i > 0 ? -6 : 0, zIndex: 4-i, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {i === 0 && <span style={{color: '#fff', fontSize: 12, fontWeight: 800}}>₿</span>}
                        {i === 1 && <span style={{color: '#fff', fontSize: 14, fontWeight: 800}}>♦</span>}
                        {i === 2 && <span style={{color: '#fff', fontSize: 10, fontWeight: 800}}>₮</span>}
                        {i === 3 && <svg viewBox="0 0 32 32" width="10" height="10"><path d="M16 2L30 28H2L16 2Z" fill="white"/></svg>}
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            </div>

            {/* ── CONFIRM BUTTON ──────────────────────────────────────────── */}
            <button onClick={handleConfirm}
              style={{ width: '100%', padding: '15px 0', borderRadius: 12, marginTop: 4,
                background: PRIMARY, color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, boxShadow: `0 4px 16px ${PRIMARY}55` }}>
              Confirm
            </button>

            {/* ── INFO CARD ───────────────────────────────────────────────── */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '18px 18px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #EEEEF8' }}>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, margin: 0 }}>
                a) Minimum deposit amount is $10.<br/>
                b) Deposit processing may take up to 30 minutes<br/>
                &nbsp;&nbsp;&nbsp;depending on the blockchain network.<br/>
                c) You can pay with USDT, BTC, ETH, TRX, and 300+ other cryptocurrencies in one single checkout.
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#444', margin: '14px 0 6px 0' }}>Note</p>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, margin: 0 }}>
                Click Confirm to be securely redirected to the official NOWPayments gateway. Your balance will be credited automatically upon confirmation.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            style={{ flex: 1, overflow: 'visible', padding: '24px 16px 88px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>

            {/* Amount Section with a glowing badge */}
            <div style={{ textAlign: 'center', marginTop: 10, background: 'linear-gradient(180deg, rgba(91,91,214,0.06) 0%, transparent 100%)', width: '100%', borderRadius: 24, padding: '24px 10px 10px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: processing ? 'rgba(245,158,11,0.1)' : 'rgba(38,161,123,0.1)', padding: '6px 12px', borderRadius: 20, marginBottom: 12, transition: 'background 0.3s' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: processing ? '#F59E0B' : '#26A17B', animation: 'pulse 2s infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: processing ? '#F59E0B' : '#26A17B', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {processing ? 'Generating Invoice' : 'Connection Secure'}
                </span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, margin: '0 0 8px 0' }}>
                Total Payment
              </p>
              <div style={{ fontSize: 52, fontWeight: 900, fontStyle: 'italic', color: '#111', lineHeight: 1 }}>
                ${amount.toFixed(2)}
              </div>
            </div>

            {/* ── PROCESSING STATE: Spinning Logo ── */}
            {method === 'nowpayments' && processing && !nowPaymentsData?.invoice_url && (
              <div style={{ width: '100%', maxWidth: 360, background: 'linear-gradient(145deg, #1A1B23 0%, #2A2D3E 100%)',
                borderRadius: 24, padding: '48px 24px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>

                {/* Background glow */}
                <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
                  background: 'radial-gradient(circle, rgba(91,91,214,0.2) 0%, transparent 50%)', zIndex: 0, animation: 'pulse 3s infinite' }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Spinning Logo */}
                  <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', position: 'relative' }}>
                    <img
                      src="/zalando-logo.png"
                      alt="Zalando Pro"
                      style={{
                        width: 100,
                        height: 100,
                        objectFit: 'contain',
                        animation: 'spin-logo 1.5s linear infinite',
                        filter: 'drop-shadow(0 0 20px rgba(91,91,214,0.6))'
                      }}
                    />
                    {/* Outer ring pulse */}
                    <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(91,91,214,0.3)', animation: 'ping 2s infinite' }} />
                    <div style={{ position: 'absolute', inset: -16, borderRadius: '50%', border: '1px solid rgba(59,191,239,0.2)', animation: 'ping 2.5s infinite 0.5s' }} />
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    Generating Your Invoice
                  </h3>
                  <p style={{ fontSize: 13, color: '#A0A4B8', lineHeight: 1.6, margin: '0 0 20px' }}>
                    Connecting to secure payment gateway<span style={{ animation: 'dots 1.5s steps(4) infinite' }}>...</span>
                  </p>

                  {/* Progress bar animation */}
                  <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg, #5B5BD6, #3BBFEF)', borderRadius: 4, width: '60%', animation: 'loading-bar 2s ease-in-out infinite' }} />
                  </div>
                </div>
              </div>
            )}

            {/* ── READY STATE: Still Logo + Invoice Card ── */}
            {method === 'nowpayments' && nowPaymentsData?.invoice_url && (
              <div style={{ width: '100%', maxWidth: 360, background: 'linear-gradient(145deg, #1A1B23 0%, #2A2D3E 100%)',
                borderRadius: 24, padding: '32px 24px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>

                {/* Background glow */}
                <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
                  background: 'radial-gradient(circle, rgba(91,91,214,0.15) 0%, transparent 50%)', zIndex: 0 }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  {/* Still Logo */}
                  <div style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative' }}>
                    <img
                      src="/zalando-logo.png"
                      alt="Zalando Pro"
                      style={{
                        width: 72,
                        height: 72,
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 12px rgba(91,91,214,0.4))'
                      }}
                    />
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: 0.5 }}>
                    INVOICE READY
                  </h3>
                  <p style={{ fontSize: 13, color: '#A0A4B8', lineHeight: 1.6, margin: '0 0 24px' }}>
                    Your secure payment gateway has been generated. You can pay using <strong style={{color: '#fff'}}>USDT, BTC, ETH</strong>, or 300+ other coins.
                  </p>

                  <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '14px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#888' }}>Order ID</span>
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>
                        {nowPaymentsData?.id ? String(nowPaymentsData.id) : `DEP_${auth.currentUser?.uid?.substring(0,6).toUpperCase() || 'XXXXX'}_${Date.now().toString().slice(-4)}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: '#888' }}>Network Fee</span>
                      <span style={{ fontSize: 12, color: '#26A17B', fontWeight: 700 }}>Calculated at checkout</span>
                    </div>
                  </div>

                  <button onClick={() => window.open(nowPaymentsData.invoice_url, '_self')}
                    style={{ width: '100%', minHeight: 54, padding: '16px 14px', borderRadius: 14,
                      background: 'linear-gradient(90deg, #5B5BD6, #7C7CE0)', color: '#fff', border: 'none', cursor: 'pointer',
                      fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
                      boxShadow: '0 8px 20px rgba(91,91,214,0.4)', transition: 'transform 0.2s', position: 'relative', overflow: 'hidden',
                      WebkitAppearance: 'none', appearance: 'none' }}>
                    <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
                      Proceed to Checkout
                    </span>
                  </button>
                </div>
              </div>
            )}

            {method === 'nowpayments' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span style={{ fontSize: 12, color: '#666', fontWeight: 700, letterSpacing: 0.5 }}>Secured by SSL & NOWPayments</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>



      {/* ── ORDER ID MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showOrderModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 16px',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#fff', width: '100%', maxWidth: 360, borderRadius: 24, padding: 28,
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              
              <div style={{ width: 56, height: 56, background: `${PRIMARY}15`, borderRadius: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <FileText style={{ width: 28, height: 28, color: PRIMARY }} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, fontStyle: 'italic',
                color: '#111', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Order ID Required
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: '#777', lineHeight: 1.5 }}>
                Please enter the Transaction ID or Order ID from your {method === 'usdt' ? 'USDT' : 'Binance'} transfer to verify your deposit.
              </p>

              <div style={{ textAlign: 'left', marginBottom: 20 }}>
                <label style={{ fontSize: 10, fontWeight: 800, color: '#999', textTransform: 'uppercase',
                  letterSpacing: 1, display: 'block', marginBottom: 6 }}>
                  Order ID / TXID
                </label>
                <input
                  type="text"
                  placeholder="Enter ID here..."
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #DDDDF0',
                    borderRadius: 12, fontSize: 13, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowOrderModal(false)}
                  style={{ flex: 1, padding: '12px 0', borderRadius: 12, background: '#F5F5FA',
                    color: '#888', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                  Cancel
                </button>
                <button onClick={submitDeposit} disabled={processing}
                  style={{ flex: 2, padding: '12px 0', borderRadius: 12, background: '#26A17B',
                    color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {processing ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : 'Confirm Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shine {
          0% { transform: skewX(-20deg) translateX(-200%); }
          50% { transform: skewX(-20deg) translateX(200%); }
          100% { transform: skewX(-20deg) translateX(200%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes spin-logo {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes loading-bar {
          0% { transform: translateX(-100%); width: 40%; }
          50% { transform: translateX(60%); width: 60%; }
          100% { transform: translateX(200%); width: 40%; }
        }
      `}</style>
    </motion.div>
  );
}

