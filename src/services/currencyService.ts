export const formatCurrency = (amount: number, currency: string = 'Kz') => {
  return `${amount.toLocaleString()} ${currency}`;
};

export const getAoaExchangeRate = async () => {
  return 1000; // Mock rate
};
