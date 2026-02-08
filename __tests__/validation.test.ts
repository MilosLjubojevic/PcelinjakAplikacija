import { validate } from '../utils/validation';

describe('validate', () => {
  it('returns error for required empty fields', () => {
    const errors = validate({ name: '' }, [
      { field: 'name', label: 'Naziv', required: true },
    ]);
    expect(errors).toEqual(['Naziv je obavezno polje']);
  });

  it('returns error for required whitespace-only fields', () => {
    const errors = validate({ name: '   ' }, [
      { field: 'name', label: 'Naziv', required: true },
    ]);
    expect(errors).toEqual(['Naziv je obavezno polje']);
  });

  it('passes when required field has value', () => {
    const errors = validate({ name: 'Test' }, [
      { field: 'name', label: 'Naziv', required: true },
    ]);
    expect(errors).toEqual([]);
  });

  it('skips non-required empty fields', () => {
    const errors = validate({ notes: '' }, [
      { field: 'notes', label: 'Beleške', minLength: 5 },
    ]);
    expect(errors).toEqual([]);
  });

  it('validates minLength', () => {
    const errors = validate({ name: 'AB' }, [
      { field: 'name', label: 'Naziv', required: true, minLength: 3 },
    ]);
    expect(errors).toEqual(['Naziv mora imati najmanje 3 karaktera']);
  });

  it('validates maxLength', () => {
    const errors = validate({ name: 'ABCDEF' }, [
      { field: 'name', label: 'Naziv', required: true, maxLength: 5 },
    ]);
    expect(errors).toEqual(['Naziv ne sme imati više od 5 karaktera']);
  });

  it('validates numeric fields', () => {
    const errors = validate({ price: 'abc' }, [
      { field: 'price', label: 'Cena', required: true, isNumeric: true },
    ]);
    expect(errors).toEqual(['Cena mora biti broj']);
  });

  it('validates numeric min', () => {
    const errors = validate({ count: '0' }, [
      { field: 'count', label: 'Količina', required: true, isNumeric: true, min: 1 },
    ]);
    expect(errors).toEqual(['Količina mora biti najmanje 1']);
  });

  it('validates numeric max', () => {
    const errors = validate({ strength: '15' }, [
      { field: 'strength', label: 'Snaga', required: true, isNumeric: true, max: 10 },
    ]);
    expect(errors).toEqual(['Snaga ne sme biti veće od 10']);
  });

  it('validates email format', () => {
    const errors = validate({ email: 'not-an-email' }, [
      { field: 'email', label: 'Email', required: true, isEmail: true },
    ]);
    expect(errors).toEqual(['Email nije validna email adresa']);
  });

  it('passes valid email', () => {
    const errors = validate({ email: 'test@example.com' }, [
      { field: 'email', label: 'Email', required: true, isEmail: true },
    ]);
    expect(errors).toEqual([]);
  });

  it('validates phone format', () => {
    const errors = validate({ phone: 'abc' }, [
      { field: 'phone', label: 'Telefon', required: true, isPhone: true },
    ]);
    expect(errors).toEqual(['Telefon nije validan broj telefona']);
  });

  it('passes valid phone', () => {
    const errors = validate({ phone: '+381 64 123 4567' }, [
      { field: 'phone', label: 'Telefon', required: true, isPhone: true },
    ]);
    expect(errors).toEqual([]);
  });

  it('supports custom validators', () => {
    const errors = validate({ code: 'ABC' }, [
      {
        field: 'code',
        label: 'Kod',
        required: true,
        custom: (val) => (val !== 'VALID' ? 'Kod mora biti VALID' : null),
      },
    ]);
    expect(errors).toEqual(['Kod mora biti VALID']);
  });

  it('collects multiple errors', () => {
    const errors = validate({ name: '', price: 'abc' }, [
      { field: 'name', label: 'Naziv', required: true },
      { field: 'price', label: 'Cena', required: true, isNumeric: true },
    ]);
    expect(errors).toHaveLength(2);
  });
});
