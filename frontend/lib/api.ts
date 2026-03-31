import { categoryToSlot, colorToHex, FilterCategory, WardrobeCategory, WardrobeItem, WardrobeSlot } from "@/store/wardrobe-store";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

interface ApiWardrobeItem {
  id: number;
  user_id: number | null;
  name: string;
  category: string;
  slot: string;
  color: string;
  brand: string | null;
  image_url: string | null;
  processed_image_url: string | null;
  tags: string[];
  occasions: string[];
  style_notes: string | null;
  created_at: string;
}

interface DemoUser {
  id: number;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

interface DeleteWardrobeResponse {
  status: string;
  id: number;
}

export interface DemoLoginResponse {
  access_token: string;
  token_type: string;
  user: DemoUser;
}

export interface WardrobeFormValues {
  name: string;
  category: WardrobeCategory;
  color: string;
  brand: string;
  imageUrl: string;
  imageFile: File | null;
  tags: string;
  occasions: string;
  note: string;
}

function normalizeCategory(category: string): WardrobeCategory {
  const value = category.toLowerCase();

  if (value === "tops" || value === "bottoms" || value === "outerwear" || value === "shoes" || value === "accessories") {
    return value;
  }

  return "accessories";
}

function normalizeSlot(slot: string, category: WardrobeCategory): WardrobeSlot {
  const value = slot.toLowerCase();

  if (value === "top" || value === "bottom" || value === "outerwear" || value === "shoes" || value === "accessory") {
    return value;
  }

  return categoryToSlot(category);
}

function parseList(value: string) {
  return value.split(",").map((token) => token.trim()).filter(Boolean);
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers = new Headers(init?.headers);

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (text ? JSON.parse(text) : null) as T;
}

export function mapApiWardrobeItem(item: ApiWardrobeItem): WardrobeItem {
  const category = normalizeCategory(item.category);

  return {
    id: item.id,
    name: item.name,
    category,
    slot: normalizeSlot(item.slot, category),
    color: item.color,
    colorHex: colorToHex(item.color),
    brand: item.brand ?? "Personal Archive",
    tags: item.tags ?? [],
    occasions: item.occasions ?? [],
    note: item.style_notes ?? "Ready for recommendation and try-on.",
    imageLabel: item.name,
    imageUrl: item.image_url,
    processedImageUrl: item.processed_image_url
  };
}

export function resolveAssetUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }

  return path.startsWith("/") ? `${API_BASE_URL}${path}` : `${API_BASE_URL}/${path}`;
}

export async function fetchWardrobeItems(params?: { category?: FilterCategory; query?: string }) {
  const query = new URLSearchParams();

  if (params?.category && params.category !== "all") {
    query.set("category", params.category);
  }

  if (params?.query) {
    query.set("query", params.query);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const items = await apiRequest<ApiWardrobeItem[]>(`/api/v1/wardrobe/items${suffix}`);
  return items.map(mapApiWardrobeItem);
}

function buildWardrobePayload(values: WardrobeFormValues) {
  return {
    name: values.name.trim(),
    category: values.category,
    slot: categoryToSlot(values.category),
    color: values.color.trim(),
    brand: values.brand.trim() || null,
    image_url: values.imageUrl.trim() || null,
    tags: parseList(values.tags),
    occasions: parseList(values.occasions),
    style_notes: values.note.trim() || null
  };
}

export async function createWardrobeItem(values: WardrobeFormValues) {
  const item = await apiRequest<ApiWardrobeItem>("/api/v1/wardrobe/items", {
    method: "POST",
    body: JSON.stringify(buildWardrobePayload(values))
  });

  return mapApiWardrobeItem(item);
}

export async function updateWardrobeItem(itemId: number, values: WardrobeFormValues) {
  const item = await apiRequest<ApiWardrobeItem>(`/api/v1/wardrobe/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(buildWardrobePayload(values))
  });

  return mapApiWardrobeItem(item);
}

export async function deleteWardrobeItem(itemId: number) {
  return apiRequest<DeleteWardrobeResponse>(`/api/v1/wardrobe/items/${itemId}`, {
    method: "DELETE"
  });
}

export async function uploadWardrobeItemImage(itemId: number, file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const item = await apiRequest<ApiWardrobeItem>(`/api/v1/wardrobe/items/${itemId}/upload-image`, {
    method: "POST",
    body: formData
  });

  return mapApiWardrobeItem(item);
}

export async function processWardrobeImage(itemId: number) {
  const item = await apiRequest<ApiWardrobeItem>(`/api/v1/wardrobe/items/${itemId}/process-image`, {
    method: "POST"
  });

  return mapApiWardrobeItem(item);
}

export async function demoLogin() {
  return apiRequest<DemoLoginResponse>("/api/v1/auth/demo-login", {
    method: "POST",
    body: JSON.stringify({})
  });
}
