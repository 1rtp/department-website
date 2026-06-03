import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileDown, ImageIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { specialtiesApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function SpecialtyDetailPage() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [specialty, setSpecialty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialty) setLoading(true);
    specialtiesApi.getById(id)
      .then(r => setSpecialty(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, language, specialty]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!specialty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">{t('specialty_page.not_found')}</p>
        <Button asChild variant="outline"><Link to="/education"><ArrowLeft className="w-4 h-4 mr-2" />{t('nav.education')}</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Back */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/education" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />{t('nav.education')}
        </Link>
      </div>

      {/* Header */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h1
                className="text-3xl sm:text-4xl font-bold text-foreground leading-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {specialty.title}
              </h1>
              <p className="text-lg text-muted-foreground mt-2">{t('specialty_page.specialty')} {specialty.code} — {specialty.duration}</p>
            </div>
            <div className="rounded-2xl overflow-hidden border border-border shadow-md bg-muted">
              {specialty.image_url ? (
                <img src={specialty.image_url} alt={specialty.title} className="w-full object-cover min-h-[200px]" />
              ) : (
                <div className="img-placeholder min-h-[200px]">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Info */}
      {specialty.description && (
        <section className="py-10 bg-muted/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('specialty_page.info_title')}
            </h2>
            <p className="text-muted-foreground leading-relaxed">{specialty.description}</p>
          </div>
        </section>
      )}

      {/* Competencies */}
      {specialty.competencies?.length > 0 && (
        <section className="py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('specialty_page.competencies_title')}
            </h2>
            <ul className="space-y-2">
              {specialty.competencies.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                  <span className="text-muted-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Learning outcomes */}
      {specialty.learning_outcomes?.length > 0 && (
        <section className="py-10 bg-muted/40">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('specialty_page.outcomes_title')}
            </h2>
            <ul className="space-y-2">
              {specialty.learning_outcomes.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                  <span className="text-muted-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Additional text + PDF */}
      <section className="py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {specialty.additional_text && (
            <p className="text-muted-foreground leading-relaxed mb-8 text-center">
              {specialty.additional_text}
            </p>
          )}
          {specialty.program_pdf_url && (
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                onClick={() => window.open(
                  `${process.env.REACT_APP_BACKEND_URL || ''}/api/specialties/${id}/pdf`,
                  '_blank'
                )}
                className="inline-flex items-center gap-3 px-6 py-3 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-muted transition-colors"
              >
                <FileDown className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-foreground">{t('specialty_page.view_program')}</span>
              </button>
              <a
                href={specialty.program_pdf_url}
                download={`${specialty.title || 'program'}.pdf`}
                className="inline-flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-colors"
              >
                <FileDown className="w-5 h-5" />
                <span className="text-sm font-medium">{t('specialty_page.download_pdf')}</span>
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
