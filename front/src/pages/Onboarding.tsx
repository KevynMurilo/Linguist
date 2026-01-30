import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, Sparkles, Globe, Zap, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { userApi } from '@/lib/api';
import { LanguageLevel, AIProvider } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useTranslation, SUPPORTED_LOCALES } from '@/i18n';
import type { Locale } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import heroBg from '@/assets/hero-bg.jpg';

type Step = 'welcome' | 'register' | 'login' | 'ai-config';

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, locale, setLocale } = useTranslation();
  const { setUser, setToken, setAIConfig, user, aiConfig } = useAppStore();

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

  const levels: { value: LanguageLevel; label: string; description: string }[] = [
    { value: 'A1', label: t('levels.A1'), description: t('levels.A1.desc') },
    { value: 'A2', label: t('levels.A2'), description: t('levels.A2.desc') },
    { value: 'B1', label: t('levels.B1'), description: t('levels.B1.desc') },
    { value: 'B2', label: t('levels.B2'), description: t('levels.B2.desc') },
    { value: 'C1', label: t('levels.C1'), description: t('levels.C1.desc') },
    { value: 'C2', label: t('levels.C2'), description: t('levels.C2.desc') },
  ];

  const providers: { value: AIProvider; label: string; description: string }[] = [
    { value: 'gemini', label: t('providers.gemini'), description: t('providers.gemini.desc') },
    { value: 'openai', label: t('providers.openai'), description: t('providers.openai.desc') },
    { value: 'perplexity', label: t('providers.perplexity'), description: t('providers.perplexity.desc') },
    { value: 'deepseek', label: t('providers.deepseek'), description: t('providers.deepseek.desc') },
  ];

  // Determine initial step
  const getInitialStep = (): Step => {
    if (!user) return 'welcome';
    if (!aiConfig) return 'ai-config';
    return 'welcome';
  };

  const [step, setStep] = useState<Step>(getInitialStep);
  const [isLoading, setIsLoading] = useState(false);

  // Registration form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [level, setLevel] = useState<LanguageLevel>('A1');

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // AI config
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !nativeLanguage || !targetLanguage) {
      toast({
        title: t('toast.missingFields'),
        description: t('toast.missingFieldsDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: t('toast.missingFields'),
        description: t('toast.passwordTooShort'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const auth = await userApi.create({
        name,
        email,
        password,
        nativeLanguage,
        targetLanguage,
        level,
      });
      setToken(auth.token);
      setUser(auth.user);
      setStep('ai-config');
      toast({
        title: t('toast.accountCreated'),
        description: t('toast.accountCreatedDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('toast.registrationFailed'),
        description: t('toast.registrationFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast({
        title: t('toast.missingFields'),
        description: t('toast.missingFieldsDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const auth = await userApi.login({ email: loginEmail, password: loginPassword });
      setToken(auth.token);
      setUser(auth.user);
      if (aiConfig) {
        navigate('/dashboard');
      } else {
        setStep('ai-config');
        toast({
          title: t('toast.aiConfigured'),
          description: t('toast.aiConfiguredDesc'),
        });
      }
    } catch (error: any) {
      toast({
        title: t('toast.loginFailed'),
        description: t('toast.loginFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIConfig = () => {
    if (!apiKey) {
      toast({
        title: t('toast.apiKeyRequired'),
        description: t('toast.apiKeyRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    setAIConfig({ provider, apiKey });
    toast({
      title: t('toast.aiConfigured'),
      description: t('toast.aiConfiguredDesc'),
    });
    navigate('/dashboard');
  };

  const handleSkipAI = () => {
    toast({
      title: t('toast.aiSetupSkipped'),
      description: t('toast.aiSetupSkippedDesc'),
    });
    navigate('/dashboard');
  };

  // Already logged in?
  if (user && aiConfig) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Language selector - top right */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 bg-background/50 backdrop-blur">
              <Globe className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SUPPORTED_LOCALES.map((loc) => (
              <DropdownMenuItem
                key={loc.code}
                onClick={() => setLocale(loc.code)}
                className={cn(locale === loc.code && 'bg-accent')}
              >
                <span className="mr-2">{loc.flag}</span>
                {loc.label}
                {locale === loc.code && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {step === 'welcome' && (
          <div className="text-center max-w-2xl animate-fade-in">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-6 shadow-glow">
                <GraduationCap className="w-10 h-10 text-primary-foreground" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {t('onboarding.hero.title')}
                <span className="gradient-text block">{t('onboarding.hero.titleAccent')}</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                {t('onboarding.hero.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">{t('onboarding.features.aiPowered')}</h3>
                <p className="text-sm text-muted-foreground">{t('onboarding.features.aiPoweredDesc')}</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <Globe className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-1">{t('onboarding.features.anyTopic')}</h3>
                <p className="text-sm text-muted-foreground">{t('onboarding.features.anyTopicDesc')}</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold mb-1">{t('onboarding.features.instantFeedback')}</h3>
                <p className="text-sm text-muted-foreground">{t('onboarding.features.instantFeedbackDesc')}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                className="btn-gradient px-8 gap-2"
                onClick={() => setStep('register')}
              >
                {t('onboarding.getStarted')}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('login')}
              >
                {t('onboarding.haveAccount')}
              </Button>
            </div>
          </div>
        )}

        {step === 'register' && (
          <Card className="w-full max-w-lg animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('onboarding.register.title')}</CardTitle>
              <CardDescription>
                {t('onboarding.register.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <Label htmlFor="name">{t('onboarding.register.name')}</Label>
                  <Input
                    id="name"
                    placeholder={t('onboarding.register.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-2">
                  <Label htmlFor="email">{t('onboarding.register.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('onboarding.register.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('onboarding.register.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('onboarding.register.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">{t('onboarding.register.passwordHint')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('onboarding.register.iSpeak')}</Label>
                  <Select value={nativeLanguage} onValueChange={setNativeLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('onboarding.register.selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('onboarding.register.iWantToLearn')}</Label>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('onboarding.register.selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('onboarding.register.myLevel')}</Label>
                <Select value={level} onValueChange={(v) => setLevel(v as LanguageLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((lvl) => (
                      <SelectItem key={lvl.value} value={lvl.value}>
                        <div className="flex flex-col">
                          <span>{lvl.label}</span>
                          <span className="text-xs text-muted-foreground">{lvl.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full btn-gradient gap-2"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? t('onboarding.register.creating') : t('onboarding.register.continue')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'login' && (
          <Card className="w-full max-w-lg animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('onboarding.login.title')}</CardTitle>
              <CardDescription>
                {t('onboarding.login.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginEmail">{t('onboarding.login.email')}</Label>
                <Input
                  id="loginEmail"
                  type="email"
                  placeholder={t('onboarding.login.emailPlaceholder')}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginPassword">{t('onboarding.login.password')}</Label>
                <Input
                  id="loginPassword"
                  type="password"
                  placeholder={t('onboarding.login.passwordPlaceholder')}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>

              <Button
                className="w-full btn-gradient gap-2"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? t('onboarding.login.signingIn') : t('onboarding.login.signIn')}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('onboarding.login.noAccount')}{' '}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline cursor-pointer"
                  onClick={() => setStep('register')}
                >
                  {t('onboarding.login.createOne')}
                </button>
              </p>
            </CardContent>
          </Card>
        )}

        {step === 'ai-config' && (
          <Card className="w-full max-w-lg animate-fade-in">
            <CardHeader className="text-center">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-2xl">{t('onboarding.ai.title')}</CardTitle>
              <CardDescription>
                {t('onboarding.ai.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('onboarding.ai.provider')}</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex flex-col">
                          <span>{p.label}</span>
                          <span className="text-xs text-muted-foreground">{p.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">{t('onboarding.ai.apiKey')}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={t('onboarding.ai.apiKeyPlaceholder')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {t('onboarding.ai.apiKeyHint')}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  className="w-full btn-accent gap-2"
                  onClick={handleAIConfig}
                >
                  {t('onboarding.ai.completeSetup')}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleSkipAI}
                >
                  {t('onboarding.ai.skipForNow')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
