import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, X, Lock, QrCode } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType, verifyClockIntegrity } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, where, orderBy, runTransaction } from '../lib/firebase';
import { useNotification } from './NotificationProvider';
import { notifyAdminOfRequest } from '../lib/notificationSystem';

interface WithdrawalProps {
  onBack: () => void;
  key?: string;
}

type RecordStatus = 'All' | 'Rejected' | 'Reviewing' | 'Passed' | 'Completed';

interface WithdrawalRecord {
  id: string;
  amount: number;
  fee: number;
  actualAmount: number;
  status: string;
  timestamp: string;
  remark?: string;
}

// ─── Colors ─────────────────────────────────────────────────────────────────
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



// ─── Withdrawal Record Sub-page ──────────────────────────────────────────────
interface WithdrawalRecord {
  id: string;
  amount: number;
  fee: number;
  actualAmount: number;
  status: string;
  timestamp: string;
  remark?: string;
  rejectionReason?: string;
}

// ─── Withdrawal Record Sub-page ──────────────────────────────────────────────
function WithdrawalRecordPage({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<RecordStatus>('All');
  const [records, setRecords] = useState<WithdrawalRecord[]>([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      where('type', '==', 'withdrawal'),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      const rows: WithdrawalRecord[] = snap.docs.map(d => {
        const data = d.data();
        const amt  = data.amount || 0;
        const fee  = parseFloat((amt * 0.05).toFixed(2));
        return {
          id:              d.id,
          amount:          amt,
          fee,
          actualAmount:    parseFloat((amt - fee).toFixed(2)),
          status:          data.status || 'pending',
          timestamp:       data.timestamp || '',
          remark:          data.remark || '',
          rejectionReason: data.rejectionReason || data.remark || '',
        };
      });
      setRecords(rows);
    });
    return () => unsub();
  }, []);

  const getElapsedMinutes = (timestamp: string) => {
    if (!timestamp) return 0;
    const createdMs = new Date(timestamp).getTime();
    if (isNaN(createdMs)) return 0;
    return (Date.now() - createdMs) / (1000 * 60);
  };

  const getEffectiveStatus = (r: WithdrawalRecord): 'Reviewing' | 'Passed' | 'Completed' | 'Rejected' => {
    const st = (r.status || '').toLowerCase();
    if (st === 'rejected' || st === 'failed') return 'Rejected';
    if (st === 'completed' || st === 'approved') return 'Completed';
    if (st === 'passed') return 'Passed';
    
    // Auto transition: After 45 minutes, pending moves to Passed
    const elapsed = getElapsedMinutes(r.timestamp);
    if (elapsed >= 45) {
      return 'Passed';
    }
    return 'Reviewing';
  };

  const filteredRecords = records.filter(r => {
    const effective = getEffectiveStatus(r);
    
    if (activeTab === 'Reviewing' && effective !== 'Reviewing') return false;
    if (activeTab === 'Passed' && effective !== 'Passed' && effective !== 'Completed') return false;
    if (activeTab === 'Completed' && effective !== 'Completed') return false;
    if (activeTab === 'Rejected' && effective !== 'Rejected') return false;

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
              Withdrawal Record
            </span>
          </div>
        </div>

        {/* Status Tabs Row (All, Rejected, Reviewing, Passed, Completed) */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F8', overflowX: 'auto', padding: '0 6px' }}>
          {tabStatuses.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ flexShrink: 0, padding: '10px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? (tab === 'Rejected' ? '#EF4444' : PRIMARY) : '#777788', 
                position: 'relative', whiteSpace: 'nowrap' }}>
              {tab}
              {activeTab === tab && (
                <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%',
                  height: 2.5, background: tab === 'Rejected' ? '#EF4444' : PRIMARY, borderRadius: 2 }} />
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
              const effectiveStatus = getEffectiveStatus(record);
              const isRejected = effectiveStatus === 'Rejected';
              const isCompleted = effectiveStatus === 'Completed';
              const isPassed = effectiveStatus === 'Passed';
              
              const statusText = isRejected ? 'Rejected' : isCompleted ? 'Completed' : isPassed ? 'Passed' : 'Reviewing';
              const statusColor = isRejected ? '#EF4444' : isCompleted ? '#10B981' : isPassed ? '#5B5BD6' : '#F59E0B';
              const rawMsg = record.rejectionReason || record.remark || 'Your withdrawal request was rejected by Zalando.';
              const rejectionMsg = rawMsg.replace(/admin/gi, 'Zalando');

              return (
                <div key={record.id} style={{ 
                  background: isRejected ? '#FEF2F2' : '#fff', 
                  borderRadius: 14, 
                  padding: '16px 18px',
                  marginBottom: 12, 
                  boxShadow: isRejected ? '0 4px 14px rgba(239, 68, 68, 0.12)' : '0 2px 10px rgba(0,0,0,0.07)', 
                  border: isRejected ? '1.5px solid #FECACA' : '1px solid #EEEEF8' 
                }}>
                  {[
                    { label: 'Withdrawal status', value: statusText, valueColor: statusColor, valueBold: true },
                    { label: 'Withdrawal amount', value: `$${record.amount.toFixed(2)}`, valueColor: isRejected ? '#DC2626' : '#E53935', valueBold: true },
                    { label: 'Withdrawal fee (5%)', value: `$${record.fee.toFixed(2)}`, valueColor: '#E53935' },
                    { label: 'Actual amount', value: `$${record.actualAmount.toFixed(2)}`, valueColor: '#333' },
                    { label: 'Withdrawal time', value: formatTs(record.timestamp), valueColor: '#888', small: true },
                  ].map(({ label, value, valueColor, valueBold, small }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', paddingTop: 10, paddingBottom: 10,
                      borderBottom: '1px solid #F5F5FA' }}>
                      <span style={{ fontSize: small ? 12 : 13, color: isRejected ? '#7F1D1D' : '#555', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: small ? 12 : 13, color: valueColor,
                        fontWeight: valueBold ? 700 : 500, textAlign: 'right', maxWidth: '55%' }}>
                        {value}
                      </span>
                    </div>
                  ))}

                  {/* PROMINENT RED REJECTION REASON MSG */}
                  {isRejected && (
                    <div style={{
                      marginTop: 10,
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#FEE2E2',
                      border: '1px solid #FCA5A5',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>⚠️</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Reason For Rejection:
                        </span>
                      </div>
                      <span style={{ fontSize: 13, color: '#B91C1C', fontWeight: 700, lineHeight: 1.4 }}>
                        {rejectionMsg}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <span style={{ fontSize: 12, color: '#CCC', letterSpacing: 2 }}>— — — No more — — —</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Withdrawal Component ────────────────────────────────────────────────
export default function Withdrawal({ onBack }: WithdrawalProps) {
  const { showNotification } = useNotification();
  const [amount, setAmount]           = useState<number>(10);
  const [processing, setProcessing]   = useState(false);
  const [balance, setBalance]         = useState(0);
  const [walletAddress, setWalletAddress] = useState('');
  const [isAddressLinked, setIsAddressLinked] = useState(false);
  const [binanceId, setBinanceId]     = useState('');
  const [isBinanceLinked, setIsBinanceLinked] = useState(false);
  const [isTimeLocked, setIsTimeLocked] = useState(false);
  const [currentTimeInfo, setCurrentTimeInfo] = useState('');
  const [showRecord, setShowRecord]   = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const presets = [10, 50, 100];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (snap.exists()) {
          const d = snap.data();
          setBalance(d.balance || 0);
          if (d.usdtAddress) { setWalletAddress(d.usdtAddress); setIsAddressLinked(true); }
          if (d.binanceId)   { setBinanceId(d.binanceId);   setIsBinanceLinked(true); }
        }
      } catch (err) { handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`); }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
      const day = ist.getDay(); const hour = ist.getHours();
      const ok  = day >= 1 && day <= 5 && hour >= 10 && hour < 22;
      setIsTimeLocked(!ok);
      if (!ok) {
        if (day === 0 || day === 6) setCurrentTimeInfo('Withdrawals open Monday - Friday');
        else if (hour < 10)         setCurrentTimeInfo('Withdrawals open at 10:00 AM IST');
        else                        setCurrentTimeInfo('Withdrawals closed (Reopens 10 AM)');
      }
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  const handleConfirmClick = () => {
    if (isTimeLocked) { showNotification(currentTimeInfo, { type: 'error', title: 'CLOSED' }); return; }
    if (!isAddressLinked) { setShowLinkModal(true); return; }
    setShowConfirmModal(true);
  };

  const confirmWithdrawal = async () => {
    if (!amount || isNaN(amount) || amount < 10) {
      showNotification('Minimum withdrawal amount is $10.', { type: 'error', title: 'INVALID AMOUNT' });
      return;
    }
    if (!walletAddress.trim()) {
      showNotification('Please link your USDT TRC-20 address first.', { type: 'error' }); return;
    }
    const totalDeduction = amount * 1.05;
    setProcessing(true);
    try {
      const isOk = await verifyClockIntegrity(showNotification);
      if (!isOk) { setProcessing(false); return; }

      const serverMs = Date.now();
      const nowIso   = new Date(serverMs).toISOString();
      const istDate  = new Date(serverMs + 5.5 * 3600000);
      const day  = istDate.getUTCDay();
      const hour = istDate.getUTCHours();
      if (day === 0 || day === 6 || hour < 10 || hour >= 22)
        throw new Error('Withdrawals only Mon-Fri 10:00-22:00 IST.');

      if (auth.currentUser) {
        await runTransaction(db, async tx => {
          const ref  = doc(db, 'users', auth.currentUser!.uid);
          const snap = await tx.get(ref);
          if (!snap.exists()) throw new Error('User missing.');
          const userData = snap.data();
          if ((userData.balance || 0) < totalDeduction) throw new Error('Insufficient balance.');
          tx.update(ref, { balance: (userData.balance || 0) - totalDeduction, updatedAt: nowIso });
          const txRef = doc(collection(db, 'transactions'));
          tx.set(txRef, {
            userId: auth.currentUser!.uid, amount, deductedAmount: totalDeduction,
            status: 'pending', type: 'withdrawal', withdrawalMethod: 'usdt',
            walletAddress, timestamp: nowIso
          });
          notifyAdminOfRequest('withdrawal', amount);
        });
      }
      setShowConfirmModal(false);
      showNotification('Withdrawal submitted successfully!', { type: 'success', title: 'SUCCESS' });
      onBack();
    } catch (e) {
      showNotification(e instanceof Error ? e.message : String(e), { type: 'error', title: 'ERROR' });
    } finally { setProcessing(false); }
  };

  // ── Show Record sub-page ─────────────────────────────────────────────────
  if (showRecord) {
    return (
      <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        <WithdrawalRecordPage onBack={() => setShowRecord(false)} />
        {/* No bottom nav on record page — back button handles navigation */}
      </div>
    );
  }

  // ── Main Withdrawal page ─────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: PAGE_BG, minHeight: '100%', display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter','Segoe UI',sans-serif", paddingBottom: 88 }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', display: 'flex', alignItems: 'center',
        padding: '16px 16px', borderBottom: '1px solid #EEEEF0',
        position: 'sticky', top: 0, zIndex: 10 }}>
        {/* Back */}
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', cursor: 'pointer',
          padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#222" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Title – centered */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{ fontSize: 17, fontWeight: 800, fontStyle: 'italic',
            color: '#111', letterSpacing: 1, textTransform: 'uppercase' }}>
            WITHDRAWAL
          </span>
        </div>

        {/* Record icon – right */}
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── AMOUNT CARD ─────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #EEEEF8' }}>

          {/* −  $  amount  + row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
            {/* Minus */}
            <button onClick={() => setAmount(a => Math.max(10, a - 10))}
              style={{ width: 48, height: 48, borderRadius: 10, background: CYAN,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,191,239,0.35)', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <line x1="5" y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/>
              </svg>
            </button>

            {/* $ amount */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, minWidth: 100, justifyContent: 'center' }}>
              <span style={{ fontSize: 26, color: PRIMARY, fontWeight: 700 }}>$</span>
              <span style={{ fontSize: 40, fontWeight: 800, color: PRIMARY, letterSpacing: 1, lineHeight: 1 }}>
                {amount}
              </span>
            </div>

            {/* Plus */}
            <button onClick={() => setAmount(a => a + 10)}
              style={{ width: 48, height: 48, borderRadius: 10, background: CYAN,
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', boxShadow: '0 2px 8px rgba(59,191,239,0.35)', flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="5" x2="12" y2="19" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/>
                <line x1="5"  y1="12" x2="19" y2="12" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Preset buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {presets.map(p => {
              const sel = amount === p;
              return (
                <button key={p} onClick={() => setAmount(p)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10,
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

        {/* ── PAYMENT METHOD CARD ─────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #EEEEF8',
          display: 'flex', alignItems: 'center', gap: 14 }}>

          {/* Real USDT TRC20 spinning logo */}
          <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
            {/* Outer spinning ring */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2.5px solid transparent',
              borderTopColor: '#26A17B', borderRightColor: '#1a7a5e',
              animation: 'usdtSpin 2s linear infinite',
            }} />
            {/* Main USDT circle */}
            <div style={{
              position: 'absolute', inset: 4, borderRadius: '50%',
              background: 'linear-gradient(145deg, #2DB87B, #1a9060)',
              boxShadow: '0 3px 12px rgba(38,161,123,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* Tether "T" logo — exact official shape */}
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
                {/* Top wide bar */}
                <rect x="6" y="9" width="36" height="7" rx="3.5" fill="white"/>
                {/* Vertical stem */}
                <rect x="19.5" y="14" width="9" height="18" fill="white"/>
                {/* Bottom oval/pill underline */}
                <rect x="10" y="30" width="28" height="6" rx="3" fill="white" opacity="0.85"/>
                {/* Tiny gap in center of bottom bar for classic Tether look */}
                <rect x="21" y="31" width="6" height="4" rx="1" fill="#26A17B" opacity="0.5"/>
              </svg>
            </div>
            {/* TRON TRX badge — bottom right */}
            <div style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 20, height: 20, borderRadius: '50%',
              background: '#EF0027',
              border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(239,0,39,0.5)',
            }}>
              {/* TRON official triangle logo */}
              <svg width="11" height="11" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L30 28H2L16 2Z" fill="white"/>
                <path d="M16 10L24 24H8L16 10Z" fill="#EF0027"/>
              </svg>
            </div>
          </div>

          {/* Label */}
          <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#222' }}>
            USDT-TRC-20
          </span>

          {/* Toggle indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: -6 }}>
            {[CYAN, PRIMARY, '#8888DD'].map((c, i) => (
              <div key={i} style={{ width: 22, height: 22, borderRadius: '50%',
                background: c, border: '2px solid #fff',
                marginLeft: i === 0 ? 0 : -8, zIndex: 3 - i }} />
            ))}
          </div>
        </div>

        {/* ── CONFIRM BUTTON ──────────────────────────────────────────── */}
        <button onClick={handleConfirmClick} disabled={processing}
          style={{ width: '100%', padding: '15px 0', borderRadius: 12,
            background: PRIMARY, color: '#fff', border: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 700, boxShadow: `0 4px 16px ${PRIMARY}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {processing ? <Loader2 style={{ width: 22, height: 22, animation: 'spin 1s linear infinite' }} /> : 'Confirm'}
        </button>

        {/* ── INFO CARD ───────────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '18px 18px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #EEEEF8' }}>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, margin: 0 }}>
            a) Minimum withdrawal amount is $10.<br/>
            b) All withdrawals will be subjected to 5%<br/>
            &nbsp;&nbsp;&nbsp;handling fee.<br/>
            c) Withdrawal submission : Monday to Friday<br/>
            &nbsp;&nbsp;&nbsp;10:00–22:00 (IST), except public holidays.
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#444', margin: '14px 0 6px 0' }}>Note</p>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, margin: 0 }}>
            1. All withdrawals will be credited to your TRC20<br/>
            &nbsp;&nbsp;&nbsp;wallet within 1 working day after approval.<br/>
            2. Withdrawals submitted on Friday will be<br/>
            &nbsp;&nbsp;&nbsp;credited to your TRC20 wallet on Saturday<br/>
            &nbsp;&nbsp;&nbsp;(before 23:59).
          </p>
        </div>

        {isTimeLocked && (
          <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px',
            border: '1px solid #FFE082', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#F57F17', fontWeight: 600, margin: 0 }}>⏰ {currentTimeInfo}</p>
          </div>
        )}

      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {/* Confirm address modal */}
        {showConfirmModal && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 100, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 16px',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: '#fff', width: '100%', maxWidth: 380, borderRadius: 24,
                padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, fontStyle: 'italic',
                  color: '#111', textTransform: 'uppercase', letterSpacing: 0.5 }}>TRC-20 WALLET</h3>
                <button onClick={() => setShowConfirmModal(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X style={{ width: 20, height: 20, color: '#999' }} />
                </button>
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#999',
                textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                Your TRC-20 Address
              </label>
              <div style={{ background: '#F5F5FA', borderRadius: 12, padding: '12px 14px',
                fontSize: 13, color: '#555', fontFamily: 'monospace', wordBreak: 'break-all',
                marginBottom: 6 }}>
                {walletAddress}
              </div>
              <p style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 1, margin: '4px 0 20px 0',
                display: 'flex', alignItems: 'center', gap: 4 }}>
                🔒 Locked for Security
              </p>
              <div style={{ background: '#F9F9FD', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#888' }}>Amount</span>
                  <span style={{ fontSize: 13, color: '#E53935', fontWeight: 700 }}>${amount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#888' }}>Fee (5%)</span>
                  <span style={{ fontSize: 13, color: '#E53935', fontWeight: 700 }}>-${(amount * 0.05).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #EEEEF8', paddingTop: 8 }}>
                  <span style={{ fontSize: 13, color: '#333', fontWeight: 700 }}>You receive</span>
                  <span style={{ fontSize: 14, color: PRIMARY, fontWeight: 800 }}>${(amount * 0.95).toFixed(2)}</span>
                </div>
              </div>
              <button onClick={confirmWithdrawal} disabled={processing}
                style={{ width: '100%', padding: '14px 0', borderRadius: 12,
                  background: PRIMARY, color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {processing ? <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} /> : 'Confirm Withdrawal'}
              </button>
            </motion.div>
          </div>
        )}

        {/* Link wallet modal */}
        {showLinkModal && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 110, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 16px',
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{ background: '#fff', width: '100%', maxWidth: 380, borderRadius: 28,
                padding: 32, boxShadow: '0 24px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, background: `${PRIMARY}15`, borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <QrCode style={{ width: 32, height: 32, color: PRIMARY }} />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, fontStyle: 'italic',
                color: '#111', textTransform: 'uppercase' }}>Link Your Wallet</h3>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888', lineHeight: 1.6 }}>
                To withdraw, link your USDT (TRC-20) address. Once linked, it is locked for security.
              </p>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#999',
                textTransform: 'uppercase', letterSpacing: 1, display: 'block',
                textAlign: 'left', marginBottom: 8 }}>
                TRC-20 Address
              </label>
              <input type="text" placeholder="Paste your TRC-20 address..." value={walletAddress}
                onChange={e => setWalletAddress(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #DDDDF0',
                  borderRadius: 12, fontSize: 13, fontFamily: 'monospace', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 20 }} />
              <button onClick={async () => {
                if (!walletAddress.trim() || walletAddress.trim().length < 10) {
                  showNotification('Enter a valid TRC-20 address.', { type: 'error' }); return;
                }
                setProcessing(true);
                try {
                  await updateDoc(doc(db, 'users', auth.currentUser!.uid), { usdtAddress: walletAddress.trim() });
                  setIsAddressLinked(true);
                  setShowLinkModal(false);
                  showNotification('Wallet linked!', { type: 'success', title: 'LINKED' });
                  setShowConfirmModal(true);
                } catch (e: any) {
                  showNotification(e?.message || 'Link failed.', { type: 'error' });
                } finally { setProcessing(false); }
              }} disabled={processing}
                style={{ width: '100%', padding: '14px 0', borderRadius: 12,
                  background: PRIMARY, color: '#fff', border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: 700, marginBottom: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {processing ? <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} /> : 'Link Address'}
              </button>
              <button onClick={() => setShowLinkModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#AAA', fontWeight: 600, padding: '4px 0' }}>
                Maybe Later
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes usdtSpin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}
