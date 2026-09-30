import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, FileText, Copy, Check, QrCode } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType, parseUserProfile } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, onSnapshot, query, where, orderBy } from '../lib/firebase';
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
  const [startDate, setStartDate] = useState('2022-09-15');
  const [endDate, setEndDate]   = useState('2026-12-31');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      where('type', '==', 'deposit'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const rows: DepositRecord[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id:            d.id,
          amount:        data.amount || 0,
          paymentMethod: data.paymentMethod || 'usdt',
          orderId:       data.orderId || '',
          status:        data.status || 'pending',
          timestamp:     data.timestamp || '',
          remark:        data.remark || '',
        };
      });
      setRecords(rows);
    });
    return () => unsub();
  }, []);

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
            {filteredRecords.map(record => (
              <div key={record.id} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px',
                marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: '1px solid #EEEEF8' }}>
                {[
                  { label: 'Deposit status',  value: statusDisplayMap[record.status] || record.status,
                    valueColor: PRIMARY, valueBold: true },
                  { label: 'Deposit amount',  value: `$${record.amount.toFixed(2)}`, valueColor: '#26A17B', valueBold: true },
                  { label: 'Payment method',  value: record.paymentMethod === 'binance' ? 'Binance Pay' : 'USDT-TRC-20', valueColor: '#333' },
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
            ))}

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
  const [method, setMethod]   = useState<'usdt' | 'binance'>('binance');
  const [orderId, setOrderId] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [binanceId, setBinanceId] = useState('');
  const [binanceQrUrl, setBinanceQrUrl] = useState('');
  const [showRecord, setShowRecord] = useState(false);

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

  const handleConfirm = () => {
    if (amount < 10) {
      showNotification("Minimum deposit amount is $10.", { type: 'error', title: 'INVALID AMOUNT' });
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
        const depositRef = collection(db, 'transactions');
        try {
          await addDoc(depositRef, {
            userId: auth.currentUser.uid,
            amount: amount,
            status: 'pending',
            type: 'deposit',
            paymentMethod: method,
            orderId: orderId.trim(),
            userUsdtAddress: userUsdtAddress,
            timestamp: new Date().toISOString()
          });
          // Notify admin hub about new deposit
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
        fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 88 }}>

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
            {step === 'select' ? 'DEPOSIT' : (method === 'usdt' ? 'CRYPTO PAYMENT' : 'BINANCE PAYMENT')}
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
            style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

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

              {/* Binance Pay */}
              <div style={{ position: 'relative', paddingTop: 10 }}>
                <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
                  <span style={{ background: 'linear-gradient(90deg, #F59E0B, #F0B90B)', color: '#fff', fontSize: 9,
                    fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, padding: '3px 10px', borderRadius: 20,
                    boxShadow: '0 2px 8px rgba(240,185,11,0.4)', whiteSpace: 'nowrap' }}>
                    ⚡ Recommended For Fast Deposit
                  </span>
                </div>
                <button onClick={() => setMethod('binance')}
                  style={{ width: '100%', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', background: '#fff', border: method === 'binance' ? '2px solid #F0B90B' : '1px solid #EEEEF8',
                    cursor: 'pointer', boxShadow: method === 'binance' ? '0 4px 16px rgba(240,185,11,0.2)' : '0 2px 10px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#000', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                      <svg viewBox="0 0 201 201" width="26" height="26">
                        <path fill="#F3BA2F" d="M126.452 111.118L141.537 126.159L100.531 167.121L59.5688 126.159L74.6533 111.118L100.531 136.995L126.452 111.118ZM100.531 85.1965L115.832 100.498L100.531 115.799L85.2732 100.541V100.498L87.9607 97.8103L89.2611 96.5099L100.531 85.1965ZM48.949 85.4133L64.0335 100.498L48.949 115.539L33.8644 100.454L48.949 85.4133ZM152.113 85.4133L167.198 100.498L152.113 115.539L137.029 100.454L152.113 85.4133ZM100.531 33.8311L141.493 74.7934L126.409 89.8779L100.531 63.9568L74.6533 89.8346L59.5688 74.7934L100.531 33.8311Z"/>
                      </svg>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 800, fontStyle: 'italic', color: '#111', textTransform: 'uppercase' }}>
                        Binance Pay
                      </span>
                      <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: 1 }}>
                        Fast & Zero Fee
                      </span>
                    </div>
                  </div>
                  {method === 'binance' && (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F0B90B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check style={{ width: 14, height: 14, color: '#fff' }} />
                    </div>
                  )}
                </button>
              </div>

              {/* USDT-TRC-20 */}
              <button onClick={() => setMethod('usdt')}
                style={{ width: '100%', borderRadius: 16, padding: '16px 18px', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', background: '#fff', border: method === 'usdt' ? '2px solid #26A17B' : '1px solid #EEEEF8',
                  cursor: 'pointer', boxShadow: method === 'usdt' ? '0 4px 16px rgba(38,161,123,0.2)' : '0 2px 10px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#26A17B', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(38,161,123,0.3)' }}>
                    <svg viewBox="0 0 48 48" width="24" height="24" fill="none">
                      <rect x="6" y="9" width="36" height="7" rx="3.5" fill="white"/>
                      <rect x="19.5" y="14" width="9" height="18" fill="white"/>
                      <rect x="10" y="30" width="28" height="6" rx="3" fill="white" opacity="0.85"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 800, fontStyle: 'italic', color: '#111', textTransform: 'uppercase' }}>
                      USDT-TRC-20
                    </span>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Stablecoin Payment
                    </span>
                  </div>
                </div>
                {method === 'usdt' && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#26A17B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check style={{ width: 14, height: 14, color: '#fff' }} />
                  </div>
                )}
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
                &nbsp;&nbsp;&nbsp;depending on network congestion.<br/>
                c) {method === 'usdt' ? 'Please ensure you use TRC-20 network to avoid loss.' : 'Please use the Binance Pay ID provided for zero fees.'}
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#444', margin: '14px 0 6px 0' }}>Note</p>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, margin: 0 }}>
                Do not deposit any other assets to the provided address. If you encounter any issues, please contact customer support.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px 0' }}>
                Amount to pay
              </p>
              <div style={{ fontSize: 44, fontWeight: 900, fontStyle: 'italic', color: PRIMARY }}>
                ${amount.toFixed(2)}
              </div>
            </div>

            {/* QR Card */}
            <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #EEEEF8', width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              <div style={{ width: 200, height: 200, background: '#fff', borderRadius: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1px solid #F0F0F8', overflow: 'hidden' }}>
                {method === 'usdt' ? (
                  depositQrUrl ? (
                    <img src={depositQrUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Deposit QR" />
                  ) : (
                    <QRCodeSVG value={walletAddress} size={180} />
                  )
                ) : (
                  binanceQrUrl ? (
                    <img src={binanceQrUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Binance Pay QR" />
                  ) : (
                    <QRCodeSVG value={binanceId} size={180} />
                  )
                )}
              </div>

              <div style={{ width: '100%' }}>
                <p style={{ fontSize: 11, fontWeight: 800, fontStyle: 'italic', color: '#888',
                  textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 8 }}>
                  {method === 'usdt' ? 'Transfer Address (USDT TRC-20)' : 'Binance Pay ID'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: '#F5F5FA', borderRadius: 12, border: '1px solid #EEEEF8' }}>
                  <p style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#333',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                    {method === 'usdt' ? walletAddress : binanceId}
                  </p>
                  <button onClick={() => {
                    navigator.clipboard.writeText(method === 'usdt' ? walletAddress : binanceId);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: 6,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {copied ? <Check style={{ width: 18, height: 18, color: '#26A17B' }} /> : <Copy style={{ width: 18, height: 18, color: PRIMARY }} />}
                  </button>
                </div>
              </div>
            </div>

            <button onClick={handleDepositComplete} disabled={processing}
              style={{ width: '100%', maxWidth: 340, padding: '15px 0', borderRadius: 12,
                background: '#26A17B', color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, boxShadow: '0 4px 16px rgba(38,161,123,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 }}>
              {processing ? <Loader2 style={{ width: 22, height: 22, animation: 'spin 1s linear infinite' }} /> : 'I have made deposit'}
            </button>
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
      `}</style>
    </motion.div>
  );
}

