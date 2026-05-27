import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HospiceDischargeTaskRow } from '@/components/HospiceDischargeTaskRow';
import type { HospiceDischargeTask } from '@/api/hospice';

function makeTask(overrides: Partial<HospiceDischargeTask> = {}): HospiceDischargeTask {
  return {
    id: 1, dischargeId: 1, taskType: 'DmeRetrieval', title: 'Retrieve DME',
    dueDate: '2026-02-05', completedAt: null, completedByUserId: null, notes: null,
    createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z',
    ...overrides,
  };
}

describe('HospiceDischargeTaskRow', () => {
  it('renders pending task with Complete button', () => {
    render(<table><tbody><HospiceDischargeTaskRow task={makeTask()} onComplete={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} /></tbody></table>);
    expect(screen.getByText(/retrieve dme/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^complete$/i })).toBeInTheDocument();
  });

  it('renders completed task without Complete button', () => {
    render(<table><tbody><HospiceDischargeTaskRow task={makeTask({ completedAt: '2026-02-04T12:00:00Z' })} onComplete={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} /></tbody></table>);
    expect(screen.queryByRole('button', { name: /^complete$/i })).not.toBeInTheDocument();
  });

  it('Complete click fires onComplete with taskId', () => {
    const onComplete = vi.fn();
    render(<table><tbody><HospiceDischargeTaskRow task={makeTask()} onComplete={onComplete} onEdit={vi.fn()} onRemove={vi.fn()} /></tbody></table>);
    fireEvent.click(screen.getByRole('button', { name: /^complete$/i }));
    expect(onComplete).toHaveBeenCalledWith(1);
  });

  it('Remove disabled when task already completed', () => {
    render(<table><tbody><HospiceDischargeTaskRow task={makeTask({ completedAt: '2026-02-04T12:00:00Z' })} onComplete={vi.fn()} onEdit={vi.fn()} onRemove={vi.fn()} /></tbody></table>);
    expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled();
  });
});
