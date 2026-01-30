import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { MasteryBar } from '@/components/MasteryBar';
import { useAppStore } from '@/lib/store';
import { masteryApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CompetenceResponse, getMasteryLevel, getMasteryLabelKey } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation, LOCALE_BCP47 } from '@/i18n';

export default function Mastery() {
  const { t, locale } = useTranslation();
  const { toast } = useToast();
  const { user, competences, setCompetences } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchCompetences = async () => {
      setIsLoading(true);
      try {
        const data = await masteryApi.getByUser(user.id);
        setCompetences(data);
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

    fetchCompetences();
  }, [user]);

  // Group competences by level
  const groupByLevel = (comps: CompetenceResponse[]) => {
    const groups: Record<string, CompetenceResponse[]> = {
      mastered: [],
      good: [],
      progressing: [],
      weak: [],
      critical: [],
    };

    comps.forEach(c => {
      const level = getMasteryLevel(c.masteryLevel);
      groups[level].push(c);
    });

    return groups;
  };

  const grouped = groupByLevel(competences);
  const sortedCompetences = [...competences].sort((a, b) => a.masteryLevel - b.masteryLevel);

  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return t('time.never');
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('time.today');
    if (diffDays === 1) return t('time.yesterday');
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays });
    if (diffDays < 30) return t('time.weeksAgo', { count: Math.floor(diffDays / 7) });
    return t('time.monthsAgo', { count: Math.floor(diffDays / 30) });
  };

  const CompetenceCard = ({ competence }: { competence: CompetenceResponse }) => {
    const level = getMasteryLevel(competence.masteryLevel);
    const trend = competence.practiceCount > 0
      ? (competence.failCount / competence.practiceCount > 0.5 ? 'down' : competence.masteryLevel >= 70 ? 'up' : 'stable')
      : 'stable';

    return (
      <div className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium">{competence.ruleName}</h4>
            <p className="text-xs text-muted-foreground">
              {t('mastery.practiced', { count: competence.practiceCount, time: getRelativeTime(competence.lastPracticed) })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-success" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive" />}
            {trend === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        <MasteryBar value={competence.masteryLevel} showPercentage size="sm" />
        {competence.failCount > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            {t('mastery.mistakes', { count: competence.failCount })}
          </p>
        )}
      </div>
    );
  };

  const LevelSummaryCard = ({ level, count, color }: { level: string; count: number; color: string }) => (
    <div className={cn(
      "p-4 rounded-lg text-center",
      color
    )}>
      <p className="text-2xl font-bold text-white">{count}</p>
      <p className="text-xs text-white/80 capitalize">{t(`masteryLevel.${level}` as any)}</p>
    </div>
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('mastery.loading')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{t('mastery.title')}</h1>
          <p className="text-muted-foreground">
            {t('mastery.subtitle')}
          </p>
        </div>

        {competences.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('mastery.noData')}</h3>
              <p className="text-muted-foreground">
                {t('mastery.noDataDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-3">
              <LevelSummaryCard level="mastered" count={grouped.mastered.length} color="bg-mastery-mastered" />
              <LevelSummaryCard level="good" count={grouped.good.length} color="bg-mastery-good" />
              <LevelSummaryCard level="progressing" count={grouped.progressing.length} color="bg-mastery-progressing" />
              <LevelSummaryCard level="weak" count={grouped.weak.length} color="bg-mastery-weak" />
              <LevelSummaryCard level="critical" count={grouped.critical.length} color="bg-mastery-critical" />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">{t('mastery.tabAll', { count: competences.length })}</TabsTrigger>
                <TabsTrigger value="weak">{t('mastery.tabWeak', { count: grouped.weak.length + grouped.critical.length })}</TabsTrigger>
                <TabsTrigger value="mastered">{t('mastery.tabMastered', { count: grouped.mastered.length })}</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('mastery.allRules')}</CardTitle>
                    <CardDescription>{t('mastery.allRulesDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sortedCompetences.map((competence) => (
                        <CompetenceCard key={competence.id} competence={competence} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="weak" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('mastery.rulesNeedPractice')}</CardTitle>
                    <CardDescription>{t('mastery.rulesNeedPracticeDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {grouped.weak.length + grouped.critical.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {t('mastery.noWeak')}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...grouped.critical, ...grouped.weak].map((competence) => (
                          <CompetenceCard key={competence.id} competence={competence} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mastered" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('mastery.masteredRules')}</CardTitle>
                    <CardDescription>{t('mastery.masteredRulesDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {grouped.mastered.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        {t('mastery.keepPracticing')}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {grouped.mastered.map((competence) => (
                          <CompetenceCard key={competence.id} competence={competence} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
