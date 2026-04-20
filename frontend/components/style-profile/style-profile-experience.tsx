"use client";

import { useEffect, useState } from "react";

import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  ApiError,
  type ExperienceStyleDnaEntry,
  type ExperienceStyleProfileDraft,
  type ExperienceStyleProfileOverview,
  fetchExperienceStyleProfile,
  updateExperienceStyleProfile
} from "@/lib/api";

import styles from "./style-profile-experience.module.css";

type EditorKey =
  | "favoriteColors"
  | "avoidColors"
  | "silhouettes"
  | "keywords"
  | "rules"
  | "note";

type EditorFieldType = "text" | "textarea";

interface EditorField {
  name: string;
  label: string;
  type: EditorFieldType;
  value: string;
  placeholder?: string;
}

interface EditorState {
  key: EditorKey;
  title: string;
  description?: string;
  submitLabel: string;
  successMessage: string;
  fields: EditorField[];
}

interface ToastState {
  message: string;
  tone: "soft" | "error";
}

interface DemoStyleProfileStorage {
  draft: ExperienceStyleProfileDraft;
  updatedAt: string | null;
}

const STYLE_PROFILE_DEMO_STORAGE_KEY = "ai-wardrobe:experience-style-profile-demo";

const SILHOUETTE_ICON_MAP: Record<string, string> = {
  "H型": "🟫",
  "V型": "🔻",
  "X型": "✨",
  "A型": "🔺",
  "宽松直筒": "🧥",
  "合体修身": "📐"
};

const STYLE_PROFILE_DEMO_DRAFT: ExperienceStyleProfileDraft = {
  favorite_colors: ["奶油白", "雾粉", "浅灰蓝"],
  avoid_colors: ["荧光绿", "高饱和紫"],
  favorite_silhouettes: ["H型", "A型", "宽松直筒"],
  avoid_silhouettes: ["合体修身"],
  style_keywords: ["柔和", "轻盈", "通勤", "安静精致"],
  dislike_keywords: ["过度街头", "太强攻击感"],
  commute_profile: "轻正式，但不要显得太板正。",
  comfort_priorities: ["面料柔软", "方便久坐", "行动轻松"],
  wardrobe_rules: [
    "通勤造型尽量控制在三种主色以内。",
    "约会或出门时保留一个柔和亮点。",
    "配饰只保留一个主重点，让整体更轻松。"
  ],
  personal_note: "希望整体气质温柔、透气、有呼吸感，不想为了精致而显得太用力。"
};

const STYLE_PROFILE_COLOR_HEX: Record<string, string> = {
  "奶油白": "#F5EBDD",
  "雾粉": "#E8BBB6",
  "浅灰蓝": "#B9C8D6",
  "荧光绿": "#A8FF3E",
  "高饱和紫": "#7A42D7",
  "驼色": "#C8A27A",
  "深蓝": "#4C628A",
  "米白": "#F2E6D8",
  "茶棕": "#9C7658"
};

const STYLE_PROFILE_SILHOUETTE_DESC: Record<string, string> = {
  "H型": "线条平稳、不过分强调曲线，适合日常通勤和长期穿着。",
  "V型": "更利落、提气，看起来精神而清爽。",
  "X型": "会强调腰线，适合需要一点精致感的场景。",
  "A型": "下摆更轻盈，走动时有柔和的呼吸感。",
  "宽松直筒": "松弛但不拖沓，对久坐和叠穿都更友好。",
  "合体修身": "能突出曲线，但连续穿着时更容易显得拘束。"
};

const STYLE_PROFILE_KEYWORD_TONES = [
  "primary",
  "primary",
  "secondary",
  "secondary",
  "tertiary",
  "tertiary"
] as const;

function joinList(values: string[]) {
  return values.join("，");
}

