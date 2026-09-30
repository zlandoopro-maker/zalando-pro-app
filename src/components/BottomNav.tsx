import { Home, FileText, CircleUser } from 'lucide-react';
import { Screen } from '../types';
import { vibrateLight } from '../lib/haptics';

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
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#5d67b8] flex items-center justify-between z-[60] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">

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
            className="flex flex-col items-center justify-center gap-1 py-3 flex-1 active:scale-95 transition-transform"
          >
            <div className={`transition-all duration-200 ${
              isActive
                ? 'opacity-100 scale-110 drop-shadow-[0_2px_10px_rgba(147,51,234,0.6)]'
                : 'opacity-70'
            }`}>
              {renderIcon(tab.icon, isActive)}
            </div>

            <span
              className={`text-[11px] transition-all duration-200 font-medium ${
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
