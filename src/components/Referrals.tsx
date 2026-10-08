import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserProfile, ReferralRecord, Screen } from '../types';
import { auth, db, parseUserProfile } from '../lib/firebase';
import { doc, onSnapshot, collection, query, where } from '../lib/firebase';

interface ReferralsProps {
  onNavigate: (screen: Screen) => void;
  key?: string;
}

type TimePeriod = 'Yearly' | 'Monthly' | 'Weekly';
type EarningTab = 'Referral Bonus' | 'Task Commission' | 'Team Commission';

interface EarningEntry {
  id: string;
  userId: string;
  amount: number;
  time: string;
}

// ─── SVG Icons matching reference ───────────────────────────────────────────

const ReferralIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    {/* Hand with dollar sign – matches reference */}
    <path d="M6 34c0 0 4-6 12-6h4l2-2h6c2 0 3 1 3 2s-1 2-3 2h-5" stroke="#5B5BD6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 34l6 6h16c2 0 14-8 14-8" stroke="#5B5BD6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="28" cy="14" r="9" stroke="#5B5BD6" strokeWidth="2.2"/>
    <path d="M28 10v8M25.5 11.5h4a1.5 1.5 0 010 3H26a1.5 1.5 0 000 3h4" stroke="#5B5BD6" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const TaskEarningsIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    {/* Stacked coins / database – matches reference */}
    <ellipse cx="24" cy="14" rx="12" ry="5" stroke="#5B5BD6" strokeWidth="2.2"/>
    <path d="M12 14v8c0 2.76 5.37 5 12 5s12-2.24 12-5v-8" stroke="#5B5BD6" strokeWidth="2.2"/>
    <path d="M12 22v8c0 2.76 5.37 5 12 5s12-2.24 12-5v-8" stroke="#5B5BD6" strokeWidth="2.2"/>
  </svg>
);

const TeamEarningsIcon = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    {/* Upward trend chart – matches reference */}
    <polyline points="8,36 18,24 26,30 40,14" stroke="#5B5BD6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <polyline points="34,14 40,14 40,20" stroke="#5B5BD6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="8" y1="40" x2="40" y2="40" stroke="#5B5BD6" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="14" x2="8" y2="40" stroke="#5B5BD6" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// ─── Nav Icons ───────────────────────────────────────────────────────────────

const HomeIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M3 12L12 4l9 8" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const OrderIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="2" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="2"/>
    <line x1="8" y1="8" x2="16" y2="8" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="8" y1="16" x2="12" y2="16" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const TeamIcon = ({ active }: { active: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
    <circle cx="13" cy="9" r="4" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="2"/>
    <circle cx="5" cy="10" r="3" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8"/>
    <circle cx="21" cy="10" r="3" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8"/>
    <path d="M1 22c0-3 1.8-5 4-5" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M25 22c0-3-1.8-5-4-5" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M5 22c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const AccountIcon = ({ active }: { active: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="2"/>
    <circle cx="12" cy="9" r="3" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8"/>
    <path d="M6 20c0-3 2.7-5 6-5s6 2 6 5" stroke={active ? '#fff' : 'rgba(255,255,255,0.65)'} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Referrals({ onNavigate }: ReferralsProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [l2Referrals, setL2Referrals] = useState<ReferralRecord[]>([]);
  const [l3Referrals, setL3Referrals] = useState<ReferralRecord[]>([]);
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('Yearly');
  const [activeEarningTab, setActiveEarningTab] = useState<EarningTab>('Referral Bonus');

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubProfile = onSnapshot(doc(db, 'users', auth.currentUser.uid), (s) => {
      if (s.exists()) setProfile(parseUserProfile(s.data()) as UserProfile);
    });

    const q1 = query(collection(db, 'referrals'), where('referrerId', '==', auth.currentUser.uid));
    const unsubRef = onSnapshot(q1, (s) => {
      const r = s.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord));
      r.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setReferrals(r);
    });

    const q2 = query(collection(db, 'referrals'), where('l2ReferrerId', '==', auth.currentUser.uid));
    const unsubL2 = onSnapshot(q2, (s) => setL2Referrals(s.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord))));

    const q3 = query(collection(db, 'referrals'), where('l3ReferrerId', '==', auth.currentUser.uid));
    const unsubL3 = onSnapshot(q3, (s) => setL3Referrals(s.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord))));

    return () => { unsubProfile(); unsubRef(); unsubL2(); unsubL3(); };
  }, []);

  if (!profile) return (
    <div style={{ background: '#EEEEF8', minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #5B5BD6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  // ── Time filter ──────────────────────────────────────────────────────────
  const filterByPeriod = (records: ReferralRecord[]) => {
    const now = new Date();
    return records.filter(r => {
      const d = new Date(r.timestamp);
      if (activePeriod === 'Weekly') {
        const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 7);
        return d >= cutoff;
      }
      if (activePeriod === 'Monthly') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return d.getFullYear() === now.getFullYear();
    });
  };

  const fL1 = filterByPeriod(referrals);
  const fL2 = filterByPeriod(l2Referrals);
  const fL3 = filterByPeriod(l3Referrals);

  // ─── Commission Rates ─────────────────────────────────────────────────────
  // L1 referral = 10% of invitee's daily commission, L2 = 5%, L3 = 2%
  const REFERRAL_BONUS_RATE = 0.10;  // L1: 10% referral bonus on plan activation
  const TASK_COMMISSION_RATE = 0.05; // L1: 5% of each completed task commission
  const L2_TEAM_RATE = 0.05;         // L2: 5% team commission
  const L3_TEAM_RATE = 0.02;         // L3: 2% team commission

  // Stats — each type calculated separately
  // Referral Bonus = commissions where type='referral_bonus' from L1
  const referralBonus = fL1
    .filter(r => r.commissionType === 'referral_bonus' || !r.commissionType)
    .reduce((s, r) => s + (r.commissionEarned || 0), 0);

  // Task Commission = commissions where type='task_commission' from L1
  const taskEarnings = fL1
    .filter(r => r.commissionType === 'task_commission')
    .reduce((s, r) => s + (r.commissionEarned || 0), 0);

  // Team Commission = L2 + L3 combined
  const teamEarnings = [
    ...fL2.map(r => ({ ...r, _teamRate: L2_TEAM_RATE })),
    ...fL3.map(r => ({ ...r, _teamRate: L3_TEAM_RATE }))
  ].reduce((s, r) => s + (r.commissionEarned || 0), 0);

  // Earning rows — each tab shows its own data
  const getRows = (): EarningEntry[] => {
    if (activeEarningTab === 'Referral Bonus') {
      return fL1
        .filter(r => r.commissionType === 'referral_bonus' || !r.commissionType)
        .map(r => ({
          id:     r.id,
          userId: r.inviteeName || (r.inviteeId ? r.inviteeId.substring(0, 10) : '—'),
          amount: r.commissionEarned || 0,
          time:   r.timestamp,
        }));
    } else if (activeEarningTab === 'Task Commission') {
      return fL1
        .filter(r => r.commissionType === 'task_commission')
        .map(r => ({
          id:     r.id,
          userId: r.inviteeName || (r.inviteeId ? r.inviteeId.substring(0, 10) : '—'),
          amount: r.commissionEarned || 0,
          time:   r.timestamp,
        }));
    } else {
      // Team Commission — L2 + L3
      return [...fL2, ...fL3].map(r => ({
        id:     r.id,
        userId: r.inviteeName || (r.inviteeId ? r.inviteeId.substring(0, 10) : '—'),
        amount: r.commissionEarned || 0,
        time:   r.timestamp,
      }));
    }
  };

  const rows = getRows();

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const date = d.toISOString().split('T')[0];
      const hms  = d.toTimeString().split(' ')[0];
      return { date, hms };
    } catch { return { date: ts, hms: '' }; }
  };

  // ── Colors ───────────────────────────────────────────────────────────────
  const PRIMARY   = '#5B5BD6';
  const NAV_BG    = '#4040A0';
  const PAGE_BG   = '#EEEEF8';
  const CARD_BG   = '#FFFFFF';
  const TH_BG     = '#5B5BD6';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ background: PAGE_BG, minHeight: '100%', display: 'flex', flexDirection: 'column', fontFamily: "'Inter','Segoe UI',sans-serif" }}
    >
      {/* ── TOP HEADER ─────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        padding: '14px 16px 14px 16px',
        gap: 0,
        position: 'relative',
      }}>
        {/* Profile circle – left */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          border: `2px solid ${PRIMARY}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {/* Smiley face matching reference */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke={PRIMARY} strokeWidth="1.8"/>
            <circle cx="8"  cy="9.5" r="1.1" fill={PRIMARY}/>
            <circle cx="14" cy="9.5" r="1.1" fill={PRIMARY}/>
            <path d="M7.5 13.5c1 1.5 6 1.5 7 0" stroke={PRIMARY} strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Title – absolutely centered */}
        <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 800, fontStyle: 'italic', color: '#111', letterSpacing: 0.2 }}>
            Team Report
          </span>
        </div>
      </div>

      {/* ── TIME PERIOD TABS ────────────────────────────────────────────── */}
      <div style={{ background: '#fff', display: 'flex', borderBottom: '1px solid #E8E8F0' }}>
        {(['Yearly', 'Monthly', 'Weekly'] as TimePeriod[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActivePeriod(tab)}
            style={{
              flex: 1, paddingTop: 14, paddingBottom: 14,
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 15, fontWeight: activePeriod === tab ? 700 : 500,
              color: activePeriod === tab ? PRIMARY : '#9CA3AF',
              position: 'relative',
              letterSpacing: 0.1,
            }}
          >
            {tab}
            {activePeriod === tab && (
              <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
                width: '55%', height: 3, background: PRIMARY, borderRadius: 2,
              }} />
            )}
          </button>
        ))}
      </div>

      {/* ── SCROLLABLE CONTENT ──────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>

      {/* ── TEAM DATA TITLE ─────────────────────────────────────────── */}
        <div style={{ padding: '16px 16px 10px 16px' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#333', letterSpacing: 0.1 }}>Team Data</span>
        </div>

        {/* ── SUMMARY CARDS ───────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, padding: '0 12px 16px 12px' }}>
          {[
            { icon: <ReferralIcon />, value: referralBonus, label: 'Referral Bonus' },
            { icon: <TaskEarningsIcon />, value: taskEarnings, label: 'Task Earnings' },
            { icon: <TeamEarningsIcon />, value: teamEarnings, label: 'Team Earnings' },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{
              flex: 1,
              background: CARD_BG,
              borderRadius: 14,
              padding: '18px 6px 16px 6px',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              boxShadow: '0 2px 8px rgba(91,91,214,0.10)',
              border: '1px solid #ECEEFF',
              gap: 4,
            }}>
              <div style={{ marginBottom: 4 }}>{icon}</div>
              <span style={{
                fontSize: 18, fontWeight: 800, color: '#111', letterSpacing: 0.2,
                fontStyle: 'italic',
              }}>
                ${value.toFixed(2)}
              </span>
              <span style={{ fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 1.3 }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── EARNING DETAILS TITLE ───────────────────────────────────── */}
        <div style={{ padding: '4px 16px 10px 16px' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>Earning Details</span>
        </div>

        {/* ── FILTER BUTTONS ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px 12px' }}>
          {(['Referral Bonus', 'Task Commission', 'Team Commission'] as EarningTab[]).map(tab => {
            const active = activeEarningTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveEarningTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: 12,
                  border: active ? 'none' : '1px solid #DDDDF0',
                  background: active ? PRIMARY : '#F8F8FF',
                  color: active ? '#fff' : '#555',
                  fontWeight: active ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  lineHeight: 1.3,
                  textAlign: 'center',
                  boxShadow: active ? `0 4px 12px ${PRIMARY}44` : '0 1px 4px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* ── TABLE ───────────────────────────────────────────────────── */}
        <div style={{ margin: '0 12px', borderRadius: 10, overflow: 'hidden', border: '1px solid #DDDDF0' }}>

          {/* Table Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            background: TH_BG, padding: '14px 8px',
          }}>
            {['ID', 'Amount', 'Time'].map(col => (
              <span key={col} style={{
                textAlign: 'center', color: '#fff',
                fontWeight: 700, fontSize: 15, letterSpacing: 0.3,
              }}>
                {col}
              </span>
            ))}
          </div>

          {/* Table Rows */}
          {rows.length === 0 ? (
            <div style={{ background: '#fff', padding: '40px 0', textAlign: 'center' }}>
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.25, marginBottom: 8 }}>
                <circle cx="22" cy="22" r="20" stroke={PRIMARY} strokeWidth="2"/>
                <line x1="22" y1="12" x2="22" y2="32" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="12" y1="22" x2="32" y2="22" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <p style={{ fontSize: 12, color: '#AAA', fontWeight: 500 }}>No records yet</p>
            </div>
          ) : (
            rows.map((row, i) => {
              const { date, hms } = formatTime(row.time);
              return (
                <div
                  key={row.id + i}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                    background: '#fff',
                    borderTop: '1px solid #EEEEF8',
                    padding: '14px 8px',
                    alignItems: 'center',
                  }}
                >
                  {/* ID */}
                  <span style={{
                    textAlign: 'left', paddingLeft: 8,
                    fontSize: 13, color: '#444', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {row.userId}
                  </span>

                  {/* Amount */}
                  <span style={{ textAlign: 'center', fontSize: 13, color: '#333', fontWeight: 600 }}>
                    ${row.amount.toFixed(0)}
                  </span>

                  {/* Time — two lines */}
                  <div style={{ textAlign: 'right', paddingRight: 8 }}>
                    <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{date}</div>
                    <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{hms}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </motion.div>
  );
}
