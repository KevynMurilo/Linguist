import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Target,
  TrendingUp,
  Calendar,
  ChevronRight,
  Sparkles,
  Trophy,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { MasteryBar, ProgressRing } from '@/components/MasteryBar';
import { LevelBadge } from '@/components/LevelBadge';
import { StreakDisplay } from '@/components/StreakDisplay';
import { useAppStore } from '@/lib/store';
import { progressApi, masteryApi, lessonApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/i18n';

export default function Dashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, dashboard, setDashboard, competences, setCompetences, lessons, setLessons } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [dashboardData, competenceData, lessonData] = await Promise.all([
          progressApi.getDashboard(user.id),
          masteryApi.getByUser(user.id, 0, 100),
          lessonApi.getByUser(user.id, 0, 3),
        ]);
        setDashboard(dashboardData);
        setCompetences(competenceData.content);
        setLessons(lessonData.content);
      } catch (error: any) {
        toast({
          title: t('toast.failedToLoad'),
          description: error.message || t('toast.failedToLoad'),
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCheckLevel = async () => {
    if (!user) return;

    try {
      const result = await progressApi.checkLevel(user.id);
      if (result.promoted) {
        toast({
          title: t('toast.levelUp'),
          description: result.message,
        });
        // Refresh dashboard
        const newDashboard = await progressApi.getDashboard(user.id);
        setDashboard(newDashboard);
      } else {
        toast({
          title: t('toast.keepPracticing'),
          description: result.message,
        });
      }
    } catch (error: any) {
      toast({
        title: t('toast.errorCheckLevel'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Loading state
  if (isLoading || !dashboard) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('dashboard.loading')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Get weak rules for display
  const weakRules = competences
    .filter(c => c.masteryLevel < 60)
    .sort((a, b) => a.masteryLevel - b.masteryLevel)
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t('dashboard.welcome', { name: user?.name.split(' ')[0] })}</h1>
            <p className="text-muted-foreground">
              {dashboard.eligibleForPromotion
                ? t('dashboard.readyToLevelUp')
                : t('dashboard.keepPracticing')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StreakDisplay
              currentStreak={dashboard.currentStreak}
              longestStreak={dashboard.longestStreak}
              showRecord
              size="lg"
            />
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level Progress Card */}
          <Card className="md:col-span-1 card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                {t('dashboard.levelProgress')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-4">
              <div className="relative mb-4">
                <ProgressRing value={dashboard.averageMastery} size={140}>
                  <div className="text-center">
                    <LevelBadge level={dashboard.currentLevel} size="lg" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('dashboard.mastery', { value: Math.round(dashboard.averageMastery) })}
                    </p>
                  </div>
                </ProgressRing>
              </div>
              {dashboard.nextLevel && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t('dashboard.next')} <LevelBadge level={dashboard.nextLevel} size="sm" />
                  </p>
                  <Button
                    size="sm"
                    variant={dashboard.eligibleForPromotion ? 'default' : 'outline'}
                    onClick={handleCheckLevel}
                    className={dashboard.eligibleForPromotion ? 'btn-gradient' : ''}
                  >
                    {dashboard.eligibleForPromotion ? t('dashboard.levelUp') : t('dashboard.checkProgress')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <StatCard
              title={t('dashboard.lessonsCompleted')}
              value={`${dashboard.lessonsCompleted}/${dashboard.totalLessons}`}
              description={t('dashboard.completionRate', { value: dashboard.lessonsCompleted > 0 ? Math.round((dashboard.lessonsCompleted / dashboard.totalLessons) * 100) : 0 })}
              icon={BookOpen}
              variant="primary"
            />
            <StatCard
              title={t('dashboard.averageAccuracy')}
              value={`${Math.round(dashboard.averageAccuracy)}%`}
              description={t('dashboard.basedOnSessions')}
              icon={Target}
              variant="success"
            />
            <StatCard
              title={t('dashboard.rulesMastered')}
              value={dashboard.rulesMastered}
              description={t('dashboard.needAttention', { count: dashboard.rulesWeak })}
              icon={TrendingUp}
              variant="accent"
            />
            <StatCard
              title={t('dashboard.sessionsThisWeek')}
              value={dashboard.sessionsLast7Days}
              description={t('dashboard.totalSessions', { count: dashboard.totalSessions })}
              icon={Calendar}
            />
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* New Lesson CTA */}
          <Card className="card-hover bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('dashboard.startNewLesson')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.startNewLessonDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="btn-gradient gap-2">
                <Link to="/lessons/new">
                  {t('dashboard.createLesson')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Weak Areas */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                {t('dashboard.focusAreas')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.focusAreasDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {weakRules.length > 0 ? (
                <>
                  {weakRules.slice(0, 3).map((rule) => (
                    <MasteryBar
                      key={rule.id}
                      value={rule.masteryLevel}
                      label={rule.ruleName}
                      size="sm"
                    />
                  ))}
                  {weakRules.length > 3 && (
                    <Button variant="ghost" size="sm" asChild className="w-full">
                      <Link to="/mastery">
                        {t('dashboard.viewAllWeak', { count: weakRules.length })}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('dashboard.noWeakAreas')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Lessons */}
        {lessons.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('dashboard.recentLessons')}</CardTitle>
                <CardDescription>{t('dashboard.continueWhereLeft')}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/lessons">
                  {t('dashboard.viewAll')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {lessons.slice(0, 3).map((lesson) => (
                  <Link
                    key={lesson.id}
                    to={`/lessons/${lesson.id}`}
                    className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium line-clamp-1">{lesson.topic}</h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <LevelBadge level={lesson.level} size="sm" />
                        {lesson.targetLanguage && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {lesson.targetLanguage}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {lesson.completed ? (
                        <span className="text-success">{`✓ ${t('common.completed')}`}</span>
                      ) : (
                        <span>{t('common.attempts', { count: lesson.timesAttempted })}</span>
                      )}
                      {lesson.bestScore > 0 && (
                        <span>• {t('dashboard.best', { value: lesson.bestScore })}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lesson.grammarFocus.slice(0, 2).map((rule) => (
                        <span
                          key={rule}
                          className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                        >
                          {rule}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
