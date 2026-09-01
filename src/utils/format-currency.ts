/** Formats a number as Bangladeshi Taka, e.g. formatCurrency(1500) -> "৳1,500". */
export function formatCurrency(amount: number, currency = "BDT"): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
