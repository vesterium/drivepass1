/**
 * validation.ts — Input validation utilities
 *
 * Rule 4.2: Validate all user input on client side.
 * Rule 2.3: Reusable validation logic.
 */

/** Uzbekistan phone: +998 XX XXX XX XX (12 digits total) */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return { valid: false, error: 'Введите номер телефона' };
  if (!digits.startsWith('998')) return { valid: false, error: 'Номер должен начинаться с +998' };
  if (digits.length !== 12) return { valid: false, error: 'Номер должен содержать 12 цифр' };
  return { valid: true };
}

/** UZ car plate: XX X XXX XX (e.g., 01 A 123 AA) */
export function validateCarPlate(plate: string): { valid: boolean; error?: string } {
  const cleaned = plate.replace(/\s/g, '').toUpperCase();
  if (cleaned.length < 8) return { valid: false, error: 'Введите полный госномер' };
  if (cleaned.length > 9) return { valid: false, error: 'Слишком длинный госномер' };
  return { valid: true };
}

/** Format car plate with spaces: 01 A 123 AA */
export function formatCarPlate(raw: string): string {
  const cleaned = raw.replace(/\s/g, '').toUpperCase();
  let formatted = '';
  for (let i = 0; i < cleaned.length && i < 9; i++) {
    if (i === 2 || i === 3 || i === 6) formatted += ' ';
    formatted += cleaned[i];
  }
  return formatted;
}

/** Format phone for display: +998 XX XXX XX XX */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 12) return phone;
  return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
}

/** OTP code: exactly 6 digits */
export function validateOtp(code: string): boolean {
  return /^\d{6}$/.test(code.replace(/\s/g, ''));
}

/** Format price in UZS with spaces: 990 000 */
export function formatPriceUzs(amount: number): string {
  return amount.toLocaleString('ru-RU').replace(/,/g, ' ');
}
