import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';
import { Logo } from '../components/ui';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'amankakkar70686@gmail.com', password: 'aman1234' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full h-10 rounded-lg border border-line bg-card px-3 outline-none focus:border-brand';
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-card border border-line rounded-xl p-8 space-y-4">
        <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight"><Logo /> Zentriq</div>
        <p className="text-sm text-ink2">{mode === 'login' ? 'Sign in to your workspace.' : 'Create your account.'}</p>
        {mode === 'register' && <input className={input} placeholder="Full name" value={form.name} onChange={set('name')} required />}
        <input className={input} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input className={input} type="password" placeholder="Password" value={form.password} onChange={set('password')} required minLength={6} />
        {error && <p className="text-sm text-amber">{error}</p>}
        <button disabled={busy} className="w-full h-10 rounded-lg bg-brand hover:bg-brandh text-white font-medium disabled:opacity-60">
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="text-sm text-brand underline underline-offset-4">
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
