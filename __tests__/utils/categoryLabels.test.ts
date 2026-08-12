import {
  expenseCategoryLabels,
  incomeCategoryLabels,
  expenseCategoryOptions,
  incomeCategoryOptions,
  categoryColors,
  getExpenseCategoryLabel,
  getIncomeCategoryLabel,
  getCategoryColor,
} from '../../utils/categoryLabels';
import { COLORS } from '../../constants/designTokens';

describe('expenseCategoryLabels', () => {
  it('has labels for all 7 expense categories', () => {
    const categories = ['equipment', 'feed', 'medication', 'maintenance', 'transportation', 'packaging', 'other'];
    categories.forEach(cat => {
      expect(expenseCategoryLabels[cat as keyof typeof expenseCategoryLabels]).toBeDefined();
    });
  });
});

describe('incomeCategoryLabels', () => {
  it('has labels for all 6 income categories', () => {
    const categories = ['honey-sale', 'nucleus-sale', 'queen-sale', 'wax-sale', 'pollination', 'other'];
    categories.forEach(cat => {
      expect(incomeCategoryLabels[cat as keyof typeof incomeCategoryLabels]).toBeDefined();
    });
  });
});

describe('expenseCategoryOptions', () => {
  it('has matching label/value pairs', () => {
    expect(expenseCategoryOptions).toHaveLength(7);
    expenseCategoryOptions.forEach(opt => {
      expect(opt.label).toBeTruthy();
      expect(opt.value).toBeTruthy();
    });
  });
});

describe('incomeCategoryOptions', () => {
  it('has matching label/value pairs', () => {
    expect(incomeCategoryOptions).toHaveLength(8);
    incomeCategoryOptions.forEach(opt => {
      expect(opt.label).toBeTruthy();
      expect(opt.value).toBeTruthy();
    });
  });
});

describe('getExpenseCategoryLabel', () => {
  it('returns label for known category', () => {
    expect(getExpenseCategoryLabel('feed')).toBe('Hrana');
    expect(getExpenseCategoryLabel('equipment')).toBe('Oprema');
  });

  it('returns raw category string for unknown category', () => {
    expect(getExpenseCategoryLabel('unknown' as any)).toBe('unknown');
  });
});

describe('getIncomeCategoryLabel', () => {
  it('returns label for known category', () => {
    expect(getIncomeCategoryLabel('honey-sale')).toBe('Med');
    expect(getIncomeCategoryLabel('queen-sale')).toBe('Matice');
  });

  it('returns raw category string for unknown category', () => {
    expect(getIncomeCategoryLabel('unknown' as any)).toBe('unknown');
  });
});

describe('getCategoryColor', () => {
  it('returns color for expense categories', () => {
    expect(getCategoryColor('equipment')).toBe(COLORS.info);
    expect(getCategoryColor('feed')).toBe(COLORS.success);
    expect(getCategoryColor('medication')).toBe(COLORS.danger);
  });

  it('returns color for income categories', () => {
    expect(getCategoryColor('honey-sale')).toBe(COLORS.primary);
  });

  it('returns fallback color for unknown category', () => {
    expect(getCategoryColor('unknown' as any)).toBe(COLORS.textSecondary);
  });
});

describe('categoryColors', () => {
  it('has colors for all expense + income categories', () => {
    const allCategories = [
      'equipment', 'feed', 'medication', 'maintenance', 'transportation', 'packaging',
      'honey-sale', 'nucleus-sale', 'queen-sale', 'wax-sale', 'pollination', 'other',
    ];
    allCategories.forEach(cat => {
      expect(categoryColors[cat]).toBeTruthy();
    });
  });
});
