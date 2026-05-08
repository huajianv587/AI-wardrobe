"use client";

import { BarChart3, RefreshCw, Shirt, Sparkles, WashingMachine } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { VisitorPreviewNotice } from "@/components/auth/visitor-preview-notice";
import { PanelSkeleton } from "@/components/ui/panel-skeleton";
import { ApiError, fetchAssistantReminders, fetchClosetGaps, fetchWardrobeItems, type ClosetGapResult, type ReminderCard, type ReminderResult } from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { seedWardrobeItems } from "@/store/wardrobe-store";

const previewGaps: ClosetGapResult = {
  summary: "你的衣橱整体偏温柔通勤，但在天气波动和轻正式过渡层上还可以再补一两件关键单品。",
  insights: [
    { title: "缺一件轻薄外搭", description: "当前上衣和下装够用，但早晚温差时缺少能快速叠穿的轻外套。", urgency: "中" },
    { title: "通勤鞋履偏少", description: "如果连续通勤，舒适又不失精致感的鞋子轮换空间还不够。", urgency: "中" },
    { title: "正式感配饰不足", description: "在会议或约会场景里，能提气质的配饰数量还偏少。", urgency: "低" }
  ]
};

const previewReminders: ReminderResult = {
  repeat_warning: [
    { title: "本周重复率偏高", description: "你最近 3 次都用了相近的奶油白 + 深色下装组合，可以试试更轻盈的替代搭法。", tone: "提醒", item_ids: [1, 3, 7] }
  ],
  laundry_and_care: [
    { title: "针织单品需要洗护", description: "有一件常穿针织连续出现，建议安排一次轻柔洗护。", tone: "洗护", item_ids: [2] }
  ],
  idle_and_seasonal: [
    { title: "部分单品闲置中", description: "有几件外搭近一个月没有进入搭配，可以考虑换季整理或重新激活。", tone: "闲置", item_ids: [5, 6] }
  ]
};

function ReminderSection({
  title,
  description,
  cards,
  icon
}: {
  title: string;
  description: string;
  cards: ReminderCard[];
  icon: ReactNode;
}) {
  return (
    <section className="rounded-[48px] bg-white/85 p-10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
      <div className="mb-8 flex items-start gap-5">
        <div className="rounded-[24px] bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4 text-white shadow-lg">
          {icon}
        </div>
        <div>
          <div className="mb-3 inline-block rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-[#667eea]">{title}</div>
          <h3 className="text-2xl font-bold text-[#2d3748]">{description}</h3>
        </div>
      </div>

      <div className="grid gap-5">
        {cards.length > 0 ? cards.map((card) => (
          <article key={`${card.title}-${card.description}`} className="group rounded-[32px] border border-[#e2e8f0] bg-white p-6 shadow-sm transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-[#2d3748]">{card.title}</h4>
                <p className="mt-3 text-base leading-7 text-[#718096]">{card.description}</p>
              </div>
              <span className="rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 px-4 py-1.5 text-sm font-medium text-[#667eea]">{card.tone}</span>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {card.item_ids.map((itemId) => (
                <span key={itemId} className="rounded-full border border-[#e2e8f0] bg-[#f7fafc] px-4 py-1.5 text-sm text-[#718096] transition-colors duration-300 hover:border-[#667eea] hover:bg-[#667eea]/5">
                  单品 #{itemId}
                </span>
              ))}
            </div>
          </article>
        )) : (
          <div className="rounded-[32px] border-2 border-dashed border-[#e2e8f0] bg-[#f7fafc]/50 px-6 py-16 text-center text-base leading-7 text-[#718096]">
            当前这一类提醒还没有触发，说明你的衣橱状态暂时比较平衡。
          </div>
        )}
      </div>
    </section>
  );
}

