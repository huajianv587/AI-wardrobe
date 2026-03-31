"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, CheckCircle2, LoaderCircle, Server, Sparkles, TriangleAlert, Wand2 } from "lucide-react";

import { AuthRequiredCard } from "@/components/auth/auth-required-card";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  AiDemoRunResponse,
  AiDemoServiceStatus,
  AiDemoWorkflow,
  fetchAiDemoServiceStatuses,
  fetchAiDemoWorkflows,
  runAiDemoWorkflow
} from "@/lib/api";

const defaultPromptByWorkflow: Record<string, string> = {
  "qwen-outfit-recommendation": "Office meeting tomorrow, soft but professional",
  "birefnet-background-removal": "Create a clean white-background garment image",
  "clip-wardrobe-classifier": "Classify this garment and extract tags",
  "qwen-vl-attribute-understanding": "Describe the style, fabric, and mood of this garment",
  "ootdiffusion-virtual-tryon": "Generate a polished try-on preview for a weekend look",
  "realesrgan-upscale": "Upscale the result for product display",
  "controlnet-product-shot": "Create a soft e-commerce hero shot with clean lighting",
  "triposr-avatar-rebuild": "Prepare a lightweight 3D-ready avatar asset"
};

function statusBadgeClass(status: AiDemoServiceStatus | null) {
  if (!status) {
    return "bg-[var(--background-soft)] text-[var(--ink)]";
  }

  if (status.healthy) {
    return "bg-[var(--accent-mint)]/70 text-[var(--ink-strong)]";
  }

  if (status.configured) {
    return "bg-[var(--accent-rose)]/45 text-[var(--ink-strong)]";
  }

  return "bg-[var(--background-soft)] text-[var(--ink)]";
}

