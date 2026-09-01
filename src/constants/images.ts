/**
 * Shared by every admin image-upload feature (products, categories, ...) — not domain-specific.
 * Server-validated in each domain's own upload service function (e.g.
 * `productsService.uploadProductImage`, `categoriesService.uploadCategoryImage`) — never trust
 * the client's `file.type` alone. These same values also drive each upload input's `accept`
 * attribute so a user isn't even offered a file type the server would reject.
 */
export const IMAGE_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const IMAGE_EXTENSION: Record<(typeof IMAGE_ALLOWED_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5MB
