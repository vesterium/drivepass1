import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Clock, MapPin, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ModalPortal } from './ModalPortal';

interface BookingModalProps {
  service: {
    id: number;
    name: string;
    nameRu: string;
    nameUz: string;
    price: number;
    duration: string;
  };
  onClose: () => void;
}

export function BookingModal({ service, onClose }: BookingModalProps) {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isBooked, setIsBooked] = useState(false);

  const getServiceName = () => {
    if (language === 'ru') return service.nameRu;
    if (language === 'uz') return service.nameUz;
    return service.name;
  };

  const dates = [
    'Nov 27, 2025', 'Nov 28, 2025',
    'Nov 29, 2025', 'Nov 30, 2025',
  ];
  const times = [
    '09:00 AM', '10:00 AM', '11:00 AM',
    '01:00 PM', '02:00 PM', '03:00 PM',
    '04:00 PM', '05:00 PM',
  ];
  const locations = [
    'CleanWave Express - Main St',
    'Sparkle Auto Spa - Oak Ave',
    'Premium Wash Co - Pine Rd',
  ];

  const handleConfirm = () => {
    if (selectedDate && selectedTime && selectedLocation) {
      setIsBooked(true);
      setTimeout(onClose, 2000);
    }
  };

  /* ── Success state ── */
  if (isBooked) {
    return (
      <ModalPortal open onClose={onClose}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.1 }}
            className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Check className="w-8 h-8 text-green-600" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="text-xl text-gray-900 mb-2"
          >
            {t('booking.success')}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600"
          >
            {t('booking.successMessage')}
          </motion.p>
        </div>
      </ModalPortal>
    );
  }

  /* ── Booking form ── */
  return (
    <ModalPortal open onClose={onClose} variant="bottom">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.14)' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">{t('booking.title')}</h3>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              style={{ minHeight: 0 }}
            >
              <X className="w-5 h-5 text-gray-600" />
            </motion.button>
          </div>

          {/* Service Info */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="bg-blue-50 rounded-xl p-4 mb-6"
          >
            <p className="text-sm text-gray-500 mb-1">{t('services.title')}</p>
            <p className="text-base font-semibold text-gray-900">{getServiceName()}</p>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
              <span>${service.price}</span>
              <span>·</span>
              <span>{service.duration}</span>
            </div>
          </motion.div>

          {/* Select Date */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }} className="mb-6"
          >
            <label className="flex items-center gap-2 text-gray-900 font-semibold mb-3 text-sm">
              <Calendar className="w-4 h-4" />
              {t('booking.selectDate')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {dates.map((date) => (
                <motion.button key={date} whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedDate(date)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-colors ${
                    selectedDate === date
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={{ minHeight: 0 }}
                >
                  {date}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Select Time */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }} className="mb-6"
          >
            <label className="flex items-center gap-2 text-gray-900 font-semibold mb-3 text-sm">
              <Clock className="w-4 h-4" />
              {t('booking.selectTime')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {times.map((time) => (
                <motion.button key={time} whileTap={{ scale: 0.96 }}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2.5 px-2 rounded-xl border-2 text-sm font-medium transition-colors ${
                    selectedTime === time
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={{ minHeight: 0 }}
                >
                  {time}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Select Location */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.23 }} className="mb-6"
          >
            <label className="flex items-center gap-2 text-gray-900 font-semibold mb-3 text-sm">
              <MapPin className="w-4 h-4" />
              {t('booking.selectLocation')}
            </label>
            <div className="space-y-2">
              {locations.map((location) => (
                <motion.button key={location} whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedLocation(location)}
                  className={`w-full py-3 px-4 rounded-xl border-2 text-left text-sm font-medium transition-colors ${
                    selectedLocation === location
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                  style={{ minHeight: 0 }}
                >
                  {location}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }} className="flex gap-3"
          >
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
              style={{ minHeight: 0 }}
            >
              {t('booking.cancel')}
            </motion.button>
            <motion.button
              whileTap={selectedDate && selectedTime && selectedLocation ? { scale: 0.97 } : undefined}
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedTime || !selectedLocation}
              className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors ${
                selectedDate && selectedTime && selectedLocation
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              style={{ minHeight: 0 }}
            >
              {t('booking.confirm')}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </ModalPortal>
  );
}

