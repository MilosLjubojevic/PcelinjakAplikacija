// Currency formatting utility for KM (Konvertibilna Marka)
export const formatCurrency = (amount: number): string => {
  return `${amount.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} KM`;
};

export const formatCurrencyShort = (amount: number): string => {
  return `${amount.toLocaleString('de-DE')} KM`;
};
