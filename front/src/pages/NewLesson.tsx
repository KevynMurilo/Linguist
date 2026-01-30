import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AppLayout } from '@/components/AppLayout';
import { LevelBadge } from '@/components/LevelBadge';
import { useAppStore } from '@/lib/store';
import { lessonApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/i18n';

export default function NewLesson() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, aiConfig, setCurrentLesson } = useAppStore();
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const topicSuggestions = [
    t('topics.dailyRoutines'),
    t('topics.orderingFood'),
    t('topics.favoriteMovie'),
    t('topics.planningVacation'),
    t('topics.jobInterview'),
    t('topics.techTrends'),
    t('topics.hobbies'),
    t('topics.family'),
  ];

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: t('toast.topicRequired'),
        description: t('toast.topicRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!aiConfig || !aiConfig.apiKey) {
      toast({
        title: t('toast.aiNotConfigured'),
        description: t('toast.aiNotConfiguredDesc'),
        variant: 'destructive',
      });
      navigate('/settings');
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      const lesson = await lessonApi.generate({
        userId: user.id,
        topic: topic.trim(),
      });

      setCurrentLesson(lesson);
      toast({
        title: t('toast.lessonCreated'),
        description: t('toast.lessonCreatedDesc'),
      });
      navigate(`/lessons/${lesson.id}`);
    } catch (error: any) {
      const message = error.status === 400
        ? 'Invalid request. Check if your API Key is correct.'
        : error.status === 502
        ? 'AI provider error. Please check your API key or try another provider.'
        : error.message || 'Failed to generate lesson.';

      toast({
        title: t('toast.generationFailed'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/lessons">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('newLesson.backToLessons')}
          </Link>
        </Button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4 shadow-glow">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('newLesson.title')}</h1>
          <p className="text-muted-foreground">
            {t('newLesson.subtitle')}
          </p>
          {user && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">{t('newLesson.yourLevel')}</span>
              <LevelBadge level={user.level} />
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('newLesson.whatToLearn')}</CardTitle>
            <CardDescription>
              {t('newLesson.whatToLearnDesc', { level: user?.level || 'current' })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={t('newLesson.placeholder')}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={4}
              className="resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>{t('newLesson.charCount', { count: topic.length })}</span>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">{t('newLesson.needInspiration')}</p>
              <div className="flex flex-wrap gap-2">
                {topicSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setTopic(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full btn-gradient gap-2"
              size="lg"
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
            >
              {isLoading ? (
                <span key="loading-state" className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('newLesson.generating')}
                </span>
              ) : (
                <span key="idle-state" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {t('newLesson.generateLesson')}
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {!aiConfig && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="pt-6">
              <p className="text-sm text-center">
                <span className="font-medium">{t('newLesson.aiNotConfigured')}</span>{' '}
                <Link to="/settings" className="text-primary hover:underline">
                  {t('newLesson.setupAI')}
                </Link>{' '}
                {t('newLesson.toGenerate')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
