import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, ImageIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { labProjectsApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function LabProjectDetailsPage() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    if (!project) setLoading(true);
    labProjectsApi.getById(id)
      .then(r => setProject(r.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [id, language]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">{t('lab_project_page.not_found')}</p>
        <Button asChild variant="outline">
          <Link to="/research"><ArrowLeft className="w-4 h-4 mr-2" />{t('common.back')}</Link>
        </Button>
      </div>
    );
  }

  const coordinators = project.coordinators || [];
  const paragraphs = project.description?.split('\n\n').filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <div className="min-h-screen">
          {/* Back */}
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <Link to="/research" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />{t('lab_project_page.back')}
            </Link>
          </div>

          {/* Header */}
          <section className="py-10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <div className="flex flex-col justify-center">
                  <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {project.name}
                  </h1>
                </div>
                <div className="rounded-2xl overflow-hidden border border-border shadow-md bg-muted">
                  {project.image_url ? (
                    <img src={project.image_url} alt={project.name} className="w-full object-cover min-h-[240px]" />
                  ) : (
                    <div className="img-placeholder min-h-[240px] flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Info */}
          <section className="py-10 bg-muted/40">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold text-foreground mb-8 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {t('lab_project_page.info_title')}
              </h2>
              <div className="space-y-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed">{p}</p>
                ))}
              </div>
            </div>
          </section>

          {/* Coordinators */}
          {coordinators.length > 0 && (
            <section className="py-10">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-foreground mb-8 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {t('lab_project_page.coordinators_title')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coordinators.map(c => (
                    <Link key={c.id} to={`/staff/${c.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 hover:bg-muted transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-primary/10 flex-shrink-0">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary/50" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.position}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}