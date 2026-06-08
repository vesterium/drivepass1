import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Sparkles, Wrench, Droplets, ShieldCheck, Zap, Tag,
  ChevronRight, Star, Clock, BadgePercent, Gift, Flame, MapPin,
  TrendingUp, Car, Shield, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { apiHeaders } from '../utils/apiClient';

// ── Service locations for the map ─────────────────────────────────────────────
const SERVICE_LOCATIONS = [
  { lat: 39.6542, lng: 66.9597, name: 'AutoSpa Premium',      category: 'detailing', color: '#4f46e5' },
  { lat: 39.6602, lng: 66.9650, name: 'TyreKing',             category: 'tire',      color: '#ea580c' },
  { lat: 39.6480, lng: 66.9520, name: 'OilChange Express',    category: 'oil',       color: '#16a34a' },
  { lat: 39.6620, lng: 66.9480, name: 'ShineWax Detailing',   category: 'detailing', color: '#4f46e5' },
  { lat: 39.6510, lng: 66.9700, name: 'SpeedTyre Pro',        category: 'tire',      color: '#ea580c' },
  { lat: 39.6565, lng: 66.9610, name: 'Ceramic Coating UZ',   category: 'coating',   color: '#7c3aed' },
  { lat: 39.6490, lng: 66.9680, name: 'FastOil Самарканд',    category: 'oil',       color: '#16a34a' },
];

const CAT_ICONS: Record<string, string> = {
  detailing: '✨',
  tire:      '🔧',
  oil:       '🛢️',
  coating:   '🛡️',
};

