/**
 * SelfServiceVisitModal — DrivePass+
 *
 * Self-service (unstaffed) car washes have no one to scan a QR, so the client submits
 * GPS + a photo instead. The owner reviews it manually in Telegram (same trust model
 * SubscriptionModal already uses for card payments) -- there's no automatic approval,
 * so this never shows a fake instant "success" screen, only "ждём подтверждения".
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, MapPin, Loader2, Clock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import { getCurrentPosition } from '../core/native/capacitor';

interface SelfServiceVisitModalProps {
  accessToken: string | null;
  partnerId: string;
  partnerName: string;
  onClose: () => void;
}

type Step = 'capture' | 'submitting' | 'pending';

interface PendingVisit {
  id: string;
  partnerName: string;
  status: string;
}

export function SelfServiceVisitModal({ accessToken, partnerId, partnerName, onClose }: SelfServiceVisitModalProps) {
  const [step, setStep] = useState<Step>('capture');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pendingVisit, setPendingVisit] = useState<PendingVisit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // A visit can sit pending for a while -- restore that state instead of letting the
  // client re-submit a second one (the backend blocks that anyway).
  useEffect(() => {
    if (!accessToken) return;
    fetch(apiUrl('/visits/self-service/pending'), { headers: apiHeaders(accessToken) })
      .then(r => (r.ok ? r.json() : null))
      .then((data: PendingVisit | null) => {
        if (data) {
          setPendingVisit(data);
          setStep('pending');
        }
      })
      .catch(() => {});
  }, [accessToken]);

  const handlePickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleLocate = async () => {
    setLocating(true);
    const pos = await getCurrentPosition();
    setLocating(false);
    if (!pos) {
      toast.error('Не удалось определить местоположение. Разрешите доступ к геолокации.');
      return;
    }
    setCoords(pos);
  };

  const handleSubmit = async () => {
    if (!photo || !coords || !accessToken) return;
    setStep('submitting');
    try {
      const form = new FormData();
      form.append('partnerId', partnerId);
      form.append('lat', String(coords.lat));
      form.append('lng', String(coords.lng));
      form.append('photo', photo);

      // No Content-Type header here on purpose -- apiHeaders() always sets
      // application/json, but a multipart body needs the browser to generate its own
      // Content-Type with the correct boundary, which it only does when the header is
      // left unset entirely.
      const res = await fetch(apiUrl('/visits/self-service'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Не удалось отправить заявку');
        setStep('capture');
        return;
      }
      setPendingVisit(data);
      setStep('pending');
    } catch {
      toast.error('Ошибка сети. Попробуйте снова.');
      setStep('capture');
    }
  };

  const canSubmit = !!photo && !!coords;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="selfservice-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed flex items-end justify-center z-[9999]"
        style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget && step !== 'submitting') onClose(); }}
      >
        <motion.div
          key="selfservice-panel"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.85 }}
          className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '92vh' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-6 pt-2 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'capture'    && 'Отметить мойку'}
              {step === 'submitting' && 'Отправка…'}
              {step === 'pending'    && 'Ждём подтверждения'}
            </h2>
            {step !== 'submitting' && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                style={{ minHeight: 0 }}
              >
                <X className="w-4 h-4 text-gray-600" />
              </motion.button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 76px)' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="px-6 py-5"
              >
                {step === 'capture' && (
                  <div className="space-y-5">
                    <p className="text-sm text-gray-500">
                      {partnerName} — самообслуживание. Сфотографируйте машину у поста и подтвердите геолокацию, владелец проверит и подтвердит визит.
                    </p>

                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePickPhoto} className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full rounded-2xl p-4 text-left flex items-center gap-3 transition-all overflow-hidden"
                      style={{ border: `2px solid ${photo ? '#3b82f6' : '#e5e7eb'}`, background: photo ? '#eff6ff' : '#fff' }}
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Camera className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{photo ? 'Фото готово' : 'Сделать фото'}</p>
                        <p className="text-xs text-gray-500">Машина у поста мойки</p>
                      </div>
                    </button>

                    <button
                      onClick={handleLocate}
                      disabled={locating}
                      className="w-full rounded-2xl p-4 text-left flex items-center gap-3 transition-all"
                      style={{ border: `2px solid ${coords ? '#3b82f6' : '#e5e7eb'}`, background: coords ? '#eff6ff' : '#fff' }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        {locating ? <Loader2 className="w-5 h-5 text-gray-500 animate-spin" /> : <MapPin className={`w-5 h-5 ${coords ? 'text-blue-600' : 'text-gray-500'}`} />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{coords ? 'Геолокация определена' : 'Определить геолокацию'}</p>
                        <p className="text-xs text-gray-500">Подтвердит, что вы на месте</p>
                      </div>
                    </button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
                    >
                      Отправить на проверку
                    </motion.button>
                  </div>
                )}

                {step === 'submitting' && (
                  <div className="py-14 flex justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                )}

                {step === 'pending' && (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5"
                    >
                      <Clock className="w-10 h-10 text-amber-600" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ждём подтверждения владельца</h3>
                    <p className="text-gray-500 text-sm mb-5">
                      {pendingVisit?.partnerName || partnerName} — владелец проверит фото и подтвердит визит вручную. Обычно это занимает немного времени.
                    </p>
                    <button
                      onClick={onClose}
                      className="w-full border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold"
                    >
                      Понятно
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
