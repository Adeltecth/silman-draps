// Types partagés entre le serveur (API + rendu des balises SEO) et le client React.

export type StockState = 'disponible' | 'limite' | 'rupture' | 'indisponible';

export type EnquiryType = 'retail' | 'wholesale';
export type EnquiryStatus = 'new' | 'contacted' | 'converted' | 'closed';

export interface PublicCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
}

export interface ProductImage {
  id: number;
  path: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  isPrimary: boolean;
}

export interface ProductOption {
  label: string;
  values: string[];
}

/** Produit tel qu'exposé au public : aucune donnée privée (stock exact, notes internes). */
export interface PublicProduct {
  id: number;
  slug: string;
  name: string;
  reference: string | null;
  category: { id: number; slug: string; name: string } | null;
  shortDescription: string | null;
  description: string | null;
  price: number | null;
  priceNote: string | null;
  sizes: string[];
  options: ProductOption[];
  fabric: string | null;
  care: string | null;
  stockState: StockState;
  allowEnquiryWhenOutOfStock: boolean;
  isFeatured: boolean;
  isDemo: boolean;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminProduct extends PublicProduct {
  categoryId: number | null;
  trackStock: boolean;
  stockQty: number | null;
  lowStockThreshold: number | null;
  isAvailable: boolean;
  isActive: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  sortOrder: number;
}

export interface AdminCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface PublicSettings {
  businessName: string;
  logoUrl: string | null;
  whatsappNumber: string;
  phone: string;
  email: string;
  location: string;
  serviceAreas: string;
  openingHours: string;
  social: { facebook: string; instagram: string; tiktok: string };
  heroTitle: string;
  heroSubtitle: string;
  currency: string;
  deliveryInfo: string;
  lowStockThreshold: number;
  seoDefaultDescription: string;
  siteUrl: string;
  demoMode: boolean;
}

export interface AdminSettings extends PublicSettings {
  seoOgImage: string | null;
}

export interface ProductListResponse {
  products: PublicProduct[];
  total: number;
  categories: PublicCategory[];
}

export interface Enquiry {
  id: number;
  type: EnquiryType;
  name: string;
  phone: string;
  email: string | null;
  businessName: string | null;
  productId: number | null;
  productLabel: string | null;
  quantity: number | null;
  message: string | null;
  status: EnquiryStatus;
  adminNote: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  lastLoginAt: string | null;
}

export interface MediaAsset {
  id: number;
  path: string;
  width: number | null;
  height: number | null;
  urls: { small: string; medium: string; large: string };
}
