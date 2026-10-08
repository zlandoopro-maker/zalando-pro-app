import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowDownToLine, ArrowUpToLine, Send, Copy, CheckCircle2, XCircle, Clock3, FileText, ChevronRight } from 'lucide-react';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import { useNotification } from './NotificationProvider';
import { vibrateLight } from '../lib/haptics';

interface TransactionHistoryProps {
  onBack: () => void;
  key?: string;
}

export default function TransactionHistory({ onBack }: TransactionHistoryProps) {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'deposits' | 'withdrawals' | 'transfers'>('deposits');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Data states
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, string>>({});

  // ── Poll NOWPayments API for live status (UI fallback, webhook is primary) ─
  useEffect(() => {
    // ✅ FIX: Poll using nowpayments_invoice_id, NOT orderId (which is the Supabase UUID)
    const pendingNowPayments = deposits.filter(
      r => r.payment_method === 'nowpayments' && r.status === 'pending' && r.nowpayments_invoice_id
    );
    if (pendingNowPayments.length === 0) return;

    let mounted = true;
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;

    const checkStatuses = async () => {
      for (const record of pendingNowPayments) {
        try {
          const res = await fetch(`${baseUrl}/api/crypto-pay/status/${record.nowpayments_invoice_id}`, {
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
        } catch (e) { /* Silently ignore — webhook handles persistence */ }
      }
    };

    checkStatuses();
    const interval = setInterval(checkStatuses, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, [deposits]);

  // ── Fetch all transaction data from Supabase with realtime updates ─────────
  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    setLoading(true);

    const fetchAll = async () => {
      const [depRes, wdRes, txRes] = await Promise.all([
        supabase.from('transactions').select('*')
          .eq('user_id', userId).eq('type', 'deposit')
          .order('timestamp', { ascending: false }),
        supabase.from('transactions').select('*')
          .eq('user_id', userId).eq('type', 'withdrawal')
          .order('timestamp', { ascending: false }),
        supabase.from('transactions').select('*')
          .or(`user_id.eq.${userId},recipient_id.eq.${userId}`)
          .eq('type', 'transfer')
          .order('timestamp', { ascending: false })
      ]);

      setDeposits(depRes.data || []);
      setWithdrawals(wdRes.data || []);

      const allTransfers = (txRes.data || []).map(d => ({
        ...d,
        dir: d.user_id === userId ? 'sent' : 'received'
      })).sort((a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setTransfers(allTransfers);
      setLoading(false);
    };

    fetchAll();

    // Realtime subscription — updates instantly when webhook fires & DB changes
    const channel = supabase
      .channel(`tx-history-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        () => { fetchAll(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [auth.currentUser, activeTab]);

  useEffect(() => {
    setLoading(true);
    setExpandedId(null);
    const t = setTimeout(() => setLoading(false), 200);
    return () => clearTimeout(t);
  }, [activeTab]);

  const formatTs = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-US', {
        month: 'short', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch { return ts; }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    vibrateLight();
    showNotification(`${label} copied to clipboard`, { type: 'success' });
  };

  const toggleExpand = (id: string) => {
    vibrateLight();
    setExpandedId(prev => prev === id ? null : id);
  };

  const currentRecords = activeTab === 'deposits' ? deposits : activeTab === 'withdrawals' ? withdrawals : transfers;

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
      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '52px 20px 16px 20px',
        background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(20px)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0,
        }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', marginRight: 40 }}>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: 1, textTransform: 'uppercase', fontStyle: 'italic' }}>
            Transactions
          </h1>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{
        display: 'flex', padding: '16px 20px 8px 20px', gap: 8, flexShrink: 0,
      }}>
        {[
          { id: 'deposits', label: 'Deposits', icon: ArrowDownToLine, color: '#3BBFEF' },
          { id: 'withdrawals', label: 'Withdraws', icon: ArrowUpToLine, color: '#10B981' },
          { id: 'transfers', label: 'Transfers', icon: Send, color: '#F472B6' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
            flex: 1, padding: '12px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            borderRadius: 14,
            background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)'}`,
            cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: activeTab === tab.id ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
          }}>
            <tab.icon size={18} color={activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.5)'} />
            <span style={{
              fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)',
            }}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── RECORDS LIST ── */}
      <div style={{ flex: 1, padding: '16px 20px 40px 20px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#5B5BD6', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : currentRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText size={28} color="rgba(255,255,255,0.2)" />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 600, margin: 0 }}>
              No {activeTab} records found
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {currentRecords.map((rec: any, i) => {
              // Status formatting
              let statusText = rec.status || 'Pending';
              let StatusIcon = Clock3;
              let statusColor = '#F59E0B';
              let statusBg = 'rgba(245,158,11,0.15)';
              
              if (activeTab === 'deposits' && rec.payment_method === 'nowpayments' && liveStatuses[rec.id]) {
                const liveStatusRaw = liveStatuses[rec.id];
                if (['finished', 'sending', 'confirmed'].includes(liveStatusRaw)) {
                  statusText = 'Completed';
                } else if (['failed', 'expired', 'refunded'].includes(liveStatusRaw)) {
                  statusText = 'Failed';
                }
              }

              if (['completed', 'approved', 'passed', 'successful'].includes(statusText.toLowerCase())) {
                statusText = 'Completed';
                StatusIcon = CheckCircle2;
                statusColor = '#4AFF91'; // Green for dark theme
                statusBg = 'rgba(74,255,145,0.15)';
              } else if (['failed', 'rejected'].includes(statusText.toLowerCase())) {
                statusText = 'Failed';
                StatusIcon = XCircle;
                statusColor = '#FF4D4D';
                statusBg = 'rgba(255,77,77,0.15)';
              }

              // Amount formatting
              let amountStr = `$${(rec.amount || 0).toFixed(2)}`;
              let amountColor = '#FFFFFF';
              let prefix = '';
              
              if (activeTab === 'deposits') { amountColor = '#4AFF91'; prefix = '+'; }
              else if (activeTab === 'withdrawals') { amountColor = '#FFFFFF'; prefix = '-'; }
              else if (activeTab === 'transfers') {
                if (rec.dir === 'sent') { prefix = '-'; amountColor = '#FF4D4D'; }
                else { prefix = '+'; amountColor = '#4AFF91'; }
              }

              const isExpanded = expandedId === rec.id;

              return (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 18,
                    padding: '0', marginBottom: 16,
                    border: '1px solid rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {/* Compact Header */}
                  <div 
                    onClick={() => toggleExpand(rec.id)}
                    style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {activeTab === 'deposits' && <ArrowDownToLine size={20} color="#3BBFEF" />}
                        {activeTab === 'withdrawals' && <ArrowUpToLine size={20} color="#10B981" />}
                        {activeTab === 'transfers' && <Send size={20} color="#F472B6" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#fff' }}>
                          {activeTab === 'deposits' && 'Wallet Deposit'}
                          {activeTab === 'withdrawals' && 'Wallet Withdrawal'}
                          {activeTab === 'transfers' && (rec.dir === 'sent' ? 'Transfer Sent' : 'Transfer Received')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <StatusIcon size={12} strokeWidth={3} />
                            {statusText}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>•</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}>
                            {formatTs(rec.timestamp).split(',')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                       <div style={{ fontSize: 16, fontWeight: 800, color: amountColor, letterSpacing: -0.5 }}>
                         {prefix}{amountStr}
                       </div>
                       <ChevronRight size={16} color="rgba(255,255,255,0.3)" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 18px 18px 18px' }}>
                          <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            
                            {/* Date & Time */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Date & Time</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                                {formatTs(rec.timestamp)}
                              </span>
                            </div>

                            {/* Transaction ID */}
                            {(rec.txid || rec.id) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Transaction ID</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)' }}>
                                    {(rec.txid || rec.id).substring(0, 16)}...
                                  </span>
                                  <button onClick={(e) => { e.stopPropagation(); handleCopy(rec.txid || rec.id, 'Transaction ID'); }} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, border: 'none', cursor: 'pointer', padding: 4 }}>
                                    <Copy size={12} color="#3BBFEF" />
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Wallet Address (Withdrawals) */}
                            {(rec.wallet_address || rec.walletAddress) && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>To Address</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)' }}>
                                    {(rec.wallet_address || rec.walletAddress).substring(0, 6)}...{(rec.wallet_address || rec.walletAddress).substring((rec.wallet_address || rec.walletAddress).length - 4)}
                                  </span>
                                  <button onClick={(e) => { e.stopPropagation(); handleCopy(rec.wallet_address || rec.walletAddress, 'Wallet Address'); }} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, border: 'none', cursor: 'pointer', padding: 4 }}>
                                    <Copy size={12} color="#3BBFEF" />
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {/* Fee (Withdrawals) */}
                            {activeTab === 'withdrawals' && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Network Fee (5%)</span>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#FF4D4D' }}>
                                  -${((rec.amount || 0) * 0.05).toFixed(2)}
                                </span>
                              </div>
                            )}

                            {/* Remarks / Errors */}
                            {(rec.description || rec.remark || rec.rejection_reason || rec.rejectionReason) && (
                              <div style={{ background: statusBg, border: `1px solid ${statusColor}40`, borderRadius: 10, padding: '10px 12px', marginTop: 4 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, textTransform: 'uppercase', marginBottom: 4 }}>
                                  {statusText === 'Failed' ? 'Reason for Failure' : 'Note'}
                                </div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, fontWeight: 500 }}>
                                  {(rec.rejection_reason || rec.rejectionReason || rec.description || rec.remark).replace(/admin/gi, 'Zalando')}
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
