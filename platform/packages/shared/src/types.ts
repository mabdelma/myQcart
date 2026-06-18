/** Cross-service DTOs (the contracts services agree on). */

export type PlanId = "FREE" | "PRO" | "AGENCY";
export type Role = "BUYER" | "TENANT" | "SELLER" | "LANDLORD" | "BROKER" | "DEVELOPER" | "ADMIN" | "SUPER_ADMIN";

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  plan: PlanId;
  locale: string | null;
}

export interface ListingDTO {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  type: string;
  status: string;
  country: string;
  city: string;
  areaName: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  lat: number | null;
  lng: number | null;
  images: string[];
  tour360: string[];
}

export interface EmailRequest {
  to: string;
  template: "verify" | "reset" | "ownerViewing" | "viewingUpdate" | "alertDigest" | "adminInvite";
  locale?: string;
  /** template-specific variables (url, name, counts, …) */
  vars: Record<string, unknown>;
}

/** Domain events on the bus (Phase: async). */
export type DomainEvent =
  | { type: "user.registered"; userId: string; email: string; locale?: string }
  | { type: "viewing.requested"; viewingId: string; ownerEmail: string; locale?: string }
  | { type: "payment.succeeded"; userId: string; plan: PlanId; couponId?: string }
  | { type: "coupon.redeemed"; couponId: string };
