import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, FileText, ImageIcon, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { staffApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

const stripExt = (name) => name?.replace(/\.[^/.]+$/, '') || name;

const formatDate = (dateStr, language) => {
  if (!dateStr) return '';
  // Already formatted (legacy data) — not ISO format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const locale = language === 'en' ? 'en-GB' : 'uk-UA';
  return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function StaffProfilePublicPage() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('publications');
  const [docPage, setDocPage] = useState(1);
  const [search, setSearch] = useState('');
  const DOC_PER_PAGE = 8;
  const isLoggedIn = !!localStorage.getItem('auth_token');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    staffApi.getById(id)
      .then(r => setStaff(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, language]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">{t('staff_page.not_found')}</p>
        <Button asChild variant="outline"><Link to="/staff"><ArrowLeft className="w-4 h-4 mr-2" />{t('common.back')}</Link></Button>
      </div>
    );
  }

  const rawPublications = staff.publications || [];
  const rawCertificates = staff.certificates || [];
  const publications = rawPublications.filter(p => p.is_public === true);
  const certificates = rawCertificates.filter(c => c.is_public === true);
  const activeDocs = activeTab === 'publications' ? publications : certificates;
  const filteredDocs = search.trim()
    ? activeDocs.filter(d => {
        const nameNoExt = (d.name || '').replace(/\.[^/.]+$/, '');
        return nameNoExt.toLowerCase().includes(search.trim().toLowerCase());
      })
    : activeDocs;
  const totalDocPages = Math.max(1, Math.ceil(filteredDocs.length / DOC_PER_PAGE));
  const visibleDocs = filteredDocs.slice((docPage - 1) * DOC_PER_PAGE, docPage * DOC_PER_PAGE);
  const displayName = language === 'en' && staff.name_en ? staff.name_en : staff.name;

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setDocPage(1);
    setSearch('');
  };

  return (
    <div className="min-h-screen">
      {/* Back */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/staff" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {t('staff_page.title')}
        </Link>
      </div>

      {/* Profile header */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 rounded-full overflow-hidden ring-2 ring-primary/15 ring-offset-2 flex-shrink-0">
              {staff.photo_url ? (
                <img src={staff.photo_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <User className="w-14 h-14 text-primary/50" />
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {displayName}
              </h1>
              <p className="text-muted-foreground">{staff.position} — {staff.degree}</p>
              {staff.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${staff.email}`} className="text-sm text-primary hover:underline">{staff.email}</a>
                </div>
              )}
              {/* Social links */}
              {Object.keys(staff.social_links || {}).length > 0 && (
                <div className="flex items-center gap-2 mt-1">

                  {staff.social_links.linkedin && (
                    <a href={staff.social_links.linkedin} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="LinkedIn">
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg"
                        className="w-4 h-4" alt="LinkedIn" />
                    </a>
                  )}

                  {staff.social_links.facebook && (
                    <a href={staff.social_links.facebook} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Facebook">
                      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/facebook/facebook-original.svg"
                        className="w-4 h-4" alt="Facebook" />
                    </a>
                  )}

                  {staff.social_links.twitter && (
                    <a href={staff.social_links.twitter} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="X (Twitter)">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </a>
                  )}

                  {staff.social_links.scholar && (
                  <a href={staff.social_links.scholar} target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title="Google Scholar">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                      <g fill="none" fillRule="evenodd">
                        <path d="M256 411.12L0 202.667 256 0z" fill="#4285f4"/>
                        <path d="M256 411.12l256-208.453L256 0z" fill="#356ac3"/>
                        <circle cx="256" cy="362.667" fill="#a0c3ff" r="149.333"/>
                        <path d="M121.037 298.667c23.968-50.453 75.392-85.334 134.963-85.334s110.995 34.881 134.963 85.334H121.037z" fill="#76a7fa"/>
                      </g>
                    </svg>
                  </a>
                )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Education & Career */}
      {((staff.education?.length > 0) || (staff.career?.length > 0)) && (
        <section className="py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-8 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('staff_profile.education_career')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {staff.education?.length > 0 && (
                <div>
                  <h3 className="font-bold text-foreground mb-4 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('staff_profile.education')}</h3>
                  <ul className="space-y-2">
                    {staff.education.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                        <span className="text-muted-foreground"><strong>{e.date}</strong> — {e.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {staff.career?.length > 0 && (
                <div>
                  <h3 className="font-bold text-foreground mb-4 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('staff_profile.career')}</h3>
                  <ul className="space-y-2">
                    {staff.career.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                        <span className="text-muted-foreground"><strong>{c.date}</strong> — {c.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="border-t border-border" />

      {/* Teaching activity */}
      {(staff.teaching_experience || staff.disciplines?.length > 0 || staff.specialties_taught?.length > 0) && (
        <section className="py-10 bg-muted/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('staff_profile.teaching')}
            </h2>
            <ul className="space-y-2 max-w-xl mx-auto">
              {staff.teaching_experience && (
                <li className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                  <span className="text-muted-foreground"><strong>{t('staff_profile.experience')}:</strong> {staff.teaching_experience}</span>
                </li>
              )}
              {staff.disciplines?.length > 0 && (
                <li className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                  <span className="text-muted-foreground"><strong>{t('staff_profile.disciplines')}:</strong> {staff.disciplines.join(', ')}</span>
                </li>
              )}
              {staff.specialties_taught?.length > 0 && (
                <li className="flex items-start gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                  <span className="text-muted-foreground"><strong>{t('staff_profile.specialties')}:</strong> {staff.specialties_taught.join('; ')}</span>
                </li>
              )}
            </ul>
          </div>
        </section>
      )}

      {/* Publications & Certificates */}
      {(publications.length > 0 || certificates.length > 0) && (
        <section className="py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Tabs */}
            <div className="flex items-center justify-center gap-0 mb-8">
              <button
                onClick={() => handleTabChange('publications')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-l-xl border border-r-0 transition-colors ${
                  activeTab === 'publications'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {t('staff_profile.publications')} ({publications.length})
              </button>
              <button
                onClick={() => handleTabChange('certificates')}
                className={`px-6 py-2.5 text-sm font-semibold rounded-r-xl border transition-colors ${
                  activeTab === 'certificates'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {t('staff_profile.certificates')} ({certificates.length})
              </button>
            </div>

            {/* Search */}
            <div className="relative mt-6 mb-6">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setDocPage(1); }}
                placeholder={activeTab === 'publications' ? t('staff_profile.search_publications') : t('staff_profile.search_certificates')}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Files grid */}
            <div className="bg-card rounded-xl border border-border p-6">
              {visibleDocs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  {visibleDocs.map((doc, i) => {
                    const totalRows = Math.ceil(visibleDocs.length / 2);
                    const rowIndex = Math.floor(i / 2);
                    const isLastRow = rowIndex === totalRows - 1;
                    const isCert = activeTab === 'certificates';
                    const DocIcon = isCert ? ImageIcon : FileText;
                    const iconColor = isLoggedIn ? 'text-primary' : 'text-foreground';
                    const handleDownload = () => {
                      if (!isLoggedIn || !doc.file_id) return;
                      import('../utils/api').then(({ staffProfileApi }) => {
                        staffProfileApi.downloadFile(doc.file_id).then(res => {
                          const url = URL.createObjectURL(res.data);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = doc.name || 'file';
                          a.click();
                          URL.revokeObjectURL(url);
                        });
                      });
                    };
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-3 py-2 border-b border-border md:${isLastRow ? 'border-0' : 'border-b border-border'} ${isLoggedIn ? 'cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors' : ''}`}
                        onClick={isLoggedIn ? handleDownload : undefined}
                        title={isLoggedIn ? doc.name : undefined}
                      >
                        <DocIcon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground break-words">{isLoggedIn ? doc.name : stripExt(doc.name)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(doc.date, language)}
                            {!isCert && doc.pub_type ? ` — ${t(`pub_types.${doc.pub_type}`)}` : ''}
                            {isLoggedIn && doc.size ? ` — ${doc.size}` : ''}
                          </p>
                        </div>
                        {isLoggedIn && (
                          <Download className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5 opacity-60" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">{t('staff_profile.no_files')}</p>
              )}

              {/* Pagination */}
              {totalDocPages > 1 && (
                <div className="flex items-center gap-1 justify-center mt-6">
                  <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setDocPage(p => Math.max(1, p-1))} disabled={docPage === 1}>
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  {Array.from({ length: totalDocPages }, (_, i) => i + 1).map(p => (
                    <Button key={p} variant={p === docPage ? 'default' : 'outline'} size="sm" className="w-8 h-8" onClick={() => setDocPage(p)}>{p}</Button>
                  ))}
                  <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setDocPage(p => Math.min(totalDocPages, p+1))} disabled={docPage === totalDocPages}>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}