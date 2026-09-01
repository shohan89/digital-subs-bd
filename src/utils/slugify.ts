/** Lowercase, alphanumeric-and-hyphen slug — matches `products.slug`'s check constraint
 * (`^[a-z0-9-]+$`). Used by `ProductForm`'s "Generate from name" helper, not run automatically on
 * every keystroke — an explicit action is more predictable than silently rewriting a field the
 * admin might already be editing directly. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
