import React from 'react';
import type { User } from '../types';
import { GraduationCap, ExternalLink, LogOut, UserCircle } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight font-['Outfit'] text-slate-100">
                Scholar<span className="text-indigo-400">Sync</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                Academic SaaS
              </span>
            </div>
            <p className="text-xs text-slate-400">Research Kanban & Deliverables Platform</p>
          </div>
        </div>

        {/* User actions */}
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-xl">
              <UserCircle className="w-5 h-5 text-slate-400" />
              <div className="text-left">
                <div className="text-xs font-medium text-slate-200">{user.name}</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{user.email}</div>
              </div>
              <span
                className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border ${
                  user.role === 'SUPERVISOR'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-800/50'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50'
                }`}
              >
                {user.role}
              </span>
            </div>

            <a
              href="/swagger-ui.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg border border-slate-700/60 hover:border-indigo-500/40"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              OpenAPI
            </a>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-red-300 hover:bg-red-950/40 border border-slate-700/80 hover:border-red-800/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
