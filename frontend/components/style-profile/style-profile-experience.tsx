"use client";

import { useEffect, useState } from "react";

import { useAuthSession } from "@/hooks/use-auth-session";
import {
  ApiError,
  type ExperienceStyleDnaEntry,
  type ExperienceStyleProfileDraft,
  type ExperienceStyleProfileOverview,
  fetchExperienceStyleProfile,
  updateExperienceStyleProfile
} from "@/lib/api";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";

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

const SILHOUETTE_ICON_MAP: Record<string, string> = {
  H型: "📐",
  V型: "🔺",
  X型: "⏳",
  宽松廓形: "🔷",
  修身: "📏",
  A型: "🌊"
};

const STYLE_PROFILE_DEMO_STORAGE_KEY = "ai-wardrobe:experience-style-profile-demo";

const STYLE_PROFILE_DEMO_DRAFT: ExperienceStyleProfileDraft = {
  favorite_colors: ["奶油白", "柔粉", "浅灰蓝"],
  avoid_colors: ["荧光绿", "高饱和紫"],
  favorite_silhouettes: ["H型", "A型", "宽松廓形"],
  avoid_silhouettes: ["修身"],
  style_keywords: ["甜感", "轻盈", "通勤", "安静精致"],
  dislike_keywords: ["太街头", "过度张扬"],
  commute_profile: "轻正式，但不要显得太板正",
  comfort_priorities: ["面料柔软", "方便久坐", "不勒腰"],
  wardrobe_rules: ["通勤 look 不超过三个主色", "约会时保留一个柔和亮点", "配饰只选一个重点"],
  personal_note: "希望整体是温柔、有呼吸感的，不想为了精致而显得太用力。"
};

const STYLE_PROFILE_COLOR_HEX: Record<string, string> = {
  奶油白: "#F5EBDD",
  柔粉: "#E7B8B0",
  浅灰蓝: "#B9C8D6",
  荧光绿: "#A4FF00",
  高饱和紫: "#8A34D6",
  驼色: "#C8A27A",
  深蓝: "#4C628A",
  米白: "#F2E6D8"
};

const STYLE_PROFILE_SILHOUETTE_DESC: Record<string, string> = {
  H型: "线条平衡，适合日常通勤和长期穿着",
  V型: "上提比例，更显精神和利落感",
  X型: "强调腰线，适合轻正式和约会场景",
  A型: "下摆轻盈有呼吸感，走动更柔和",
  宽松廓形: "松弛不压身，适合久坐和叠搭",
  修身: "强调曲线，但容易显得拘束"
};

const STYLE_PROFILE_KEYWORD_TONES = ["primary", "primary", "secondary", "secondary", "tertiary", "tertiary"] as const;

interface DemoStyleProfileStorage {
  draft: ExperienceStyleProfileDraft;
  updatedAt: string | null;
}

function joinList(values: string[]) {
  return values.join("，");
}

