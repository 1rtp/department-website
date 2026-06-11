import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Settings, Clock, MapPin, BookOpen, Users, Camera,
  Bell, Phone, Mail, GraduationCap, BookMarked, Check,
  Eye, EyeOff, X, ArrowRight, ChevronRight, ImageIcon, Calendar
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { studentApi } from '../utils/api';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useModals, ModalAlert, ModalConfirm } from '../utils/useModals';
import { useLanguage } from '../contexts/LanguageContext';
import { PhoneInput } from '../components/PhoneInput';

// ─── helpers ──────────────────────────────────────────────────────────────────

const DAY_KEYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const todayKey = () => DAY_KEYS[new Date().getDay()];
const formatToday = () => {
  const d = new Date();
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
};

// ─── Modal backdrop ────────────────────────────────────────────────────────────

const Modal = ({ onClose, children, closeOnBackdrop = false }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    onClick={closeOnBackdrop ? onClose : undefined}
  >
    <div
      className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl"
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

// ─── Modal: Settings ──────────────────────────────────────────────────────────

const ModalSettings = ({ onClose, onContacts, onPassword }) => {
  const { t } = useLanguage();
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('dashboard.settings')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-3 bg-card">
          <button
            onClick={onContacts}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-[14px] font-bold text-foreground">{t('dashboard.contacts')}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{t('dashboard.contacts_subtitle')}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={onPassword}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="text-[14px] font-bold text-foreground">{t('dashboard.security')}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{t('dashboard.security_subtitle')}</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/10 border-t border-border">
          <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
            {t('dashboard.account_management')}
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Modal: Edit Contacts ─────────────────────────────────────────────────────

const ModalContacts = ({ onClose, user, onSave }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState(user?.contact_email || user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await studentApi.updateContacts({ email, phone: phone ?? null })
      const updatedUser = res.data;
      onSave(updatedUser);

      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      setError(e?.response?.data?.detail || t('admin.save_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('dashboard.contacts')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8 animate-in zoom-in-50 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-[15px] font-bold text-foreground">{t('dashboard.saved_success')}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1">{t('dashboard.updating_profile')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] text-red-500 font-medium">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  {t('contacts.email')}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('dashboard.email_placeholder')}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
                  {t('dashboard.phone_label')}
                </label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  placeholder={t('dashboard.phone_placeholder')}
                />
              </div>
              <div className="pt-2">
                <Button
                  className="w-full h-11 rounded-xl font-bold text-[13px] transition-all active:scale-[0.98]"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('dashboard.saving')}
                    </div>
                  ) : t('dashboard.save_changes')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/10 border-t border-border flex justify-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t('dashboard.personal_data')}</p>
        </div>
      </div>
    </div>
  );
};

const PasswordField = ({ label, fieldKey, value, onChange, show, onToggleShow, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full px-4 py-2.5 pr-11 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

// ─── Modal: Edit Password ─────────────────────────────────────────────────────

const ModalPassword = ({ onClose }) => {
  const { t } = useLanguage();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setError('');
    if (!current) { setError(t('dashboard.enter_current_password')); return; }
    if (next.length < 6) { setError(t('dashboard.password_min_length')); return; }
    if (next !== confirm) { setError(t('dashboard.passwords_dont_match')); return; }
    setLoading(true);
    try {
      await studentApi.changePassword({ current_password: current, new_password: next });
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      setError(e?.response?.data?.detail || t('dashboard.password_change_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('dashboard.security')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8 animate-in zoom-in-50 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-[15px] font-bold text-foreground">{t('dashboard.password_updated')}</p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest mt-1">{t('dashboard.use_new_password')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[12px] text-red-500 font-medium">
                  {error}
                </div>
              )}
              <PasswordField
                label={t('dashboard.current_password')}
                fieldKey="current"
                value={current}
                onChange={e => { setCurrent(e.target.value); setError(''); }}
                show={showCurrent}
                onToggleShow={() => setShowCurrent(v => !v)}
                placeholder={t('dashboard.enter_current_password_ph')}
              />
              <div className="h-px bg-border my-2" />
              <PasswordField
                label={t('dashboard.new_password')}
                fieldKey="next"
                value={next}
                onChange={e => { setNext(e.target.value); setError(''); }}
                show={showNext}
                onToggleShow={() => setShowNext(v => !v)}
                placeholder={t('dashboard.enter_new_password_ph')}
              />
              <PasswordField
                label={t('dashboard.confirm_password')}
                fieldKey="confirm"
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                show={showConfirm}
                onToggleShow={() => setShowConfirm(v => !v)}
                placeholder={t('dashboard.repeat_new_password_ph')}
              />
              <div className="pt-2">
                <Button
                  className="w-full h-11 rounded-xl font-bold text-[13px] transition-all active:scale-[0.98]"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('dashboard.saving')}
                    </div>
                  ) : t('dashboard.update_password')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/10 border-t border-border flex justify-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t('dashboard.use_strong_password')}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Sidebar (student info) ────────────────────────────────────────────────────

const Sidebar = ({ user, onSettings, onPhotoUpdate }) => {
  const { t } = useLanguage();
  const photoInputRef = React.useRef();
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      const MAX = 600;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', 0.92);
      URL.revokeObjectURL(objectUrl);
      try {
        await studentApi.updatePhoto({ photo_data: compressed });
        onPhotoUpdate(compressed);
      } catch (err) {
        console.error('Помилка збереження фото', err);
      }
    };
    img.src = objectUrl;
  };

  return (
    <div className="w-full lg:w-[260px] flex-shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-fit">
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div
            className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/15 ring-offset-2 overflow-hidden cursor-pointer group"
            onClick={() => photoInputRef.current?.click()}
            title={t('dashboard.change_photo')}
          >
            {user?.photo_url
              ? <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
              : <User className="w-10 h-10 text-primary/50" />
            }
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="text-center">
            <div className="font-bold text-foreground text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{user?.name || t('dashboard.name_placeholder')}</div>
            <div className="text-xs text-muted-foreground">{user?.group_name || t('dashboard.group_placeholder')}</div>
          </div>
        </div>
        <button onClick={onSettings} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="border-t border-border" />

      {/* Info cards */}
      <div className="space-y-2">
        {[
          { icon: <GraduationCap className="w-4 h-4 text-primary" />, label: t('dashboard.course'), value: user?.course ? `${user.course} ${t('register.course_suffix')}` : '—' },
          { icon: <BookMarked className="w-4 h-4 text-primary" />, label: t('dashboard.semester'), value: user?.semester ? `${user.semester} ${t('dashboard.semester_suffix')}` : '—' },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
            <div className="flex-shrink-0">{icon}</div>
            <div>
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-sm font-medium text-foreground leading-tight">{value}</div>
            </div>
          </div>
        ))}

        {/* Curator — special card with link/email */}
        <div className="flex items-start gap-3 bg-muted/50 rounded-xl px-3 py-2.5">
          <div className="flex-shrink-0">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">{t('dashboard.curator')}</div>
            
            {user?.curator_name ? (
              <div className="flex flex-col">
                {user?.curator_staff_id ? (
                  <Link
                    to={`/staff/${user.curator_staff_id}`}
                    className="text-sm font-medium text-primary hover:underline leading-tight"
                  >
                    {user.curator_name}
                  </Link>
                ) : (
                  <div className="text-sm font-medium text-foreground leading-tight">
                    {user.curator_name}
                  </div>
                )}

                {/* Контакти: Пошта та Телефон */}
                <div className="flex flex-col gap-1.5 mt-2">
                  {user?.curator_email && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('contacts.email')}
                      </span>
                      <a
                        href={`mailto:${user.curator_email}`}
                        className="text-xs text-primary hover:underline break-all"
                      >
                        {user.curator_email}
                      </a>
                    </div>
                  )}
                  {user?.curator_phone && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('contacts.phone')}
                      </span>
                      <a
                        href={`tel:${user.curator_phone}`}
                        className="text-xs text-foreground hover:text-primary hover:underline"
                      >
                        {user.curator_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-foreground leading-tight">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tab nav ───────────────────────────────────────────────────────────────────

const TabNav = ({ active, onChange, user }) => {
  const { t } = useLanguage();

  const TABS = [
    { key: 'home', label: t('dashboard.tab_home') },
    { key: 'consultations', label: t('dashboard.tab_consultations') },
    { key: 'schedule', label: t('dashboard.tab_schedule') },
    ...(Number(user?.course) < 4 ? [{ key: 'electives', label: t('dashboard.tab_electives') }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-1 mb-6">
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            active === tab.key
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ─── Consultation slot ─────────────────────────────────────────────────────────

const ConsultationSlot = ({ slot }) => (
  <div className="border border-border rounded-xl p-4 bg-background">
    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1 mb-2">
      <Clock className="w-3 h-3" />{slot.time}
    </div>
    <div className="font-semibold text-foreground text-sm mb-1">{slot.subject}</div>
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      {slot.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {slot.room}</span>}
      {slot.teacher && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {slot.teacher}</span>}
    </div>
  </div>
);

// ─── TAB: Home ─────────────────────────────────────────────────────────────────

const TabHome = ({ user, schedule, announcements }) => {
  const { t } = useLanguage();
  const today = todayKey();
  const todaySlots = schedule?.[today] || [];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {t('dashboard.greeting')} {user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || t('dashboard.student_fallback')}!
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">{t('dashboard.home_subtitle')} {formatToday()}</p>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Today schedule */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('dashboard.tab_consultations_today')}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">{t(`days.${todayKey()}`)}, {formatToday()}</p>
          {todaySlots.length > 0
            ? <div className="space-y-3">{todaySlots.map((slot, i) => <ConsultationSlot key={i} slot={slot} />)}</div>
            : <div className="text-center py-8 text-muted-foreground text-sm">{t('dashboard.no_consultations_today')}</div>
          }
        </div>

        {/* Announcements */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('dashboard.announcements')}</h2>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-72">
            {(announcements || []).map((a, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-3">
                <div className="font-semibold text-foreground text-sm">{a.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.date}</div>
                {a.text && <div className="text-xs text-muted-foreground mt-1">{a.text}</div>}
              </div>
            ))}
            {(!announcements || announcements.length === 0) && (
              <div className="text-center py-4 text-muted-foreground text-sm">{t('dashboard.no_announcements')}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── TAB: Consultations ────────────────────────────────────────────────────────

const TabConsultations = ({ user, schedule }) => {
  const { t } = useLanguage();

  const WEEK_DAYS = [
    { key: 'monday',    label: t('days.monday') },
    { key: 'tuesday',   label: t('days.tuesday') },
    { key: 'wednesday', label: t('days.wednesday') },
    { key: 'thursday',  label: t('days.thursday') },
    { key: 'friday',    label: t('days.friday') },
  ];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {t('dashboard.greeting')} {user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || t('dashboard.student_fallback')}!
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">{t('dashboard.consultations_subtitle')}</p>
      <h2 className="font-bold text-foreground mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('dashboard.tab_consultations')}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {WEEK_DAYS.map(day => {
          const slots = schedule?.[day.key] || [];
          return (
            <div key={day.key} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {day.label}
                </span>
              </div>
              {slots.length > 0
                ? <div className="space-y-3 divide-y divide-border">
                    {slots.map((slot, i) => (
                      <div key={i} className={`${i > 0 ? 'pt-3' : ''}`}>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                          <Clock className="w-3 h-3" />{slot.time}
                        </div>
                        <div className="font-semibold text-foreground text-sm">{slot.subject}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {slot.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{slot.room}</span>}
                          {slot.teacher && <span className="flex items-center gap-1"><User className="w-3 h-3" />{slot.teacher}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                : <div className="text-center py-4 text-xs text-muted-foreground">{t('dashboard.no_classes')}</div>
              }
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── TAB: Education Schedule ──────────────────────────────────────────────────

const TabSchedule = ({ user, examSchedule = [] }) => {
  const { t, language } = useLanguage();
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    studentApi.getEducationSchedule()
      .then(r => setScheduleData(r.data || null))
      .catch(() => setScheduleData(null))
      .finally(() => setLoading(false));
  }, [language]);

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {t('dashboard.greeting')} {user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || t('dashboard.student_fallback')}!
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">{t('dashboard.schedule_subtitle')}</p>

      {/* Schedule viewer */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
          <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted text-lg leading-none">+</button>
          <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="w-7 h-7 rounded border border-border flex items-center justify-center text-muted-foreground hover:bg-muted text-lg leading-none">−</button>
          <span className="text-xs text-muted-foreground ml-1">{zoom}%</span>
          <div className="flex-1" />
          {scheduleData?.file_data && (
            <button onClick={() => setFullscreen(v => !v)} className="text-muted-foreground hover:text-foreground p-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          )}
        </div>
        <div className="min-h-[320px] flex flex-col items-center justify-center overflow-auto p-4">
          {loading ? (
            <div className="text-muted-foreground text-sm">{t('common.loading')}</div>
          ) : scheduleData?.file_data ? (
            <img
              src={scheduleData.file_data}
              alt={t('dashboard.tab_schedule')}
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', maxWidth: '100%' }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="w-14 h-14 opacity-20" />
              <p className="text-sm">{t('dashboard.schedule_pending')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen */}
      {fullscreen && scheduleData?.file_data && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFullscreen(false)}>
          <img src={scheduleData.file_data} alt="Графік" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}

      {/* Important dates */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {t('dashboard.important_dates')}
          </h2>
        </div>
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {examSchedule.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground text-center">
              {t('dashboard.no_exams')}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('dashboard.exam_subject')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('dashboard.exam_consultation')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('dashboard.exam_date')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('dashboard.exam_teacher')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {examSchedule.map((exam, i) => (
                  <tr key={exam.id || i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{exam.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{exam.consultation_date}</div>
                      <div className="text-xs text-muted-foreground/70">{exam.consultation_time || '14:00'}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{exam.exam_date}</div>
                      <div className="text-xs text-muted-foreground/70">{exam.exam_time || '09:00'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {exam.staff_id ? (
                        <a
                          href={`/staff/${exam.staff_id}`}
                          className="text-primary hover:underline underline-offset-4 text-sm font-medium"
                        >
                          {exam.staff_name || '—'}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{exam.staff_name || '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── TAB: Electives ───────────────────────────────────────────────────────────

const getElectiveBlocksByCourse = (t, course) => {
  const c = Number(course);
  if (c === 1) return [
    { id: 'b1', title: t('electives.c1_block1_title'), disciplines: [
      { id: 'c1_b1_d1', name: t('electives.c1_b1_d1_name'), teacher: t('electives.c1_b1_d1_teacher'), description: t('electives.c1_b1_d1_desc') },
      { id: 'c1_b1_d2', name: t('electives.c1_b1_d2_name'), teacher: t('electives.c1_b1_d2_teacher'), description: t('electives.c1_b1_d2_desc') },
    ]},
    { id: 'b2', title: t('electives.c1_block2_title'), disciplines: [
      { id: 'c1_b2_d1', name: t('electives.c1_b2_d1_name'), teacher: t('electives.c1_b2_d1_teacher'), description: t('electives.c1_b2_d1_desc') },
      { id: 'c1_b2_d2', name: t('electives.c1_b2_d2_name'), teacher: t('electives.c1_b2_d2_teacher'), description: t('electives.c1_b2_d2_desc') },
    ]},
  ];
  
  if (c === 2) return [
    { id: 'b1', title: t('electives.c2_block1_title'), disciplines: [
      { id: 'c2_b1_d1', name: t('electives.c2_b1_d1_name'), teacher: t('electives.c2_b1_d1_teacher'), description: t('electives.c2_b1_d1_desc') },
      { id: 'c2_b1_d2', name: t('electives.c2_b1_d2_name'), teacher: t('electives.c2_b1_d2_teacher'), description: t('electives.c2_b1_d2_desc') },
    ]},
    { id: 'b2', title: t('electives.c2_block2_title'), disciplines: [
      { id: 'c2_b2_d1', name: t('electives.c2_b2_d1_name'), teacher: t('electives.c2_b2_d1_teacher'), description: t('electives.c2_b2_d1_desc') },
      { id: 'c2_b2_d2', name: t('electives.c2_b2_d2_name'), teacher: t('electives.c2_b2_d2_teacher'), description: t('electives.c2_b2_d2_desc') },
    ]},
  ];
  
  return [
    { id: 'b1', title: t('electives.c3_block1_title'), disciplines: [
      { id: 'c3_b1_d1', name: t('electives.c3_b1_d1_name'), teacher: t('electives.c3_b1_d1_teacher'), description: t('electives.c3_b1_d1_desc') },
      { id: 'c3_b1_d2', name: t('electives.c3_b1_d2_name'), teacher: t('electives.c3_b1_d2_teacher'), description: t('electives.c3_b1_d2_desc') },
    ]},
    { id: 'b2', title: t('electives.c3_block2_title'), disciplines: [
      { id: 'c3_b2_d1', name: t('electives.c3_b2_d1_name'), teacher: t('electives.c3_b2_d1_teacher'), description: t('electives.c3_b2_d1_desc') },
      { id: 'c3_b2_d2', name: t('electives.c3_b2_d2_name'), teacher: t('electives.c3_b2_d2_teacher'), description: t('electives.c3_b2_d2_desc') },
    ]},
  ];
};

const TabElectives = ({ user, selected, setSelected, submitted, setSubmitted }) => {
  const { t, language } = useLanguage();
  const { alert, alertState, closeAlert } = useModals();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const ELECTIVE_BLOCKS = getElectiveBlocksByCourse(t, user?.course);

  useEffect(() => {
    if (submitted && Object.keys(selected).length > 0) {
      setLoading(false);
      return;
    }
    studentApi.getElectives()
      .then(r => {
        const existing = r.data?.selected_disciplines || [];
        if (r.data?.submitted_at) setSubmitted(true);
          if (existing.length > 0) {
            const restored = {};
            ELECTIVE_BLOCKS.forEach(block => {
            const match = block.disciplines.find(d =>
              existing.includes(d.id) || existing.some(e =>
                typeof e === 'string' && e.trim().toLowerCase() === d.name.trim().toLowerCase()
              )
            );
            if (match) restored[block.id] = match.id;
          });
          setSelected(restored);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filledCount = Object.values(selected).filter(Boolean).length;
  const totalBlocks = ELECTIVE_BLOCKS.length;

  const handleSelect = (blockId, disciplineId) => {
    if (submitted) return;
    setSelected(prev => ({ ...prev, [blockId]: prev[blockId] === disciplineId ? null : disciplineId }));
  };

  const handleSubmit = async () => {
    const selectedNames = Object.entries(selected)
      .filter(([, discId]) => discId)
      .map(([blockId, discId]) => {
        const block = ELECTIVE_BLOCKS.find(b => b.id === blockId);
        const disc = block?.disciplines.find(d => d.id === discId);
        return disc?.name;
      })
      .filter(Boolean);
    setSaving(true);
    try {
      await studentApi.submitElectives({ selected_disciplines: selectedNames });
      setSubmitted(true);
    } catch (e) {
      alert(`${t('dashboard.electives_save_error')}: ${e?.response?.data?.detail || e.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground text-sm">{t('common.loading')}</div>;

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {t('dashboard.greeting')} {user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || t('dashboard.student_fallback')}!
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">
        {t('dashboard.electives_subtitle_prefix')} {user?.course ? Number(user.course) + 1 : '—'} {t('register.course_suffix')}
      </p>

      {submitted ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/30">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('dashboard.electives_submitted')}</h2>
              <p className="text-xs text-muted-foreground">{t('dashboard.electives_saved')}</p>
            </div>
          </div>
          {/* Selected disciplines */}
          <div className="divide-y divide-border">
            {ELECTIVE_BLOCKS.map(block => {
              const discId = selected[block.id];
              const disc = block.disciplines.find(d => d.id === discId);
              return disc ? (
                <div key={block.id} className="px-6 py-4 gap-4">
                  <p className="text-xs text-muted-foreground mb-1">{block.title}</p>
                  <p className="text-sm font-bold text-foreground mb-1">{disc.name}</p>
                  {disc.teacher && (
                    <p className="text-xs text-muted-foreground mb-1">{disc.teacher}</p>
                  )}
                  {disc.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{disc.description}</p>
                  )}
                </div>
              ) : null;
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">{t('dashboard.blocks_filled')} {filledCount} {t('dashboard.of')} {totalBlocks}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${(filledCount / totalBlocks) * 100}%` }} />
            </div>
          </div>

          {/* Blocks */}
          <div className="space-y-8">
            {ELECTIVE_BLOCKS.map(block => (
              <div key={block.id}>
                <h2 className="font-bold text-foreground mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {block.title} <span className="font-normal text-muted-foreground text-sm">{t('dashboard.choose_one')}</span>
                </h2>
                <div className="space-y-3">
                  {block.disciplines.map(d => {
                    const isSelected = selected[block.id] === d.id;
                    return (
                      <div key={d.id} className={`bg-card border rounded-2xl p-4 transition-colors ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-semibold text-foreground text-sm mb-1">{d.name}</div>
                            <div className="text-xs text-muted-foreground mb-2">{d.teacher}</div>
                            <div className="text-xs text-muted-foreground leading-relaxed">{d.description}</div>
                          </div>
                          <Button
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="flex-shrink-0 rounded-lg min-w-[80px]"
                            onClick={() => handleSelect(block.id, d.id)}
                          >
                            {isSelected ? t('dashboard.selected') : t('dashboard.select')}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="mt-8 flex justify-center">
            <Button
              className="rounded-xl px-8"
              disabled={filledCount < totalBlocks || saving}
              onClick={handleSubmit}
            >
              {saving ? t('dashboard.saving') : t('dashboard.confirm_selection')}
            </Button>
          </div>
        </>
      )}
      <ModalAlert message={alertState.message} type={alertState.type} onClose={closeAlert} />
    </div>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [user, setUser] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [examSchedule, setExamSchedule] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [modal, setModal] = useState(null);
  const [electivesSelected, setElectivesSelected] = useState({});
  const [electivesSubmitted, setElectivesSubmitted] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(`electives_selected_${user.id}`, JSON.stringify(electivesSelected));
  }, [electivesSelected, user?.id]);
  useEffect(() => {
    if (!user?.id) return;
    localStorage.setItem(`electives_submitted_${user.id}`, String(electivesSubmitted));
  }, [electivesSubmitted, user?.id]);

  useEffect(() => {
    const stored = localStorage.getItem('auth_user');
    const token = localStorage.getItem('auth_token');
    if (!stored || !token) { navigate('/login'); return; }

    studentApi.getMe()
      .then(r => {
        const freshUser = r.data;
        setUser(freshUser);
        localStorage.setItem('auth_user', JSON.stringify(freshUser));

        const savedSelected = localStorage.getItem(`electives_selected_${freshUser.id}`);
        const savedSubmitted = localStorage.getItem(`electives_submitted_${freshUser.id}`);
        if (savedSelected) setElectivesSelected(JSON.parse(savedSelected));
        if (savedSubmitted) setElectivesSubmitted(savedSubmitted === 'true');

        return Promise.all([
          freshUser.group_id ? studentApi.getSchedule(freshUser.group_id).catch(() => null) : Promise.resolve(null),
          studentApi.getAnnouncements(freshUser.group_id, freshUser.id).catch(() => null),
          studentApi.getExamSchedule().catch(() => ({ data: { exams: [] } })),
        ]);
      })
      .then(([scheduleRes, announcementsRes, examScheduleRes]) => {
        if (scheduleRes) setSchedule(scheduleRes.data || null);
        if (announcementsRes) setAnnouncements(announcementsRes.data || []);
        if (examScheduleRes) setExamSchedule(examScheduleRes.data?.exams || []);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate, language]);

  const handleSaveContacts = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <Sidebar
              user={user}
              onSettings={() => setModal('settings')}
              onPhotoUpdate={(url) => setUser(prev => ({ ...prev, photo_url: url }))}
            />

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <TabNav active={activeTab} onChange={setActiveTab} user={user} />

              {activeTab === 'home'          && <TabHome user={user} schedule={schedule} announcements={announcements} />}
              {activeTab === 'consultations' && <TabConsultations user={user} schedule={schedule} />}
              {activeTab === 'schedule'      && <TabSchedule user={user} examSchedule={examSchedule} />}
              <div className={activeTab === 'electives' ? '' : 'hidden'}>
                <TabElectives
                  user={user}
                  selected={electivesSelected}
                  setSelected={setElectivesSelected}
                  submitted={electivesSubmitted}
                  setSubmitted={setElectivesSubmitted}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <AppFooter />

      {/* Modals */}
      {modal === 'settings' && (
        <ModalSettings
          onClose={() => setModal(null)}
          onContacts={() => setModal('contacts')}
          onPassword={() => setModal('password')}
        />
      )}
      {modal === 'contacts' && (
        <ModalContacts
          onClose={() => setModal(null)}
          user={user}
          onSave={handleSaveContacts}
        />
      )}
      {modal === 'password' && (
        <ModalPassword onClose={() => setModal(null)} />
      )}
    </div>
  );
}