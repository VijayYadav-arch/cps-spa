import { Fragment, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { streamIdgPrepBrief, type IdgMeeting } from '@/api/hospice';
import type { AiStreamErrorEvent } from '@/api/aiStream';

function safeJsonArrayLen(s: string | null | undefined): number {
  if (!s) return 0;
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

function mapBriefError(event: AiStreamErrorEvent): string {
  switch (event.error) {
    case 'not_found':
      return 'IDG meeting not found.';
    case 'rate_limited':
      return 'Too many brief requests recently. Please try again in a moment.';
    case 'ai_not_available':
      return 'The AI assistant is not available for your organization right now.';
    case 'ai_provider_unreachable':
      return "Couldn't reach the AI service. Try again shortly.";
    default:
      return event.message || 'Something went wrong generating the brief.';
  }
}

export function IdgMeetingsPage() {
  const [meetings, setMeetings] = useState<IdgMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBriefId, setExpandedBriefId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [briefError, setBriefError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort an in-flight stream if the page unmounts mid-generation.
  useEffect(() => () => abortRef.current?.abort(), []);

  const handleGenerateBrief = async (meetingId: number) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setGeneratingId(meetingId);
    setBriefError(null);
    setStreamingText('');
    setExpandedBriefId(meetingId); // reveal the row so the brief streams in live
    let assembled = '';
    try {
      await streamIdgPrepBrief(
        meetingId,
        {
          onDelta: (text) => {
            assembled += text;
            setStreamingText(assembled);
          },
          onDone: (result) => {
            // Trust the done event as authoritative (server persists the final text).
            setMeetings((prev) => prev.map((m) =>
              m.id === meetingId
                ? { ...m, prepBriefText: result.prepBriefText, prepBriefGeneratedAtUtc: result.prepBriefGeneratedAtUtc }
                : m
            ));
          },
          onError: (event) => {
            setBriefError(mapBriefError(event));
          },
        },
        ac.signal,
      );
    } catch {
      setBriefError('Something went wrong generating the brief.');
    } finally {
      if (abortRef.current === ac) {
        setGeneratingId(null);
        abortRef.current = null;
      }
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<{ data: IdgMeeting[] }>('/hospice/idg-meetings/upcoming')
      .then((res) => {
        if (!cancelled) setMeetings(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load IDG meetings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-serif text-slate-900">IDG Meetings</h1>
        <p className="text-slate-600 mt-1">Interdisciplinary Group meeting management</p>
      </header>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      {briefError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{briefError}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading IDG meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium mb-1">No IDG meetings scheduled</p>
            <p className="text-sm">Schedule an IDG meeting to review patient care plans.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="px-5 py-3">Meeting Date</th>
                <th className="px-5 py-3">Attendees</th>
                <th className="px-5 py-3">Patients Reviewed</th>
                <th className="px-5 py-3">Action Items</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Next Meeting</th>
                <th className="px-5 py-3">Prep Brief</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {meetings.map((m) => {
                const isExpanded = expandedBriefId === m.id;
                const hasBrief = Boolean(m.prepBriefText);
                const isGenerating = generatingId === m.id;
                const showBriefRow = isExpanded && (hasBrief || isGenerating);
                return (
                  <Fragment key={m.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-medium">
                        {new Date(m.meetingDate).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-sm">{safeJsonArrayLen(m.attendees)} attendees</td>
                      <td className="px-5 py-4 text-sm">
                        {safeJsonArrayLen(m.patientsReviewed)} patients
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {safeJsonArrayLen(m.actionItems)} items
                      </td>
                      <td className="px-5 py-4 text-sm">{m.status}</td>
                      <td className="px-5 py-4 text-sm">
                        {m.nextMeetingDate ? new Date(m.nextMeetingDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateBrief(m.id)}
                            disabled={generatingId === m.id}
                            className="text-xs text-teal-700 hover:text-teal-800 underline disabled:opacity-50"
                          >
                            {generatingId === m.id
                              ? 'Generating…'
                              : hasBrief
                              ? 'Regenerate'
                              : 'Generate'}
                          </button>
                          {hasBrief && (
                            <button
                              type="button"
                              onClick={() => setExpandedBriefId(isExpanded ? null : m.id)}
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? `Hide brief for meeting ${m.id}` : `Show brief for meeting ${m.id}`}
                              className="text-xs px-2 border border-slate-200 rounded text-slate-600"
                            >
                              {isExpanded ? '▾ AI' : '▸ AI'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {showBriefRow && (
                      <tr>
                        <td colSpan={7} className="px-5 pb-4 bg-slate-50">
                          <div
                            aria-label={`AI prep brief for meeting ${m.id}`}
                            aria-live={isGenerating ? 'polite' : undefined}
                            className="text-sm text-slate-700 whitespace-pre-wrap p-3 border-l-4 border-indigo-500 bg-white rounded"
                          >
                            {isGenerating && streamingText.length === 0 ? (
                              <span className="text-slate-500">Generating brief…</span>
                            ) : (
                              isGenerating ? streamingText : m.prepBriefText
                            )}
                            {isGenerating && (
                              <span
                                aria-hidden="true"
                                className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-indigo-500 animate-pulse"
                              />
                            )}
                            {!isGenerating && m.prepBriefGeneratedAtUtc && (
                              <div className="mt-3 text-xs text-slate-400">
                                AI-generated {new Date(m.prepBriefGeneratedAtUtc).toLocaleString()}
                                {' '}— review and verify before the meeting.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