export function AiDemoConsole() {
  const { ready, isAuthenticated } = useAuthSession();
  const [workflows, setWorkflows] = useState<AiDemoWorkflow[]>([]);
  const [statuses, setStatuses] = useState<AiDemoServiceStatus[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sourceImageUrl, setSourceImageUrl] = useState("");
  const [garmentName, setGarmentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiDemoRunResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !isAuthenticated) {
      return;
    }

    let active = true;

    async function loadWorkflows() {
      try {
        const [workflowPayload, statusPayload] = await Promise.all([
          fetchAiDemoWorkflows(),
          fetchAiDemoServiceStatuses()
        ]);

        if (!active) {
          return;
        }

        setWorkflows(workflowPayload);
        setStatuses(statusPayload);

        if (workflowPayload[0]) {
          setActiveWorkflowId(workflowPayload[0].id);
          setPrompt(workflowPayload[0].sample_prompt);
        }
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Could not load AI demo workflows.");
        }
      }
    }

    void loadWorkflows();

    return () => {
      active = false;
    };
  }, [ready, isAuthenticated]);

  const activeWorkflow = workflows.find((workflow) => workflow.id === activeWorkflowId) ?? null;
  const activeStatus = statuses.find((status) => status.workflow_id === activeWorkflowId) ?? null;
  const configuredCount = statuses.filter((status) => status.configured).length;
  const healthyCount = statuses.filter((status) => status.healthy).length;

  async function handleRun() {
    if (!activeWorkflow) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await runAiDemoWorkflow({
        workflow_id: activeWorkflow.id,
        prompt,
        source_image_url: sourceImageUrl || undefined,
        garment_name: garmentName || undefined
      });
      setResult(payload);

      try {
        const refreshedStatuses = await fetchAiDemoServiceStatuses();
        setStatuses(refreshedStatuses);
      } catch {
        // The main demo response already succeeded; keep the UI optimistic even if the secondary refresh fails.
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Could not run the AI demo workflow.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function activateWorkflow(workflow: AiDemoWorkflow) {
    setActiveWorkflowId(workflow.id);
    setPrompt(defaultPromptByWorkflow[workflow.id] ?? workflow.sample_prompt);
    setResult(null);
    setError("");
  }

  if (!ready) {
    return (
      <section className="section-card rounded-[36px] p-6">
        <p className="pill mb-3">AI API demo</p>
        <p className="text-sm leading-6 text-[var(--muted)]">Preparing the API-first model console.</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredCard
        title="Sign in to open the AI model demo console"
        description="The demo lab is wired around authenticated API calls so the same contracts can later serve your own fine-tuned models, private wardrobe data, and cloud sync state."
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="space-y-4">
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="section-card story-gradient rounded-[36px] p-6"
        >
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="pill mb-3">
                <Bot className="size-4" />
                API-first AI lab
              </div>
              <h3 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--ink-strong)]">Every model lane already behaves like a stable product API.</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">The UI talks to one FastAPI surface. Each workflow can stay in demo mode, proxy into a configured worker, or fall back gracefully if a worker is temporarily unavailable.</p>
            </div>

            <div className="grid min-w-56 gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/70 bg-white/72 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Workflow slots</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--ink-strong)]">{workflows.length}</p>
              </div>
              <div className="rounded-[24px] border border-white/70 bg-white/72 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Healthy workers</p>
                <p className="mt-2 text-3xl font-semibold text-[var(--ink-strong)]">{healthyCount}/{configuredCount}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {workflows.map((workflow, index) => {
              const active = workflow.id === activeWorkflowId;
              const status = statuses.find((entry) => entry.workflow_id === workflow.id) ?? null;

              return (
                <motion.button
                  key={workflow.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                  onClick={() => activateWorkflow(workflow)}
                  className={`rounded-[28px] border px-4 py-4 text-left transition ${
                    active
                      ? "border-transparent bg-[var(--ink-strong)] text-white shadow-[var(--shadow-float)]"
                      : "border-[var(--line)] bg-white/82 text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{workflow.title}</p>
                      <p className={`mt-2 text-xs leading-5 ${active ? "text-white/75" : "text-[var(--muted)]"}`}>{workflow.model_name}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs ${active ? "bg-white/18 text-white" : statusBadgeClass(status)}`}>{workflow.priority}</span>
                  </div>

                  <p className={`mt-3 text-sm leading-6 ${active ? "text-white/85" : "text-[var(--muted)]"}`}>{workflow.task}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs ${active ? "bg-white/12 text-white/85" : "bg-[var(--background-soft)] text-[var(--ink)]"}`}>{workflow.service_slot}</span>
                    <span className={`rounded-full px-3 py-1 text-xs ${active ? "bg-white/12 text-white/85" : "bg-[var(--background-soft)] text-[var(--ink)]"}`}>{workflow.delivery_mode}</span>
                    {status ? (
                      <span className={`rounded-full px-3 py-1 text-xs ${active ? "bg-white/12 text-white/85" : statusBadgeClass(status)}`}>
                        {status.healthy ? "worker live" : status.configured ? "fallback armed" : "demo mode"}
                      </span>
                    ) : null}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="section-card rounded-[36px] p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="pill mb-3">
                <Server className="size-4" />
                Adapter readiness
              </div>
              <h4 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">Worker map for later self-hosting</h4>
            </div>
            <span className="rounded-full bg-[var(--background-soft)] px-3 py-1 text-xs text-[var(--ink)]">{configuredCount} configured</span>
          </div>

          <div className="space-y-3">
            {statuses.map((status) => (
              <div key={status.workflow_id} className="rounded-[24px] border border-[var(--line)] bg-white/82 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-strong)]">{status.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{status.service_slot}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${statusBadgeClass(status)}`}>
                    {status.healthy ? "reachable" : status.configured ? "configured but offline" : "demo fallback"}
                  </span>
                </div>

                {status.worker_url ? (
                  <p className="mt-3 break-all text-xs leading-5 text-[var(--muted)]">{status.worker_url}</p>
                ) : null}
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{status.note}</p>
              </div>
            ))}
          </div>
        </motion.article>
      </section>

      <section className="space-y-4">
        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="section-card rounded-[36px] p-6"
        >
          <div className="mb-5">
            <div className="pill mb-3">
              <Sparkles className="size-4" />
              Demo runner
            </div>
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">{activeWorkflow?.title ?? "Select a workflow"}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{activeWorkflow?.summary ?? "Choose a workflow card to see how the API contract behaves."}</p>
          </div>

          <div className="mb-5 rounded-[24px] border border-[var(--line)] bg-[var(--background-soft)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--ink-strong)]">Current delivery path</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{activeStatus?.note ?? "Loading service readiness..."}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${statusBadgeClass(activeStatus)}`}>
                {activeStatus?.healthy ? "external worker live" : activeStatus?.configured ? "configured fallback" : "demo response"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Prompt</span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                className="min-h-32 w-full rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-4 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-white"
                placeholder="Describe the demo request..."
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Garment name</span>
                <input
                  value={garmentName}
                  onChange={(event) => setGarmentName(event.target.value)}
                  className="w-full rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-white"
                  placeholder="Ivory wrap coat"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Source image URL</span>
                <input
                  value={sourceImageUrl}
                  onChange={(event) => setSourceImageUrl(event.target.value)}
                  className="w-full rounded-[24px] border border-[var(--line)] bg-white/85 px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-white"
                  placeholder={activeWorkflow?.sample_image_hint ?? "Optional image reference"}
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleRun()}
            disabled={loading || !activeWorkflow}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm text-white shadow-[var(--shadow-float)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
            {loading ? "Running..." : "Run demo API"}
          </button>

          {error ? (
            <div className="mt-4 rounded-[22px] border border-[var(--accent-rose)] bg-[var(--accent-rose)]/35 px-4 py-4 text-sm text-[var(--ink)]">
              {error}
            </div>
          ) : null}
        </motion.article>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.article
              key={result.workflow_id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="section-card rounded-[36px] p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="pill mb-3">API response</div>
                  <h4 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">{result.headline}</h4>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{result.summary}</p>
                </div>
                <div className="rounded-[20px] bg-[var(--background-soft)] px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Mode</p>
                  <p className="mt-2 text-sm font-medium text-[var(--ink)]">{result.provider_mode}</p>
                </div>
              </div>

              <div className="space-y-3">
                {result.artifacts.map((artifact) => (
                  <motion.div
                    key={`${artifact.label}-${artifact.kind}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[24px] border border-[var(--line)] bg-white/85 p-4"
                  >
                    <p className="text-sm font-semibold text-[var(--ink-strong)]">{artifact.label}</p>
                    {artifact.value ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{artifact.value}</p> : null}
                    {artifact.previewUrl ? (
                      <p className="mt-2 break-all text-xs leading-5 text-[var(--muted)]">Preview source: {artifact.previewUrl}</p>
                    ) : null}
                    {artifact.payload ? (
                      <pre className="mt-3 overflow-x-auto rounded-[18px] bg-[var(--background-soft)] p-3 text-xs leading-6 text-[var(--ink)]">
                        {JSON.stringify(artifact.payload, null, 2)}
                      </pre>
                    ) : null}
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 rounded-[24px] border border-[var(--line)] bg-[var(--background-soft)] px-4 py-4 text-sm leading-6 text-[var(--ink)]">
                {result.model_upgrade_path}
              </div>
            </motion.article>
          ) : (
            <motion.article
              key="empty-state"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="section-card rounded-[36px] p-6"
            >
              <div className="pill mb-3">
                <CheckCircle2 className="size-4" />
                Ready for demo
              </div>
              <p className="text-sm leading-7 text-[var(--muted)]">Pick one model slot, send a request through the unified API, and use the returned contract as the stable handoff point for your future self-hosted workers.</p>
            </motion.article>
          )}
        </AnimatePresence>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="section-card rounded-[36px] p-6"
        >
          <div className="pill mb-3">
            <TriangleAlert className="size-4" />
            Cost control path
          </div>
          <p className="text-sm leading-7 text-[var(--muted)]">This setup is intentionally gentle on product risk: you can ship the experience now with demo contracts, then replace each adapter one by one with your own trained checkpoints as they become ready.</p>
        </motion.article>
      </section>
    </div>
  );
}
