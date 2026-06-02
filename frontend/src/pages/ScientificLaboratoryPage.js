import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, User, GraduationCap, Globe, Layers, MapPin, Mail,
  ChevronLeft, ChevronRight, Brain, Eye, TrendingUp, Network, Shield, Cloud,
  Code2, Database, BarChart2, Cpu, Monitor, Smartphone, Layout, TestTube2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { laboratoriesApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

const IC = (C) => <C className="w-5 h-5 text-primary" />;
const ICON_MAP = {
  Brain: IC(Brain), Eye: IC(Eye), TrendingUp: IC(TrendingUp),
  Network: IC(Network), Shield: IC(Shield), Cloud: IC(Cloud),
  Code2: IC(Code2), TestTube2: IC(TestTube2), Layers: IC(Layers),
  Database: IC(Database), BarChart2: IC(BarChart2), Cpu: IC(Cpu),
  Globe: IC(Globe), Smartphone: IC(Smartphone), Layout: IC(Layout), Monitor: IC(Monitor),
};

export default function ScientificLaboratoryPage() {
  const { t, language } = useLanguage();
  const { id } = useParams();
  const [lab, setLab] = useState(null);
  const [projects, setProjects] = useState([]);
  const [projTotal, setProjTotal] = useState(0);
  const [projPages, setProjPages] = useState(1);
  const [projPage, setProjPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [projLoading, setProjLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    laboratoriesApi.getById(id)
      .then(r => setLab(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, language]);

  useEffect(() => {
    if (!id) return;
    setProjLoading(true);
    laboratoriesApi.getProjects(id, { page: projPage, limit: 8 })
      .then(r => {
        setProjects(r.data.items || []);
        setProjTotal(r.data.total || 0);
        setProjPages(r.data.pages || 1);
      })
      .catch(() => {})
      .finally(() => setProjLoading(false));
  }, [id, projPage, language]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">{t('lab_page.not_found')}</p>
        <Button asChild variant="outline"><Link to="/research"><ArrowLeft className="w-4 h-4 mr-2" />{t('common.back')}</Link></Button>
      </div>
    );
  }

  const head = lab.head;
  const team = lab.team_members || [];

  return (
    <div className="min-h-screen">
      {/* Back + Header */}
      <div className="bg-muted/40 border-b border-border py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/research" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" />{t('nav.research')}
          </Link>
          <h1 className="text-3xl font-bold text-foreground text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {lab.name}
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Creation date */}
        {lab.created_date && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('lab_page.created_date')}</h2>
            <p className="text-muted-foreground text-center">{lab.created_date}</p>
          </div>
        )}

        {/* Research Directions */}
        {lab.research_directions?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-8 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {t('research_page.directions_title')}
            </h2>
            <div className="space-y-6">
              {lab.research_directions.map((dir, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {ICON_MAP[dir.icon] || <Layers className="w-5 h-5 text-primary" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{dir.title}</h3>
                    <p className="text-sm text-muted-foreground">{dir.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Head */}
        {head && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('lab_page.head')}</h2>
            <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-5">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-primary/15 flex-shrink-0">
                {head.photo_url ? (
                  <img src={head.photo_url} alt={head.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary/50" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{head.name}</p>
                <p className="text-sm text-muted-foreground">{head.position}</p>
                <p className="text-xs text-muted-foreground">{head.specialization}</p>
              </div>
              <Button variant="outline" size="sm" className="flex-shrink-0" asChild>
                <Link to={`/staff/${head.id}`}>{t('staff_page.more_btn')}</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Team */}
        {team.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('lab_page.team')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {team.map(m => (
                <Link key={m.id} to={`/staff/${m.id}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted transition-colors">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground hover:text-primary">{m.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Education connection */}
        {lab.education_connection?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('lab_page.education_connection')}</h2>
            <div className="space-y-4">
              {lab.education_connection.map((conn, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {conn.icon === 'GraduationCap' ? <GraduationCap className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{conn.title}</h3>
                    <p className="text-sm text-muted-foreground">{conn.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('lab_page.projects_title')}</h2>
          {projLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : projects.length > 0 ? (
            <>
              <div className="space-y-1">
                {projects.map(p => (
                  <Link key={p.id} to={`/lab-projects/${p.id}`} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted transition-colors group">
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground group-hover:text-primary">{p.name}</span>
                    </div>
                    <span className="text-xs text-primary flex items-center gap-1">{t('common.read_more')}<ArrowRight className="w-3 h-3" /></span>
                  </Link>
                ))}
              </div>
              {/* Pagination */}
              {projPages > 1 && (
                <div className="flex items-center gap-1 justify-center mt-6">
                  <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setProjPage(p => Math.max(1, p-1))} disabled={projPage === 1}>
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
                  {Array.from({ length: Math.min(projPages, 5) }, (_, i) => i + 1).map(p => (
                    <Button key={p} variant={p === projPage ? 'default' : 'outline'} size="sm" className="w-8 h-8" onClick={() => setProjPage(p)}>{p}</Button>
                  ))}
                  {projPages > 5 && <span className="px-1 text-muted-foreground text-sm">...</span>}
                  {projPages > 5 && (
                    <Button variant={projPages === projPage ? 'default' : 'outline'} size="sm" className="w-8 h-8" onClick={() => setProjPage(projPages)}>{projPages}</Button>
                  )}
                  <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setProjPage(p => Math.min(projPages, p+1))} disabled={projPage === projPages}>
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground">{t('lab_page.no_projects')}</p>
          )}
        </div>

        {/* Contacts */}
        {(lab.contact_location || lab.contact_email) && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-6 text-center" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{t('contacts.title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {lab.contact_location && (
                <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{`${t('contacts.location')}:`}</div>
                    <div className="text-sm font-medium">{lab.contact_location}</div>
                  </div>
                </div>
              )}
              {lab.contact_email && (
                <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{`${t('contacts.email')}:`}</div>
                    <a href={`mailto:${lab.contact_email}`} className="text-sm font-medium text-primary hover:underline">{lab.contact_email}</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
