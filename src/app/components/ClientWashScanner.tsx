/**
 * ClientWashScanner — DrivePass+
 *
 * The client-side flip of PartnerScanner.tsx: staff no longer scan the client's
 * subscription QR (that flow — QRDisplay.tsx / PartnerScanner.tsx — is left in the codebase
 * unused rather than deleted, in case a partner ever wants staff-assisted mode back). Instead
 * a signed QR is printed and stuck up at the wash itself (see PartnerDashboard's "QR для
 * мойки" tab / GET /partner/wash-qr), and the CLIENT scans it with their own phone. No staff
 * device, no admin app needed at all -- same automatic, no-human-in-the-loop check-in model
 * real unstaffed venues use (1fit, ClassPass, gym door access). GPS geofencing (150m) plus
 * the existing per-car cooldown/daily-limit checks are what bound abuse, not a person
 * reviewing anything — see app/services/visits.py's scan_wash_qr on the backend.
 *
 * Two ways in:
 *  - In-app: tap "Сканировать QR мойки" here, camera decodes the QR text directly, submit
 *    happens without ever leaving the Mini App.
 *  - Outside Telegram (stock camera app scans the printed sign): the QR encodes a t.me deep
 *    link, the client bot's /start handler replies with an "Open DrivePass+" button whose
 *    URL carries `?checkin=<token>` — App.tsx reads that on load and hands it to us as
 *    `initialToken`, skipping the camera step and going straight to GPS + submit.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CheckCircle2, XCircle, StopCircle, RefreshCw, MapPin, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsQR from 'jsqr';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import { requestCameraPermission, getCurrentPosition, hapticSuccess, hapticError } from '../core/native/capacitor';
import { canUseNativeQrScan, scanQrNative, closeNativeQrScan } from '../core/native/telegram';

interface ClientWashScannerProps {
  accessToken: string;
  initialToken?: string | null;
  onTokenConsumed?: () => void;
}

type ScanState = 'idle' | 'scanning' | 'submitting' | 'success' | 'error';

interface ScanResult {
  error?: string;
  partnerName?: string;
  remaining?: number;
}

/** A QR posted at the wash can encode either the bare token or the full t.me deep link
 * (`https://t.me/<bot>?start=checkin_<id>_<sig>`) -- both forms come out of this the same. */
function extractCheckinToken(raw: string): string | null {
  let text = raw.trim();
  if (text.includes('start=')) text = text.split('start=').pop()!;
  const qIndex = text.indexOf('?checkin=');
  if (qIndex !== -1) text = text.slice(qIndex + 9);
  return text.startsWith('checkin_') ? text : null;
}

