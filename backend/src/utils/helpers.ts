// =============================================================
// UTILITY HELPERS (Browser-safe)
// =============================================================
// NOTE: This file is bundled by Vite for the browser.
// Do NOT import Node.js-only modules here (e.g. crypto, Buffer, fs).
// =============================================================

// ----- DATA VALIDATION -----

export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

export function isValidUUID(id: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(id);
}

// ----- BASE64 / FILE HELPERS -----

/**
 * Converts a File or Blob to a pure base64 string (no data URL prefix).
 * Used by ImageEditor, ImageCloner, and other components that send
 * image data to GeminiService.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to extract base64 data from file.'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error reading file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Extracts base64 data and mimeType from a data URL.
 */
export function extractBase64Data(dataUrl: string): { data: string; mimeType: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (matches) {
    return { mimeType: matches[1], data: matches[2] };
  }
  return { mimeType: 'application/octet-stream', data: dataUrl };
}

/**
 * Converts a base64 string back to a Blob.
 */
export function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  const byteCharacters = atob(base64);
  const byteArrays: Uint8Array[] = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Triggers a browser download for a given URL.
 */
export function downloadUrl(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ----- FILE SIZE HELPERS -----

export function getBase64SizeInBytes(base64String: string): number {
  const cleanBase64 = base64String.replace(/^data:[^;]+;base64,/, '');
  return Math.ceil(cleanBase64.length * 0.75);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// ----- DATE HELPERS -----

export function now(): string {
  return new Date().toISOString();
}

export function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function isPast(dateString: string): boolean {
  return new Date(dateString) < new Date();
}

// ----- RESPONSE HELPERS -----

export function successResponse(data: any, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

export function errorResponse(error: string, statusCode: number = 500) {
  return {
    success: false,
    error,
    statusCode,
  };
}

// ----- SANITIZATION -----

export function sanitizeString(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}