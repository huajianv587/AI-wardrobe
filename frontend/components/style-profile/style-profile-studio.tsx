"use client";

// Legacy prototype: this studio is currently not routed anywhere.
// Keep it frozen as a reference while the real experience page evolves.

import { LoaderCircle, Radar, Save, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { VisitorPreviewNotice } from "@/components/auth/visitor-preview-notice";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { ApiError, fetchStyleProfile, updateStyleProfile } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";

interface EditableProfile {
  favorite_colors: string[];
  avoid_colors: string[];
  favorite_silhouettes: string[];
  avoid_silhouettes: string[];
  style_keywords: string[];
  dislike_keywords: string[];
  commute_profile: string;
  comfort_priorities: string[];
  wardrobe_rules: string[];
  personal_note: string;
}

function createEmptyProfile(): EditableProfile {
  return {
    favorite_colors: [],
    avoid_colors: [],
    favorite_silhouettes: [],
    avoid_silhouettes: [],
    style_keywords: [],
    dislike_keywords: [],
    commute_profile: "",
    comfort_priorities: [],
    wardrobe_rules: [],
    personal_note: ""
  };
}

function createPreviewProfile(): EditableProfile {
  return {
    favorite_colors: ["奶油白", "柔粉", "浅灰蓝"],
    avoid_colors: ["荧光绿", "高饱和紫"],
    favorite_silhouettes: ["高腰", "A字", "轻垂坠"],
    avoid_silhouettes: ["过紧身", "太硬挺"],
    style_keywords: ["甜感", "轻盈", "通勤", "安静精致"],
    dislike_keywords: ["太街头", "过度张扬"],
    commute_profile: "轻正式，但不要显得太板正",
    comfort_priorities: ["面料柔软", "方便久坐", "不勒腰"],
    wardrobe_rules: ["通勤 look 不超过三个主色", "约会时保留一个柔和亮点", "配饰只选一个重点"],
    personal_note: "希望整体是温柔、有呼吸感的，不想为了精致而显得太用力。"
  };
}

function listToString(values: string[]) {
  return values.join(", ");
}

function stringToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function StyleProfileStudio() {
  const { ready, isAuthenticated } = useAuthSession();
  const [profile, setProfile] = useState<EditableProfile>(createEmptyProfile());
  const [statusText, setStatusText] = useState("正在读取你的风格画像...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const previewMode = !isAuthenticated;

  const radarValues = useMemo(() => {
    const style = Math.min(profile.style_keywords.length, 5);
    const comfort = Math.min(profile.comfort_priorities.length, 5);
    const color = Math.min(profile.favorite_colors.length, 5);
    const silhouette = Math.min(profile.favorite_silhouettes.length, 5);
    const rules = Math.min(profile.wardrobe_rules.length, 5);

    return [style, comfort, color, silhouette, rules].map((value, index) => {
      const angle = (-90 + index * 72) * (Math.PI / 180);
      const radius = 22 + value * 12;
      const x = 90 + radius * Math.cos(angle);
      const y = 90 + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(" ");
  }, [profile]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!isAuthenticated) {
      setProfile(createPreviewProfile());
      setStatusText("当前是访客预览模式，你可以先浏览风格画像的完整结构；登录后会加载并保存你自己的偏好档案。");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const result = await fetchStyleProfile();
        if (cancelled) {
          return;
        }

        setProfile({
          favorite_colors: result.favorite_colors,
          avoid_colors: result.avoid_colors,
          favorite_silhouettes: result.favorite_silhouettes,
          avoid_silhouettes: result.avoid_silhouettes,
          style_keywords: result.style_keywords,
          dislike_keywords: result.dislike_keywords,
          commute_profile: result.commute_profile ?? "",
          comfort_priorities: result.comfort_priorities,
          wardrobe_rules: result.wardrobe_rules,
          personal_note: result.personal_note ?? ""
        });
        setStatusText("喜欢颜色、避开颜色、轮廓偏好、规则和私人备注都已经载入。");
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatusText(
          error instanceof ApiError && error.status === 401
            ? "登录状态失效了，请重新登录后查看风格画像。"
            : error instanceof Error
              ? error.message
              : "暂时无法读取风格画像。"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, ready]);

  function updateField<Key extends keyof EditableProfile>(key: Key, value: EditableProfile[Key]) {
    setProfile((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSave() {
    setSaving(true);

    try {
      if (previewMode) {
        setStatusText("访客预览模式下已经在本地保存了这份风格画像示意；登录后这里会真正写回你的账号档案。");
        return;
      }

      const result = await updateStyleProfile({
        favorite_colors: profile.favorite_colors,
        avoid_colors: profile.avoid_colors,
        favorite_silhouettes: profile.favorite_silhouettes,
        avoid_silhouettes: profile.avoid_silhouettes,
        style_keywords: profile.style_keywords,
        dislike_keywords: profile.dislike_keywords,
        commute_profile: profile.commute_profile || null,
        comfort_priorities: profile.comfort_priorities,
        wardrobe_rules: profile.wardrobe_rules,
        personal_note: profile.personal_note || null
      });

      setProfile({
        favorite_colors: result.favorite_colors,
        avoid_colors: result.avoid_colors,
        favorite_silhouettes: result.favorite_silhouettes,
        avoid_silhouettes: result.avoid_silhouettes,
        style_keywords: result.style_keywords,
        dislike_keywords: result.dislike_keywords,
        commute_profile: result.commute_profile ?? "",
        comfort_priorities: result.comfort_priorities,
        wardrobe_rules: result.wardrobe_rules,
        personal_note: result.personal_note ?? ""
      });
      setStatusText("风格画像已经保存，首页雷达入口会逐步和这里联动。");
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "保存风格画像失败。");
    } finally {
      setSaving(false);
    }
  }

  if (!ready || loading) {
    return <PanelSkeleton rows={3} />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-6">
        {previewMode ? (
          <VisitorPreviewNotice description="风格画像现在支持访客预览。你可以先看完整字段和雷达结构，登录后再把这些偏好保存到自己的账号里。" />
        ) : null}

        <section className="section-card story-gradient rounded-[32px] p-5">
          <div className="flex items-start gap-4">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#ffe3d8_0%,#fff6ef_48%,#e1f5ec_100%)] p-3 text-[var(--ink-strong)]">
              <Radar className="size-5" />
            </div>
            <div>
              <div className="pill mb-3">Style radar</div>
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">风格画像</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{statusText}</p>
            </div>
          </div>
        </section>

        <section className="section-card rounded-[32px] p-5">
          <div className="mb-5 flex items-start gap-4">
            <div className="rounded-[22px] bg-[linear-gradient(135deg,#ffe6dd_0%,#fff8f1_50%,#e6f6ef_100%)] p-3 text-[var(--ink-strong)]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="pill mb-3">Radar snapshot</div>
              <h3 className="text-xl font-semibold text-[var(--ink-strong)]">首页雷达的独立页面</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">这里会成为“风格雷达”卡片点进去后的完整工作室，后续也方便接推荐解释和风格复盘。</p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative flex h-[19rem] w-[19rem] items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,rgba(255,223,216,0.55),rgba(255,255,255,0.9)_55%,rgba(223,246,235,0.45)_100%)]">
              <svg viewBox="0 0 180 180" className="h-[16rem] w-[16rem]">
                <circle cx="90" cy="90" r="66" fill="none" stroke="rgba(233,195,184,0.4)" />
                <circle cx="90" cy="90" r="46" fill="none" stroke="rgba(233,195,184,0.3)" />
                <circle cx="90" cy="90" r="26" fill="none" stroke="rgba(233,195,184,0.22)" />
                <line x1="90" y1="24" x2="90" y2="156" stroke="rgba(233,195,184,0.3)" />
                <line x1="27" y1="67" x2="153" y2="113" stroke="rgba(233,195,184,0.3)" />
                <line x1="51" y1="143" x2="129" y2="37" stroke="rgba(233,195,184,0.3)" />
                <polygon
                  points={radarValues}
                  fill="rgba(255,179,170,0.22)"
                  stroke="rgba(240,149,130,0.95)"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-2 text-center text-xs text-[var(--muted)]">
            {["风格词", "舒适度", "颜色", "轮廓", "规则"].map((label) => (
              <span key={label} className="rounded-full bg-white/80 px-2 py-2">{label}</span>
            ))}
          </div>
        </section>
      </div>

      <section className="section-card rounded-[32px] p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">喜欢颜色</span>
            <input
              value={listToString(profile.favorite_colors)}
              onChange={(event) => updateField("favorite_colors", stringToList(event.target.value))}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
              placeholder="奶油白, 柔粉, 浅灰蓝"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">避开颜色</span>
            <input
              value={listToString(profile.avoid_colors)}
              onChange={(event) => updateField("avoid_colors", stringToList(event.target.value))}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
              placeholder="荧光色, 过深紫"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">偏好轮廓</span>
            <input
              value={listToString(profile.favorite_silhouettes)}
              onChange={(event) => updateField("favorite_silhouettes", stringToList(event.target.value))}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
              placeholder="高腰, A字, 轻垂坠"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">避开轮廓</span>
            <input
              value={listToString(profile.avoid_silhouettes)}
              onChange={(event) => updateField("avoid_silhouettes", stringToList(event.target.value))}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
              placeholder="过度紧身, 太硬挺"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">风格关键词</span>
            <input
              value={listToString(profile.style_keywords)}
              onChange={(event) => updateField("style_keywords", stringToList(event.target.value))}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
              placeholder="甜感, 轻盈, 通勤"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--ink)]">不喜欢的风格词</span>
            <input
              value={listToString(profile.dislike_keywords)}
              onChange={(event) => updateField("dislike_keywords", stringToList(event.target.value))}
              className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
              placeholder="过辣, 太街头"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">通勤画像</span>
          <input
            value={profile.commute_profile}
            onChange={(event) => updateField("commute_profile", event.target.value)}
            className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
            placeholder="轻正式，不想太板正"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">舒适优先项</span>
          <input
            value={listToString(profile.comfort_priorities)}
            onChange={(event) => updateField("comfort_priorities", stringToList(event.target.value))}
            className="w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
            placeholder="不勒腰, 面料柔软, 方便久坐"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">衣橱规则</span>
          <textarea
            value={listToString(profile.wardrobe_rules)}
            onChange={(event) => updateField("wardrobe_rules", stringToList(event.target.value))}
            className="min-h-28 w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
            placeholder="例: 通勤 look 不超过三个主色, 约会时保留一个柔和亮点"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium text-[var(--ink)]">私人备注</span>
          <textarea
            value={profile.personal_note}
            onChange={(event) => updateField("personal_note", event.target.value)}
            className="min-h-32 w-full rounded-[22px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none"
            placeholder="这里可以写只有你自己知道的风格边界和偏好。"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "保存中..." : "保存风格画像"}
        </button>
      </section>
    </div>
  );
}
