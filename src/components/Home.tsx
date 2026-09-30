import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Info, Users, BarChart3, Star, ChevronLeft, ChevronRight, Lock, Headset, Globe, Shirt, ShoppingBag, TrendingUp, ArrowRight, X, Wallet } from 'lucide-react';
import { PositionTier, Screen, UserProfile } from '../types';
import { auth, db, handleFirestoreError, OperationType, parseUserProfile } from '../lib/firebase';
import { doc, onSnapshot } from '../lib/firebase';
import { registerPushNotifications, requestNotificationPermission, showLocalNotification } from '../lib/notificationSystem';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import LanguageSelector from './LanguageSelector';
import { TIERS } from '../lib/tiers';
import { TierBadge } from './TierBadge';
import { vibrateLight, vibrateSuccess } from '../lib/haptics';
import { playGlassSound } from '../lib/audio';

interface HomeProps {
  onEnterTask: () => void;
  onNavigate: (screen: Screen) => void;
  onViewPlan?: (planId: string) => void;
  key?: string;
}

/* CSS Marquee for better performance on mobile */
const marqueeStyle = {
  display: 'inline-block',
  paddingLeft: '100%',
  animation: 'marquee 25s linear infinite',
  willChange: 'transform',
};

const marqueeKeyframes = `
@keyframes marquee {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-100%, 0); }
}
`;

