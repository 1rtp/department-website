import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { User } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const StaffCard = ({ member }) => {
  const { t, language } = useLanguage();
  const displayName = language === 'en' && member.name_en ? member.name_en : member.name;

  return (
    <div
      className="bg-card rounded-xl border border-border card-hover overflow-hidden flex flex-col items-center p-6 text-center gap-3"
      data-testid="staff-card"
    >
      {/* Avatar */}
      <div className="w-32 h-32 rounded-full overflow-hidden ring-2 ring-primary/15 ring-offset-2 flex-shrink-0">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <User className="w-14 h-14 text-primary/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-1 w-full">
        <h3
          className="font-semibold text-foreground leading-tight text-sm"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          {displayName}
        </h3>
        <p className="text-xs text-muted-foreground">{member.position}</p>
        {member.degree && (
          <p className="text-xs text-muted-foreground/80">{member.degree}</p>
        )}
      </div>

      {/* Specialization */}
      {member.specialization && (
        <div className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-xs text-muted-foreground font-medium">
            {t('staff_page.specialization')}
          </span>
          <Badge variant="secondary" className="text-xs text-center leading-snug py-1 px-2">
            {member.specialization}
          </Badge>
        </div>
      )}

      {/* Button - navigate to profile */}
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-lg mt-auto transition-colors hover:bg-secondary"
        asChild
        data-testid="staff-card-details-button"
      >
        <Link to={`/staff/${member.id}`}>
          {t('staff_page.more_btn')}
        </Link>
      </Button>
    </div>
  );
};