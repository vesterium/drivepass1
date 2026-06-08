/**
 * Services.tsx — DrivePass+
 * Сервисы рядом: детейлинг, шиномонтаж, замена масла, покрытие, химчистка.
 * Карта (Leaflet/OSM) + промо-баннеры + фильтры + список.
 */

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Star, Clock, ChevronRight, Sparkles,
  Wrench, Droplets, Shield, ShieldCheck, Tag, X,
} from 'lucide-react';
import { YandexMap, type CarWashMarker } from './YandexMap';
import { ImageWithFallback } from './figma/ImageWithFallback';

// ─── Category tabs ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',       label: 'Все',        icon: null },
  { id: 'detailing', label: 'Детейлинг',  icon: Sparkles },
  { id: 'tires',     label: 'Шины',       icon: Wrench },
  { id: 'oil',       label: 'Масло',      icon: Droplets },
  { id: 'coating',   label: 'Покрытие',   icon: Shield },
  { id: 'insurance', label: 'Страховка',  icon: ShieldCheck },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

// ─── Promo banners ───────────────────────────────────────────────────────────
const PROMOS = [
  { badge: '-20%',  desc: 'на детейлинг', accent: '#4f46e5', bg: '#ede9fe', badgeBg: '#4f46e5' },
  { badge: 'FREE',  desc: 'диагностика',  accent: '#16a34a', bg: '#dcfce7', badgeBg: '#16a34a' },
  { badge: '-5%',   desc: 'за баллы',     accent: '#7c3aed', bg: '#f5f3ff', badgeBg: '#7c3aed' },
];

// ─── Service data ─────────────────────────────────────────────────────────────
interface ServiceItem {
  id: number;
  category: Exclude<CategoryId, 'all'>;
  name: string;
  rating: number;
  duration: string;
  price: number;
  address: string;
  image: string;
  tags: string[];
  accent: string;    // left border & icon color
  iconBg: string;    // icon background tint
}

const SERVICES: ServiceItem[] = [
  {
    id: 1,
    category: 'detailing',
    name: 'Полировка кузова',
    rating: 4.9,
    duration: '2 ч',
    price: 120000,
    address: 'ул. Регистан, 12',
    image: 'https://images.unsplash.com/photo-1771491237067-5d108e956e73?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBwb2xpc2hpbmclMjBkZXRhaWxpbmclMjBzZXJ2aWNlJTIwZ2FyYWdlfGVufDF8fHx8MTc3Mzc0NDIzNnww&ixlib=rb-4.1.0&q=80&w=1080',
    tags: ['DrivePass -10%'],
    accent: '#6366F1',
    iconBg: '#EEF2FF',
  },
  {
    id: 2,
    category: 'tires',
    name: 'Шиномонтаж',
    rating: 4.7,
    duration: '45 мин',
    price: 80000,
    address: 'пр. Ипподромный, 88',
    image: 'https://images.unsplash.com/photo-1764015805414-df7de89d405b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aXJlJTIwd2hlZWwlMjBzZXJ2aWNlJTIwYXV0byUyMHNob3B8ZW58MXx8fHwxNzczNzQ0MjM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    tags: ['Балансировка'],
    accent: '#F97316',
    iconBg: '#FFF7ED',
  },
  {
    id: 3,
    category: 'oil',
    name: 'Замена масла',
    rating: 4.8,
    duration: '30 мин',
    price: 150000,
    address: 'ул. Бустонсарой, 5',
    image: 'https://images.unsplash.com/photo-1613214293055-5678e2f6d7de?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBlbmdpbmUlMjBvaWwlMjBjaGFuZ2UlMjBtZWNoYW5pY3xlbnwxfHx8fDE3NzM3NDQyMzd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    tags: ['Масло включено'],
    accent: '#22C55E',
    iconBg: '#F0FDF4',
  },
  {
    id: 4,
    category: 'detailing',
    name: 'Химчистка салона',
    rating: 4.6,
    duration: '3 ч',
    price: 200000,
    address: 'ул. Мовароуннахр, 44',
    image: 'https://images.unsplash.com/photo-1687845541910-8987370a8225?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBjZXJhbWljJTIwY29hdGluZyUyMHByb3RlY3Rpb24lMjBhdXRvfGVufDF8fHx8MTc3Mzc0NDI0Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    tags: ['Гарантия 2 года'],
    accent: '#6366F1',
    iconBg: '#EEF2FF',
  },
  {
    id: 5,
    category: 'coating',
    name: 'Ceramic PRO',
    rating: 5,
    duration: '8 ч',
    price: 800000,
    address: 'ул. Гагарин, 30',
    image: 'https://images.unsplash.com/photo-1564912139097-6e35a037c77f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBpbnRlcmlvciUyMGNsZWFuaW5nJTIwdmFjdXVtJTIwZGV0YWlsaW5nfGVufDF8fHx8MTc3Mzc0NDI0Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    tags: ['Премиум'],
    accent: '#3B82F6',
    iconBg: '#EFF6FF',
  },
  {
    id: 6,
    category: 'insurance',
    name: 'ОСАГО Gross',
    rating: 4.5,
    duration: '1 год',
    price: 350000,
    address: 'ул. Навои, 10',
    image: 'https://images.unsplash.com/photo-1764015805414-df7de89d405b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aXJlJTIwd2hlZWwlMjBzZXJ2aWNlJTIwYXV0byUyMHNob3B8ZW58MXx8fHwxNzczNzQ0MjM3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    tags: ['Страхование'],
    accent: '#EC4899',
    iconBg: '#FDF2F8',
  },
];

