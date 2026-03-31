import { AuthSessionResponse, AuthUserSummary, clearStoredSession, getStoredAccessToken } from "@/lib/auth-session";
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

interface DeleteWardrobeResponse {
  status: string;
  id: number;
}

interface ApiRecommendationOption {
  title: string;
  rationale: string;
  item_ids: number[];
}

interface ApiAgentTraceStep {
  node: string;
  summary: string;
}

interface ApiRecommendationResponse {
  source: string;
  outfits: ApiRecommendationOption[];
  agent_trace: ApiAgentTraceStep[];
}

interface ApiStatusMessageResponse {
  status: string;
  message: string;
}

interface ApiAiDemoArtifact {
  kind: string;
  label: string;
  value: string | null;
  preview_url: string | null;
  payload: Record<string, unknown> | unknown[] | null;
}

interface ApiAiDemoRunResponse {
  workflow_id: string;
  workflow_title: string;
  provider_mode: string;
  status: string;
  headline: string;
  summary: string;
  model_upgrade_path: string;
  artifacts: ApiAiDemoArtifact[];
}

interface ApiRequestOptions {
  skipAuth?: boolean;
}

export interface EmailPasswordAuthPayload {
  email: string;
  password: string;
}

export interface AgentTraceStep {
  node: string;
  summary: string;
}

export interface RecommendationCard {
  title: string;
  rationale: string;
  itemIds: number[];
}

export interface RecommendationResult {
  source: string;
  outfits: RecommendationCard[];
  agentTrace: AgentTraceStep[];
}

export interface SyncStatus {
  mode: string;
  cloud_enabled: boolean;
  storage_bucket: string | null;
  sync_table: string | null;
  user_id: number;
  supabase_user_id: string | null;
  items_total: number;
  items_with_source_image: number;
  items_with_processed_image: number;
  items_synced_to_cloud: number;
  latest_item_created_at: string | null;
  latest_cloud_sync_at: string | null;
}

export interface SyncRunResponse {
  status: string;
  synced_items: number;
  failed_items: number;
  attempted_items: number;
  latest_cloud_sync_at: string | null;
  message: string;
}

export interface AiDemoWorkflow {
  id: string;
  title: string;
  model_name: string;
  task: string;
  priority: string;
  gpu_requirement: string;
  stage: string;
  api_route: string;
  sample_prompt: string;
  sample_image_hint: string | null;
  summary: string;
  service_slot: string;
  configured_worker_url: string | null;
  delivery_mode: string;
}

export interface AiDemoArtifact {
  kind: string;
  label: string;
  value: string | null;
  previewUrl: string | null;
  payload: Record<string, unknown> | unknown[] | null;
}

export interface AiDemoRunResponse {
  workflow_id: string;
  workflow_title: string;
  provider_mode: string;
  status: string;
  headline: string;
  summary: string;
  model_upgrade_path: string;
  artifacts: AiDemoArtifact[];
}

export interface AiDemoServiceStatus {
  workflow_id: string;
  title: string;
  service_slot: string;
  configured: boolean;
  healthy: boolean | null;
  mode: string;
  worker_url: string | null;
  note: string;
}

export interface MiniProgramShortcut {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  badge: string | null;
}

export interface MiniProgramWorkflowPreview {
  id: string;
  title: string;
  priority: string;
  stage: string;
}

export interface MiniProgramHomeResponse {
  greeting: string;
  user_email: string;
  wardrobe_count: number;
  synced_count: number;
  recommended_prompt: string;
  shortcuts: MiniProgramShortcut[];
  workflow_preview: MiniProgramWorkflowPreview[];
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

function extractErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (typeof record.detail === "string") {
      return record.detail;
    }

    if (typeof record.message === "string") {
      return record.message;
    }
  }

  return `Request failed with status ${status}`;
}

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function apiRequest<T>(path: string, init?: RequestInit, options?: ApiRequestOptions): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const headers = new Headers(init?.headers);
  const accessToken = options?.skipAuth ? null : getStoredAccessToken();

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers
  });

  const text = await response.text();
  const payload = text
    ? (() => {
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return text;
      }
    })()
    : null;

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredSession();
    }

    throw new ApiError(extractErrorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
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

export async function signUpWithPassword(payload: EmailPasswordAuthPayload) {
  return apiRequest<AuthSessionResponse>("/api/v1/auth/sign-up", {
    method: "POST",
    body: JSON.stringify(payload)
  }, { skipAuth: true });
}

export async function signInWithPassword(payload: EmailPasswordAuthPayload) {
  return apiRequest<AuthSessionResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  }, { skipAuth: true });
}

export async function fetchCurrentUser() {
  return apiRequest<AuthUserSummary>("/api/v1/auth/me");
}

export async function refreshAuthSession(payload: { refresh_token: string; access_token?: string | null }) {
  return apiRequest<AuthSessionResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload)
  }, { skipAuth: true });
}

export async function logoutAuthSession(refreshToken?: string | null) {
  return apiRequest<ApiStatusMessageResponse>("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken ?? null })
  });
}

export async function fetchRecommendations(prompt: string) {
  const payload = await apiRequest<ApiRecommendationResponse>("/api/v1/outfits/recommend", {
    method: "POST",
    body: JSON.stringify({ prompt })
  });

  return {
    source: payload.source,
    outfits: payload.outfits.map((item) => ({
      title: item.title,
      rationale: item.rationale,
      itemIds: item.item_ids
    })),
    agentTrace: payload.agent_trace
  } satisfies RecommendationResult;
}

export async function fetchSyncStatus() {
  return apiRequest<SyncStatus>("/api/v1/sync/status");
}

export async function runWardrobeSync() {
  return apiRequest<SyncRunResponse>("/api/v1/sync/wardrobe", {
    method: "POST"
  });
}

export async function fetchAiDemoWorkflows() {
  return apiRequest<AiDemoWorkflow[]>("/api/v1/ai-demo/workflows");
}

export async function fetchAiDemoServiceStatuses() {
  return apiRequest<AiDemoServiceStatus[]>("/api/v1/ai-demo/status");
}

export async function runAiDemoWorkflow(payload: {
  workflow_id: string;
  prompt: string;
  source_image_url?: string;
  garment_name?: string;
  style?: string;
  occasion?: string;
  weather?: string;
}) {
  const response = await apiRequest<ApiAiDemoRunResponse>("/api/v1/ai-demo/run", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return {
    ...response,
    artifacts: response.artifacts.map((artifact) => ({
      kind: artifact.kind,
      label: artifact.label,
      value: artifact.value,
      previewUrl: artifact.preview_url,
      payload: artifact.payload
    }))
  } satisfies AiDemoRunResponse;
}

export async function fetchMiniProgramHome() {
  return apiRequest<MiniProgramHomeResponse>("/api/v1/mini-program/home");
}
