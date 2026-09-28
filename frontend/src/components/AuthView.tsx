import React, { useState } from 'react';
import { authApi, setToken } from '../api';
import type { User, Role } from '../types';
import { LogIn, UserPlus, Sparkles, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setToken(data.token);
      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await authApi.register({ name, email, password, role });
      setSuccessMsg('Account created successfully! Please sign in.');
      setTab('login');
      setName('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 60px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative',
    }}>
      {/* Decorative glow blobs */}
      <div style={{
        position: 'absolute', top: '20%', left: '15%', width: 320, height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '15%', width: 280, height: 280,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />

      <div className="animate-fade-up" style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Card */}
        <div className="glass-strong" style={{ padding: '2rem 2rem 2rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))',
              border: '1px solid rgba(59,130,246,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 0 30px rgba(59,130,246,0.2)',
            }}>
              <Sparkles size={22} style={{ color: '#93c5fd' }} />
            </div>
            <h1 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f0f6ff', marginBottom: '0.35rem' }}>
              {tab === 'login' ? 'Welcome back' : 'Join ScholarSync'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
              {tab === 'login'
                ? 'Sign in to your academic research workspace'
                : 'Create a supervisor or student researcher account'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex', gap: 4, padding: 4,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, marginBottom: '1.5rem',
          }}>
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); }}
                style={{
                  flex: 1, padding: '0.45rem', borderRadius: 9,
                  fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  transition: 'all 0.2s ease',
                  border: '1px solid transparent',
                  ...(tab === t
                    ? { background: 'linear-gradient(135deg, rgba(59,130,246,0.5), rgba(99,102,241,0.5))', color: '#fff', borderColor: 'rgba(59,130,246,0.4)', boxShadow: '0 2px 12px rgba(59,130,246,0.3)' }
                    : { background: 'transparent', color: 'rgba(255,255,255,0.4)' })
                }}
              >
                {t === 'login' ? <LogIn size={13} /> : <UserPlus size={13} />}
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {/* Alerts */}
          {error && (
            <div style={{
              marginBottom: '1rem', padding: '0.625rem 0.875rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.8rem', color: '#fca5a5',
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
          {successMsg && (
            <div style={{
              marginBottom: '1rem', padding: '0.625rem 0.875rem',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.8rem', color: '#6ee7b7',
            }}>
              <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
              {successMsg}
            </div>
          )}

          {/* Forms */}
          {tab === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <FieldGroup label="Email Address">
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supervisor@university.edu"
                  className="glass-input"
                />
              </FieldGroup>
              <FieldGroup label="Password">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="glass-input"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 2,
                  }}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </FieldGroup>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <FieldGroup label="Full Name">
                <input
                  type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Alan Turing"
                  className="glass-input"
                />
              </FieldGroup>
              <FieldGroup label="Email Address">
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="turing@university.edu"
                  className="glass-input"
                />
              </FieldGroup>
              <FieldGroup label="Password">
                <input
                  type="password" required minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="glass-input"
                />
              </FieldGroup>
              <FieldGroup label="Academic Role">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="glass-input"
                  style={{ cursor: 'pointer', appearance: 'none' }}
                >
                  <option value="STUDENT" style={{ background: '#0d1733' }}>Student Researcher</option>
                  <option value="SUPERVISOR" style={{ background: '#0d1733' }}>Faculty Supervisor</option>
                </select>
              </FieldGroup>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
          ScholarSync — Academic Research & Deliverables Platform
        </p>
      </div>
    </div>
  );
};

const FieldGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: '0.4rem', letterSpacing: '0.04em' }}>
      {label}
    </label>
    {children}
  </div>
);