function parseListInput(value: string) {
  return value
    .split(/[\n,，、]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildMiniRadarPoints(dna: ExperienceStyleDnaEntry[]) {
  const values = dna.slice(0, 6).map((entry) => entry.value);
  while (values.length < 6) {
    values.push(16);
  }

  return values.map((value, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const radius = 18 + (Math.max(0, Math.min(value, 100)) / 100) * 26;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");
}

function buildRadarPoints(dna: ExperienceStyleDnaEntry[]) {
  const values = dna.slice(0, 6).map((entry) => entry.value);
  while (values.length < 6) {
    values.push(16);
  }

  return values.map((value, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const radius = 30 + (Math.max(0, Math.min(value, 100)) / 100) * 42;
    const x = 100 + radius * Math.cos(angle);
    const y = 100 + radius * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");
}

function buildRadarPolygonPoints(radius: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const x = 100 + radius * Math.cos(angle);
    const y = 100 + radius * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");
}

function buildRadarNodes(dna: ExperienceStyleDnaEntry[]) {
  const entries = dna.slice(0, 6);
  while (entries.length < 6) {
    entries.push({
      label: "风格",
      value: 16,
      color: "#D7C4AE"
    });
  }

  return entries.map((entry, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180);
    const radius = 30 + (Math.max(0, Math.min(entry.value, 100)) / 100) * 42;
    const x = 100 + radius * Math.cos(angle);
    const y = 100 + radius * Math.sin(angle);
    const labelRadius = 86;
    const labelX = 100 + labelRadius * Math.cos(angle);
    const labelY = 100 + labelRadius * Math.sin(angle);

    return {
      ...entry,
      x,
      y,
      labelX,
      labelY
    };
  });
}

function cloneDraft(draft: ExperienceStyleProfileDraft): ExperienceStyleProfileDraft {
  return {
    favorite_colors: [...draft.favorite_colors],
    avoid_colors: [...draft.avoid_colors],
    favorite_silhouettes: [...draft.favorite_silhouettes],
    avoid_silhouettes: [...draft.avoid_silhouettes],
    style_keywords: [...draft.style_keywords],
    dislike_keywords: [...draft.dislike_keywords],
    commute_profile: draft.commute_profile,
    comfort_priorities: [...draft.comfort_priorities],
    wardrobe_rules: [...draft.wardrobe_rules],
    personal_note: draft.personal_note
  };
}

function mergeDraft(
  draft: ExperienceStyleProfileDraft,
  patch: Partial<ExperienceStyleProfileDraft>
): ExperienceStyleProfileDraft {
  return {
    favorite_colors: patch.favorite_colors ?? draft.favorite_colors,
    avoid_colors: patch.avoid_colors ?? draft.avoid_colors,
    favorite_silhouettes: patch.favorite_silhouettes ?? draft.favorite_silhouettes,
    avoid_silhouettes: patch.avoid_silhouettes ?? draft.avoid_silhouettes,
    style_keywords: patch.style_keywords ?? draft.style_keywords,
    dislike_keywords: patch.dislike_keywords ?? draft.dislike_keywords,
    commute_profile: patch.commute_profile ?? draft.commute_profile,
    comfort_priorities: patch.comfort_priorities ?? draft.comfort_priorities,
    wardrobe_rules: patch.wardrobe_rules ?? draft.wardrobe_rules,
    personal_note: patch.personal_note ?? draft.personal_note
  };
}

function formatDemoUpdatedAt(updatedAt: string | null) {
  if (!updatedAt) {
    return "演示模式 · 还没有保存过本地修改";
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return "演示模式 · 已在当前设备保存";
  }

  return `演示模式 · ${date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })} 已更新`;
}

function readDemoStyleProfileStorage(): DemoStyleProfileStorage {
  if (typeof window === "undefined") {
    return {
      draft: cloneDraft(STYLE_PROFILE_DEMO_DRAFT),
      updatedAt: null
    };
  }

  try {
    const raw = window.localStorage.getItem(STYLE_PROFILE_DEMO_STORAGE_KEY);
    if (!raw) {
      return {
        draft: cloneDraft(STYLE_PROFILE_DEMO_DRAFT),
        updatedAt: null
      };
    }

    const parsed = JSON.parse(raw) as Partial<DemoStyleProfileStorage>;
    return {
      draft: mergeDraft(
        cloneDraft(STYLE_PROFILE_DEMO_DRAFT),
        parsed.draft && typeof parsed.draft === "object" ? parsed.draft : {}
      ),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null
    };
  } catch {
    return {
      draft: cloneDraft(STYLE_PROFILE_DEMO_DRAFT),
      updatedAt: null
    };
  }
}

function writeDemoStyleProfileStorage(draft: ExperienceStyleProfileDraft) {
  const payload: DemoStyleProfileStorage = {
    draft,
    updatedAt: new Date().toISOString()
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STYLE_PROFILE_DEMO_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage failures and keep the in-memory preview state.
    }
  }

  return payload;
}

function mapColorEntry(name: string) {
  return {
    name,
    hex: STYLE_PROFILE_COLOR_HEX[name] ?? "#D7C4AE"
  };
}

function buildDemoDna(profile: ExperienceStyleProfileDraft): ExperienceStyleDnaEntry[] {
  const metrics = [
    { label: "柔和甜感", weight: 3 + Math.min(profile.favorite_colors.length, 4), color: "#F0A6C1" },
    { label: "优雅知性", weight: 2 + Math.min(profile.wardrobe_rules.length, 4), color: "#C7A07B" },
    { label: "轻街头感", weight: 1 + Math.min(profile.dislike_keywords.length, 2), color: "#A794C9" },
    { label: "通勤利落", weight: 2 + Math.min(profile.style_keywords.length, 4), color: "#8EA6BD" },
    { label: "曲线表达", weight: 1 + Math.min(profile.favorite_silhouettes.length, 3), color: "#D68D8D" },
    { label: "慵懒舒适", weight: 2 + Math.min(profile.comfort_priorities.length, 4), color: "#9CB792" }
  ];
  const total = metrics.reduce((sum, entry) => sum + entry.weight, 0);

  let used = 0;

  return metrics.map((entry, index) => {
    const value = index === metrics.length - 1
      ? 100 - used
      : Math.floor((entry.weight / total) * 100);

    used += value;

    return {
      label: entry.label,
      value,
      color: entry.color
    };
  });
}

function buildDemoSilhouettes(profile: ExperienceStyleProfileDraft) {
  const order = Array.from(new Set([
    ...profile.favorite_silhouettes,
    ...profile.avoid_silhouettes,
    "H型",
    "A型",
    "宽松直筒",
    "合体修身",
    "V型",
    "X型"
  ]));

  return order.slice(0, 6).map((name) => {
    const preferred = profile.favorite_silhouettes.includes(name);
    const avoided = profile.avoid_silhouettes.includes(name);

    return {
      name,
      desc: STYLE_PROFILE_SILHOUETTE_DESC[name] ?? "这是演示用廓形说明，后续可以继续细调你的偏好边界。",
      preferred,
      badge: preferred ? "偏爱" : avoided ? "少穿" : "观察中",
      item_count: preferred ? 3 : avoided ? 1 : 2,
      wear_count: preferred ? 8 : avoided ? 1 : 4,
      examples: preferred
        ? ["奶油白衬衫", "香草色半裙"]
        : avoided
          ? ["贴身针织裙"]
          : ["灰蓝针织衫", "深蓝直筒牛仔裤"]
    };
  });
}

function buildDemoKeywords(profile: ExperienceStyleProfileDraft) {
  const pool = [
    ...profile.style_keywords,
    ...profile.comfort_priorities.slice(0, 2),
    ...(profile.commute_profile ? [profile.commute_profile] : [])
  ];

  return pool.slice(0, 6).map((label, index) => ({
    label,
    tone: STYLE_PROFILE_KEYWORD_TONES[index] ?? "tertiary"
  }));
}

function buildDemoOverview(storage: DemoStyleProfileStorage = readDemoStyleProfileStorage()): ExperienceStyleProfileOverview {
  const profile = storage.draft;
  const heroSubtitle = profile.commute_profile?.trim()
    ? `演示模式 · ${profile.commute_profile.trim()}`
    : "演示模式 · 后端暂时不可用时，你仍然可以先预览并本地编辑这份风格画像。";

  return {
    hero_subtitle: heroSubtitle,
    dna: buildDemoDna(profile),
    favorite_colors: profile.favorite_colors.map(mapColorEntry),
    avoid_colors: profile.avoid_colors.map(mapColorEntry),
    silhouettes: buildDemoSilhouettes(profile),
    keywords: buildDemoKeywords(profile),
    rules: profile.wardrobe_rules,
    personal_note: profile.personal_note?.trim() || "演示模式下可以先写下你的风格边界，登录并接通后端后再同步到真实账号。",
    updated_at_label: formatDemoUpdatedAt(storage.updatedAt),
    profile
  };
}

function createEditorState(overview: ExperienceStyleProfileOverview, key: EditorKey): EditorState {
  switch (key) {
    case "favoriteColors":
      return {
        key,
        title: "编辑喜欢的颜色",
        submitLabel: "保存喜欢颜色",
        successMessage: "喜欢的颜色已更新",
        fields: [
          {
            name: "favorite_colors",
            label: "喜欢的颜色",
            type: "text",
            value: joinList(overview.profile.favorite_colors),
            placeholder: "奶油白，雾粉，浅灰蓝"
          }
        ]
      };
    case "avoidColors":
      return {
        key,
        title: "编辑避开的颜色",
        submitLabel: "保存避开颜色",
        successMessage: "避开颜色已更新",
        fields: [
          {
            name: "avoid_colors",
            label: "避开的颜色",
            type: "text",
            value: joinList(overview.profile.avoid_colors),
            placeholder: "荧光绿，高饱和紫"
          }
        ]
      };
    case "silhouettes":
      return {
        key,
        title: "编辑廓形偏好",
        submitLabel: "保存廓形偏好",
        successMessage: "廓形偏好已更新",
        fields: [
          {
            name: "favorite_silhouettes",
            label: "偏爱的廓形",
            type: "text",
            value: joinList(overview.profile.favorite_silhouettes),
            placeholder: "H型，A型，宽松直筒"
          },
          {
            name: "avoid_silhouettes",
            label: "尽量少穿的廓形",
            type: "text",
            value: joinList(overview.profile.avoid_silhouettes),
            placeholder: "合体修身，过硬挺"
          }
        ]
      };
    case "keywords":
      return {
        key,
        title: "编辑风格关键词",
        submitLabel: "保存关键词",
        successMessage: "风格关键词已更新",
        fields: [
          {
            name: "style_keywords",
            label: "核心风格关键词",
            type: "text",
            value: joinList(overview.profile.style_keywords),
            placeholder: "柔和，轻盈，通勤"
          },
          {
            name: "comfort_priorities",
            label: "舒适优先项",
            type: "text",
            value: joinList(overview.profile.comfort_priorities),
            placeholder: "面料柔软，方便久坐，行动轻松"
          }
        ]
      };
    case "rules":
      return {
        key,
        title: "编辑衣橱规则",
        description: "一行一条，后续推荐和筛选会优先参考这些规则。",
        submitLabel: "保存衣橱规则",
        successMessage: "衣橱规则已保存",
        fields: [
          {
            name: "wardrobe_rules",
            label: "衣橱规则",
            type: "textarea",
            value: overview.profile.wardrobe_rules.join("\n"),
            placeholder: "每行一条规则"
          }
        ]
      };
    case "note":
      return {
        key,
        title: "编辑私人备注",
        description: "这里适合写只有你自己最清楚的边界、提醒和偏好语气。",
        submitLabel: "保存备注",
        successMessage: "私人备注已更新",
        fields: [
          {
            name: "personal_note",
            label: "私人备注",
            type: "textarea",
            value: overview.profile.personal_note ?? overview.personal_note,
            placeholder: "写下你不想被忽略的风格边界、舒适要求或情绪关键词。"
          }
        ]
      };
  }
}

function buildPayloadFromEditor(editor: EditorState) {
  const values = Object.fromEntries(editor.fields.map((field) => [field.name, field.value]));

  if (editor.key === "favoriteColors") {
    return { favorite_colors: parseListInput(values.favorite_colors ?? "") };
  }
  if (editor.key === "avoidColors") {
    return { avoid_colors: parseListInput(values.avoid_colors ?? "") };
  }
  if (editor.key === "silhouettes") {
    return {
      favorite_silhouettes: parseListInput(values.favorite_silhouettes ?? ""),
      avoid_silhouettes: parseListInput(values.avoid_silhouettes ?? "")
    };
  }
  if (editor.key === "keywords") {
    return {
      style_keywords: parseListInput(values.style_keywords ?? ""),
      comfort_priorities: parseListInput(values.comfort_priorities ?? "")
    };
  }
  if (editor.key === "rules") {
    return {
      wardrobe_rules: parseListInput(values.wardrobe_rules ?? "")
    };
  }

  return {
    personal_note: (values.personal_note ?? "").trim() || null
  };
}

export function StyleProfileExperience() {
  const { ready } = useAuthSession();
  const [overview, setOverview] = useState<ExperienceStyleProfileOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  useEffect(() => {
    if (!flashColor) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFlashColor(null);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [flashColor]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    let active = true;

    async function loadOverview() {
      setLoading(true);

      try {
        const result = await fetchExperienceStyleProfile();
        if (!active) {
          return;
        }

        setOverview(result);
        setError("");
        setDemoMode(false);
        setAuthRequired(false);
      } catch (nextError) {
        if (!active) {
          return;
        }

        if (nextError instanceof ApiError && nextError.status === 401) {
          setOverview(null);
          setDemoMode(false);
          setAuthRequired(true);
          setError("登录后就能查看和编辑你的真实风格画像。");
        } else {
          setOverview(buildDemoOverview());
          setDemoMode(true);
          setAuthRequired(false);
          setError("真实数据暂时没连通，先为你切到可编辑的演示模式。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      active = false;
    };
  }, [ready]);

  async function reloadOverview(showMessage?: string) {
    try {
      const result = await fetchExperienceStyleProfile();
      setOverview(result);
      setError("");
      setDemoMode(false);
      setAuthRequired(false);
      if (showMessage) {
        setToast({ message: showMessage, tone: "soft" });
      }
    } catch (nextError) {
      if (nextError instanceof ApiError && nextError.status === 401) {
        setOverview(null);
        setDemoMode(false);
        setAuthRequired(true);
        setError("登录后就能查看和编辑你的真实风格画像。");
        setToast({
          message: "请先登录，再继续查看真实画像。",
          tone: "error"
        });
      } else {
        setOverview(buildDemoOverview());
        setDemoMode(true);
        setAuthRequired(false);
        setError("当前已回退到演示模式，你仍然可以继续编辑和预览。");
        setToast({
          message: showMessage ?? (nextError instanceof Error ? `${nextError.message}，已切换到演示模式。` : "刷新失败，已切换到演示模式。"),
          tone: "soft"
        });
      }
    }
  }

  function openEditor(key: EditorKey) {
    if (!overview) {
      return;
    }

    setEditor(createEditorState(overview, key));
  }

  function updateEditorField(name: string, value: string) {
    setEditor((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        fields: current.fields.map((field) => (
          field.name === name
            ? { ...field, value }
            : field
        ))
      };
    });
  }

  async function handleEditorSubmit() {
    if (!editor) {
      return;
    }

    const payload = buildPayloadFromEditor(editor);
    setSaving(true);

    try {
      if (demoMode && overview) {
        const draft = mergeDraft(overview.profile, payload);
        const storage = writeDemoStyleProfileStorage(draft);
        setOverview(buildDemoOverview(storage));
        setEditor(null);
        setToast({
          message: `${editor.successMessage}，已先保存在当前设备。`,
          tone: "soft"
        });
        return;
      }

      const result = await updateExperienceStyleProfile(payload);
      setEditor(null);
      await reloadOverview(result.message || editor.successMessage);
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : "保存失败，请稍后再试。",
        tone: "error"
      });
    } finally {
      setSaving(false);
    }
  }

  if (!ready || loading) {
    return <PanelSkeleton rows={3} />;
  }

  if (!overview) {
    return (
      <div className={styles.emptyState} data-testid="style-profile-empty-state">
        <h2>{authRequired ? "登录后查看你的风格画像" : "风格画像暂时还没有加载成功"}</h2>
        <p>{error || "稍后再试一次，或者先切回其他页面继续浏览。"}</p>
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => {
            if (authRequired) {
              window.location.assign("/login");
              return;
            }
            void reloadOverview();
          }}
        >
          {authRequired ? "前往登录" : "重新加载"}
        </button>
      </div>
    );
  }

  const safeDna = overview.dna.length > 0 ? overview.dna : buildDemoDna(overview.profile);
  const radarPoints = buildRadarPoints(safeDna);
  const miniRadarPoints = buildMiniRadarPoints(safeDna);
  const radarNodes = buildRadarNodes(safeDna);
  const dominantDna = safeDna.reduce<ExperienceStyleDnaEntry>(
    (best, entry) => (entry.value > best.value ? entry : best),
    safeDna[0] ?? { label: "风格", value: 0, color: "#D7C4AE" }
  );
  const averageDna = Math.round(
    safeDna.reduce((sum, entry) => sum + entry.value, 0) / Math.max(1, safeDna.length)
  );

  return (
    <div
      className={styles.page}
      data-testid="style-profile-page"
      style={{ ["--flash-color" as string]: flashColor ? `${flashColor}18` : "transparent" }}
    >
      <section className={styles.hero}>
        <svg className={styles.radarMini} viewBox="0 0 100 100" aria-hidden="true">
          <polygon points="50,14 80,32 80,68 50,86 20,68 20,32" fill="none" stroke="rgba(192,139,92,0.2)" strokeWidth="1" />
          <polygon points="50,26 69,37 69,63 50,74 31,63 31,37" fill="none" stroke="rgba(192,139,92,0.15)" strokeWidth="1" />
          <polygon points={miniRadarPoints} fill="rgba(192,139,92,0.1)" stroke="rgba(192,139,92,0.5)" strokeWidth="1.5" />
          <circle cx="50" cy="14" r="3" fill="var(--accent, #c08b5c)" />
          <circle cx="80" cy="32" r="3" fill="var(--accent, #c08b5c)" />
          <circle cx="80" cy="68" r="3" fill="var(--accent, #c08b5c)" />
          <circle cx="50" cy="86" r="3" fill="var(--accent, #c08b5c)" />
          <circle cx="20" cy="68" r="3" fill="var(--accent, #c08b5c)" />
          <circle cx="20" cy="32" r="3" fill="var(--accent, #c08b5c)" />
        </svg>
        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>个人风格档案</div>
          <h1 className={styles.heroTitle}>风格画像</h1>
          <div className={styles.heroSub}>{overview.hero_subtitle}</div>
        </div>
      </section>

      <div className={styles.content}>
        {demoMode ? (
          <section className={styles.modeNotice} data-testid="style-profile-mode-notice">
            <div className={styles.modeNoticeBadge}>演示模式</div>
            <div className={styles.modeNoticeText}>
              {error || "真实画像暂时还没连上，这里先展示一份可以继续编辑的本地演示内容。"}
            </div>
          </section>
        ) : null}

        <section className={styles.sectionBlock} data-testid="style-profile-dna">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#F0E5D8" }}>🧬</div>
            <div className={styles.sectionTitle}>风格 DNA</div>
          </div>
          <div className={styles.dnaContent}>
            <div className={styles.dnaRadarShell}>
              <div className={`${styles.dnaAura} ${styles.dnaAuraA}`} />
              <div className={`${styles.dnaAura} ${styles.dnaAuraB}`} />
              <div className={styles.dnaRadar}>
                <svg viewBox="0 0 200 200" className={styles.dnaRadarSvg}>
                  <defs>
                    <linearGradient id="styleProfileDnaStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F0A6C1" />
                      <stop offset="45%" stopColor="#C08B5C" />
                      <stop offset="100%" stopColor="#8EA6BD" />
                    </linearGradient>
                    <radialGradient id="styleProfileDnaFill" cx="50%" cy="45%" r="72%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.68)" />
                      <stop offset="65%" stopColor="rgba(192,139,92,0.18)" />
                      <stop offset="100%" stopColor="rgba(142,166,189,0.04)" />
                    </radialGradient>
                    <filter id="styleProfileDnaGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  {[84, 64, 44, 24].map((radius) => (
                    <polygon
                      key={radius}
                      points={buildRadarPolygonPoints(radius)}
                      className={styles.dnaRing}
                    />
                  ))}
                  {radarNodes.map((entry) => (
                    <line
                      key={`${entry.label}-axis`}
                      x1="100"
                      y1="100"
                      x2={entry.labelX}
                      y2={entry.labelY}
                      className={styles.dnaAxis}
                    />
                  ))}
                  <polygon points={radarPoints} className={styles.dnaArea} />
                  <polygon points={radarPoints} className={styles.dnaOutline} />
                  {radarNodes.map((entry) => (
                    <g key={entry.label}>
                      <circle cx={entry.x} cy={entry.y} r="7" className={styles.dnaNodePulse} style={{ fill: entry.color }} />
                      <circle cx={entry.x} cy={entry.y} r="4.2" className={styles.dnaNodeDot} style={{ fill: entry.color }} />
                      <text x={entry.labelX} y={entry.labelY} textAnchor="middle" dominantBaseline="middle" className={styles.dnaAxisText}>
                        {entry.label}
                      </text>
                    </g>
                  ))}
                </svg>
                <div className={styles.dnaCenterBadge}>
                  <span>主导气质</span>
                  <strong>{dominantDna.label}</strong>
                  <em>{dominantDna.value}%</em>
                </div>
              </div>
            </div>
            <div className={styles.dnaRight}>
              <div className={styles.dnaHeadline}>
                <div className={styles.dnaHeadlineLabel}>当前主轴</div>
                <div className={styles.dnaHeadlineValue}>{dominantDna.label}</div>
                <p className={styles.dnaHeadlineCopy}>
                  你的整体风格强度平均值约为 {averageDna}%。
                  现在这份画像更偏向有质感、可落地、不过分用力的日常表达。
                </p>
              </div>
              <div className={styles.dnaBar}>
                {safeDna.map((entry) => (
                  <div
                    key={entry.label}
                    className={styles.dnaSeg}
                    style={{ width: `${entry.value}%`, background: entry.color }}
                  />
                ))}
              </div>
              <div className={styles.dnaLegend}>
                {safeDna.map((entry) => (
                  <div key={entry.label} className={styles.dnaLegendItem}>
                    <div className={styles.dnaLegendDot} style={{ background: entry.color }} />
                    <div className={styles.dnaLegendCopy}>
                      <strong>{entry.label}</strong>
                      <span>{entry.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.sectionBlock} data-testid="style-profile-favorite-colors">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#E8F0E8" }}>🎨</div>
            <div className={styles.sectionTitle}>喜欢的颜色</div>
            <button
              type="button"
              className={styles.editBtn}
              data-testid="style-profile-edit-favorite-colors"
              aria-label="编辑喜欢的颜色"
              onClick={() => openEditor("favoriteColors")}
            >
              编辑
            </button>
          </div>
          <div className={styles.colorGrid}>
            {overview.favorite_colors.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={styles.colorChip}
                aria-label={`高亮颜色 ${entry.name}`}
                onClick={() => setFlashColor(entry.hex)}
              >
                <div className={styles.colorDot} style={{ background: entry.hex }} />
                <span className={styles.colorName}>{entry.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.sectionBlock} data-testid="style-profile-avoid-colors">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#F8E8E8" }}>🚫</div>
            <div className={styles.sectionTitle}>尽量避开的颜色</div>
            <button
              type="button"
              className={styles.editBtn}
              data-testid="style-profile-edit-avoid-colors"
              aria-label="编辑避开的颜色"
              onClick={() => openEditor("avoidColors")}
            >
              编辑
            </button>
          </div>
          <div className={styles.colorGrid}>
            {overview.avoid_colors.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={`${styles.colorChip} ${styles.avoidChip}`}
                aria-label={`查看避开颜色 ${entry.name}`}
                onClick={() => setFlashColor(entry.hex)}
              >
                <div className={styles.colorDot} style={{ background: entry.hex }} />
                <span className={styles.colorName}>{entry.name}</span>
              </button>
            ))}
          </div>
          <p className={styles.sectionHint}>后续推荐会尽量避开这些颜色，让结果更贴近你的真实穿着边界。</p>
        </section>

        <section className={styles.sectionBlock} data-testid="style-profile-silhouettes">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#E8E0F0" }}>🧵</div>
            <div className={styles.sectionTitle}>廓形偏好</div>
            <button
              type="button"
              className={styles.editBtn}
              data-testid="style-profile-edit-silhouettes"
              aria-label="编辑廓形偏好"
              onClick={() => openEditor("silhouettes")}
            >
              编辑
            </button>
          </div>
          <p className={styles.sectionHint}>这里会综合你已经识别过的衣物和最近穿着习惯，让偏好看起来更像真实生活里的选择。</p>
          <div className={styles.silhouetteGrid}>
            {overview.silhouettes.map((entry) => (
              <article
                key={entry.name}
                className={`${styles.silhouetteCard} ${entry.preferred ? styles.silhouetteCardPreferred : ""}`}
              >
                <div className={styles.silIcon}>{SILHOUETTE_ICON_MAP[entry.name] ?? "✦"}</div>
                <div className={styles.silName}>{entry.name}</div>
                <div className={styles.silDesc}>{entry.desc}</div>
                <div className={styles.silStats}>
                  {entry.item_count ?? 0} 件 · {entry.wear_count ?? 0} 次
                </div>
                {entry.examples?.length ? (
                  <div className={styles.silExamples}>{entry.examples.join(" · ")}</div>
                ) : null}
                {entry.badge ? <span className={styles.silPref}>{entry.badge}</span> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.sectionBlock} data-testid="style-profile-keywords">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#F0E8D8" }}>🏷️</div>
            <div className={styles.sectionTitle}>风格关键词</div>
            <button
              type="button"
              className={styles.editBtn}
              data-testid="style-profile-edit-keywords"
              aria-label="编辑风格关键词"
              onClick={() => openEditor("keywords")}
            >
              编辑
            </button>
          </div>
          <div className={styles.keywordCloud}>
            {overview.keywords.map((entry) => (
              <span
                key={entry.label}
                className={`${styles.keyword} ${
                  entry.tone === "primary"
                    ? styles.keywordPrimary
                    : entry.tone === "secondary"
                      ? styles.keywordSecondary
                      : styles.keywordTertiary
                }`}
              >
                {entry.label}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.sectionBlock} data-testid="style-profile-rules">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#E0E8F0" }}>🧭</div>
            <div className={styles.sectionTitle}>衣橱规则</div>
            <button
              type="button"
              className={styles.editBtn}
              data-testid="style-profile-edit-rules"
              aria-label="编辑衣橱规则"
              onClick={() => openEditor("rules")}
            >
              编辑
            </button>
          </div>
          <div className={styles.rulesList}>
            {overview.rules.map((entry, index) => (
              <div key={`${entry}-${index}`} className={styles.ruleItem}>
                <div className={styles.ruleNum}>{index + 1}</div>
                <div className={styles.ruleText}>{entry}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sectionBlock} data-testid="style-profile-note">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#F8F0E0" }}>📝</div>
            <div className={styles.sectionTitle}>私人备注</div>
            <button
              type="button"
              className={styles.editBtn}
              data-testid="style-profile-edit-note"
              aria-label="编辑私人备注"
              onClick={() => openEditor("note")}
            >
              编辑
            </button>
          </div>
          <div className={styles.noteArea}>
            <p className={styles.noteText}>{overview.personal_note}</p>
            <div className={styles.noteTime}>最后更新：{overview.updated_at_label}</div>
          </div>
        </section>
      </div>

      <button
        type="button"
        className={styles.fab}
        data-testid="style-profile-floating-edit"
        onClick={() => openEditor("note")}
        aria-label="快速编辑私人备注"
      >
        ✎
      </button>

      {toast ? (
        <div
          className={`${styles.toast} ${toast.tone === "soft" ? styles.toastSoft : styles.toastError}`}
          data-testid="style-profile-toast"
          role={toast.tone === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}

      {editor ? (
        <div className={styles.modalMask} role="presentation" onClick={() => !saving && setEditor(null)}>
          <div
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="style-profile-editor-title"
            data-testid="style-profile-editor"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="style-profile-editor-title" className={styles.modalTitle}>{editor.title}</h2>
                {editor.description ? <p className={styles.modalDescription}>{editor.description}</p> : null}
              </div>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setEditor(null)}
                disabled={saving}
                aria-label="关闭编辑窗口"
              >
                ×
              </button>
            </div>

            <div className={styles.formGrid}>
              {editor.fields.map((field) => (
                <label key={field.name} className={styles.formField}>
                  <span className={styles.fieldLabel}>{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      value={field.value}
                      onChange={(event) => updateEditorField(field.name, event.target.value)}
                      className={`${styles.fieldInput} ${styles.fieldTextarea}`}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      value={field.value}
                      onChange={(event) => updateEditorField(field.name, event.target.value)}
                      className={styles.fieldInput}
                      placeholder={field.placeholder}
                    />
                  )}
                </label>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.modalGhost} onClick={() => setEditor(null)} disabled={saving}>
                取消
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                data-testid="style-profile-save"
                onClick={() => void handleEditorSubmit()}
                disabled={saving}
              >
                {saving ? "保存中..." : editor.submitLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
