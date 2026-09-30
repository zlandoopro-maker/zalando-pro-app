import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, doc, onSnapshot, updateDoc, increment } from '../lib/firebase';
import { useNotification } from './NotificationProvider';
import { vibrateLight, vibrateSuccess } from '../lib/haptics';
import { playGlassSound } from '../lib/audio';


// ─────────────────────────────────────────────────────────────────────────────
// DailyTasks
// ─────────────────────────────────────────────────────────────────────────────
interface DailyTasksProps {
  onBack: () => void;
  onUnlockPro: () => void;
  key?: string;
}

export default function DailyTasks({ onBack }: DailyTasksProps) {
  const { showNotification } = useNotification();
  const [profile, setProfile] = useState<any>(null);
  const [flowState, setFlowState] = useState<'idle' | 'spinning' | 'page2' | 'page3'>('idle');

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (s) => {
      if (s.exists()) setProfile(s.data());
    });
    return () => unsub();
  }, []);

  const handleSlotTap = () => {
    if (flowState !== 'idle') return;

    vibrateLight();
    setFlowState('spinning');

    // Total spin time: 18 frames × avg 160ms gap + max startDelay (200ms) ≈ 3080ms
    // Add 300ms settle buffer → 3380ms
    setTimeout(() => {
      vibrateSuccess();
      playGlassSound();
      setFlowState('page2');
      setTimeout(() => setFlowState('page3'), 1000);
    }, 3400);
  };

  const handleCancel = () => {
    vibrateLight();
    setFlowState('idle');
  };

  const handleSubmit = async () => {
    if (!auth.currentUser || !profile) return;
    if (profile.tasksCompletedCount >= 30) {
      showNotification('Daily task limit reached!', { type: 'error' });
      setFlowState('idle');
      return;
    }
    vibrateSuccess();
    playGlassSound();
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        tasksCompletedCount: increment(1),
        balance: increment(0.11),
        todayTaskEarnings: increment(0.11),
      });
      showNotification('Task completed successfully!', { type: 'success' });
    } catch (e) {
      showNotification('Failed to submit task', { type: 'error' });
    }
    setFlowState('idle');
  };

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

        {/* ══ PAGE 1: Original UI + spinning slot reels over yellow boxes ══ */}
        <AnimatePresence>
          {(flowState === 'idle' || flowState === 'spinning') && (
            <motion.div key="page1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0 }}>

              {/* Original background — 100% full view with zero top/bottom cropping */}
              <img src="/daily_task_ref_empty.png" alt="Daily Tasks UI"
                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />

              {/* Back button */}
              <button onClick={onBack}
                style={{
                  position: 'absolute', top: 20, left: 10, width: 60, height: 60,
                  background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 20
                }}
                aria-label="Go Back" />

              {/* Clickable area, pure yellow mask, and precisely placed solid product images */}
              {[
                { left: '12.24%', top: '49.09%', width: '23.37%', height: '9.88%', src: '/lipstick_final.png' },
                { left: '38.53%', top: '49.09%', width: '23.23%', height: '9.88%', src: '/handbag_final.png' },
                { left: '64.67%', top: '49.09%', width: '23.09%', height: '9.88%', src: '/watch_final.png' }
              ].map((slot, i) => (
                  <div key={i} onClick={handleSlotTap}
                  style={{
                    position: 'absolute',
                    left: slot.left, top: slot.top, width: slot.width, height: slot.height,
                    backgroundColor: '#febf06',
                    borderRadius: '8%',
                    zIndex: 10, cursor: 'pointer',
                  }}>
                  <div style={{
                    width: '100%', height: '100%',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <motion.div
                      animate={flowState === 'spinning' ? { y: ['-100%', '100%'] } : { y: '0%' }}
                      transition={
                        flowState === 'spinning'
                          ? { duration: 0.15, repeat: Infinity, ease: 'linear' }
                          : { duration: 0.5, type: 'spring', bounce: 0.4 }
                      }
                      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <img src={slot.src} alt={`Slot product ${i}`}
                        style={{
                          width: '85%',
                          height: '85%',
                          objectFit: 'contain',
                          display: 'block',
                          opacity: 1, // Explicitly guarantee 100% opacity
                          transform: i === 0 ? 'scale(2.0)' : i === 2 ? 'scale(1.3)' : 'none'
                        }}
                      />
                    </motion.div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ PAGE 2: Intermediate ══ */}
        <AnimatePresence>
          {flowState === 'page2' && (
            <motion.div key="page2"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              style={{ position: 'absolute', inset: 0, zIndex: 30, background: '#fff' }}>
              <img src="/daily_tasks_flow_page2.png" alt="Intermediate"
                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ PAGE 3: Confirmation ══ */}
        <AnimatePresence>
          {flowState === 'page3' && (
            <motion.div key="page3"
              initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
              style={{ position: 'absolute', inset: 0, zIndex: 40, background: '#fff' }}>
              <img src="/daily_tasks_flow_page3.png" alt="Confirmation"
                style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />
              <div onClick={handleCancel}
                style={{ position: 'absolute', bottom: '1%', left: '5%', width: '42%', height: '8%', cursor: 'pointer', zIndex: 50 }} />
              <div onClick={handleSubmit}
                style={{ position: 'absolute', bottom: '1%', right: '5%', width: '42%', height: '8%', cursor: 'pointer', zIndex: 50 }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
