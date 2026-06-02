import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Settings, Bell, Phone, Mail, GraduationCap, Camera,
  BookOpen, FlaskConical, Layers, Eye, EyeOff, X, ChevronRight,
  Search, Upload, Download, Trash2, Pencil, Check, FileText,
  ChevronLeft, ChevronRight as ChevronRightIcon, CloudUpload
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { staffProfileApi } from '../utils/api';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { useModals, ModalAlert, ModalConfirm, ModalConfirmStatus } from '../utils/useModals';
import { useLanguage } from '../contexts/LanguageContext';
import { PhoneInput } from '../components/PhoneInput';

// ─── helpers ──────────────────────────────────────────────────────────────────

const formatFileSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

const stripExt = (name) => name?.replace(/\.[^/.]+$/, '') || name;

const PUB_TYPE_NORMALIZE = {
  'Стаття': 'article', 'Теза доповіді': 'thesis', 'Монографія': 'monograph',
  'Підручник': 'textbook', 'Навчальний посібник': 'manual', 'Патент': 'patent',
  'Article': 'article', 'Conference Abstract': 'thesis', 'Monograph': 'monograph',
  'Textbook': 'textbook', 'Study Guide': 'manual', 'Patent': 'patent',
};
const normalizePubType = (raw) => {
  if (!raw) return 'article';
  const valid = ['article', 'thesis', 'monograph', 'textbook', 'manual', 'patent'];
  if (valid.includes(raw)) return raw;
  return PUB_TYPE_NORMALIZE[raw] || 'article';
};

// ─── Modal backdrop ────────────────────────────────────────────────────────────

