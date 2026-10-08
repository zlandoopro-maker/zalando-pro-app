import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Star, Loader2, CheckCircle } from 'lucide-react';
import { PositionTier, UserProfile } from '../types';
import { auth, db, handleFirestoreError, OperationType, parseUserProfile, runTransaction } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from '../lib/firebase';
import { playSuccessSound } from '../lib/audio';
import { TIERS } from '../lib/tiers';
import { TierBadge } from './TierBadge';
import { vibratePurchase, startHumming } from '../lib/haptics';
import { useNotification } from './NotificationProvider';

interface PlanDetailProps {
  planId: string;
  onBack: () => void;
  onDeposit: () => void;
  key?: string;
}

export default function PlanDetail({ planId, onBack, onDeposit }: PlanDetailProps) {
  const { showNotification } = useNotification();
  const plan = TIERS.find(t => t.id === planId) || TIERS[0];
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activating, setActivating] = useState(false);
  const [activationStep, setActivationStep] = useState<'idle' | 'processing' | 'success'>('idle');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      const docRef = doc(db, 'users', auth.currentUser.uid);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(parseUserProfile(docSnap.data()) as UserProfile);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser.uid}`);
      }
    };
    fetchProfile();
  }, []);

  const handleActivate = async () => {
    if (!profile) return;

    if (profile.balance < plan.price) {
      showNotification(`Insufficient balance to activate ${plan.name}. You need $${plan.price}. Redirecting to Deposit menu...`, { type: 'error', title: 'INSUFFICIENT' });
      onDeposit();
      return;
    }

    setActivating(true);
    setActivationStep('processing');
    const stopHumming = startHumming();

    try {
      if (auth.currentUser) {
        const referralDocId = auth.currentUser?.uid || null;

        const userRef = doc(db, 'users', auth.currentUser.uid);
        const transactionRef = doc(collection(db, 'transactions'));

        // Use a transaction for absolute atomicity
        await runTransaction(db, async (transaction) => {
          // --- READS MUST GO FIRST ---
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw new Error("User does not exist");
          const userData = userSnap.data() as UserProfile;

          let referralRef = null;
          let referralSnap = null;
          if (referralDocId) {
            referralRef = doc(db, 'referrals', referralDocId);
            referralSnap = await transaction.get(referralRef);
          }


          let l1Snap = null, l2Snap = null, l3Snap = null;
          let l1Ref = null, l2Ref = null, l3Ref = null;

          if (userData.referredBy) {
            l1Ref = doc(db, 'users', userData.referredBy);
            l1Snap = await transaction.get(l1Ref);

            if (l1Snap.exists()) {
              const l1Data = l1Snap.data();
              if (l1Data.referredBy) {
                l2Ref = doc(db, 'users', l1Data.referredBy);
                l2Snap = await transaction.get(l2Ref);

                if (l2Snap.exists()) {
                  const l2Data = l2Snap.data();
                  if (l2Data.referredBy) {
                    l3Ref = doc(db, 'users', l2Data.referredBy);
                    l3Snap = await transaction.get(l3Ref);
                  }
                }
              }
            }
          }

          // --- CHECKS ---
          const currentBalance = Number(userData.balance) || 0;
          if (currentBalance < plan.price) throw new Error("Insufficient balance");

          // --- WRITES ---
          // 1. Update User
          transaction.update(userRef, {
            balance: currentBalance - plan.price,
            currentPlan: plan.id,
            planPurchaseDate: new Date().toISOString(),
            planExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            tasksCompletedCount: 0,
            todayTaskEarnings: 0
          });

          // 2. Add Transaction
          transaction.set(transactionRef, {
            userId: auth.currentUser!.uid,
            type: 'plan_purchase',
            amount: plan.price,
            status: 'completed',
            timestamp: new Date().toISOString()
          });

          // 3. Handle MLM One-Time Activation Commission (L1: 10%, L2: 5%, L3: 2%)
          let totalCommissionEarned = 0;

          const distribute = (refSnap: any, refRef: any, percentage: number) => {
            if (refSnap && refSnap.exists() && refRef) {
              const commAmount = plan.price * percentage;
              const refData = refSnap.data() as UserProfile;

              transaction.update(refRef, {
                balance: (Number(refData.balance) || 0) + commAmount,
                totalEarnings: (Number(refData.totalEarnings) || 0) + commAmount,
                todayTeamEarnings: (Number(refData.todayTeamEarnings) || 0) + commAmount,
                updatedAt: new Date().toISOString()
              });

              const commTxRef = doc(collection(db, 'transactions'));
              transaction.set(commTxRef, {
                userId: refRef.id,
                type: 'commission',
                amount: commAmount,
                status: 'completed',
                timestamp: new Date().toISOString(),
                fromUser: auth.currentUser!.uid
              });

              if (percentage === 0.10) {
                totalCommissionEarned = commAmount; // For referral record
              }
            }
          };

          distribute(l1Snap, l1Ref, 0.10); // Level 1 (Direct Referrer)
          distribute(l2Snap, l2Ref, 0.05); // Level 2
          distribute(l3Snap, l3Ref, 0.02); // Level 3

          // 4. Update Referral Record atomically
          if (referralRef && referralSnap && referralSnap.exists()) {
            transaction.update(referralRef, {
              planType: plan.name,
              status: 'active',
              commissionEarned: totalCommissionEarned
            });
          }
        });
      }

      // Professional 5-second animation delay
      await new Promise(resolve => setTimeout(resolve, 4000));
      stopHumming();
      setActivationStep('success');
      playSuccessSound();
      vibratePurchase();
      await new Promise(resolve => setTimeout(resolve, 1500)); // Show success for 1.5s

      onBack();
    } catch (error: any) {
      stopHumming();
      console.error(error);
      const msg = error?.message || 'Unknown error';
      showNotification(`Failed to activate: ${msg}`, { type: 'error', title: 'FAILED' });
      setActivating(false);
      setActivationStep('idle');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ damping: 25, stiffness: 200 }}
      className="relative min-h-[100dvh] h-full w-full font-sans overflow-y-auto scroll-container transition-colors duration-300"
      style={{
        backgroundImage: `url(${plan.image || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop&q=80'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <AnimatePresence>
        {activating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-hidden"
          >
            {/* Professional Rich Background Backdrop */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-2xl transition-all duration-500" />

            {/* Colorful Accents */}
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#707ED8]/30 rounded-full animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#A1E3E8]/30 rounded-full animate-pulse" style={{ animationDuration: '5s' }} />
            <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-[#F18F2E]/20 rounded-full animate-pulse" style={{ animationDuration: '6s' }} />

            <div 
              className={`relative z-10 flex flex-col items-center justify-center w-full max-w-[320px] p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white dark:border-slate-800/50 overflow-hidden ${
                activationStep === 'success' 
                  ? 'bg-cover bg-center text-white' 
                  : 'bg-white/80 dark:bg-[#1C1E24]/80 backdrop-blur-md'
              }`}
              style={activationStep === 'success' ? { backgroundImage: 'url(/hologram.png)' } : {}}
            >
              {activationStep === 'success' && (
                <div className="absolute inset-0 bg-black/20" /> /* Dark overlay to make text readable */
              )}

              <div className="relative z-10 w-full flex flex-col items-center justify-center">
                {activationStep === 'processing' && (
                  <>
                    <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-[5px] border-slate-100 border-t-[#707ED8] rounded-full"
                      />
                      <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-3 border-[5px] border-slate-100 border-b-[#A1E3E8] rounded-full opacity-70"
                      />
                      <img src="/hologram.png" className="w-16 h-16 object-contain animate-pulse drop-shadow-md" alt="Logo" />
                    </div>

                    <motion.h3
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="text-2xl font-black italic text-slate-800 dark:text-white tracking-tight text-center"
                    >
                      Activating Plan
                    </motion.h3>

                    <motion.p
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-base font-bold text-slate-600 mt-2 text-center"
                    >
                      Configuring your workspace limits...
                    </motion.p>

                    <div className="w-full h-3 bg-slate-200/80 rounded-full mt-8 overflow-hidden relative shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 4, ease: "easeInOut" }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#A1E3E8] to-[#707ED8]"
                      />
                    </div>
                  </>
                )}

                {activationStep === 'success' && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center py-4"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                      className="w-28 h-28 bg-[#26A17B] rounded-full flex items-center justify-center shadow-xl shadow-black/30 mb-6 border-4 border-white/50"
                    >
                      <CheckCircle className="w-14 h-14 text-white" strokeWidth={3} />
                    </motion.div>
                    <h3 className="text-3xl font-black italic text-white drop-shadow-md tracking-tight text-center">
                      Success!
                    </h3>
                    <p className="text-lg font-bold text-white/90 mt-2 drop-shadow-sm text-center">
                      Plan is now active
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Light overlay for readability */}
      <div className="absolute inset-0 z-0 bg-white/35 dark:bg-[#0B0C10]/45 pointer-events-none"></div>

      {/* Decorative Top Right Ring/Circle */}
      <div className="absolute -top-12 -right-8 w-52 h-52 rounded-full border-[18px] border-[#707ED8] opacity-85 z-0 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col h-full p-4 sm:p-6 pb-6 font-['Inter',sans-serif]">

        {/* Back Button */}
        <button onClick={onBack} className="text-[#707ED8] mt-2 mb-2 -ml-2 p-2 active:bg-blue-50/50 rounded-full w-fit">
          <ChevronLeft className="w-8 h-8 font-black" strokeWidth={3} />
        </button>

        {/* Header Section: Title & Price */}
        <div className="flex justify-between items-start mt-2">
          <div className="max-w-[70%]">
            <h1 className={`text-3xl font-black italic tracking-tight leading-tight ${plan.id === 'reg_gen'
              ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-sm'
              : 'text-[#707ED8]'
              }`}>
              {plan.name} {plan.id === 'reg_gen' && '👑'}
            </h1>
            <div className="flex items-center gap-2 mt-3 text-[#F18F2E]">
              {/* 3D Gold Coin Icon */}
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E6A100] via-[#FFD700] to-[#FFF5A0] border-2 border-white shadow-md flex items-center justify-center font-black text-[10px] text-amber-900 flex-shrink-0">
                $
              </div>
              <span className="text-2xl sm:text-3xl font-black italic tracking-tight pt-0.5">${plan.price}</span>
            </div>
          </div>

          <div className={`mt-2 -mr-1 ${plan.id === 'reg_gen' ? 'animate-crown-sparkle drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]' : ''}`}>
            <TierBadge tierId={plan.id} className="w-28 h-28" mode="color" />
          </div>
        </div>

        {/* Content Details: Info Block */}
        <motion.div
          className="mt-6 space-y-3 relative w-full pr-4 pl-2 bg-white/15 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
              }
            }
          }}
        >
          {/* Decorative Dot in center bg */}
          <div className="absolute left-1/2 top-1/2 -mt-4 w-6 h-6 rounded-full bg-slate-400 opacity-20 pointer-events-none"></div>

          <motion.h2
            variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
            className="text-lg font-black italic text-white dark:text-slate-100 tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
          >
            {plan.name}
          </motion.h2>

          <motion.div
            variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
            className="flex gap-1 mb-4"
          >
            {Array.from({ length: plan.stars }).map((_, i) => (
              <Star key={i} className="w-4 h-4 text-[#FDBB2A] fill-[#FDBB2A]" />
            ))}
          </motion.div>

          {[
            { label: 'Commission Rate', value: plan.commissionRate },
            { label: 'Task Count', value: plan.dailyTasks },
            { label: 'Activation Amount', value: `$${plan.price}` }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="flex justify-between items-center py-2.5 border-b border-white/20 dark:border-slate-700/40"
            >
              <span className="text-sm font-black italic text-white dark:text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{item.label}</span>
              <span className="text-xl font-black italic text-white tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]">{item.value}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Section: Application Tips & Activation Button */}
        <div className="mt-auto relative w-full pt-4">
          <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm shadow-lg rounded-tr-3xl rounded-br-sm rounded-tl-sm rounded-bl-3xl pl-8 p-5 border border-white/25 dark:border-slate-700/40 transform -skew-x-[1deg] z-10 relative overflow-hidden">
            {/* Zalando Watermark */}
            <div
              className="absolute left-1 bottom-2 -rotate-90 origin-left font-black text-2xl tracking-widest pointer-events-none select-none animate-hologram"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='12'%3E%3Ctext x='0' y='9' font-size='7' font-weight='900' fill='rgba(0,0,0,0.25)' font-family='sans-serif'%3EZALANDO%3C/text%3E%3C/svg%3E"), linear-gradient(to right, #FF007F, #00F0FF, #FFD700, #FF007F)`,
                backgroundSize: '60px 12px, 200% auto',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                backgroundClip: 'text'
              }}
            >
              zalando pro
            </div>

            <h3 className="italic font-black text-white dark:text-slate-200 text-sm mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Application Tips</h3>
            <p className="text-[12px] text-white/90 dark:text-slate-300 font-bold italic leading-relaxed max-w-[75%] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
              You have to activate this position before getting any task orders. Click 'Activate' below to start earning! *Per activation is valid for 90 days.
            </p>
          </div>

          <div className="flex justify-end mt-3 z-20">
            <button
              onClick={handleActivate}
              disabled={activating}
              style={
                plan.id === 'reg_gen'
                  ? {
                    background: 'linear-gradient(135deg, #FFF59D 0%, #FFD54F 25%, #FFB300 65%, #FF6F00 100%)',
                    color: '#211000',
                    boxShadow: '0 6px 28px rgba(255, 179, 0, 0.75), 0 0 18px rgba(255, 215, 0, 0.5)',
                    border: '2px solid #FFE082',
                  }
                  : plan.id === 'reg_vp'
                    ? {
                      background: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 50%, #A855F7 100%)',
                      color: '#FFFFFF',
                      boxShadow: '0 6px 28px rgba(139, 92, 246, 0.75), 0 0 18px rgba(167, 139, 250, 0.5)',
                      border: '2px solid #C4B5FD',
                    }
                    : { backgroundColor: '#707ED8', color: '#FFFFFF' }
              }
              className={`relative overflow-hidden px-8 py-3.5 rounded-2xl font-black tracking-wide text-lg active:scale-95 transition-all flex items-center justify-center min-w-[175px] disabled:opacity-70 disabled:active:scale-100 ${plan.id === 'reg_gen'
                ? 'animate-gold-glow-pulse shadow-2xl'
                : plan.id === 'reg_vp'
                  ? 'animate-diamond-glow-pulse shadow-2xl'
                  : 'shadow-lg shadow-[#707ED8]/30'
                }`}
            >
              {/* Continuous Light Beam Shimmer Sweep inside button */}
              {(plan.id === 'reg_gen' || plan.id === 'reg_vp') && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-0">
                  <div className={`w-1/2 h-full bg-gradient-to-r from-transparent via-white/${plan.id === 'reg_vp' ? '80' : '90'} to-transparent transform -skew-x-12 animate-shimmer-sweep`} />
                </div>
              )}

              {/* Repeating Tiny Zalando Hologram Pattern Overlay */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl z-0 animate-hologram opacity-50 select-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='52' height='22'%3E%3Ctext x='2' y='10' font-size='5.5' font-weight='900' fill='%23ffffff' font-family='sans-serif' letter-spacing='0.5' opacity='0.95'%3EZALANDO%3C/text%3E%3Ctext x='28' y='20' font-size='5.5' font-weight='900' fill='%23ffffff' font-family='sans-serif' letter-spacing='0.5' opacity='0.95'%3EZALANDO%3C/text%3E%3C/svg%3E"), linear-gradient(135deg, #FF007F 0%, #00F0FF 33%, #FFD700 66%, #FF007F 100%)`,
                  backgroundSize: '52px 22px, 200% 200%',
                  backgroundRepeat: 'repeat, no-repeat',
                }}
              />

              <span className={`relative z-10 flex items-center gap-1.5 font-black tracking-wide text-base sm:text-lg drop-shadow-sm ${plan.id === 'reg_gen' ? 'text-amber-950' : plan.id === 'reg_vp' ? 'text-slate-900' : 'text-white'}`}>
                {activating ? (
                  <Loader2 className={`w-6 h-6 animate-spin ${plan.id === 'reg_gen' ? 'text-amber-950' : plan.id === 'reg_vp' ? 'text-slate-900' : 'text-white'}`} />
                ) : plan.id === 'reg_gen' ? (
                  <>
                    <span className="text-xl animate-bounce">👑</span> ACTIVATE VIP
                  </>
                ) : plan.id === 'reg_vp' ? (
                  <>
                    <span className="text-xl animate-diamond-sparkle inline-block">💎</span> ACTIVATE DIAMOND
                  </>
                ) : (
                  'Activation'
                )}
              </span>
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
