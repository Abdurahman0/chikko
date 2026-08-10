/**
 * Client-side limits for the "Rasmdan qo'shish" (POST /api/products/from-photo/) flow.
 * Change the values here to change the limits shown to the admin and enforced in the form.
 */

// 10 MB: covers a full-resolution iPhone HEIC or a 12 MP JPEG without letting a
// raw multi-hundred-megabyte file start an upload that the backend will reject.
export const PRODUCT_PHOTO_IMPORT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const PRODUCT_PHOTO_IMPORT_MAX_FILE_SIZE_LABEL = '10 MB';

// HEIC/HEIF are included because the iPhone camera returns them by default.
export const PRODUCT_PHOTO_IMPORT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

// Some browsers report an empty MIME type for HEIC, so the extension is the fallback check.
export const PRODUCT_PHOTO_IMPORT_ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
] as const;

export const PRODUCT_PHOTO_IMPORT_ACCEPT_ATTRIBUTE = 'image/*';

// Background removal + OCR takes seconds. The timeout is deliberately far above the
// expected duration so a slow-but-working import is never cut off by the client.
export const PRODUCT_PHOTO_IMPORT_TIMEOUT_MS = 90_000;

// Elapsed-time thresholds that drive the visible stage labels while waiting.
export const PRODUCT_PHOTO_IMPORT_BACKGROUND_STAGE_MS = 2_500;
export const PRODUCT_PHOTO_IMPORT_OCR_STAGE_MS = 9_000;
