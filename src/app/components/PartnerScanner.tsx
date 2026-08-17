import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, CheckCircle2, XCircle, AlertCircle, StopCircle, Car,
  RefreshCw, Zap, ScanLine, Shield, QrCode, Clock, Wallet,
  User, Calendar, ChevronRight, CheckCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import { requestCameraPermission, getCurrentPosition, hapticSuccess, hapticError } from '../core/native/capacitor';

interface PartnerScannerProps {
  accessToken: string;
}

type ScanState = 'idle' | 'scanning' | 'validating' | 'valid' | 'invalid' | 'confirming' | 'confirmed';
type ScanMode = 'qr' | 'plate';

interface ValidationResult {
  valid: boolean;
  carPlate?: string;
  tier?: string;
  userName?: string;
  expiresAt?: string;
  error?: string;
  cooldown?: boolean;
  timeLeft?: string;
}

export function PartnerScanner({ accessToken }: PartnerScannerProps) {
  const [state, setState]                       = useState<ScanState>('idle');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [scannedToken, setScannedToken]         = useState<string>('');
  const [confirming, setConfirming]             = useState(false);
  const [cameraError, setCameraError]           = useState<string | null>(null);
  const [scanMode, setScanMode]                 = useState<ScanMode>('qr');
  const [manualPlate, setManualPlate]           = useState('');

  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const lastTokenRef = useRef<string>('');

  const headers = apiHeaders(accessToken);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) { cancelAnimationFrame(scanLoopRef.current); scanLoopRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const validateQR = useCallback(async (token: string) => {
    if (token === lastTokenRef.current) return;
    lastTokenRef.current = token;
    stopCamera();
    setState('validating');
    setScannedToken(token);
    try {
      const res  = await fetch(apiUrl('/partner/qr/validate'), { method: 'POST', headers, body: JSON.stringify({ token }) });
      const data = await res.json();
      setValidationResult(data);
      setState(data.valid ? 'valid' : 'invalid');
      if (data.valid) hapticSuccess(); else hapticError();
    } catch {
      setValidationResult({ valid: false, error: 'Ошибка соединения с сервером' });
      setState('invalid');
    }
  }, [accessToken]);

  const scanLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      scanLoopRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qrCode = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
    if (qrCode?.data && qrCode.data !== lastTokenRef.current) {
      validateQR(qrCode.data);
      return;
    }
    scanLoopRef.current = requestAnimationFrame(scanLoop);
  }, [validateQR]);

  const startCamera = async () => {
    setCameraError(null);
    lastTokenRef.current = '';

    // Request native camera permission before opening stream
    const granted = await requestCameraPermission();
    if (!granted) {
      setCameraError('Нет доступа к камере. Разрешите в настройках устройства.');
      setState('idle');
      return;
    }

    setState('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        videoRef.current.onloadedmetadata = () => {
          scanLoopRef.current = requestAnimationFrame(scanLoop);
        };
      }
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setCameraError('Нет доступа к камере. Разрешите в настройках устройства.');
      } else if (e.name === 'NotFoundError') {
        setCameraError('Камера не найдена на этом устройстве.');
      } else {
        setCameraError(`Ошибка: ${e.message}`);
      }
      setState('idle');
    }
  };

  const confirmWash = async () => {
    if (!scannedToken || !validationResult?.valid) return;
    setConfirming(true);
    setState('confirming');
    let lat: number | undefined, lng: number | undefined;
    const geoPos = await getCurrentPosition();
    if (geoPos) { lat = geoPos.lat; lng = geoPos.lng; }

    try {
      const res = await fetch(apiUrl('/partner/qr/confirm-wash'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ token: scannedToken, lat, lng }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setState('confirmed');
        toast.success(`✅ Мойка подтверждена! ${validationResult.carPlate}`);
      } else {
        toast.error(data.error || 'Ошибка подтверждения');
        setState('invalid');
        setValidationResult({ valid: false, error: data.error });
      }
    } catch {
      toast.error('Ошибка соединения');
      setState('invalid');
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setState('idle');
    setValidationResult(null);
    setScannedToken('');
    lastTokenRef.current = '';
    stopCamera();
  };

  const checkByPlate = async () => {
    if (!manualPlate.trim()) return;
    setState('validating');
    try {
      const res  = await fetch(apiUrl('/partner/qr/validate-plate'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ carPlate: manualPlate.trim().toUpperCase() }),
      });
      const data = await res.json();
      setValidationResult(data);
      setState(data.valid ? 'valid' : 'invalid');
    } catch {
      setValidationResult({ valid: false, error: 'Ошибка соединения' });
      setState('invalid');
    }
  };

  const tierStyle = (tier?: string) =>
    tier === 'business'
      ? { bg: '#f5f3ff', color: '#7c3aed', label: 'Business · Такси' }
      : { bg: '#eff6ff', color: '#2563eb', label: 'Personal' };

  return (
    <div className="space-y-3">

      {/* ── Mode switcher ──────────────────────────────────────────── */}
      <div
        className="flex p-1 rounded-2xl"
        style={{ background: '#f1f5f9' }}
      >
        {([
          { id: 'qr',    label: 'QR‑код',     Icon: QrCode   },
          { id: 'plate', label: 'Госномер',    Icon: ScanLine },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setScanMode(id); reset(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: scanMode === id ? '#fff' : 'transparent',
              color: scanMode === id ? '#2563eb' : '#94a3b8',
              boxShadow: scanMode === id ? '0 1px 6px rgba(0,0,0,0.10)' : 'none',
              minHeight: 0,
            }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════
          QR MODE
      ════════════════════════════════════════════════════════════ */}
      <AnimatePresence mode="wait">
      {scanMode === 'qr' && (
        <motion.div
          key="qr-mode"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {/* Camera view */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: '#0f172a',
              aspectRatio: '1/1',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            }}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              style={{ display: state === 'scanning' ? 'block' : 'none' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Idle */}
            <AnimatePresence>
            {state === 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              >
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(37,99,235,0.25)', border: '2px solid rgba(37,99,235,0.4)' }}
                >
                  <QrCode className="w-10 h-10 text-blue-300" />
                </div>
                <p className="text-slate-400 text-sm font-medium">Нажмите «Сканировать»</p>
              </motion.div>
            )}

            {/* Scanning */}
            {state === 'scanning' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
              >
                {/* Corner brackets */}
                <div className="relative w-56 h-56">
                  {[
                    'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl',
                    'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl',
                    'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl',
                    'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl',
                  ].map((c, i) => (
                    <div key={i} className={`absolute w-10 h-10 border-blue-400 ${c}`} />
                  ))}
                  {/* Scan line */}
                  <motion.div
                    className="absolute inset-x-0 h-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)' }}
                    animate={{ top: ['10%', '90%', '10%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <p className="absolute bottom-4 text-blue-300 text-xs font-medium">
                  Наведите на QR‑код клиента
                </p>
              </motion.div>
            )}

            {/* Validating */}
            {(state === 'validating' || state === 'confirming') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(4px)' }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 rounded-full border-4 border-blue-400 border-t-transparent"
                />
                <p className="text-white text-sm font-medium">
                  {state === 'confirming' ? 'Подтверждение…' : 'Проверка подписки…'}
                </p>
              </motion.div>
            )}

            {/* Valid */}
            {state === 'valid' && validationResult?.valid && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(5,46,22,0.82)', backdropFilter: 'blur(4px)' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                >
                  <CheckCircle2 className="w-20 h-20 text-green-400" />
                </motion.div>
                <p className="text-white font-black text-xl">Активна</p>
                <p className="text-green-300 font-mono font-bold tracking-widest text-lg">
                  {validationResult.carPlate}
                </p>
              </motion.div>
            )}

            {/* Invalid */}
            {state === 'invalid' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(69,0,0,0.82)', backdropFilter: 'blur(4px)' }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                >
                  <XCircle className="w-20 h-20 text-red-400" />
                </motion.div>
                <p className="text-white font-black text-xl">Недействителен</p>
                <p className="text-red-300 text-sm px-6 text-center">{validationResult?.error}</p>
              </motion.div>
            )}

            {/* Confirmed */}
            {state === 'confirmed' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(5,46,22,0.9)' }}
              >
                <motion.div
                  animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 0.6 }}
                >
                  <CheckCheck className="w-20 h-20 text-green-400" />
                </motion.div>
                <p className="text-white font-black text-xl">Мойка записана!</p>
                <p className="text-green-300 font-mono tracking-widest">{validationResult?.carPlate}</p>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Camera error */}
          {cameraError && (
            <div
              className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{cameraError}</p>
            </div>
          )}

          {/* Validation detail card */}
          <AnimatePresence>
          {(state === 'valid' || state === 'confirmed') && validationResult?.valid && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: '2px solid #bbf7d0', background: '#f0fdf4' }}
            >
              {/* Car plate header */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: state === 'confirmed' ? '#16a34a' : '#22c55e', color: '#fff' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.25)' }}>
                    <Car className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-black text-lg tracking-widest">{validationResult.carPlate}</span>
                </div>
                <span
                  className="text-xs font-black px-2.5 py-1 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.25)',
                    color: '#fff',
                  }}
                >
                  {tierStyle(validationResult.tier).label}
                </span>
              </div>

              {/* Details */}
              <div className="px-4 py-3 space-y-2">
                {[
                  { icon: Shield,   label: 'Подписка', value: 'Активна ✓' },
                  { icon: Wallet,   label: 'Тариф',    value: tierStyle(validationResult.tier).label },
                  { icon: Clock,    label: 'Статус',   value: state === 'confirmed' ? 'Мойка записана' : 'Доступна мойка' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-xs text-gray-500">{label}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Cooldown warning */}
          {state === 'invalid' && validationResult?.cooldown && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
            >
              <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">Кулдаун активен</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Следующая мойка через: <span className="font-black">{validationResult.timeLeft}</span>
                </p>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Action buttons */}
          <div className="space-y-2">
            {state === 'idle' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={startCamera}
                className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5"
                style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)', minHeight: 0 }}
              >
                <Camera className="w-5 h-5" />
                Начать сканирование
              </motion.button>
            )}

            {state === 'scanning' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ background: '#f1f5f9', color: '#64748b', minHeight: 0 }}
              >
                <StopCircle className="w-4 h-4" />
                Остановить
              </motion.button>
            )}

            {state === 'valid' && (
              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={confirmWash}
                  disabled={confirming}
                  className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 4px 16px rgba(22,163,74,0.35)', minHeight: 0 }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Подтвердить мойку
                </motion.button>
                <button
                  onClick={reset}
                  className="w-full py-3 rounded-2xl text-sm font-medium"
                  style={{ background: '#f1f5f9', color: '#64748b', minHeight: 0 }}
                >
                  Отмена
                </button>
              </div>
            )}

            {(state === 'invalid' || state === 'confirmed') && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={reset}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', minHeight: 0 }}
              >
                <RefreshCw className="w-4 h-4" />
                {state === 'confirmed' ? 'Следующий клиент' : 'Попробовать снова'}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* ════════════════════════════════════════════════════════════
          PLATE MODE
      ════════════════════════════════════════════════════════════ */}
      {scanMode === 'plate' && (
        <motion.div
          key="plate-mode"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {/* Plate input */}
          <div
            className="rounded-2xl p-5"
            style={{ background: '#fff', border: '1px solid #eaeaec', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: '#eff6ff' }}
              >
                <Shield className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900">Проверка по номеру</p>
                <p className="text-[11px] text-gray-400">Введите госномер автомобиля</p>
              </div>
            </div>
            <input
              type="text"
              value={manualPlate}
              onChange={e => setManualPlate(e.target.value.toUpperCase())}
              placeholder="30 A 777 AA"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-4 font-mono text-xl text-center tracking-[0.3em] focus:border-blue-500 focus:outline-none transition-colors bg-gray-50"
              maxLength={11}
              onKeyDown={e => e.key === 'Enter' && checkByPlate()}
            />
            <p className="text-[11px] text-gray-400 text-center mt-2">
              Пример: <span className="font-mono font-semibold">01 A 123 AA</span>
            </p>
          </div>

          {/* Validating overlay */}
          {state === 'validating' && (
            <div className="flex items-center justify-center gap-3 py-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 rounded-full border-3 border-blue-500 border-t-transparent"
                style={{ borderWidth: 3 }}
              />
              <p className="text-gray-600 text-sm">Проверяем…</p>
            </div>
          )}

          {/* Result */}
          <AnimatePresence>
          {(state === 'valid' || state === 'confirmed') && validationResult?.valid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: '2px solid #bbf7d0', background: '#f0fdf4' }}
            >
              <div className="px-4 py-3" style={{ background: '#22c55e' }}>
                <div className="flex items-center justify-between">
                  <span className="text-white font-mono font-black text-xl tracking-widest">{validationResult.carPlate}</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                    {tierStyle(validationResult.tier).label}
                  </span>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-green-700 font-bold text-sm">✓ Подписка активна — мойка доступна</p>
              </div>
            </motion.div>
          )}

          {state === 'invalid' && validationResult && !validationResult.valid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: '#fff1f2', border: '1px solid #fecaca' }}
            >
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">
                  {validationResult.cooldown ? 'Кулдаун активен' : 'Нет активной подписки'}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {validationResult.cooldown
                    ? `Следующая мойка через: ${validationResult.timeLeft}`
                    : validationResult.error || 'Подписка не найдена для этого номера'}
                </p>
              </div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="space-y-2">
            {(state === 'idle' || state === 'invalid') && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={checkByPlate}
                disabled={!manualPlate.trim()}
                className="w-full py-4 rounded-2xl text-white font-black text-base disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', minHeight: 0 }}
              >
                <Shield className="w-5 h-5" />
                Проверить подписку
              </motion.button>
            )}

            {state === 'valid' && (
              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={confirmWash}
                  disabled={confirming}
                  className="w-full py-4 rounded-2xl text-white font-black text-base disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', minHeight: 0 }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Подтвердить мойку
                </motion.button>
                <button onClick={reset} className="w-full py-3 rounded-2xl text-sm font-medium" style={{ background: '#f1f5f9', color: '#64748b', minHeight: 0 }}>
                  Отмена
                </button>
              </div>
            )}

            {state === 'confirmed' && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { reset(); setManualPlate(''); }}
                className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', minHeight: 0 }}
              >
                <RefreshCw className="w-4 h-4" />
                Следующий клиент
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

