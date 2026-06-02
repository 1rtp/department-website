import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertTriangle, Eye, EyeOff, Home } from 'lucide-react';
import { authApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';

const LOGIN_IMAGE = 'https://images.unsplash.com/photo-1701428588137-ca0be90f2a3c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.email || !form.password) {
      setError(t('login.fill_fields'));
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(form);
      localStorage.setItem('auth_token', res.data.token);
      localStorage.setItem('auth_user', JSON.stringify(res.data.user));
      const role = res.data.user?.role;
      if (role === 'student') navigate('/student');
      else if (role === 'staff') navigate('/staff-cabinet');
      else if (role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || t('login.wrong_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-background">

      {/* ───── LEFT PANEL ───── */}
      <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col px-6 sm:px-10 md:px-12 lg:px-16 py-8 relative z-10">

        {/* Top nav */}
        <div className="flex items-center justify-between mb-auto">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
              <Home className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">
              {t('nav.home')}
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="w-full max-w-[480px] mx-auto md:ml-auto md:-mr-16 lg:-mr-28 xl:-mr-36 my-auto bg-white dark:bg-card p-8 sm:p-10 rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-border flex flex-col gap-7 relative z-20">
          {/* Header */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1.5 leading-tight">
              {t('login.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 animate-in fade-in duration-200">
              <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground/60 ml-1 tracking-wide">
                {t('login.email_label')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  name="email"
                  type="email"
                  placeholder={t('login.email_placeholder')}
                  value={form.email}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border bg-white dark:bg-muted/30 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground/60 ml-1 tracking-wide">
                {t('login.password_label')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.password_placeholder')}
                  value={form.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-border bg-white dark:bg-muted/30 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold rounded-xl mt-1 bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  {t('nav.login')}
                </div>
              )}
            </Button>
          </form>

          {/* Footer link */}
          <p className="text-center text-sm text-muted-foreground">
            {t('login.no_account')}{' '}
            <Link to="/register" className="font-bold text-primary hover:text-primary/80 transition-colors">
              {t('login.register_link')}
            </Link>
          </p>
        </div>

        {/* Spacer for justify-between balance on desktop */}
        <div className="mt-auto pt-8 hidden md:block" />
      </div>

      {/* ───── RIGHT PANEL — image ───── */}
      <div className="hidden md:block w-[55%] lg:w-[60%] relative overflow-hidden z-0">
        <img
          src={LOGIN_IMAGE}
          alt="Login visual"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 mix-blend-multiply" />
      </div>

    </div>
  );
}