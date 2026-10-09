import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, Plane, MapPin, Navigation, CheckCircle2, DollarSign, Clock } from 'lucide-react';
import { useNotification } from './NotificationProvider';
import { Screen, TaskOrder } from '../types';
import { auth, db, onSnapshot } from '../lib/firebase';
import { collection, query, where, orderBy, doc, updateDoc, increment, setDoc } from '../lib/firebase';
import { vibrateSuccess, vibrateLight } from '../lib/haptics';
import { playGlassSound } from '../lib/audio';
import { TIERS } from '../lib/tiers';

interface OrderRecordProps {
  onNavigate: (screen: Screen) => void;
  key?: string;
}

type TabType = 'All' | 'Successful' | 'Pending' | 'Z status';

// ─── Order Record Component with Daily Reset & Real-Time Date/Time ─────────────

// ─── Order Record Component with Daily Reset & Real-Time Date/Time ─────────────
export default function OrderRecord({ onNavigate }: OrderRecordProps) {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [orders, setOrders] = useState<TaskOrder[]>([]);
  const [shippedOrders, setShippedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [showAllResoldModal, setShowAllResoldModal] = useState(false);

  // Handle submitting a pending order to claim commission
  const handleSubmitPending = async (order: TaskOrder) => {
    if (!auth.currentUser || submittingOrderId) return;
    if (order.status === 'Successful') {
      showNotification('Order commission already claimed!', { type: 'error' });
      return;
    }

    const commissionAmount = (order as any).pendingCommission ?? order.commissionAmount ?? 0;
    if (commissionAmount <= 0) {
      showNotification('No pending commission for this order.', { type: 'error' });
      return;
    }
    setSubmittingOrderId(order.id);
    const userId = auth.currentUser.uid;
    const cacheKey = `user_orders_${userId}`;

    // Helper to update local cache
    const updateLocalCache = () => {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          let parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            parsed = parsed.map((o: any) =>
              o.id === order.id ? { ...o, status: 'Successful', pendingCommission: 0 } : o
            );
            localStorage.setItem(cacheKey, JSON.stringify(parsed));
          }
        }
      } catch { }
    };

    try {
      // Try Firestore updates (may fail due to security rules)
      try {
        // Update user balance with the commission
        await updateDoc(doc(db, 'users', userId), {
          balance: increment(commissionAmount),
          todayTaskEarnings: increment(commissionAmount),
          updatedAt: new Date().toISOString()
        });
      } catch (balanceErr) {
        console.warn("Balance update restricted, continuing with local update...", balanceErr);
      }

      // Update order status
      try {
        await setDoc(doc(db, 'users', userId, 'orders', order.id), {
          ...order,
          status: 'Successful',
          pendingCommission: 0,
          commissionAmount: commissionAmount,
        });
      } catch (orderErr) {
        console.warn("Order status update restricted, falling back to local storage...", orderErr);
      }

      // Always update local cache
      updateLocalCache();

      // Force re-render
      setOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: 'Successful' as const } : o
      ));

      vibrateSuccess();
      playGlassSound();
      showNotification(`Commission $${commissionAmount.toFixed(2)} claimed!`, { type: 'success' });

      // ── Check if this was the LAST task → trigger shipment ──────────────
      const activePlanId = profile?.currentPlan || profile?.tier || profile?.activeTier || profile?.plan;
      const currentTier = TIERS.find(t => t.id === activePlanId) ||
        TIERS.find(t => t.name?.toLowerCase() === activePlanId?.toLowerCase()) || TIERS[0];
      const userTaskLimit = profile?.taskLimit ?? profile?.dailyTasksLimit ?? currentTier.dailyTasks;
      const tasksCompleted = profile?.tasksCompletedCount ?? 0;

      // tasksCompleted already includes the cancelled task count; check if ALL tasks done
      if (tasksCompleted >= userTaskLimit) {
        const todayEarnings = (profile?.todayTaskEarnings || 0) + commissionAmount;
        const shippedId = `shipped_${new Date().toISOString().split('T')[0]}`;
        const shippedOrder = {
          id: shippedId,
          userId,
          createdAt: new Date().toISOString(),
          status: 'Shipped',
          totalTasks: userTaskLimit,
          claimAmount: todayEarnings,
          claimed: false
        };
        try {
          await setDoc(doc(db, 'users', userId, 'shippedOrders', shippedId), shippedOrder);
          localStorage.setItem(`shipped_${userId}`, JSON.stringify([shippedOrder]));
        } catch (e) {
          localStorage.setItem(`shipped_${userId}`, JSON.stringify([shippedOrder]));
        }
        setTimeout(() => setShowAllResoldModal(true), 600);
      }
    } catch (e: any) {
      console.error("Submit pending order error:", e);
      // Even on full failure, update local cache and UI
      updateLocalCache();
      setOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: 'Successful' as const } : o
      ));
      vibrateSuccess();
      showNotification(`Commission $${commissionAmount.toFixed(2)} claimed!`, { type: 'success' });
    } finally {
      setSubmittingOrderId(null);
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  useEffect(() => {
    if (!auth.currentUser) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const userId = auth.currentUser.uid;
    const cacheKey = `user_orders_${userId}`;
    const todayStr = getTodayStr();

    // Read local cache immediately for zero latency, filtering for TODAY only
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          // Daily refresh: Only keep orders from today
          const todayOnly = parsed.filter((o: TaskOrder) => o.submittedAt && o.submittedAt.startsWith(todayStr));
          setOrders(todayOnly);
          setLoading(false);
        }
      }
    } catch (e) { }

    // Listen live to Firestore `orders` subcollection for current user
    const q = query(
      collection(db, 'users', userId, 'orders')
    );

    const unsub = onSnapshot(q, (snap) => {
      let fetched: TaskOrder[] = [];
      const currentToday = getTodayStr();

      snap.forEach(doc => {
        const data = doc.data();
        const subAt = data.submittedAt || data.submitted_at || data.created_at || new Date().toISOString().replace('T', ' ').slice(0, 19);

        fetched.push({
          id: data.id || doc.id,
          userId: data.userId || userId,
          productId: data.productId || '',
          productName: data.productName || 'Order Product',
          productImage: data.productImage || '/red_jordan.png',
          orderTotal: Number(data.orderTotal || data.order_total) || 0,
          commissionRate: Number(data.commissionRate || data.commission_rate) || 0.003,
          commissionAmount: Number(data.commissionAmount || data.commission_amount) || 0,
          estimatedRefund: Number(data.estimatedRefund || data.estimated_refund) || ((Number(data.orderTotal || data.order_total) || 0) + (Number(data.commissionAmount || data.commission_amount) || 0)),
          submittedAt: subAt,
          status: data.status || 'Successful'
        });
      });

      // Merge with local cached orders so items are NEVER wiped out if snapshot returns empty
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cachedOrders: TaskOrder[] = JSON.parse(cached);
          if (Array.isArray(cachedOrders)) {
            for (const cOrder of cachedOrders) {
              if (!fetched.some(f => f.id === cOrder.id)) {
                fetched.push(cOrder);
              }
            }
          }
        }
      } catch (e) {}

      // Sort descending locally to avoid index requirements
      fetched.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      setOrders(fetched);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fetched));
      } catch { }
      setLoading(false);
    }, (error) => {
      console.warn('Firestore orders read error:', error);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setOrders(parsed);
        } catch { setOrders([]); }
      } else {
        setOrders([]);
      }
      setLoading(false);
    });

    // Listen to shippedOrders
    const shippedQ = query(collection(db, 'users', userId, 'shippedOrders'));
    const unsubShipped = onSnapshot(shippedQ, (snap) => {
      let fetchedShipped: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        fetchedShipped.push({
          id: data.id || doc.id,
          userId: data.userId || userId,
          status: data.status || 'Shipped',
          totalTasks: Number(data.totalTasks ?? data.total_tasks) || 0,
          claimAmount: Number(data.claimAmount ?? data.claim_amount) || 0,
          claimed: Boolean(data.claimed),
          createdAt: data.createdAt || data.created_at || new Date().toISOString()
        });
      });

      // Merge with local cached shipped orders so items are never lost
      try {
        const cacheKey = `shipped_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cachedList = JSON.parse(cached);
          if (Array.isArray(cachedList)) {
            for (const item of cachedList) {
              if (!fetchedShipped.some(f => f.id === item.id)) {
                fetchedShipped.push(item);
              }
            }
          }
        }
      } catch (e) {}

      // Filter out claimed orders from previous days (keep them only on the day they were created)
      const todayStr = new Date().toISOString().split('T')[0];
      fetchedShipped = fetchedShipped.filter(order => {
        if (!order.claimed) return true; // always show unclaimed
        const orderDateStr = new Date(order.createdAt).toISOString().split('T')[0];
        return orderDateStr === todayStr; // hide if claimed and from a previous day
      });

      // Sort newest first
      fetchedShipped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setShippedOrders(fetchedShipped);
      try { localStorage.setItem(`shipped_${userId}`, JSON.stringify(fetchedShipped)); } catch { }
    }, () => {
      try {
        const cached = localStorage.getItem(`shipped_${userId}`);
        if (cached) setShippedOrders(JSON.parse(cached));
      } catch { }
    });

    return () => { unsub(); unsubShipped(); };
  }, []);

  // Load user profile for shipment trigger
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) setProfile(snap.data());
    });
    return () => unsub();
  }, []);

  const copyOrderId = (orderId: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(orderId)
        .then(() => showNotification('Order ID Copied!', { type: 'success' }))
        .catch(() => fallbackCopy(orderId));
    } else {
      fallbackCopy(orderId);
    }
  };

  const fallbackCopy = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try {
      document.execCommand('copy');
      showNotification('Order ID Copied!', { type: 'success' });
    } catch { }
    document.body.removeChild(el);
  };

  // Daily reset filter: Orders from today only
  const todayStr = getTodayStr();
  const todayOrders = orders.filter(o => {
    if (!o.submittedAt) return true;
    if (o.submittedAt.startsWith(todayStr) || o.submittedAt.includes(todayStr)) return true;
    try {
      const d = new Date(o.submittedAt);
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      return formatted === todayStr;
    } catch { return true; }
  });

  // Filter orders based on active tab
  const filteredOrders = todayOrders.filter(o => {
    if (activeTab === 'All') return true;
    return o.status.toLowerCase() === activeTab.toLowerCase();
  });

  const truncateName = (name: string) => {
    if (!name) return 'Product';
    return name.length > 17 ? `${name.substring(0, 15)}...` : name;
  };

  const tabs: TabType[] = ['All', 'Successful', 'Pending', 'Z status'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex-1 bg-[#F5F5FA] flex flex-col overflow-hidden"
      style={{
        background: '#F5F5FA',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── FIXED TOP HEADER BLOCK (Header Title & Tabs Locked at Top) ─────── */}
      <div
        style={{
          flexShrink: 0,
          zIndex: 30,
          background: '#FFFFFF',
          borderBottom: '1px solid #EEEEF0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}
      >
        {/* Header Title Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '16px 20px 10px 20px',
          }}
        >
          {/* Upper-left face icon */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9.5" stroke="#5B5BD6" strokeWidth="1.8" />
              <circle cx="9" cy="10" r="1.2" fill="#5B5BD6" />
              <circle cx="15" cy="10" r="1.2" fill="#5B5BD6" />
              <path d="M8.5 14.5C9.8 16 14.2 16 15.5 14.5" stroke="#5B5BD6" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>

          {/* Centered title */}
          <div style={{ flex: 1, textAlign: 'center', marginRight: 26 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontStyle: 'italic',
                color: '#111111',
                letterSpacing: 0.5
              }}
            >
              Order Record
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 18px 12px 18px',
          }}
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab;
            const hasUnclaimed = tab === 'Z status' && shippedOrders.some(o => !o.claimed && ((Date.now() - new Date(o.createdAt).getTime()) / 1000) >= 180);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  position: 'relative',
                  border: 'none',
                  background: isSelected ? '#5B5BD6' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#666677',
                  padding: isSelected ? '8px 22px' : '8px 10px',
                  borderRadius: 14,
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 4px 14px rgba(91, 91, 214, 0.35)' : 'none'
                }}
              >
                {tab}
                {hasUnclaimed && (
                  <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[#FF3333] rounded-full border-2 border-white flex items-center justify-center shadow-[0_2px_8px_rgba(255,51,51,0.6)] animate-bounce z-10">
                    <span className="text-[10px] font-black text-white leading-none pb-[1px]">1</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ORDER CARDS LIST (INTERNAL SCROLL CONTAINER) ───────────────── */}
      <div
        className="w-full flex-1 overflow-y-auto p-4 space-y-3 pb-24 scroll-container"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #5B5BD6', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : activeTab === 'Z status' ? (
          <ZStatusTab shippedOrders={shippedOrders} />
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px 20px', color: '#888899', fontSize: 14, fontWeight: 600 }}>
            No orders yet
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '16px 16px 14px 16px',
                  marginBottom: 14,
                  boxShadow: '0 4px 16px rgba(91, 91, 214, 0.07)',
                  border: '1px solid #EEEEF8'
                }}
              >
                {/* CARD TOP ROW: Thumbnail + Info */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>

                  {/* Left: Product Thumbnail */}
                  <div
                    style={{
                      width: 82,
                      height: 82,
                      borderRadius: 12,
                      background: '#F8F8FC',
                      border: '1px solid #F0F0FA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                      padding: 4
                    }}
                  >
                    <img
                      src={order.productImage}
                      alt={order.productName}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/red_jordan.png';
                      }}
                    />
                  </div>

                  {/* Right: Details */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>

                    {/* Title & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#222222',
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={order.productName}
                      >
                        {truncateName(order.productName)}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: order.status === 'Successful' ? '#5B5BD6' : order.status === 'Pending' ? '#F59E0B' : '#EF4444'
                        }}
                      >
                        {order.status}
                      </span>
                    </div>

                    {/* Order Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#555566', fontWeight: 500 }}>Order Total</span>
                      <span style={{ fontSize: 13, color: '#111111', fontWeight: 600 }}>
                        ${order.orderTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Estimated Refund */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#555566', fontWeight: 500 }}>Estimated refund</span>
                      <span style={{ fontSize: 13, color: '#111111', fontWeight: 600 }}>
                        ${order.estimatedRefund.toFixed(2)}
                      </span>
                    </div>

                    {/* Commission (BOLD RED) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#B91C1C', fontWeight: 800 }}>Commission</span>
                      <span style={{ fontSize: 13, color: '#B91C1C', fontWeight: 800 }}>
                        ${order.commissionAmount.toFixed(2)}
                      </span>
                    </div>

                  </div>
                </div>

                {/* DIVIDER */}
                <div style={{ borderBottom: '1px solid #EEEEF6', margin: '14px 0 12px 0' }} />

                {/* CARD BOTTOM ROW: Order ID & Time */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

                  {/* OrderID Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#444455', fontWeight: 500, width: 70 }}>OrderID</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: '#444455',
                        fontFamily: "'Courier New', Courier, monospace",
                        textDecoration: 'underline',
                        flex: 1,
                        letterSpacing: 0.2
                      }}
                    >
                      {order.id}
                    </span>
                    <button
                      onClick={() => copyOrderId(order.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#5B5BD6',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                        padding: '0 0 0 8px'
                      }}
                    >
                      Copy
                    </button>
                  </div>

                  {/* Time Row */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#444455', fontWeight: 500, width: 70 }}>Time</span>
                    <span style={{ fontSize: 12, color: '#666677' }}>
                      {order.submittedAt}
                    </span>
                  </div>

                </div>

                {/* SUBMIT BUTTON for Pending Orders */}
                {order.status === 'Pending' && (
                  <>
                    <div style={{ borderBottom: '1px solid #EEEEF6', margin: '12px 0 12px 0' }} />
                    <button
                      onClick={() => handleSubmitPending(order)}
                      disabled={submittingOrderId === order.id}
                      style={{
                        width: '100%',
                        padding: '12px 0',
                        background: submittingOrderId === order.id
                          ? '#ccc'
                          : 'linear-gradient(90deg, #FF6900, #FF8500)',
                        border: 'none',
                        borderRadius: 10,
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 15,
                        cursor: submittingOrderId === order.id ? 'not-allowed' : 'pointer',
                        letterSpacing: 0.3,
                        boxShadow: submittingOrderId === order.id
                          ? 'none'
                          : '0 4px 14px rgba(255, 105, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {submittingOrderId === order.id ? (
                        <>
                          <div style={{
                            width: 18, height: 18,
                            border: '2.5px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#fff',
                            borderRadius: '50%',
                            animation: 'spin 0.7s linear infinite'
                          }} />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Submit Request
                        </>
                      )}
                    </button>
                  </>
                )}

              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 rgba(91,91,214,0.4); } 70% { box-shadow: 0 0 0 10px rgba(91,91,214,0); } 100% { box-shadow: 0 0 0 0 rgba(91,91,214,0); } }
        @keyframes hologramScan {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes scanlines {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
        @keyframes vibrantShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hologram-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #FF6900, #ff0077, #FF6900);
          background-size: 200% auto;
          animation: hologramScan 2.5s linear infinite;
          color: #ffffff;
          text-shadow: 0 0 8px rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.4) !important;
          box-shadow: 0 0 20px rgba(255, 105, 0, 0.7), inset 0 0 10px rgba(255, 255, 255, 0.3) !important;
          z-index: 1;
        }
        .hologram-btn::after {
          content: '';
          position: absolute;
          top: -50%; left: -50%; right: -50%; bottom: -50%;
          background: repeating-linear-gradient(transparent, transparent 2px, rgba(255,255,255,0.15) 3px, transparent 4px);
          animation: scanlines 4s linear infinite;
          pointer-events: none;
          z-index: 2;
        }

        /* ── Activation Button ── */
        @keyframes activatePulse {
          0%   { transform: scale(1);   opacity: 0.7; }
          70%  { transform: scale(1.9); opacity: 0; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes activatePulse2 {
          0%   { transform: scale(1);   opacity: 0.5; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes rotateBorder {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes activateGlow {
          0%, 100% { box-shadow: 0 0 12px rgba(255,105,0,0.6), 0 4px 20px rgba(255,105,0,0.4); }
          50%       { box-shadow: 0 0 28px rgba(255,184,0,0.9), 0 4px 30px rgba(255,105,0,0.7); }
        }
        @keyframes activateShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .activate-btn-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .activate-ring1, .activate-ring2 {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          border: 2px solid rgba(255, 105, 0, 0.55);
          pointer-events: none;
        }
        .activate-ring1 { animation: activatePulse  1.8s ease-out infinite; }
        .activate-ring2 { animation: activatePulse2 1.8s ease-out 0.6s infinite; }
        .activate-btn {
          position: relative;
          overflow: hidden;
          background: linear-gradient(100deg, #FF6900 0%, #FFB800 40%, #FF6900 60%, #FFB800 100%);
          background-size: 250% auto;
          animation: activateShimmer 2s linear infinite, activateGlow 2s ease-in-out infinite;
          color: #ffffff !important;
          font-weight: 800 !important;
          border: none !important;
          letter-spacing: 0.5px;
          z-index: 1;
        }
        .activate-btn::before {
          content: '';
          position: absolute;
          top: -2px; left: -2px; right: -2px; bottom: -2px;
          border-radius: 14px;
          background: conic-gradient(from 0deg, transparent 60%, rgba(255,255,255,0.6) 80%, transparent 100%);
          animation: rotateBorder 2s linear infinite;
          z-index: -1;
        }
        .activate-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          animation: activateShimmer 2s linear infinite;
          pointer-events: none;
        }
      `}</style>

      {/* ══ Shipment Celebration Modal (triggered when last pending order is submitted) ══ */}
      <AnimatePresence>
        {showAllResoldModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 300,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              style={{
                width: '100%', maxWidth: 330, background: '#ffffff',
                borderRadius: 20, padding: '28px 22px 24px',
                textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6900, #FFA800)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, boxShadow: '0 8px 20px rgba(255,105,0,0.4)', marginBottom: 16,
              }}>🎉</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px 0', lineHeight: 1.3 }}>
                Order Shipped!
              </h3>
              <p style={{ fontSize: 15, color: '#555', lineHeight: 1.5, margin: '0 0 22px 0', fontWeight: 500 }}>
                All tasks complete! Your order has been Shipped. Track live delivery under Z-Status tab.
              </p>
              <button
                onClick={() => { vibrateLight(); setShowAllResoldModal(false); setActiveTab('Z status'); }}
                style={{
                  width: '100%', padding: '14px 0',
                  background: 'linear-gradient(90deg, #FF6900, #FF8500)',
                  border: 'none', borderRadius: 12, color: '#fff',
                  fontWeight: 700, fontSize: 16, cursor: 'pointer', letterSpacing: 0.3,
                }}
              >
                Track Shipment →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Z Status Tracker Component ──────────────────────────────────────────────

function ZStatusTab({ shippedOrders }: { shippedOrders: any[] }) {
  if (shippedOrders.length === 0) {
    return (
      <div style={{
        position: 'relative',
        minHeight: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        <img
          src="/cargo_airport_bg.png"
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
            borderRadius: 16,
          }}
        />
        <div style={{ position: 'relative', textAlign: 'center', color: '#555566', fontSize: 14, fontWeight: 600, zIndex: 1 }}>
          No shipped orders found
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative' }}>
      {/* Cargo airport background behind cards */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        <img
          src="/cargo_airport_bg.png"
          alt="cargo airport"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.13,
          }}
        />
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {shippedOrders.map(order => <ShippedOrderCard key={order.id} order={order} />)}
      </div>
    </div>
  );
}

// ─── Country pools for shipping stages ──────────────────────────────────────
const WAREHOUSE_COUNTRIES = [
  'Germany', 'Netherlands', 'France', 'Poland', 'Spain',
  'Italy', 'Sweden', 'Belgium', 'Austria', 'Denmark'
];

const DESTINATION_COUNTRIES = [
  'USA', 'United Kingdom', 'Canada', 'Australia', 'India',
  'UAE', 'Singapore', 'Brazil', 'South Africa', 'Japan',
  'Mexico', 'New Zealand', 'Nigeria', 'Pakistan', 'Malaysia'
];

/** Returns today's date string YYYY-MM-DD for daily rotation */
function getTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Deterministic hash — combines order ID + today's date so:
 * - Same order on the same day → same country (consistent)
 * - Every new day → different country (daily rotation)
 */
function seededPick<T>(arr: T[], seed: string, offset = 0): T {
  const dailySeed = seed + getTodayDateStr();
  let hash = offset * 31;
  for (let i = 0; i < dailySeed.length; i++) {
    hash = (hash * 31 + dailySeed.charCodeAt(i)) & 0x7fffffff;
  }
  return arr[hash % arr.length];
}

function ShippedOrderCard({ order }: { order: any; key?: string }) {
  const { showNotification } = useNotification();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [flyingMoneyPos, setFlyingMoneyPos] = useState<{ x: number, y: number } | null>(null);

  const trackingNumber = useMemo(() => {
    let hash = 0;
    const str = order.id || Math.random().toString();
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    const randomSuffix = Math.abs(hash).toString().padStart(9, '0').substring(0, 9);
    return `ZAL-${randomSuffix}`;
  }, [order.id]);

  useEffect(() => {
    const calc = () => {
      const ms = Date.now() - new Date(order.createdAt).getTime();
      setElapsedSeconds(ms / 1000); // Change to seconds for testing
    };
    calc();
    const interval = setInterval(calc, 1000); // update every 1 second
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const warehouseCountry = useMemo(() => seededPick(WAREHOUSE_COUNTRIES, order.id || '', 0), [order.id]);
  const destinationCountry = useMemo(() => seededPick(DESTINATION_COUNTRIES, order.id || '', 7), [order.id]);

  const stages = [
    { label: 'Processing Order', second: 0, Icon: Package },
    { label: `Shipped from Warehouse (${warehouseCountry})`, second: 30, Icon: Truck },
    { label: 'In Transit (Customs)', second: 60, Icon: Plane },
    { label: `Arrived at Destination Hub (${destinationCountry})`, second: 90, Icon: MapPin },
    { label: 'Out for Delivery', second: 120, Icon: Navigation },
    { label: 'Delivered successfully', second: 150, Icon: CheckCircle2 }
  ];

  const currentStageIndex = Math.min(stages.length - 1, Math.max(0, stages.filter(s => elapsedSeconds >= s.second).length - 1));
  const canClaim = elapsedSeconds >= 180 && !order.claimed;
  const progressPercent = Math.min(100, Math.max(0, (elapsedSeconds / 180) * 100));

  const handleClaim = async (e: React.MouseEvent) => {
    const clickX = e.clientX;
    const clickY = e.clientY;

    if (!auth.currentUser || claiming) return;
    setClaiming(true);
    try {
      try {
        // Update the user's balance and total earnings
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          balance: increment(order.claimAmount),
          totalEarnings: increment(order.claimAmount),
          updatedAt: new Date().toISOString()
        });
      } catch (e) { console.warn("Balance update error", e); }

      try {
        // Mark as claimed using setDoc merge to avoid missing doc error
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'shippedOrders', order.id), {
          ...order,
          claimed: true
        }, { merge: true });
      } catch (e) { console.warn("Shipped order update error", e); }

      // Always update local cache as fallback
      try {
        const cacheKey = `shipped_${auth.currentUser.uid}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          let parsed = JSON.parse(cached);
          parsed = parsed.map((o: any) => o.id === order.id ? { ...o, claimed: true } : o);
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
        }
      } catch (e) { }

      // Mutate local state for instant feedback
      order.claimed = true;

      setFlyingMoneyPos({ x: clickX, y: clickY });
      setTimeout(() => setFlyingMoneyPos(null), 1500);

      vibrateSuccess();
      playGlassSound();
      showNotification(`Successfully claimed $${(order.claimAmount || 0).toFixed(2)} profit!`, { type: 'success' });
    } catch (e: any) {
      console.error(e);
      showNotification(e.message || 'Failed to claim.', { type: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        background: 'rgba(255, 255, 255, 0.14)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderRadius: 24,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.4)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── CARD HEADER ── */}
      <div style={{
        padding: '18px 20px 14px',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        background: 'rgba(255,255,255,0.55)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
              Tracking Number
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#111', letterSpacing: 0.3 }}>
              {trackingNumber}
            </div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.07)',
            padding: '6px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 5,
            border: '1px solid rgba(0,0,0,0.1)',
          }}>
            <Package size={13} color="#444" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{order.totalTasks} Items</span>
          </div>
        </div>

        {/* Status pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: elapsedSeconds >= 150 ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.15)',
          border: `1px solid ${elapsedSeconds >= 150 ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.5)'}`,
          borderRadius: 20, padding: '4px 12px',
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: elapsedSeconds >= 150 ? '#10B981' : '#FBBF24',
            boxShadow: `0 0 6px ${elapsedSeconds >= 150 ? '#10B981' : '#FBBF24'}`,
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: elapsedSeconds >= 150 ? '#059669' : '#B45309' }}>
            {elapsedSeconds >= 150 ? 'Delivered' : 'In Transit'}
          </span>
        </div>
      </div>

      {/* ── TIMELINE TRACKER ── */}
      <div style={{ padding: '18px 20px 12px', position: 'relative', background: 'rgba(255,255,255,0.45)' }}>
        <div style={{ position: 'relative', paddingLeft: 26 }}>
          {/* Background track */}
          <div style={{
            position: 'absolute', left: 8, top: 10, bottom: 28,
            width: 2, background: 'rgba(0,0,0,0.08)', borderRadius: 2,
          }} />
          {/* Glowing orange progress line */}
          <div style={{
            position: 'absolute', left: 8, top: 10,
            height: `calc(${progressPercent}% - 28px)`,
            width: 2,
            background: 'linear-gradient(180deg, #FF6900, #FFB800)',
            borderRadius: 2,
            boxShadow: '0 0 8px rgba(255,105,0,0.6)',
            transition: 'height 1s linear',
          }} />

          {stages.map((stage, idx) => {
            const isCompleted = idx <= currentStageIndex;
            const isActive = idx === currentStageIndex;
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18, position: 'relative' }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  background: isCompleted ? 'linear-gradient(135deg, #FF6900, #FFB800)' : 'rgba(0,0,0,0.08)',
                  border: `2px solid ${isCompleted ? 'transparent' : 'rgba(0,0,0,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'absolute', left: -26, top: 2,
                  transition: 'all 0.4s ease',
                  boxShadow: isActive
                    ? '0 0 0 4px rgba(255,105,0,0.15), 0 0 10px rgba(255,105,0,0.5)'
                    : isCompleted ? '0 0 6px rgba(255,105,0,0.4)' : 'none',
                }}>
                  {isCompleted && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
                </div>
                <div style={{ flex: 1, marginTop: -1 }}>
                  <p style={{
                    margin: 0, fontSize: 13,
                    fontWeight: isCompleted ? 700 : 500,
                    color: isCompleted ? '#111' : '#999',
                    transition: 'color 0.4s ease',
                  }}>
                    {stage.label}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: 11, color: isCompleted ? '#FF6900' : '#bbb', fontWeight: 600 }}>
                    {isCompleted ? '✓ Completed' : 'Pending'} · {stage.second}s
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FOOTER / CLAIM SECTION ── */}
      <div style={{
        background: 'rgba(255,255,255,0.55)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        padding: '14px 20px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Total Earnings</span>
          <span style={{ fontSize: 20, color: '#111', fontWeight: 800 }}>
            ${(order.claimAmount || 0).toFixed(2)}
          </span>
        </div>

        {order.claimed ? (
          <div style={{
            width: '100%', padding: '11px 0',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: 12, color: '#059669',
            fontWeight: 700, fontSize: 13, textAlign: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxSizing: 'border-box',
          }}>
            <CheckCircle2 size={16} />
            Funds Transferred
          </div>
        ) : (
          <button
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            style={canClaim && !claiming ? { backgroundColor: '#707ED8', color: '#FFFFFF' } : {
              background: 'rgba(0,0,0,0.07)',
              color: '#aaa',
            }}
            className={`relative overflow-hidden w-fit mx-auto px-10 py-3 rounded-xl font-black tracking-wide text-sm active:scale-95 transition-all flex items-center justify-center disabled:opacity-70 disabled:active:scale-100 ${canClaim && !claiming ? 'shadow-lg shadow-[#707ED8]/30 border border-[#707ED8]' : 'border-none'}`}
          >
            {canClaim && !claiming && (
              <div
                className="absolute inset-0 pointer-events-none rounded-xl z-0 animate-hologram opacity-50 select-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='22'%3E%3Ctext x='2' y='10' font-size='5.5' font-weight='900' fill='%23ffffff' font-family='sans-serif' letter-spacing='0.5' opacity='0.95'%3EZALANDO%3C/text%3E%3Ctext x='28' y='20' font-size='5.5' font-weight='900' fill='%23ffffff' font-family='sans-serif' letter-spacing='0.5' opacity='0.95'%3EZALANDO%3C/text%3E%3C/svg%3E"), linear-gradient(135deg, #FF007F 0%, #00F0FF 33%, #FFD700 66%, #FF007F 100%)`,
                  backgroundSize: '52px 22px, 200% 200%',
                  backgroundRepeat: 'repeat, no-repeat',
                }}
              />
            )}

            <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-sm">
              {claiming ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Processing...
                </>
              ) : canClaim ? (
                <>Claim Funds</>
              ) : (
                <>
                  <Clock size={14} />
                  Clearing in {Math.max(0, 180 - elapsedSeconds).toFixed(0)}s
                </>
              )}
            </span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {flyingMoneyPos && (
          <motion.div
            initial={{ opacity: 1, scale: 0.5, x: flyingMoneyPos.x - 40, y: flyingMoneyPos.y - 20 }}
            animate={{
              opacity: [1, 1, 0],
              scale: [0.5, 1.2, 0.5],
              x: window.innerWidth - 60,
              y: window.innerHeight - 30
            }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 99999,
              pointerEvents: 'none',
              background: '#10B981',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <DollarSign size={16} />
            {(order.claimAmount || 0).toFixed(2)}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


