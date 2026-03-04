import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchX, Home, Ticket } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 sm:py-16">
      <div className="max-w-md w-full text-center">
        {/* Decorative 404 with subtle animation */}
        <div className="relative mb-6">
          <span
            className="text-7xl sm:text-8xl font-bold tracking-tighter text-muted-foreground/20 select-none"
            aria-hidden
          >
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/5 border border-border flex items-center justify-center">
              <SearchX className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" aria-hidden />
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
          {t('notFound.title')}
        </h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          {t('notFound.description')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button asChild size="lg" className="min-w-[180px]">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" aria-hidden />
              {t('notFound.goHome')}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[180px]">
            <Link to="/">
              <Ticket className="w-4 h-4 mr-2" aria-hidden />
              {t('notFound.browseEvents')}
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {t('notFound.hint')}
        </p>
      </div>
    </div>
  );
}
