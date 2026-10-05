import React, { useState, useEffect } from 'react';
import { taskApi } from '../api';
import type { Project, Task } from '../types';
import { Edit3 } from 'lucide-react';
import { ModalHeader, ErrorBar, FieldLabel } from './CreateProjectModal';
import { MultiStudentSelector } from './MultiStudentSelector';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  task: Task;
  onTaskUpdated: (updatedTask: Task) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  isOpen,
  onClose,
  project,
  task,
  onTaskUpdated,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title);
      setDescription(task.description || '');
      const initialIds: number[] = [];
      if (task.assignedStudents && task.assignedStudents.length > 0) {
        task.assignedStudents.forEach((s) => {
          if (!initialIds.includes(s.id)) initialIds.push(s.id);
        });
      } else if (task.assignedStudent) {
        initialIds.push(task.assignedStudent.id);
      }
      setSelectedStudentIds(initialIds);
      setError(null);
    }
  }, [isOpen, task]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const updatedTask = await taskApi.updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        assignedStudentIds: selectedStudentIds,
        assignedStudentId: selectedStudentIds.length > 0 ? selectedStudentIds[0] : null,
      });
      onTaskUpdated(updatedTask);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-strong animate-fade-up" style={{ width: '100%', maxWidth: 520 }}>
        <ModalHeader
          icon={<Edit3 size={17} style={{ color: '#93c5fd' }} />}
          title="Edit Research Task"
          subtitle={`Task #${task.id} (${task.currentState})`}
          onClose={onClose}
        />

        {error && <ErrorBar text={error} />}

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '0.875rem' }}>
          <FieldLabel label="Task Title" required>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input"
            />
          </FieldLabel>

          <FieldLabel label="Description & Deliverables Requirements">
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-input"
              style={{ resize: 'none' }}
            />
          </FieldLabel>

          <FieldLabel label="Assigned Student Researcher(s)">
            <MultiStudentSelector
              availableStudents={project.students}
              selectedStudentIds={selectedStudentIds}
              onChange={setSelectedStudentIds}
              disabled={loading}
            />
          </FieldLabel>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ fontSize: '0.8rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !title.trim()} className="btn-primary" style={{ fontSize: '0.8rem' }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
