import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, MapPin, CheckCircle2, X, ChevronRight, Trash2 } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { apiHeaders } from '../utils/apiClient';
import { ALL_CAR_WASHES } from '../constants/carWashes';

interface BookingFlowProps {
  accessToken: string;
  user?: any;
  initialLocationId?: string;
  initialLocationName?: string;
  onBack: () => void;
}

interface Booking {
  id: string; locationId: string; locationName: string;
  serviceType: string; scheduledAt: string; notes: string;
  status: string; createdAt: string;
}

const SERVICE_TYPES = ['Экспресс', 'Стандарт', 'Премиум', 'Детейлинг', 'Химчистка салона'];
const LOCATIONS = ALL_CAR_WASHES.map(w => ({ id: w.id, name: `${w.name} · ${w.city}` }));

function getTimeSlots() {
  const slots = [];
  for (let h = 8; h < 22; h++) {
    slots.push(`${h}:00`, `${h}:30`);
  }
  return slots;
}

function getAvailableDates() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function BookingFlow({ accessToken, user, initialLocationId, initialLocationName, onBack }: BookingFlowProps) {
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>(initialLocationId ? 'form' : 'form');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'new' | 'my'>('new');

  const [locationId, setLocationId] = useState(initialLocationId || 'cw-001');
  const [locationName, setLocationName] = useState(initialLocationName || LOCATIONS[0].name);
  const [serviceType, setServiceType] = useState('Стандарт');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;
  const headers = apiHeaders(accessToken);

  const loadBookings = async () => {
    try {
      const res = await fetch(`${API}/bookings`, { headers });
      const d = await res.json();
      setBookings(d.bookings || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadBookings(); }, []);

  const handleCreate = async () => {
    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    const scheduledAt = `${dateStr}T${selectedTime}:00`;
    try {
      const res = await fetch(`${API}/bookings`, {
        method: 'POST', headers,
        body: JSON.stringify({ locationId, locationName, serviceType, scheduledAt, notes }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Ошибка'); return; }
      toast.success('✅ Запись создана!');
      setStep('done');
      loadBookings();
    } catch { toast.error('Ошибка соединения'); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id: string) => {
    try {
      await fetch(`${API}/bookings/${id}`, { method: 'DELETE', headers });
      toast.success('Запись отменена');
      loadBookings();
    } catch { toast.error('Ошибка'); }
  };

  const dates = getAvailableDates();
  const slots = getTimeSlots();

  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-blue-600 text-white px-5 pt-10 pb-5">
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white mb-5 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>
        <h1 className="text-2xl font-black">Запись на мойку</h1>
        <p className="text-blue-200 text-sm">Бронируйте удобное время</p>
      </header>

      {/* Tab switcher */}
      <div className="px-5 py-4">
        <div className="bg-gray-100 rounded-2xl p-1 flex">
          <button onClick={() => setTab('new')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'new' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>
            Новая запись
          </button>
          <button onClick={() => { setTab('my'); loadBookings(); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'my' ? 'bg-white shadow text-blue-700' : 'text-gray-500'}`}>
            Мои записи {bookings.filter(b => b.status === 'confirmed').length > 0 && `(${bookings.filter(b => b.status === 'confirmed').length})`}
          </button>
        </div>
      </div>

      {tab === 'new' && (
        <div className="px-5 space-y-5">
          {step === 'done' ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Запись создана!</h2>
              <p className="text-gray-500 mb-6">{locationName} · {serviceType} · {selectedDate.getDate()} {monthNames[selectedDate.getMonth()]} в {selectedTime}</p>
              <button onClick={() => { setStep('form'); setNotes(''); }} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">
                Создать ещё запись
              </button>
            </div>
          ) : (
            <>
              {/* Location */}
              <div>
                <p className="text-gray-700 font-bold mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />Автомойка
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {LOCATIONS.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => { setLocationId(loc.id); setLocationName(loc.name); }}
                      className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${locationId === loc.id ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700'}`}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service type */}
              <div>
                <p className="text-gray-700 font-bold mb-3">Тип услуги</p>
                <div className="flex gap-2 flex-wrap">
                  {SERVICE_TYPES.map(s => (
                    <button
                      key={s}
                      onClick={() => setServiceType(s)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${serviceType === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date picker */}
              <div>
                <p className="text-gray-700 font-bold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />Дата
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {dates.map((d, i) => {
                    const isSelected = d.toDateString() === selectedDate.toDateString();
                    const isToday = i === 0;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(d)}
                        className={`flex-shrink-0 flex flex-col items-center px-4 py-3 rounded-2xl border-2 min-w-[64px] transition-all ${isSelected ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700'}`}
                      >
                        <span className="text-xs opacity-70">{dayNames[d.getDay()]}</span>
                        <span className="text-xl font-black">{d.getDate()}</span>
                        <span className="text-xs opacity-70">{monthNames[d.getMonth()]}</span>
                        {isToday && <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/70' : 'text-blue-600'}`}>Сегодня</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time picker */}
              <div>
                <p className="text-gray-700 font-bold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />Время
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedTime(s)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${selectedTime === s ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 bg-white text-gray-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-gray-700 font-bold mb-2">Комментарий (необязательно)</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Особые пожелания..."
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-all shadow-lg"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Calendar className="w-5 h-5" />}
                Записаться
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'my' && (
        <div className="px-5 space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Записей нет</p>
              <button onClick={() => setTab('new')} className="mt-4 text-blue-600 font-semibold text-sm">Создать запись →</button>
            </div>
          ) : (
            bookings.map(b => {
              const d = new Date(b.scheduledAt);
              const cancelled = b.status === 'cancelled';
              return (
                <div key={b.id} className={`bg-white rounded-2xl shadow-sm border p-4 ${cancelled ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 text-sm">{b.locationName}</p>
                        {cancelled
                          ? <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">Отменено</span>
                          : <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Подтверждено</span>
                        }
                      </div>
                      <p className="text-blue-600 text-sm font-medium">{b.serviceType}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {d.getDate()} {monthNames[d.getMonth()]} · {d.getHours()}:{String(d.getMinutes()).padStart(2, '0')}
                      </p>
                      {b.notes && <p className="text-gray-400 text-xs mt-1 italic">{b.notes}</p>}
                    </div>
                    {!cancelled && (
                      <button onClick={() => handleCancel(b.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