const Modal = ({ onClose, children, maxW = 'max-w-md', closeOnBackdrop = false }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    onClick={closeOnBackdrop ? onClose : undefined}
  >
    <div className={`w-full ${maxW} bg-card border border-border rounded-2xl shadow-xl`} onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

// ─── Custom Select ─────────────────────────────────────────────────────────────

const Select = ({ value, onChange, options, placeholder, className = '', dropUp = false }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 hover:border-primary/40"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 z-20 bg-card border border-border rounded-xl shadow-lg overflow-hidden`}>
            {options.map(opt => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-muted ${value === opt.value ? 'text-primary font-medium bg-primary/5' : 'text-foreground'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

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
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
          >
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

const ModalContacts = ({ onClose, user, onSave }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState(user?.contact_email || user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await staffProfileApi.updateContacts({ email, phone: phone ?? null });
      onSave(res.data);
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
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
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
          >
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

// PasswordField — MUST be outside ModalPassword to avoid remounting on every keystroke
const PasswordField = ({ label, value, onChange, show, onToggle, placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">
      {label}
    </label>
    <div className="relative group">
      <input 
        type={show ? 'text' : 'password'} 
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="new-password"
        className="w-full px-4 pr-11 py-3 rounded-xl border border-border bg-background text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" 
      />
      <button 
        type="button" 
        onClick={onToggle}
        tabIndex={-1}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

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
    if (next !== confirm) { setError(t('dashboard.wrong_current_password')); return; }
    setLoading(true);
    try { 
      await staffProfileApi.changePassword({ current_password: current, new_password: next }); 
      setSuccess(true);
      setTimeout(() => onClose(), 1500); 
    }
    catch (e) { setError(e?.response?.data?.detail || t('dashboard.wrong_current_password')); }
    finally { setLoading(false); }
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
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
          >
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
                value={current}
                onChange={e => { setCurrent(e.target.value); setError(''); }}
                show={showCurrent}
                onToggle={() => setShowCurrent(v => !v)}
                placeholder={t('dashboard.enter_current_password_ph')}
              />
              
              <div className="h-px bg-border my-2" />
              
              <PasswordField 
                label={t('dashboard.new_password')}
                value={next}
                onChange={e => { setNext(e.target.value); setError(''); }}
                show={showNext}
                onToggle={() => setShowNext(v => !v)}
                placeholder={t('dashboard.enter_new_password_ph')}
              />
              <PasswordField 
                label={t('dashboard.confirm_password')}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(''); }}
                show={showConfirm}
                onToggle={() => setShowConfirm(v => !v)}
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

// ─── Modal: Upload Publication ────────────────────────────────────────────────

const ModalUploadPublication = ({ onClose, onSuccess }) => {
  const { t } = useLanguage();
  const [files, setFiles] = useState([]);
  const [pubType, setPubType] = useState('');
  const [access, setAccess] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const PUB_TYPES = ['article', 'thesis', 'monograph', 'textbook', 'manual', 'patent'];

  const handleFiles = (newFiles) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const filtered = Array.from(newFiles).filter(f => allowed.includes(f.type));
    setFiles(prev => [...prev, ...filtered].slice(0, 2));
  };

  const ACCESS_LEVELS = [
    { value: 'public', label: t('dashboard.access_public') },
    { value: 'private', label: t('dashboard.access_private') },
  ];

  const handleApply = async () => {
    if (!files.length || !pubType || !access) return;
    setLoading(true);
    
    try {
      const newDocs = [];
      for (const f of files) {
        const base64Data = await fileToBase64(f);

        const docData = {
          name: f.name,
          size: formatFileSize(f.size),
          pub_type: pubType,
          is_public: access === 'public',
          date: new Date().toISOString().split('T')[0],
          file_data: base64Data
        };
        
        if (staffProfileApi.addPublication) {
          const res = await staffProfileApi.addPublication(docData);
          newDocs.push(res.data);
        } else {
          newDocs.push({ ...docData, id: crypto.randomUUID() });
        }
      }
      onSuccess(newDocs);
      onClose();
    } catch (e) {
      console.error(e);
      alert('Помилка завантаження файлу.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} maxW="max-w-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('dashboard.upload_publication')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('dashboard.upload_pub_hint')}</p>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-4 ${files.length >= 2 ? 'opacity-40 cursor-not-allowed border-border' : 'cursor-pointer ' + (dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')}`}
          onDragOver={e => { if (files.length >= 2) return; e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (files.length >= 2) return; handleFiles(e.dataTransfer.files); }}
          onClick={() => { if (files.length >= 2) return; inputRef.current?.click(); }}
        >
          <CloudUpload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('dashboard.drag_files')}</p>
          <p className="text-xs text-muted-foreground my-2">{t('dashboard.or')}</p>
           <Button variant="outline" size="sm" className="rounded-lg" type="button" disabled={files.length >= 2}>{t('dashboard.choose_file')}</Button>
          <input ref={inputRef} type="file" multiple accept=".pdf,.docx" className="hidden" onChange={e => handleFiles(e.target.files)} />
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t('dashboard.pub_formats')}</p>

        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl mb-2">
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{f.name}</div>
              <div className="text-xs text-muted-foreground">{formatFileSize(f.size)}</div>
            </div>
            <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">{t('dashboard.pub_type_label')}</label>
            <Select value={pubType} onChange={setPubType} options={PUB_TYPES.map(key => ({ value: key, label: t(`pub_types.${key}`) }))} placeholder={t('dashboard.pub_type_placeholder')} dropUp />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">{t('dashboard.access_level')}</label>
            <Select value={access} onChange={setAccess} options={ACCESS_LEVELS} placeholder={t('dashboard.access_placeholder')} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>{t('dashboard.cancel')}</Button>
          <Button className="flex-1 rounded-xl" onClick={handleApply} disabled={!files.length || !pubType || !access || loading}>
            {loading ? t('common.loading') : t('dashboard.apply')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal: Upload Certificate ────────────────────────────────────────────────

const ModalUploadCertificate = ({ onClose, onSuccess }) => {
  const { t } = useLanguage();
  const [files, setFiles] = useState([]);
  const [access, setAccess] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();

  const handleFiles = (newFiles) => {
    const allowed = ['image/jpeg', 'image/png'];
    const filtered = Array.from(newFiles).filter(f => allowed.includes(f.type));
    setFiles(prev => [...prev, ...filtered].slice(0, 2));
  };

  const ACCESS_LEVELS = [
    { value: 'public', label: t('dashboard.access_public') },
    { value: 'private', label: t('dashboard.access_private') },
  ];

  const handleApply = async () => {
    if (!files.length || !access) return;
    setLoading(true);
    
    try {
      const newDocs = [];
      for (const f of files) {
        const base64Data = await fileToBase64(f);
        
        const docData = {
          name: f.name,
          size: formatFileSize(f.size),
          is_public: access === 'public',
          date: new Date().toISOString().split('T')[0],
          file_data: base64Data
        };
        
        if (staffProfileApi.addCertificate) {
          const res = await staffProfileApi.addCertificate(docData);
          newDocs.push(res.data);
        } else {
          newDocs.push({ ...docData, id: crypto.randomUUID() });
        }
      }
      onSuccess(newDocs);
      onClose();
    } catch(e) {
      console.error(e);
      alert('Помилка завантаження файлу.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} maxW="max-w-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('dashboard.upload_certificate')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t('dashboard.upload_cert_hint')}</p>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-4 ${files.length >= 2 ? 'opacity-40 cursor-not-allowed border-border' : 'cursor-pointer ' + (dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50')}`}
          onDragOver={e => { if (files.length >= 2) return; e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (files.length >= 2) return; handleFiles(e.dataTransfer.files); }}
          onClick={() => { if (files.length >= 2) return; inputRef.current?.click(); }}
        >
          <CloudUpload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t('dashboard.drag_files')}</p>
          <p className="text-xs text-muted-foreground my-2">{t('dashboard.or')}</p>
           <Button variant="outline" size="sm" className="rounded-lg" type="button" disabled={files.length >= 2}>{t('dashboard.choose_file')}</Button>
          <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png" className="hidden" onChange={e => handleFiles(e.target.files)} />
        </div>
        <p className="text-xs text-muted-foreground mb-3">{t('dashboard.pub_formats')}</p>

        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl mb-2">
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{f.name}</div>
              <div className="text-xs text-muted-foreground">{formatFileSize(f.size)}</div>
            </div>
            <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="mb-6">
          <label className="block text-xs font-medium text-foreground mb-1.5">{t('dashboard.access_level')}</label>
          <Select value={access} onChange={setAccess} options={ACCESS_LEVELS} placeholder={t('dashboard.access_placeholder')} />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>{t('dashboard.cancel')}</Button>
          <Button className="flex-1 rounded-xl" onClick={handleApply} disabled={!files.length || !access || loading}>
            {loading ? t('common.loading') : t('dashboard.apply')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = ({ user, staffProfile, onSettings, setShowAllProjects, onPhotoUpdate }) => {
  const { t } = useLanguage();
  const labName = staffProfile?.lab_name || staffProfile?.laboratory || '—';
  const labId = staffProfile?.lab_id || null;
  const allProjects = staffProfile?.projects || staffProfile?.project_names || [];
  const projectNames = allProjects.map(p => typeof p === 'object' ? (p.title || p.name) : p);
  const projectsDisplay = projectNames.length > 0 ? projectNames[0] : '—';
  const photoInputRef = React.useRef();

  const handlePhotoClick = () => photoInputRef.current?.click();

 const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert(t('dashboard.choose_image')); return; }

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
        await staffProfileApi.updatePhoto({ photo_data: compressed });
        onPhotoUpdate(compressed);
      } catch (err) {
        alert(`${t('dashboard.save_error')}: ${err?.response?.data?.detail || err.message}`, 'error');
      }
    };
    img.src = objectUrl;
  };

  return (
    <div className="w-full lg:w-[280px] flex-shrink-0 bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 h-fit shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-center gap-3 flex-1">
          <div
            className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/15 ring-offset-2 overflow-hidden cursor-pointer group"
            onClick={handlePhotoClick}
            title={t('dashboard.change_photo')}
          >
            {staffProfile?.photo_url
              ? <img src={staffProfile.photo_url} alt={user?.name} className="w-full h-full object-cover" />
              : <User className="w-10 h-10 text-primary/50" />
            }
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="text-center">
            <div className="font-bold text-foreground text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {user?.name || t('dashboard.name_placeholder')}
            </div>
          </div>
        </div>
        <button onClick={onSettings} className="text-muted-foreground hover:text-primary transition-colors p-1.5 hover:bg-muted rounded-lg">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="border-t border-border" />

      <div className="space-y-3">
        {[
          { 
            icon: <GraduationCap className="w-4 h-4 text-primary" />, 
            label: t('dashboard.position_degree'), 
            value: staffProfile ? `${staffProfile.position} — ${staffProfile.degree}` : '—' 
          },
          { 
            icon: <BookOpen className="w-4 h-4 text-primary" />, 
            label: t('dashboard.disciplines'), 
            value: staffProfile?.disciplines?.length > 0 ? staffProfile.disciplines.join(', ') : t('dashboard.no_disciplines')
          }
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-start gap-3 bg-muted/40 rounded-xl px-3 py-3 border border-transparent">
            <div className="flex-shrink-0 mt-0.5">{icon}</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
              <div className={`text-[13px] font-medium leading-snug ${value === t('dashboard.no_disciplines') ? 'text-muted-foreground italic' : 'text-foreground'}`}>{value}</div>
            </div>
          </div>
        ))}

        <div className="flex items-start gap-3 bg-muted/40 rounded-xl px-3 py-3 border border-transparent">
          <div className="flex-shrink-0 mt-0.5"><FlaskConical className="w-4 h-4 text-primary" /></div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{t('dashboard.laboratory')}</div>
            {labId ? (
              <Link
                to={`/labs/${labId}`}
                className="text-[13px] font-medium text-primary hover:underline leading-snug"
              >
                {labName}
              </Link>
            ) : (
              <div className="text-[13px] font-medium text-muted-foreground italic leading-snug">{t('dashboard.no_laboratory')}</div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 bg-muted/40 rounded-xl px-3 py-3 border border-transparent">
          <div className="flex-shrink-0 mt-0.5"><Layers className="w-4 h-4 text-primary" /></div>
          <div className="w-full">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{t('dashboard.projects')}</div>
            <div className="text-[13px] font-medium text-foreground leading-snug">
              {allProjects.length === 0
                ? <span className="text-muted-foreground italic">{t('dashboard.no_projects')}</span>
                : projectsDisplay
              }
              {allProjects.length > 1 && (
                <button 
                  onClick={() => setShowAllProjects(true)}
                  className="block mt-2 text-[10px] text-primary font-bold hover:underline uppercase tracking-tight"
                >
                  {t('dashboard.all_projects')} ({allProjects.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tab nav ───────────────────────────────────────────────────────────────────

const TabNav = ({ active, onChange }) => {
  const { t } = useLanguage();

  const TABS = [
    { key: 'home', label: t('dashboard.tab_home') },
    { key: 'publications', label: t('dashboard.tab_publications') },
    { key: 'certificates', label: t('dashboard.tab_certificates') },
  ];

  return (
    <div className="flex flex-wrap gap-1 mb-6">
      {TABS.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${active === tab.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ─── Documents Table ──────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8;

const DocTable = ({ docs, onTogglePublic, onRename, onDelete, onDownload, showType = false }) => {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirmDoc, setConfirmDoc] = useState(null);

  const PUB_TYPES = ['article', 'thesis', 'monograph', 'textbook', 'manual', 'patent'];

  const filtered = docs.filter(d => {
    const nameNoExt = (d.name || '').replace(/\.[^/.]+$/, '');
    const matchSearch = !search || nameNoExt.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || d.pub_type === filterType;
    return matchSearch && matchType;
  });

  const ACCESS_LEVELS = [
    { value: 'public', label: t('dashboard.access_public') },
    { value: 'private', label: t('dashboard.access_private') },
  ];

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const renderPages = () => {
    const pages = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('dashboard.search_by_name')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        {showType && (
          <div className="sm:w-48">
            <Select value={filterType} onChange={v => { setFilterType(v); setPage(1); }}
              options={[
                { value: '', label: t('dashboard.all_types') }, 
                ...PUB_TYPES.map(key => ({ 
                  value: key, 
                  label: t(`pub_types.${key}`)
                }))
              ]}
              placeholder={t('dashboard.pub_type_placeholder')} />
          </div>
        )}
      </div>

<div className="bg-card border border-border rounded-2xl overflow-hidden">
  <div className={`grid ${showType ? 'grid-cols-[16px_minmax(0,1fr)_120px_160px_110px]' : 'grid-cols-[16px_minmax(0,1fr)_180px_110px]'} gap-4 px-4 py-3 border-b border-border bg-muted/30`}>
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">{t('dashboard.col_num')}</div>
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">{t('dashboard.name_col')}</div>
    {showType && <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">{t('dashboard.type_col')}</div>}
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center whitespace-nowrap">{showType ? t('dashboard.pub_date') : t('dashboard.cert_date')}</div>
    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">{t('dashboard.actions_col')}</div>
  </div>

  {paginated.length > 0 ? paginated.map((doc, i) => (
    <div key={doc.id || i} className={`grid ${showType ? 'grid-cols-[16px_minmax(0,1fr)_120px_160px_110px]' : 'grid-cols-[16px_minmax(0,1fr)_180px_110px]'} gap-4 px-4 py-3.5 items-center border-b border-border last:border-0 hover:bg-muted/20 transition-colors`}>
      
      <div className="text-sm text-muted-foreground text-center select-none">
        {(page - 1) * ITEMS_PER_PAGE + i + 1}
      </div>

      <div className="min-w-0 text-left">
        {editingId === doc.id ? (
          <div className="flex items-center gap-2">
            <input value={editName} onChange={e => setEditName(e.target.value)} autoFocus
              className="flex-1 px-2 py-1 text-sm rounded-lg border border-primary bg-background focus:outline-none" />
            <button onClick={() => { onRename(doc.id, editName); setEditingId(null); }}
              className="text-primary hover:text-primary/80"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium text-foreground break-all line-clamp-2" title={doc.name}>
              {doc.name}
            </div>
            <div className="text-xs text-muted-foreground">{doc.size}</div>
          </>
        )}
      </div>

      {showType && (
        <div className="text-sm text-muted-foreground text-center">
          {doc.pub_type ? t(`pub_types.${doc.pub_type}`) : '—'}
        </div>
      )}

      <div className="text-sm text-muted-foreground text-center whitespace-nowrap">
        {doc.date}
      </div>

      <div className="flex items-center justify-center gap-0.5">
        <button 
          onClick={() => setConfirmDoc(doc)}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          title={doc.is_public ? t('dashboard.make_private') : t('dashboard.make_public')}
        >
          {doc.is_public ? (
            <Eye className="w-4 h-4 text-primary" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        <button title={t('dashboard.rename')} onClick={() => { setEditingId(doc.id); setEditName(doc.name); }}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Pencil className="w-4 h-4" />
        </button>
        <button title={t('dashboard.delete')} onClick={() => onDelete(doc.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-red-500">
          <Trash2 className="w-4 h-4" />
        </button>
        <button title={t('dashboard.download')} onClick={() => onDownload(doc)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Download className="w-4 h-4" />
        </button>
      </div>

    </div>
  )) : (
    <div className="py-12 text-center text-muted-foreground text-sm">{t('dashboard.no_docs')}</div>
  )}
</div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1 justify-center mt-4">
          <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {renderPages().map((p, i) => p === '...'
            ? <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">...</span>
            : <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="w-9 h-9 rounded-lg" onClick={() => setPage(p)}>{p}</Button>
          )}
          <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {confirmDoc && (
        <ModalConfirmStatus
          currentStatus={confirmDoc.is_public ? 'public' : 'private'}
          onConfirm={() => { onTogglePublic(confirmDoc.id); setConfirmDoc(null); }}
          onClose={() => setConfirmDoc(null)}
        />
      )}
    </div>
  );
};

// ─── TAB: Home ─────────────────────────────────────────────────────────────────

const TabHome = ({ user, announcements, announcementsLoading }) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState('all');
  const filtered = announcements.filter(a => {
    if (filter === 'important') return a.is_important;
    if (filter === 'admin') return a.from_admin;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {t('dashboard.greeting')} {user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || t('dashboard.colleague_fallback')}!
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">{t('dashboard.staff_home_subtitle')}</p>

      <div className="bg-card border border-border rounded-2xl p-5 flex flex-col" style={{ minHeight: '520px' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('dashboard.announcements')}</h2>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {announcementsLoading
            ? <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
            : filtered.length > 0
              ? <div className="space-y-3">{filtered.map((a, i) => (
                <div key={a.id || i} className="border border-border rounded-xl p-4">
                  <div className="font-semibold text-foreground text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.date}</div>
                  {a.text && <div className="text-sm text-muted-foreground mt-1">{a.text}</div>}
                </div>
              ))}</div>
              : <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">{t('dashboard.no_announcements')}</div>
          }
        </div>
      </div>
    </div>
  );
};

// ─── TAB: Publications ────────────────────────────────────────────────────────

const TabPublications = ({ user, publications, setPublications }) => {
  const { t } = useLanguage();
  const { alert, confirm, alertState, confirmState, closeAlert, closeConfirm } = useModals();
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleToggle = async (id) => {
    const doc = publications.find(d => d.id === id);
    try {
      await staffProfileApi.updatePublication(id, { is_public: !doc.is_public });
      setPublications(prev => prev.map(d => d.id === id ? { ...d, is_public: !d.is_public } : d));
    } catch (err) {
      alert(t('dashboard.status_change_error'), 'error');
    }
  };

  const handleRename = async (id, name) => {
    try {
      await staffProfileApi.updatePublication(id, { name });
      setPublications(prev => prev.map(d => d.id === id ? { ...d, name } : d));
    } catch (err) {
      alert(t('dashboard.rename_error'), 'error');
    }
  };

  const handleDelete = async (id) => {
    confirm(t('dashboard.confirm_delete_pub'), async () => {
      try {
        await staffProfileApi.deletePublication(id);
        setPublications(prev => prev.filter(d => d.id !== id));
      } catch (err) {
        alert(t('dashboard.delete_error') + ': ' + (err.response?.data?.detail || err.message), 'error');
      }
    });
  };
  
  const handleDownload = async (doc) => {
    if (doc.file_id) {
      try {
        const res = await staffProfileApi.downloadFile(doc.file_id);
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(url);
      } catch { alert(t('admin.upload_error'), 'error'); }
    } else if (doc.file_data) {
      // fallback для старих документів
      const a = document.createElement('a');
      a.href = doc.file_data;
      a.download = doc.name;
      a.click();
    } else {
      alert(`${t('dashboard.file_no_data')} "${doc.name}"`);
    }
  };
  
  const handleUploadSuccess = (newDocs) => setPublications(prev => [...newDocs, ...prev]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {t('dashboard.greeting')} {user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || t('dashboard.colleague_fallback')}!
          </h1>
          <p className="text-muted-foreground text-sm">{t('dashboard.your_publications')}</p>
        </div>
        <Button className="rounded-xl flex items-center gap-2 flex-shrink-0" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4" /> {t('dashboard.upload_publication')}
        </Button>
      </div>
      <DocTable docs={publications} onTogglePublic={handleToggle} onRename={handleRename} onDelete={handleDelete} onDownload={handleDownload} showType />
      {uploadOpen && <ModalUploadPublication onClose={() => setUploadOpen(false)} onSuccess={handleUploadSuccess} />}
      <ModalAlert message={alertState.message} type={alertState.type} onClose={closeAlert} />
      <ModalConfirm message={confirmState.message} onConfirm={confirmState.onConfirm} onClose={closeConfirm} />
    </div>
  );
};

// ─── TAB: Certificates ────────────────────────────────────────────────────────

const TabCertificates = ({ user, certificates, setCertificates }) => {
  const { t } = useLanguage();
  const { alert, confirm, alertState, confirmState, closeAlert, closeConfirm } = useModals();
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleToggle = async (id) => {
    const doc = certificates.find(d => d.id === id);
    try {
      await staffProfileApi.updateCertificate(id, { is_public: !doc.is_public });
      setCertificates(prev => prev.map(d => d.id === id ? { ...d, is_public: !d.is_public } : d));
    } catch (err) {
      alert(t('dashboard.status_change_error'), 'error');
    }
  };

  const handleRename = async (id, name) => {
    try {
      await staffProfileApi.updateCertificate(id, { name });
      setCertificates(prev => prev.map(d => d.id === id ? { ...d, name } : d));
    } catch (err) {
      alert(t('dashboard.rename_error'), 'error');
    }
  };

  const handleDelete = async (id) => {
    confirm(t('dashboard.confirm_delete_cert'), async () => {
      try {
        await staffProfileApi.deleteCertificate(id);
        setCertificates(prev => prev.filter(d => d.id !== id));
      } catch (err) {
        alert(t('dashboard.delete_error') + ': ' + (err.response?.data?.detail || err.message), 'error');
      }
    });
  };

  const handleDownload = async (doc) => {
    if (doc.file_id) {
      try {
        const res = await staffProfileApi.downloadFile(doc.file_id);
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch { alert(t('admin.upload_error'), 'error'); }
    } else if (doc.file_data) {
      const a = document.createElement('a');
      a.href = doc.file_data;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`${t('dashboard.file_no_data')} "${doc.name}"`, 'error');
    }
  };
  
  const handleUploadSuccess = (newDocs) => setCertificates(prev => [...newDocs, ...prev]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {t('dashboard.greeting')} {user?.name?.split(' ')[1] || user?.name?.split(' ')[0] || t('dashboard.colleague_fallback')}!
          </h1>
          <p className="text-muted-foreground text-sm">{t('dashboard.your_certificates')}</p>
        </div>
        <Button className="rounded-xl flex items-center gap-2 flex-shrink-0" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4" /> {t('dashboard.upload_certificate')}
        </Button>
      </div>
      <DocTable docs={certificates} onTogglePublic={handleToggle} onRename={handleRename} onDelete={handleDelete} onDownload={handleDownload} showType={false} />
      {uploadOpen && <ModalUploadCertificate onClose={() => setUploadOpen(false)} onSuccess={handleUploadSuccess} />}
      <ModalAlert message={alertState.message} type={alertState.type} onClose={closeAlert} />
      <ModalConfirm message={confirmState.message} onConfirm={confirmState.onConfirm} onClose={closeConfirm} />
    </div>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function StaffDashboardPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { alert, confirm, alertState, confirmState, closeAlert, closeConfirm } = useModals();
  const [user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [publications, setPublications] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [modal, setModal] = useState(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [statusModal, setStatusModal] = useState({ show: false, doc: null, type: '' });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const stored = localStorage.getItem('auth_user');
    if (!stored || !token) { navigate('/login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'staff' && u.role !== 'admin') { navigate('/login'); return; }
    setUser(u);

    staffProfileApi.getMe()
      .then(r => {
        const data = r.data;
        setStaffProfile(data);
        const freshUser = { ...u, phone: data.phone ?? null, contact_email: data.contact_email || u.contact_email };
        setUser(freshUser);
        localStorage.setItem('auth_user', JSON.stringify(freshUser));

        setPublications((data.publications || []).map((p, i) => ({
          id: p.id || `pub_${i}`,
          name: p.name,
          size: p.size || '—',
          pub_type: normalizePubType(p.type || p.pub_type),
          is_public: p.is_public !== false,
          date: p.date || '—',
          file_id: p.file_id || null,
        })));
        setCertificates((data.certificates || []).map((c, i) => ({
          id: c.id || `cert_${i}`,
          name: c.name,
          size: c.size || '—',
          is_public: c.is_public !== false,
          date: c.date || '—',
          file_id: c.file_id || null,
        })));
      })
      .catch(() => {});

    const userId = u?.id;
    staffProfileApi.getAnnouncements(userId)
      .then(r => setAnnouncements(r.data || []))
      .catch(() => {})
      .finally(() => setAnnouncementsLoading(false));
  }, [navigate, language]);

  const handleSaveContacts = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('auth_user', JSON.stringify(updatedUser));
  };

  const handleConfirmStatusChange = async () => {
    if (!statusModal.doc) return;
    const { doc, type } = statusModal;
    const newAccess = doc.access === 'public' ? 'private' : 'public';

    try {
      if (type === 'publication') {
        await staffProfileApi.updatePublicationStatus(doc.id, { access: newAccess });
        setPublications(prev => prev.map(p => p.id === doc.id ? { ...p, access: newAccess } : p));
      } else {
        await staffProfileApi.updateCertificateStatus(doc.id, { access: newAccess });
        setCertificates(prev => prev.map(c => c.id === doc.id ? { ...c, access: newAccess } : c));
      }
      setStatusModal({ show: false, doc: null, type: '' });
    } catch (err) {
      console.error("Помилка:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <Sidebar
              user={user}
              staffProfile={staffProfile}
              onSettings={() => setModal('settings')}
              setShowAllProjects={setShowAllProjects}
              onPhotoUpdate={(photoUrl) => {
                setStaffProfile(prev => ({ ...prev, photo_url: photoUrl }));
              }}
            />
            <div className="flex-1 min-w-0">
              <TabNav active={activeTab} onChange={setActiveTab} user={user ?? {}} />
              {activeTab === 'home' && <TabHome user={user} announcements={announcements} announcementsLoading={announcementsLoading} />}
              {activeTab === 'publications' && <TabPublications user={user} publications={publications} setPublications={setPublications} />}
              {activeTab === 'certificates' && <TabCertificates user={user} certificates={certificates} setCertificates={setCertificates} />}
            </div>
          </div>
        </div>
      </main>
      <AppFooter />

      {modal === 'settings' && <ModalSettings onClose={() => setModal(null)} onContacts={() => setModal('contacts')} onPassword={() => setModal('password')} />}
      {modal === 'contacts' && <ModalContacts onClose={() => setModal(null)} user={user} onSave={handleSaveContacts} />}
      {modal === 'password' && <ModalPassword onClose={() => setModal(null)} />}

      {showAllProjects && ( <ModalAllProjects staffId={staffProfile?.id} onClose={() => setShowAllProjects(false)} />)}
      {statusModal.show && (
  <ModalConfirmStatus 
    currentStatus={statusModal.doc?.access} 
    onClose={() => setStatusModal({ show: false, doc: null, type: '' })}
    onConfirm={handleConfirmStatusChange}
  />
)}
    </div>
  );
}

const ModalAllProjects = ({ staffId, onClose }) => {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (staffId) {
      setLoading(true);
      staffProfileApi.getProjects(staffId)
        .then(res => {
          setProjects(res.data || []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Error fetching projects:", err);
          setLoading(false);
        });
    }
  }, [staffId]);

  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = projects.slice(startIndex, startIndex + itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8 rounded-lg"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              className="w-8 h-8 rounded-lg text-[11px] font-bold"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8 rounded-lg"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{t('dashboard.all_projects')}</h2>
              <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">{t('dashboard.activity_archive')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-muted rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] bg-card">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
          ) : (
            <div className="space-y-2">
              {currentItems.length > 0 ? currentItems.map((p) => (
                <Link 
                  key={p.id} 
                  to={`/projects/${p.id}`} 
                  className="flex items-center justify-between p-4 rounded-2xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                >
                  <span className="text-[13px] font-bold text-foreground group-hover:text-primary transition-colors">
                    {p.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              )) : (
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-[13px] text-muted-foreground">{t('dashboard.no_projects_found')}</p>
                </div>
              )}
            </div>
          )}
          {renderPagination()}
        </div>
      </div>
    </div>
  );
};