import { useState, useEffect, useRef } from 'react';
import { Home, FileText, CircleUser } from 'lucide-react';
import { Screen } from '../types';
import { vibrateLight } from '../lib/haptics';
import { auth } from '../lib/firebase';

// Custom 3-users icon — supports gradient stroke when active
const UsersThreeIcon = ({ active = false, className = "" }: { active?: boolean; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24" height="24" viewBox="0 0 24 24"
    fill="none"
    stroke={active ? "url(#navGrad)" : "currentColor"}
    strokeWidth={active ? 2.5 : 2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Left Person */}
    <path d="M8 3.13a4 4 0 0 0 0 7.75" />
    <path d="M2 21v-2a4 4 0 0 1 3-3.87" />
    {/* Right Person */}
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    {/* Center Person */}
    <circle cx="12" cy="7" r="4" />
    <path d="M7 21v-2a5 5 0 0 1 10 0v2" />
  </svg>
);

interface BottomNavProps {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  const [hasUnclaimed, setHasUnclaimed] = useState(false);
  const [hasPendingOrders, setHasPendingOrders] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const check = () => {
      if (!auth.currentUser || document.visibilityState === 'hidden') return;
      try {
        // Check shipped orders (red badge)
        const cached = localStorage.getItem(`shipped_${auth.currentUser.uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          const has = parsed.some((o: any) => !o.claimed && ((Date.now() - new Date(o.createdAt).getTime()) / 1000) >= 180);
          setHasUnclaimed(has);
        }
      } catch (e) {}

      try {
        // Check pending orders (yellow badge)
        const ordersCache = localStorage.getItem(`user_orders_${auth.currentUser!.uid}`);
        if (ordersCache) {
          const parsed = JSON.parse(ordersCache);
          const todayStr = new Date().toISOString().split('T')[0];
          const hasPending = Array.isArray(parsed) && parsed.some(
            (o: any) => o.status === 'Pending' && o.submittedAt && o.submittedAt.startsWith(todayStr)
          );
          setHasPendingOrders(hasPending);
        } else {
          setHasPendingOrders(false);
        }
      } catch (e) {}
    };

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(check, 4000);
    };

    check();
    startPolling();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        check();
        startPolling();
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const tabs = [
    { id: 'home',      label: 'Home',         icon: 'home'    },
    { id: 'orders',    label: 'Order Record', icon: 'orders'  },
    { id: 'referrals', label: 'Team Report',  icon: 'team'    },
    { id: 'account',   label: 'Account',      icon: 'account' },
  ];

  const renderIcon = (iconKey: string, isActive: boolean) => {
    const baseStyle = isActive
      ? { stroke: 'url(#navGrad)', strokeWidth: 2.5 }
      : { stroke: 'white', strokeWidth: 2 };

    switch (iconKey) {
      case 'home':
        return <Home className="w-6 h-6" style={baseStyle} />;
      case 'orders':
        return <FileText className="w-6 h-6" style={baseStyle} />;
      case 'team':
        return (
          <UsersThreeIcon
            active={isActive}
            className={`w-6 h-6 ${!isActive ? 'text-white' : ''}`}
          />
        );
      case 'account':
        return <CircleUser className="w-6 h-6" style={baseStyle} />;
      default:
        return null;
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 max-w-[430px] mx-auto h-[60px] bg-[#5d67b8] flex items-center justify-between z-[60] shadow-[0_-4px_16px_rgba(0,0,0,0.15)]">

      {/* Hidden SVG gradient definition used by icon strokes */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="navGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#9333EA" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>

      {tabs.map((tab) => {
        const isActive = activeScreen === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => { vibrateLight(); onNavigate(tab.id as Screen); }}
            className="flex flex-col items-center justify-center gap-0.5 h-full flex-1 active:scale-95 transition-transform py-1"
          >
            <div className={`transition-all duration-200 relative ${
              isActive
                ? 'opacity-100 scale-110 drop-shadow-[0_2px_10px_rgba(147,51,234,0.6)]'
                : 'opacity-70'
            }`}>
              {renderIcon(tab.icon, isActive)}
              {tab.id === 'orders' && hasUnclaimed && (
                <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[#FF3333] rounded-full border-2 border-[#5d67b8] flex items-center justify-center shadow-[0_2px_8px_rgba(255,51,51,0.6)] animate-bounce z-10">
                  <span className="text-[10px] font-black text-white leading-none pb-[1px]">1</span>
                </div>
              )}
              {tab.id === 'orders' && !hasUnclaimed && hasPendingOrders && (
                <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[#F59E0B] rounded-full border-2 border-[#5d67b8] flex items-center justify-center shadow-[0_2px_8px_rgba(245,158,11,0.7)] animate-pulse z-10">
                  <span className="text-[10px] font-black text-white leading-none pb-[1px]">!</span>
                </div>
              )}
            </div>

            <span
              className={`text-[10px] transition-all duration-200 font-medium leading-none ${
                isActive ? 'opacity-100 font-semibold' : 'text-white opacity-70'
              }`}
              style={isActive ? {
                background: 'linear-gradient(135deg, #9333EA 0%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              } : {}}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
