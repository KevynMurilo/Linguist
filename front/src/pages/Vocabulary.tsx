import { useEffect, useState } from 'react';
import { BookMarked, RotateCcw, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { MasteryBar } from '@/components/MasteryBar';
import { useAppStore } from '@/lib/store';
import { vocabularyApi } from '@/lib/api';
import { VocabularyResponse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/i18n';

export default function Vocabulary() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [allWords, setAllWords] = useState<VocabularyResponse[]>([]);
  const [dueCards, setDueCards] = useState<VocabularyResponse[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState({ totalWords: 0, masteredWords: 0, dueForReview: 0 });

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [allData, dueData, statsData] = await Promise.all([
        vocabularyApi.getAll(user.id, 0, 20),
        vocabularyApi.getDue(user.id, 0, 50),
        vocabularyApi.getStats(user.id),
      ]);
      setAllWords(allData.content || []);
      setHasMore(allData.last === false);
      setPage(allData.number ?? 0);
      setDueCards(dueData.content || []);
      setStats(statsData);
      setCurrentCardIndex(0);
      setFlipped(false);
    } catch (error: any) {
      toast({ title: t('toast.failedToLoad'), description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await vocabularyApi.getAll(user.id, nextPage, 20);
      setAllWords([...allWords, ...(data.content || [])]);
      setHasMore(data.last === false);
      setPage(data.number ?? nextPage);
    } catch (error: any) {
      toast({ title: t('toast.failedToLoad'), description: error.message, variant: 'destructive' });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReview = async (correct: boolean) => {
    const card = dueCards[currentCardIndex];
    if (!card) return;

    try {
      await vocabularyApi.review(card.id, correct);
      const remaining = dueCards.filter((_, i) => i !== currentCardIndex);
      setDueCards(remaining);
      if (currentCardIndex >= remaining.length) {
        setCurrentCardIndex(Math.max(0, remaining.length - 1));
      }
      setFlipped(false);
      setStats(prev => ({
        ...prev,
        dueForReview: Math.max(0, prev.dueForReview - 1),
        masteredWords: correct ? prev.masteredWords : prev.masteredWords,
      }));
    } catch (error: any) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await vocabularyApi.delete(id);
      setAllWords(allWords.filter(w => w.id !== id));
      setDueCards(dueCards.filter(w => w.id !== id));
      setStats(prev => ({ ...prev, totalWords: prev.totalWords - 1 }));
    } catch (error: any) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">{t('vocabulary.loading')}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const currentCard = dueCards[currentCardIndex];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold">{t('vocabulary.title')}</h1>
          <p className="text-muted-foreground">{t('vocabulary.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-primary">{stats.totalWords}</p>
              <p className="text-sm text-muted-foreground">{t('vocabulary.totalWords')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-success">{stats.masteredWords}</p>
              <p className="text-sm text-muted-foreground">{t('vocabulary.mastered')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-warning">{stats.dueForReview}</p>
              <p className="text-sm text-muted-foreground">{t('vocabulary.dueForReview')}</p>
            </CardContent>
          </Card>
        </div>

        {stats.totalWords === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookMarked className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t('vocabulary.noWords')}</h3>
              <p className="text-muted-foreground">{t('vocabulary.noWordsDesc')}</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="review" className="w-full">
            <TabsList>
              <TabsTrigger value="review">
                {t('vocabulary.tabReview')} ({dueCards.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                {t('vocabulary.tabAll')} ({stats.totalWords})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="review" className="mt-6">
              {dueCards.length === 0 ? (
                <Card className="py-16">
                  <CardContent className="text-center">
                    <Check className="w-12 h-12 text-success mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t('vocabulary.allReviewed')}</h3>
                    <p className="text-muted-foreground">{t('vocabulary.allReviewedDesc')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="max-w-lg mx-auto space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {t('vocabulary.remaining', { count: dueCards.length })}
                  </p>

                  {/* Flashcard */}
                  <div
                    className="relative cursor-pointer perspective-1000"
                    onClick={() => setFlipped(!flipped)}
                    style={{ perspective: '1000px' }}
                  >
                    <div
                      className="relative w-full transition-transform duration-500"
                      style={{
                        transformStyle: 'preserve-3d',
                        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      }}
                    >
                      {/* Front */}
                      <Card className="min-h-[200px] flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
                        <CardContent className="text-center py-12">
                          <p className="text-3xl font-bold mb-2">{currentCard?.word}</p>
                          {currentCard?.context && (
                            <p className="text-sm text-muted-foreground">{currentCard.context}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-4">{t('vocabulary.tapToFlip')}</p>
                        </CardContent>
                      </Card>

                      {/* Back */}
                      <Card
                        className="min-h-[200px] flex items-center justify-center absolute inset-0"
                        style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                      >
                        <CardContent className="text-center py-12">
                          <p className="text-3xl font-bold text-primary mb-2">{currentCard?.translation}</p>
                          <MasteryBar value={currentCard?.masteryLevel ?? 0} size="sm" showPercentage />
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Review buttons */}
                  <div className="flex gap-4 justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 gap-2 border-destructive/30 hover:bg-destructive/10 text-destructive"
                      onClick={() => handleReview(false)}
                    >
                      <X className="w-5 h-5" />
                      {t('vocabulary.dontKnow')}
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 gap-2 btn-gradient"
                      onClick={() => handleReview(true)}
                    >
                      <Check className="w-5 h-5" />
                      {t('vocabulary.know')}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('vocabulary.allWords')}</CardTitle>
                  <CardDescription>{t('vocabulary.allWordsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allWords.map((word) => (
                      <div
                        key={word.id}
                        className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{word.word}</span>
                            <span className="text-muted-foreground">=</span>
                            <span className="text-primary font-medium">{word.translation}</span>
                          </div>
                          {word.context && (
                            <p className="text-xs text-muted-foreground">{word.context}</p>
                          )}
                        </div>
                        <div className="w-24 shrink-0">
                          <MasteryBar value={word.masteryLevel} size="sm" />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(word.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
