import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowLeft, 
  Loader2, 
  Globe, 
  Lightbulb, 
  AlertTriangle, 
  Info,
  Zap,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [targetLanguage, setTargetLanguage] = useState(user?.targetLanguage || 'en-US');
  const [isLoading, setIsLoading] = useState(false);

  const languages = [
    { code: 'en-US', name: t('lang.en-US') },
    { code: 'en-GB', name: t('lang.en-GB') },
    { code: 'es-ES', name: t('lang.es-ES') },
    { code: 'es-MX', name: t('lang.es-MX') },
    { code: 'pt-BR', name: t('lang.pt-BR') },
    { code: 'pt-PT', name: t('lang.pt-PT') },
    { code: 'fr-FR', name: t('lang.fr-FR') },
    { code: 'de-DE', name: t('lang.de-DE') },
    { code: 'it-IT', name: t('lang.it-IT') },
    { code: 'ja-JP', name: t('lang.ja-JP') },
    { code: 'ko-KR', name: t('lang.ko-KR') },
    { code: 'zh-CN', name: t('lang.zh-CN') },
  ];

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
      toast({ title: t('toast.topicRequired'), variant: 'destructive' });
      return;
    }

    if (!aiConfig?.apiKey) {
      toast({ title: t('toast.aiNotConfigured'), variant: 'destructive' });
      navigate('/settings');
      return;
    }

    setIsLoading(true);
    try {
      const lesson = await lessonApi.generate({
        userId: user?.id!,
        topic: topic.trim(),
        targetLanguage: targetLanguage || undefined,
      });

      setCurrentLesson(lesson);
      toast({ title: t('toast.lessonCreated') });
      navigate(`/lessons/${lesson.id}`);
    } catch (error: any) {
      toast({
        title: t('toast.generationFailed'),
        description: error.message || 'Failed to generate lesson.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        
        {/* Header Superior */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/lessons">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('newLesson.backToLessons')}
            </Link>
          </Button>
          {user && (
            <div className="flex items-center gap-3 bg-secondary/20 px-4 py-1.5 rounded-full border border-border/50">
              <span className="text-sm font-medium text-muted-foreground">{t('newLesson.yourLevel')}</span>
              <LevelBadge level={user.level} />
            </div>
          )}
        </div>

        {/* Hero Section com o Ícone Roxo */}
        <div className="flex flex-col md:flex-row items-center gap-6 pb-2">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-xl shadow-violet-500/20 shrink-0">
            <Sparkles className="w-10 h-10 text-white animate-pulse" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold tracking-tight">{t('newLesson.title')}</h1>
            <p className="text-muted-foreground text-lg">
              {t('newLesson.subtitle')}
            </p>
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Coluna Esquerda: Configurações e Dicas */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  {t('newLesson.targetLanguage')}
                </CardTitle>
                <CardDescription>Qual idioma você quer aprender?</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={t('onboarding.register.selectLanguage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="mt-4 flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                   <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     A IA criará o vocabulário e os exercícios focados na variante do idioma escolhida.
                   </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Dicas para Melhores Lições
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs space-y-2 text-muted-foreground">
                  <p className="flex gap-2"><span>•</span> <span>Seja específico (ex: "Entrevista para Front-end")</span></p>
                  <p className="flex gap-2"><span>•</span> <span>Mencione seu interesse (ex: "Inglês para viagens na Itália")</span></p>
                  <p className="flex gap-2"><span>•</span> <span>Use frases curtas para lições mais focadas em fala.</span></p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita: Conteúdo Principal */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="h-full border-primary/20 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  {t('newLesson.whatToLearn')}
                </CardTitle>
                <CardDescription>
                  {t('newLesson.whatToLearnDesc', { level: user?.level || 'current' })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descreva o tópico</Label>
                  <Textarea
                    placeholder={t('newLesson.placeholder')}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="min-h-[180px] resize-none text-lg p-4 bg-muted/20 focus:bg-background transition-all border-border/50"
                    maxLength={500}
                  />
                  <div className="flex justify-between text-xs font-medium px-1">
                    <span className="text-muted-foreground">Sua lição será única.</span>
                    <span className={topic.length > 400 ? "text-destructive" : "text-muted-foreground"}>
                      {topic.length} / 500
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    {t('newLesson.needInspiration')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topicSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setTopic(suggestion)}
                        className="text-xs px-4 py-2 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-transparent transition-all font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    className="w-full h-14 btn-gradient gap-3 text-lg font-bold shadow-lg shadow-primary/20"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={isLoading || !topic.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        {t('newLesson.generating')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        {t('newLesson.generateLesson')}
                      </>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>

            {/* Banner de Aviso de Configuração */}
            {!aiConfig?.apiKey && (
              <div className="flex items-center gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-pulse">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700">
                  <span className="font-bold">{t('newLesson.aiNotConfigured')}</span>{' '}
                  <Link to="/settings" className="underline font-black">
                    {t('newLesson.setupAI')}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}