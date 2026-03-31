export interface MiniProgramShortcut {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  badge?: string | null;
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

export interface MiniProgramWardrobeCard {
  id: number;
  name: string;
  category: string;
  color: string;
  preview_url?: string | null;
  tags: string[];
}

export interface MiniProgramWardrobeResponse {
  title: string;
  items_total: number;
  cards: MiniProgramWardrobeCard[];
}

export interface MiniProgramAccountResponse {
  user_email: string;
  mode: string;
  cloud_enabled: boolean;
  items_total: number;
  synced_count: number;
  latest_cloud_sync_at?: string | null;
}

export interface AiDemoWorkflow {
  id: string;
  title: string;
  model_name: string;
  task: string;
  priority: string;
  stage: string;
  service_slot: string;
  delivery_mode: string;
}

export interface AiDemoArtifact {
  kind: string;
  label: string;
  value?: string | null;
  preview_url?: string | null;
  payload?: Record<string, unknown> | unknown[] | null;
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

export interface MiniProgramSession {
  accessToken: string;
  refreshToken: string;
}
