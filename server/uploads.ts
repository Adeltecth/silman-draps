import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';
import { config } from './config';
import { db } from './db';
import { IMAGE_SIZES } from '../shared/images';
import type { MediaAsset } from '../shared/types';

// HEIC/HEIF inclus : format fréquent des photos d'iPhone, converti en WebP à l'enregistrement.
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heif', 'image/heic']);

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function mediaUrls(base: string) {
  return {
    small: `/media/${base}-480.webp`,
    medium: `/media/${base}-960.webp`,
    large: `/media/${base}-1600.webp`,
  };
}

/**
 * Enregistre une image envoyée par l'administrateur :
 * - vérification du type réel (décodage sharp), pas seulement du Content-Type déclaré ;
 * - correction de l'orientation, suppression des métadonnées (EXIF) ;
 * - génération de 3 tailles WebP pour le chargement responsive.
 * Les fichiers sont écrits dans data/uploads (stockage persistant), jamais dans le navigateur.
 */
export async function storeImage(buffer: Buffer, originalName: string | undefined, uploadedBy: number | null): Promise<MediaAsset> {
  if (!buffer || buffer.length === 0) throw new UploadError("Le fichier image est vide.");
  if (buffer.length > config.maxUploadBytes) throw new UploadError('Image trop volumineuse (12 Mo maximum).', 413);

  let pipeline: Sharp;
  let meta: Metadata;
  try {
    meta = await sharp(buffer).metadata();
    const format = String(meta.format || '');
    const mime = `image/${format === 'jpg' ? 'jpeg' : format}`;
    if (!format || !ALLOWED.has(mime)) {
      throw new UploadError('Format non pris en charge. Utilisez une photo JPG, PNG ou WebP.');
    }
    if (!meta.width || !meta.height) throw new UploadError('Image illisible.');
    pipeline = sharp(buffer, { failOn: 'error' }).rotate();
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError("Ce fichier n'est pas une image valide.");
  }

  const base = `${Date.now().toString(36)}${crypto.randomBytes(6).toString('hex')}`;
  let width = meta.width;
  let height = meta.height;

  for (const size of IMAGE_SIZES) {
    const outPath = path.join(config.uploadsDir, `${base}-${size}.webp`);
    const info = await pipeline
      .clone()
      .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: size === 480 ? 74 : 80, effort: 4 })
      .toFile(outPath);
    if (size === 960) {
      width = info.width;
      height = info.height;
    }
  }

  const info = db
    .prepare('INSERT INTO media (base, original_name, width, height, byte_size, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)')
    .run(base, (originalName ?? '').slice(0, 180), width, height, buffer.length, uploadedBy);

  return {
    id: Number(info.lastInsertRowid),
    path: `/media/${base}`,
    width,
    height,
    urls: mediaUrls(base),
  };
}

export async function storeImageFromFile(filePath: string, uploadedBy: number | null = null): Promise<MediaAsset> {
  const buffer = fs.readFileSync(filePath);
  return storeImage(buffer, path.basename(filePath), uploadedBy);
}

export function mediaExists(base: string): boolean {
  return !!db.prepare('SELECT 1 FROM media WHERE base = ?').get(base);
}