// ─── Map markers (сервисы на карте Самарканда) ───────────────────────────────
const SERVICE_MARKERS: CarWashMarker[] = [
  { id: 's1', name: 'Детейлинг-центр Star',    address: 'ул. Регистан, 12',         lat: 39.655, lng: 66.976, rating: 4.9, openNow: true, hasGreenCorridor: false, services: ['Полировка', 'Химчистка'] },
  { id: 's2', name: 'Шинный центр Turbo',      address: 'пр. Ипподромный, 88',      lat: 39.660, lng: 66.968, rating: 4.8, openNow: true, hasGreenCorridor: false, services: ['Шиномонтаж', 'Балансировка'] },
  { id: 's3', name: 'AutoOil Express',         address: 'ул. Бустонсарой, 5',       lat: 39.649, lng: 66.982, rating: 4.7, openNow: true, hasGreenCorridor: false, services: ['Замена масла'] },
  { id: 's4', name: 'Ceramic Pro Samarkand',  address: 'ул. Мовароуннахр, 44',     lat: 39.662, lng: 66.990, rating: 4.9, openNow: false, hasGreenCorridor: false, services: ['Покрытие'] },
  { id: 's5', name: 'CleanMaster Auto',        address: 'ул. Гагарин, 30',          lat: 39.644, lng: 66.972, rating: 4.8, openNow: true, hasGreenCorridor: false, services: ['Химчистка'] },
];

