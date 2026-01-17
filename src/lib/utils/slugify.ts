import slugifyLib from 'slugify';
import { v4 as uuidv4 } from 'uuid';

export function createSlug(text: string, addUniqueId = false): string {
  const slug = slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
  });

  if (addUniqueId) {
    const shortId = uuidv4().slice(0, 8);
    return `${slug}-${shortId}`;
  }

  return slug;
}

export function generateCertificateNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = uuidv4().slice(0, 8).toUpperCase();
  return `CERT-${year}${month}-${random}`;
}

export function generateUniqueId(): string {
  return uuidv4();
}
