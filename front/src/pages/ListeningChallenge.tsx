import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Headphones, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { LevelBadge } from '@/components/LevelBadge';
import { useAppStore } from '@/lib/store';
import { challengeApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ChallengeResponseDTO } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export default function ListeningChallenge() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, aiConfig } = useAppStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<ChallengeResponseDTO[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);

  const fetchHistory = async (page: number) => {
    if (!user) return;
    try {
      const data = await challengeApi.getListeningHistory(user.id, page, 5);
      setHistory(data.content || []);
      setHistoryTotalPages(data.totalPages || 0);
      setHistoryPage(page);
    } catch { }
  };

  useEffect(() => { fetchHistory(0); }, [user]);

  const handleGenerate = async () => {
    if (!user || !aiConfig) {
      toast({ title: 'IA', description: 'Configure sua chave de IA primeiro.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await challengeApi.generateListening({ userId: user.id });
      navigate(`/listening/${result.id}`);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setIsGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Headphones className="w-6 h-6 text-primary" />
              {t('listening.title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('listening.subtitle')}</p>
          </div>
          {user && <LevelBadge level={user.level} />}
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-4">
            {isGenerating ? (
              <>
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-lg font-semibold">{t('listening.generating')}</p>
              </>
            ) : (
              <>
                <Headphones className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">{t('listening.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('listening.subtitle')}</p>
                </div>
                <Button size="lg" className="gap-2" onClick={handleGenerate}>
                  <Headphones className="w-5 h-5" />
                  {t('listening.generate')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('listening.history')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.map(h => (
                <button
                  key={h.id}
                  onClick={() => navigate(`/listening/${h.id}`)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border hover:bg-muted/50 transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate group-hover:text-primary transition-colors">
                      {h.prompt || h.originalText?.substring(0, 45)}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {h.score != null && (
                    <span className={cn("text-xl font-bold ml-4", getScoreColor(h.score))}>
                      {h.score}%
                    </span>
                  )}
                </button>
              ))}

              {historyTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {historyPage + 1} / {historyTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage >= historyTotalPages - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
