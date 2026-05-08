import { PageShell } from "./PageShell";
import { SectionHeading } from "./SectionHeading";

type LegalPageProps = {
  title: string;
  updatedAt: string;
  sections: Array<{ heading: string; body: string }>;
};

export function LegalPage({ title, updatedAt, sections }: LegalPageProps) {
  return (
    <PageShell>
      <main className="px-6 pb-24 pt-32 md:px-8">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            eyebrow="Legal"
            title={title}
            description={`更新日期：${updatedAt}`}
          />
          <article className="mt-12 grid gap-10 rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-glass)] p-6 leading-8 text-[var(--text-secondary)] backdrop-blur-2xl md:p-10">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {section.heading}
                </h2>
                <p className="mt-4">{section.body}</p>
              </section>
            ))}
          </article>
        </div>
      </main>
    </PageShell>
  );
}
