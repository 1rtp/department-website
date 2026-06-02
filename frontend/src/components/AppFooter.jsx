import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Home } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { departmentApi } from '../utils/api';

const NAV_LINKS = [
  { path: '/', labelKey: 'nav.home' },
  { path: '/education', labelKey: 'nav.education' },
  { path: '/research', labelKey: 'nav.research' },
  { path: '/staff', labelKey: 'nav.staff' },
  { path: '/news', labelKey: 'nav.news' },
];

export const AppFooter = () => {
  const { t, language } = useLanguage();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    departmentApi.getInfo()
      .then(r => setInfo(r.data))
      .catch(() => {});
  }, [language]);

  const deptName    = info?.dept_name       || 'Кафедра КН та ІТ';
  const phones      = info?.footer_phones   || [info?.contacts?.phone].filter(Boolean);
  const emails      = info?.footer_emails   || [info?.contacts?.email].filter(Boolean);
  const address     = info?.footer_address  || info?.contacts?.address || '';
  const copyright   = info?.footer_copyright || deptName;

  return (
    <footer className="bg-[#0f172a] text-white" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">

          {/* Contact Info */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {deptName}
              </span>
            </div>
            <h3 className="font-semibold text-white/50 text-xs uppercase tracking-wider mb-3">
              {t('footer.contact_info')}
            </h3>
            <div className="space-y-3">
              {phones.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-white/40 mb-0.5">{t('footer.phone')}</div>
                    {phones.map((p, i) => (
                      <div key={i} className="text-sm text-white/90">{p}</div>
                    ))}
                  </div>
                </div>
              )}
              {emails.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <Mail className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-white/40 mb-0.5">{t('footer.email')}</div>
                    {emails.map((e, i) => (
                      <div key={i} className="text-sm text-white/90">{e}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold text-white/50 text-xs uppercase tracking-wider mb-4">
              {t('footer.navigation')}
            </h3>
            <nav className="flex flex-col gap-2.5">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-sm text-white/70 hover:text-white transition-colors hover:underline underline-offset-4"
                  data-testid="footer-nav-link"
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Address */}
          <div>
            <h3 className="font-semibold text-white/50 text-xs uppercase tracking-wider mb-4">
              {t('footer.address')}
            </h3>
            {address && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-white/40 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                  {address}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} {copyright}. Всі права захищені.
          </p>
        </div>
      </div>
    </footer>
  );
};