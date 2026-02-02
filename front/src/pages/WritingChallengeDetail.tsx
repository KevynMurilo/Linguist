import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  PenLine, Loader2, CheckCircle, XCircle, RotateCcw,
  AlertTriangle, MessageSquare, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { LevelBadge } from '@/components/LevelBadge';
import { useAppStore } from '@/lib/store';
import { challengeApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ChallengeResponseDTO, WritingAnalysis } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

type Phase = 'loading' | 'writing' | 'analyzing' | 'results';

export default function WritingChallengeDetail() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, aiConfig } = useAppStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [challenge, setChallenge] = useState<ChallengeResponseDTO | null>(null);
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadChallenge = async () => {
      try {
        const result = await challengeApi.getById(id);
        setChallenge(result);
        if (result.completed && result.analysisJson) {
          setAnalysis(JSON.parse(result.analysisJson));
          setText(result.studentResponse || '');
          setPhase('results');
        } else {
          setText(result.studentResponse || '');
          setPhase('writing');
        }
      } catch (error: any) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        navigate('/writing');
      }
    };
    loadChallenge();
  }, [id]);

  const handleSubmit = async () => {
    if (!user || !challenge || !text.trim()) return;
    setPhase('analyzing');
    try {
      const result = await challengeApi.submitWriting({
        userId: user.id,
        challengeId: challenge.id,
        text: text.trim(),
      });
      setChallenge(result);
      if (result.analysisJson) {
        setAnalysis(JSON.parse(result.analysisJson));
      }
      setPhase('results');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setPhase('writing');
    }
  };

  const handleNewChallenge = async () => {
    if (!user || !aiConfig) return;
    setPhase('loading');
    try {
      const result = await challengeApi.generateWriting({ userId: user.id });
      navigate(`/writing/${result.id}`, { replace: true });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setPhase('results');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBarColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-start justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/writing">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PenLine className="w-6 h-6 text-primary" />
              {t('writing.title')}
            </h1>
          </div>
          {user && <LevelBadge level={user.level} />}
        </div>

        {phase === 'loading' && (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-lg font-semibold">{t('common.loading')}</p>
            </CardContent>
          </Card>
        )}

        {phase === 'writing' && challenge && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  {t('writing.prompt')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed whitespace-pre-wrap">{challenge.prompt}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('writing.yourText')}</CardTitle>
                <CardDescription>
                  {t('writing.charCount', { count: text.length })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <textarea
                  className="w-full min-h-[200px] p-4 rounded-lg border bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t('writing.placeholder')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <Button
                  className="w-full btn-gradient"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={!text.trim()}
                >
                  {t('writing.submit')}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {phase === 'analyzing' && (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <p className="text-lg font-semibold">{t('writing.submitting')}</p>
            </CardContent>
          </Card>
        )}

        {phase === 'results' && analysis && (
          <>
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-8 text-center space-y-6">
                <div className={cn("text-6xl font-bold", getScoreColor(analysis.score))}>
                  {analysis.score}%
                </div>
                <p className="text-muted-foreground">
                  {analysis.score >= 80 ? t('practice.excellent')
                    : analysis.score >= 50 ? t('practice.goodProgress')
                    : t('practice.keepImproving')}
                </p>

                {analysis.grading && (
                  <div className="space-y-3 text-left max-w-md mx-auto">
                    {[
                      { label: t('writing.grammar'), value: analysis.grading.grammar },
                      { label: t('writing.vocabulary'), value: analysis.grading.vocabulary },
                      { label: t('writing.coherence'), value: analysis.grading.coherence },
                      { label: t('writing.spelling'), value: analysis.grading.spelling },
                      { label: t('writing.levelFit'), value: analysis.grading.levelAppropriateness },
                    ].map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-semibold">{item.value}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", getBarColor(item.value))}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {analysis.errors && analysis.errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    {t('writing.errorsFound')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="line-through text-muted-foreground">{error.original}</span>
                          <span>&rarr;</span>
                          <span className="text-green-600 font-bold">{error.correction}</span>
                        </div>
                        {error.rule && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                            {error.rule}
                          </span>
                        )}
                        {error.explanation && (
                          <p className="mt-1 text-muted-foreground">{error.explanation}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {analysis.feedback && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    {t('writing.feedback')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{analysis.feedback}</p>
                </CardContent>
              </Card>
            )}

            <Button className="w-full gap-2" size="lg" onClick={handleNewChallenge}>
              <RotateCcw className="w-4 h-4" />
              {t('writing.newChallenge')}
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
