/** 01[3-9] + 8 digits — 11 digits total. Shared across every schema that collects a Bangladeshi
 * phone number (`auth`, `checkout`, `order-tracking`, ...) so the pattern can't drift between them. */
export const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;

export const BD_PHONE_ERROR_MESSAGE = "Enter a valid Bangladeshi phone number";
