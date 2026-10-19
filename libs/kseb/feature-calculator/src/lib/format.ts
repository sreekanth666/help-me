const paise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const units = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** `₹1,234.50`, with a true minus sign for credits. */
export const formatMoney = (value: number) =>
  paise.format(value).replace('-', '−');

export const formatRupees = (value: number) =>
  rupees.format(value).replace('-', '−');

export const formatUnits = (value: number) => units.format(value);
