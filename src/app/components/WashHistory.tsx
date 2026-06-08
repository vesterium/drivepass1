import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Clock, TrendingUp, Zap, Car, CheckCircle2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { apiHeaders, apiUrl } from '../utils/apiClient';

interface WashHistoryProps {
  onBack: () => void;
  accessToken: string | null;
}

interface Wash {
  id: string;
  carPlate?: string;
  partnerName?: string;
  locationName?: string;
  tier?: string;
  fraudFlag?: boolean;
  createdAt: string;
}

export function WashHistory({ onBack, accessToken }: WashHistoryProps) {
  const { t } = useLanguage();
  const [washes, setWashes] = useState<Wash[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (accessToken) fetchWashes();
  }, [accessToken]);

  const fetchWashes = async () => {
    try {
      const response = await fetch(
        apiUrl('/washes'),
        { headers: apiHeaders(accessToken) }
      );
      const data = await response.json();
      const sorted = (data.washes || []).sort((a: Wash, b: Wash) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setWashes(sorted);
    } catch (error) {
      console.error('Failed to fetch washes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real stats from actual data
  const totalWashes = washes.length;
  const savedPerWash = 50000; // avg single wash price
  const subscriptionCost = 220000;
  const totalSaved = Math.max(0, totalWashes * savedPerWash - subscriptionCost);
  const lastWash = washes[0];
  const tierMap: Record<string, string> = { personal: 'Personal', business: 'Business' };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 pt-10 pb-10">
        <button onClick={onBack} className="flex items-center gap-2 mb-5 text-blue-200 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>
        <h1 className="text-2xl font-black mb-1">{t('history.title')}</h1>
        <p className="text-blue-200 text-sm">Все ваши мойки в одном месте</p>
      </header>

      {/* Stats */}
      <div className="px-5 -mt-6 mb-5">
        <div className="bg-white rounded-3xl shadow-xl p-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Car className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">{totalWashes}</p>
              <p className="text-xs text-gray-500">Моек</p>
            </div>
            <div className="text-center border-l border-r border-gray-100">
              <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">
                {totalWashes > 0 ? `${Math.round(totalSaved / 1000)}k` : '—'}
              </p>
              <p className="text-xs text-gray-500">Сум сэкономлено</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-gray-900">{totalWashes * 10}</p>
              <p className="text-xs text-gray-500">Баллов</p>
            </div>
          </div>

          {lastWash && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500 text-xs">Последняя мойка</p>
                <p className="text-gray-800 text-sm font-medium">
                  {formatDate(lastWash.createdAt)} в {formatTime(lastWash.createdAt)}
                  {lastWash.partnerName && ` · ${lastWash.partnerName}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History list */}
      <div className="px-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800">История ({totalWashes})</h2>
          {totalWashes > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              +10 баллов за мойку
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : washes.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium mb-1">{t('history.noHistory')}</p>
            <p className="text-gray-400 text-sm">Совершите первую мойку, чтобы увидеть историю</p>
          </div>
        ) : (
          <div className="space-y-3">
            {washes.map((wash, idx) => (
              <div
                key={wash.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                  wash.fraudFlag ? 'border-red-200' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start gap-4 p-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    idx === 0 ? 'bg-blue-600' : 'bg-blue-100'
                  }`}>
                    <Car className={`w-6 h-6 ${idx === 0 ? 'text-white' : 'text-blue-600'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 text-sm">
                        {wash.partnerName || wash.locationName || 'Автомойка'}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-green-600 font-bold text-sm">+10</span>
                        <Zap className="w-3.5 h-3.5 text-yellow-500" />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(wash.createdAt)}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(wash.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {wash.tier && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          wash.tier === 'business'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {tierMap[wash.tier] || wash.tier}
                        </span>
                      )}
                      {wash.carPlate && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
                          {wash.carPlate}
                        </span>
                      )}
                      {idx === 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Последняя
                        </span>
                      )}
                      {wash.fraudFlag && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Подозрительная активность
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Saved amount */}
                <div className="px-4 pb-3">
                  <div className="bg-green-50 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-green-700 text-xs">Экономия за мойку</span>
                    <span className="text-green-700 font-bold text-xs">
                      ~{((savedPerWash - subscriptionCost / 30)).toLocaleString()} сум
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Offline info */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex gap-3 items-center">
            <WifiOff className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-blue-800 font-semibold text-sm">Офлайн поддержка</p>
              <p className="text-blue-600 text-xs mt-0.5">QR-код кешируется локально. Вы можете получить мойку даже при плохом интернете.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
