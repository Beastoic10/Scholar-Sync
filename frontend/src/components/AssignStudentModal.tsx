import React, { useState, useEffect, useRef } from 'react';
import { projectApi } from '../api';
import type { Project, User } from '../types';
import { X, UserPlus, Search, Check, Loader2, UserCheck, AlertCircle } from 'lucide-react';

interface AssignStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onStudentAssigned: (updatedProject: Project) => void;
}

export const AssignStudentModal: React.FC<AssignStudentModalProps> = ({
  isOpen,
  onClose,
  project,
  onStudentAssigned,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  // Fetch eligible students whenever modal opens or query changes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSuggestions([]);
      setSelectedStudent(null);
      setError(null);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    setError(null);

    // Debounce search by 200ms
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const results = await projectApi.getEligibleStudents(project.id, query);
        setSuggestions(results || []);
      } catch (err: any) {
        setError(err.message || 'Failed to search eligible students');
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen, query, project.id]);

  if (!isOpen) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setError('Please select a student from the search suggestions');
      return;
    }

    setAssigning(true);
    setError(null);

    try {
      const updated = await projectApi.addStudentToProject(project.id, selectedStudent.id);
      onStudentAssigned(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign student to project');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 font-['Outfit']">Assign Student Researcher</h3>
              <p className="text-xs text-slate-400">Search and enroll students in &ldquo;{project.title}&rdquo;</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAssign} className="mt-5 space-y-4">
          {/* Search Input with Live Suggestions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Search Student by Name or Email
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedStudent(null);
                }}
                placeholder="Type student name (e.g. Ada Lovelace)..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                autoFocus
              />
              {loading && (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin absolute right-3.5 top-3" />
              )}
            </div>
          </div>

          {/* Selected Student Confirmation Pill */}
          {selectedStudent && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 text-xs font-bold">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                    {selectedStudent.name}
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono">
                      ID: {selectedStudent.id}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{selectedStudent.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                <UserCheck className="w-4 h-4" />
                Selected
              </div>
            </div>
          )}

          {/* Suggestions Dropdown List */}
          <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950/60">
            {suggestions.length > 0 ? (
              suggestions.map((student) => {
                const isSelected = selectedStudent?.id === student.id;
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(student);
                      setError(null);
                    }}
                    className={`w-full text-left p-3 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/50 hover:bg-indigo-900/50'
                        : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-100 flex items-center gap-2">
                          <span>{student.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">#{student.id}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{student.email}</div>
                      </div>
                    </div>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 hover:text-indigo-400">
                        Select
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">
                {loading
                  ? 'Searching eligible students...'
                  : query
                  ? `No eligible students found matching "${query}"`
                  : 'No eligible students available to enroll.'}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 rounded-xl border border-slate-700/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assigning || !selectedStudent}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Assign to Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
