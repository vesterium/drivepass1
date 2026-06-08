import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Shield, Award, TrendingUp, Calendar, Car, Star, Download, Share2, Zap } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { apiHeaders } from '../utils/apiClient';

interface FrugalityProps {
  accessToken: string;
  user: any;
  onBack: () => void;
  onViewCertificate: () => void;
}

interface CertData {
  userName: string;
  carPlate: string;
  totalWashes: number;
  frugalityScore: number;
  consistencyScore: number;
  loyaltyPoints: number;
  loyaltyTier: string;
  subscriptionTier: string;
  memberSince: string;
  lastWash: string | null;
  weeklyHeatmap: Record<string, number>;
  certId: string;
  generatedAt: string;
}

function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Отлично' : score >= 60 ? 'Хорошо' : score >= 40 ? 'Средне' : 'Нужно улучшить';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-black text-gray-900">{score}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

function WeeklyHeatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const weeks: Array<{ date: string; count: number }[]> = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 83); // 12 weeks back
  start.setDate(start.getDate() - start.getDay());

  let current = new Date(start);
  while (current <= today) {
    const week: { date: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const key = current.toISOString().split('T')[0];
      week.push({ date: key, count: heatmap[key] || 0 });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-blue-200';
    if (count === 2) return 'bg-blue-400';
    return 'bg-blue-600';
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date}: ${day.count} моек`}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2 items-center mt-2 text-xs text-gray-400">
        <span>Меньше</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-blue-200" />
        <div className="w-3 h-3 rounded-sm bg-blue-400" />
        <div className="w-3 h-3 rounded-sm bg-blue-600" />
        <span>Больше</span>
      </div>
    </div>
  );
}

export function FrugalityIndex({ accessToken, user, onBack, onViewCertificate }: FrugalityProps) {
  const [cert, setCert] = useState<CertData | null>(null);
  const [loading, setLoading] = useState(true);

  const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;
  const headers = apiHeaders(accessToken);

  useEffect(() => {
    fetch(`${API}/certificate`, { headers })
      .then(r => r.json())
      .then(d => { if (d.certificate) setCert(d.certificate); })
      .catch(e => console.error('Certificate load error:', e))
      .finally(() => setLoading(false));
  }, []);

  const tierColors: Record<string, string> = {
    bronze: 'text-amber-700 bg-amber-100',
    silver: 'text-gray-600 bg-gray-100',
    gold: 'text-yellow-700 bg-yellow-100',
    platinum: 'text-purple-700 bg-purple-100',
  };

  const tierLabel: Record<string, string> = {
    bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold', platinum: '💎 Platinum',
  };

  const memberSince = cert?.memberSince
    ? new Date(cert.memberSince).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : '';

  const lastWash = cert?.lastWash
    ? new Date(cert.lastWash).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : 'Нет данных';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Рассчитываем индекс...</p>
        </div>
      </div>
    );
  }

  const score = cert?.frugalityScore ?? 0;
  const scoreColor = score >= 80 ? 'from-green-500 to-emerald-600' : score >= 60 ? 'from-blue-500 to-indigo-600' : score >= 40 ? 'from-yellow-400 to-orange-500' : 'from-red-400 to-rose-500';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className={`bg-gradient-to-br ${scoreColor} text-white px-5 pt-10 pb-16`}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black mb-1">Индекс Бережливости</h1>
            <p className="text-white/80 text-sm">Верифицированная история ухода за авто</p>
          </div>
          <Shield className="w-10 h-10 text-white/60" />
        </div>
      </header>

      {/* Score Card */}
      <div className="px-5 -mt-10 mb-6">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">Ваш индекс</p>
              <p className="text-gray-900 font-bold text-lg">{cert?.userName || user?.user_metadata?.name || 'Пользователь'}</p>
              <p className="font-mono text-blue-600 font-bold">{cert?.carPlate || user?.user_metadata?.car_number || '—'}</p>
              <p className="text-gray-400 text-xs mt-1">С {memberSince}</p>
            </div>
            <ScoreRing score={score} />
          </div>

          {/* Score breakdown */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-blue-700">{cert?.totalWashes ?? 0}</p>
              <p className="text-xs text-blue-500 mt-0.5">Моек</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-green-700">{cert?.consistencyScore ?? 0}%</p>
              <p className="text-xs text-green-500 mt-0.5">Регулярность</p>
            </div>
            <div className="bg-purple-50 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-purple-700">{cert?.loyaltyPoints ?? 0}</p>
              <p className="text-xs text-purple-500 mt-0.5">Баллов</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-5 mb-5">
        <h2 className="text-gray-700 font-bold mb-3">Детали</h2>
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {[
            { icon: Car, label: 'Тариф подписки', value: cert?.subscriptionTier === 'personal' ? 'Personal' : cert?.subscriptionTier === 'business' ? 'Business' : 'Нет подписки', color: 'text-blue-600 bg-blue-100' },
            { icon: Star, label: 'Уровень лояльности', value: tierLabel[cert?.loyaltyTier ?? 'bronze'] || 'Bronze', color: `${tierColors[cert?.loyaltyTier ?? 'bronze']}` },
            { icon: Calendar, label: 'Последняя мойка', value: lastWash, color: 'text-green-600 bg-green-100' },
            { icon: TrendingUp, label: 'Регулярность', value: `${cert?.consistencyScore ?? 0}%`, color: 'text-indigo-600 bg-indigo-100' },
            { icon: Zap, label: 'Баллы DrivePass+', value: `${cert?.loyaltyPoints ?? 0} pts`, color: 'text-yellow-600 bg-yellow-100' },
          ].map((item, i, arr) => (
            <div key={i} className={`flex items-center gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color.split(' ')[1]}`}>
                <item.icon className={`w-5 h-5 ${item.color.split(' ')[0]}`} />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs">{item.label}</p>
                <p className="text-gray-900 font-semibold text-sm">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <div className="px-5 mb-5">
        <h2 className="text-gray-700 font-bold mb-3">Активность моек (12 нед.)</h2>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          {cert?.weeklyHeatmap && Object.keys(cert.weeklyHeatmap).length > 0 ? (
            <WeeklyHeatmap heatmap={cert.weeklyHeatmap} />
          ) : (
            <div className="text-center py-6">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Пока нет данных о мойках</p>
              <p className="text-gray-300 text-xs mt-1">Совершите первую мойку для начала отслеживания</p>
            </div>
          )}
        </div>
      </div>

      {/* What is frugality index */}
      <div className="px-5 mb-5">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Что такое Индекс Бережливости?
          </h3>
          <p className="text-blue-800 text-sm leading-relaxed">
            Это верифицированная метрика качества ухода за вашим автомобилем. Высокий индекс повышает доверие при продаже авто на вторичном рынке — покупатель видит реальную историю обслуживания.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/70 rounded-xl p-2 text-blue-700">🏆 80–100: Идеальный уход</div>
            <div className="bg-white/70 rounded-xl p-2 text-blue-700">✅ 60–79: Хороший уход</div>
            <div className="bg-white/70 rounded-xl p-2 text-blue-700">⚠️ 40–59: Средний уход</div>
            <div className="bg-white/70 rounded-xl p-2 text-blue-700">❌ 0–39: Нужно улучшить</div>
          </div>
        </div>
      </div>

      {/* Certificate button */}
      <div className="px-5">
        <button
          onClick={onViewCertificate}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 shadow-lg"
        >
          <Award className="w-5 h-5" />
          Получить Цифровой Сертификат
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">Поделитесь с потенциальным покупателем</p>
      </div>
    </div>
  );
}
