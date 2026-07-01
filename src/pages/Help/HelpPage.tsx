import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HELP_SECTIONS, findTopic, type HelpBlock } from './helpContent';
import { DocsLink } from '@/components/DocsLink';

/**
 * In-app user documentation. A sidebar of task-based topics grouped by product area, plus a
 * content pane. Available to every authenticated user (no permission gate) — it explains the
 * product, it doesn't expose data. The comprehensive guides (and the developer docs) live on the
 * dedicated docs site; this is the contextual in-product subset.
 */
export function HelpPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const [query, setQuery] = useState('');

  const selected = topicId ? findTopic(topicId) : null;

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_SECTIONS;
    return HELP_SECTIONS.map((s) => ({
      ...s,
      topics: s.topics.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q),
      ),
    })).filter((s) => s.topics.length > 0);
  }, [query]);

  return (
    <div className="grid max-w-[1200px] gap-6 p-6">
      <header className="space-y-2">
        <h1 data-testid="help-title" className="text-2xl">Help &amp; guides</h1>
        <div className="section-line" />
        <p className="max-w-3xl text-slate-500">
          Task-based guides for everyday work in CPS. Pick a topic on the left.
        </p>
        <DocsLink
          path="user-guide/getting-started/"
          className="inline-block text-sm font-medium text-teal-700 hover:underline"
        >
          Browse the full documentation ↗
        </DocsLink>
      </header>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <nav aria-label="Help topics" className="space-y-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics…"
            data-testid="help-search"
            className="form-input w-full"
          />
          {filteredSections.length === 0 && (
            <p data-testid="help-no-results" className="text-sm text-slate-400">No topics match your search.</p>
          )}
          {filteredSections.map((section) => (
            <div key={section.id}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.label}
              </div>
              <ul className="space-y-0.5">
                {section.topics.map((t) => {
                  const active = t.id === topicId;
                  return (
                    <li key={t.id}>
                      <Link
                        to={`/help/${t.id}`}
                        data-testid={`help-link-${t.id}`}
                        className={`block rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                          active
                            ? 'bg-navy-900 font-medium text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {t.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <section className="min-w-0">
          {selected ? (
            <article data-testid="help-article" className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                {selected.section.label}
              </div>
              <h2 className="text-xl font-semibold text-slate-800">{selected.topic.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{selected.topic.summary}</p>
              <div className="mt-4 space-y-4">
                {selected.topic.blocks.map((b, i) => (
                  <Block key={i} block={b} />
                ))}
              </div>
            </article>
          ) : (
            <div data-testid="help-landing" className="grid gap-4 sm:grid-cols-2">
              {HELP_SECTIONS.flatMap((s) =>
                s.topics.map((t) => (
                  <Link
                    key={t.id}
                    to={`/help/${t.id}`}
                    className="card-hover rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {s.label}
                    </div>
                    <div className="mt-0.5 font-medium text-slate-800">{t.title}</div>
                    <div className="mt-1 text-sm text-slate-500">{t.summary}</div>
                  </Link>
                )),
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Block({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case 'p':
      return <p className="text-sm leading-relaxed text-slate-700">{block.text}</p>;
    case 'heading':
      return <h3 className="text-base font-semibold text-slate-800">{block.text}</h3>;
    case 'steps':
      return (
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
          {block.items.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      );
    case 'list':
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
          {block.items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      );
    case 'note':
      return (
        <div className="rounded-lg border-l-4 border-teal-500 bg-teal-50 px-4 py-2.5 text-sm text-slate-700">
          {block.text}
        </div>
      );
  }
}
