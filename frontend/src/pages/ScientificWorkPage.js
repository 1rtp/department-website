import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Database, Eye, Monitor, ArrowRight, FlaskConical } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';
import { laboratoriesApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function ScientificWorkPage() {
  const { t, language } = useLanguage();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);

  const RESEARCH_DIRECTIONS = [
    { icon: <Brain className="w-8 h-8 text-primary" />, title: t('research_page.dir1_title'), text: t('research_page.dir1_text') },
    { icon: <Database className="w-8 h-8 text-primary" />, title: t('research_page.dir2_title'), text: t('research_page.dir2_text') },
    { icon: <Eye className="w-8 h-8 text-primary" />, title: t('research_page.dir3_title'), text: t('research_page.dir3_text') },
    { icon: <Monitor className="w-8 h-8 text-primary" />, title: t('research_page.dir4_title'), text: t('research_page.dir4_text') },
  ];

  useEffect(() => {
    laboratoriesApi.getAll()
      .then(r => setLabs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
    {/* Page header */}
    <div className="bg-muted/40 border-b border-border py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <FlaskConical className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          {t('research_page.title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('research_page.subtitle')}
        </p>
      </div>
    </div>

      {/* Research Directions */}
      <section className="py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-10 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {t('research_page.directions_title')}
          </h2>
          <div className="space-y-8">
            {RESEARCH_DIRECTIONS.map((dir, i) => (
              <div key={i} className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {dir.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {dir.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{dir.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Laboratories */}
      <section className="py-14 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-10 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {t('research_page.labs_title')}
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : labs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labs.map(lab => (
                <div key={lab.id} className="bg-card rounded-xl border border-border p-5 card-hover">
                  <h3 className="font-bold text-foreground mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {lab.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    <span className="font-medium">{t('research_page.head')}:</span> {lab.head_name || '—'}
                  </p>
                  <Link
                    to={`/labs/${lab.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4"
                  >
                    {t('common.read_more')} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">{t('research_page.labs_not_found')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
