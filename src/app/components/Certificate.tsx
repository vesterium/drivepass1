import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Shield, Award, Share2, Download, CheckCircle2, Car, Calendar, Star, QrCode, Copy } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { BRAND } from '../constants/branding';
import { apiHeaders } from '../utils/apiClient';

interface CertificateProps {
  accessToken: string;
  user: any;
  onBack: () => void;
}

interface CertData {
  userName: string;
  carPlate: string;
  totalWashes: number;
  frugalityScore: number;
  loyaltyTier: string;
  subscriptionTier: string;
  memberSince: string;
  lastWash: string | null;
  certId: string;
  generatedAt: string;
}

export function Certificate({ accessToken, user, onBack }: CertificateProps) {
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);
  const certRef = useRef<HTMLDivElement>(null);

  const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;
  const headers = apiHeaders(accessToken);

  useEffect(() => {
    fetch(`${API}/certificate`, { headers })
      .then(r => r.json())
      .then(d => { if (d.certificate) setCert(d.certificate); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleShare = async () => {
    const text = `🚗 DrivePass+ Сертификат\n\nАвтомобиль: ${cert?.carPlate}\nИндекс бережливости: ${cert?.frugalityScore}/100\nВсего моек: ${cert?.totalWashes}\nID: ${cert?.certId}\n\nПроверьте на drivepass.uz`;
    if (navigator.share) {
      try { await navigator.share({ title: 'DrivePass+ Сертификат', text }); }
      catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Ссылка скопирована!');
    }
  };

  const handleCopyId = () => {
    if (cert?.certId) {
      navigator.clipboard.writeText(cert.certId);
      toast.success('ID скопирован!');
    }
  };

  const tierGradient: Record<string, string> = {
    bronze: 'from-amber-500 to-orange-600',
    silver: 'from-gray-400 to-slate-500',
    gold: 'from-yellow-400 to-amber-500',
    platinum: 'from-purple-500 to-indigo-600',
  };

  const tierLabel: Record<string, string> = {
    bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
  };

  const scoreGrad = (cert?.frugalityScore ?? 0) >= 80
    ? 'from-emerald-400 to-green-600'
    : (cert?.frugalityScore ?? 0) >= 60
    ? 'from-blue-400 to-indigo-600'
    : 'from-yellow-400 to-orange-500';

  const memberSince = cert?.memberSince
    ? new Date(cert.memberSince).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : '';

  const lastWash = cert?.lastWash
    ? new Date(cert.lastWash).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Нет данных';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Генерация сертификата...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-8">
      {/* Nav */}
      <div className="px-5 pt-10 pb-4 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>
        <button onClick={handleShare} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-colors text-sm">
          <Share2 className="w-4 h-4" />
          Поделиться
        </button>
      </div>

      {/* Certificate Card */}
      <div className="px-5 mb-6" ref={certRef}>
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Certificate header */}
          <div className={`bg-gradient-to-r ${tierGradient[cert?.loyaltyTier ?? 'bronze']} p-6 relative overflow-hidden`}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="absolute border border-white rounded-full"
                  style={{ width: (i + 1) * 60, height: (i + 1) * 60, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
              ))}
            </div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-white" />
                  <span className="text-white font-bold text-lg">{BRAND.name}</span>
                </div>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {tierLabel[cert?.loyaltyTier ?? 'bronze']} Member
                </span>
              </div>
              <h2 className="text-white text-xl font-black mb-1">СЕРТИФИКАТ УХОДА</h2>
              <p className="text-white/70 text-sm">Verified Car Care Certificate</p>
            </div>
          </div>

          {/* Car info */}
          <div className="px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Автомобиль</p>
                <p className="text-white font-black text-2xl font-mono tracking-widest">
                  {cert?.carPlate || user?.user_metadata?.car_number || '—'}
                </p>
                <p className="text-white/60 text-sm">{cert?.userName || user?.user_metadata?.name}</p>
              </div>
            </div>
          </div>

          {/* Score + Stats */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${scoreGrad} mb-2`}>
                  <span className="text-white font-black text-xl">{cert?.frugalityScore ?? 0}</span>
                </div>
                <p className="text-white/50 text-xs">Индекс</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 mb-2">
                  <span className="text-blue-300 font-black text-xl">{cert?.totalWashes ?? 0}</span>
                </div>
                <p className="text-white/50 text-xs">Моек</p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/30 mb-2">
                  <Star className="w-6 h-6 text-purple-300" />
                </div>
                <p className="text-white/50 text-xs">{tierLabel[cert?.loyaltyTier ?? 'bronze']}</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 mb-5">
              {[
                { label: 'Член с', value: memberSince },
                { label: 'Последняя мойка', value: lastWash },
                { label: 'Тариф', value: cert?.subscriptionTier === 'personal' ? 'Personal' : cert?.subscriptionTier === 'business' ? 'Business' : 'Активен' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-white/40 text-sm">{item.label}</span>
                  <span className="text-white text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Verified badge */}
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-2xl p-3">
              <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-green-400 font-semibold text-sm">Верифицировано DrivePass+</p>
                <p className="text-green-300/60 text-xs">Данные подтверждены блокчейн-записями</p>
              </div>
            </div>
          </div>

          {/* Certificate ID */}
          <div className="px-6 pb-6">
            <button
              onClick={handleCopyId}
              className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-2xl px-4 py-3 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-white/40" />
                <div className="text-left">
                  <p className="text-white/40 text-xs">Certificate ID</p>
                  <p className="text-white font-mono font-bold text-sm">{cert?.certId || '—'}</p>
                </div>
              </div>
              <Copy className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="px-5 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Зачем нужен сертификат?
          </h3>
          <div className="space-y-3">
            {[
              { icon: '🚗', text: 'При продаже авто: подтверждает регулярный уход и повышает стоимость на 5–15%' },
              { icon: '🏦', text: 'Для автокредита: банки видят ответственный подход владельца' },
              { icon: '🛡️', text: 'Для страховки: доказательство хорошего состояния ТС' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 text-sm text-white/70">
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Share button */}
      <div className="px-5">
        <button
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95"
        >
          <Share2 className="w-5 h-5" />
          Отправить покупателю
        </button>
      </div>
    </div>
  );
}
