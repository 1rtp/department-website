import React, { useState, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Eye, Info, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useLanguage } from '../contexts/LanguageContext';

// ─── ModalAlert ───────────────────────────────────────────────────────────────

export const ModalAlert = ({ message, type = 'error', onClose }) => {
  const { t } = useLanguage();

  if (!message) return null;

  const config = {
    error: {
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      title: t('modals.error'),
    },
    success: {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      title: t('modals.success'),
    },
    info: {
      icon: <Info className="w-5 h-5 text-primary" />,
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      title: t('modals.info'),
    },
  }[type] || config.error;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center`}>
              {config.icon}
            </div>
            <h2 className="font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {config.title}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          <p className="text-[14px] text-foreground font-medium leading-relaxed">{message}</p>
        </div>

        <div className="p-4 bg-muted/10 border-t border-border">
          <Button className="w-full rounded-xl font-bold" onClick={onClose}>OK</Button>
        </div>
      </div>
    </div>
  );
};

// ─── ModalConfirm ─────────────────────────────────────────────────────────────

export const ModalConfirm = ({ message, onConfirm, onClose, confirmLabel = 'Так, видалити', danger = true }) => {
  const { t } = useLanguage();

  if (!message) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${danger ? 'bg-red-500/10 border border-red-500/20' : 'bg-primary/10 border border-primary/20'}`}>
              {danger
                ? <AlertTriangle className="w-4 h-4 text-red-500" />
                : <Info className="w-4 h-4 text-primary" />
              }
            </div>
            <h2 className="font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('modals.confirmation')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          <p className="text-[14px] text-foreground font-medium leading-relaxed">{message}</p>
        </div>

        <div className="p-4 bg-muted/10 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>{t('dashboard.cancel')}</Button>
          <Button
            className={`flex-1 rounded-xl font-bold ${danger ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── ModalConfirmStatus ───────────────────────────────────────────────────────

export const ModalConfirmStatus = ({ onClose, onConfirm, currentStatus }) => {
  const { t } = useLanguage()
  const isTargetPublic = currentStatus === 'private';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('modals.access_status')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          <p className="text-[14px] text-foreground font-medium">
            {t('modals.change_status_from')} {' '}
            <span className={isTargetPublic ? 'text-red-500' : 'text-green-500'}>
              {isTargetPublic ? t('dashboard.access_private') : t('dashboard.access_public')}
            </span>{' '}
            {t('modals.change_status_to')} {' '}
            <span className={isTargetPublic ? 'text-green-500' : 'text-red-500'}>
              {isTargetPublic ? t('dashboard.access_public') : t('dashboard.access_private')}
            </span>?
          </p>
        </div>

        <div className="p-4 bg-muted/10 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>{t('modals.no')}</Button>
          <Button className="flex-1 rounded-xl font-bold" onClick={onConfirm}>{t('modals.yes_change')}</Button>
        </div>
      </div>
    </div>
  );
};

// ─── useModals hook ───────────────────────────────────────────────────────────

export const useModals = () => {
  const [alertState, setAlertState] = useState({ message: null, type: 'error' });
  const [confirmState, setConfirmState] = useState({ message: null, onConfirm: null });

  const showAlert = useCallback((message, type = 'error') => {
    setAlertState({ message, type });
  }, []);

  const showConfirm = useCallback((message, onConfirm) => {
    setConfirmState({ message, onConfirm });
  }, []);

  const closeAlert = useCallback(() => setAlertState({ message: null, type: 'error' }), []);
  const closeConfirm = useCallback(() => setConfirmState({ message: null, onConfirm: null }), []);

  return { alert: showAlert, confirm: showConfirm, alertState, confirmState, closeAlert, closeConfirm };
};