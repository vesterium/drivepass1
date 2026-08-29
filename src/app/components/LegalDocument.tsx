/**
 * LegalDocument — DrivePass+
 *
 * Full-screen reader for the Public Offer / Privacy Policy text in constants/legal.ts.
 * Opened from Profile's "Правовая информация" section, and linked (not just mentioned) from
 * SubscriptionModal.tsx's payment step so acceptance is tied to the actual purchase action.
 */

import { motion } from 'motion/react';
import { X, ScrollText } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import { LEGAL_LAST_UPDATED, type LegalSection } from '../constants/legal';

interface LegalDocumentProps {
  open: boolean;
  onClose: () => void;
  title: string;
  sections: LegalSection[];
}

export function LegalDocument({ open, onClose, title, sections }: LegalDocumentProps) {
  return (
    <ModalPortal open={open} onClose={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" style={{ maxHeight: '88vh' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <ScrollText className="w-4 h-4 text-blue-500" />
            </div>
            <h3 className="text-base font-black text-gray-900">{title}</h3>
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ minHeight: 0 }}
          >
            <X className="w-4 h-4 text-gray-500" />
          </motion.button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5" style={{ maxHeight: 'calc(88vh - 130px)' }}>
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-sm font-bold text-gray-900 mb-2">{section.title}</p>
              <div className="space-y-2">
                {section.body.map((paragraph, i) =>
                  paragraph.startsWith('•') ? (
                    <p key={i} className="text-xs text-gray-500 leading-relaxed pl-3 -indent-3">
                      {paragraph}
                    </p>
                  ) : (
                    <p key={i} className="text-xs text-gray-500 leading-relaxed">
                      {paragraph}
                    </p>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-[10px] text-gray-300 text-center">Действующая редакция от {LEGAL_LAST_UPDATED}</p>
        </div>
      </div>
    </ModalPortal>
  );
}
