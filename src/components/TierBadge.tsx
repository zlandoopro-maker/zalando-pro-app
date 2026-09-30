import React from 'react';

interface TierBadgeProps {
  tierId: string;
  className?: string;
  mode?: 'silver' | 'color';
}

const BADGE_SRCS: Record<string, string> = {
  starter: '/badges/starter.png?v=6',
  trainee: '/badges/trainee.png?v=4',
  general: '/badges/general.png?v=3',
  senior: '/badges/senior.png?v=4',
  regional: '/badges/regional.png?v=4',
  reg_gen: '/badges/reg_gen.png?v=4',
  reg_vp: '/badges/reg_vp.png?v=8',
  reg_pres: '/badges/reg_pres.png?v=4',
  cofounder: '/badges/cofounder.png?v=4',
};

const COLOR_BADGE_SRCS: Record<string, string> = {
  trainee: '/badges/trainee_color.png?v=4',
  starter: '/badges/starter_color.png?v=6',
  general: '/badges/general_color.png?v=3',
  senior: '/badges/senior_color.png?v=4',
  regional: '/badges/regional_color.png?v=4',
  reg_gen: '/badges/reg_gen_color.png?v=4',
  reg_vp: '/badges/reg_vp_color.png?v=6',
  reg_pres: '/badges/reg_pres_color.png?v=4',
  cofounder: '/badges/cofounder_color.png?v=4',
};

export function TierBadge({ tierId, className = 'w-20 h-20', mode = 'silver' }: TierBadgeProps) {
  const isColor = mode === 'color';
  const badgeSrc = isColor
    ? (COLOR_BADGE_SRCS[tierId] || BADGE_SRCS[tierId] || '/badges/trainee_color.png?v=2')
    : (BADGE_SRCS[tierId] || '/badges/trainee.png?v=2');

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Solid backing disc to block background lines/rings from showing through transparent badge gaps */}
      <div
        className="absolute inset-[14%] rounded-full bg-white dark:bg-slate-900 shadow-sm pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <img
        src={badgeSrc}
        alt={`${tierId} badge`}
        draggable={false}
        className={`relative z-10 w-full h-full object-contain transition-all duration-300 hover:scale-105 ${
          tierId === 'reg_vp' && isColor ? 'animate-diamond-sparkle' : ''
        }`}
        style={{
          filter: isColor
            ? (tierId === 'reg_vp' 
                ? 'drop-shadow(0 8px 25px rgba(139, 92, 246, 0.8)) drop-shadow(0 0 12px rgba(196, 181, 253, 0.6))'
                : 'drop-shadow(0 8px 20px rgba(0, 200, 80, 0.35))')
            : (tierId === 'reg_vp'
                ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'
                : 'grayscale(0.7) opacity(0.85)'),
          WebkitFilter: isColor
            ? (tierId === 'reg_vp' 
                ? 'drop-shadow(0 8px 25px rgba(139, 92, 246, 0.8)) drop-shadow(0 0 12px rgba(196, 181, 253, 0.6))'
                : 'drop-shadow(0 8px 20px rgba(0, 200, 80, 0.35))')
            : (tierId === 'reg_vp'
                ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))'
                : 'grayscale(0.7) opacity(0.85)'),
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      />
      
      {/* Pure Diamond Shine Sweep Animation */}
      {tierId === 'reg_vp' && isColor && (
        <div 
          className="absolute inset-0 z-20 pointer-events-none rounded-full overflow-hidden" 
          style={{ 
            maskImage: 'radial-gradient(circle at center, black 50%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 80%)'
          }}
        >
          <div className="w-[150%] h-[150%] absolute top-[-25%] left-[-25%] bg-gradient-to-r from-transparent via-white/90 to-transparent transform -skew-x-12 animate-shimmer-sweep" style={{ animationDuration: '2.5s' }} />
        </div>
      )}
    </div>
  );
}





