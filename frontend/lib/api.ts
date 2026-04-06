import { AuthSessionResponse, AuthUserSummary, clearStoredSession, getStoredAccessToken } from "@/lib/auth-session";
import { categoryToSlot, ClothingMemoryCard, colorToHex, FilterCategory, WardrobeCategory, WardrobeItem, WardrobeSlot } from "@/store/wardrobe-store";

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
  last_synced_at?: string | null;
  memory_card?: ApiMemoryCard | null;
}

interface ApiMemoryCard {
  id: number;
  user_id: number;
  item_id: number;
  highlights: string[];
  avoid_contexts: string[];
  care_status: string;
  care_note: string | null;
  season_tags: string[];
  updated_at: string;
}

interface DeleteWardrobeResponse {
  status: string;
  id: number;
}

interface ApiRecommendationOption {
  title: string;
  rationale: string;
  item_ids: number[];
  confidence: number | null;
  confidence_label: string | null;
  key_item_id: number | null;
  substitute_item_ids: number[];
  reason_badges: string[];
  charm_copy: string | null;
  mood_emoji: string | null;
}

interface ApiAgentTraceStep {
  node: string;
  summary: string;
}

interface ApiRecommendationResponse {
  source: string;
  outfits: ApiRecommendationOption[];
  agent_trace: ApiAgentTraceStep[];
  profile_summary: string | null;
  closet_gaps: string[];
  reminder_flags: string[];
}

interface ApiTomorrowPlanBlock {
  period: string;
  summary: string;
  recommendation: ApiRecommendationResponse;
}

interface ApiTomorrowAssistantResponse {
  weather: WeatherSummary;
  morning: ApiTomorrowPlanBlock;
  evening: ApiTomorrowPlanBlock;
  commute_tip: string;
}

interface ApiAssistantOverview {
  tomorrow: ApiTomorrowAssistantResponse;
  gaps: ClosetGapResult;
  reminders: ReminderResult;
  style_profile: StyleProfile;
  recent_saved_outfits: SavedOutfit[];
}

interface ApiTryOnLookItem {
  item_id: number | null;
  name: string;
  slot: string;
  image_url: string | null;
}

interface ApiTryOnRenderResponse {
  status: string;
  provider_mode: string;
  provider: string;
  preview_url: string;
  item_ids: number[];
  items: ApiTryOnLookItem[];
  message: string;
  prompt: string | null;
  scene: string | null;
  created_at: string;
}

