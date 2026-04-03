"use client";

import { useEffect, useState } from "react";

import { useAuthSession } from "@/hooks/use-auth-session";
import {
  ApiError,
  type ExperienceStyleDnaEntry,
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

export function StyleProfileExperience() {
  const { ready } = useAuthSession();
  const [overview, setOverview] = useState<ExperienceStyleProfileOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(
          nextError instanceof ApiError && nextError.status === 401
            ? "登录状态已失效，请重新登录后查看风格画像。"
            : nextError instanceof Error
              ? nextError.message
              : "暂时无法读取风格画像。"
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
      if (showMessage) {
        setToast({ message: showMessage, tone: "soft" });
      }
    } catch (nextError) {
      setToast({
        message: nextError instanceof Error ? nextError.message : "刷新风格画像失败",
        tone: "error"
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
