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
  AlertTriangle,
  PenLine,
  Headphones,
  History,
  CheckCircle,
  RotateCcw,
  BookMarked,
  Flame
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
import { TimelineEntry, ActivityType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/i18n';

export default function Dashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, dashboard, setDashboard, competences, setCompetences, lessons, setLessons, timeline, setTimeline } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [dashboardData, competenceData, lessonData, timelineData] = await Promise.all([
          progressApi.getDashboard(user.id),
          masteryApi.getByUser(user.id, 0, 100),
          lessonApi.getByUser(user.id, 0, 3),
          progressApi.getTimeline(user.id, 7, 0, 5),
        ]);
        setDashboard(dashboardData);
        setCompetences(competenceData.content || []);
        setLessons(lessonData.content || []);
        setTimeline(timelineData.content || []);
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
            {/* Daily Goal Ring */}
            <div className="relative">
              <ProgressRing
                value={dashboard.dailyGoalTarget > 0 ? Math.min(100, (dashboard.dailyGoalProgress / dashboard.dailyGoalTarget) * 100) : 0}
                size={64}
                strokeWidth={4}
              >
                <div className="text-center">
                  <Flame className={`w-4 h-4 mx-auto ${dashboard.dailyGoalProgress >= dashboard.dailyGoalTarget ? 'text-success' : 'text-muted-foreground'}`} />
                  <p className="text-[10px] font-bold">{dashboard.dailyGoalProgress}/{dashboard.dailyGoalTarget}</p>
                </div>
              </ProgressRing>
            </div>
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-hover bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('dashboard.startNewLesson')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('dashboard.startNewLessonDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild className="btn-gradient gap-2 w-full">
                <Link to="/lessons/new">
                  {t('dashboard.createLesson')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-hover bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PenLine className="w-5 h-5 text-purple-500" />
                {t('dashboard.practiceWriting')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('dashboard.practiceWritingDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild variant="outline" className="gap-2 w-full border-purple-500/30 hover:bg-purple-500/10">
                <Link to="/writing">
                  {t('nav.writing')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="card-hover bg-gradient-to-br from-orange-500/5 to-orange-500/10 border-orange-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Headphones className="w-5 h-5 text-orange-500" />
                {t('dashboard.practiceListening')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('dashboard.practiceListeningDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild variant="outline" className="gap-2 w-full border-orange-500/30 hover:bg-orange-500/10">
                <Link to="/listening">
                  {t('nav.listening')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Review & Vocabulary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Due Reviews */}
          <Card className="card-hover bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RotateCcw className="w-5 h-5 text-amber-500" />
                {t('dashboard.dueReviews')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('dashboard.dueReviewsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-3xl font-bold text-amber-500 mb-2">{dashboard.dueReviewCount}</p>
              <p className="text-xs text-muted-foreground mb-3">{t('dashboard.rulesDueForReview')}</p>
              <Button asChild variant="outline" className="gap-2 w-full border-amber-500/30 hover:bg-amber-500/10">
                <Link to="/mastery">
                  {t('dashboard.reviewNow')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Vocabulary */}
          <Card className="card-hover bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookMarked className="w-5 h-5 text-emerald-500" />
                {t('dashboard.vocabulary')}
              </CardTitle>
              <CardDescription className="text-xs">
                {t('dashboard.vocabularyDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button asChild variant="outline" className="gap-2 w-full border-emerald-500/30 hover:bg-emerald-500/10">
                <Link to="/vocabulary">
                  {t('dashboard.studyVocabulary')}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Weak Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                {t('dashboard.recentActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeline.length > 0 ? (
                <>
                  {timeline.slice(0, 4).map((entry) => {
                    const Icon = entry.type === 'LESSON' ? BookOpen : entry.type === 'WRITING' ? PenLine : Headphones;
                    const colorClass = entry.type === 'LESSON' ? 'text-blue-500' : entry.type === 'WRITING' ? 'text-purple-500' : 'text-orange-500';
                    return (
                      <Link
                        key={entry.sessionId}
                        to={entry.type === 'LESSON' && entry.lessonId ? `/lessons/${entry.lessonId}` : entry.type === 'WRITING' ? `/writing/${entry.sessionId}` : `/listening/${entry.sessionId}`}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-1.5 rounded-lg bg-muted ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.practicedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {entry.score >= 80 ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : null}
                          <span className={`text-sm font-bold ${entry.score >= 80 ? 'text-success' : entry.score >= 60 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {entry.score}%
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link to="/timeline">
                      {t('dashboard.viewHistory')}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('dashboard.noRecentActivity')}
                </p>
              )}
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