interface ApiStatusMessageResponse {
  status: string;
  message: string;
  action_url?: string | null;
  action_label?: string | null;
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

interface ApiImageUploadPlan {
  upload_url: string;
  public_url: string;
  method: string;
  headers: Record<string, string>;
}

export interface EmailPasswordAuthPayload {
  email: string;
  password: string;
  display_name?: string;
}

export interface PasswordResetPayload {
  email: string;
  redirect_to?: string;
}

export interface PasswordResetConfirmPayload {
  token?: string;
  access_token?: string;
  new_password: string;
}

export interface OAuthStartResponse {
  provider: string;
  url: string;
}

export interface AgentTraceStep {
  node: string;
  summary: string;
}

export interface RecommendationCard {
  title: string;
  rationale: string;
  itemIds: number[];
  confidence: number | null;
  confidenceLabel: string | null;
  keyItemId: number | null;
  substituteItemIds: number[];
  reasonBadges: string[];
  charmCopy: string | null;
  moodEmoji: string | null;
}

export interface RecommendationResult {
  source: string;
  outfits: RecommendationCard[];
  agentTrace: AgentTraceStep[];
  profileSummary: string | null;
  closetGaps: string[];
  reminderFlags: string[];
}

export interface GeoLocationOption {
  name: string;
  country: string | null;
  admin1: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
}

export interface WeatherSummary {
  location_name: string;
  timezone: string;
  date: string;
  weather_code: number;
  condition_label: string;
  temperature_max: number;
  temperature_min: number;
  precipitation_probability_max: number | null;
}

export interface TomorrowPlanBlock {
  period: string;
  summary: string;
  recommendation: RecommendationResult;
}

export interface TomorrowAssistantResult {
  weather: WeatherSummary;
  morning: TomorrowPlanBlock;
  evening: TomorrowPlanBlock;
  commute_tip: string;
}

export interface GapInsight {
  title: string;
  description: string;
  urgency: string;
}

export interface ClosetGapResult {
  summary: string;
  insights: GapInsight[];
}

export interface ReminderCard {
  title: string;
  description: string;
  tone: string;
  item_ids: number[];
}

export interface ReminderResult {
  repeat_warning: ReminderCard[];
  laundry_and_care: ReminderCard[];
  idle_and_seasonal: ReminderCard[];
}

export interface PackingSuggestion {
  item_id: number;
  reason: string;
}

export interface PackingResponse {
  city: string;
  weather: WeatherSummary;
  capsule_summary: string;
  suggestions: PackingSuggestion[];
}

export interface TryOnLookItem {
  itemId: number | null;
  name: string;
  slot: string;
  imageUrl: string | null;
}

export interface TryOnRenderResult {
  status: string;
  providerMode: string;
  provider: string;
  previewUrl: string;
  itemIds: number[];
  items: TryOnLookItem[];
  message: string;
  prompt: string | null;
  scene: string | null;
  createdAt: string;
}

export interface StyleProfile {
  user_id: number;
  favorite_colors: string[];
  avoid_colors: string[];
  favorite_silhouettes: string[];
  avoid_silhouettes: string[];
  style_keywords: string[];
  dislike_keywords: string[];
  commute_profile: string | null;
  comfort_priorities: string[];
  wardrobe_rules: string[];
  personal_note: string | null;
  updated_at: string | null;
}

export type ExperienceStyleProfileDraft = Omit<StyleProfile, "user_id" | "updated_at">;

export interface ExperienceStyleDnaEntry {
  label: string;
  value: number;
  color: string;
}

export interface ExperienceStyleColorEntry {
  name: string;
  hex: string;
}

export interface ExperienceStyleSilhouetteEntry {
  name: string;
  desc: string;
  preferred: boolean;
  badge: string;
  item_count?: number;
  wear_count?: number;
  examples?: string[];
}

export interface ExperienceStyleKeywordEntry {
  label: string;
  tone: string;
}

export interface ExperienceStyleProfileOverview {
  hero_subtitle: string;
  dna: ExperienceStyleDnaEntry[];
  favorite_colors: ExperienceStyleColorEntry[];
  avoid_colors: ExperienceStyleColorEntry[];
  silhouettes: ExperienceStyleSilhouetteEntry[];
  keywords: ExperienceStyleKeywordEntry[];
  rules: string[];
  personal_note: string;
  updated_at_label: string;
  profile: ExperienceStyleProfileDraft;
}

export interface ExperienceStyleProfileUpdateResponse {
  status: string;
  message: string;
  updated_at: string | null;
}

export interface SavedOutfit {
  id: number;
  user_id: number | null;
  name: string;
  occasion: string | null;
  style: string | null;
  item_ids: number[];
  reasoning: string | null;
  ai_generated: boolean;
  created_at: string;
}

export interface WearLog {
  id: number;
  user_id: number;
  outfit_id: number | null;
  outfit_name: string | null;
  item_ids: number[];
  occasion: string | null;
  period: string;
  location_label: string | null;
  feedback_note: string | null;
  worn_on: string;
}

export interface AssistantOverview {
  tomorrow: TomorrowAssistantResult;
  gaps: ClosetGapResult;
  reminders: ReminderResult;
  style_profile: StyleProfile;
  recent_saved_outfits: SavedOutfit[];
}

export interface AssistantTask {
  id: number;
  task_type: string;
  status: string;
  input_payload: Record<string, unknown>;
  result_payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface MiniProgramAssistantOverview {
  tomorrow: TomorrowAssistantResult;
  gaps: ClosetGapResult;
  reminders: ReminderResult;
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

function mapMemoryCard(card: ApiMemoryCard | null | undefined): ClothingMemoryCard | null {
  if (!card) {
    return null;
  }

  return {
    id: card.id,
    userId: card.user_id,
    itemId: card.item_id,
    highlights: card.highlights ?? [],
    avoidContexts: card.avoid_contexts ?? [],
    careStatus: card.care_status,
    careNote: card.care_note,
    seasonTags: card.season_tags ?? [],
    updatedAt: card.updated_at
  };
}

function mapRecommendationResult(payload: ApiRecommendationResponse): RecommendationResult {
  return {
    source: payload.source,
    outfits: payload.outfits.map((item) => ({
      title: item.title,
      rationale: item.rationale,
      itemIds: item.item_ids,
      confidence: item.confidence,
      confidenceLabel: item.confidence_label,
      keyItemId: item.key_item_id,
      substituteItemIds: item.substitute_item_ids ?? [],
      reasonBadges: item.reason_badges ?? [],
      charmCopy: item.charm_copy,
      moodEmoji: item.mood_emoji
    })),
    agentTrace: payload.agent_trace,
    profileSummary: payload.profile_summary,
    closetGaps: payload.closet_gaps ?? [],
    reminderFlags: payload.reminder_flags ?? []
  };
}

function mapTomorrowAssistantResult(payload: ApiTomorrowAssistantResponse): TomorrowAssistantResult {
  return {
    weather: payload.weather,
    morning: {
      period: payload.morning.period,
      summary: payload.morning.summary,
      recommendation: mapRecommendationResult(payload.morning.recommendation)
    },
    evening: {
      period: payload.evening.period,
      summary: payload.evening.summary,
      recommendation: mapRecommendationResult(payload.evening.recommendation)
    },
    commute_tip: payload.commute_tip
  };
}

function mapAssistantOverview(payload: ApiAssistantOverview): AssistantOverview {
  return {
    tomorrow: mapTomorrowAssistantResult(payload.tomorrow),
    gaps: payload.gaps,
    reminders: payload.reminders,
    style_profile: payload.style_profile,
    recent_saved_outfits: payload.recent_saved_outfits
  };
}

function mapTryOnRenderResult(payload: ApiTryOnRenderResponse): TryOnRenderResult {
  return {
    status: payload.status,
    providerMode: payload.provider_mode,
    provider: payload.provider,
    previewUrl: resolveAssetUrl(payload.preview_url) ?? payload.preview_url,
    itemIds: payload.item_ids ?? [],
    items: (payload.items ?? []).map((item) => ({
      itemId: item.item_id,
      name: item.name,
      slot: item.slot,
      imageUrl: resolveAssetUrl(item.image_url)
    })),
    message: payload.message,
    prompt: payload.prompt,
    scene: payload.scene,
    createdAt: payload.created_at
  };
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
  const seasonTags = item.memory_card?.season_tags?.length
    ? item.memory_card.season_tags
    : (item.tags ?? []).filter((tag) => /春|夏|秋|冬|spring|summer|autumn|fall|winter/i.test(tag));

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
    imageUrl: resolveAssetUrl(item.image_url),
    processedImageUrl: resolveAssetUrl(item.processed_image_url),
    memoryCard: mapMemoryCard(item.memory_card),
    createdAt: item.created_at,
    seasonTags
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
  try {
    const plan = await apiRequest<ApiImageUploadPlan>(`/api/v1/wardrobe/items/${itemId}/prepare-image-upload`, {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type || null
      })
    });

    const uploadHeaders = new Headers(plan.headers ?? {});
    if (file.type && !uploadHeaders.has("Content-Type")) {
      uploadHeaders.set("Content-Type", file.type);
    }

    const uploadResponse = await fetch(plan.upload_url, {
      method: plan.method || "PUT",
      headers: uploadHeaders,
      body: file
    });

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text();
      throw new ApiError(text || "Cloud upload failed.", uploadResponse.status, text);
    }

