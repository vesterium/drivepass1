import { useState, useEffect } from 'react';
import {
  MapPin, Navigation, Search, Star, Clock,
  Phone, ChevronRight, CheckCircle2, Wifi,
  Users, Filter, Zap, X, Settings, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { YandexMap, type CarWashMarker } from './YandexMap';
import { SelfServiceVisitModal } from './SelfServiceVisitModal';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import type { CarWashLocation } from '../core/types';

// ─── Highlight matching substring ───────────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <motion.mark
        key={query}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="bg-blue-100 text-blue-800 rounded-[3px] px-0.5 not-italic font-bold"
        style={{ display: 'inline' }}
      >
        {text.slice(idx, idx + query.length)}
      </motion.mark>
      {text.slice(idx + query.length)}
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

interface LocationsProps {
  accessToken?: string | null;
}

type OccupancyMap = Record<string, { percent: number; queueMin: number; status: string }>;

const SERVICE_FILTERS = ['Все', 'Экспресс', 'Стандарт', 'Премиум', 'Детейлинг'];
const CITIES = ['Все', 'Самарканд', 'Ташкент', 'Бухара', 'Наманган', 'Фергана'];


// Map CarWashLocation → CarWashMarker for YandexMap compat
function toMarker(w: CarWashLocation): CarWashMarker {
  return {
    id: w.id,
    name: w.name,
    address: `${w.address}, ${w.city}`,
    lat: w.lat,
    lng: w.lng,
    rating: w.rating,
    openNow: w.openNow,
    hasGreenCorridor: w.hasGreenCorridor,
    drivepassPartner: w.drivepassPartner,
    district: w.district,
    phone: w.phone,
    reviews: w.reviews,
    hours: w.hours,
    distanceKm: w.distanceKm,
    services: w.services,
    selfService: w.selfService,
  };
}

export function Locations({ accessToken = null }: LocationsProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterGreen, setFilterGreen] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('Все');
  const [cityFilter, setCityFilter] = useState('Все');
  const [occupancy] = useState<OccupancyMap>({});
  const [showFilters, setShowFilters] = useState(false);
  const [washes, setWashes] = useState<CarWashLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSelfServiceModal, setShowSelfServiceModal] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/locations'), { headers: apiHeaders(accessToken) })
      .then(r => r.ok ? r.json() : [])
      .then((data: CarWashLocation[]) => setWashes(data))
      .catch(() => setWashes([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const baseWashes = cityFilter === 'Все'
    ? washes
    : washes.filter(w => w.city === cityFilter);

  const filtered = baseWashes.filter(w => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = w.name.toLowerCase().includes(q) || w.address.toLowerCase().includes(q) || w.district.toLowerCase().includes(q) || w.city.toLowerCase().includes(q);
    const matchesOpen = filterOpen ? w.openNow : true;
    const matchesGreen = filterGreen ? w.hasGreenCorridor : true;
    const matchesService = serviceFilter === 'Все' ? true : w.services.includes(serviceFilter);
    return matchesSearch && matchesOpen && matchesGreen && matchesService;
  });

  const activeFilterCount = [filterOpen, filterGreen, serviceFilter !== 'Все', cityFilter !== 'Все'].filter(Boolean).length;

  const mapMarkers = filtered.map(toMarker);

  const selectedWash = washes.find(w => w.id === selectedId) || null;

  const handleSelectWash = (id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="bg-blue-600 text-white px-4 pt-6 pb-3">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-base font-bold tracking-tight">Автомойки Узбекистана</h1>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
            {washes.length} партнёров
          </span>
        </div>

        {/* City tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-2.5 pb-0.5">
          {CITIES.map(c => (
            <button
              key={c}
              onClick={() => { setCityFilter(c); setSelectedId(null); }}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                cityFilter === c
                  ? 'bg-white text-blue-700 border-white'
                  : 'bg-transparent text-white border-white/40 hover:bg-white/10'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск по названию или адресу…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Filter row */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
          <button
            onClick={() => setFilterOpen(p => !p)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filterOpen
                ? 'bg-white text-blue-700 border-white'
                : 'bg-transparent text-white border-white/40 hover:bg-white/10'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Открыты
          </button>
          <button
            onClick={() => setFilterGreen(p => !p)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              filterGreen
                ? 'bg-green-400 text-white border-green-300'
                : 'bg-transparent text-white border-white/40 hover:bg-white/10'
            }`}
          >
            <Zap className="w-3 h-3" />
            Green Lane
          </button>
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              showFilters || serviceFilter !== 'Все'
                ? 'bg-white text-blue-700 border-white'
                : 'bg-transparent text-white border-white/40 hover:bg-white/10'
            }`}
          >
            <Filter className="w-3 h-3" />
            Сервис {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px]">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex-shrink-0 flex items-center gap-1 bg-transparent border border-white/30 px-2.5 py-1 rounded-full text-xs text-white ml-auto">
            <Wifi className="w-3 h-3" />
            {filtered.length} / {baseWashes.length}
          </div>
        </div>

        {/* Service type filter */}
        {showFilters && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {SERVICE_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setServiceFilter(s)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  serviceFilter === s
                    ? 'bg-white text-blue-700 border-white'
                    : 'bg-transparent text-white border-white/40 hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ─── Map with rounded corners ────────────────────────────── */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        <YandexMap
          carWashes={mapMarkers}
          selectedId={selectedId}
          onSelectWash={handleSelectWash}
          className="h-[220px]"
          centerCity={cityFilter !== 'Все' ? cityFilter : undefined}
        />
      </div>

      {/* ─── Selected wash detail card ───────────────────────────── */}
      {selectedWash && (
        <div className="mx-3 mt-3 bg-blue-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-sm truncate">{selectedWash.name}</h3>
                {selectedWash.hasGreenCorridor && (
                  <span className="bg-green-400/30 text-green-100 px-2 py-0.5 rounded-full text-[10px] flex-shrink-0">
                    Green Lane
                  </span>
                )}
                {selectedWash.selfService && (
                  <span className="bg-purple-400/30 text-purple-100 px-2 py-0.5 rounded-full text-[10px] flex-shrink-0">
                    Самообслуживание
                  </span>
                )}
              </div>
              <p className="text-blue-200 text-xs mb-2">{selectedWash.address}</p>
              <div className="flex items-center gap-3 text-xs text-blue-100">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {selectedWash.rating} ({selectedWash.reviews})
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {selectedWash.hours}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-blue-300 hover:text-white text-xs mt-0.5"
            >
              ✕
            </button>
          </div>
          {/* Occupancy in detail card */}
          {occupancy[selectedWash.id] && (
            <div className="mt-2.5 flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2">
              <Users className="w-4 h-4 text-white/70" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/70">Загруженность</span>
                  <span className="text-white font-bold">{occupancy[selectedWash.id].percent}%</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      occupancy[selectedWash.id].status === 'free' ? 'bg-green-400' :
                      occupancy[selectedWash.id].status === 'moderate' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${occupancy[selectedWash.id].percent}%` }}
                  />
                </div>
              </div>
              <span className="text-white/80 text-xs">
                {occupancy[selectedWash.id].queueMin > 0 ? `~${occupancy[selectedWash.id].queueMin} мин` : 'Свободно'}
              </span>
            </div>
          )}
          <div className="flex gap-2 mt-2.5">
            <a
              href={buildYandexNavLink(selectedWash.lat, selectedWash.lng, selectedWash.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white text-blue-700 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-blue-50 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" />
              Маршрут
            </a>
            <a
              href={`tel:${selectedWash.phone.replace(/\s/g, '')}`}
              className="flex-1 bg-white/20 text-white py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white/30 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Позвонить
            </a>
            {selectedWash.selfService && (
              <button
                onClick={() => setShowSelfServiceModal(true)}
                className="flex-1 bg-purple-400/20 text-purple-100 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-purple-400/30 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                Отметить мойку
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── List ───────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-900 font-semibold">
            Партнёрские мойки{cityFilter !== 'Все' ? ` · ${cityFilter}` : ''}
          </h2>
          <motion.span
            key={filtered.length}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full"
          >
            {filtered.length} / {baseWashes.length}
          </motion.span>
        </div>

        <AnimatePresence mode="popLayout">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-pulse" />
              <p className="text-gray-400 text-sm">Загружаем мойки…</p>
            </motion.div>
          )}
          {!loading && filtered.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="text-center py-12"
            >
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{washes.length === 0 ? 'Пока нет партнёрских моек' : 'Ничего не найдено'}</p>
              <p className="text-gray-400 text-sm mt-1">{washes.length === 0 ? 'Загляните позже' : 'Попробуйте другой запрос'}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.filter(w => w.id !== selectedId).map((wash, index) => {
              const q = searchQuery.trim().toLowerCase();
              const isNameMatch = q.length > 0 && wash.name.toLowerCase().includes(q);
              const isAddrMatch = q.length > 0 && !isNameMatch && wash.address.toLowerCase().includes(q);

              return (
              <motion.button
                key={wash.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: isNameMatch ? 1.012 : 1,
                  boxShadow: isNameMatch
                    ? '0 0 0 2px rgba(37,99,235,0.35), 0 6px 24px rgba(37,99,235,0.13)'
                    : selectedId === wash.id
                      ? '0 4px 14px rgba(37,99,235,0.14)'
                      : '0 1px 4px rgba(0,0,0,0.05)',
                }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.045,
                  ease: [0.22, 1, 0.36, 1],
                  layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                  boxShadow: { duration: 0.25 },
                  scale: { type: 'spring', stiffness: 320, damping: 24 },
                }}
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(37,99,235,0.14)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectWash(wash.id)}
                className={`w-full text-left bg-white border rounded-2xl p-4 transition-colors ${
                  selectedId === wash.id
                    ? 'border-blue-500 ring-1 ring-blue-400'
                    : isNameMatch
                      ? 'border-blue-300'
                      : 'border-gray-100 shadow-sm hover:border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <motion.div
                    animate={isNameMatch ? { scale: [1, 1.13, 1] } : { scale: 1 }}
                    transition={isNameMatch ? { duration: 0.4, ease: 'easeOut' } : {}}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isNameMatch ? 'bg-blue-500' : wash.openNow ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    <MapPin className={`w-5 h-5 ${isNameMatch ? 'text-white' : wash.openNow ? 'text-blue-600' : 'text-gray-400'}`} />
                  </motion.div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-gray-900 text-sm leading-tight">
                        <HighlightMatch text={wash.name} query={searchQuery} />
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isNameMatch && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.7, x: 6 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          >
                            Совпадение
                          </motion.span>
                        )}
                        {!isNameMatch && (wash.openNow ? (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            Открыто
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                            Закрыто
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-1 truncate">
                      <HighlightMatch text={`${wash.address}, ${wash.city}`} query={isAddrMatch ? searchQuery : ''} />
                    </p>

                    {/* City badge */}
                    {cityFilter === 'Все' && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-full mb-1.5">
                        <MapPin className="w-2.5 h-2.5" /> {wash.city}
                      </span>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{wash.rating}</span>
                        <span className="text-gray-400">({wash.reviews})</span>
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Navigation className="w-3 h-3" />
                        {wash.distanceKm} км
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        {wash.hours.split(' – ')[0]}
                      </span>
                    </div>

                    {/* Services */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {wash.services.map(s => (
                        <span
                          key={s}
                          className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>

                    {/* Occupancy indicator */}
                    {occupancy[wash.id] && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              occupancy[wash.id].status === 'free' ? 'bg-green-500' :
                              occupancy[wash.id].status === 'moderate' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${occupancy[wash.id].percent}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium flex items-center gap-1 ${
                          occupancy[wash.id].status === 'free' ? 'text-green-600' :
                          occupancy[wash.id].status === 'moderate' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          <Users className="w-3 h-3" />
                          {occupancy[wash.id].status === 'free' ? 'Свободно' :
                           occupancy[wash.id].status === 'moderate' ? `~${occupancy[wash.id].queueMin}мин` : 'Занято'}
                        </span>
                      </div>
                    )}

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      {wash.drivepassPartner && (
                        <span className="flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          DrivePass+
                        </span>
                      )}
                      {wash.hasGreenCorridor && (
                        <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <Navigation className="w-3 h-3" />
                          Green Lane
                        </span>
                      )}
                      {wash.selfService && (
                        <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                          <Settings className="w-3 h-3" />
                          Самообслуживание
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 transition-colors ${
                    selectedId === wash.id ? 'text-blue-600' : isNameMatch ? 'text-blue-400' : 'text-gray-300'
                  }`} />
                </div>
              </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* ─── Info block ──────────────────────────────────────── */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex gap-3 items-start">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 text-sm">
                Green Lane — выделенный бокс
              </p>
              <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                Мойки с иконкой Green Lane имеют выделенный бокс для подписчиков DrivePass+.
                Вы въезжаете без очереди — просто покажите QR-код.
              </p>
            </div>
          </div>
        </div>

        <div className="h-6" />
      </div>

      {showSelfServiceModal && selectedWash && (
        <SelfServiceVisitModal
          accessToken={accessToken}
          partnerId={selectedWash.id}
          partnerName={selectedWash.name}
          onClose={() => setShowSelfServiceModal(false)}
        />
      )}
    </div>
  );
}

// Build Yandex Maps navigation link for a specific car wash
function buildYandexNavLink(lat: number, lng: number, name: string): string {
  return `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto&text=${encodeURIComponent(name)}`;
}
