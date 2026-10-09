import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, doc, onSnapshot, updateDoc, increment, collection, addDoc, setDoc, verifyClockIntegrity, getReliableServerTime, getDocs, query, where } from '../lib/firebase';
import { useNotification } from './NotificationProvider';
import { vibrateLight, vibrateSuccess } from '../lib/haptics';
import { playGlassSound } from '../lib/audio';
import { TIERS } from '../lib/tiers';
import { ChevronLeft } from 'lucide-react';
import { TierBadge } from './TierBadge';

// ─── Helper functions ────────────────────────────────────────────────────────
function generateOrderId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${Math.floor(Math.random() * 9999999).toString().padStart(7, '0')}`;
}

function generateOrderTotal(planPrice: number): number {
  // Random between 76% and 97% of plan price
  const factor = 0.76 + Math.random() * 0.21;
  return Math.round(planPrice * factor * 100) / 100;
}

function formatNow(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Smart commission: each task gets a varied amount, all tasks sum EXACTLY to dailyReward
// remainingReward must be the EXACT unrounded remaining amount (dailyReward - cumulativePaid)
function calculateCommission(remainingReward: number, remainingTasks: number): number {
  if (remainingTasks <= 0) return 0;
  // Last task always gets the exact remaining amount — no rounding drift
  if (remainingTasks === 1) return Math.round(remainingReward * 100) / 100;

  const avg = remainingReward / remainingTasks;
  // Randomize between 70% and 130% of the average (tighter band = more stable)
  const minFactor = 0.70;
  const maxFactor = 1.30;
  let commission = avg * (minFactor + Math.random() * (maxFactor - minFactor));

  // Ensure remaining tasks after this one won't be starved or bloated
  const futureRemaining = remainingReward - commission;
  const futureAvg = futureRemaining / (remainingTasks - 1);
  const globalAvg = avg;
  if (futureAvg < globalAvg * 0.40 || futureAvg > globalAvg * 1.60) {
    // Too skewed — pull closer to average
    commission = avg * (0.88 + Math.random() * 0.24);
  }

  // Never below $0.01 or above what would starve remaining tasks
  commission = Math.max(0.01, commission);
  commission = Math.min(commission, remainingReward - (remainingTasks - 1) * 0.01);

  // Round to 2 decimals for display, but caller must subtract the UNROUNDED value
  // We store rounded value — caller tracks cumulativePaid as sum of rounded values
  return Math.round(commission * 100) / 100;
}

// ─── Product Catalog (120+ items) ────────────────────────────────────────────
// ─── Product Catalog (Branded Merchandise & Clothing) ────────────────────────
const PRODUCT_CATALOG = [
  { name: 'GUCCI GG MARMONT MINI TOP HANDLE BAG', img: '/handbag_final.png' },
  { name: 'NIKE AIR JORDAN 1 RETRO HIGH OG - CHICAGO', img: '/red_jordan.png' },
  { name: 'ROLEX SUBMARINER DATE - BLACK DIAL', img: '/watch_final.png' },
  { name: 'CHANEL COCO MADEMOISELLE INTENSE EDP', img: '/chanel_perfume.png' },
  { name: 'GUCCI GG SAFFIANO LEATHER MINI BAG', img: '/gucci_bag.png' },
  { name: 'GUCCI GG SUPREME CANVAS BACKPACK', img: '/product_backpack.png' },
  { name: 'NIKE HERITAGE SWOOSH SPORT CAP', img: '/product_cap.png' },
  { name: 'ACNE STUDIOS OVERSIZED DENIM JACKET', img: '/product_denim.png' },
  { name: 'CARTIER EMERALD & DIAMOND EARRINGS', img: '/product_earrings.png' },
  { name: 'TORY BURCH MILLER SQUARE SUNGLASSES', img: '/product_sunglasses.png' },
  { name: 'CHARLOTTE TILBURY MATTE REVOLUTION LIPSTICK', img: '/lipstick_final.png' },
  { name: 'DIOR ROUGE DIOR ULTRA ROUGE LIPSTICK', img: '/lipstick_final.png' },
  { name: 'DIOR MISS DIOR BLOOMING BOUQUET EDT', img: '/chanel_perfume.png' },
  { name: 'LOUIS VUITTON NEVERFULL MM TOTE BAG', img: '/handbag_final.png' },
  { name: 'ADIDAS ULTRABOOST 22 RUNNING SHOES', img: '/red_jordan.png' },
  { name: 'OMEGA SEAMASTER DIVER 300M WATCH', img: '/watch_final.png' },
  { name: 'RAY-BAN WAYFARER CLASSIC SUNGLASSES', img: '/product_sunglasses.png' },
  { name: 'GUCCI RECTANGULAR FRAME SUNGLASSES', img: '/product_sunglasses.png' },
  { name: 'SWAROVSKI ATTRACT STUD EARRINGS', img: '/product_earrings.png' },
  { name: 'CELINE CLASSIC BOX BAG - CALFSKIN', img: '/handbag_final.png' },
  { name: 'SAINT LAURENT KATE TASSEL CHAIN BAG', img: '/gucci_bag.png' },
] as const;


// ─────────────────────────────────────────────────────────────────────────────
// DailyTasks
// ─────────────────────────────────────────────────────────────────────────────
interface DailyTasksProps {
  onBack: () => void;
  onUnlockPro: () => void;
  key?: string;
}

// All products in the slot machine reel (existing + new products)
const ALL_PRODUCTS = [
  { src: '/lipstick_final.png', scale: 2.0, label: 'Lipstick' },
  { src: '/handbag_final.png', scale: 1.0, label: 'Handbag' },
  { src: '/watch_final.png', scale: 1.3, label: 'Watch' },
  { src: '/red_jordan.png', scale: 1.0, label: 'Nike Air Jordan' },
  { src: '/chanel_perfume.png', scale: 0.9, label: 'Chanel Coco Mademoiselle' },
  { src: '/product_cap.png', scale: 1.0, label: 'Nike Cap' },
  { src: '/product_denim.png', scale: 0.95, label: 'Denim Jacket' },
  { src: '/product_earrings.png', scale: 1.0, label: 'Emerald Earrings' },
  { src: '/product_sunglasses.png', scale: 1.0, label: 'Tory Sunglasses' },
  { src: '/product_backpack.png', scale: 0.95, label: 'Gucci Backpack' },
];

// Products that the spin can randomly land on (the new additions)
const LANDING_PRODUCTS = [
  ALL_PRODUCTS[3], // Red Nike Air Jordan
  ALL_PRODUCTS[4], // Chanel Coco Mademoiselle
  ALL_PRODUCTS[5], // Nike Cap
  ALL_PRODUCTS[6], // Denim Jacket
  ALL_PRODUCTS[7], // Emerald Earrings
  ALL_PRODUCTS[8], // Tory Sunglasses
  ALL_PRODUCTS[9], // Gucci Backpack
];

// Pick a random landing product
function getRandomLandingProduct() {
  return LANDING_PRODUCTS[Math.floor(Math.random() * LANDING_PRODUCTS.length)];
}

// Default products shown in the 3 boxes when idle (original layout)
const DEFAULT_SLOT_PRODUCTS = [
  ALL_PRODUCTS[0], // Lipstick
  ALL_PRODUCTS[1], // Handbag
  ALL_PRODUCTS[2], // Watch
];

// SlotReel component: simulates a single slot machine column
function SlotReel({
  isSpinning,
  stopDelay,
  defaultProduct,
  finalProduct,
  onStopped,
}: {
  isSpinning: boolean;
  stopDelay: number;
  defaultProduct: typeof ALL_PRODUCTS[0];
  finalProduct: typeof ALL_PRODUCTS[0];
  onStopped?: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'stopping' | 'landed'>('idle');
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start spinning
  useEffect(() => {
    if (isSpinning && phase === 'idle') {
      setPhase('spinning');
      // Rapidly cycle through products
      let idx = 0;
      intervalRef.current = setInterval(() => {
        idx = (idx + 1) % ALL_PRODUCTS.length;
        setCurrentIndex(idx);
      }, 100); // fast cycle

      // Schedule stop after the individual delay
      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('stopping');

        // Slow down: short cycle then land
        const slowSequence = [...ALL_PRODUCTS, finalProduct];
        let step = 0;

        const runSlowStep = () => {
          if (step >= slowSequence.length) {
            setCurrentIndex(ALL_PRODUCTS.indexOf(finalProduct));
            setPhase('landed');
            onStopped?.();
            return;
          }
          setCurrentIndex(ALL_PRODUCTS.indexOf(slowSequence[step]) !== -1 ? ALL_PRODUCTS.indexOf(slowSequence[step]) : 3);
          step++;
          timeoutRef.current = setTimeout(runSlowStep, 80 + step * 10); // True progressive slow down
        };
        runSlowStep();
      }, stopDelay);
    }

    // Reset when not spinning anymore (after full cycle back to idle)
    if (!isSpinning && phase === 'landed') {
      setPhase('idle');
      setCurrentIndex(ALL_PRODUCTS.indexOf(defaultProduct));
    }
  }, [isSpinning, phase]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const displayProduct = phase === 'idle'
    ? defaultProduct
    : phase === 'landed'
      ? finalProduct
      : ALL_PRODUCTS[currentIndex];

  const isAnimating = phase === 'spinning' || phase === 'stopping';

  return (
    <div style={{
      width: '100%', height: '100%',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        key={isAnimating ? `spin-${currentIndex}` : `static-${phase}`}
        initial={isAnimating ? { y: '-100%', opacity: 0 } : false}
        animate={{ y: '0%', opacity: 1 }}
        transition={
          isAnimating
            ? { duration: 0.08, ease: 'linear' }
            : phase === 'landed'
              ? { duration: 0.4, type: 'spring', bounce: 0.5 }
              : { duration: 0.3 }
        }
        style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <img
          src={displayProduct.src}
          alt={displayProduct.label}
          style={{
            width: '85%',
            height: '85%',
            objectFit: 'contain',
            display: 'block',
            opacity: 1,
            transform: `scale(${displayProduct.scale})`,
          }}
        />
      </motion.div>
    </div>
  );
}

export default function DailyTasks({ onBack }: DailyTasksProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<any>(null);
  const [flowState, setFlowState] = useState<'idle' | 'spinning' | 'stopped' | 'page2' | 'page3'>('idle');
  const [page3Data, setPage3Data] = useState<{ product: { name: string; img: string }; orderId: string; orderTotal: number; commission: number; time: string; } | null>(null);
  const stoppedCountRef = useRef(0);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);

  const activePlanId = profile?.currentPlan || profile?.tier || profile?.activeTier || profile?.plan;
  const currentTier = TIERS.find(t => t.id === activePlanId) || TIERS.find(t => t.name?.toLowerCase() === activePlanId?.toLowerCase()) || TIERS[0];
  const userTaskLimit = profile?.taskLimit ?? profile?.dailyTasksLimit ?? currentTier.dailyTasks;
  const userCommissionRate = profile?.commissionRate ?? currentTier.commissionRate;

  useEffect(() => {
    spinAudioRef.current = new Audio('/spin-sound.mpeg');
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (s) => {
      if (s.exists()) {
        const data = s.data();
        setProfile(data);
      }
    });
    return () => unsub();
  }, []);

  const handleAllReelsStopped = useCallback(() => {
    stoppedCountRef.current += 1;
    if (stoppedCountRef.current >= 3) {
      stoppedCountRef.current = 0;
      vibrateSuccess();
      playGlassSound();

      // ── Exact commission calculation ──────────────────────────────────────
      const tasksCompleted = profile?.tasksCompletedCount || 0;
      const dailyReward = currentTier.reward;          // e.g. 121.00 for $2000 plan
      const paidSoFar = profile?.todayTaskEarnings || 0;
      
      // Calculate exactly how much is left to reach the daily reward
      let remainingReward = Math.round((dailyReward - paidSoFar) * 100) / 100;
      
      // Safety bounds just in case of weird data
      if (remainingReward < 0) remainingReward = 0;
      
      let remainingTasks = userTaskLimit - tasksCompleted;
      if (remainingTasks <= 0) remainingTasks = 1; // Fallback to 1 if spinning past limit

      // If this is the last task, give exact remaining so total == dailyReward
      const commission = (remainingTasks === 1)
        ? Math.max(0.01, remainingReward)
        : calculateCommission(remainingReward, remainingTasks);

      const randomProduct = PRODUCT_CATALOG[Math.floor(Math.random() * PRODUCT_CATALOG.length)];
      const orderTotal = generateOrderTotal(currentTier.price);
      setPage3Data({ product: randomProduct, orderId: generateOrderId(), orderTotal, commission, time: formatNow() });
      setTimeout(() => {
        setFlowState('page2');
        setTimeout(() => setFlowState('page3'), 1700);
      }, 1000);
    }
  }, [currentTier, profile, userTaskLimit]);

  // Generate random landing products for each reel on each spin
  const [landingProducts, setLandingProducts] = useState(() => [
    getRandomLandingProduct(),
    getRandomLandingProduct(),
    getRandomLandingProduct(),
  ]);

  const [showExceededLimit, setShowExceededLimit] = useState(false);

  const handleSlotTap = async () => {
    if (flowState !== 'idle') return;

    // ── TIME TAMPERING CHECK (Instant Ban if detected) ──
    const isClockOk = await verifyClockIntegrity(showNotification);
    if (!isClockOk) return;

    if (auth.currentUser?.uid) {
      // 1. Quick local cache check
      try {
        const cacheKey = `user_orders_${auth.currentUser.uid}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const todayStr = formatNow().split(' ')[0];
            const hasPending = parsed.some((o: any) => o.status === 'Pending' && o.submittedAt && o.submittedAt.startsWith(todayStr));
            if (hasPending) {
              vibrateLight();
              showNotification('Please submit your pending order first!', { type: 'error' });
              return;
            }
          }
        }
      } catch (e) {}

      // 2. Fallback to Firestore check to be 100% sure
      try {
        const todayStr = formatNow().split(' ')[0];
        const q = query(collection(db, 'users', auth.currentUser.uid, 'orders'), where('status', '==', 'Pending'));
        const pendingSnap = await getDocs(q);
        let hasPendingForToday = false;
        for (const d of pendingSnap.docs ?? []) {
          const data = d.data();
          const subAt = data.submittedAt || data.submitted_at || data.created_at || '';
          if (String(subAt).startsWith(todayStr)) hasPendingForToday = true;
        }
        
        if (hasPendingForToday) {
          vibrateLight();
          showNotification('Please submit your pending order first!', { type: 'error' });
          return;
        }
      } catch (e) {}
    }

    // Check if task limit for today is reached
    const tasksCompleted = profile?.tasksCompletedCount ?? 0;
    if (tasksCompleted >= userTaskLimit) {
      vibrateLight();
      setShowExceededLimit(true);
      setTimeout(() => setShowExceededLimit(false), 2500);
      return;
    }

    vibrateLight();
    if (spinAudioRef.current) {
      spinAudioRef.current.currentTime = 0;
      spinAudioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    stoppedCountRef.current = 0;
    // Pick new random landing products for this spin
    setLandingProducts([
      getRandomLandingProduct(),
      getRandomLandingProduct(),
      getRandomLandingProduct(),
    ]);
    setFlowState('spinning');
  };

  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [showAllResoldModal, setShowAllResoldModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false); // Blocks multiple cancel taps
  const isSubmittingRef = useRef(false); // Prevents duplicate submit on rapid taps

  const handleCancel = async () => {
    // ── Duplicate-tap guard: React state ensures button is disabled immediately ──
    if (isCancelling) return;
    setIsCancelling(true);

    if (!auth.currentUser || !profile || !page3Data) {
      vibrateLight();
      setFlowState('idle');
      setShowSubmitSuccess(false);
      setIsCancelling(false);
      return;
    }

    vibrateLight();

    // ── Immediately close UI so user cannot tap again ──
    setFlowState('idle');
    setShowSubmitSuccess(false);

    // Task counts but NO commission is given
    const orderId = generateOrderId();
    const pendingOrder = {
      id: orderId,
      userId: auth.currentUser.uid,
      productId: 'p-generated',
      productName: page3Data.product.name || 'Zalando Product',
      productImage: page3Data.product.img || '/red_jordan.png',
      orderTotal: page3Data.orderTotal || 0,
      commissionRate: userCommissionRate,
      commissionAmount: page3Data.commission ?? 0,
      pendingCommission: page3Data.commission ?? 0,
      estimatedRefund: (page3Data.orderTotal || 0) + (page3Data.commission ?? 0),
      submittedAt: formatNow(),
      status: 'Pending'
    };

    // ── Update local cache immediately (instant UI) ──
    const cacheKey = `user_orders_${auth.currentUser.uid}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      let parsed = cached ? JSON.parse(cached) : [];
      if (!Array.isArray(parsed)) parsed = [];
      if (!parsed.some((o: any) => o.id === orderId)) {
        parsed.unshift(pendingOrder);
      }
      localStorage.setItem(cacheKey, JSON.stringify(parsed));
    } catch (e) {}

    const timeSafe = await verifyClockIntegrity(showNotification);
    if (!timeSafe) {
      setFlowState('idle');
      setShowSubmitSuccess(false);
      setIsCancelling(false);
      return;
    }

    // ── DB writes happen in background ──
    try {
      const serverNow = (await getReliableServerTime()) || Date.now();
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        tasksCompletedCount: increment(1),
        updatedAt: new Date(serverNow).toISOString()
      });
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'orders', orderId), pendingOrder);
    } catch (e: any) {
      console.error("Cancel task error:", e);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmit = async () => {
    // ── Duplicate-tap guard: bail immediately if already processing ──
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const clockOk = await verifyClockIntegrity(showNotification);
    if (!clockOk) {
      isSubmittingRef.current = false;
      return;
    }

    if (!auth.currentUser || !profile) {
      isSubmittingRef.current = false;
      return;
    }
    const tasksCompleted = profile.tasksCompletedCount ?? 0;
    if (tasksCompleted >= userTaskLimit) {
      showNotification('Daily task limit reached!', { type: 'error' });
      setFlowState('idle');
      isSubmittingRef.current = false;
      return;
    }
    vibrateSuccess();
    playGlassSound();
    const commissionAmount = page3Data?.commission ?? 0.11;
    const isLastTask = (tasksCompleted + 1) >= userTaskLimit;

    // ── Instantly close UI for snappy feel (DB writes happen below) ──
    if (!isLastTask) {
      setShowSubmitSuccess(true);
      setTimeout(() => {
        setShowSubmitSuccess(false);
        setFlowState('idle');
        isSubmittingRef.current = false;
      }, 900);
    }

    try {
      const serverNow = (await getReliableServerTime()) || Date.now();
      const serverNowIso = new Date(serverNow).toISOString();

      // Create order record in user's subcollection to bypass top-level security rules
      const orderId = generateOrderId();
      const newOrder = {
        id: orderId,
        userId: auth.currentUser.uid,
        productId: 'p-generated',
        productName: page3Data?.product.name || 'Zalando Product',
        productImage: page3Data?.product.img || '/red_jordan.png',
        orderTotal: page3Data?.orderTotal || 0,
        commissionRate: userCommissionRate,
        commissionAmount: commissionAmount,
        estimatedRefund: (page3Data?.orderTotal || 0) + commissionAmount,
        submittedAt: formatNow(),
        status: 'Successful'
      };

      try {
        const updateData: any = {
          tasksCompletedCount: increment(1),
          todayTaskEarnings: increment(commissionAmount),
          updatedAt: serverNowIso
        };
        await updateDoc(doc(db, 'users', auth.currentUser.uid), updateData);

        // Write to subcollection (safer permission-wise)
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'orders', orderId), newOrder);

        // --- DISTRIBUTE 10% TASK REBATE TO REFERRER ---
        if (profile?.referredBy && commissionAmount > 0) {
          try {
            const taskRebate = Math.round((commissionAmount * 0.10) * 100) / 100;
            if (taskRebate > 0) {
              const refUserRef = doc(db, 'users', profile.referredBy);
              await updateDoc(refUserRef, {
                balance: increment(taskRebate),
                totalEarnings: increment(taskRebate),
                todayTeamEarnings: increment(taskRebate),
                updatedAt: serverNowIso
              });

              await addDoc(collection(db, 'transactions'), {
                userId: profile.referredBy,
                type: 'commission',
                amount: taskRebate,
                status: 'completed',
                timestamp: new Date().toISOString(),
                fromUser: auth.currentUser.uid,
                note: 'Team Task Commission Rebate (10%)'
              });

              await addDoc(collection(db, 'referrals'), {
                referrerId: profile.referredBy,
                inviteeId: auth.currentUser.uid,
                inviteeName: profile.displayName || profile.username || profile.email || 'Team Member',
                planType: profile.currentPlan || 'Active',
                commissionEarned: taskRebate,
                commissionType: 'task_commission',
                timestamp: new Date().toISOString(),
                status: 'active'
              });
            }
          } catch (refErr) {
            console.warn("Failed to pay task rebate to referrer:", refErr);
          }
        }

        // Always update local cache so OrderRecord loads immediately
        const cacheKey = `user_orders_${auth.currentUser.uid}`;
        try {
          const cached = localStorage.getItem(cacheKey);
          let parsed = cached ? JSON.parse(cached) : [];
          if (!Array.isArray(parsed)) parsed = [];
          if (!parsed.some((o: any) => o.id === orderId)) {
            parsed.unshift(newOrder);
          }
          localStorage.setItem(cacheKey, JSON.stringify(parsed));
        } catch (e) {}
      } catch (dbError) {
        console.warn("Error submitting task:", dbError);
      }

      if (isLastTask) {
        try {

          const shippedId = `shipped_${new Date().toISOString().split('T')[0]}`;
          const claimAmount = (profile.todayTaskEarnings || 0) + commissionAmount;
          const shippedOrder = {
            id: shippedId,
            createdAt: new Date().toISOString(),
            status: 'Shipped',
            totalTasks: userTaskLimit,
            claimAmount: claimAmount,
            claimed: false
          };
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'shippedOrders', shippedId), shippedOrder);
          localStorage.setItem(`shipped_${auth.currentUser.uid}`, JSON.stringify([shippedOrder]));
        } catch (e) {
          console.warn('Fallback to local storage for shipped order', e);
          const shippedId = `shipped_${new Date().toISOString().split('T')[0]}`;
          const claimAmount = (profile.todayTaskEarnings || 0) + commissionAmount;
          localStorage.setItem(`shipped_${auth.currentUser.uid}`, JSON.stringify([{
            id: shippedId,
            createdAt: new Date().toISOString(),
            status: 'Shipped',
            totalTasks: userTaskLimit,
            claimAmount: claimAmount,
            claimed: false
          }]));
        }
        // Trigger celebratory popup for finishing all tasks of the plan
        setShowAllResoldModal(true);
        isSubmittingRef.current = false;
      }
    } catch (e: any) {
      console.error("Submit task error:", e);
      showNotification(`Failed: ${e?.message || 'Unknown error'}`, { type: 'error' });
      // Only reset if not already handled above (non-last task case)
      if (isSubmittingRef.current) {
        setFlowState('idle');
        isSubmittingRef.current = false;
      }
    }
  };

  // Slot positions measured precisely from Image 2 (daily_task_ref_empty.png - 841x1870)
  const slotPositions = [
    { left: '12.25%', top: '48.88%', width: '23.66%', height: '9.25%' },
    { left: '38.41%', top: '48.88%', width: '23.31%', height: '9.25%' },
    { left: '64.21%', top: '48.88%', width: '23.31%', height: '9.25%' },
  ];

  const stopDelays = [460, 1460, 2460];

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      style={{
        width: '100%', height: '100%', position: 'relative',
        backgroundColor: '#050b14', display: 'flex',
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        overflow: 'hidden',
      }}>

        {/* ══ PAGE 1: Image 2 Background + Perfectly Aligned Yellow Slot Reels ══ */}
        <AnimatePresence>
          {(flowState === 'idle' || flowState === 'spinning' || flowState === 'stopped') && (
            <motion.div key="page1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0 }}>

              {/* Background from Image 2 (daily_task_ref_empty.png) */}
              <img src="/daily_task_ref_empty.png" alt="Daily Tasks Background"
                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />

              {/* Back button — disabled during spin/flow to prevent accidental exit */}
              <button
                onClick={flowState === 'idle' ? onBack : undefined}
                disabled={flowState !== 'idle'}
                style={{
                  position: 'absolute', top: '2.5%', left: '3.5%', width: '11%', aspectRatio: '1',
                  background: flowState !== 'idle'
                    ? 'rgba(120, 120, 120, 0.25)'
                    : 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: '50%',
                  border: flowState !== 'idle'
                    ? '1px solid rgba(180,180,180,0.2)'
                    : '1px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: flowState !== 'idle' ? 'not-allowed' : 'pointer',
                  zIndex: 20,
                  color: flowState !== 'idle' ? 'rgba(255,255,255,0.3)' : 'white',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  opacity: flowState !== 'idle' ? 0.45 : 1,
                }}
                aria-label="Go Back"
                aria-disabled={flowState !== 'idle'}
              >
                <ChevronLeft size={22} />
              </button>

              {/* Active Tier Badge + Name below back button */}
              {currentTier && (
                <div style={{
                  position: 'absolute', top: '14%', left: '2%', zIndex: 20,
                  display: 'flex', flexDirection: 'row', alignItems: 'center',
                  gap: '1.5%',
                }}>
                  <div style={{ width: '13%', aspectRatio: '1', flexShrink: 0 }}>
                    <TierBadge tierId={currentTier.id} mode="color" className="w-full h-full" />
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 3,
                  }}>
                    <div style={{
                      background: 'rgba(0,0,0,0.60)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderRadius: 7,
                      padding: '2px 7px',
                      color: '#fff',
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                      lineHeight: 1.3,
                      border: '1px solid rgba(255,255,255,0.2)',
                      whiteSpace: 'nowrap',
                    }}>
                      {currentTier.name}
                    </div>
                    <div style={{
                      background: 'rgba(255,180,0,0.85)',
                      borderRadius: 7,
                      padding: '2px 7px',
                      color: '#1a0a00',
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                    }}>
                      {currentTier.commissionRate} Rate
                    </div>
                  </div>
                </div>
              )}

              {/* Three yellow slot boxes with SlotReel components */}
              {slotPositions.map((slot, i) => (
                <div key={i} onClick={handleSlotTap}
                  style={{
                    position: 'absolute',
                    left: slot.left, top: slot.top, width: slot.width, height: slot.height,
                    backgroundColor: '#febf06',
                    borderRadius: '8%',
                    zIndex: 10, cursor: 'pointer',
                    overflow: 'hidden',
                  }}>
                  <SlotReel
                    isSpinning={flowState === 'spinning'}
                    stopDelay={stopDelays[i]}
                    defaultProduct={DEFAULT_SLOT_PRODUCTS[i]}
                    finalProduct={landingProducts[i]}
                    onStopped={handleAllReelsStopped}
                  />
                </div>
              ))}

              {/* Exceeded order limit quantity! Notification Banner (Squarish box) */}
              <AnimatePresence>
                {showExceededLimit && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: '-50%', y: 5 }}
                    animate={{ opacity: 1, scale: 1, x: '-50%', y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: '-50%', y: 5 }}
                    style={{
                      position: 'absolute',
                      top: '45%',
                      left: '50%',
                      zIndex: 30,
                      width: 'max-content',
                      maxWidth: '90%',
                      background: '#FFF0F3',
                      border: '1px solid #FFCCD5',
                      borderRadius: 4,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 15px rgba(217, 4, 41, 0.12)',
                    }}
                  >
                    {/* Pink Exclamation Icon */}
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#FFA3B5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 13,
                      fontWeight: '800',
                      color: '#A80038'
                    }}>
                      !
                    </div>

                    {/* Red Text */}
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#A80038',
                      lineHeight: 1.2,
                      letterSpacing: -0.2,
                      whiteSpace: 'nowrap'
                    }}>
                      Exceeded order limit quantity!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Today's Earnings Section with Second Image template */}
              <div style={{
                position: 'absolute',
                top: '65.2%', left: '3.5%', right: '3.5%',
                zIndex: 15,
              }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  {/* Clean Transparent Template Image */}
                  <img src="/todays_earnings_card_template.png" alt="Today's Earnings"
                    style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} />

                  {/* Balance Value Overlay inside Box 1 */}
                  <div style={{
                    position: 'absolute', top: '44%', left: '3.6%', width: '37.5%', height: '14%',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    color: '#ffffff', fontWeight: '800', fontSize: 'clamp(14px, 4.5vw, 22px)',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    pointerEvents: 'none',
                  }}>
                    ${(profile?.balance ?? 8.28).toFixed(2)}
                  </div>

                  {/* Today's Task Commission Value Overlay inside Box 2 */}
                  <div style={{
                    position: 'absolute', top: '44%', left: '42.8%', width: '29.8%', height: '14%',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    color: '#3b82f6', fontWeight: '800', fontSize: 'clamp(13px, 4vw, 20px)',
                    pointerEvents: 'none',
                  }}>
                    ${(profile?.todayTaskEarnings ?? 3.52).toFixed(2)}
                  </div>

                  {/* Today's Tasks Count Overlay inside Box 3 */}
                  <div style={{
                    position: 'absolute', top: '44%', left: '74.0%', width: '22.5%', height: '14%',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    color: '#3b82f6', fontWeight: '800', fontSize: 'clamp(14px, 4.2vw, 20px)',
                    pointerEvents: 'none',
                  }}>
                    {profile?.tasksCompletedCount ?? 0}
                  </div>

                  {/* Task Description text lines overlay */}
                  <div style={{
                    position: 'absolute', top: '75.5%', left: '5.5%', right: '5.5%',
                    color: '#3b82f6', opacity: 0.95, fontSize: 'clamp(10px, 2.8vw, 13px)',
                    lineHeight: '1.45', fontWeight: '600',
                    pointerEvents: 'none',
                  }}>
                    <div>(1) Each position can receive {userTaskLimit} tasks per day.</div>
                    <div>(2) Commission of drive data is ({userCommissionRate} * item price).</div>
                  </div>
                </div>

                {/* Bottom Left Corner Zalando Logo below Task Description card */}
                <div style={{
                  position: 'absolute',
                  bottom: -44,
                  left: 6,
                  zIndex: 20,
                  pointerEvents: 'none'
                }}>
                  <img
                    src="/zalando_logo_white_text.png"
                    alt="Zalando Logo"
                    style={{
                      height: 54,
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
                    }}
                  />
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ PAGE 2: Intermediate with 1.7s Buffering Animation ══ */}
        <AnimatePresence>
          {flowState === 'page2' && (
            <motion.div key="page2"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              style={{ position: 'absolute', inset: 0, zIndex: 30, background: '#fff' }}>
              <img src="/daily_tasks_flow_page2.png" alt="Intermediate"
                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />

              {/* ── 1.7s Centered Buffering Animation Overlay ── */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '22px 28px',
                background: 'rgba(0, 0, 0, 0.78)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 18,
                boxShadow: '0 12px 35px rgba(0,0,0,0.35)',
                zIndex: 10,
              }}>
                {/* Rotating Orange Spinner */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.85, ease: 'linear' }}
                  style={{
                    width: 46,
                    height: 46,
                    border: '4px solid rgba(255, 255, 255, 0.2)',
                    borderTop: '4px solid #FF6900',
                    borderRight: '4px solid #FF6900',
                    borderRadius: '50%',
                  }}
                />
                <span style={{
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                }}>
                  Loading...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ PAGE 3: Dynamic Order Confirmation ══ */}
        <AnimatePresence>
          {flowState === 'page3' && page3Data && (
            <motion.div key="page3"
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "-apple-system, 'Helvetica Neue', Arial, sans-serif" }}>

              {/* ── Header with Zalando logo ── */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <button 
                    onClick={isCancelling ? undefined : handleCancel} 
                    disabled={isCancelling}
                    style={{ 
                      position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', 
                      background: 'none', border: 'none', 
                      cursor: isCancelling ? 'not-allowed' : 'pointer', 
                      padding: 0, fontSize: 28, color: '#1a1a1a', lineHeight: 1, fontWeight: 300,
                      opacity: isCancelling ? 0.3 : 1,
                      pointerEvents: isCancelling ? 'none' : 'auto',
                    }}>‹</button>
                  <img src="/zalando_logo.png" alt="zalando" style={{ height: 60, objectFit: 'contain' }} />
                </div>
                {/* Orange gradient bar */}
                <div style={{ height: 4, background: 'linear-gradient(90deg, #FF6900, #FFB800, #FF6900)', flexShrink: 0 }} />
              </div>

              {/* ── Scrollable Content ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 22px 10px' }}>

                <h2 style={{ fontSize: 22, fontWeight: 700, fontStyle: 'italic', margin: '0 0 6px 0', color: '#1a1a1a' }}>Your goods (1 items)</h2>
                <p style={{ fontSize: 14, color: '#888', margin: '0 0 18px 0', fontStyle: 'italic' }}>Shipped by ZALANDO</p>

                {/* Product Card */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 28, alignItems: 'flex-start' }}>
                  <img
                    src={page3Data.product.img}
                    alt={page3Data.product.name}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/handbag_final.png'; }}
                    style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 4, flexShrink: 0, background: '#f8f8f8', border: '1px solid #eee' }}
                  />
                  <div style={{ flex: 1, paddingTop: 8 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.5, margin: 0, color: '#1a1a1a' }}>{page3Data.product.name}</p>
                  </div>
                </div>

                {/* Divider + Total */}
                <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 18 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, fontStyle: 'italic', margin: '0 0 18px 0', color: '#1a1a1a' }}>Total</h3>

                  {/* Order Total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, color: '#1a1a1a' }}>Order Total</span>
                    <span style={{ fontSize: 16, color: '#1a1a1a', fontWeight: 500 }}>${page3Data.orderTotal.toFixed(2)}</span>
                  </div>

                  {/* Commission */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, color: '#FF6900', fontWeight: 700 }}>Commission</span>
                    <span style={{ fontSize: 16, color: '#FF6900', fontWeight: 700 }}>${page3Data.commission.toFixed(2)}</span>
                  </div>

                  {/* Expected revenue */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, color: '#1a1a1a' }}>Expected revenue</span>
                    <span style={{ fontSize: 16, color: '#1a1a1a', fontWeight: 500 }}>${(page3Data.orderTotal + page3Data.commission).toFixed(2)}</span>
                  </div>

                  {/* Order ID */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, gap: 12 }}>
                    <span style={{ fontSize: 15, color: '#1a1a1a', flexShrink: 0 }}>Order ID</span>
                    <span style={{ fontSize: 14, color: '#555', fontWeight: 400, textAlign: 'right', wordBreak: 'break-all' }}>{page3Data.orderId}</span>
                  </div>

                  {/* Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                    <span style={{ fontSize: 15, color: '#1a1a1a' }}>Time</span>
                    <span style={{ fontSize: 14, color: '#555', fontWeight: 400 }}>{page3Data.time}</span>
                  </div>

                  {/* Total (VAT included) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, fontStyle: 'italic', color: '#1a1a1a' }}>Total (VAT included)</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>${page3Data.orderTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* ── Buttons ── */}
              <div style={{ padding: '14px 22px 22px', display: 'flex', gap: 16, flexShrink: 0 }}>
                <button 
                  onClick={isCancelling ? undefined : handleCancel} 
                  disabled={isCancelling}
                  style={{ 
                    flex: 1, padding: '14px 0', 
                    background: isCancelling ? '#ccc' : '#FF6900', 
                    border: 'none', borderRadius: 6, color: '#fff', fontWeight: 700, fontSize: 17, 
                    cursor: isCancelling ? 'not-allowed' : 'pointer', 
                    letterSpacing: 0.3,
                    opacity: isCancelling ? 0.5 : 1,
                    pointerEvents: isCancelling ? 'none' : 'auto',
                    transition: 'all 0.15s ease',
                  }}
                >{isCancelling ? 'Please wait...' : 'Cancel'}</button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmittingRef.current}
                  style={{
                    flex: 1, padding: '14px 0',
                    background: isSubmittingRef.current ? '#ccc' : '#FF6900',
                    border: 'none', borderRadius: 6, color: '#fff',
                    fontWeight: 700, fontSize: 17,
                    cursor: isSubmittingRef.current ? 'not-allowed' : 'pointer',
                    letterSpacing: 0.3,
                    transition: 'background 0.2s',
                    opacity: isSubmittingRef.current ? 0.6 : 1,
                  }}
                >Submit</button>
              </div>

              {/* ── Green Success Toast Overlay (Even smaller) ── */}
              <AnimatePresence>
                {showSubmitSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    style={{
                      position: 'absolute',
                      top: '44%',
                      left: '18%',
                      right: '18%',
                      zIndex: 100,
                      background: '#E8FAF0',
                      border: '1px solid #28C745',
                      borderRadius: 12,
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 4px 14px rgba(40, 199, 69, 0.12)'
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 32 32" fill="none">
                      <circle cx="16" cy="16" r="14" stroke="#00A82D" strokeWidth="2.5" fill="none" />
                      <path d="M9.5 16.5L14 21L22.5 11.5" stroke="#00A82D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#00A82D', letterSpacing: -0.1 }}>
                      Submit successfully!
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ Last Task Completed Pop-up Modal ══ */}
        <AnimatePresence>
          {showAllResoldModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 200,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 20 }}
                style={{
                  width: '100%',
                  maxWidth: 330,
                  background: '#ffffff',
                  borderRadius: 20,
                  padding: '28px 22px 24px',
                  textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {/* Party / Resold Trophy Icon Badge */}
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6900, #FFA800)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  boxShadow: '0 8px 20px rgba(255, 105, 0, 0.4)',
                  marginBottom: 16,
                }}>
                  🎉
                </div>

                <h3 style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#1a1a1a',
                  margin: '0 0 10px 0',
                  lineHeight: 1.3,
                }}>
                  Order Shipped!
                </h3>

                <p style={{
                  fontSize: 15,
                  color: '#555',
                  lineHeight: 1.5,
                  margin: '0 0 22px 0',
                  fontWeight: 500,
                }}>
                  Your {userTaskLimit}-task order has been Shipped! Track its live delivery progress under Order Record → Z-Status.
                </p>

                <button
                  onClick={() => {
                    vibrateLight();
                    setShowAllResoldModal(false);
                    setFlowState('idle');
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 0',
                    background: 'linear-gradient(90deg, #FF6900, #FF8500)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 16,
                    cursor: 'pointer',
                    letterSpacing: 0.3,
                    boxShadow: '0 4px 14px rgba(255, 105, 0, 0.35)',
                  }}
                >
                  Got it
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}




