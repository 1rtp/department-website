import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { NewsCard } from '../components/NewsCard';
import { newsApi } from '../utils/api';
import { useLanguage } from '../contexts/LanguageContext';

const CATEGORIES = [
  { key: 'all', labelKey: 'news_page.categories.all' },
  { key: 'general', labelKey: 'news_page.categories.general' },
  { key: 'competitions', labelKey: 'news_page.categories.competitions' },
  { key: 'for_students', labelKey: 'news_page.categories.for_students' },
  { key: 'achievements', labelKey: 'news_page.categories.achievements' },
  { key: 'for_applicants', labelKey: 'news_page.categories.for_applicants' },
  { key: 'international_cooperation', labelKey: 'news_page.categories.international_cooperation' },
  { key: 'academic_mobility', labelKey: 'news_page.categories.academic_mobility' },
  { key: 'public_discussion', labelKey: 'news_page.categories.public_discussion' },
  { key: 'events', labelKey: 'news_page.categories.events' },
];

const LIMIT = 9;

export default function NewsListPage() {
  const { t, language } = useLanguage();
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const params = { page, limit: LIMIT };
    if (category !== 'all') params.category = category;
    if (!data) { setLoading(true); } else { setRefreshing(true); }
    newsApi.getAll(params)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [category, page, language]);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  const renderPagination = () => {
    if (!data || data.pages <= 1) return null;
    const pages = [];
    if (data.pages <= 7) {
      for (let i = 1; i <= data.pages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(data.pages - 1, page + 1); i++) pages.push(i);
      if (page < data.pages - 2) pages.push('...');
      pages.push(data.pages);
    }
    return (
      <div className="flex items-center gap-1 justify-center mt-10" data-testid="pagination">
        <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} data-testid="pagination-prev">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground text-sm">...</span>
        ) : (
          <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" className="w-9 h-9 rounded-lg" onClick={() => setPage(p)}>{p}</Button>
        ))}
        <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg" onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} data-testid="pagination-next">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="bg-muted/40 border-b border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Newspaper className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {t('news_page.title')}
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('news_page.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category tabs - scrollable row */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 max-w-6xl mx-auto" data-testid="staff-filter-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border whitespace-nowrap ${
                category === cat.key
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : data?.items?.length ? (
          <div className={refreshing ? 'opacity-50 transition-opacity duration-200' : 'transition-opacity duration-200'}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.items.map(item => <NewsCard key={item.id} news={item} />)}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('common.no_data')}</p>
          </div>
        )}

        {renderPagination()}
      </div>
    </div>
  );
}
