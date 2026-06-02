import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, ArrowRight, ChevronLeft, ChevronRight,
  Phone, Mail, MapPin, Clock, Plus, X,
  ShieldCheck, Cpu, Users, GraduationCap, ImageIcon
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { NewsCard } from '../components/NewsCard';
import { newsApi, departmentApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

const HERO_IMAGE_1 = 'https://images.unsplash.com/photo-1620650764196-fd37ec58c687?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const HERO_IMAGE_2 = 'https://images.unsplash.com/photo-1591123120675-6f7f1aae0e5b?q=80&w=1169&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const ABOUT_IMAGE = 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
const HISTORY_IMAGE = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const ICON_MAP = {
  ShieldCheck: <ShieldCheck className="w-7 h-7 text-primary" />,
  Cpu: <Cpu className="w-7 h-7 text-primary" />,
  Users: <Users className="w-7 h-7 text-primary" />,
  GraduationCap: <GraduationCap className="w-7 h-7 text-primary" />,
};

export default function MainHomePage() {
  const { t, language } = useLanguage();
  const [deptInfo, setDeptInfo] = useState(null);
  const [news, setNews] = useState([]);
  const [loadingDept, setLoadingDept] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [newsIndex, setNewsIndex] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    departmentApi.getInfo()
      .then(r => setDeptInfo(r.data))
      .catch(() => {})
      .finally(() => setLoadingDept(false));
    newsApi.getAll({ limit: 6 })
      .then(r => setNews(r.data.items || []))
      .catch(() => {})
      .finally(() => setLoadingNews(false));
  }, [language]);

  const VISIBLE = 3;
  const maxIndex = Math.max(0, news.length - VISIBLE);
  const prevNews = () => setNewsIndex(i => Math.max(0, i - 1));
  const nextNews = () => setNewsIndex(i => Math.min(maxIndex, i + 1));
  const visibleNews = news.slice(newsIndex, newsIndex + VISIBLE);

  const contacts = deptInfo?.contacts;
  const faqItems = deptInfo?.faq_items || [];
  const features = deptInfo?.features || [];

  return (
    <div className="overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative hero-gradient min-h-[80vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6 z-10">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight tracking-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {t('hero.title')}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="rounded-full font-medium">
                <Link to="/education">{t('hero.btn_education')}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full font-medium">
                <Link to="/staff">{t('hero.btn_staff')}</Link>
              </Button>
            </div>
          </div>
          {/* Hero images */}
          <div className="relative hidden lg:block h-[420px]">
            <div className="absolute right-0 top-0 w-[75%] h-[70%] rounded-2xl overflow-hidden border border-border shadow-xl z-10">
              <img src={HERO_IMAGE_1} alt="University" className="w-full h-full object-cover" />
            </div>
            <div className="absolute left-0 bottom-0 w-[65%] h-[60%] rounded-2xl overflow-hidden border border-border shadow-lg">
              <img src={HERO_IMAGE_2} alt="Campus" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl overflow-hidden border border-border shadow-md">
              <img src={ABOUT_IMAGE} alt="About" className="w-full h-full object-cover min-h-[280px]" />
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-2"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {t('about.title')}
                </h2>
                <p className="text-lg text-muted-foreground">{t('about.subtitle')}</p>
              </div>
              {loadingDept ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground leading-relaxed">
                    {deptInfo?.about_text1 || t('home.about_text1_fallback')}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {deptInfo?.about_text2 || t('home.about_text2_fallback')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============ HISTORY ============ */}
      <section className="py-16 sm:py-20 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-5 order-2 lg:order-1">
              <div>
                <h2
                  className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-2"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {t('history.title')}
                </h2>
                <p className="text-lg text-muted-foreground">{t('history.subtitle')}</p>
              </div>
              {loadingDept ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <p className="text-muted-foreground leading-relaxed">
                  {deptInfo?.history_text || t('home.history_text_fallback')}
                </p>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden border border-border shadow-md order-1 lg:order-2">
              <img src={HISTORY_IMAGE} alt="History" className="w-full h-full object-cover min-h-[280px]" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY CHOOSE US ============ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {t('why_choose.title')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {loadingDept ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))
            ) : (
              (features.length ? features : [
                { icon: 'ShieldCheck', title: t('home.why1_title'), subtitle: t('home.why1_subtitle'), text: t('home.why1_text') },
                { icon: 'Cpu', title: t('home.why2_title'), subtitle: t('home.why2_subtitle'), text: t('home.why2_text') },
                { icon: 'Users', title: t('home.why3_title'), subtitle: t('home.why3_subtitle'), text: t('home.why3_text') },
                { icon: 'GraduationCap', title: t('home.why4_title'), subtitle: t('home.why4_subtitle'), text: t('home.why4_text') },
              ]).map((f, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-5 card-hover flex flex-col gap-3">
                  <div>{ICON_MAP[f.icon] || <ShieldCheck className="w-7 h-7 text-primary" />}</div>
                  <div>
                    <div
                      className="font-bold text-foreground text-base leading-tight mb-1"
                      style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                    >
                      {f.title}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium mb-1.5">{f.subtitle}</div>
                    <div className="text-sm text-muted-foreground leading-relaxed">{f.text}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============ NEWS CAROUSEL ============ */}
      <section className="py-16 sm:py-20 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-foreground mb-2"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {t('news_section.title')}
              </h2>
              <p className="text-muted-foreground max-w-xl">{t('news_section.subtitle')}</p>
            </div>
            <div className="flex gap-2 mt-1 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full w-10 h-10"
                onClick={prevNews}
                disabled={newsIndex === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="rounded-full w-10 h-10"
                onClick={nextNews}
                disabled={newsIndex >= maxIndex}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {loadingNews ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-xl" />)}
            </div>
          ) : news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {visibleNews.map(item => <NewsCard key={item.id} news={item} />)}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">{t('common.no_data')}</p>
          )}

          <div className="flex justify-center mt-8">
            <Button asChild variant="outline" className="rounded-full font-medium">
              <Link to="/news">{t('nav.news')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {t('faq.title')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{t('faq.subtitle')}</p>
          </div>

          <div className="space-y-0" data-testid="homepage-faq-accordion">
            {loadingDept ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-none" />)
            ) : (
              (faqItems.length ? faqItems : [
                { question: t('home.faq1_q'), answer: t('home.faq1_a') },
                { question: t('home.faq2_q'), answer: t('home.faq2_a') },
                { question: t('home.faq3_q'), answer: t('home.faq3_a') },
                { question: t('home.faq4_q'), answer: t('home.faq4_a') },
              ]).map((faq, i) => (
                <div key={i} className="border-b border-border first:border-t">
                  <button
                    className="w-full flex items-center gap-4 py-4 text-left hover:text-primary transition-colors"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    data-testid="faq-item-trigger"
                  >
                    <span className="faq-number text-2xl font-bold text-primary/30 w-10 flex-shrink-0" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-medium text-foreground flex-1">{faq.question}</span>
                    {openFaq === i
                      ? <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      : <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    }
                  </button>
                  {openFaq === i && (
                    <div className="pb-4 pl-14 text-muted-foreground leading-relaxed text-sm" data-testid="faq-item-content">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============ CONTACTS ============ */}
      <section className="py-16 sm:py-20 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {t('contacts.title')}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[{
              icon: <Mail className="w-6 h-6 text-primary" />,
              label: t('contacts.email'),
              value: contacts?.email || 'kafedra@gmail.com',
              testId: 'contact-email',
            }, {
              icon: <Phone className="w-6 h-6 text-primary" />,
              label: t('contacts.phone'),
              value: contacts?.phone || '+380 44 123-45-67',
              testId: 'contact-phone',
            }, {
              icon: <MapPin className="w-6 h-6 text-primary" />,
              label: t('contacts.location'),
              value: contacts?.location || t('home.location_fallback'),
              testId: 'contact-address',
            }, {
              icon: <Clock className="w-6 h-6 text-primary" />,
              label: t('contacts.hours'),
              value: contacts?.hours || t('home.hours_fallback'),
              testId: 'contact-hours',
            }].map((c, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border border-border p-5 card-hover flex flex-col gap-3"
                data-testid="contact-info-block"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  {c.icon}
                </div>
                <div>
                  <div className="text-xs text-muted-foreground font-medium mb-0.5">{c.label}</div>
                  <div className="text-sm font-medium text-foreground" data-testid={c.testId}>{c.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
