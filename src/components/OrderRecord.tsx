import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from './NotificationProvider';
import { Screen, TaskOrder } from '../types';
import { auth, db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from '../lib/firebase';

interface OrderRecordProps {
  onNavigate: (screen: Screen) => void;
  key?: string;
}

type TabType = 'All' | 'Successful' | 'Pending' | 'Failed';

// ─── Order Record Component with Daily Reset & Real-Time Date/Time ─────────────

// ─── Order Record Component with Daily Reset & Real-Time Date/Time ─────────────
export default function OrderRecord({ onNavigate }: OrderRecordProps) {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [orders, setOrders] = useState<TaskOrder[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (e) {}

    // Listen live to Firestore `orders` collection for current user
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('submittedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetched: TaskOrder[] = [];
      const currentToday = getTodayStr();

      snap.forEach(doc => {
        const data = doc.data();
        const subAt = data.submittedAt || new Date().toISOString().replace('T', ' ').slice(0, 19);

        // Daily refresh guard: Only include orders submitted TODAY (current date)
        if (subAt.startsWith(currentToday)) {
          fetched.push({
            id: data.id || doc.id,
            userId: data.userId || userId,
            productId: data.productId || '',
            productName: data.productName || 'Order Product',
            productImage: data.productImage || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
            orderTotal: data.orderTotal || 0,
            commissionRate: data.commissionRate || 0.003,
            commissionAmount: data.commissionAmount || 0,
            estimatedRefund: data.estimatedRefund || (data.orderTotal + data.commissionAmount),
            submittedAt: subAt,
            status: data.status || 'Successful'
          });
        }
      });

      setOrders(fetched);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fetched));
      } catch {}
      setLoading(false);
    }, (error) => {
      console.warn('Firestore orders read error:', error);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const currentToday = getTodayStr();
          const parsed = JSON.parse(cached);
          const todayOnly = parsed.filter((o: TaskOrder) => o.submittedAt && o.submittedAt.startsWith(currentToday));
          setOrders(todayOnly);
        } catch { setOrders([]); }
      } else {
        setOrders([]);
      }
      setLoading(false);
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
    } catch {}
    document.body.removeChild(el);
  };

  // Daily reset filter: Orders from today only
  const todayStr = getTodayStr();
  const todayOrders = orders.filter(o => o.submittedAt && o.submittedAt.startsWith(todayStr));

  // Filter orders based on active tab
  const filteredOrders = todayOrders.filter(o => {
    if (activeTab === 'All') return true;
    return o.status.toLowerCase() === activeTab.toLowerCase();
  });

  const truncateName = (name: string) => {
    if (!name) return 'Product';
    return name.length > 17 ? `${name.substring(0, 15)}...` : name;
  };

  const tabs: TabType[] = ['All', 'Successful', 'Pending', 'Failed'];

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
              <circle cx="12" cy="12" r="9.5" stroke="#5B5BD6" strokeWidth="1.8"/>
              <circle cx="9" cy="10" r="1.2" fill="#5B5BD6"/>
              <circle cx="15" cy="10" r="1.2" fill="#5B5BD6"/>
              <path d="M8.5 14.5C9.8 16 14.2 16 15.5 14.5" stroke="#5B5BD6" strokeWidth="1.6" strokeLinecap="round"/>
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

        {/* Tabs Row */}
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
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
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
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
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

              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}