    const item = await apiRequest<ApiWardrobeItem>(`/api/v1/wardrobe/items/${itemId}/confirm-image-upload`, {
      method: "POST",
      body: JSON.stringify({
        public_url: plan.public_url
      })
    });

    return mapApiWardrobeItem(item);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      throw error;
    }
  }

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

export async function fetchCurrentUserWithAccessToken(accessToken: string) {
  return apiRequest<AuthUserSummary>("/api/v1/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  }, { skipAuth: true });
}

export async function refreshAuthSession(payload: { refresh_token: string; access_token?: string | null }) {
  return apiRequest<AuthSessionResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(payload)
  }, { skipAuth: true });
}

export async function requestPasswordReset(payload: PasswordResetPayload) {
  return apiRequest<ApiStatusMessageResponse>("/api/v1/auth/password-reset", {
    method: "POST",
    body: JSON.stringify(payload)
  }, { skipAuth: true });
}

export async function confirmPasswordReset(payload: PasswordResetConfirmPayload) {
  return apiRequest<ApiStatusMessageResponse>("/api/v1/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(payload)
  }, { skipAuth: true });
}

export async function fetchOAuthStartUrl(provider: "google" | "facebook", redirectTo?: string) {
  const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "";
  return apiRequest<OAuthStartResponse>(`/api/v1/auth/oauth/${provider}/start${query}`, undefined, { skipAuth: true });
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

  return mapRecommendationResult(payload);
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

export async function runWardrobeAutoEnrich(itemId: number) {
  const item = await apiRequest<ApiWardrobeItem>(`/api/v1/wardrobe/items/${itemId}/auto-enrich`, {
    method: "POST"
  });

  return mapApiWardrobeItem(item);
}

export async function processWardrobeImageAsync(itemId: number) {
  return apiRequest<AssistantTask>(`/api/v1/wardrobe/items/${itemId}/process-image-async`, {
    method: "POST"
  });
}

export async function fetchAssistantTask(taskId: number) {
  return apiRequest<AssistantTask>(`/api/v1/assistant/tasks/${taskId}`);
}

export async function fetchAssistantOverview() {
  const payload = await apiRequest<ApiAssistantOverview>("/api/v1/assistant/overview");
  return mapAssistantOverview(payload);
}

export async function searchAssistantLocations(query: string) {
  const encodedQuery = encodeURIComponent(query.trim());
  return apiRequest<GeoLocationOption[]>(`/api/v1/assistant/location-search?q=${encodedQuery}`);
}

export async function fetchTomorrowAssistant(payload: {
  location_query?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string | null;
  schedule: string;
  has_commute: boolean;
  date?: string;
}) {
  const result = await apiRequest<ApiTomorrowAssistantResponse>("/api/v1/assistant/tomorrow", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return mapTomorrowAssistantResult(result);
}

export async function runAssistantQuickMode(mode: string) {
  const result = await apiRequest<ApiRecommendationResponse>("/api/v1/assistant/quick-mode", {
    method: "POST",
    body: JSON.stringify({ mode })
  });

  return mapRecommendationResult(result);
}

export async function fetchClosetGaps() {
  return apiRequest<ClosetGapResult>("/api/v1/assistant/gaps");
}

export async function fetchAssistantReminders() {
  return apiRequest<ReminderResult>("/api/v1/assistant/reminders");
}

export async function fetchStyleProfile() {
  return apiRequest<StyleProfile>("/api/v1/assistant/style-profile");
}

export async function updateStyleProfile(payload: Omit<StyleProfile, "user_id" | "updated_at">) {
  return apiRequest<StyleProfile>("/api/v1/assistant/style-profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchExperienceStyleProfile() {
  return apiRequest<ExperienceStyleProfileOverview>("/api/v1/experience/style-profile");
}

export async function updateExperienceStyleProfile(payload: Partial<ExperienceStyleProfileDraft>) {
  return apiRequest<ExperienceStyleProfileUpdateResponse>("/api/v1/experience/style-profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchMemoryCard(itemId: number) {
  const envelope = await apiRequest<{ item_id: number; card: ApiMemoryCard }>(`/api/v1/assistant/items/${itemId}/memory-card`);
  return {
    itemId: envelope.item_id,
    card: mapMemoryCard(envelope.card)
  };
}

export async function updateMemoryCard(
  itemId: number,
  payload: {
    highlights: string[];
    avoid_contexts: string[];
    care_status: string;
    care_note: string | null;
    season_tags: string[];
  }
) {
  const envelope = await apiRequest<{ item_id: number; card: ApiMemoryCard }>(`/api/v1/assistant/items/${itemId}/memory-card`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });

  return {
    itemId: envelope.item_id,
    card: mapMemoryCard(envelope.card)
  };
}

export async function recordRecommendationFeedback(payload: {
  prompt?: string | null;
  scene?: string | null;
  action: string;
  item_ids: number[];
  feedback_note?: string | null;
  metadata_json?: Record<string, unknown>;
}) {
  return apiRequest<ApiStatusMessageResponse>("/api/v1/assistant/feedback", {
    method: "POST",
    body: JSON.stringify({
      prompt: payload.prompt ?? null,
      scene: payload.scene ?? null,
      action: payload.action,
      item_ids: payload.item_ids,
      feedback_note: payload.feedback_note ?? null,
      metadata_json: payload.metadata_json ?? {}
    })
  });
}

export async function fetchSavedOutfits() {
  return apiRequest<SavedOutfit[]>("/api/v1/assistant/outfits");
}

export async function saveAssistantOutfit(payload: {
  name: string;
  occasion?: string | null;
  style?: string | null;
  item_ids: number[];
  reasoning?: string | null;
}) {
  return apiRequest<SavedOutfit>("/api/v1/assistant/outfits", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchWearLogs() {
  return apiRequest<WearLog[]>("/api/v1/assistant/wear-log");
}

export async function createWearLog(payload: {
  outfit_id?: number | null;
  outfit_name?: string | null;
  item_ids: number[];
  occasion?: string | null;
  period?: string;
  location_label?: string | null;
  feedback_note?: string | null;
  worn_on?: string;
}) {
  return apiRequest<WearLog>("/api/v1/assistant/wear-log", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchPackingPlan(payload: {
  city: string;
  days: number;
  trip_kind: string;
  include_commute: boolean;
}) {
  return apiRequest<PackingResponse>("/api/v1/assistant/packing", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function renderVirtualTryOn(payload: {
  item_ids: number[];
  person_image_url?: string | null;
  garment_image_urls?: string[];
  prompt?: string | null;
  scene?: string | null;
}) {
  const result = await apiRequest<ApiTryOnRenderResponse>("/api/v1/try-on/render", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return mapTryOnRenderResult(result);
}

export async function fetchClientAssistantOverview() {
  const payload = await apiRequest<ApiAssistantOverview>("/api/v1/client/assistant/overview");
  const overview = mapAssistantOverview(payload);
  return {
    tomorrow: overview.tomorrow,
    gaps: overview.gaps,
    reminders: overview.reminders
  } satisfies MiniProgramAssistantOverview;
}
