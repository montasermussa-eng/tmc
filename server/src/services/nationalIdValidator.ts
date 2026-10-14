/**
 * Egyptian National ID Validator and Utilities
 * 14-digit National ID structure:
 * Digit 1: Century (2 = 1900-1999, 3 = 2000-2099)
 * Digits 2-3: Year
 * Digits 4-5: Month (01-12)
 * Digits 6-7: Day (01-31)
 * Digits 8-9: Governorate Code
 * Digits 10-13: Sequence Number (odd = male, even = female)
 * Digit 14: Verification digit
 */

export const GOVERNORATE_CODES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج الجمهورية (مواليد الخارج)',
};

/**
 * Normalizes Eastern Arabic / Persian numerals to Western Arabic numerals (0-9)
 */
export function normalizeNumerals(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = String(input).trim();
  const arabicEasternMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };

  return str.replace(/[٠-٩۰-۹]/g, char => arabicEasternMap[char] || char).replace(/\D/g, '');
}

export interface NationalIdValidationResult {
  isValid: boolean;
  error?: string;
  normalized: string;
  details?: {
    century: number;
    birthDate: string; // YYYY-MM-DD
    age: number;
    governorate: string;
    gender: 'ذكر' | 'أنثى';
  };
}

export function validateEgyptianNationalId(rawId: string | number): NationalIdValidationResult {
  const normalized = normalizeNumerals(rawId);

  if (normalized.length !== 14) {
    return {
      isValid: false,
      normalized,
      error: `الرقم القومي يجب أن يتكون من 14 رقماً بالضبط (المُدخل ${normalized.length} رقم)`,
    };
  }

  const centuryDigit = parseInt(normalized[0], 10);
  if (centuryDigit !== 2 && centuryDigit !== 3) {
    return {
      isValid: false,
      normalized,
      error: 'خانة القرن الأولى غير صالحة (يجب أن تبدأ بـ 2 لمواليد 1900-1999 أو 3 لمواليد 2000-2099)',
    };
  }

  const century = centuryDigit === 2 ? 1900 : 2000;
  const year = century + parseInt(normalized.substring(1, 3), 10);
  const month = parseInt(normalized.substring(3, 5), 10);
  const day = parseInt(normalized.substring(5, 7), 10);

  if (month < 1 || month > 12) {
    return {
      isValid: false,
      normalized,
      error: `شهر الميلاد غير صالح في الرقم القومي (${month})`,
    };
  }

  // Days in month validation
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return {
      isValid: false,
      normalized,
      error: `يوم الميلاد غير صالح في الرقم القومي (${day}) للشهر المحدد`,
    };
  }

  const govCode = normalized.substring(7, 9);
  const governorate = GOVERNORATE_CODES[govCode];
  if (!governorate) {
    return {
      isValid: false,
      normalized,
      error: `كود المحافظة (${govCode}) في الرقم القومي غير معتمد`,
    };
  }

  const sequence = parseInt(normalized.substring(9, 13), 10);
  const gender = sequence % 2 === 1 ? 'ذكر' : 'أنثى';

  const birthDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const birthDate = new Date(year, month - 1, day);
  const age = Math.floor((new Date().getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  return {
    isValid: true,
    normalized,
    details: {
      century,
      birthDate: birthDateStr,
      age,
      governorate,
      gender,
    },
  };
}

/**
 * Extracts the last 7 digits of a national ID for fast gate lookup
 */
export function extractLast7Digits(rawId: string | number): string {
  const normalized = normalizeNumerals(rawId);
  return normalized.slice(-7);
}

/**
 * Masks national ID for general listings (e.g. 29803120101915 -> 298****0101915)
 */
export function maskNationalId(nationalId: string): string {
  if (!nationalId || nationalId.length < 14) return nationalId || '';
  return `${nationalId.substring(0, 3)}****${nationalId.substring(7)}`;
}
