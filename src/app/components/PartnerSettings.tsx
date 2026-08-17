/**
 * PartnerSettings.tsx — DrivePass+
 *
 * Read-only view of the real partner profile (PartnerContext, backed by GET /partner/me).
 * Working hours / services / notification toggles / payout threshold are gone -- they
 * never had anywhere real to persist to, so keeping them would just be UI that silently
 * does nothing. The payout card is shown but not editable here: only the owner can change
 * where a partner's money goes, via the bot.
 */

import { LogOut, MapPin, Phone as PhoneIcon, CreditCard, Percent, ChevronRight, Building2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';
import { usePartner } from '../contexts/PartnerContext';

interface PartnerSettingsProps {
  onExitPartnerMode: () => void;
}

/* ── Section label ───────────────────────────────────────────────── */
function Section({ label }: { label: string }) {
  return (
    <p className="px-4 pt-5 pb-1.5 text-[11px] text-gray-400 uppercase tracking-[0.1em]" style={{ fontWeight: 600 }}>
      {label}
    </p>
  );
}

/* ── Single settings row ─────────────────────────────────────────── */
function Row({
  label,
  sub,
  right,
  onPress,
  red = false,
}: {
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  red?: boolean;
}) {
  return (
    <motion.div
      whileTap={onPress ? { backgroundColor: '#f9f5ff' } : {}}
      onClick={onPress}
      className={`flex items-center justify-between px-4 ${onPress ? 'cursor-pointer' : ''}`}
      style={{
        paddingTop: 11,
        paddingBottom: 11,
        borderBottom: '1px solid #f3f4f6',
        minHeight: 0,
      }}
    >
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-sm text-gray-800 leading-tight" style={{ fontWeight: 500, color: red ? '#ef4444' : undefined }}>
          {label}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{sub}</p>}
      </div>
      {right ?? (onPress ? <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" /> : null)}
    </motion.div>
  );
}

/* ── Card wrapper ────────────────────────────────────────────────── */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mx-4 bg-white overflow-hidden"
      style={{ borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
    >
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export function PartnerSettings({ onExitPartnerMode }: PartnerSettingsProps) {
  const { t, language, setLanguage } = useLanguage();
  const { profile } = usePartner();

  return (
    <div className="pb-24" style={{ background: '#f7f8fa', minHeight: '60vh' }}>

      {/* ── PROFILE (read-only, from the real Partner row) ─────────── */}
      <Section label={t('partnerSettings.stationProfile')} />
      <Card>
        <div className="px-4 flex items-center gap-2.5" style={{ paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
          <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">{t('partnerSettings.name')}</p>
            <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>
              {profile?.partnerName ?? '—'}
            </p>
          </div>
        </div>
        <div className="px-4 flex items-center gap-2.5" style={{ paddingTop: 11, paddingBottom: 11, borderBottom: '1px solid #f3f4f6' }}>
          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">{t('partnerSettings.address')}</p>
            <p className="text-sm text-gray-700 truncate">{profile?.address || '—'}</p>
          </div>
        </div>
        <div className="px-4 flex items-center gap-2.5" style={{ paddingTop: 11, paddingBottom: 11 }}>
          <PhoneIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Администратор</p>
            <p className="text-sm text-gray-700">{profile?.adminName ?? '—'}</p>
          </div>
        </div>
      </Card>

      {/* ── PAYOUT (display only — the owner controls this via the bot) ── */}
      <Section label={t('partnerSettings.payouts')} />
      <Card>
        <div className="px-4 flex items-center gap-2.5" style={{ paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
          <CreditCard className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">{t('partnerSettings.payoutCard')}</p>
            <p className="text-sm font-mono text-gray-700">
              {profile?.payoutCardNumber || t('partnerSettings.notSet')}
            </p>
            {profile?.payoutCardHolderName && (
              <p className="text-[11px] text-gray-400 mt-0.5">{profile.payoutCardHolderName}</p>
            )}
          </div>
        </div>
        <div className="px-4 flex items-center gap-2.5" style={{ paddingTop: 11, paddingBottom: 11 }}>
          <Percent className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">Комиссия платформы</p>
            <p className="text-sm text-gray-700">{profile?.commissionPct ?? '—'}%</p>
          </div>
        </div>
      </Card>
      <p className="px-5 pt-2 text-[11px] text-gray-400 leading-relaxed">
        Реквизиты и комиссию может изменить только владелец DrivePass+.
      </p>

      {/* ── LANGUAGE ─────────────────────────────────────────────── */}
      <Section label={t('partnerSettings.languageSection')} />
      <Card>
        <div className="px-4 flex gap-2" style={{ paddingTop: 10, paddingBottom: 10 }}>
          {[{ id: 'ru', l: '🇷🇺 Рус' }, { id: 'uz', l: "🇺🇿 O'zb" }, { id: 'en', l: '🇬🇧 Eng' }].map(x => (
            <motion.button key={x.id} whileTap={{ scale: 0.92 }}
              onClick={() => setLanguage(x.id as 'ru' | 'uz' | 'en')}
              className="flex-1 py-2 rounded-xl text-xs transition-all"
              style={{
                background: language === x.id ? '#7c3aed' : '#f5f5f5',
                color: language === x.id ? '#fff' : '#9ca3af',
                fontWeight: 600, minHeight: 0,
              }}>
              {x.l}
            </motion.button>
          ))}
        </div>
      </Card>

      {/* ── ACCOUNT ──────────────────────────────────────────────── */}
      <Section label={t('partnerSettings.accountSection')} />
      <Card>
        <Row label="ID партнёра" sub={profile ? `#${profile.partnerId}` : '—'}
          right={<span className="text-xs text-gray-300 font-mono">#</span>} />
        <Row label={t('partnerSettings.exitPartnerMode')}
          right={<LogOut className="w-4 h-4 text-gray-400" />}
          onPress={() => { toast.success(t('partnerSettings.exitSuccess')); setTimeout(onExitPartnerMode, 350); }} />
      </Card>

    </div>
  );
}
