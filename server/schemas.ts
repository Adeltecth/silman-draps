import { z } from 'zod';
import { normaliseWhatsAppNumber } from '../shared/whatsapp';

/** Nettoie une chaîne : retire les caractères de contrôle et les espaces superflus. */
export const clean = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim())
    .refine((v) => v.length <= max, { message: `Ce champ ne doit pas dépasser ${max} caractères.` });

export const cleanMultiline = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim())
    .refine((v) => v.length <= max, { message: `Ce champ ne doit pas dépasser ${max} caractères.` });

const optionalMultiline = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((v) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() : ''));

// Champ texte facultatif : accepte l'absence, la chaîne vide ou null (envoyé par certains formulaires).
const optionalText = (max: number) =>
  z
    .union([z.string().max(max), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined) return undefined;
      const cleaned = v.replace(/[\u0000-\u001F\u007F]/g, ' ').trim();
      return cleaned === '' ? undefined : cleaned;
    });

const phoneSchema = clean(30).refine((v) => v.replace(/\D/g, '').length >= 6, {
  message: 'Numéro de téléphone invalide (au moins 6 chiffres).',
});

const urlOrEmpty = z
  .string()
  .max(300)
  .transform((v) => v.trim())
  .refine((v) => v === '' || /^https?:\/\/[^\s<>"]+$/i.test(v), { message: 'Lien invalide (doit commencer par http:// ou https://).' });

const imageInput = z.object({
  path: z.string().regex(/^\/media\/[a-z0-9_-]+$/i, 'Chemin d’image invalide.'),
  alt: optionalText(200),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

export const productSchema = z.object({
  name: clean(120).pipe(z.string().min(2, 'Le nom du produit est obligatoire.')),
  reference: optionalText(60),
  categoryId: z.number().int().positive().nullable().optional(),
  shortDescription: optionalText(300),
  description: cleanMultiline(6000).optional(),
  price: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  priceNote: optionalText(120),
  sizes: z.array(clean(40)).max(20).optional(),
  options: z
    .array(z.object({ label: clean(60), values: z.array(clean(60)).max(30) }))
    .max(10)
    .optional(),
  fabric: optionalText(200),
  care: optionalText(300),
  trackStock: z.boolean().optional(),
  stockQty: z.number().int().min(0).max(1_000_000).nullable().optional(),
  lowStockThreshold: z.number().int().min(0).max(10_000).nullable().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
  allowEnquiryWhenOutOfStock: z.boolean().optional(),
  metaTitle: optionalText(120),
  metaDescription: optionalText(200),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  images: z.array(imageInput).max(12).optional(),
});

export const stockUpdateSchema = z.object({
  trackStock: z.boolean(),
  stockQty: z.number().int().min(0).max(1_000_000).nullable(),
  lowStockThreshold: z.number().int().min(0).max(10_000).nullable().optional(),
});

export const quickStatusSchema = z.object({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: clean(60).pipe(z.string().min(2, 'Le nom de la catégorie est obligatoire.')),
  description: optionalText(400),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});

export const enquirySchema = z.object({
  type: z.enum(['retail', 'wholesale']).default('retail'),
  name: clean(80).pipe(z.string().min(2, 'Votre nom est obligatoire.')),
  phone: phoneSchema,
  email: z
    .union([z.string().max(160), z.null()])
    .optional()
    .transform((v) => (v ?? '').trim())
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), { message: 'Adresse e-mail invalide.' }),
  businessName: optionalText(120),
  productId: z.number().int().positive().nullable().optional(),
  productLabel: optionalText(160),
  quantity: z.number().int().min(1).max(100_000).nullable().optional(),
  message: optionalMultiline(1500),
  // Piège anti-robots : doit rester vide.
  website: z.union([z.string().max(200), z.null()]).optional(),
});

export const enquiryUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'closed']).optional(),
  adminNote: cleanMultiline(2000).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide.').max(160),
  password: z.string().min(1, 'Mot de passe requis.').max(200),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, 'Le nouveau mot de passe doit contenir au moins 10 caractères.').max(200),
});

export const settingsSchema = z.object({
  business_name: clean(80),
  whatsapp_number: z
    .string()
    .max(30)
    .transform((v) => v.trim())
    .refine((v) => v === '' || normaliseWhatsAppNumber(v).ok, {
      message: 'Numéro WhatsApp invalide. Utilisez le format international, ex. +225 07 00 00 00 00.',
    }),
  phone: z.string().max(40).transform((v) => v.trim()),
  email: z
    .string()
    .max(160)
    .transform((v) => v.trim())
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), { message: 'Adresse e-mail invalide.' }),
  location: clean(200),
  service_areas: cleanMultiline(400),
  opening_hours: cleanMultiline(300),
  social_facebook: urlOrEmpty,
  social_instagram: urlOrEmpty,
  social_tiktok: urlOrEmpty,
  hero_title: clean(120),
  hero_subtitle: cleanMultiline(400),
  currency: z
    .string()
    .length(3, 'Code devise sur 3 lettres (ex. XOF).')
    .transform((v) => v.toUpperCase()),
  delivery_info: cleanMultiline(600),
  low_stock_threshold: z.number().int().min(0).max(10_000),
  seo_default_description: cleanMultiline(200),
  seo_site_url: urlOrEmpty,
  seo_og_image: z
    .string()
    .max(300)
    .transform((v) => v.trim())
    .refine((v) => v === '' || /^\/media\/[a-z0-9_-]+-(480|960|1600)\.webp$/i.test(v) || /^https?:\/\/[^\s<>"]+$/i.test(v), {
      message: 'Image SEO invalide.',
    }),
  logo_url: z
    .string()
    .max(300)
    .transform((v) => v.trim())
    .refine((v) => v === '' || /^\/media\/[a-z0-9_-]+-(480|960|1600)\.webp$/i.test(v), { message: 'Logo invalide.' }),
});

export type ProductInput = z.infer<typeof productSchema>;
export type EnquiryInput = z.infer<typeof enquirySchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