export function ClosetAnalysisDashboard() {
  const { ready, isAuthenticated } = useAuthSession();
  const [gaps, setGaps] = useState<ClosetGapResult | null>(null);
  const [reminders, setReminders] = useState<ReminderResult | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [statusText, setStatusText] = useState("正在整理你的衣橱分析结果...");
  const [loading, setLoading] = useState(true);
  const previewMode = !isAuthenticated;

  const loadAnalysis = useCallback(async () => {
    setLoading(true);

    try {
      if (!isAuthenticated) {
        setGaps(previewGaps);
        setReminders(previewReminders);
        setItemCount(seedWardrobeItems.length);
        setStatusText("当前是访客预览模式，你可以先查看分析结构和提醒样式，登录后会切换成你的真实衣橱结果。");
        return;
      }

      const [nextGaps, nextReminders, nextItems] = await Promise.all([
        fetchClosetGaps(),
        fetchAssistantReminders(),
        fetchWardrobeItems()
      ]);

      setGaps(nextGaps);
      setReminders(nextReminders);
      setItemCount(nextItems.length);
      setStatusText("缺口分析、重复提醒、洗护提示和换季提醒都已经整理好了。");
    } catch (error) {
      setStatusText(
        error instanceof ApiError && error.status === 401
          ? "登录状态失效了，请重新登录后查看衣橱分析。"
          : error instanceof Error
            ? error.message
            : "暂时无法读取衣橱分析。"
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    void loadAnalysis();
  }, [loadAnalysis, ready]);

  if (!ready || loading) {
    return <PanelSkeleton rows={3} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fa] via-[#e8eef5] to-[#c3cfe2] px-6 py-12">
      <div className="mx-auto max-w-7xl space-y-12">
        {previewMode ? (
          <VisitorPreviewNotice description="衣橱分析已经对访客开放预览。你现在看到的是演示版缺口分析和提醒卡片，登录后会自动换成你的真实衣橱分析。" />
        ) : null}

        <section className="rounded-[48px] bg-white/85 p-10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <div className="rounded-[24px] bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4 text-white shadow-lg">
                <BarChart3 className="size-6" />
              </div>
              <div>
                <div className="mb-3 inline-block rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-[#667eea]">Analysis board</div>
                <h3 className="text-3xl font-bold text-[#2d3748]">衣橱分析总览</h3>
                <p className="mt-3 text-base leading-7 text-[#718096]">{statusText}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadAnalysis()}
              className="inline-flex items-center gap-3 rounded-full border-2 border-[#667eea] bg-gradient-to-r from-[#667eea] to-[#764ba2] px-6 py-3 text-base font-medium text-white shadow-lg transition-all duration-[400ms] hover:scale-105 hover:shadow-[0_8px_30px_rgba(102,126,234,0.4)]"
            >
              <RefreshCw className="size-5" />
              刷新分析
            </button>
          </div>

          <div className="my-10 h-px bg-gradient-to-r from-transparent via-[#e2e8f0] to-transparent" />

          <div className="grid gap-6 md:grid-cols-4">
            <div className="rounded-[36px] bg-gradient-to-br from-[#fff5f5] to-[#fed7d7] p-8 shadow-sm transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c53030]">衣橱总量</p>
              <p className="mt-4 text-4xl font-bold text-[#2d3748]">{itemCount}</p>
              <p className="mt-4 text-sm leading-6 text-[#718096]">分析基于你当前已上传的衣物。</p>
            </div>
            <div className="rounded-[36px] bg-gradient-to-br from-[#fffaf0] to-[#feebc8] p-8 shadow-sm transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c05621]">缺口提醒</p>
              <p className="mt-4 text-4xl font-bold text-[#2d3748]">{gaps?.insights.length ?? 0}</p>
              <p className="mt-4 text-sm leading-6 text-[#718096]">帮助你看清还缺哪一类关键单品。</p>
            </div>
            <div className="rounded-[36px] bg-gradient-to-br from-[#f0fff4] to-[#c6f6d5] p-8 shadow-sm transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#276749]">重复穿搭</p>
              <p className="mt-4 text-4xl font-bold text-[#2d3748]">{reminders?.repeat_warning.length ?? 0}</p>
              <p className="mt-4 text-sm leading-6 text-[#718096]">防止总是穿同一组搭配出门。</p>
            </div>
            <div className="rounded-[36px] bg-gradient-to-br from-[#ebf8ff] to-[#bee3f8] p-8 shadow-sm transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2c5282]">洗护 / 闲置</p>
              <p className="mt-4 text-4xl font-bold text-[#2d3748]">{(reminders?.laundry_and_care.length ?? 0) + (reminders?.idle_and_seasonal.length ?? 0)}</p>
              <p className="mt-4 text-sm leading-6 text-[#718096]">提醒你保养和换季整理。</p>
            </div>
          </div>
        </section>

        <section className="rounded-[48px] bg-white/85 p-10 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <div className="mb-8 flex items-start gap-5">
            <div className="rounded-[24px] bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4 text-white shadow-lg">
              <Sparkles className="size-6" />
            </div>
            <div>
              <div className="mb-3 inline-block rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-[#667eea]">Gap analysis</div>
              <h3 className="text-3xl font-bold text-[#2d3748]">缺口分析</h3>
              <p className="mt-3 text-base leading-7 text-[#718096]">{gaps?.summary ?? "后端返回的缺口摘要会显示在这里。"}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {gaps?.insights.length ? gaps.insights.map((insight) => (
              <article key={`${insight.title}-${insight.urgency}`} className="group rounded-[36px] border border-[#e2e8f0] bg-white p-6 shadow-sm transition-all duration-[400ms] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                <div className="flex items-start justify-between gap-4">
                  <h4 className="text-xl font-bold text-[#2d3748]">{insight.title}</h4>
                  <span className="rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 px-4 py-1.5 text-sm font-medium text-[#667eea]">{insight.urgency}</span>
                </div>
                <p className="mt-4 text-base leading-7 text-[#718096]">{insight.description}</p>
              </article>
            )) : (
              <div className="rounded-[36px] border-2 border-dashed border-[#e2e8f0] bg-[#f7fafc]/50 px-6 py-16 text-center text-base leading-7 text-[#718096]">
                暂时没有新的缺口提示，说明你当前衣橱结构已经比较完整。
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-3">
          <ReminderSection
            title="Repeat reminder"
            description="重复穿搭提醒"
            cards={reminders?.repeat_warning ?? []}
            icon={<Shirt className="size-6" />}
          />
          <ReminderSection
            title="Care reminder"
            description="洗护提醒"
            cards={reminders?.laundry_and_care ?? []}
            icon={<WashingMachine className="size-6" />}
          />
          <ReminderSection
            title="Seasonal reminder"
            description="换季 / 闲置提醒"
            cards={reminders?.idle_and_seasonal ?? []}
            icon={<Sparkles className="size-6" />}
          />
        </div>
      </div>
    </div>
  );
}
