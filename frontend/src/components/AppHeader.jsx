import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sun, Moon, Home, Menu, X, LogOut, User } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ModalConfirm } from '../utils/useModals';
import ReactDOM from 'react-dom';

const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.home' },
  { path: '/education', labelKey: 'nav.education' },
  { path: '/research', labelKey: 'nav.research' },
  { path: '/staff', labelKey: 'nav.staff' },
  { path: '/news', labelKey: 'nav.news' },
];

// Helper: get cabinet path by role
const getCabinetPath = (role) => {
  if (role === 'student') return '/student';
  if (role === 'staff') return '/staff-cabinet';
  if (role === 'admin') return '/admin';
  return null;
};

export const AppHeader = () => {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authUser, setAuthUser] = useState(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      setAuthUser(stored ? JSON.parse(stored) : null);
    } catch {
      setAuthUser(null);
    }
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      const { authApi } = await import('../utils/api');
      await authApi.logout();
    } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthUser(null);
    navigate('/');
  };

  const cabinetPath = authUser ? getCabinetPath(authUser.role) : null;
  const shortName = authUser ? authUser.role === 'admin' ? t('admin.role_admin')
   : (authUser.name?.split(' ')[1] || authUser.name?.split(' ')[0] || authUser.name) : null;

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-foreground hover:text-primary transition-colors flex-shrink-0"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Home className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="hidden sm:block text-sm font-bold tracking-tight">{t('header.logo_text')}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5" aria-label="Main navigation">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              data-testid={`header-nav-link-${item.path.replace('/', '') || 'home'}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-1.5">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full w-9 h-9"
            data-testid="theme-toggle-button"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Language */}
          <div className="flex items-center gap-0.5 border border-border rounded-full p-0.5" data-testid="language-toggle-button">
            <button
              onClick={() => setLanguage('ua')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                language === 'ua' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              UA
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                language === 'en' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              EN
            </button>
          </div>

          {/* Auth area */}
          {authUser ? (
            <div className="hidden sm:flex items-center gap-1.5">
              {/* User name → goes to cabinet */}
              {cabinetPath ? (
                <Link
                  to={cabinetPath}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-secondary transition-colors text-sm font-medium text-foreground"
                  data-testid="user-cabinet-button"
                >
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span className="max-w-[120px] truncate">{shortName}</span>
                </Link>
              ) : (
                <span className="px-3 py-1.5 text-sm font-medium text-foreground">{shortName}</span>
              )}
              {/* Logout */}
              <Button
                variant="outline"
                size="sm"
                className="rounded-full gap-1.5"
                onClick={() => setConfirmLogout(true)}
                data-testid="logout-button"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('nav.logout') || 'Вийти'}
              </Button>
            </div>
          ) : (
            <Button size="sm" className="rounded-full font-medium hidden sm:flex" asChild data-testid="login-button">
              <Link to="/login">{t('nav.login')}</Link>
            </Button>
          )}

          {/* Mobile burger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-full w-9 h-9"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background px-4 py-3">
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {t(item.labelKey)}
              </Link>
            ))}
            {authUser ? (
              <>
                {cabinetPath && (
                  <Link to={cabinetPath} onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    <User className="w-4 h-4 text-primary" />
                    {shortName}
                  </Link>
                )}
                <button onClick={() => { setMobileOpen(false); setConfirmLogout(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-left">
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout') || 'Вийти'}
                </button>
              </>
            ) : (
              <Button size="sm" className="rounded-full font-medium mt-2 sm:hidden" asChild data-testid="login-button-mobile">
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
    {confirmLogout && ReactDOM.createPortal(
      <ModalConfirm
        message={t('header.logout_confirm')}
        confirmLabel={t('header.logout_confirm_btn')}
        danger={true}
        onConfirm={handleLogout}
        onClose={() => setConfirmLogout(false)}
      />,
      document.body
    )}
  </>
  );
};