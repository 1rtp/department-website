import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ChevronDown, Mail, User, GraduationCap, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { authApi, groupsApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

const COURSES = [1, 2, 3, 4];

function CustomSelect({ value, onChange, options, placeholder, disabled, icon: Icon }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          w-full flex items-center gap-3 px-4 py-3.5
          rounded-xl border border-border
          bg-white dark:bg-muted/30
          text-sm transition-all
          focus:ring-4 focus:ring-primary/10 focus:border-primary
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/40'}
        `}
      >
        {Icon && <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        <span className={`flex-1 text-left truncate ${selected ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    email: '',
    full_name: '',
    role: 'student',
    course: '',
    group_id: '',
  });
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const registrationImage = 'https://images.unsplash.com/photo-1701428588137-ca0be90f2a3c?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  const ROLES = [
    { value: 'student', label: t('register.role_student') },
    { value: 'staff', label: t('register.role_staff') },
  ];

  useEffect(() => {
    if (form.role === 'student' && form.course) {
      groupsApi.getByCourse(form.course).then((res) => {
        setGroups(res.data.map((g) => ({ value: g.id, label: g.name })));
      });
    } else {
      setGroups([]);
    }
  }, [form.role, form.course]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.email || !form.full_name || !form.role) {
      setError(t('register.fill_required'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.register(form);
      setSuccess(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const getErrorMessage = (detail) => {
      if (detail === 'staff_not_found') return t('register.error_staff_not_found');
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail)) return detail.map(d => d.msg).join(', ');
      return t('register.error_generic');
    };
    setError(getErrorMessage(detail));
    } finally {
      setLoading(false);
    }
  };

  /* ─── Success screen ─── */
  return (
    <div className="min-h-screen flex font-sans bg-background">

      {/* ── Success modal ── */}
      {success && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-3 bg-muted/30">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <h2 className="font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {t('register.success_title')}
              </h2>
            </div>

            {/* Body */}
            <div className="p-6 text-center">
              <p className="text-[14px] text-foreground font-medium leading-relaxed">
                {t('register.success_text')}{' '}
                <span className="text-primary font-bold">{form.email}</span>.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 bg-muted/10 border-t border-border">
              <Button
                className="w-full rounded-xl font-bold"
                onClick={() => navigate('/login')}
              >
                {t('register.go_to_login')}
              </Button>
            </div>

          </div>
        </div>
      )}

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
        <div className="
          w-full max-w-[480px]
          mx-auto
          md:ml-auto md:-mr-16
          lg:-mr-28
          xl:-mr-36
          my-auto
          bg-white dark:bg-card
          p-8 sm:p-10
          rounded-3xl
          shadow-[0_16px_48px_rgba(0,0,0,0.12)]
          border border-slate-100 dark:border-border
          flex flex-col gap-6
          relative z-20
        ">
          {/* Header */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1.5 leading-tight">
              {t('register.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('register.subtitle')}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground/60 ml-1 tracking-wide">
                {t('register.role_label')}
              </label>
              <CustomSelect
                icon={Users}
                value={form.role}
                onChange={(v) => setForm({ ...form, role: v, course: '', group_id: '' })}
                options={ROLES}
                placeholder={t('register.role_placeholder')}
              />
            </div>

            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground/60 ml-1 tracking-wide">
                {t('register.name_label')}
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder={t('register.name_placeholder')}
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="
                    w-full pl-11 pr-4 py-3.5
                    rounded-xl border border-border
                    bg-white dark:bg-muted/20
                    focus:ring-4 focus:ring-primary/10 focus:border-primary
                    outline-none transition-all text-sm
                  "
                />
              </div>
            </div>

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
                  type="email"
                  placeholder={t('login.email_placeholder')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="
                    w-full pl-11 pr-4 py-3.5
                    rounded-xl border border-border
                    bg-white dark:bg-muted/20
                    focus:ring-4 focus:ring-primary/10 focus:border-primary
                    outline-none transition-all text-sm
                  "
                />
              </div>
            </div>

            {/* Course + Group (students only) */}
            {form.role === 'student' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground/60 ml-1 tracking-wide">
                    {t('register.course_label')}
                  </label>
                  <CustomSelect
                    icon={GraduationCap}
                    value={form.course}
                    onChange={(v) => setForm({ ...form, course: v, group_id: '' })}
                    options={COURSES.map((c) => ({ value: c, label: `${c} ${t('register.course_suffix')}` }))}
                    placeholder={t('register.course_placeholder')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground/60 ml-1 tracking-wide">
                    {t('register.group_label')}
                  </label>
                  <CustomSelect
                    icon={Users}
                    value={form.group_id}
                    onChange={(v) => setForm({ ...form, group_id: v })}
                    options={groups}
                    placeholder={t('register.group_label')}
                    disabled={!form.course}
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 text-sm font-bold rounded-xl mt-1 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                t('register.submit')
              )}
            </Button>
          </form>

          {/* Footer link */}
          <p className="text-center text-sm text-muted-foreground">
            {t('register.have_account')}{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              {t('nav.login')}
            </Link>
          </p>
        </div>

        {/* Spacer */}
        <div className="mt-auto pt-8 hidden md:block" />
      </div>

      {/* ───── RIGHT PANEL — image ───── */}
      <div className="hidden md:block w-[55%] lg:w-[60%] relative overflow-hidden z-0">
        <img
          src={registrationImage}
          alt="bg"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />
      </div>
    </div>
  );
}