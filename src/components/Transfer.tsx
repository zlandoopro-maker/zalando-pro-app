import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, User, DollarSign, FileText, ShieldCheck, AlertCircle, Zap, ChevronRight } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, runTransaction, onSnapshot, orderBy } from '../lib/firebase';
import { useNotification } from './NotificationProvider';

const MIN_TRANSFER = 50;

interface TransferProps {
  onBack: () => void;
  key?: string;
}

// ─── Transfer Record Sub-page ─────────────────────────────────────────────────
function TransferRecordPage({ onBack }: { onBack: () => void }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');

  useEffect(() => {
    if (!auth.currentUser) return;
    setLoading(true);

    // Listen to sent transfers
    const qSent = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      where('type', '==', 'transfer'),
      orderBy('timestamp', 'desc')
    );
    // Listen to received transfers
    const qReceived = query(
      collection(db, 'transactions'),
      where('recipientId', '==', auth.currentUser.uid),
      where('type', '==', 'transfer'),
      orderBy('timestamp', 'desc')
    );

    const unsub1 = onSnapshot(qSent, (snap) => {
      const sent = snap.docs.map(d => ({ ...d.data(), id: d.id, dir: 'sent' }));
      setRecords(prev => {
        const received = prev.filter((r: any) => r.dir === 'received');
        return [...sent, ...received].sort((a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
      setLoading(false);
    }, () => setLoading(false));

    const unsub2 = onSnapshot(qReceived, (snap) => {
      const received = snap.docs.map(d => ({ ...d.data(), id: d.id, dir: 'received' }));
      setRecords(prev => {
        const sent = prev.filter((r: any) => r.dir === 'sent');
        return [...sent, ...received].sort((a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  const filteredRecords = records.filter(r => r.dir === activeTab);

  const formatTs = (ts: string) => {
    try { return ts.replace('T', ' ').substring(0, 16); } catch { return ts; }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: 'linear-gradient(160deg, #0f0c29 0%, #1a1040 40%, #24243e 100%)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', -apple-system, sans-serif",
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '52px 20px 16px 20px',
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(20px)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0,
        }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', marginRight: 40 }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Transfer Record
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', padding: '14px 18px 0 18px', gap: 10, flexShrink: 0,
      }}>
        {(['sent', 'received'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '11px 0',
            background: activeTab === tab ? 'rgba(230,0,35,0.85)' : 'rgba(255,255,255,0.07)',
            border: `1px solid ${activeTab === tab ? 'rgba(230,0,35,0.6)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 14, color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.55)',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease',
            textTransform: 'capitalize',
            boxShadow: activeTab === tab ? '0 4px 16px rgba(230,0,35,0.35)' : 'none',
          }}>
            {tab === 'sent' ? '📤 Sent' : '📥 Received'}
          </button>
        ))}
      </div>

      {/* Records list */}
      <div style={{ flex: 1, padding: '14px 18px 40px 18px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#E60023', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 20px' }}>
            <div style={{ fontSize: 42, marginBottom: 14 }}>📭</div>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: 600, margin: 0 }}>
              No {activeTab} transfers yet
            </p>
          </div>
        ) : (
          filteredRecords.map((rec: any, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              style={{
                background: 'rgba(255,255,255,0.06)', borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.10)',
                padding: '16px 18px', marginBottom: 12, backdropFilter: 'blur(10px)',
              }}
            >
              {/* Top row: icon + direction + amount */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: rec.dir === 'sent' ? 'rgba(230,0,35,0.20)' : 'rgba(0,200,100,0.20)',
                    border: `1.5px solid ${rec.dir === 'sent' ? 'rgba(230,0,35,0.5)' : 'rgba(0,200,100,0.5)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>
                    {rec.dir === 'sent' ? '📤' : '📥'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
                      {rec.dir === 'sent' ? 'Sent Transfer' : 'Received Transfer'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                      {formatTs(rec.timestamp)}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 18, fontWeight: 900,
                  color: rec.dir === 'sent' ? '#FF4D4D' : '#4AFF91',
                  letterSpacing: -0.5,
                }}>
                  {rec.dir === 'sent' ? '-' : '+'}${(rec.amount || 0).toFixed(2)}
                </div>
              </div>

              {/* Description */}
              {rec.description && (
                <div style={{
                  background: 'rgba(255,255,255,0.04)', borderRadius: 10,
                  padding: '9px 12px', marginBottom: 10,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <FileText size={13} color="rgba(255,255,255,0.35)" style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 500, lineHeight: 1.4 }}>
                    {rec.description}
                  </span>
                </div>
              )}

              {/* Status badge */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: 'rgba(74,255,145,0.15)', color: '#4AFF91',
                  padding: '3px 10px', borderRadius: 20,
                  border: '1px solid rgba(74,255,145,0.3)',
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  ✓ Completed
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}

// ─── Main Transfer Component ───────────────────────────────────────────────────
export default function Transfer({ onBack }: TransferProps) {
  const { showNotification } = useNotification();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [amtError, setAmtError] = useState('');
  const [showRecord, setShowRecord] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBalance(docSnap.data().balance || 0);
          setProfile(docSnap.data());
        }
      }
    };
    fetchBalance();
  }, []);

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val);
    if (val && !isNaN(num)) {
      if (num < MIN_TRANSFER) setAmtError(`Minimum transfer amount is $${MIN_TRANSFER}`);
      else if (num > balance) setAmtError('Insufficient balance');
      else setAmtError('');
    } else {
      setAmtError('');
    }
  };

  const setQuickAmount = (pct: number) => {
    const val = ((balance * pct) / 100).toFixed(2);
    handleAmountChange(val);
  };

  const handleTransfer = async () => {
    if (!profile || !['senior', 'regional', 'reg_gen', 'reg_vp', 'reg_pres', 'cofounder'].includes(profile.currentPlan || '')) {
      showNotification('Transfer is only available for Senior Manager and above.', { type: 'error', title: 'NOT ELIGIBLE' });
      return;
    }
    const amt = parseFloat(amount);
    if (!recipient.trim() || isNaN(amt) || amt <= 0) {
      showNotification('Please enter a valid recipient and amount.', { type: 'error', title: 'INVALID INPUT' });
      return;
    }
    if (amt < MIN_TRANSFER) {
      showNotification(`Minimum transfer amount is $${MIN_TRANSFER}.`, { type: 'error', title: 'BELOW MINIMUM' });
      return;
    }
    if (amt > balance) {
      showNotification('Insufficient balance.', { type: 'error', title: 'INSUFFICIENT' });
      return;
    }
    setLoading(true);
    try {
      if (!auth.currentUser) {
        showNotification('You must be logged in to transfer funds.', { type: 'error', title: 'AUTH REQUIRED' });
        setLoading(false);
        return;
      }
      const usersRef = collection(db, 'users');
      let recipientQuery = query(usersRef, where('email', '==', recipient.toLowerCase().trim()));
      let recipientSnap = await getDocs(recipientQuery);
      if (recipientSnap.empty) {
        recipientQuery = query(usersRef, where('referralCode', '==', recipient.toUpperCase().trim()));
        recipientSnap = await getDocs(recipientQuery);
      }
      if (recipientSnap.empty) {
        showNotification('Recipient not found.', { type: 'error', title: 'NOT FOUND' });
        setLoading(false);
        return;
      }
      const recipientDoc = recipientSnap.docs[0];
      if (recipientDoc.id === auth.currentUser.uid) {
        showNotification('You cannot transfer to yourself.', { type: 'error', title: 'ERROR' });
        setLoading(false);
        return;
      }
      const currentUserRef = doc(db, 'users', auth.currentUser.uid);
      const recipientUserRef = doc(db, 'users', recipientDoc.id);
      await runTransaction(db, async (transaction) => {
        const senderSnap = await transaction.get(currentUserRef);
        const recSnap = await transaction.get(recipientUserRef);
        if (!senderSnap.exists() || !recSnap.exists()) throw new Error('User accounts not found');
        const senderBalance = senderSnap.data().balance || 0;
        const recipientBalance = recSnap.data().balance || 0;
        if (senderBalance < amt) throw new Error('Insufficient balance during transfer');
        transaction.update(currentUserRef, { balance: senderBalance - amt });
        transaction.update(recipientUserRef, { balance: recipientBalance + amt });
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          userId: auth.currentUser!.uid,
          recipientId: recipientDoc.id,
          amount: amt,
          description: description.trim() || 'Fund Transfer',
          type: 'transfer',
          status: 'completed',
          timestamp: new Date().toISOString()
        });
      });
      showNotification(`Successfully transferred $${amt.toFixed(2)} to ${recipientDoc.data().displayName || recipient}.`, { type: 'success', title: 'SUCCESS' });
      setBalance(balance - amt);
      setAmount('');
      setRecipient('');
      setDescription('');
    } catch (error) {
      console.error(error);
      showNotification('An error occurred during transfer.', { type: 'error', title: 'ERROR' });
    } finally {
      setLoading(false);
    }
  };

  const amt = parseFloat(amount);
  const isValid = recipient.trim() && !isNaN(amt) && amt >= MIN_TRANSFER && amt <= balance && !amtError;

  // ── Show Record sub-page ──────────────────────────────────────────────────
  if (showRecord) {
    return <TransferRecordPage onBack={() => setShowRecord(false)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'linear-gradient(160deg, #0f0c29 0%, #1a1040 40%, #24243e 100%)',
        overflowY: 'auto', fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '52px 20px 18px 20px',
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(20px)',
      }}>
        {/* Back button */}
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0,
        }}>
          <ArrowLeft size={18} />
        </button>

        {/* Title */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Transfer Funds
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500, marginTop: 2 }}>
            Secure peer-to-peer transfer
          </p>
        </div>

        {/* Record icon — top right, same style as Withdrawal */}
        <button
          onClick={() => setShowRecord(true)}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
          title="Transfer Records"
        >
          {/* Document / record SVG icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="2" width="16" height="20" rx="2" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8"/>
            <line x1="8" y1="7"  x2="16" y2="7"  stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="11" x2="16" y2="11" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="8" y1="15" x2="13" y2="15" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div style={{ padding: '20px 18px 40px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── BALANCE CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{
            borderRadius: 24, overflow: 'hidden', position: 'relative',
            background: 'linear-gradient(135deg, #E60023 0%, #FF1744 50%, #C62828 100%)',
            boxShadow: '0 16px 40px rgba(230,0,35,0.40)',
            padding: '24px 24px 20px 24px',
          }}
        >
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 6, display: 'flex' }}>
                <DollarSign size={16} color="#fff" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Available Balance
              </span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1 }}>
              ${balance.toFixed(2)}
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
                Min. transfer: ${MIN_TRANSFER}.00 &nbsp;•&nbsp; Instant settlement
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── QUICK AMOUNT BUTTONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: 8 }}
        >
          {[25, 50, 75, 100].map((pct) => (
            <button key={pct} onClick={() => setQuickAmount(pct)} style={{
              flex: 1, padding: '9px 0',
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, color: 'rgba(255,255,255,0.85)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}>
              {pct}%
            </button>
          ))}
        </motion.div>

        {/* ── FORM CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(20px)', overflow: 'hidden',
          }}
        >
          {/* Recipient */}
          <div style={{ padding: '20px 20px 0 20px' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.1, display: 'block', marginBottom: 10 }}>
              Recipient
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                <User size={17} color="rgba(255,255,255,0.35)" />
              </div>
              <input
                type="text" value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Email address or referral code"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14, paddingLeft: 44, paddingRight: 16,
                  paddingTop: 14, paddingBottom: 14,
                  color: '#fff', fontSize: 14, fontWeight: 600, outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(230,0,35,0.6)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>
          </div>

          <div style={{ margin: '18px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }} />

          {/* Amount */}
          <div style={{ padding: '0 20px' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.1, display: 'block', marginBottom: 10 }}>
              Amount to Transfer
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 20, fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>$</div>
              <input
                type="number" value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00" min={MIN_TRANSFER}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1px solid ${amtError ? 'rgba(230,0,35,0.6)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 14, paddingLeft: 36, paddingRight: 16,
                  paddingTop: 14, paddingBottom: 14,
                  color: '#fff', fontSize: 22, fontWeight: 900, outline: 'none', letterSpacing: -0.5,
                }}
              />
            </div>
            <AnimatePresence>
              {amtError && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <AlertCircle size={13} color="#FF4D4D" />
                  <span style={{ fontSize: 12, color: '#FF4D4D', fontWeight: 600 }}>{amtError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ margin: '18px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }} />

          {/* Description */}
          <div style={{ padding: '0 20px 20px 20px' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1.1, display: 'block', marginBottom: 10 }}>
              Description <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500, textTransform: 'none' }}>(optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 14, top: 14 }}>
                <FileText size={16} color="rgba(255,255,255,0.35)" />
              </div>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a note for this transfer..." maxLength={120} rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 14, paddingLeft: 44, paddingRight: 16,
                  paddingTop: 13, paddingBottom: 13,
                  color: '#fff', fontSize: 14, fontWeight: 500,
                  outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(230,0,35,0.6)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>
            <div style={{ textAlign: 'right', marginTop: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{description.length}/120</span>
            </div>
          </div>
        </motion.div>

        {/* ── TRANSFER SUMMARY ── */}
        <AnimatePresence>
          {!isNaN(amt) && amt >= MIN_TRANSFER && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{
                background: 'rgba(230,0,35,0.08)', borderRadius: 18,
                border: '1px solid rgba(230,0,35,0.25)', padding: '16px 18px', overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <Zap size={14} color="#FF4D4D" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FF6B6B', textTransform: 'uppercase', letterSpacing: 0.8 }}>Transfer Summary</span>
              </div>
              {[
                { label: 'You send', value: `$${amt.toFixed(2)}` },
                { label: 'Transfer fee', value: 'Free' },
                { label: 'Recipient gets', value: `$${amt.toFixed(2)}`, highlight: true },
              ].map(({ label, value, highlight }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: highlight ? '#FF4D4D' : 'rgba(255,255,255,0.9)' }}>{value}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── INFO BOX ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px' }}
        >
          {[
            { icon: ShieldCheck, text: 'Transfers are instant and irreversible. Double-check recipient details.' },
            { icon: AlertCircle, text: `Minimum transfer amount is $${MIN_TRANSFER}. Available for Senior Manager and above.` },
            { icon: Zap, text: "Funds settle instantly into recipient's wallet with no fees." },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 2 ? 12 : 0 }}>
              <Icon size={14} color="rgba(255,255,255,0.35)" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500, lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </motion.div>

        {/* ── SEND BUTTON ── */}
        <motion.button
          onClick={handleTransfer}
          disabled={loading || !isValid}
          whileTap={isValid && !loading ? { scale: 0.97 } : {}}
          style={{
            width: '100%',
            background: loading || !isValid ? 'rgba(255,255,255,0.10)' : 'linear-gradient(135deg, #E60023 0%, #FF1744 55%, #C62828 100%)',
            color: loading || !isValid ? 'rgba(255,255,255,0.35)' : '#fff',
            fontWeight: 900, fontSize: 17, padding: '17px 0', borderRadius: 18,
            border: loading || !isValid ? '1px solid rgba(255,255,255,0.1)' : 'none',
            cursor: loading || !isValid ? 'not-allowed' : 'pointer',
            boxShadow: loading || !isValid ? 'none' : '0 10px 30px rgba(230,0,35,0.50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            letterSpacing: 0.5, transition: 'all 0.25s ease',
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Processing...
            </>
          ) : (
            <>
              <Send size={18} />
              Send Transfer
              <ChevronRight size={18} style={{ opacity: 0.7 }} />
            </>
          )}
        </motion.button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.25); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>
    </motion.div>
  );
}
