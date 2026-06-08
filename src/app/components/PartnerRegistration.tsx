/**
 * PartnerRegistration.tsx — DrivePass+
 *
 * Регистрация и вход партнёра (владелец автомойки).
 * Визуально идентично Auth.tsx — фиолетовый акцент.
 *
 * Регистрация: Email, Название компании, ИНН, Телефон (OTP), Пароль
 * Вход: Email + Пароль
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import {
  Building2, Mail, Lock, Phone, FileText, ShieldCheck,
  ArrowLeft, Eye, EyeOff, CheckCircle2, Clock, AlertCircle,
  Timer, MessageSquare, LogIn,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { DrivePassLogo } from './DrivePassLogo';

type Step = 'form' | 'otp' | 'pending';
type AuthMode = 'register' | 'login';

// ── Анимация появления полей ─────────────────────────────────────────────────
const fieldAnim = {
  initial: { opacity: 0, y: -8, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit:    { opacity: 0, y: -6, height: 0 },
  transition: { duration: 0.22, ease: 'easeOut' },
};

// ── Компактный языковой переключатель ────────────────────────────────────────
function LangSwitcher() {
  const { language, setLanguage } = useLanguage();
  const LANGS = [
    { code: 'ru' as const, label: 'RU' },
    { code: 'en' as const, label: 'EN' },
    { code: 'uz' as const, label: 'UZ' },
  ];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#F0F0F5',
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}
    >
      {LANGS.map(({ code, label }) => {
        const isActive = language === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            style={{
              background: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#7c3aed' : '#9CA3AF',
              fontWeight: isActive ? 700 : 500,
              fontSize: 10,
              lineHeight: 1,
              padding: '4px 10px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.13)' : 'none',
              letterSpacing: '0.05em',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function PartnerRegistration({ onBack }: { onBack?: () => void }) {
  const { t, language } = useLanguage();
  const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inn, setInn] = useState('');
  const [phone, setPhone] = useState('+998');

  // OTP state
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [realSmsSent, setRealSmsSent] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Форматтер телефона ──────────────────────────────────────────────────
  const handlePhoneChange = (rawVal: string) => {
    if (!rawVal.startsWith('+998')) { setPhone('+998'); return; }
    const digits = rawVal.slice(4).replace(/\D/g, '').slice(0, 9);
    let fmt = '+998';
    if (digits.length > 0) fmt += ' ' + digits.slice(0, 2);
    if (digits.length > 2) fmt += ' ' + digits.slice(2, 5);
    if (digits.length > 5) fmt += ' ' + digits.slice(5, 7);
    if (digits.length > 7) fmt += ' ' + digits.slice(7, 9);
    setPhone(fmt);
  };

  const cleanPhone = (v: string) => v.replace(/\D/g, '');

  // ── Индикатор надёжности пароля ─────────────────────────────────────────
  const pwStrength = (() => {
    let score = 0;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const pwColor = pwStrength <= 1 ? 'bg-red-400' : pwStrength <= 2 ? 'bg-yellow-400' : pwStrength <= 3 ? 'bg-blue-400' : 'bg-green-500';
  const pwLabel = pwStrength <= 1 ? 'Слабый' : pwStrength <= 2 ? 'Средний' : pwStrength <= 3 ? 'Хороший' : 'Надёжный';

  // ── OTP ─────────────────────────────────────────────────────────────────
  const startTimer = (sec = 120) => {
    setOtpTimer(sec);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
    }, 1000);
  };

  const sendOTP = async (): Promise<boolean> => {
    setOtpLoading(true);
    setDevCode(null);
    setRealSmsSent(false);
    try {
      const res = await fetch(`${API}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ phone: cleanPhone(phone) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Ошибка отправки SMS'); return false; }
      if (data.devCode) {
        setDevCode(data.devCode);
        toast.info(`Dev: ${data.devCode}`);
      } else {
        setRealSmsSent(true);
        toast.success('SMS отправлен на ваш номер!');
      }
      startTimer(120);
      return true;
    } catch { toast.error('Ошибка отправки OTP'); return false; }
    finally { setOtpLoading(false); }
  };

  const verifyOTP = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ phone: cleanPhone(phone), code }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Неверный код'); return false; }
      return true;
    } catch { toast.error('Ошибка верификации'); return false; }
  };

  const handleOtpInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpCode];
    next[idx] = val.slice(-1);
    setOtpCode(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (val && idx === 5 && next.every(d => d)) submitOtp(next.join(''));
  };

  const handleOtpKey = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const submitOtp = async (code?: string) => {
    const c = code ?? otpCode.join('');
    if (c.length !== 6) { toast.error('Введите 6-значный код'); return; }
    setLoading(true);
    const ok = await verifyOTP(c);
    if (!ok) { setLoading(false); return; }
    await doRegister();
  };

  // ── Вход ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Заполните все поля'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Ошибка входа. Проверьте данные.'); return; }
      toast.success('Добро пожаловать, партнёр!');
    } catch {
      toast.error('Ошибка соединения. Проверьте интернет.');
    } finally {
      setLoading(false);
    }
  };

  // ── Регистрация — валидация ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Введите корректный email');
    if (!companyName.trim()) return toast.error('Введите название компании');
    if (inn.length < 9) return toast.error('ИНН должен содержать минимум 9 цифр');
    if (cleanPhone(phone).length < 12) return toast.error('Введите полный номер телефона');
    if (password.length < 12) return toast.error('Пароль минимум 12 символов');
    if (password !== confirmPassword) return toast.error('Пароли не совпадают');
    setLoading(true);
    const sent = await sendOTP();
    setLoading(false);
    if (sent) setStep('otp');
  };

  const doRegister = async () => {
    try {
      const res = await fetch(`${API}/auth/register-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          email,
          password,
          phone: cleanPhone(phone),
          companyName: companyName.trim(),
          inn: inn.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Ошибка регистрации'); setLoading(false); return; }
      setStep('pending');
      toast.success('Заявка отправлена!');
    } catch {
      toast.error('Ошибка соединения. Проверьте интернет.');
    } finally {
      setLoading(false);
    }
  };

  // ── PENDING ─────────────────────────────────────────────────────────────
  if (step === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl border-0 text-center">
            <CardHeader className="pb-2">
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
                className="flex justify-center mb-4"
              >
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-amber-600" />
                </div>
              </motion.div>
              <CardTitle className="text-2xl">Заявка отправлена</CardTitle>
              <CardDescription className="text-base mt-2">
                Ваша заявка на регистрацию рассматривается администратором. Вы получите уведомление после активации аккаунта.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { icon: CheckCircle2, label: 'Телефон подтверждён', done: true },
                  { icon: CheckCircle2, label: 'Документы отправлены', done: true },
                  { icon: Clock,        label: 'Проверка администратором', done: false },
                ].map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                      s.done ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                    }`}
                  >
                    <s.icon className={`w-5 h-5 ${s.done ? 'text-green-600' : 'text-amber-600'}`} />
                    <span className={`text-sm ${s.done ? 'text-green-800' : 'text-amber-800'}`}>{s.label}</span>
                  </motion.div>
                ))}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-sm text-blue-800">
                  Проверка занимает 1–2 рабочих дня. Мы отправим SMS на ваш номер, когда аккаунт будет готов.
                </p>
              </div>
              {onBack && (
                <Button variant="outline" onClick={onBack} className="w-full mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── OTP ─────────────────────────────────────────────────────────────────
  if (step === 'otp') {
    const mins = Math.floor(otpTimer / 60);
    const secs = otpTimer % 60;
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.12, duration: 0.32, ease: 'backOut' }}
                className="flex justify-center mb-3"
              >
                <div className={`rounded-full p-4 ${realSmsSent ? 'bg-green-100' : 'bg-violet-100'}`}>
                  <MessageSquare className={`h-8 w-8 ${realSmsSent ? 'text-green-600' : 'text-violet-600'}`} />
                </div>
              </motion.div>
              <CardTitle className="text-2xl font-bold">Подтверждение</CardTitle>
              <CardDescription className="text-base">
                SMS-код отправлен на номер<br />
                <span className="font-semibold text-gray-800">{phone}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {realSmsSent ? (
                  <motion.div key="real" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">SMS отправлен</p>
                      <p className="text-xs text-green-600 mt-0.5">Введите 6-значный код из сообщения</p>
                    </div>
                  </motion.div>
                ) : devCode ? (
                  <motion.div key="dev" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mb-4">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setOtpCode(devCode.split(''));
                        setTimeout(() => otpRefs.current[5]?.focus(), 50);
                        toast.success('Код вставлен — нажмите Подтвердить');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-center"
                      style={{ minHeight: 0 }}
                    >
                      <p className="text-[11px] text-gray-400 font-medium mb-2">Код для входа · нажмите для автозаполнения</p>
                      <p className="text-3xl font-black text-gray-800 tracking-[0.3em]">{devCode}</p>
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div key="sending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-4">
                    <div className="h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <p className="text-sm text-violet-700">Отправка SMS…</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 justify-center mb-6">
                {otpCode.map((digit, idx) => (
                  <motion.input
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.22 }}
                    ref={el => { otpRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpInput(idx, e.target.value)}
                    onKeyDown={e => handleOtpKey(idx, e)}
                    className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all duration-200 ${
                      digit
                        ? 'border-violet-500 bg-violet-50 text-violet-900 scale-105'
                        : 'border-gray-200 text-gray-900 focus:border-violet-400'
                    }`}
                    style={{ minHeight: 0, minWidth: 0 }}
                  />
                ))}
              </div>

              <div className="text-center mb-4">
                {otpTimer > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>Повторить через {mins}:{secs.toString().padStart(2, '0')}</span>
                  </div>
                ) : (
                  <button onClick={sendOTP} disabled={otpLoading}
                    className="text-violet-600 hover:text-violet-700 text-sm font-medium transition-colors" style={{ minHeight: 0 }}>
                    {otpLoading ? 'Отправка...' : 'Отправить повторно'}
                  </button>
                )}
              </div>

              <Button onClick={() => submitOtp()} disabled={loading || otpCode.some(d => !d)}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Проверка...
                  </div>
                ) : 'Подтвердить'}
              </Button>

              <button
                onClick={() => { setStep('form'); setOtpCode(['', '', '', '', '', '']); setRealSmsSent(false); }}
                className="mt-4 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                style={{ minHeight: 0 }}>
                <ArrowLeft className="w-4 h-4" /> Изменить номер
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── ГЛАВНАЯ ФОРМА ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* Кнопка назад */}
        {onBack && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-4 transition-colors"
            style={{ minHeight: 0 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('partner_reg.back')}
          </motion.button>
        )}

        <Card className="w-full max-w-md border border-gray-100">
          <CardHeader className="space-y-1 text-center pb-4 relative">
            {/* Language Switcher */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="absolute top-4 right-4"
            >
              <LangSwitcher />
            </motion.div>

            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.36, ease: 'backOut' }}
              className="flex items-center justify-center mb-2"
            >
              <DrivePassLogo size={44} animated={false} />
            </motion.div>
            <CardTitle className="text-2xl font-bold">DrivePass+</CardTitle>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mt-1"
            >
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold bg-violet-100 text-violet-700">
                <Building2 className="w-3 h-3" /> {t('partner_reg.badge')}
              </span>
            </motion.div>
          </CardHeader>

          <CardContent>
            {/* ── Переключатель Регистрация / Войти — идентичен Auth.tsx ── */}
            <div className="relative flex bg-gray-100 rounded-xl p-1 mb-6">
              <motion.div
                className="absolute top-1 bottom-1 bg-white rounded-lg pointer-events-none"
                style={{
                  width: 'calc(50% - 4px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
                }}
                animate={{ x: authMode === 'register' ? 0 : 'calc(100% + 4px)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
              <motion.button
                onClick={() => setAuthMode('register')}
                whileHover={{ scale: authMode === 'register' ? 1 : 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="relative z-10 flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ color: authMode === 'register' ? '#7c3aed' : '#9CA3AF', minHeight: 0 }}
              >
                {t('partner_reg.tab_register')}
              </motion.button>
              <motion.button
                onClick={() => setAuthMode('login')}
                whileHover={{ scale: authMode === 'login' ? 1 : 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="relative z-10 flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ color: authMode === 'login' ? '#7c3aed' : '#9CA3AF', minHeight: 0 }}
              >
                {t('partner_reg.tab_login')}
              </motion.button>
            </div>

            {/* Баннер безопасности */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-5"
            >
              <ShieldCheck className="w-4 h-4 text-violet-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-violet-700 leading-relaxed">
                {t('partner_reg.security_note')}
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
              {/* ── ФОРМА ВХОДА ── */}
              {authMode === 'login' ? (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-violet-500" /> Email *
                    </label>
                    <Input
                      type="email"
                      placeholder="partner@company.uz"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-12"
                    />
                  </div>

                  {/* Пароль */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-violet-500" /> {t('partner_reg.password')} *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        placeholder="Введите пароль"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                        className="h-12 pr-12"
                      />
                      <motion.button type="button" whileTap={{ scale: 0.82 }} onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center"
                        style={{ minHeight: 0 }}>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div key={showPw ? 'open' : 'closed'}
                            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                            transition={{ duration: 0.16 }}>
                            {showPw ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                  </div>

                  <div className="text-right">
                    <button type="button" className="text-xs text-violet-600 hover:text-violet-700" style={{ minHeight: 0 }}>
                      {t('partner_reg.forgot_password')}
                    </button>
                  </div>

                  <Button type="submit" disabled={loading}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 mt-2">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        {t('partner_reg.logging_in')}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="w-5 h-5" /> {t('partner_reg.login')}
                      </div>
                    )}
                  </Button>

                  <p className="text-xs text-center text-gray-400 mt-3">
                    {t('partner_reg.no_account')}{' '}
                    <button type="button" onClick={() => setAuthMode('register')}
                      className="text-violet-600 hover:underline" style={{ minHeight: 0 }}>
                      {t('partner_reg.register_link')}
                    </button>
                  </p>
                </motion.form>
              ) : (
                /* ── ФОРМА РЕГИСТРАЦИИ ── */
                <motion.form
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-violet-500" /> Email *
                    </label>
                    <Input
                      type="email"
                      placeholder="partner@company.uz"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-12"
                    />
                  </div>

                  {/* Название компании */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-violet-500" /> Название компании *
                    </label>
                    <Input
                      type="text"
                      placeholder='ООО «Чистый Драйв»'
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      disabled={loading}
                      className="h-12"
                    />
                  </div>

                  {/* ИНН */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-violet-500" /> ИНН / Регистрационный номер *
                    </label>
                    <Input
                      type="text"
                      placeholder="123456789"
                      value={inn}
                      onChange={e => setInn(e.target.value.replace(/\D/g, '').slice(0, 14))}
                      disabled={loading}
                      className="h-12"
                      inputMode="numeric"
                    />
                    <p className="text-xs text-gray-400">Идентификационный номер налогоплательщика (9–14 цифр)</p>
                  </div>

                  {/* Телефон — идентично Auth.tsx */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-violet-500" /> Номер телефона (для 2FA) *
                    </label>
                    <div
                      className="flex items-center rounded-xl overflow-hidden transition-all duration-200"
                      style={{ border: '2px solid #e5e7eb', background: '#fff' }}
                      onFocusCapture={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#7c3aed';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(124,58,237,0.12)';
                      }}
                      onBlurCapture={e => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                      }}
                    >
                      <div
                        className="flex items-center gap-1.5 px-3 flex-shrink-0 self-stretch"
                        style={{ background: '#f8fafc', borderRight: '1.5px solid #e5e7eb', minWidth: 72 }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>🇺🇿</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>+998</span>
                      </div>
                      <input
                        type="tel"
                        placeholder="90 123 45 67"
                        value={phone.replace(/^\+998\s?/, '')}
                        onChange={e => handlePhoneChange('+998' + e.target.value)}
                        disabled={loading}
                        className="flex-1 h-12 px-3 outline-none bg-transparent"
                        style={{ fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '0.06em', color: '#111827' }}
                        maxLength={15}
                      />
                    </div>
                  </div>

                  {/* Пароль */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-violet-500" /> Пароль *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        placeholder="Минимум 12 символов"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                        className="h-12 pr-12"
                      />
                      <motion.button type="button" whileTap={{ scale: 0.82 }} onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center"
                        style={{ minHeight: 0 }}>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div key={showPw ? 'open' : 'closed'}
                            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                            transition={{ duration: 0.16 }}>
                            {showPw ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    {/* Индикатор надёжности */}
                    <AnimatePresence>
                      {password.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                          <div className="flex gap-1 mt-1">
                            {[0, 1, 2, 3, 4].map(i => (
                              <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < pwStrength ? pwColor : 'bg-gray-200'}`} />
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{pwLabel}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Подтверждение пароля */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-violet-500" /> Подтвердите пароль *
                    </label>
                    <div className="relative">
                      <Input
                        type={showCpw ? 'text' : 'password'}
                        placeholder="Повторите пароль"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        className="h-12 pr-12"
                      />
                      <motion.button type="button" whileTap={{ scale: 0.82 }} onClick={() => setShowCpw(!showCpw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center"
                        style={{ minHeight: 0 }}>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div key={showCpw ? 'open' : 'closed'}
                            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                            transition={{ duration: 0.16 }}>
                            {showCpw ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    <AnimatePresence>
                      {confirmPassword.length > 0 && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className={`flex items-center gap-1.5 text-xs ${
                            password === confirmPassword && password.length >= 12 ? 'text-green-600' : 'text-red-500'
                          }`}>
                          {password === confirmPassword && password.length >= 12
                            ? <><CheckCircle2 className="w-3 h-3" /> Пароли совпадают</>
                            : <><AlertCircle className="w-3 h-3" /> Пароли не совпадают</>
                          }
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <Button type="submit" disabled={loading}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 mt-2">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Регистрация...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> Зарегистрироваться как партнёр
                      </div>
                    )}
                  </Button>

                  <p className="text-xs text-center text-gray-400 mt-2">
                    После регистрации аккаунт будет проверен администратором. Доступ будет предоставлен после одобрения.
                  </p>

                  <p className="text-xs text-center text-gray-400">
                    Уже есть аккаунт?{' '}
                    <button type="button" onClick={() => setAuthMode('login')}
                      className="text-violet-600 hover:underline" style={{ minHeight: 0 }}>
                      Войти
                    </button>
                  </p>
                </motion.form>
              )}
            </AnimatePresence>

            {/* ── Индикаторы доверия ── */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: ShieldCheck,   color: 'text-green-600',  label: 'Безопасно' },
                  { icon: MessageSquare, color: 'text-violet-600', label: 'SMS OTP' },
                  { icon: Building2,     color: 'text-indigo-600', label: 'Партнёр' },
                ].map(({ icon: Icon, color, label }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <Icon className={`h-5 w-5 ${color}`} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
