import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ImageIcon } from 'lucide-react';
import { Badge } from './ui/badge';
import { useLanguage } from '../contexts/LanguageContext';

export const NewsCard = ({ news }) => {
  const { t } = useLanguage();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const monthName = t(`months.${parts[1]}`);
    return `${parseInt(parts[2], 10)} ${monthName}, ${parts[0]}`;
  };

  const getCategoryLabel = (cat) => {
    const label = t(`categories.${cat}`);
    return label !== `categories.${cat}` ? label : cat;
  };

  return (
    <div
      className="group bg-card rounded-xl border border-border card-hover overflow-hidden flex flex-col h-full transition-all duration-300"
      data-testid="news-card"
    >
      {/* Image / Placeholder Area */}
      <div className="relative overflow-hidden bg-muted/50" style={{ aspectRatio: '16/9' }}>
        {news.image_url ? (
          <img
            src={news.image_url}
            alt={news.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          /* Стилізована заглушка */
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted to-secondary/30 text-muted-foreground/40 gap-2">
            <div className="p-4 rounded-full bg-background/50 backdrop-blur-sm border border-border/50 shadow-inner">
              <ImageIcon className="w-10 h-10 transition-transform duration-500 group-hover:scale-125 group-hover:rotate-6" />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-widest opacity-60">
              No Image Preview
            </span>
          </div>
        )}
        
        <Badge 
          className="absolute top-3 right-3 bg-accent text-accent-foreground font-bold text-[10px] px-2 py-0.5 shadow-sm border-none">
          {getCategoryLabel(news.category)}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(news.date)}</span>
        </div>
        
        <h3
          className="font-bold text-foreground line-clamp-2 leading-tight text-sm sm:text-base group-hover:text-primary transition-colors"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {news.title}
        </h3>

        <div className="mt-auto pt-3">
          <Link
            to={`/news/${news.id}`}
            className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1 hover:gap-2 transition-all"
          >
            {t('common.read_more')}
            <span>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
};