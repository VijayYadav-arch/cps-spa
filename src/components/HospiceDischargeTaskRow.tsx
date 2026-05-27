import type { HospiceDischargeTask } from '@/api/hospice';

interface Props {
  task: HospiceDischargeTask;
  onComplete: (taskId: number) => void;
  onEdit: (taskId: number) => void;
  onRemove: (taskId: number) => void;
}

export function HospiceDischargeTaskRow({ task, onComplete, onEdit, onRemove }: Props) {
  const isCompleted = task.completedAt !== null;
  return (
    <tr className={isCompleted ? 'task-row task-row--completed' : 'task-row'}>
      <td>{task.taskType}</td>
      <td>{task.title}</td>
      <td>{task.dueDate}</td>
      <td>{isCompleted ? new Date(task.completedAt!).toLocaleDateString() : '—'}</td>
      <td>
        {!isCompleted && <button type="button" onClick={() => onComplete(task.id)}>Complete</button>}
        <button type="button" onClick={() => onEdit(task.id)}>Edit</button>
        <button type="button" onClick={() => onRemove(task.id)} disabled={isCompleted}>Remove</button>
      </td>
    </tr>
  );
}