function parseListInput(value: string) {
  return value
    .split(/[\n,，]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function buildRadarPoints(dna: ExperienceStyleDnaEntry[]) {
  const values = dna.slice(0, 5).map((entry) => entry.value);
  while (values.length < 5) {
    values.push(18);
  }

  return values.map((value, index) => {
    const angle = (-90 + index * 72) * (Math.PI / 180);
    const radius = 18 + (Math.max(0, Math.min(value, 100)) / 100) * 26;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    return `${x},${y}`;
  }).join(" ");
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
    favorite_colors: patch.favorite_colors !== undefined ? patch.favorite_colors : draft.favorite_colors,
    avoid_colors: patch.avoid_colors !== undefined ? patch.avoid_colors : draft.avoid_colors,
    favorite_silhouettes: patch.favorite_silhouettes !== undefined ? patch.favorite_silhouettes : draft.favorite_silhouettes,
    avoid_silhouettes: patch.avoid_silhouettes !== undefined ? patch.avoid_silhouettes : draft.avoid_silhouettes,
    style_keywords: patch.style_keywords !== undefined ? patch.style_keywords : draft.style_keywords,
    dislike_keywords: patch.dislike_keywords !== undefined ? patch.dislike_keywords : draft.dislike_keywords,
    commute_profile: patch.commute_profile !== undefined ? patch.commute_profile : draft.commute_profile,
    comfort_priorities: patch.comfort_priorities !== undefined ? patch.comfort_priorities : draft.comfort_priorities,
    wardrobe_rules: patch.wardrobe_rules !== undefined ? patch.wardrobe_rules : draft.wardrobe_rules,
    personal_note: patch.personal_note !== undefined ? patch.personal_note : draft.personal_note
  };
}

function formatDemoUpdatedAt(updatedAt: string | null) {
  if (!updatedAt) {
    return "演示模式 · 尚未本地保存";
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return "演示模式 · 已本地保存";
  }

  return `演示模式 · ${date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })}`;
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
    window.localStorage.setItem(STYLE_PROFILE_DEMO_STORAGE_KEY, JSON.stringify(payload));
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
    { label: "甜感", weight: 3 + Math.min(profile.style_keywords.length, 4), color: "#D8A299" },
    { label: "轻盈", weight: 2 + Math.min(profile.favorite_silhouettes.length, 4), color: "#DDBB8C" },
    { label: "通勤", weight: 2 + Math.min(profile.wardrobe_rules.length, 4), color: "#B7A7D8" },
    { label: "柔和", weight: 2 + Math.min(profile.favorite_colors.length, 4), color: "#9EBBCB" },
    { label: "舒适", weight: 2 + Math.min(profile.comfort_priorities.length, 4), color: "#94B9A0" }
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
    "宽松廓形",
    "修身",
    "V型",
    "X型"
  ]));

  return order.slice(0, 6).map((name) => {
    const preferred = profile.favorite_silhouettes.includes(name);
    const avoided = profile.avoid_silhouettes.includes(name);

    return {
      name,
      desc: STYLE_PROFILE_SILHOUETTE_DESC[name] ?? "作为演示态的轮廓标签，可继续手动调整偏好。",
      preferred,
      badge: preferred ? "偏爱" : avoided ? "少穿" : ""
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
    ? `演示模式 · ${profile.commute_profile?.trim()}`
    : "演示模式 · 后端未连通时，依然可以先编辑和预览你的风格档案";

  return {
    hero_subtitle: heroSubtitle,
    dna: buildDemoDna(profile),
    favorite_colors: profile.favorite_colors.map(mapColorEntry),
    avoid_colors: profile.avoid_colors.map(mapColorEntry),
    silhouettes: buildDemoSilhouettes(profile),
    keywords: buildDemoKeywords(profile),
    rules: profile.wardrobe_rules,
    personal_note: profile.personal_note?.trim() || "演示模式下可先写下你的风格边界，等后端接通后再同步到真实账号。",
    updated_at_label: formatDemoUpdatedAt(storage.updatedAt),
    profile
  };
}

export function StyleProfileExperience() {
  const { ready } = useAuthSession();
  const [overview, setOverview] = useState<ExperienceStyleProfileOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [demoMode, setDemoMode] = useState(false);
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
      } catch (nextError) {
        if (!active) {
          return;
        }

        const fallback = buildDemoOverview();
        setOverview(fallback);
        setDemoMode(true);
        setError(
          nextError instanceof ApiError && nextError.status === 401
            ? "登录状态暂未就绪，当前先展示可编辑的演示画像。"
            : "风格雷达已切换到演示模式，后端接通后会自动显示真实画像。"
        );
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
      if (showMessage) {
        setToast({ message: showMessage, tone: "soft" });
      }
    } catch (nextError) {
      const fallback = buildDemoOverview();
      setOverview(fallback);
      setDemoMode(true);
      setToast({
        message: showMessage ?? (nextError instanceof Error ? `${nextError.message}，已继续显示演示画像。` : "刷新失败，已继续显示演示画像。"),
        tone: "soft"
      });
    }
  }

  function openFavoriteColorsEditor() {
    if (!overview) {
      return;
    }

    setEditor({
      key: "favoriteColors",
      title: "编辑喜欢颜色",
      submitLabel: "保存颜色",
      successMessage: "喜欢颜色已更新",
      fields: [
        {
          name: "favorite_colors",
          label: "喜欢颜色",
          type: "text",
          value: joinList(overview.profile.favorite_colors),
          placeholder: "驼色，深蓝，米白"
        }
      ]
    });
  }

  function openAvoidColorsEditor() {
    if (!overview) {
      return;
    }

    setEditor({
      key: "avoidColors",
      title: "编辑避开颜色",
      submitLabel: "保存避开项",
      successMessage: "避开颜色已更新",
      fields: [
        {
          name: "avoid_colors",
          label: "避开颜色",
          type: "text",
          value: joinList(overview.profile.avoid_colors),
          placeholder: "亮粉，亮黄，荧光橙"
        }
      ]
    });
  }

  function openSilhouettesEditor() {
    if (!overview) {
      return;
    }

    setEditor({
      key: "silhouettes",
      title: "编辑偏好轮廓",
      submitLabel: "保存轮廓",
      successMessage: "轮廓偏好已更新",
      fields: [
        {
          name: "favorite_silhouettes",
          label: "喜欢轮廓",
          type: "text",
          value: joinList(overview.profile.favorite_silhouettes),
          placeholder: "H型，V型，宽松廓形"
        },
        {
          name: "avoid_silhouettes",
          label: "避开轮廓",
          type: "text",
          value: joinList(overview.profile.avoid_silhouettes),
          placeholder: "过紧身，过硬挺"
        }
      ]
    });
  }

  function openKeywordsEditor() {
    if (!overview) {
      return;
    }

    setEditor({
      key: "keywords",
      title: "编辑风格关键词",
      submitLabel: "保存关键词",
      successMessage: "风格关键词已更新",
      fields: [
        {
          name: "style_keywords",
          label: "核心关键词",
          type: "text",
          value: joinList(overview.profile.style_keywords),
          placeholder: "简约，质感，大地色"
        },
        {
          name: "comfort_priorities",
          label: "舒适优先级",
          type: "text",
          value: joinList(overview.profile.comfort_priorities),
          placeholder: "面料柔软，方便久坐，不勒腰"
        }
      ]
    });
  }

  function openRulesEditor() {
    if (!overview) {
      return;
    }

    setEditor({
      key: "rules",
      title: "编辑衣橱规则",
      description: "一行一条，会直接影响推荐和筛选时的偏好表达。",
      submitLabel: "保存规则",
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
    });
  }

  function openNoteEditor() {
    if (!overview) {
      return;
    }

    setEditor({
      key: "note",
      title: "编辑私人备注",
      submitLabel: "保存备注",
      successMessage: "私人备注已更新",
      fields: [
        {
          name: "personal_note",
          label: "私人备注",
          type: "textarea",
          value: overview.profile.personal_note ?? overview.personal_note,
          placeholder: "写下只有你自己知道的风格边界和灵感"
        }
      ]
    });
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

    const values = Object.fromEntries(editor.fields.map((field) => [field.name, field.value]));
    let payload: Record<string, string[] | string | null> = {};

    if (editor.key === "favoriteColors") {
      payload = { favorite_colors: parseListInput(values.favorite_colors ?? "") };
    } else if (editor.key === "avoidColors") {
      payload = { avoid_colors: parseListInput(values.avoid_colors ?? "") };
    } else if (editor.key === "silhouettes") {
      payload = {
        favorite_silhouettes: parseListInput(values.favorite_silhouettes ?? ""),
        avoid_silhouettes: parseListInput(values.avoid_silhouettes ?? "")
      };
    } else if (editor.key === "keywords") {
      payload = {
        style_keywords: parseListInput(values.style_keywords ?? ""),
        comfort_priorities: parseListInput(values.comfort_priorities ?? "")
      };
    } else if (editor.key === "rules") {
      payload = {
        wardrobe_rules: parseListInput(values.wardrobe_rules ?? "")
      };
    } else if (editor.key === "note") {
      payload = {
        personal_note: (values.personal_note ?? "").trim() || null
      };
    }

    setSaving(true);

    try {
      if (demoMode && overview) {
        const draft = mergeDraft(overview.profile, payload);
        const storage = writeDemoStyleProfileStorage(draft);
        setOverview(buildDemoOverview(storage));
        setEditor(null);
        setToast({
          message: `${editor.successMessage}（演示模式已本地保存）`,
          tone: "soft"
        });
        return;
      }

      const result = await updateExperienceStyleProfile(payload);
      setEditor(null);
      await reloadOverview(result.message || editor.successMessage);
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : "保存失败",
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
      <div className={styles.emptyState}>
        <h2>风格画像暂时没有载入成功</h2>
        <p>{error || "请稍后再试。"}</p>
        <button type="button" className={styles.retryButton} onClick={() => void reloadOverview()}>
          重新加载
        </button>
      </div>
    );
  }

  const radarPoints = buildRadarPoints(overview.dna);

  return (
    <div
      className={styles.page}
      style={{ ["--flash-color" as string]: flashColor ? `${flashColor}18` : "transparent" }}
    >
      <section className={styles.hero}>
        <svg className={styles.radarMini} viewBox="0 0 100 100" aria-hidden="true">
          <polygon points="50,15 80,35 75,70 25,70 20,35" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <polygon points="50,25 70,38 67,62 33,62 30,38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          <polygon points={radarPoints} fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
          <circle cx="50" cy="20" r="3" fill="#fff" />
          <circle cx="76" cy="36" r="3" fill="#fff" />
          <circle cx="72" cy="68" r="3" fill="#fff" />
          <circle cx="28" cy="68" r="3" fill="#fff" />
          <circle cx="24" cy="36" r="3" fill="#fff" />
        </svg>
        <div className={styles.heroContent}>
          <div className={styles.heroLabel}>Style Profile</div>
          <h1 className={styles.heroTitle}>风格画像</h1>
          <div className={styles.heroSub}>{overview.hero_subtitle}</div>
        </div>
      </section>

      <div className={styles.content}>
        {demoMode ? (
          <section className={styles.modeNotice}>
            <div className={styles.modeNoticeBadge}>Demo Mode</div>
            <div className={styles.modeNoticeText}>
              {error || "真实风格画像尚未接通，当前先展示可编辑的演示内容。你现在做的修改会先保存在本地，后端接通后再切到真实输出。"}
            </div>
          </section>
        ) : null}

        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#F0E5D8" }}>🧬</div>
            <div className={styles.sectionTitle}>风格 DNA</div>
          </div>
          <div className={styles.dnaBar}>
            {overview.dna.map((entry) => (
              <div
                key={entry.label}
                className={styles.dnaSeg}
                style={{ width: `${entry.value}%`, background: entry.color }}
              />
            ))}
          </div>
          <div className={styles.dnaLegend}>
            {overview.dna.map((entry) => (
              <div key={entry.label} className={styles.dnaLegendItem}>
                <div className={styles.dnaLegendDot} style={{ background: entry.color }} />
                {entry.label} {entry.value}%
              </div>
            ))}
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#E8F0E8" }}>🎨</div>
            <div className={styles.sectionTitle}>喜欢颜色</div>
            <button type="button" className={styles.editBtn} onClick={openFavoriteColorsEditor}>编辑</button>
          </div>
          <div className={styles.colorGrid}>
            {overview.favorite_colors.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={styles.colorChip}
                onClick={() => setFlashColor(entry.hex)}
              >
                <div className={styles.colorDot} style={{ background: entry.hex }} />
                <span className={styles.colorName}>{entry.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#F8E8E8" }}>🚫</div>
            <div className={styles.sectionTitle}>避开颜色</div>
            <button type="button" className={styles.editBtn} onClick={openAvoidColorsEditor}>编辑</button>
          </div>
          <div className={styles.colorGrid}>
            {overview.avoid_colors.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={`${styles.colorChip} ${styles.avoidChip}`}
                onClick={() => setFlashColor(entry.hex)}
              >
                <div className={styles.colorDot} style={{ background: entry.hex }} />
                <span className={styles.colorName}>{entry.name}</span>
              </button>
            ))}
          </div>
          <p className={styles.sectionHint}>AI 穿搭推荐将自动避开这些颜色，确保推荐结果符合你的偏好。</p>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#E8E0F0" }}>👤</div>
            <div className={styles.sectionTitle}>偏好轮廓</div>
            <button type="button" className={styles.editBtn} onClick={openSilhouettesEditor}>编辑</button>
          </div>
          <div className={styles.silhouetteGrid}>
            {overview.silhouettes.map((entry) => (
              <article
                key={entry.name}
                className={`${styles.silhouetteCard} ${entry.preferred ? styles.silhouetteCardPreferred : ""}`}
              >
                <div className={styles.silIcon}>{SILHOUETTE_ICON_MAP[entry.name] ?? "✨"}</div>
                <div className={styles.silName}>{entry.name}</div>
                <div className={styles.silDesc}>{entry.desc}</div>
                {entry.badge ? <span className={styles.silPref}>{entry.badge}</span> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#F0E8D8" }}>🏷️</div>
            <div className={styles.sectionTitle}>风格关键词</div>
            <button type="button" className={styles.editBtn} onClick={openKeywordsEditor}>编辑</button>
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

        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#E0E8F0" }}>📋</div>
            <div className={styles.sectionTitle}>衣橱规则</div>
            <button type="button" className={styles.editBtn} onClick={openRulesEditor}>编辑</button>
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

        <section className={styles.sectionBlock}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon} style={{ background: "#F8F0E0" }}>🔒</div>
            <div className={styles.sectionTitle}>私人备注</div>
            <button type="button" className={styles.editBtn} onClick={openNoteEditor}>编辑</button>
          </div>
          <div className={styles.noteArea}>
            <p className={styles.noteText}>{overview.personal_note}</p>
            <div className={styles.noteTime}>最后编辑：{overview.updated_at_label}</div>
          </div>
        </section>
      </div>

      <button type="button" className={styles.fab} onClick={openNoteEditor} aria-label="编辑风格画像">
        ✏️
      </button>

      {toast ? (
        <div className={`${styles.toast} ${toast.tone === "soft" ? styles.toastSoft : styles.toastError}`}>
          {toast.message}
        </div>
      ) : null}

      {editor ? (
        <div className={styles.modalMask} role="presentation" onClick={() => !saving && setEditor(null)}>
          <div className={styles.modalCard} role="dialog" aria-modal="true" aria-labelledby="style-profile-editor-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2 id="style-profile-editor-title" className={styles.modalTitle}>{editor.title}</h2>
                {editor.description ? <p className={styles.modalDescription}>{editor.description}</p> : null}
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setEditor(null)} disabled={saving} aria-label="关闭">
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
              <button type="button" className={styles.modalPrimary} onClick={() => void handleEditorSubmit()} disabled={saving}>
                {saving ? "保存中..." : editor.submitLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