// ── Mini Leaflet map showing service locations ────────────────────────────────
function MiniMap({ activeCategory }: { activeCategory: string }) {
  const ref        = useRef<HTMLDivElement>(null);
  const mapRef     = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selected, setSelected] = useState<{ name: string; category: string; color: string } | null>(null);

  useEffect(() => {
    if (mapRef.current || !ref.current) return;

    import('leaflet').then(L => {
      if (!ref.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(ref.current!, {
        center: [39.6542, 66.9597],
        zoom: 13,
        zoomControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
        touchZoom: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      // Add service markers with category-specific colors
      SERVICE_LOCATIONS.forEach(({ lat, lng, name, category, color }) => {
        const icon = L.divIcon({
          html: `<div style="width:34px;height:34px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 4px 12px ${color}66;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;transition:transform 0.15s">${CAT_ICONS[category] || '📍'}</div>`,
          className: '',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);

        // Click → zoom in + show detail
        marker.on('click', () => {
          map.flyTo([lat, lng], 16, { duration: 0.7, easeLinearity: 0.5 });
          setSelected({ name, category, color });
        });

        markersRef.current.push({ marker, category });
      });

      mapRef.current = map;
    }).catch(() => {});

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden relative" style={{ height: 170, background: '#e5e7eb' }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
      <div ref={ref} style={{ width: '100%', height: '100%' }} />

      {/* Overlay badge */}
      <div
        className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full z-[1000]"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', boxShadow: '0 1px 6px rgba(0,0,0,0.1)' }}
      >
        <MapPin style={{ width: 11, height: 11, color: '#2563eb' }} />
        <span className="text-[11px] font-bold text-gray-700">{SERVICE_LOCATIONS.length} сервисов рядом</span>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-[1000]">
        {[
          { color: '#4f46e5', label: 'Детейл' },
          { color: '#ea580c', label: 'Шины' },
          { color: '#16a34a', label: 'Масло' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.88)' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[9px] font-bold text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Selected marker popup */}
      {selected && (
        <div
          className="absolute bottom-2 left-2 z-[1001] flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 4px 16px rgba(0,0,0,0.14)', maxWidth: 190 }}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: selected.color + '22' }}>
            <span style={{ fontSize: 14 }}>{CAT_ICONS[selected.category] || '📍'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-gray-900 truncate">{selected.name}</p>
            <p className="text-[10px] font-semibold" style={{ color: selected.color }}>{selected.category}</p>
          </div>
          <button onClick={() => setSelected(null)} className="flex-shrink-0" style={{ minHeight: 0 }}>
            <X style={{ width: 12, height: 12, color: '#9ca3af' }} />
          </button>
        </div>
      )}
    </div>
  );
}

interface MarketplaceProps {
  accessToken: string;
  user?: any;
  onBack: () => void;
  onBook: (locationId: string, serviceName: string) => void;
}

interface Product {
  id: string;
  category: string;
  name: string;
  price: number;
  duration: string;
  rating: number;
  badge?: string;
}

const CAT: Record<string, { label: string; Icon: any; color: string; bg: string }> = {
  all:       { label: 'Все',        Icon: Zap,        color: '#71717a', bg: '#f4f4f5' },
  detailing: { label: 'Детейлинг',  Icon: Sparkles,   color: '#4f46e5', bg: '#eef2ff' },
  tire:      { label: 'Шины',       Icon: Wrench,     color: '#ea580c', bg: '#fff7ed' },
  oil:       { label: 'Масло',      Icon: Droplets,   color: '#16a34a', bg: '#f0fdf4' },
  coating:   { label: 'Покрытие',   Icon: ShieldCheck, color: '#7c3aed', bg: '#faf5ff' },
  insurance: { label: 'Страховка',  Icon: ShieldCheck, color: '#e11d48', bg: '#fff1f2' },
};

const PROMOS = [
  { id: 'p1', label: '−20%', title: 'на детейлинг', color: '#4f46e5', Icon: BadgePercent },
  { id: 'p2', label: 'FREE', title: 'диагностика',  color: '#059669', Icon: Gift },
  { id: 'p3', label: '−5%',  title: 'за баллы',     color: '#7c3aed', Icon: Zap },
];

// Static fallback — используется пока API /marketplace не задеплоен
const STATIC_PRODUCTS: Product[] = [
  { id: 's1', category: 'detailing', name: 'Полировка кузова',   price: 120_000, duration: '2 ч',   rating: 4.9, badge: 'Топ' },
  { id: 's2', category: 'tire',      name: 'Шиномонтаж',         price: 80_000,  duration: '45 мин', rating: 4.7 },
  { id: 's3', category: 'oil',       name: 'Замена масла',        price: 150_000, duration: '30 мин', rating: 4.8 },
  { id: 's4', category: 'detailing', name: 'Химчистка салона',    price: 200_000, duration: '3 ч',   rating: 4.6, badge: 'Хит' },
  { id: 's5', category: 'coating',   name: 'Нанокерамика',        price: 980_000, duration: '1 день', rating: 4.9, badge: 'NEW' },
  { id: 's6', category: 'tire',      name: 'Балансировка колёс',  price: 50_000,  duration: '20 мин', rating: 4.5 },
  { id: 's7', category: 'oil',       name: 'Замена фильтров',     price: 45_000,  duration: '15 мин', rating: 4.7 },
  { id: 's8', category: 'insurance', name: 'Страхование КАСКО',   price: 350_000, duration: '30 мин', rating: 4.4 },
];

const BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  'Топ':  { bg: '#fef08a', text: '#854d0e' },
  'Хит':  { bg: '#fecdd3', text: '#9f1239' },
  'NEW':  { bg: '#bfdbfe', text: '#1d4ed8' },
};

export function Marketplace({ accessToken, user, onBack, onBook }: MarketplaceProps) {
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeCategory, setActive] = useState('all');
  const [loyaltyPoints, setPoints]  = useState(0);

  const API     = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;
  const headers = apiHeaders(accessToken);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/marketplace`,    { headers }).then(r => r.json()).catch(() => ({ products: [] })),
      fetch(`${API}/loyalty/points`, { headers }).then(r => r.json()).catch(() => ({ points: 0 })),
    ]).then(([market, loyalty]) => {
      const apiProducts = market.products ?? [];
      setProducts(apiProducts.length > 0 ? apiProducts : STATIC_PRODUCTS);
      setPoints(loyalty.points ?? 0);
    }).finally(() => setLoading(false));
  }, []);

  const filtered   = activeCategory === 'all' ? products : products.filter(p => p.category === activeCategory);
  const categories = ['all', ...Object.keys(CAT).filter(k => k !== 'all' && products.some(p => p.category === k))];

  const handleOrder = (p: Product) => {
    toast.success(`Записано: ${p.name}`, { description: 'Мы свяжемся с вами для подтверждения' });
    onBook('marketplace', p.name);
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f7f8fa' }}>

      {/* ── Hero Header ──────────────────────────────────────────────── */}
      <div
        className="px-5 pt-12 pb-0"
        style={{ background: 'linear-gradient(160deg, #1d4ed8 0%, #2563eb 50%, #4f46e5 100%)' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Назад</span>
        </button>

        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-blue-300 uppercase font-semibold mb-1">DrivePass+</p>
            <h1 className="text-white leading-none" style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
              Сервисы
            </h1>
            <p className="text-blue-200 text-xs mt-1.5">Детейлинг · Шины · Масло · Покрытие</p>
          </div>
          {loyaltyPoints > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-1"
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              <Zap style={{ width: 12, height: 12, color: '#fbbf24' }} />
              <span className="text-[12px] font-black text-white">{loyaltyPoints}</span>
              <span className="text-[11px] text-blue-200 font-medium">баллов</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: Car,       label: 'Сервисов',    value: String(products.length || STATIC_PRODUCTS.length) },
            { icon: MapPin,    label: 'Локаций',     value: '7' },
            { icon: TrendingUp, label: 'Экономия',   value: 'до 20%' },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="text-center py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}
            >
              <Icon style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)', margin: '0 auto 3px' }} />
              <p className="text-white font-black text-sm leading-none">{value}</p>
              <p className="text-blue-200 text-[9px] mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Mini-map ── */}
        <MiniMap activeCategory={activeCategory} />

        {/* Wave separator */}
        <div style={{ height: 20, background: 'linear-gradient(160deg, #1d4ed8 0%, #4f46e5 100%)', clipPath: 'ellipse(55% 100% at 50% 0%)' }} />
      </div>

      {/* White content area */}
      <div style={{ background: '#f7f8fa' }}>

      {/* ── Promo chips ─────────────────────────────────────────── */}
      <div className="px-4 pt-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {PROMOS.map(p => (
          <motion.div
            key={p.id}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full cursor-pointer select-none bg-white"
            style={{ border: `1.5px solid ${p.color}22`, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <span
              className="text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none"
              style={{ background: p.color, color: '#fff' }}
            >
              {p.label}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: p.color }}>
              {p.title}
            </span>
          </motion.div>
        ))}
      </div>

      {/* ── Category tabs ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto scrollbar-none">
        {categories.map(cat => {
          const { label, Icon, color, bg } = CAT[cat] ?? CAT.all;
          const active = activeCategory === cat;
          return (
            <motion.button
              key={cat}
              onClick={() => setActive(cat)}
              whileTap={{ scale: 0.94 }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all"
              style={{
                background: active ? color : '#fff',
                color: active ? '#fff' : '#6b7280',
                border: active ? `1.5px solid ${color}` : '1.5px solid #e5e7eb',
                boxShadow: active ? `0 2px 8px ${color}33` : 'none',
              }}
            >
              <Icon style={{ width: 13, height: 13 }} />
              {label}
            </motion.button>
          );
        })}
      </div>

      {/* ── Products ──────────────────────────────────────────────── */}
      <div className="px-4 pt-3 space-y-2.5 pb-4">
        <AnimatePresence mode="popLayout">
          {(loading ? Array(4).fill(null) : filtered).map((p, i) => {
            if (!p) {
              return (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse" style={{ border: '1px solid #eaeaec' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              );
            }

            const cat   = CAT[p.category] ?? CAT.all;
            const badge = p.badge ? BADGE_STYLE[p.badge] : null;

            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ delay: i * 0.04, duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.button
                  whileTap={{ scale: 0.985 }}
                  onClick={() => handleOrder(p)}
                  className="w-full text-left bg-white rounded-2xl overflow-hidden"
                  style={{ border: '1px solid #eaeaec', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  {/* Accent top stripe */}
                  <div className="h-0.5 w-full" style={{ background: cat.color }} />

                  <div className="p-4 flex items-center gap-3.5">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: cat.bg }}
                    >
                      <cat.Icon style={{ width: 22, height: 22, color: cat.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="text-sm font-black text-gray-900 truncate">{p.name}</p>
                        {badge && (
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: badge.bg, color: badge.text }}
                          >
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-0.5">
                          <Star style={{ width: 10, height: 10, color: '#f59e0b', fill: '#f59e0b' }} />
                          <span className="text-[11px] text-gray-600 font-bold">{p.rating}</span>
                        </div>
                        <div className="w-px h-3 bg-gray-200" />
                        <div className="flex items-center gap-1">
                          <Clock style={{ width: 9, height: 9, color: '#9ca3af' }} />
                          <span className="text-[11px] text-gray-400">{p.duration}</span>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-black text-gray-900">{p.price.toLocaleString('ru-RU')}</p>
                      <p className="text-[10px] text-gray-400">сум</p>
                    </div>
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cat.bg }}
                    >
                      <ChevronRight style={{ width: 13, height: 13, color: cat.color }} />
                    </div>
                  </div>
                </motion.button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
