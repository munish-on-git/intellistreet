'use client';
import { useState } from 'react';
import type { User } from '@/features/auth/types';

interface AuthScreenProps {
  /** Called after a successful login or registration. */
  onAuthenticated: (token: string, user: User) => void;
}

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async (e?: any, demoEmail?: string, demoPassword?: string) => {
    if (e) e.preventDefault();
    setAuthError(null);

    const email = demoEmail || authEmail;
    const password = demoPassword || authPassword;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        setAuthEmail('');
        setAuthPassword('');
        onAuthenticated(data.access_token, data.user);
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setAuthError('Connection server error. Please try again.');
    }
  };

  const handleRegister = async (e: any) => {
    e.preventDefault();
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          phone: authPhone,
          password: authPassword,
          role: 'citizen'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAuthName('');
        setAuthEmail('');
        setAuthPhone('');
        setAuthPassword('');
        onAuthenticated(data.access_token, data.user);
      } else {
        setAuthError(data.error || 'Registration failed');
      }
    } catch {
      setAuthError('Network error registering account.');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 max-w-md w-full mx-auto space-y-6">
      <div className="bg-[#111827]/60 border border-gray-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold font-display text-gray-100">
            {isRegistering ? 'Register Citizen Node' : 'Initialize Command Link'}
          </h2>
          <p className="text-xs text-gray-400">
            {isRegistering ? 'Create a local citizen node to report & verify issues' : 'Log in to access live GIS telemetry and active feeds'}
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-xs text-red-400 text-center font-medium">
            {authError}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Full Name</label>
              <input
                type="text"
                required
                placeholder="E.g. Manish Pathania"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Email Address</label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {isRegistering && (
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Phone Contact</label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile number"
                value={authPhone}
                onChange={(e) => setAuthPhone(e.target.value)}
                className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Security Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full bg-slate-900 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-tr from-emerald-500 to-teal-400 hover:brightness-110 text-[#070a13] font-bold rounded-xl text-xs tracking-wider uppercase cursor-pointer transition-all shadow-lg shadow-emerald-500/5 mt-4"
          >
            {isRegistering ? 'Register Node' : 'Initialize Session'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-800/80">
          <button
            onClick={() => {
              setAuthError(null);
              setIsRegistering(!isRegistering);
            }}
            className="text-xs text-emerald-400 hover:underline cursor-pointer"
          >
            {isRegistering ? 'Already registered? Log in here' : 'Need an account? Register here'}
          </button>
        </div>
      </div>

      {/* Evaluate shortcuts panel (Zero friction demo logins!) */}
      <div className="bg-[#111827]/40 border border-gray-800 rounded-3xl p-5 w-full space-y-3.5 shadow-xl">
        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block text-center">Eval Quick Link Shortcuts</span>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => handleLogin(null, 'citizen@example.com', 'password123')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800/80 border border-gray-800 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-between px-4 cursor-pointer"
          >
            <span>Test as <strong>Citizen</strong></span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Demo Link</span>
          </button>
          <button
            onClick={() => handleLogin(null, 'officer@example.com', 'password123')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800/80 border border-gray-800 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-between px-4 cursor-pointer"
          >
            <span>Test as <strong>City Officer</strong></span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Demo Link</span>
          </button>
          <button
            onClick={() => handleLogin(null, 'admin@example.com', 'password123')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800/80 border border-gray-800 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-between px-4 cursor-pointer"
          >
            <span>Test as <strong>City Admin</strong></span>
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wide">Demo Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
