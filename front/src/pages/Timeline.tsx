import { useEffect, useState } from 'react';
import { History, Calendar, CheckCircle, XCircle, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/AppLayout';
import { useAppStore } from '@/lib/store';
import { progressApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TimelineEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useTranslation, LOCALE_BCP47 } from '@/i18n';

export default function Timeline() {
  const { t, locale } = useTranslation();
  const { toast } = useToast();
  const { user, timeline, setTimeline } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 15;

  useEffect(() => {
    if (!user) return;

    const fetchTimeline = async () => {
      setIsLoading(true);
      try {
        const data = await progressApi.getTimeline(user.id, days, 0, PAGE_SIZE);
        setTimeline(data.content);
        setHasMore(!data.last);
        setPage(0);
      } catch (error: any) {
        toast({
          title: t('toast.failedToLoad'),
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, [user, days]);

  const loadMoreTimeline = async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await progressApi.getTimeline(user.id, days, nextPage, PAGE_SIZE);
      setTimeline([...timeline, ...data.content]);
      setHasMore(!data.last);
      setPage(nextPage);
    } catch (error: any) {
      toast({ title: t('toast.failedToLoad'), description: error.message, variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  // Group entries by date
  const groupByDate = (entries: TimelineEntry[]) => {
    const groups: Record<string, TimelineEntry[]> = {};

    entries.forEach(entry => {
      const date = new Date(entry.practicedAt).toLocaleDateString(LOCALE_BCP47[locale], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return groups;
  };

  const grouped = groupByDate(timeline);
  const dates = Object.keys(grouped);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(LOCALE_BCP47[locale], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-success';
    if (accuracy >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('timeline.loading')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('timeline.title')}</h1>
            <p className="text-muted-foreground">
              {t('timeline.subtitle', { days })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('timeline.show')}</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-sm border rounded-lg px-3 py-1.5 bg-background"
            >
              <option value={7}>{t('timeline.days7')}</option>
              <option value={30}>{t('timeline.days30')}</option>
              <option value={90}>{t('timeline.days90')}</option>
            </select>
          </div>
        </div>

        {timeline.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('timeline.noSessions')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('timeline.noSessionsDesc')}
              </p>
              <Button asChild className="btn-gradient">
                <Link to="/lessons/new">{t('timeline.startLesson')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {dates.map((date) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-semibold">{date}</h2>
                  <span className="text-sm text-muted-foreground">
                    {t('timeline.sessions', { count: grouped[date].length })}
                  </span>
                </div>

                <div className="space-y-3 pl-6 border-l-2 border-border">
                  {grouped[date].map((entry) => (
                    <Link
                      key={entry.sessionId}
                      to={`/lessons/${entry.lessonId}`}
                      className="block"
                    >
                      <Card className="card-hover">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {entry.accuracy >= 80 ? (
                                  <CheckCircle className="w-4 h-4 text-success" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-destructive" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {formatTime(entry.practicedAt)}
                                </span>
                              </div>
                              <h4 className="font-medium mb-1">{entry.lessonTopic}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {entry.feedback}
                              </p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <span className={cn(
                                "text-2xl font-bold",
                                getAccuracyColor(entry.accuracy)
                              )}>
                                {entry.accuracy}%
                              </span>
                              {entry.errorCount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {t('timeline.errors', { count: entry.errorCount })}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={loadMoreTimeline}
                  disabled={loadingMore}
                  className="gap-2"
                >
                  {loadingMore ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {t('timeline.loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
