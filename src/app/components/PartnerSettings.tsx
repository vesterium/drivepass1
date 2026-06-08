/**
 * PartnerSettings.tsx — DrivePass+
 * Компактная минималистичная панель настроек партнёра.
 */

import { useState, useEffect, useRef } from 'react';
import { nativeStorage } from '../core/native/storage';
import {
  Building2, Phone, MapPin, Clock, Wrench, Bell,
  CreditCard, Banknote, Globe, LogOut, Save, Edit3,
  Shield, Star, Navigation, Trash2, ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useLanguage } from '../contexts/LanguageContext';

interface PartnerSettingsProps {
  user?: any;
  onExitPartnerMode: () => void;
}

const DAYS    = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const SERVICES = ['Экспресс', 'Стандарт', 'Премиум', 'Детейлинг', 'Химчистка', 'Полировка'];

/* ── Slim iOS-style pill toggle ──────────────────────────────────── */
function Toggle({
  on,
  onChange,
  color = '#7c3aed',
}: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="focus:outline-none flex-shrink-0"
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        background: on ? color : '#d1d5db',
        transition: 'background 0.2s ease',
        position: 'relative',
        padding: 0,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <motion.span
        animate={{ x: on ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 38 }}
        style={{
          position: 'absolute',
          top: 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          display: 'block',
        }}
      />
    </button>
  );
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
export function PartnerSettings({ user, onExitPartnerMode }: PartnerSettingsProps) {
  const { t, language, setLanguage } = useLanguage();

  // Get localized days and services from translations
  const rawDays = t('partnerSettings.days');
  const DAYS_T: string[] = Array.isArray(rawDays) ? rawDays as unknown as string[]
    : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const rawSvcs = t('partnerSettings.services');
  const SERVICES_T: string[] = Array.isArray(rawSvcs) ? rawSvcs as unknown as string[]
    : ['Express','Standard','Premium','Detailing','Interior','Polish'];

  /* ── Profile ─────────────────────────────────────────────────── */
  const [name,    setName]    = useState('AutoShine Station');
  const [address, setAddress] = useState('ул. Амира Темура, Самарканд');
  const [phone,   setPhone]   = useState('+998 91 000 00 00');
  const [editing, setEditing] = useState(false);

  /* ── Hours ───────────────────────────────────────────────────── */
  const [workDays, setWorkDays] = useState<boolean[]>([true,true,true,true,true,true,false]);
  const [opens,  setOpens]  = useState('08:00');
  const [closes, setCloses] = useState('21:00');

  /* ── Services ────────────────────────────────────────────────── */
  const [services, setServices] = useState<boolean[]>([true,true,true,false,false,false]);
  const [greenLane, setGreenLane] = useState(true);

  /* ── Notifications ───────────────────────────────────────────── */
  const [nClient,  setNClient]  = useState(true);
  const [nReport,  setNReport]  = useState(true);
  const [nBalance, setNBalance] = useState(true);
  const [nReviews, setNReviews] = useState(false);
  const [sound,    setSound]    = useState(true);

  /* ── Payout ──────────────────────────────────────────────────── */
  const [card,       setCard]      = useState('');
  const [threshold,  setThreshold] = useState('500000');
  const [editPayout, setEditPayout] = useState(false);

  /* ── Language ────────────────────────────────────────────────── */
  // Use global language from LanguageContext (no local state needed)

  /* ── Hydrate from native storage on mount ────────────────────── */
  const hydrated = useRef(false);
  useEffect(() => {
    Promise.all([
      nativeStorage.getItem('ps_name'),
      nativeStorage.getItem('ps_address'),
      nativeStorage.getItem('ps_phone'),
      nativeStorage.getItem('ps_days'),
      nativeStorage.getItem('ps_open'),
      nativeStorage.getItem('ps_close'),
      nativeStorage.getItem('ps_svcs'),
      nativeStorage.getItem('ps_gl'),
      nativeStorage.getItem('ps_nc'),
      nativeStorage.getItem('ps_nr'),
      nativeStorage.getItem('ps_nb'),
      nativeStorage.getItem('ps_nv'),
      nativeStorage.getItem('ps_snd'),
      nativeStorage.getItem('ps_card'),
      nativeStorage.getItem('ps_thr'),
    ]).then(([nm, addr, ph, days, open, close, svcs, gl, nc, nr, nb, nv, snd, c, thr]) => {
      if (nm)   setName(nm);
      if (addr) setAddress(addr);
      if (ph)   setPhone(ph);
      if (days) { try { setWorkDays(JSON.parse(days)); } catch {} }
      if (open) setOpens(open);
      if (close) setCloses(close);
      if (svcs) { try { setServices(JSON.parse(svcs)); } catch {} }
      if (gl  !== null) setGreenLane(gl  !== 'false');
      if (nc  !== null) setNClient(nc  !== 'false');
      if (nr  !== null) setNReport(nr  !== 'false');
      if (nb  !== null) setNBalance(nb  !== 'false');
      if (nv  !== null) setNReviews(nv  === 'true');
      if (snd !== null) setSound(snd !== 'false');
      if (c)   setCard(c);
      if (thr) setThreshold(thr);
      hydrated.current = true;
    });
  }, []);

  /* ── Persist toggles immediately (skip pre-hydration render) ─── */
  useEffect(() => { if (hydrated.current) nativeStorage.setItem('ps_days', JSON.stringify(workDays)); }, [workDays]);
  useEffect(() => { if (hydrated.current) nativeStorage.setItem('ps_svcs', JSON.stringify(services)); }, [services]);
  useEffect(() => { if (hydrated.current) nativeStorage.setItem('ps_gl',  String(greenLane)); }, [greenLane]);
  useEffect(() => { if (hydrated.current) nativeStorage.setItem('ps_nc',  String(nClient));  }, [nClient]);
  useEffect(() => { if (hydrated.current) nativeStorage.setItem('ps_nr',  String(nReport));  }, [nReport]);
  useEffect(() => { if (hydrated.current) nativeStorage.setItem('ps_nb',  String(nBalance)); }, [nBalance]);
  useEffect(() => { if (hydrated.current) nativeStorage.setItem('ps_nv',  String(nReviews)); }, [nReviews]);
  useEffect(() => { if (hydrated.current) nativeStorage.setItem('ps_snd', String(sound));    }, [sound]);

  const saveProfile = () => {
    nativeStorage.setItem('ps_name',    name);
    nativeStorage.setItem('ps_address', address);
    nativeStorage.setItem('ps_phone',   phone);
    nativeStorage.setItem('ps_open',    opens);
    nativeStorage.setItem('ps_close',   closes);
    setEditing(false);
    toast.success(t('partnerSettings.profileSaved'));
  };

  const toggleDay = (i: number) =>
    setWorkDays(p => { const n = [...p]; n[i] = !n[i]; return n; });
  const toggleSvc = (i: number) =>
    setServices(p => { const n = [...p]; n[i] = !n[i]; return n; });

  return (
    <div className="pb-24" style={{ background: '#f7f8fa', minHeight: '60vh' }}>

      {/* ── PROFILE ──────────────────────────────────────────────── */}
      <Section label={t('partnerSettings.stationProfile')} />
      <Card>
        {/* Name */}
        <div className="flex items-center justify-between px-4" style={{ paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs text-gray-400 mb-0.5">{t('partnerSettings.name')}</p>
            {editing
              ? <input value={name} onChange={e => setName(e.target.value)} autoFocus
                  className="text-sm text-gray-900 bg-transparent outline-none border-b border-purple-400 w-full pb-px" style={{ fontWeight: 600 }} />
              : <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{name}</p>}
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => editing ? saveProfile() : setEditing(true)}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: editing ? '#f0fdf4' : '#f5f3ff', minHeight: 0 }}
          >
            {editing
              ? <Save className="w-3.5 h-3.5 text-green-600" />
              : <Edit3 className="w-3.5 h-3.5 text-purple-500" />}
          </motion.button>
        </div>
        {/* Address */}
        <div className="px-4 flex items-center gap-2.5" style={{ paddingTop: 11, paddingBottom: 11, borderBottom: '1px solid #f3f4f6' }}>
          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">{t('partnerSettings.address')}</p>
            {editing
              ? <input value={address} onChange={e => setAddress(e.target.value)}
                  className="text-sm text-gray-700 bg-transparent outline-none border-b border-purple-400 w-full pb-px" />
              : <p className="text-sm text-gray-700 truncate">{address}</p>}
          </div>
        </div>
        {/* Phone */}
        <div className="px-4 flex items-center gap-2.5" style={{ paddingTop: 11, paddingBottom: 11 }}>
          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5">{t('partnerSettings.phone')}</p>
            {editing
              ? <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                  className="text-sm text-gray-700 bg-transparent outline-none border-b border-purple-400 w-full pb-px" />
              : <p className="text-sm text-gray-700">{phone}</p>}
          </div>
        </div>
      </Card>

      {/* ── WORKING HOURS ────────────────────────────────────────── */}
      <Section label={t('partnerSettings.workingHours')} />
      <Card>
        <div className="px-4" style={{ paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
          <p className="text-xs text-gray-400 mb-2.5">{t('partnerSettings.workDays')}</p>
          <div className="flex gap-1.5">
            {DAYS_T.map((d: string, i: number) => (
              <motion.button
                key={d} whileTap={{ scale: 0.85 }}
                onClick={() => toggleDay(i)}
                className="flex-1 rounded-lg text-[11px] py-1.5 transition-all"
                style={{
                  background: workDays[i] ? '#7c3aed' : '#f5f5f5',
                  color: workDays[i] ? '#fff' : '#9ca3af',
                  fontWeight: 600,
                  minHeight: 0,
                }}
              >{d}</motion.button>
            ))}
          </div>
        </div>
        <div className="px-4 flex items-center gap-3" style={{ paddingTop: 11, paddingBottom: 11 }}>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">{t('partnerSettings.opens')}</p>
            <input type="time" value={opens}
              onChange={e => { setOpens(e.target.value); nativeStorage.setItem('ps_open', e.target.value); }}
              className="text-sm text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400 w-full bg-white" style={{ fontWeight: 600 }} />
          </div>
          <span className="text-gray-300 mt-4 text-sm">—</span>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">{t('partnerSettings.closes')}</p>
            <input type="time" value={closes}
              onChange={e => { setCloses(e.target.value); nativeStorage.setItem('ps_close', e.target.value); }}
              className="text-sm text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-purple-400 w-full bg-white" style={{ fontWeight: 600 }} />
          </div>
        </div>
      </Card>

      {/* ── SERVICES ─────────────────────────────────────────────── */}
      <Section label={t('partnerSettings.servicesSection')} />
      <Card>
        {SERVICES_T.map((svc: string, i: number) => (
          <Row key={svc} label={svc}
            right={<Toggle on={services[i]} onChange={() => toggleSvc(i)} />}
          />
        ))}
        {/* Green Lane */}
        <div className="px-4 flex items-center justify-between" style={{ paddingTop: 11, paddingBottom: 11 }}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center flex-shrink-0">
              <Navigation className="w-3 h-3 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-800" style={{ fontWeight: 500 }}>Green Lane</p>
              <p className="text-xs text-gray-400">{t('partnerSettings.greenLaneSub')}</p>
            </div>
          </div>
          <Toggle on={greenLane} onChange={setGreenLane} color="#16a34a" />
        </div>
      </Card>

      {/* ── NOTIFICATIONS ────────────────────────────────────────── */}
      <Section label={t('partnerSettings.notificationsSection')} />
      <Card>
        <Row label={t('partnerSettings.newClient')}    sub={t('partnerSettings.newClientSub')}    right={<Toggle on={nClient}  onChange={setNClient}  />} />
        <Row label={t('partnerSettings.dailyReport')}  sub={t('partnerSettings.dailyReportSub')}  right={<Toggle on={nReport}  onChange={setNReport}  />} />
        <Row label={t('partnerSettings.lowBalance')}   sub={t('partnerSettings.lowBalanceSub')}   right={<Toggle on={nBalance} onChange={setNBalance} />} />
        <Row label={t('partnerSettings.reviewsLabel')} sub={t('partnerSettings.newRatings')}      right={<Toggle on={nReviews} onChange={setNReviews} />} />
        <Row label={t('partnerSettings.scannerSound')} sub={t('partnerSettings.scannerSoundSub')} right={<Toggle on={sound}    onChange={setSound}    color="#2563eb" />} />
      </Card>

      {/* ── PAYOUT ───────────────────────────────────────────────── */}
      <Section label={t('partnerSettings.payouts')} />
      <Card>
        <div className="px-4" style={{ paddingTop: 12, paddingBottom: 12, borderBottom: '1px solid #f3f4f6' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{t('partnerSettings.payoutCard')}</p>
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => { if (editPayout) { nativeStorage.setItem('ps_card', card); setEditPayout(false); toast.success(t('partnerSettings.cardSaved')); } else setEditPayout(true); }}
              className="text-xs text-purple-600 px-2 py-0.5 rounded-lg"
              style={{ background: '#f5f3ff', fontWeight: 600, minHeight: 0 }}
            >
              {editPayout ? t('partnerSettings.saveBtn') : t('partnerSettings.editBtn')}
            </motion.button>
          </div>
          {editPayout
            ? <input value={card} onChange={e => setCard(e.target.value)} placeholder="8600 XXXX XXXX XXXX"
                autoFocus onBlur={() => { setEditPayout(false); nativeStorage.setItem('ps_card', card); }}
                className="text-sm font-mono text-gray-800 border border-purple-300 rounded-lg px-3 py-2 outline-none w-full" />
            : <p className="text-sm font-mono text-gray-500">{card || t('partnerSettings.notSet')}</p>
          }
        </div>
        <div className="px-4" style={{ paddingTop: 12, paddingBottom: 12 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{t('partnerSettings.payoutThreshold')}</p>
            <span className="text-xs text-purple-700 px-2 py-0.5 rounded-full" style={{ background: '#f5f3ff', fontWeight: 700 }}>
              {parseInt(threshold).toLocaleString('ru-RU')} {t('partner.sum')}
            </span>
          </div>
          <input type="range" min="100000" max="2000000" step="50000" value={threshold}
            onChange={e => { setThreshold(e.target.value); nativeStorage.setItem('ps_thr', e.target.value); }}
            className="w-full cursor-pointer" style={{ accentColor: '#7c3aed', height: 4 }} />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-gray-400">100K</span>
            <span className="text-[10px] text-gray-400">2 000 000 {t('partner.sum')}</span>
          </div>
        </div>
      </Card>

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
        <Row label="ID партнёра" sub={user?.id ? user.id.slice(0,8) + '…' : '—'}
          right={<span className="text-xs text-gray-300 font-mono">#</span>} />
        <Row label={t('partnerSettings.exitPartnerMode')}
          right={<LogOut className="w-4 h-4 text-gray-400" />}
          onPress={() => { toast.success(t('partnerSettings.exitSuccess')); setTimeout(onExitPartnerMode, 350); }} />
        <Row label={t('partnerSettings.resetSettings')} red
          right={<Trash2 className="w-3.5 h-3.5 text-red-400" />}
          onPress={() => {
            ['ps_name','ps_address','ps_phone','ps_days','ps_open','ps_close',
             'ps_svcs','ps_gl','ps_nc','ps_nr','ps_nb','ps_nv','ps_snd',
             'ps_card','ps_thr'].forEach(k => nativeStorage.removeItem(k));
            toast.success(t('partnerSettings.resetSuccess'));
          }} />
      </Card>

    </div>
  );
}
