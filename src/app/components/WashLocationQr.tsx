/**
 * WashLocationQr — DrivePass+ (partner dashboard)
 *
 * The QR a partner prints and sticks up at the wash itself -- fetched from
 * GET /partner/wash-qr (a signed, non-expiring token, see app/core/security.py's
 * create_checkin_token). Clients scan this with their own phone to charge a wash
 * instantly (ClientWashScanner.tsx / app/services/visits.py's scan_wash_qr) -- this is
 * what replaced staff scanning the client's own subscription QR in the "Сканер" tab.
 */

import { useState, useEffect } from 'react';
import { Download, MapPin } from 'lucide-react';
import { apiHeaders, apiUrl } from '../utils/apiClient';

interface WashLocationQrProps {
  accessToken: string;
}

export function WashLocationQr({ accessToken }: WashLocationQrProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl('/partner/wash-qr'), { headers: apiHeaders(accessToken) })
      .then(res => (res.ok ? res.blob() : Promise.reject()))
      .then(
        blob =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      )
      .then(dataUrl => { if (!cancelled) setQrDataUrl(dataUrl); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);

  return (
    <div
      className="rounded-2xl p-5 text-center"
      style={{ background: '#fff', border: '1px solid #eaeaec', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-center justify-center gap-2 mb-3">
        <MapPin className="w-4 h-4" style={{ color: '#007AFF' }} />
        <p className="text-[15px] text-gray-900" style={{ fontWeight: 700 }}>QR для мойки</p>
      </div>
      <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
        Распечатайте и наклейте у входа — клиенты сканируют его сами, мойка списывается
        автоматически, без вашего участия.
      </p>

      <div className="flex justify-center mb-4">
        {loading ? (
          <div className="w-[190px] h-[190px] rounded-2xl animate-pulse" style={{ background: '#f1f5f9' }} />
        ) : qrDataUrl ? (
          <div className="p-3 rounded-2xl border-2 border-blue-100 bg-white">
            <img src={qrDataUrl} alt="QR для мойки" width={190} height={190} />
          </div>
        ) : (
          <p className="text-[13px] text-red-500 py-8">Не удалось загрузить QR. Попробуйте обновить страницу.</p>
        )}
      </div>

      {qrDataUrl && (
        <a
          href={qrDataUrl}
          download="drivepass-wash-qr.png"
          className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
        >
          <Download className="w-4 h-4" />
          Скачать для печати
        </a>
      )}
    </div>
  );
}
