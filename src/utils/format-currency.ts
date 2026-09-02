/** Formats a number as Bangladeshi Taka, e.g. formatCurrency(1500) -> "BDT 1,500" — `Intl`
 * renders the BDT currency code rather than the ৳ glyph under Node's ICU data, which in practice
 * reads more clearly anyway (৳ has inconsistent font support across devices). */
export function formatCurrency(amount: number, currency = "BDT"): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
