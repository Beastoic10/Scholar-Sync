import React from 'react';
import type { User } from '../types';
import { GraduationCap, ExternalLink, LogOut, UserCircle } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="sticky top-0 z-40" style={{
      background: 'rgba(10, 15, 30, 0.7)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.3))',
            border: '1px solid rgba(59,130,246,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59,130,246,0.25)',
          }}>
            <GraduationCap size={18} style={{ color: '#93c5fd' }} />
          </div>
          <div>
            <div className="font-display font-bold text-[1.05rem] tracking-tight leading-none" style={{ color: '#f0f6ff' }}>
              Scholar<span style={{ color: '#60a5fa' }}>Sync</span>
            </div>
            <div className="text-[10px] font-medium tracking-[0.08em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Research Platform
            </div>
          </div>
        </div>

        {/* User actions */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* User pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '5px 10px',
            }}>
              <UserCircle size={16} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
              <div>
                <div className="text-xs font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.85)' }}>{user.name}</div>
                <div className="text-[10px] leading-none mt-0.5 truncate max-w-[130px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{user.email}</div>
              </div>
              <span className={`badge ${user.role === 'SUPERVISOR' ? 'badge-supervisor' : 'badge-student'} ml-1`}>
                {user.role}
              </span>
            </div>

            <a
              href="/swagger-ui.html"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost hidden sm:inline-flex text-xs"
              style={{ padding: '5px 10px' }}
            >
              <ExternalLink size={13} />
              API
            </a>

            <button onClick={onLogout} className="btn-ghost text-xs" style={{ padding: '5px 10px', color: 'rgba(255,100,100,0.8)' }}>
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