export default function Home({ onEnterTask, onNavigate, onViewPlan }: HomeProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [announcement, setAnnouncement] = useState('Partner brands are making record profits today...');
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070&auto=format&fit=crop');
  const [connected, setConnected] = useState(true);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  
  // Banner Slideshow state - All 7 uploaded Zalando photos
  const bannerList = [
    '/banner1.png',
    '/banner2.png',
    '/banner3.png',
    '/banner4.png',
    '/banner5.png',
    '/banner6.png',
    '/banner7.png'
  ];
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Preload all 7 banner images for instantaneous sliding
  useEffect(() => {
    bannerList.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % bannerList.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [bannerList.length]);

  // Hold & Preview state for tier cards
  const [previewTier, setPreviewTier] = useState<PositionTier | null>(null);
  const [activeStepDetail, setActiveStepDetail] = useState<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const handlePressStart = (tier: PositionTier) => {
    isLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      vibrateSuccess();
      playGlassSound();
      setPreviewTier(tier);
    }, 450); // 450ms hold
  };

  const handlePressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    // Check if we should show notification prompt
    const checkNotification = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const dismissed = localStorage.getItem('notification_prompt_dismissed');
        if (!dismissed) {
          setTimeout(() => setShowNotificationPrompt(true), 3000);
        }
      }
    };
    checkNotification();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to user profile
    const unsubProfile = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc: any) => {
      if (doc.exists()) {
        setProfile(parseUserProfile(doc.data()) as UserProfile);
        setConnected(true);
      }
    }, (error: unknown) => {
      console.error("Home Snapshot Error:", error);
      setConnected(false);
    });

    // Listen to global settings for announcement and banner
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.announcement) setAnnouncement(data.announcement);
        if (data.bannerUrl) setBannerUrl(data.bannerUrl);
      }
    });

    return () => {
      unsubProfile();
      unsubSettings();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full min-h-full bg-[#F8F9FD] dark:bg-[#0B0C10] pb-[calc(8rem+env(safe-area-inset-bottom,0px))] transition-colors duration-300 flex flex-col shrink-0"
    >
      {!connected && (
        <div className="safe-top bg-red-500 text-white text-[10px] py-1 px-4 text-center sticky top-0 z-[60]">
          {t('database_issue')}
        </div>
      )}
      {/* Header with Notification/Language */}
      <div className="safe-top flex items-center justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top,0px))] bg-white/90 dark:bg-[#15171B]/90 backdrop-blur-xl sticky top-0 z-[50] border-b border-slate-100 dark:border-slate-800/50 shadow-sm transition-all duration-300">
        <button
          onClick={() => { vibrateLight(); onNavigate('help-chat'); }}
          className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-all active:scale-95 shadow-inner"
        >
          <Headset className="w-6 h-6 text-primary" />
        </button>
        <div className="flex-1 mx-4 bg-slate-100 dark:bg-[#1C1E24] h-12 px-4 rounded-2xl flex items-center gap-2 overflow-hidden border border-slate-200 dark:border-slate-800/30 relative">
          <div className="bg-primary/10 dark:bg-primary/20 p-1.5 rounded-full flex items-center justify-center z-10">
            <BookOpen className="w-3 h-3 text-primary dark:text-[#A1E3E8]" />
          </div>

          <div className="flex-1 h-full flex items-center relative overflow-hidden">
            <style>{marqueeKeyframes}</style>
            <div style={marqueeStyle}>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-tight whitespace-nowrap">
                {announcement}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => { vibrateLight(); onNavigate('language-selection'); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-[#1C1E24] hover:bg-slate-100 dark:hover:bg-[#252830] border-2 border-slate-200 dark:border-slate-800/50 rounded-2xl shadow-sm transition-all active:scale-95"
        >
          <Globe className="w-5 h-5 text-primary dark:text-[#A1E3E8]" />
          <span className="text-sm font-black text-slate-800 dark:text-white uppercase">
            {i18n.language?.split('-')[0].toUpperCase() || 'EN'}
          </span>
        </button>
      </div>

      {/* Hero Banner Slideshow */}
      <section className="px-6 mt-2 [perspective:1000px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateX: 15 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          whileHover={{
            scale: 1.01,
            boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.4)"
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative w-full aspect-[2.1/1] rounded-[32px] overflow-hidden shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)] border border-white/20 dark:border-slate-800/50 group bg-slate-900"
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.img
              key={currentSlideIndex}
              initial={{ x: '100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
              src={bannerList[currentSlideIndex]}
              alt={`Partner Banner ${currentSlideIndex + 1}`}
              className="w-full h-full object-cover absolute inset-0"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = bannerUrl;
              }}
            />
          </AnimatePresence>

          {/* Navigation Arrows */}
          <button
            onClick={() => {
              vibrateLight();
              setCurrentSlideIndex((prev) => (prev - 1 + bannerList.length) % bannerList.length);
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-80 hover:opacity-100 active:scale-90 transition-all"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              vibrateLight();
              setCurrentSlideIndex((prev) => (prev + 1) % bannerList.length);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-80 hover:opacity-100 active:scale-90 transition-all"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Bottom Controls Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-5 pointer-events-none z-10">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 pointer-events-auto"
            >
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-white font-black italic uppercase tracking-widest text-[9px] drop-shadow-sm">{t('life_classics')}</span>
            </motion.div>

            {/* Slide Indicators (Clean dots without black bar background) */}
            <div className="flex items-center gap-1.5 pointer-events-auto drop-shadow-md">
              {bannerList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { vibrateLight(); setCurrentSlideIndex(idx); }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlideIndex
                      ? 'w-5 bg-white shadow-sm'
                      : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* 3D Glass Reflection Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-30 transition-opacity duration-700 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full rotate-12 transform"></div>
        </motion.div>
      </section>

      {/* Feature Menu */}
      <nav className="flex items-start justify-between px-2 py-8 bg-white dark:bg-[#15171B] border-b border-slate-100 dark:border-slate-800/50 transition-colors duration-300">
        {[
          { icon: <img src="/icons/tutorial.png" className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm" alt="Tutorial" />, label: t('tutorial'), onClick: () => onNavigate('app-tutorial'), noBox: true },
          { icon: <img src="/icons/intro.png" className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm" alt="Intro" />, label: t('intro'), onClick: () => onNavigate('app-intro'), noBox: true },
          { icon: <img src="/icons/team.png" className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm scale-[1.2]" alt="Team" />, label: t('team_mechanism'), onClick: () => onNavigate('team-mechanism'), noBox: true },
          { icon: <img src="/icons/commission.png" className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm scale-[1.2]" alt="Commission" />, label: t('commission_rate'), onClick: () => onNavigate('commission-rates'), noBox: true },
        ].map((item: any, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center gap-2 cursor-pointer w-1/4"
            onClick={() => item.onClick?.()}
          >
            {item.noBox ? (
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-colors">
                {item.icon}
              </div>
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-50 dark:bg-[#1C1E24] flex items-center justify-center shadow-inner dark:shadow-none border border-slate-100 dark:border-slate-800/50 transition-colors">
                {item.icon}
              </div>
            )}
            <span className="text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-400 font-bold text-center whitespace-nowrap tracking-tighter transition-colors">{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Position Tier Section */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter transition-colors">{t('position_tier')}</h2>
          <span className="text-[10px] font-bold text-primary dark:text-[#A1E3E8] bg-primary/10 dark:bg-primary/20 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
            <img src="/logo.png" className="w-3.5 h-3.5 object-contain" alt="Zalando Pro Logo" /> Hold card to preview model
          </span>
        </div>

        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {TIERS.map((tier) => {
            const isActivePlan = profile?.currentPlan === tier.id;
            const isComingSoon = tier.status === 'locked';

            return (
              <motion.div
                key={tier.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onMouseDown={() => handlePressStart(tier)}
                onMouseUp={handlePressEnd}
                onMouseLeave={handlePressEnd}
                onTouchStart={() => handlePressStart(tier)}
                onTouchEnd={handlePressEnd}
                onTouchCancel={handlePressEnd}
                onClick={(e) => {
                  if (isLongPressRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    isLongPressRef.current = false;
                    return;
                  }
                  vibrateLight();
                  if (isComingSoon) {
                    onNavigate('coming-soon');
                  } else if (isActivePlan) {
                    onEnterTask();
                  } else if (onViewPlan) {
                    onViewPlan(tier.id);
                  }
                }}
                className={`relative h-32 rounded-[1.5rem] bg-white dark:bg-[#15171B] overflow-hidden flex transition-all duration-300 cursor-pointer ${
                  tier.id === 'reg_gen'
                    ? 'border-2 border-amber-400 dark:border-yellow-400/90 animate-gold-glow-pulse shadow-[0_0_25px_rgba(250,204,21,0.4)]'
                    : tier.id === 'reg_vp'
                    ? 'border-2 border-violet-400 dark:border-violet-400/80 animate-diamond-glow-pulse shadow-[0_0_25px_rgba(139,92,246,0.5)]'
                    : 'border-[1.5px] border-indigo-100/60 dark:border-slate-800/50 shadow-[0_4px_20px_rgba(139,134,223,0.15)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]'
                } ${isActivePlan ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-[#0B0D14]' : 'hover:-translate-y-1'}`}
              >
                {/* Continuous Gold Shimmer Ray Sweep for Regional General Manager */}
                {tier.id === 'reg_gen' && (
                  <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[1.5rem]">
                    <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-amber-200/60 dark:via-yellow-300/50 via-white/90 to-transparent transform -skew-x-12 animate-shimmer-sweep" />
                  </div>
                )}

                {/* Diamond Shimmer Ray Sweep for Regional Vice President */}
                {tier.id === 'reg_vp' && (
                  <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-[1.5rem]">
                    <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-violet-300/50 to-transparent transform -skew-x-12 animate-shimmer-sweep" style={{ animationDuration: '2.5s' }} />
                  </div>
                )}

                {/* Background Image / Overlay */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                  <img
                    src={tier.image}
                    className="w-full h-full object-cover opacity-90 saturate-[1.8] contrast-[1.15] brightness-105 transition-all duration-500 scale-105 group-hover:scale-110"
                    alt=""
                  />
                  <div className={`absolute inset-0 ${tier.id === 'senior'
                      ? 'bg-gradient-to-r from-amber-50/95 via-amber-50/75 to-amber-50/30 dark:from-[#15171B]/95 dark:via-amber-950/75 dark:to-amber-950/30'
                      : tier.id === 'regional'
                        ? 'bg-gradient-to-r from-indigo-50/95 via-indigo-50/75 to-indigo-50/30 dark:from-[#15171B]/95 dark:via-indigo-950/75 dark:to-indigo-950/30'
                        : tier.id === 'reg_gen'
                          ? 'bg-gradient-to-r from-amber-50/95 via-amber-100/70 to-blue-950/20 dark:from-[#15171B]/95 dark:via-amber-950/75 dark:to-amber-900/30'
                          : tier.id === 'reg_vp'
                            ? 'bg-gradient-to-r from-violet-50/95 via-purple-100/70 to-violet-200/20 dark:from-[#15171B]/95 dark:via-violet-950/75 dark:to-purple-900/30'
                          : 'bg-gradient-to-r from-white/95 via-white/75 to-white/30 dark:from-[#15171B]/95 dark:via-[#15171B]/75 dark:to-[#15171B]/30'
                    }`}></div>
                </div>

                <div className="relative z-10 flex w-full h-full items-center p-4 gap-4">
                  {/* Left: Badge/Icon */}
                  <motion.div
                    className={`w-20 shrink-0 flex items-center justify-center ${tier.id === 'reg_gen' ? 'animate-crown-sparkle' : tier.id === 'reg_vp' ? 'animate-diamond-sparkle' : ''}`}
                    animate={{ rotate: isActivePlan ? [0, -5, 5, -5, 0] : 0 }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  >
                    <TierBadge tierId={tier.id} className="w-20 h-20" mode={isActivePlan ? "color" : "silver"} />
                  </motion.div>

                  {/* Right: Info */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <h3 className={`text-lg font-black italic leading-tight transition-colors ${
                        tier.id === 'reg_gen'
                          ? 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 dark:from-yellow-300 dark:via-amber-200 dark:to-yellow-400 bg-clip-text text-transparent drop-shadow-sm'
                          : tier.id === 'reg_vp'
                          ? 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 dark:from-violet-300 dark:via-fuchsia-300 dark:to-pink-300 bg-clip-text text-transparent drop-shadow-sm'
                          : 'text-slate-800 dark:text-white'
                      }`}>
                        {tier.name}
                      </h3>
                      {tier.id === 'reg_gen' && (
                        <span className="text-xs animate-bounce">👑</span>
                      )}
                      {tier.id === 'reg_vp' && (
                        <span className="text-xs animate-diamond-sparkle inline-block">💎</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 italic">{t('daily_tasks')}</span>
                      <span className="text-sm">⏳</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">{tier.dailyTasks}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${
                            tier.id === 'reg_gen'
                              ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)]'
                              : 'text-yellow-400 dark:text-yellow-500 fill-yellow-400 dark:fill-yellow-500'
                          }`} />
                        ))}
                      </div>

                      {tier.buttonText ? (
                        <div className="flex items-center justify-center px-4 py-1.5 rounded-2xl text-xs font-bold shadow-xs transition-all active:scale-95 min-w-[90px] bg-slate-400/35 dark:bg-slate-700/50 backdrop-blur-md text-slate-800 dark:text-slate-100 border border-white/40 dark:border-slate-600/40">
                          {tier.buttonText}
                        </div>
                      ) : !isComingSoon ? (
                        <div className={`flex items-center justify-center px-4 py-1.5 rounded-2xl text-xs font-bold shadow-sm transition-all active:scale-95 min-w-[76px] ${
                          tier.id === 'reg_gen'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-amber-500/30'
                            : tier.id === 'reg_vp'
                            ? 'bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white font-black shadow-fuchsia-500/40'
                            : isActivePlan
                            ? 'bg-[#4A69BD] text-white shadow-primary/20'
                            : 'bg-white dark:bg-[#1C1E24] text-[#4A69BD] border border-[#4A69BD]/30 shadow-md'
                          }`}>
                          {isActivePlan ? t('enter') : t('apply')}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center px-4 py-1.5 rounded-2xl text-xs font-bold shadow-xs transition-all active:scale-95 min-w-[90px] bg-slate-400/35 dark:bg-slate-700/50 backdrop-blur-md text-slate-800 dark:text-slate-100 border border-white/40 dark:border-slate-600/40">
                          Coming Soon
                        </div>
                      )}
                    </div>
                  </div>

                  {tier.id === 'reg_gen' && !isActivePlan && (
                    <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-[10px] font-black tracking-wider text-slate-950 shadow-md border border-yellow-200/80 flex items-center gap-1 animate-pulse">
                      <span>👑</span> TOP VIP
                    </div>
                  )}

                  {tier.id === 'reg_vp' && !isActivePlan && (
                    <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 via-purple-400 to-violet-600 text-[10px] font-black tracking-wider text-white shadow-md border border-violet-300/80 flex items-center gap-1 animate-pulse">
                      <span>💎</span> DIAMOND VP
                    </div>
                  )}

                  {isActivePlan && (
                    <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-green-500 dark:bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Business Model Hold & Preview Modal */}
      {createPortal(
        <AnimatePresence>
          {previewTier && (
            <div
              className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 dark:bg-black/60 transition-all duration-300"
              onClick={() => {
                playGlassSound();
                setPreviewTier(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.92 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/45 dark:bg-[#151722]/50 backdrop-blur-lg w-full max-w-md rounded-t-[2.2rem] sm:rounded-[2.2rem] p-4 sm:p-5 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/80 dark:border-white/20 relative max-h-[85vh] overflow-y-auto scroll-container group/modal"
              >
                {/* Liquid Ambient Backlight Glow */}
                <div className="absolute top-0 left-1/4 w-48 h-32 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-cyan-400/15 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

                {/* Glossy Specular Glass Highlight Line */}
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 dark:via-white/50 to-transparent pointer-events-none" />

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between mb-3 pb-2.5 border-b border-slate-900/10 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-md flex items-center justify-center p-1.5 shadow-inner border border-white/80 dark:border-white/15 shrink-0">
                      <TierBadge tierId={previewTier.id} className="w-8 h-8 drop-shadow-sm" mode="color" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase text-[#4A69BD] dark:text-[#A1E3E8] tracking-widest bg-[#4A69BD]/15 dark:bg-[#4A69BD]/30 backdrop-blur-md px-1.5 py-0.5 rounded border border-[#4A69BD]/30">
                          Hold Preview
                        </span>
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300">
                          {previewTier.commissionRate} Rate
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white italic tracking-tight">{previewTier.name}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      playGlassSound();
                      setPreviewTier(null);
                    }}
                    className="p-1.5 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white/70 dark:bg-white/10 backdrop-blur-md hover:bg-white/90 dark:hover:bg-white/20 border border-white/80 dark:border-white/10 rounded-full transition-all active:scale-90"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Business Model Flow Card (Transparent Glass Container) */}
                <div className="relative z-10 bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/70 dark:border-white/10 shadow-xs mb-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <img src="/logo.png" className="w-4 h-4 object-contain drop-shadow-xs" alt="Zalando Pro Logo" />
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      How Your Capital Generates Income
                    </h4>
                  </div>

                  <div className="space-y-1.5">
                    {/* Step 1 */}
                    <div
                      onClick={() => { playGlassSound(); vibrateLight(); setActiveStepDetail(1); }}
                      className="flex items-start gap-2.5 bg-white/70 dark:bg-[#1E222D]/60 backdrop-blur-md p-2 px-2.5 rounded-xl border border-white/80 dark:border-white/10 shadow-2xs hover:border-amber-400/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0 font-black text-[10px]">
                        1
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <Shirt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">{previewTier?.flowSteps?.step1.title || 'Clothing & Fashion Sourcing'}</span>
                        </div>
                        <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-snug font-bold">
                          {previewTier?.flowSteps?.step1.desc || 'Capital is deployed to procure high-demand European fashion bulk inventory.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div
                      onClick={() => { playGlassSound(); vibrateLight(); setActiveStepDetail(2); }}
                      className="flex items-start gap-2.5 bg-white/70 dark:bg-[#1E222D]/60 backdrop-blur-md p-2 px-2.5 rounded-xl border border-white/80 dark:border-white/10 shadow-2xs hover:border-blue-400/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center justify-center shrink-0 font-black text-[10px]">
                        2
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">{previewTier?.flowSteps?.step2.title || 'Global E-Commerce Reselling'}</span>
                        </div>
                        <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-snug font-bold">
                          {previewTier?.flowSteps?.step2.desc || 'Merchandise is resold across retail networks at high profit margins.'}
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div
                      onClick={() => { playGlassSound(); vibrateLight(); setActiveStepDetail(3); }}
                      className="flex items-start gap-2.5 bg-white/70 dark:bg-[#1E222D]/60 backdrop-blur-md p-2 px-2.5 rounded-xl border border-white/80 dark:border-white/10 shadow-2xs hover:border-emerald-400/40 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0 font-black text-[10px]">
                        3
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 mb-0.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-[11px] font-black text-slate-900 dark:text-white leading-none">{previewTier?.flowSteps?.step3.title || 'Daily Guaranteed Commission'}</span>
                        </div>
                        <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-snug font-bold">
                          {previewTier?.flowSteps?.step3.desc || 'Guaranteed resale commissions are credited directly to your wallet daily.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tier Stats Grid (Frosted Glass Cards) */}
                <div className="relative z-10 grid grid-cols-2 gap-2 mb-3.5">
                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md p-2.5 px-3 rounded-xl border border-white/70 dark:border-white/10 shadow-2xs">
                    <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider block mb-0.5">Required Deposit</span>
                    <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">${previewTier.price}</span>
                  </div>

                  <div className="bg-white/50 dark:bg-white/5 backdrop-blur-md p-2.5 px-3 rounded-xl border border-white/70 dark:border-white/10 shadow-2xs">
                    <span className="text-[8px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider block mb-0.5">Daily Task Limit</span>
                    <span className="text-base font-black text-slate-900 dark:text-white tracking-tight">{previewTier.dailyTasks} Tasks</span>
                  </div>

                  <div className="bg-emerald-500/15 dark:bg-emerald-500/20 backdrop-blur-md p-2.5 px-3 rounded-xl border border-emerald-500/30 shadow-2xs">
                    <span className="text-[8px] font-black uppercase text-emerald-700 dark:text-emerald-300 tracking-wider block mb-0.5">Daily Reward</span>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-300 tracking-tight">${previewTier.reward.toFixed(2)}/day</span>
                  </div>

                  <div className="bg-indigo-500/15 dark:bg-indigo-500/20 backdrop-blur-md p-2.5 px-3 rounded-xl border border-indigo-500/30 shadow-2xs">
                    <span className="text-[8px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider block mb-0.5">90-Day Return</span>
                    <span className="text-base font-black text-indigo-700 dark:text-indigo-300 tracking-tight">${(previewTier.reward * 90).toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Button (Vibrant Solid Gradient, 100% Opacity & Contrast) */}
                <button
                  onClick={() => {
                    const tier = previewTier;
                    playGlassSound();
                    setPreviewTier(null);
                    vibrateLight();
                    if (tier.status === 'locked') {
                      onNavigate('coming-soon');
                    } else if (profile?.currentPlan === tier.id) {
                      onEnterTask();
                    } else if (onViewPlan) {
                      onViewPlan(tier.id);
                    }
                  }}
                  className="relative z-10 w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(79,70,229,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/20"
                >
                  <span className="drop-shadow-sm">{profile?.currentPlan === previewTier.id ? 'Start Tasks Now' : 'Activate This Plan'}</span>
                  <ArrowRight className="w-4 h-4 drop-shadow-sm" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Step Detail Modal */}
      {createPortal(
        <AnimatePresence>
          {activeStepDetail && (
            <div
              className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all duration-300"
              onClick={() => { playGlassSound(); setActiveStepDetail(null); }}
            >
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#151722] w-full max-w-sm rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 relative"
              >
                {activeStepDetail === 1 && (
                  <>
                    <div className="h-48 w-full relative bg-indigo-900/50">
                      <img src={previewTier?.flowSteps?.step1.image || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80"} alt="Flow Step 1" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#151722] to-transparent" />
                    </div>
                    <div className="p-6 relative z-10 -mt-12">
                      <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30 text-white border-2 border-white dark:border-[#151722]">
                        <Shirt className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{previewTier?.flowSteps?.step1.detailTitle || 'Global Fashion Sourcing'}</h3>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                        {previewTier?.flowSteps?.step1.detailDesc || 'When you activate a plan, your capital is instantly deployed into Zalando Pro\'s high-volume European wholesale network. We bulk-purchase trending and premium fashion items at deep discounts from manufacturers and top-tier brands.'}
                      </p>
                      <button onClick={() => { playGlassSound(); setActiveStepDetail(null); }} className="w-full py-3.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-transform">Got It</button>
                    </div>
                  </>
                )}
                {activeStepDetail === 2 && (
                  <>
                    <div className="h-48 w-full relative bg-blue-900/50">
                      <img src={previewTier?.flowSteps?.step2.image || "https://images.unsplash.com/photo-1586528116311-ad8ed7451216?w=800&auto=format&fit=crop&q=80"} alt="Flow Step 2" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#151722] to-transparent" />
                    </div>
                    <div className="p-6 relative z-10 -mt-12">
                      <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 text-white border-2 border-white dark:border-[#151722]">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{previewTier?.flowSteps?.step2.detailTitle || 'Automated Global Reselling'}</h3>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                        {previewTier?.flowSteps?.step2.detailDesc || 'Our intelligent fulfillment system automatically lists and resells this procured inventory across global B2C e-commerce networks. Because we sourced at wholesale prices, the retail markup generates significant profit margins.'}
                      </p>
                      <button onClick={() => { playGlassSound(); setActiveStepDetail(null); }} className="w-full py-3.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-transform">Got It</button>
                    </div>
                  </>
                )}
                {activeStepDetail === 3 && (
                  <>
                    <div className="h-48 w-full relative bg-emerald-900/50">
                      <img src={previewTier?.flowSteps?.step3.image || "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80"} alt="Flow Step 3" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#151722] to-transparent" />
                    </div>
                    <div className="p-6 relative z-10 -mt-12">
                      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 text-white border-2 border-white dark:border-[#151722]">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{previewTier?.flowSteps?.step3.detailTitle || 'Daily Guaranteed Commission'}</h3>
                      <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                        {previewTier?.flowSteps?.step3.detailDesc || 'The profits from these automated global sales are finalized daily. A fixed percentage of this retail margin is credited directly into your app wallet as your guaranteed daily commission, which you can withdraw instantly.'}
                      </p>
                      <button onClick={() => { playGlassSound(); setActiveStepDetail(null); }} className="w-full py-3.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-transform">Got It</button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Notification Opt-in Prompt */}
      <AnimatePresence>
        {showNotificationPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 left-4 right-4 z-[70]"
          >
            <div className="bg-white dark:bg-[#1C1E24] rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 dark:border-slate-800 relative overflow-hidden">
              <button
                onClick={() => {
                  setShowNotificationPrompt(false);
                  localStorage.setItem('notification_prompt_dismissed', 'true');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase italic">{t('stay_updated')}</h4>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-tight">{t('enable_notifications_desc')}</p>
                </div>
                <button
                  onClick={async () => {
                    const granted = await requestNotificationPermission();
                    if (granted) {
                      registerPushNotifications(); // Native registration
                      showLocalNotification('Notifications Enabled!', 'You will be notified when new tasks are available.');
                    }
                    setShowNotificationPrompt(false);
                    localStorage.setItem('notification_prompt_dismissed', 'true');
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  {t('enable')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
