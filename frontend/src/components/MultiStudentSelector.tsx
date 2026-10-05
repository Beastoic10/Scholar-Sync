import React, { useState } from 'react';
import type { User } from '../types';
import { Check, X, Search, Users } from 'lucide-react';

interface MultiStudentSelectorProps {
  availableStudents: User[];
  selectedStudentIds: number[];
  onChange: (selectedIds: number[]) => void;
  disabled?: boolean;
}

export const MultiStudentSelector: React.FC<MultiStudentSelectorProps> = ({
  availableStudents,
  selectedStudentIds,
  onChange,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = availableStudents.filter((student) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      student.name.toLowerCase().includes(q) ||
      student.email.toLowerCase().includes(q) ||
      String(student.id).includes(q)
    );
  });

  const toggleStudent = (id: number) => {
    if (disabled) return;
    if (selectedStudentIds.includes(id)) {
      onChange(selectedStudentIds.filter((sId) => sId !== id));
    } else {
      onChange([...selectedStudentIds, id]);
    }
  };

  const removeStudent = (id: number) => {
    if (disabled) return;
    onChange(selectedStudentIds.filter((sId) => sId !== id));
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(availableStudents.map((s) => s.id));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const selectedStudents = availableStudents.filter((s) => selectedStudentIds.includes(s.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Selected Chips Bar */}
      {selectedStudents.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.375rem',
          padding: '0.5rem',
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 10,
        }}>
          {selectedStudents.map((student) => (
            <span
              key={student.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#93c5fd',
                background: 'rgba(59,130,246,0.2)',
                border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 8,
                padding: '0.2rem 0.5rem',
              }}
            >
              <span style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#3b82f6',
                color: '#fff',
                fontSize: '0.55rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}>
                {student.name.charAt(0).toUpperCase()}
              </span>
              {student.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeStudent(student.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    lineHeight: 1,
                  }}
                  title="Remove student"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search & Actions Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={13} style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.3)',
            pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search students to assign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled || availableStudents.length === 0}
            className="glass-input"
            style={{ paddingLeft: '1.85rem', fontSize: '0.75rem', height: 32 }}
          />
        </div>

        {availableStudents.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              onClick={selectAll}
              disabled={disabled || selectedStudentIds.length === availableStudents.length}
              className="btn-ghost"
              style={{ fontSize: '0.68rem', padding: '0.25rem 0.5rem' }}
            >
              All
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled || selectedStudentIds.length === 0}
              className="btn-ghost"
              style={{ fontSize: '0.68rem', padding: '0.25rem 0.5rem' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Students List Box */}
      <div style={{
        maxHeight: 160,
        overflowY: 'auto',
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
      }}>
        {availableStudents.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#fbbf24' }}>
            No students enrolled yet. Assign students to the project first.
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
            No students found matching "{searchTerm}"
          </div>
        ) : (
          filteredStudents.map((student) => {
            const isSelected = selectedStudentIds.includes(student.id);
            return (
              <div
                key={student.id}
                onClick={() => toggleStudent(student.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  cursor: disabled ? 'default' : 'pointer',
                  background: isSelected ? 'rgba(59,130,246,0.14)' : 'transparent',
                  transition: 'background 0.15s ease',
                }}
                onMouseOver={(e) => {
                  if (!isSelected && !disabled) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseOut={(e) => {
                  if (!isSelected && !disabled) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: isSelected ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${isSelected ? '#60a5fa' : 'rgba(255,255,255,0.15)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: isSelected ? '#fff' : 'rgba(255,255,255,0.6)',
                  }}>
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f0f6ff' }}>
                      {student.name}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                      {student.email}
                    </div>
                  </div>
                </div>

                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: isSelected ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                  background: isSelected ? '#3b82f6' : 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isSelected && <Check size={12} color="#fff" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>
        <Users size={12} />
        {selectedStudentIds.length === 0
          ? 'No students assigned (Task will be unassigned)'
          : `${selectedStudentIds.length} student${selectedStudentIds.length === 1 ? '' : 's'} assigned to task`}
      </div>
    </div>
  );
};
