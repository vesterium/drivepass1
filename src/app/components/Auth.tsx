/**
 * Auth.tsx — DrivePass+
 *
 * Флоу регистрации:
 *   1. Валидация → POST /otp/send
 *   2. OTP → POST /otp/verify
 *   3. POST /auth/register
 *   4. setSession → onAuthStateChange(SIGNED_IN) → App
 *
 * Флоу входа:
 *   1. Валидация → supabase.auth.signInWithPassword
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import {
  Sparkles, Phone, Lock, User as UserIcon, Car,
  AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft,
  Timer, MessageSquare, Building2, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { DrivePassLogo } from './DrivePassLogo';

type AuthStep = 'form' | 'otp';

// ─── Компактный языковой переключатель ───────────────────────────────────────
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
              color: isActive ? '#2563eb' : '#9CA3AF',
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

// ─── Компактный круглый анимированный чекбокс ────────────────────────────────
function RoundCheckbox({
  checked,
  onChange,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className="flex-shrink-0 focus:outline-none"
      style={{ minHeight: 0, minWidth: 0, width: 20, height: 20 }}
    >
      <motion.div
        animate={{
          backgroundColor: checked ? '#2563eb' : '#ffffff',
          borderColor:     checked ? '#2563eb' : '#d1d5db',
          scale: checked ? [1, 0.88, 1] : 1,
        }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-5 h-5 rounded-full border-2 relative flex items-center justify-center cursor-pointer"
        style={{ willChange: 'transform' }}
      >
        <AnimatePresence>
          {checked && (
            <motion.svg
              key="check"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.15, ease: 'backOut' }}
              viewBox="0 0 10 8"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-2.5 h-2"
            >
              <polyline points="1,4 3.5,7 9,1" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}

// ─── Вариант анимации для полей формы ───────────────────────────────────────
const fieldAnim = {
  initial: { opacity: 0, y: -8, height: 0 },
  animate: { opacity: 1, y: 0, height: 'auto' },
  exit:    { opacity: 0, y: -6, height: 0 },
  transition: { duration: 0.22, ease: 'easeOut' },
};

// ─────────────────────────────────────────────────────────────────────────────

export function Auth({ role, onBack }: { role?: 'client' | 'partner' | null; onBack?: () => void }) {
  const { refreshSession } = useAuth();
  const { language } = useLanguage();

  const [isSignUp, setIsSignUp] = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [step,     setStep]     = useState<AuthStep>('form');

  const [phone,           setPhone]           = useState('+998');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name,            setName]            = useState('');
  const [carNumber,       setCarNumber]       = useState('');

  // ── Показать/скрыть пароль ───────────────────────────────────────
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpCode,    setOtpCode]    = useState(['', '', '', '', '', '']);
  const [otpTimer,   setOtpTimer]   = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const [devCode,    setDevCode]    = useState<string | null>(null);
  const [realSmsSent, setRealSmsSent] = useState(false);
  const otpRefs  = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [agreedTerms,   setAgreedTerms]   = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);

  // ── Inline i18n labels ─────────────────────────────────────────────────
  const L = ({
    ru: {
      back: 'Изменить роль', roleClient: 'Вход как Водитель', rolePartner: 'Вход как Партнёр',
      slogan: 'Smart Car Care. Экономь каждый день.', tabReg: 'Регистрация', tabIn: 'Войти',
      name: 'Ваше имя', namePh: 'Алексей Иванов', phone: 'Номер телефона',
      carNum: 'Госномер авто', carPh: '30 A 777 AA', carHint: 'Пример: 01 A 123 AA · 30 T 777 BB',
      pwd: 'Пароль', pwdPh: 'Минимум 6 символов', cpwd: 'Подтвердите пароль', cpwdPh: 'Повторите пароль',
      termsLabel: 'условиями Оферты', privLabel: 'Политикой данных', agreeWith: 'Согласен с',
      submitReg: 'Зарегистрироваться', submitIn: 'Войти в аккаунт',
      otpTitle: 'Подтверждение', otpDesc: 'SMS-код отправлен на номер',
      resendIn: 'Повторить через', resend: 'Отправить повторно',
      confirm: 'Подтвердить', changeNum: 'Изменить номер', verifying: 'Проверка...', sending: 'Отправка...',
    },
    en: {
      back: 'Change role', roleClient: 'Sign in as Driver', rolePartner: 'Sign in as Partner',
      slogan: 'Smart Car Care. Save every day.', tabReg: 'Sign Up', tabIn: 'Sign In',
      name: 'Your Name', namePh: 'John Smith', phone: 'Phone Number',
      carNum: 'Car Plate', carPh: '30 A 777 AA', carHint: 'Example: 01 A 123 AA · 30 T 777 BB',
      pwd: 'Password', pwdPh: 'Min 6 characters', cpwd: 'Confirm Password', cpwdPh: 'Repeat password',
      termsLabel: 'Terms of Service', privLabel: 'Privacy Policy', agreeWith: 'I agree with',
      submitReg: 'Create Account', submitIn: 'Sign In',
      otpTitle: 'Verification', otpDesc: 'SMS code sent to',
      resendIn: 'Resend in', resend: 'Resend code',
      confirm: 'Confirm', changeNum: 'Change number', verifying: 'Verifying...', sending: 'Sending...',
    },
    uz: {
      back: "Rolni o'zgartirish", roleClient: 'Haydovchi sifatida kirish', rolePartner: 'Hamkor sifatida kirish',
      slogan: "Aqlli avto parvarish. Har kuni tejang.", tabReg: "Ro'yxatdan o'tish", tabIn: 'Kirish',
      name: 'Ismingiz', namePh: 'Alisher Umarov', phone: 'Telefon raqami',
      carNum: 'Avtomobil raqami', carPh: '30 A 777 AA', carHint: 'Misol: 01 A 123 AA',
      pwd: 'Parol', pwdPh: 'Kamida 6 belgi', cpwd: 'Parolni tasdiqlang', cpwdPh: 'Parolni takrorlang',
      termsLabel: 'oferta shartlari', privLabel: 'maxfiylik siyosati', agreeWith: 'Roziman:',
      submitReg: "Ro'yxatdan o'tish", submitIn: 'Kirish',
      otpTitle: 'Tasdiqlash', otpDesc: 'SMS-kod raqamga yuborildi',
      resendIn: 'Qayta', resend: 'Qayta yuborish',
      confirm: 'Tasdiqlash', changeNum: "Raqamni o'zgartirish", verifying: 'Tekshirilmoqda...', sending: 'Yuborilmoqda...',
    },
  } as const)[language];

  const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;

  // ── форматтеры ──────────────────────────────────────────────────────────
  const handlePhoneChange = (rawVal: string) => {
    // Ensure prefix is preserved
    if (!rawVal.startsWith('+998')) {
      setPhone('+998');
      return;
    }
    // Extract only digits after +998
    const digits = rawVal.slice(4).replace(/\D/g, '').slice(0, 9);
    // Format: XX XXX XX XX
    let fmt = '+998';
    if (digits.length > 0) fmt += ' ' + digits.slice(0, 2);
    if (digits.length > 2) fmt += ' ' + digits.slice(2, 5);
    if (digits.length > 5) fmt += ' ' + digits.slice(5, 7);
    if (digits.length > 7) fmt += ' ' + digits.slice(7, 9);
    setPhone(fmt);
  };

  const handlePhoneKeyDown = (_e: React.KeyboardEvent<HTMLInputElement>) => {
    // +998 prefix is now in a separate read-only badge — no guard needed
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (!d)         return '';
    if (d.length <= 3)  return `+${d}`;
    if (d.length <= 5)  return `+${d.slice(0,3)} (${d.slice(3)}`;
    if (d.length <= 8)  return `+${d.slice(0,3)} (${d.slice(3,5)}) ${d.slice(5)}`;
    if (d.length <= 10) return `+${d.slice(0,3)} (${d.slice(3,5)}) ${d.slice(5,8)} ${d.slice(8)}`;
    return              `+${d.slice(0,3)} (${d.slice(3,5)}) ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10,12)}`;
  };

  const formatCar = (v: string) => {
    const c = v.replace(/\s/g,'').toUpperCase();
    let out = '';
    for (let i = 0; i < c.length && i < 9; i++) {
      if (i === 2 || i === 3 || i === 6) out += ' ';
      out += c[i];
    }
    return out;
  };

  const cleanPhone = (v: string) => v.replace(/\D/g,'');

  // ── OTP ─────────────────────────────────────────────────────────────────
  const startTimer = (sec = 120) => {
    setOtpTimer(sec);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer(p => {
        if (p <= 1) { clearInterval(timerRef.current!); return 0; }
        return p - 1;
      });
    }, 1000);
  };

  const sendOTP = async (): Promise<boolean> => {
    setOtpLoading(true);
    setDevCode(null);
    setRealSmsSent(false);
    try {
      const res  = await fetch(`${API}/otp/send`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body   : JSON.stringify({ phone: cleanPhone(phone) }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Ошибка отправки SMS'); return false; }
      if (data.devCode) {
        setDevCode(data.devCode);
        setRealSmsSent(false);
        toast.info(`Dev код: ${data.devCode}`);
      } else {
        setRealSmsSent(true);
        toast.success('SMS отправлен на ваш номер!');
      }
      startTimer(120);
      return true;
    } catch { toast.error('Ошибка отправки OTP'); return false; }
    finally  { setOtpLoading(false); }
  };

  const verifyOTP = async (code: string): Promise<boolean> => {
    try {
      const res  = await fetch(`${API}/otp/verify`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body   : JSON.stringify({ phone: cleanPhone(phone), code }),
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
    if (e.key === 'Backspace' && !otpCode[idx] && idx > 0)
      otpRefs.current[idx - 1]?.focus();
  };

  const submitOtp = async (code?: string) => {
    const c = code ?? otpCode.join('');
    if (c.length !== 6) { toast.error('Введите 6-значный код'); return; }
    setLoading(true);
    const ok = await verifyOTP(c);
    if (!ok) { setLoading(false); return; }
    await doRegister();
  };

  // ── Регистрация ─────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim())                           return toast.error('Введите ваше имя');
    if (cleanPhone(phone).length < 12)          return toast.error('Введите полный номер (+998 XX XXX XX XX)');
    if (carNumber.replace(/\s/g,'').length < 8) return toast.error('Введите госномер (пример: 30 A 777 AA)');
    if (password.length < 6)                    return toast.error('Пароль минимум 6 символов');
    if (password !== confirmPassword)           return toast.error('Пароли не совпадают');
    if (!agreedTerms)                           return toast.error('Примите условия оферты');
    if (!agreedPrivacy)                         return toast.error('Примите политику данных');
    setLoading(true);
    const sent = await sendOTP();
    setLoading(false);
    if (sent) setStep('otp');
  };

  const doRegister = async () => {
    const cp = cleanPhone(phone);
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body   : JSON.stringify({ phone: cp, password, name: name.trim(), carNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'ALREADY_EXISTS') {
          toast.error('Этот номер уже зарегистрирован. Войдите.');
          setIsSignUp(false); setStep('form');
        } else if (data.code === 'OTP_NOT_VERIFIED') {
          toast.error('SMS-код истёк. Начните заново.'); setStep('form');
        } else {
          toast.error(data.error || 'Ошибка при регитрации');
        }
        return;
      }
      if (data.loginToken && data.email) {
        const { data: otpData, error: otpError } = await supabase.auth.verifyOtp({
          email: data.email, token: data.loginToken, type: 'magiclink',
        });
        if (!otpError && otpData.session) {
          toast.success('Добро пожаловать в DrivePass+!');
          await refreshSession();
          return;
        }
      }
      await doSignInWithPassword(cp, password, 'Добро пожаловать в DrivePass+!');
    } catch {
      toast.error('Ошибка соединения. Проверьте интернет.');
    } finally {
      setLoading(false);
    }
  };

  // ── Вход ─────────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cp = cleanPhone(phone);
    if (!cp.startsWith('998') || cp.length !== 12) {
      toast.error('Введите полный номер телефона (+998 XX XXX XX XX)');
      return;
    }
    setLoading(true);
    try {
      await doSignInWithPassword(cp, password, 'Добро пожаловать обратно!');
    } finally {
      setLoading(false);
    }
  };

  const doSignInWithPassword = async (cp: string, pwd: string, successMsg: string) => {
    const email = `${cp}@drivepass.uz`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
        toast.error('Неверный номер телефона или пароль');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Аккаунт не подтверждён. Обратитесь в поддержку.');
      } else {
        toast.error(`Ошибка входа: ${error.message}`);
      }
      return;
    }
    toast.success(successMsg);
    await refreshSession();
  };

  // ── OTP экран ───────────────────────────────────────────────────────────
  if (step === 'otp') {
    const mins = Math.floor(otpTimer / 60);
    const secs = otpTimer % 60;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
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
                <div className={`rounded-full p-4 ${realSmsSent ? 'bg-green-100' : 'bg-blue-100'}`}>
                  <MessageSquare className={`h-8 w-8 ${realSmsSent ? 'text-green-600' : 'text-blue-600'}`} />
                </div>
              </motion.div>
              <CardTitle className="text-2xl font-bold">{L.otpTitle}</CardTitle>
              <CardDescription className="text-base">
                {L.otpDesc}<br />
                <span className="font-semibold text-gray-800">{phone}</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* ── SMS status banner ── */}
              <AnimatePresence mode="wait">
                {realSmsSent ? (
                  <motion.div
                    key="real"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">SMS отправлен</p>
                      <p className="text-xs text-green-600 mt-0.5">Введите 6-значный код из сообщения</p>
                    </div>
                  </motion.div>
                ) : devCode ? (
                  <motion.div
                    key="dev"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-4"
                  >
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        const digits = devCode.split('');
                        setOtpCode(digits);
                        setTimeout(() => otpRefs.current[5]?.focus(), 50);
                        toast.success('Код вставлен — нажмите Подтвердить');
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-center active:bg-gray-100 transition-colors"
                      style={{ minHeight: 0 }}
                    >
                      <p className="text-[11px] text-gray-400 font-medium mb-2">Код для входа · нажмите для автозаполнения</p>
                      <p className="text-3xl font-black text-gray-800 tracking-[0.3em]">{devCode}</p>
                      <p className="text-[10px] text-gray-400 mt-2">SMS не настроен — добавьте ESKIZ_EMAIL и ESKIZ_PASSWORD</p>
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="sending"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4"
                  >
                    <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    <p className="text-sm text-blue-700">Отправка SMS…</p>
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
                        ? 'border-blue-500 bg-blue-50 text-blue-900 scale-105'
                        : 'border-gray-200 text-gray-900 focus:border-blue-400'
                    }`}
                    style={{ minHeight: 0, minWidth: 0 }}
                  />
                ))}
              </div>

              <div className="text-center mb-4">
                {otpTimer > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                    <Timer className="w-4 h-4" />
                    <span>{L.resendIn} {mins}:{secs.toString().padStart(2,'0')}</span>
                  </div>
                ) : (
                  <button
                    onClick={sendOTP}
                    disabled={otpLoading}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                    style={{ minHeight: 0 }}
                  >
                    {otpLoading ? L.sending : L.resend}
                  </button>
                )}
              </div>

              <Button
                onClick={() => submitOtp()}
                disabled={loading || otpCode.some(d => !d)}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Проверка...
                  </div>
                ) : L.confirm}
              </Button>

              <button
                onClick={() => { setStep('form'); setOtpCode(['','','','','','']); setRealSmsSent(false); }}
                className="mt-4 w-full flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                style={{ minHeight: 0 }}
              >
                <ArrowLeft className="w-4 h-4" />
                {L.changeNum}
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ── Основная форма ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {/* ── Назад к выбору роли ── */}
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
            {L.back}
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
            {/* Role badge */}
            {role && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mt-1"
              >
                <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold ${
                  role === 'partner'
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {role === 'partner'
                    ? <><Building2 className="w-3 h-3" /> {L.rolePartner}</>
                    : <><Car className="w-3 h-3" /> {L.roleClient}</>
                  }
                </span>
              </motion.div>
            )}
            {!role && (
              <CardDescription className="text-base">{L.slogan}</CardDescription>
            )}
          </CardHeader>

          <CardContent>
            {/* ── Переключатель ── */}
            <div className="relative flex bg-gray-100 rounded-xl p-1 mb-6">
              {/* Sliding pill */}
              <motion.div
                className="absolute top-1 bottom-1 bg-white rounded-lg pointer-events-none"
                style={{
                  width: 'calc(50% - 4px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
                }}
                animate={{ x: isSignUp ? 0 : 'calc(100% + 4px)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
              <motion.button
                onClick={() => setIsSignUp(true)}
                whileHover={{ scale: isSignUp ? 1 : 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="relative z-10 flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ color: isSignUp ? '#1d4ed8' : '#9CA3AF', minHeight: 0 }}
              >
                {L.tabReg}
              </motion.button>
              <motion.button
                onClick={() => setIsSignUp(false)}
                whileHover={{ scale: !isSignUp ? 1 : 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="relative z-10 flex-1 py-2.5 rounded-lg text-sm font-semibold"
                style={{ color: !isSignUp ? '#1d4ed8' : '#9CA3AF', minHeight: 0 }}
              >
                {L.tabIn}
              </motion.button>
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">

              {/* Имя */}
              <AnimatePresence initial={false}>
                {isSignUp && (
                  <motion.div key="name" {...fieldAnim} className="space-y-1.5 overflow-hidden">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-400" /> {L.name} *
                    </label>
                    <Input
                      type="text"
                      placeholder={L.namePh}
                      value={name}
                      onChange={e => setName(e.target.value)}
                      disabled={loading}
                      className="h-12"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Телефон */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-500" /> {L.phone} *
                </label>
                <div
                  className="flex items-center rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    border: '2px solid #e5e7eb',
                    background: '#fff',
                    outline: 'none',
                  }}
                  onFocusCapture={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)';
                  }}
                  onBlurCapture={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Country badge */}
                  <div
                    className="flex items-center gap-1.5 px-3 flex-shrink-0 self-stretch"
                    style={{
                      background: '#f8fafc',
                      borderRight: '1.5px solid #e5e7eb',
                      minWidth: 72,
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>🇺🇿</span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#64748b',
                        letterSpacing: '0.01em',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      }}
                    >
                      +998
                    </span>
                  </div>
                  {/* Number digits */}
                  <input
                    type="tel"
                    placeholder="90 123 45 67"
                    value={phone.replace(/^\+998\s?/, '')}
                    onChange={e => handlePhoneChange('+998' + e.target.value)}
                    onKeyDown={handlePhoneKeyDown}
                    onFocus={e => {
                      if (!phone.startsWith('+998')) setPhone('+998');
                      setTimeout(() => {
                        e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
                      }, 0);
                    }}
                    disabled={loading}
                    className="flex-1 h-12 px-3 outline-none bg-transparent"
                    style={{
                      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
                      fontSize: '1.0625rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: '#111827',
                    }}
                    maxLength={15}
                  />
                </div>
              </div>

              {/* Госномер */}
              <AnimatePresence initial={false}>
                {isSignUp && (
                  <motion.div key="car" {...fieldAnim} className="space-y-1.5 overflow-hidden">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-400" /> {L.carNum} *
                    </label>
                    <Input
                      type="text"
                      placeholder={L.carPh}
                      value={carNumber}
                      onChange={e => setCarNumber(formatCar(e.target.value))}
                      disabled={loading}
                      className="h-12 text-base font-mono tracking-widest text-center"
                      maxLength={11}
                    />
                    <p className="text-xs text-gray-400">{L.carHint}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Пароль */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-400" /> {L.pwd} *
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={L.pwdPh}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-12 pr-11"
                  />
                  <motion.button
                    type="button"
                    tabIndex={-1}
                    whileTap={{ scale: 0.82 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg"
                    style={{ minHeight: 0 }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={showPassword ? 'eye-open' : 'eye-closed'}
                        initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                        transition={{ duration: 0.16, ease: 'easeOut' }}
                      >
                        {showPassword
                          ? <EyeOff className="w-4 h-4 text-gray-400" />
                          : <Eye className="w-4 h-4 text-gray-400" />}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>
                </div>
                <AnimatePresence>
                  {isSignUp && password.length > 0 && password.length < 6 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-xs text-amber-600 overflow-hidden"
                    >
                      <AlertCircle className="h-3 w-3 flex-shrink-0" />
                      Пароль должен быть минимум 6 символов
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Подтверждение пароля */}
              <AnimatePresence initial={false}>
                {isSignUp && (
                  <motion.div key="confirm" {...fieldAnim} className="space-y-1.5 overflow-hidden">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Lock className="h-4 w-4 text-gray-400" /> {L.cpwd} *
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={L.cpwdPh}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        className="h-12 pr-11"
                      />
                      <motion.button
                        type="button"
                        tabIndex={-1}
                        whileTap={{ scale: 0.82 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                        onClick={() => setShowConfirmPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg"
                        style={{ minHeight: 0 }}
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={showConfirmPassword ? 'eye-open' : 'eye-closed'}
                            initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                            transition={{ duration: 0.16, ease: 'easeOut' }}
                          >
                            {showConfirmPassword
                              ? <EyeOff className="w-4 h-4 text-gray-400" />
                              : <Eye className="w-4 h-4 text-gray-400" />}
                          </motion.div>
                        </AnimatePresence>
                      </motion.button>
                    </div>
                    <AnimatePresence>
                      {confirmPassword.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`flex items-center gap-2 text-xs ${
                            password === confirmPassword && password.length >= 6
                              ? 'text-green-600'
                              : 'text-red-500'
                          }`}
                        >
                          {password === confirmPassword && password.length >= 6
                            ? <><CheckCircle2 className="h-3 w-3" /> Пароли совпадают</>
                            : <><AlertCircle className="h-3 w-3" /> Пароли не совпадают</>
                          }
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Согласия ── */}
              <AnimatePresence initial={false}>
                {isSignUp && (
                  <motion.div key="agreements" {...fieldAnim} className="overflow-hidden">
                    <div className="space-y-3 pt-1">

                      {/* Оферта */}
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.06 }}
                        className="flex items-center gap-3"
                      >
                        <RoundCheckbox
                          id="terms"
                          checked={agreedTerms}
                          onChange={setAgreedTerms}
                          disabled={loading}
                        />
                        <label
                          htmlFor="terms"
                          className="text-sm text-gray-600 leading-snug cursor-pointer select-none"
                        >
                          Я согласен с{' '}
                          <a href="#" className="text-blue-600 hover:text-blue-700 underline underline-offset-2">
                            {L.termsLabel}
                          </a>
                        </label>
                      </motion.div>

                      {/* Политика */}
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.10 }}
                        className="flex items-center gap-3"
                      >
                        <RoundCheckbox
                          id="privacy"
                          checked={agreedPrivacy}
                          onChange={setAgreedPrivacy}
                          disabled={loading}
                        />
                        <label
                          htmlFor="privacy"
                          className="text-sm text-gray-600 leading-snug cursor-pointer select-none"
                        >
                          Я принимаю{' '}
                          <a href="#" className="text-blue-600 hover:text-blue-700 underline underline-offset-2">
                            {L.privLabel}
                          </a>
                        </label>
                      </motion.div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isSignUp ? L.sending : L.verifying}
                  </div>
                ) : (
                  isSignUp ? L.submitReg : L.submitIn
                )}
              </Button>
            </form>

            {/* ── Индикаторы доверия ── */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: ShieldCheck,   color: 'text-green-600',  label: 'Безопасно' },
                  { icon: MessageSquare, color: 'text-blue-600',   label: 'SMS OTP' },
                  { icon: Sparkles,      color: 'text-indigo-600', label: 'Премиум' },
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
