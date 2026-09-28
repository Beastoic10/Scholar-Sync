import React, { useState } from 'react';
import { taskApi } from '../api';
import type { Project, Task } from '../types';
import { CheckSquare } from 'lucide-react';
import { ModalHeader, ErrorBar, FieldLabel } from './CreateProjectModal';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onTaskCreated: (task: Task) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen, onClose, project, onTaskCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [studentId, setStudentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const newTask = await taskApi.createTask(project.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        assignedStudentId: studentId ? parseInt(studentId, 10) : null,
      });
      setTitle(''); setDescription(''); setStudentId('');
      onTaskCreated(newTask);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-strong animate-fade-up" style={{ width: '100%', maxWidth: 480 }}>
        <ModalHeader
          icon={<CheckSquare size={17} style={{ color: '#93c5fd' }} />}
          title="New Research Task"
          subtitle="Starts in PROPOSED state"
          onClose={onClose}
        />

        {error && <ErrorBar text={error} />}

        <form onSubmit={handleSubmit} style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '0.875rem' }}>
          <FieldLabel label="Task Title" required>
            <input
              type="text" required value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Conduct Survey on Transformer Pruning Methods"
              className="glass-input"
            />
          </FieldLabel>

          <FieldLabel label="Description & Deliverables Requirements">
            <textarea
              rows={3} value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Methodologies, dataset requirements, expected deliverables..."
              className="glass-input" style={{ resize: 'none' }}
            />
          </FieldLabel>

          <FieldLabel label="Assign to Student Researcher (Optional)">
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="glass-input" style={{ cursor: 'pointer' }}
            >
              <option value="" style={{ background: '#0d1733' }}>— Leave Unassigned —</option>
              {project.students.map((student) => (
                <option key={student.id} value={student.id} style={{ background: '#0d1733' }}>
                  {student.name} ({student.email})
                </option>
              ))}
            </select>
            {project.students.length === 0 && (
              <p style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.35rem' }}>
                No students enrolled yet. Use "Assign Student" on the project board first.
              </p>
            )}
          </FieldLabel>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ fontSize: '0.8rem' }}>Cancel</button>
            <button type="submit" disabled={loading || !title.trim()} className="btn-primary" style={{ fontSize: '0.8rem' }}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
