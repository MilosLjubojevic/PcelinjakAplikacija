import { Alert } from 'react-native';

export interface ValidationRule {
  field: string;
  label: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  isNumeric?: boolean;
  isEmail?: boolean;
  isPhone?: boolean;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export function validate(data: Record<string, any>, rules: ValidationRule[]): string[] {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];
    const label = rule.label;

    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors.push(`${label} je obavezno polje`);
      continue;
    }

    if (!value && !rule.required) continue;

    const strValue = typeof value === 'string' ? value.trim() : String(value);

    if (rule.minLength && strValue.length < rule.minLength) {
      errors.push(`${label} mora imati najmanje ${rule.minLength} karaktera`);
    }

    if (rule.maxLength && strValue.length > rule.maxLength) {
      errors.push(`${label} ne sme imati više od ${rule.maxLength} karaktera`);
    }

    if (rule.isNumeric) {
      const num = parseFloat(strValue);
      if (isNaN(num)) {
        errors.push(`${label} mora biti broj`);
      } else {
        if (rule.min !== undefined && num < rule.min) {
          errors.push(`${label} mora biti najmanje ${rule.min}`);
        }
        if (rule.max !== undefined && num > rule.max) {
          errors.push(`${label} ne sme biti veće od ${rule.max}`);
        }
      }
    }

    if (rule.isEmail && strValue) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strValue)) {
        errors.push(`${label} nije validna email adresa`);
      }
    }

    if (rule.isPhone && strValue) {
      const phoneRegex = /^[+]?[\d\s()-]{6,20}$/;
      if (!phoneRegex.test(strValue)) {
        errors.push(`${label} nije validan broj telefona`);
      }
    }

    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  return errors;
}

export function validateAndAlert(data: Record<string, any>, rules: ValidationRule[]): boolean {
  const errors = validate(data, rules);
  if (errors.length > 0) {
    Alert.alert('Greška u unosu', errors.join('\n'));
    return false;
  }
  return true;
}
