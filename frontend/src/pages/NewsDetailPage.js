import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar, Clock, ArrowRight, ArrowLeft,
  ChevronLeft, ChevronRight, ImageIcon
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { NewsCard } from '../components/NewsCard';
import { newsApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function NewsDetailPage() {
  const { id } = useParams();
  const { t, language } = useLanguage();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [relatedIndex, setRelatedIndex] = useState(0);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    if (!id) return;
    if (!article) setLoading(true);
    setRelatedIndex(0);
    Promise.all([
      newsApi.getById(id),
      newsApi.getRelated(id),
    ])
      .then(([articleRes, relatedRes]) => {
        setArticle(articleRes.data);
        setRelated(relatedRes.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, language]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parts[1];
    const day = parseInt(parts[2], 10);
    const monthName = t(`months.${month}`);
    return `${day} ${monthName}, ${year}`;
  };

  const getCategoryLabel = (cat) => {
    const label = t(`categories.${cat}`);
    return label !== `categories.${cat}` ? label : cat;
  };

  const VISIBLE_RELATED = 3;
  const maxRelatedIndex = Math.max(0, related.length - VISIBLE_RELATED);
  const visibleRelated = related.slice(relatedIndex, relatedIndex + VISIBLE_RELATED);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          <div><Skeleton className="h-8 w-3/4 mb-4" /><Skeleton className="h-4 w-1/2" /></div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground text-lg">{t('common.no_data')}</p>
        <Button asChild variant="outline">
          <Link to="/news">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('news_detail.back')}
          </Link>
        </Button>
      </div>
    );
  }

  const paragraphs = article.content ? article.content.split('\n\n').filter(Boolean) : [];

  return (
    <div className="min-h-screen">
      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link
          to="/news"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('news_detail.back')}
        </Link>
      </div>

      {/* Article header */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-accent text-accent-foreground font-medium">
                  {getCategoryLabel(article.category)}
                </Badge>
                <Badge variant="outline" className="font-normal">
                  <Clock className="w-3 h-3 mr-1" />
                  {article.reading_time} {t('news_detail.reading_time')}
                </Badge>
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold text-foreground leading-tight"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                data-testid="news-detail-title"
              >
                {article.title}
              </h1>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(article.date)}</span>
              </div>
              {article.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {article.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden border border-border shadow-md">
              {article.image_url ? (
                <img
                  src={article.image_url}
                  alt={article.title}
                  className="w-full object-cover min-h-[220px]"
                />
              ) : (
                <div className="img-placeholder min-h-[220px]">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Article content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {article.content_image ? (
            // Є content_image — сітка з фото і текстом
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
              <div className="rounded-2xl overflow-hidden border border-border">
                <img
                  src={article.content_image}
                  alt="Article content"
                  className="w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-muted-foreground leading-relaxed text-sm sm:text-base">{p}</p>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed text-sm sm:text-base">{p}</p>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Photo gallery */}
      {article.gallery_images?.length > 0 && (
        <section className="py-10 bg-muted/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2
              className="text-2xl font-bold text-foreground mb-8 text-center"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              data-testid="news-detail-gallery"
            >
              {t('news_detail.gallery_title')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {article.gallery_images.slice(0, 8).map((img, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer card-hover"
                  onClick={() => setLightboxImg(img)}
                >
                  <img
                    src={img}
                    alt={`Gallery ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related news */}
      {related.length > 0 && (
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2
                className="text-2xl font-bold text-foreground"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                {t('news_detail.read_also')}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-full w-9 h-9" onClick={() => setRelatedIndex(i => Math.max(0, i - 1))} disabled={relatedIndex <= 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="default" size="icon" className="rounded-full w-9 h-9" onClick={() => setRelatedIndex(i => Math.min(maxRelatedIndex, i + 1))} disabled={relatedIndex >= maxRelatedIndex}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {visibleRelated.map(item => <NewsCard key={item.id} news={item} />)}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt="Gallery"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/10"
            onClick={() => setLightboxImg(null)}
          >
            <ArrowLeft className="w-5 h-5 rotate-[135deg]" />
          </Button>
        </div>
      )}
    </div>
  );
}
