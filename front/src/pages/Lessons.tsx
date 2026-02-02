import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { LevelBadge } from '@/components/LevelBadge';
import { useAppStore } from '@/lib/store';
import { lessonApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation, LOCALE_BCP47 } from '@/i18n';

export default function Lessons() {
  const { t, locale } = useTranslation();
  const { toast } = useToast();
  const { user, lessons, setLessons } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 12;

  useEffect(() => {
    if (!user) return;

    const fetchLessons = async () => {
      setIsLoading(true);
      try {
        const data = await lessonApi.getByUser(user.id, 0, PAGE_SIZE);
        setLessons(data.content);
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

    fetchLessons();
  }, [user]);

  const loadMore = async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await lessonApi.getByUser(user.id, nextPage, PAGE_SIZE);
      setLessons([...lessons, ...data.content]);
      setHasMore(!data.last);
      setPage(nextPage);
    } catch (error: any) {
      toast({ title: t('toast.failedToLoad'), description: error.message, variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  const completedLessons = lessons.filter(l => l.completed);
  const pendingLessons = lessons.filter(l => !l.completed);

  const LessonCard = ({ lesson }: { lesson: typeof lessons[0] }) => (
    <Link
      to={`/lessons/${lesson.id}`}
      className="block"
    >
      <Card className="card-hover h-full">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {lesson.completed ? (
                <CheckCircle className="w-5 h-5 text-success shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <LevelBadge level={lesson.level} size="sm" />
              {lesson.targetLanguage && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {lesson.targetLanguage}
                </span>
              )}
            </div>
            {lesson.bestScore > 0 && (
              <span className={`text-sm font-medium ${lesson.bestScore >= 80 ? 'text-success' : 'text-muted-foreground'}`}>
                {lesson.bestScore}%
              </span>
            )}
          </div>

          <h3 className="font-semibold mb-2 line-clamp-2">{lesson.topic}</h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {lesson.simplifiedText}
          </p>

          <div className="flex flex-wrap gap-1">
            {lesson.grammarFocus.slice(0, 3).map((rule) => (
              <span
                key={rule}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
              >
                {rule}
              </span>
            ))}
            {lesson.grammarFocus.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                +{lesson.grammarFocus.length - 3}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
            <span>{t('common.attempts', { count: lesson.timesAttempted })}</span>
            {lesson.completedAt && (
              <span>{t('lessons.completedOn', { date: new Date(lesson.completedAt).toLocaleDateString(LOCALE_BCP47[locale]) })}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('lessons.title')}</h1>
            <p className="text-muted-foreground">
              {t('lessons.summary', { total: lessons.length, completed: completedLessons.length })}
            </p>
          </div>
          <Button asChild className="btn-gradient gap-2">
            <Link to="/lessons/new">
              <Plus className="w-4 h-4" />
              {t('lessons.newLesson')}
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t('lessons.loading')}</p>
            </div>
          </div>
        ) : lessons.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('lessons.noLessons')}</h3>
              <p className="text-muted-foreground mb-6">
                {t('lessons.noLessonsDesc')}
              </p>
              <Button asChild className="btn-gradient gap-2">
                <Link to="/lessons/new">
                  <Plus className="w-4 h-4" />
                  {t('lessons.createFirst')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">{t('lessons.tabAll', { count: lessons.length })}</TabsTrigger>
                <TabsTrigger value="pending">{t('lessons.tabPending', { count: pendingLessons.length })}</TabsTrigger>
                <TabsTrigger value="completed">{t('lessons.tabCompleted', { count: completedLessons.length })}</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lessons.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pending" className="mt-6">
                {pendingLessons.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    {t('lessons.noPending')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingLessons.map((lesson) => (
                      <LessonCard key={lesson.id} lesson={lesson} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-6">
                {completedLessons.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    {t('lessons.noCompleted')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedLessons.map((lesson) => (
                      <LessonCard key={lesson.id} lesson={lesson} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  {t('common.loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