export function ClientWashScanner({ accessToken, initialToken, onTokenConsumed }: ClientWashScannerProps) {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const submittedRef = useRef(false);

  const headers = apiHeaders(accessToken);

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) { cancelAnimationFrame(scanLoopRef.current); scanLoopRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    closeNativeQrScan();
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const submitToken = useCallback(async (token: string) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    stopCamera();
    setState('submitting');

    const geoPos = await getCurrentPosition();
    if (!geoPos) {
      hapticError();
      setResult({ error: 'Нужна геолокация — разрешите доступ к местоположению и попробуйте снова.' });
      setState('error');
      submittedRef.current = false;
      return;
    }

    try {
      const res = await fetch(apiUrl('/visits/scan'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ token, lat: geoPos.lat, lng: geoPos.lng }),
      });
      const data = await res.json();
      if (data.success) {
        hapticSuccess();
        setResult({ partnerName: data.partnerName, remaining: data.remaining });
        setState('success');
      } else {
        hapticError();
        setResult({ error: data.error || 'Не удалось списать мойку.' });
        setState('error');
      }
    } catch {
      hapticError();
      setResult({ error: 'Ошибка соединения с сервером.' });
      setState('error');
    } finally {
      submittedRef.current = false;
      onTokenConsumed?.();
    }
  }, [headers, stopCamera, onTokenConsumed]);

  // Arrived via the t.me deep-link fallback (outside Telegram's in-app scan) -- skip the
  // camera entirely, go straight to GPS + submit.
  useEffect(() => {
    if (initialToken) submitToken(initialToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialToken]);

  const handleDecoded = useCallback((raw: string) => {
    const token = extractCheckinToken(raw);
    if (!token) return; // not our QR -- keep scanning
    submitToken(token);
  }, [submitToken]);

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
    if (qrCode?.data) {
      handleDecoded(qrCode.data);
      return;
    }
    scanLoopRef.current = requestAnimationFrame(scanLoop);
  }, [handleDecoded]);

  const startCamera = async () => {
    setCameraError(null);

    if (canUseNativeQrScan()) {
      setState('scanning');
      scanQrNative(handleDecoded, 'Наведите на QR-код на мойке');
      return;
    }

    const granted = await requestCameraPermission();
    if (!granted) {
      setCameraError('Нет доступа к камере. Разрешите в настройках устройства.');
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
      setCameraError(
        e.name === 'NotAllowedError'
          ? 'Нет доступа к камере. Разрешите в настройках устройства.'
          : e.name === 'NotFoundError'
            ? 'Камера не найдена на этом устройстве.'
            : `Ошибка: ${e.message}`,
      );
      setState('idle');
    }
  };

  const reset = () => {
    stopCamera();
    setResult(null);
    setCameraError(null);
    setState('idle');
  };

  return (
    <div className="px-5 pb-4 space-y-3">
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: '#0f172a', aspectRatio: '1/1', boxShadow: '0 4px 24px rgba(0,0,0,0.25)' }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{ display: state === 'scanning' ? 'block' : 'none' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
            >
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(37,99,235,0.25)', border: '2px solid rgba(37,99,235,0.4)' }}
              >
                <Camera className="w-10 h-10 text-blue-300" />
              </div>
              <p className="text-slate-400 text-sm font-medium">QR-код наклеен прямо на мойке</p>
            </motion.div>
          )}

          {state === 'scanning' && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              <div className="relative w-56 h-56">
                {[
                  'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl',
                  'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl',
                  'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl',
                  'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl',
                ].map((c, i) => (
                  <div key={i} className={`absolute w-10 h-10 border-blue-400 ${c}`} />
                ))}
                <motion.div
                  className="absolute inset-x-0 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #3b82f6, transparent)' }}
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <p className="absolute bottom-4 text-blue-300 text-xs font-medium">Наведите на QR-код на мойке</p>
            </motion.div>
          )}

          {state === 'submitting' && (
            <motion.div
              key="submitting"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(4px)' }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 rounded-full border-4 border-blue-400 border-t-transparent"
              />
              <div className="flex items-center gap-1.5 text-blue-200 text-sm font-medium">
                <MapPin className="w-4 h-4" />
                Проверяем геолокацию…
              </div>
            </motion.div>
          )}

          {state === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
              style={{ background: 'rgba(5,46,22,0.88)', backdropFilter: 'blur(4px)' }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                <CheckCircle2 className="w-20 h-20 text-green-400" />
              </motion.div>
              <p className="text-white font-black text-xl">Мойка засчитана!</p>
              {result?.partnerName && <p className="text-green-300 text-sm">{result.partnerName}</p>}
              {typeof result?.remaining === 'number' && (
                <p className="text-green-200 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Осталось моек: {result.remaining}
                </p>
              )}
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
              style={{ background: 'rgba(69,0,0,0.82)', backdropFilter: 'blur(4px)' }}
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
                <XCircle className="w-20 h-20 text-red-400" />
              </motion.div>
              <p className="text-white font-black text-xl">Не получилось</p>
              <p className="text-red-300 text-sm">{result?.error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {cameraError && (
        <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <XCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-200">{cameraError}</p>
        </div>
      )}

      <div className="space-y-2">
        {state === 'idle' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startCamera}
            className="w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-center gap-2.5"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)', minHeight: 0 }}
          >
            <Camera className="w-5 h-5" />
            Сканировать QR мойки
          </motion.button>
        )}

        {state === 'scanning' && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={reset}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 text-white"
            style={{ background: 'rgba(255,255,255,0.1)', minHeight: 0 }}
          >
            <StopCircle className="w-4 h-4" />
            Остановить
          </motion.button>
        )}

        {(state === 'success' || state === 'error') && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={reset}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', minHeight: 0 }}
          >
            <RefreshCw className="w-4 h-4" />
            {state === 'success' ? 'Ещё одна мойка' : 'Попробовать снова'}
          </motion.button>
        )}
      </div>
    </div>
  );
}
