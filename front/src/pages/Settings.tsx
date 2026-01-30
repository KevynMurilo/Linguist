import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Key, LogOut, Trash2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AppLayout } from '@/components/AppLayout';
import { LevelBadge } from '@/components/LevelBadge';
import { useAppStore } from '@/lib/store';
import { userApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AIProvider, LanguageLevel } from '@/lib/types';
import { useTranslation, SUPPORTED_LOCALES } from '@/i18n';
import type { Locale } from '@/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const levels: LanguageLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, locale, setLocale } = useTranslation();
  const { user, aiConfig, setUser, setAIConfig, reset } = useAppStore();

  const providers: { value: AIProvider; label: string }[] = [
    { value: 'gemini', label: t('providers.gemini') },
    { value: 'openai', label: t('providers.openai') },
    { value: 'perplexity', label: t('providers.perplexity') },
    { value: 'deepseek', label: t('providers.deepseek') },
  ];

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

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [level, setLevel] = useState<LanguageLevel>(user?.level || 'A1');
  const [targetLang, setTargetLang] = useState(user?.targetLanguage || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // AI config form
  const [provider, setProvider] = useState<AIProvider>(aiConfig?.provider || 'gemini');
  const [apiKey, setApiKey] = useState(aiConfig?.apiKey || '');

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdatingProfile(true);
    try {
      const updated = await userApi.update(user.id, { name, level, targetLanguage: targetLang });
      setUser(updated);
      toast({
        title: t('toast.profileUpdated'),
        description: t('toast.profileUpdatedDesc'),
      });
    } catch (error: any) {
      toast({
        title: t('toast.updateFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSaveAIConfig = () => {
    if (!apiKey.trim()) {
      toast({
        title: t('toast.apiKeyRequired'),
        description: t('toast.apiKeyRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    setAIConfig({ provider, apiKey });
    toast({
      title: t('toast.aiConfigSaved'),
      description: t('toast.aiConfigSavedDesc'),
    });
  };

  const handleClearAIConfig = () => {
    setAIConfig(null);
    setApiKey('');
    toast({
      title: t('toast.aiConfigCleared'),
      description: t('toast.aiConfigClearedDesc'),
    });
  };

  const handleLogout = () => {
    reset();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      await userApi.delete(user.id);
      reset();
      toast({
        title: t('toast.accountDeleted'),
        description: t('toast.accountDeletedDesc'),
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: t('toast.deleteFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Back Button */}
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('settings.backToDashboard')}
          </Link>
        </Button>

        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('settings.profile')}
            </CardTitle>
            <CardDescription>
              {t('settings.profileDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('settings.name')}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.email')}</Label>
                <Input value={user?.email || ''} disabled className="bg-muted" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('settings.nativeLanguage')}</Label>
                <Input value={user?.nativeLanguage || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>{t('settings.targetLanguage')}</Label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger>
                    <SelectValue />
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
              <Label>{t('settings.currentLevel')}</Label>
              <div className="flex items-center gap-4">
                <Select value={level} onValueChange={(v) => setLevel(v as LanguageLevel)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (
                      <SelectItem key={l} value={l}>
                        <div className="flex items-center gap-2">
                          <LevelBadge level={l} size="sm" />
                          <span>{t('settings.level', { level: l })}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {t('settings.levelNote')}
                </p>
              </div>
            </div>

            <Button
              onClick={handleUpdateProfile}
              disabled={isUpdatingProfile}
              className="btn-gradient"
            >
              {isUpdatingProfile ? t('settings.saving') : t('settings.saveChanges')}
            </Button>
          </CardContent>
        </Card>

        {/* Language Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('settings.language')}
            </CardTitle>
            <CardDescription>
              {t('settings.languageDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t('settings.language')}</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LOCALES.map((loc) => (
                    <SelectItem key={loc.code} value={loc.code}>
                      <span className="flex items-center gap-2">
                        <span>{loc.flag}</span>
                        <span>{loc.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              {t('settings.aiConfig')}
            </CardTitle>
            <CardDescription>
              {t('settings.aiConfigDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('settings.provider')}</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as AIProvider)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.apiKey')}</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t('settings.apiKeyPlaceholder')}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSaveAIConfig} className="btn-accent">
                {t('settings.saveApiKey')}
              </Button>
              {aiConfig && (
                <Button variant="outline" onClick={handleClearAIConfig}>
                  {t('settings.clearConfig')}
                </Button>
              )}
            </div>

            {aiConfig && (
              <p className="text-sm text-success flex items-center gap-2">
                ✓ {t('settings.configured', { provider: providers.find(p => p.value === aiConfig.provider)?.label || '' })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">{t('settings.dangerZone')}</CardTitle>
            <CardDescription>
              {t('settings.dangerZoneDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('settings.logoutTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('settings.logoutDesc')}
                </p>
              </div>
              <Button variant="outline" onClick={handleLogout} className="gap-2">
                <LogOut className="w-4 h-4" />
                {t('settings.logoutButton')}
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-destructive">{t('settings.deleteTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('settings.deleteDesc')}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    {t('settings.deleteButton')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('settings.deleteConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('settings.deleteConfirmDesc')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('settings.deleteCancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t('settings.deleteConfirm')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
