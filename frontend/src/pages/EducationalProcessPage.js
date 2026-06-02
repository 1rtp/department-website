import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Clock, ArrowRight, BookOpen, Laptop, Handshake, Rocket } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { specialtiesApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

const TECHNOLOGIES = [
  { name: 'Java', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg'},
  { name: 'Python', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg'},
  { name: 'JavaScript', bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg'},
  { name: 'C++', bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg'},
  { name: 'TensorFlow', bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tensorflow/tensorflow-original.svg'},
  { name: 'SQL', bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-600 dark:text-indigo-400', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azuresqldatabase/azuresqldatabase-original.svg'},
  { name: 'React', bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-600 dark:text-cyan-400', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg'},
  { name: 'Docker', bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-600 dark:text-sky-400', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg'},
];

export default function EducationalProcessPage() {
  const { t } = useLanguage();
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    specialtiesApi.getAll()
      .then(r => setSpecialties(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const defaultSpecialties = [
    { id: '1', title: 'Інженерія програмного забезпечення - Бакалавр', code: '121', degree_level: 'bachelor', duration: '3 роки 10 місяців', student_count: 120, description: 'Базова вища освіта у галузі комп’ютерних наук.' },
    { id: '2', title: 'Інженерія програмного забезпечення - Магістр', code: '121', degree_level: 'master', duration: '1 рік 10 місяців', student_count: 45, description: 'Поглиблена підготовка фахівців вищого рівня.' },
    { id: '3', title: 'Інженерія програмного забезпечення - Доктор філософії', code: '121', degree_level: 'phd', duration: '4 роки', student_count: 12, description: 'Підготовка науково-педагогічних кадрів.' },
  ];

  const WHY_FEATURES = [
    { icon: <GraduationCap className="w-8 h-8 text-primary" />, title: t('education_page.why_quality_title'), text: t('education_page.why_quality_text') },
    { icon: <Laptop className="w-8 h-8 text-primary" />, title: t('education_page.why_practice_title'), text: t('education_page.why_practice_text') },
    { icon: <Handshake className="w-8 h-8 text-primary" />, title: t('education_page.why_team_title'), text: t('education_page.why_team_text') },
    { icon: <Rocket className="w-8 h-8 text-primary" />, title: t('education_page.why_career_title'), text: t('education_page.why_career_text') },
  ];

  const displaySpecialties = specialties.length ? specialties : defaultSpecialties;

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="bg-muted/40 border-b border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {t('education_page.title')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('education_page.subtitle')}
          </p>
        </div>
      </div>

      {/* Specialties */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {displaySpecialties.map(spec => (
                <div key={spec.id} className="bg-card rounded-xl border border-border p-6 card-hover flex flex-col gap-4" data-testid="specialty-card">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <Badge className="bg-accent text-accent-foreground font-bold text-[12px] px-2 py-0.5 h-fit tracking-wider">
                      {spec.code || '121'}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {spec.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{spec.duration}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{spec.description}</p>
                  </div>
                  <div className="mt-auto">
                    <Link
                      to={`/education/${spec.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4 transition-colors"
                      data-testid="specialty-card-read-more-link"
                    >
                      {t('education_page.read_more')}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Technologies Section */}
      <section className="py-12 bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('education_page.tech_title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              {t('education_page.tech_subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {TECHNOLOGIES.map((tech, i) => (
              <div 
                key={i} 
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border border-border/40 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 w-36 ${tech.bg}`}
              >
                <div className="w-12 h-12 flex items-center justify-center bg-white/60 dark:bg-black/20 rounded-xl p-2 shadow-sm">
                  <img 
                    src={tech.icon} 
                    alt={tech.name} 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `<span class="text-xs font-bold ${tech.text}">${tech.name.substring(0,3)}</span>`;
                    }} 
                  />
                </div>
                <span className={`font-bold text-sm ${tech.text} text-center leading-tight`} style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  {tech.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why study */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('education_page.why_title')}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('education_page.why_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_FEATURES.map((feat, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 card-hover flex flex-col gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">{feat.icon}</div>
                <div>
                  <h3 className="font-bold text-foreground mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
