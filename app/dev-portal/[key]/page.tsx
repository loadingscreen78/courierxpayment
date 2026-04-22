"use client";

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeSlash, ShieldCheck, CircleNotch } from '@phosphor-icons/react';

export default function DevPortalGate() {
  const params = useParams();
  const router = useRouter();
  const portalKey = params.key as string;

  const [passphrase, setPassphrase] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/dev-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/auth'), 1000);
      } else {
        const data = await res.json();
        setError(data.error || 'Access denied');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
      <div className="max-w-sm w-full">
        {success ? (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-green-400" weight="duotone" />
            </div>
            <p className="text-green-400 font-mono text-sm">Access granted. Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Lock className="h-7 w-7 text-white/60" weight="duotone" />
              </div>
              <div>
                <h1 className="text-lg font-mono font-bold text-white/90">Dev Access</h1>
                <p className="text-xs text-white/30 font-mono mt-1">Authorized personnel only</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => { setPassphrase(e.target.value); setError(''); }}
                  placeholder="Enter passphrase"
                  autoFocus
                  className="w-full h-12 px-4 pr-12 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {show ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <p className="text-xs text-red-400 font-mono text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !passphrase}
                className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-mono text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <CircleNotch size={18} className="animate-spin" />
                ) : (
                  'Authenticate'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