// ─── Service detail bottom sheet ─────────────────────────────────────────────
function ServiceSheet({ service, onClose }: { service: ServiceItem; onClose: () => void }) {
  const Icon = service.category === 'detailing' ? Sparkles
    : service.category === 'tires'    ? Wrench
    : service.category === 'oil'      ? Droplets
    : service.category === 'insurance' ? ShieldCheck
    : Shield;

  return (
    createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed flex items-end z-[9999]"
      style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }}
        className="bg-white w-full max-w-md mx-auto rounded-t-3xl overflow-hidden"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative h-48 bg-gray-100">
          <ImageWithFallback src={service.image} alt={service.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
          {/* Category icon */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="w-8 h-8 bg-white/90 rounded-xl flex items-center justify-center">
              <Icon className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

          <div className="flex items-start justify-between mb-1">
            <h2 className="text-xl font-black text-gray-900 leading-tight">{service.name}</h2>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-lg font-black text-gray-900">{service.price.toLocaleString('ru-RU')}</p>
              <p className="text-[10px] text-gray-400 -mt-0.5">сум</p>
            </div>
          </div>

          {/* Address */}
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
            <p className="text-xs text-gray-400">{service.address}</p>
          </div>

          {/* Stats */}
          <div className="flex gap-3 mb-5">
            <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-2 rounded-xl">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-amber-700">{service.rating}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-600">{service.duration}</span>
            </div>
            {service.tags.map(tag => (
              <div key={tag} className="flex items-center gap-1 bg-indigo-50 px-3 py-2 rounded-xl">
                <Tag className="w-3 h-3 text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-600">{tag}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-50 mb-5" />

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold"
            style={{ background: '#111827' }}
          >
            Записаться · {service.price.toLocaleString('ru-RU')} сум
          </motion.button>
          <button onClick={onClose} className="w-full mt-3 py-2.5 text-sm text-gray-400 font-medium">
            Отмена
          </button>
        </div>
      </motion.div>
    </motion.div>
    , document.body)
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Services() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [showMap, setShowMap] = useState(true);

  const filtered = activeCategory === 'all'
    ? SERVICES
    : SERVICES.filter(s => s.category === activeCategory);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-safe pt-6 pb-3 bg-white">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.16em] font-semibold mb-1">DrivePass+</p>
        <h1 className="text-[28px] font-black text-gray-900 leading-tight">Сервисы</h1>
      </div>

      {/* ── Map ─────────────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative" style={{ height: 180 }}>
        <YandexMap
          carWashes={SERVICE_MARKERS}
          height={180}
          onMarkerClick={() => {}}
        />
        {/* Overlay badge */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}
        >
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-gray-800">
            {SERVICE_MARKERS.length} сервисов рядом
          </span>
        </div>
      </div>

      {/* ── Promo banners (scrollable) ──────────────────────────────── */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {PROMOS.map(p => (
          <motion.div
            key={p.badge}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-3 py-2 rounded-full flex-shrink-0 cursor-pointer"
            style={{ background: p.bg, border: `1.5px solid ${p.accent}30` }}
          >
            <span
              className="text-[11px] font-black px-1.5 py-0.5 rounded-full text-white"
              style={{ background: p.badgeBg, letterSpacing: '0.02em' }}
            >
              {p.badge}
            </span>
            <span className="text-xs font-semibold" style={{ color: p.accent }}>{p.desc}</span>
          </motion.div>
        ))}
      </div>

      {/* ── Category filter tabs ────────────────────────────────────── */}
      <div className="flex gap-2 px-4 mb-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(cat.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full flex-shrink-0 text-sm font-semibold transition-all"
              style={{
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#2563eb' : '#9CA3AF',
                border: isActive ? '1.5px solid #dbeafe' : '1.5px solid #e5e7eb',
                boxShadow: isActive ? '0 1px 8px rgba(37,99,235,0.10), 0 1px 2px rgba(37,99,235,0.06)' : 'none',
              }}
            >
              {Icon && <Icon className="w-3.5 h-3.5" style={{ opacity: isActive ? 1 : 0.5 }} />}
              {cat.label}
            </motion.button>
          );
        })}
      </div>

      {/* ── Services list ───────────────────────────────────────────── */}
      <div className="px-4 pb-24 space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((service, i) => {
            const Icon = service.category === 'detailing' ? Sparkles
              : service.category === 'tires'    ? Wrench
              : service.category === 'oil'      ? Droplets
              : service.category === 'insurance' ? ShieldCheck
              : Shield;

            return (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04, duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setSelectedService(service)}
                className="relative flex items-center gap-4 bg-white rounded-2xl pl-5 pr-4 py-4 cursor-pointer overflow-hidden"
                style={{
                  boxShadow: '0 0 0 0.5px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.03)',
                }}
              >
                {/* Colored left accent border */}
                <div
                  className="absolute left-0 top-3 bottom-3 w-[3.5px] rounded-r-full"
                  style={{ background: service.accent }}
                />

                {/* Icon in tinted circle */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: service.iconBg }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: service.accent }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-gray-900 leading-tight" style={{ letterSpacing: '-0.01em' }}>
                    {service.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[12px] text-gray-500">{service.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-300" />
                      <span className="text-[12px] text-gray-400">{service.duration}</span>
                    </div>
                  </div>
                </div>

                {/* Price + chevron */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[16px] text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                      {service.price.toLocaleString('ru-RU')}
                    </p>
                    <p className="text-[11px] text-gray-400 -mt-0.5">сум</p>
                  </div>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: '#F2F2F7' }}
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Service detail sheet ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedService && (
          <ServiceSheet service={selectedService} onClose={() => setSelectedService(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
