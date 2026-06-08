import { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import {
  ArrowLeft, Award, Trophy, Gift, TrendingUp, Zap, ShieldCheck,
  Droplets, Sparkles, Clock, ChevronRight, Star, CheckCircle2
} from 'lucide-react';

import { apiHeaders } from '../utils/apiClient';

interface LoyaltyData {
  points: number;
  tier: string;
  history: Array<{
    id: string; points: number; reason: string; type: 'earned' | 'redeemed'; createdAt: string;
  }>;
}

interface Voucher { id: string; type: string; pointsSpent: number; expiresAt: string; createdAt: string; }

interface LoyaltyProps {
  accessToken: string;
  onBack: () => void;
}

const TIER_INFO = {
  bronze: { name: 'Bronze', minPoints: 0, color: 'from-amber-500 to-orange-600', icon: Award },
  silver: { name: 'Silver', minPoints: 2000, color: 'from-gray-400 to-slate-500', icon: Award },
  gold: { name: 'Gold', minPoints: 5000, color: 'from-yellow-400 to-amber-500', icon: Trophy },
  platinum: { name: 'Platinum', minPoints: 10000, color: 'from-purple-500 to-indigo-600', icon: Trophy },
};

// Wash upgrade catalog — баллы как валюта для типов моек
const WASH_UPGRADES = [
  {
    id: 'express_wash', label: 'Экспресс-мойка', sublabel: 'Быстрая мойка в ближайшей точке',
    points: 200, icon: Zap, color: 'bg-blue-100 text-blue-600', location: 'Любая точка DrivePass+'
  },
  {
    id: 'premium_wash', label: 'Премиум-мойка', sublabel: 'Расширенная программа (центр города)',
    points: 500, icon: Star, color: 'bg-purple-100 text-purple-600', location: 'Центральные точки'
  },
  {
    id: 'detailing', label: 'Детейлинг', sublabel: 'Полная полировка и уход',
    points: 1500, icon: Sparkles, color: 'bg-indigo-100 text-indigo-600', location: 'AutoShine Premium'
  },
  {
    id: 'ceramic', label: 'Ceramic Pro', sublabel: 'Нанокерамическое покрытие',
    points: 2000, icon: ShieldCheck, color: 'bg-green-100 text-green-600', location: 'Crystal Auto'
  },
];

const CLASSIC_REWARDS = [
  { id: 'r1', name: 'Бесплатная мойка', points: 500, icon: Droplets },
  { id: 'r2', name: 'Скидка 15%', points: 300, icon: Gift },
  { id: 'r3', name: 'Апгрейд сервиса', points: 700, icon: Trophy },
];

type Tab = 'spend' | 'rewards' | 'history';

export function Loyalty({ accessToken, onBack }: LoyaltyProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('spend');
  const [spending, setSpending] = useState<string | null>(null);

  const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;
  const headers = apiHeaders(accessToken);

  const fetchAll = async () => {
    try {
      const [lRes, vRes] = await Promise.all([
        fetch(`${API}/loyalty/points`, { headers }),
        fetch(`${API}/loyalty/vouchers`, { headers }),
      ]);
      const [lData, vData] = await Promise.all([lRes.json(), vRes.json()]);
      setData(lData);
      setVouchers(vData.vouchers || []);
    } catch (e) {
      console.error('Loyalty load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSpend = async (upgrade: typeof WASH_UPGRADES[0]) => {
    if (!data || data.points < upgrade.points) {
      toast.error(`Нужно ${upgrade.points} баллов, у вас ${data?.points || 0}`);
      return;
    }
    setSpending(upgrade.id);
    try {
      const res = await fetch(`${API}/loyalty/spend-wash`, {
        method: 'POST', headers,
        body: JSON.stringify({ upgradeType: upgrade.id }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Ошибка'); return; }
      toast.success(`✅ ${upgrade.label} куплен! Показан в "Мои Ваучеры"`);
      fetchAll();
    } catch (e) {
      toast.error('Ошибка соединения');
    } finally {
      setSpending(null);
    }
  };

  const handleRedeem = async (reward: typeof CLASSIC_REWARDS[0]) => {
    if (!data || data.points < reward.points) { toast.error('Недостаточно баллов'); return; }
    try {
      const res = await fetch(`${API}/loyalty/redeem`, {
        method: 'POST', headers,
        body: JSON.stringify({ points: reward.points, reward: reward.name }),
      });
      if (!res.ok) throw new Error();
      toast.success(`🎁 "${reward.name}" активирован!`);
      fetchAll();
    } catch { toast.error('Ошибка получения награды'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Загрузка баллов...</p>
        </div>
      </div>
    );
  }

  const points = data?.points || 0;
  const tier = data?.tier || 'bronze';
  const tierInfo = TIER_INFO[tier as keyof typeof TIER_INFO] || TIER_INFO.bronze;
  const tiers = Object.values(TIER_INFO);
  const tierIdx = tiers.findIndex(t => t.name.toLowerCase() === tier);
  const nextTier = tiers[tierIdx + 1];
  const progress = nextTier
    ? Math.min(100, ((points - tierInfo.minPoints) / (nextTier.minPoints - tierInfo.minPoints)) * 100)
    : 100;
  const TierIcon = tierInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className={`bg-gradient-to-br ${tierInfo.color} text-white px-5 pt-10 pb-20`}>
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-white/70 text-sm mb-1">Ваш уровень</p>
            <div className="flex items-center gap-2">
              <TierIcon className="w-7 h-7 text-white" />
              <span className="text-2xl font-black">{tierInfo.name}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black">{points.toLocaleString()}</p>
            <p className="text-white/70 text-sm">баллов</p>
          </div>
        </div>

        {nextTier ? (
          <div>
            <div className="flex items-center justify-between text-xs text-white/70 mb-2">
              <span>{tierInfo.name}</span>
              <span>{nextTier.minPoints - points} до {nextTier.name}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-white font-bold text-sm">💎 Максимальный уровень!</p>
          </div>
        )}
      </header>

      {/* Points value explainer */}
      <div className="px-5 -mt-12 mb-4">
        <div className="bg-white rounded-3xl shadow-xl p-5">
          <p className="text-gray-500 text-xs uppercase tracking-wide mb-3">Стоимость баллов</p>
          <div className="grid grid-cols-4 gap-2">
            {WASH_UPGRADES.map(u => (
              <div key={u.id} className="text-center">
                <div className={`w-10 h-10 ${u.color.split(' ')[0]} rounded-2xl flex items-center justify-center mx-auto mb-1`}>
                  <u.icon className={`w-5 h-5 ${u.color.split(' ')[1]}`} />
                </div>
                <p className="text-gray-900 font-black text-xs">{u.points}</p>
                <p className="text-gray-400 text-[10px]">баллов</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="bg-gray-100 rounded-2xl p-1 flex">
          {([['spend', 'Потратить'], ['rewards', 'Награды'], ['history', 'История']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === id ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Spend tab — баллы как валюта для мойки */}
      {tab === 'spend' && (
        <div className="px-5 space-y-3">
          <p className="text-gray-500 text-sm">Обменяйте баллы на услуги мойки</p>
          {WASH_UPGRADES.map(upgrade => {
            const canAfford = points >= upgrade.points;
            return (
              <div
                key={upgrade.id}
                className={`bg-white rounded-2xl shadow-sm border p-4 transition-all ${canAfford ? 'border-gray-100' : 'border-gray-100 opacity-70'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${upgrade.color.split(' ')[0]} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                    <upgrade.icon className={`w-6 h-6 ${upgrade.color.split(' ')[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{upgrade.label}</p>
                    <p className="text-gray-500 text-xs">{upgrade.sublabel}</p>
                    <p className="text-gray-400 text-xs mt-0.5">📍 {upgrade.location}</p>
                  </div>
                  <button
                    onClick={() => handleSpend(upgrade)}
                    disabled={!canAfford || spending === upgrade.id}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                      canAfford
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {spending === upgrade.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        {upgrade.points}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Active vouchers */}
          {vouchers.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-700 font-bold mb-3">Мои ваучеры ({vouchers.length})</p>
              <div className="space-y-2">
                {vouchers.map(v => {
                  const upg = WASH_UPGRADES.find(u => u.id === v.type);
                  return (
                    <div key={v.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{upg?.label || v.type}</p>
                            <p className="text-gray-400 text-xs">
                              До {new Date(v.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">Активен</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* How to earn */}
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4 mt-2">
            <p className="font-bold text-yellow-900 mb-2">Как копить баллы?</p>
            <div className="space-y-1.5 text-sm text-yellow-800">
              <p>🚗 +10 баллов за каждую мойку</p>
              <p>⭐ +50 баллов за отзыв</p>
              <p>👥 +100 баллов за приглашение друга</p>
              <p>📅 +25 баллов за 30 дней подписки</p>
            </div>
          </div>
        </div>
      )}

      {/* Rewards tab */}
      {tab === 'rewards' && (
        <div className="px-5 space-y-3">
          <p className="text-gray-500 text-sm mb-1">Классические награды</p>
          {CLASSIC_REWARDS.map(reward => {
            const canRedeem = points >= reward.points;
            return (
              <div key={reward.id} className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 ${!canRedeem ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${canRedeem ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <reward.icon className={`w-6 h-6 ${canRedeem ? 'text-blue-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{reward.name}</p>
                    <p className="text-blue-600 text-sm font-semibold">{reward.points} баллов</p>
                  </div>
                  <button
                    onClick={() => handleRedeem(reward)}
                    disabled={!canRedeem}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm ${canRedeem ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}
                  >
                    Получить
                  </button>
                </div>
              </div>
            );
          })}

          {/* Tier progress */}
          <div className="mt-4">
            <p className="text-gray-700 font-bold mb-3">Уровни</p>
            <div className="space-y-2">
              {Object.entries(TIER_INFO).map(([key, info]) => {
                const isActive = key === tier;
                return (
                  <div key={key} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isActive ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-white'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${info.color}`}>
                      <info.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-bold text-sm ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>{info.name}</p>
                      <p className="text-gray-400 text-xs">{info.minPoints.toLocaleString()}+ баллов</p>
                    </div>
                    {isActive && <span className="text-blue-600 font-bold text-xs bg-blue-100 px-2 py-1 rounded-full">Текущий</span>}
                    {points >= info.minPoints && !isActive && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="px-5 space-y-2">
          {(!data?.history || data.history.length === 0) ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">История пуста</p>
              <p className="text-gray-300 text-sm">Совершите первую мойку, чтобы начать копить баллы</p>
            </div>
          ) : (
            [...data.history].reverse().map(entry => (
              <div key={entry.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entry.type === 'earned' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-4 h-4 ${entry.type === 'earned' ? 'text-green-600' : 'text-red-500 rotate-180'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm font-medium truncate">{entry.reason}</p>
                  <p className="text-gray-400 text-xs">{new Date(entry.createdAt).toLocaleDateString('ru-RU')}</p>
                </div>
                <span className={`font-black text-base ${entry.type === 'earned' ? 'text-green-600' : 'text-red-500'}`}>
                  {entry.type === 'earned' ? '+' : ''}{entry.points}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
