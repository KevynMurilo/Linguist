import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Headphones, Loader2, RotateCcw, ArrowLeft,
  Play, Pause, Volume2,
  SkipBack, SkipForward, Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { LevelBadge } from '@/components/LevelBadge';
import { useAppStore } from '@/lib/store';
import { challengeApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { ChallengeResponseDTO, ListeningAnalysis } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

type Phase = 'loading' | 'preloading' | 'listening' | 'analyzing' | 'results';
type PlayState = 'stopped' | 'playing' | 'paused';

const SPEEDS = [
  { label: '0.6x', value: 0.6 },
  { label: '0.85x', value: 0.85 },
  { label: '1x', value: 1.0 },
  { label: '1.2x', value: 1.2 },
];

export default function ListeningChallengeDetail() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, aiConfig, selectedVoice, setSelectedVoice } = useAppStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [challenge, setChallenge] = useState<ChallengeResponseDTO | null>(null);
  const [typedText, setTypedText] = useState('');
  const [analysis, setAnalysis] = useState<ListeningAnalysis | null>(null);
  const [playCount, setPlayCount] = useState(0);

  const [playState, setPlayState] = useState<PlayState>('stopped');
  const [speed, setSpeed] = useState(0.85);
  const [progress, setProgress] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);

  const wordsRef = useRef<string[]>([]);
  const currentIndexRef = useRef(-1);
  const speedRef = useRef(0.85);
  const isTransitioningRef = useRef(false);
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isPreloadedRef = useRef(false);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Load and cache voices early
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const targetLang = user?.targetLanguage || 'en-US';
      const langPrefix = targetLang.split('-')[0];
      const filtered = voices.filter(v => v.lang.startsWith(langPrefix));
      filtered.sort((a, b) => {
        const aScore = (!a.localService ? 2 : 0) + (/Google|Microsoft|Natural/i.test(a.name) ? 1 : 0);
        const bScore = (!b.localService ? 2 : 0) + (/Google|Microsoft|Natural/i.test(b.name) ? 1 : 0);
        return bScore - aScore;
      });
      setAvailableVoices(filtered);

      // Cache the selected voice reference
      if (selectedVoice) {
        cachedVoiceRef.current = voices.find(v => v.name === selectedVoice) || filtered[0] || null;
      } else if (filtered.length > 0) {
        cachedVoiceRef.current = filtered[0];
        setSelectedVoice(filtered[0].name);
      }
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      speechSynthesis.cancel();
      speechSynthesis.onvoiceschanged = null;
    };
  }, [user?.targetLanguage]);

  // Update cached voice when selection changes
  useEffect(() => {
    if (selectedVoice && availableVoices.length > 0) {
      cachedVoiceRef.current = availableVoices.find(v => v.name === selectedVoice) || cachedVoiceRef.current;
    }
  }, [selectedVoice, availableVoices]);

  const cleanVoiceName = (name: string) => name.replace(/Microsoft|Google|Apple|Desktop|Natural|Online|Cloud/gi, '').replace(/[()\-]/g, '').trim();

  // Load challenge by ID
  useEffect(() => {
    if (!id) return;
    const loadChallenge = async () => {
      try {
        const result = await challengeApi.getById(id);
        setChallenge(result);
        wordsRef.current = result.originalText?.split(/\s+/).filter(Boolean) || [];

        if (result.completed && result.analysisJson) {
          setAnalysis(JSON.parse(result.analysisJson));
          setTypedText(result.studentResponse || '');
          setPhase('results');
        } else {
          // Start preloading TTS
          setPhase('preloading');
          setLoadProgress(0);
          preloadTTS(result);
        }
      } catch (error: any) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        navigate('/listening');
      }
    };
    loadChallenge();
  }, [id]);

  // Preload TTS: warm up speechSynthesis with the actual text at volume=0
  const preloadTTS = useCallback((challengeData: ChallengeResponseDTO) => {
    const text = challengeData.originalText;
    if (!text) {
      setPhase('listening');
      return;
    }

    // Wait for voices if not loaded yet
    const waitForVoices = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        setTimeout(waitForVoices, 50);
        return;
      }

      setLoadProgress(20);

      // Warm-up utterance with volume=0 to prime the TTS engine
      const warmup = new SpeechSynthesisUtterance(text);
      warmup.volume = 0;
      warmup.rate = 1.0;

      const targetLang = challengeData.targetLanguage || user?.targetLanguage || 'en-US';
      warmup.lang = targetLang;

      if (cachedVoiceRef.current) {
        warmup.voice = cachedVoiceRef.current;
      }

      let warmupProgress = 20;
      const progressInterval = setInterval(() => {
        warmupProgress = Math.min(warmupProgress + 5, 90);
        setLoadProgress(warmupProgress);
      }, 100);

      warmup.onend = () => {
        clearInterval(progressInterval);
        isPreloadedRef.current = true;
        setLoadProgress(100);
        setTimeout(() => {
          setPhase('listening');
        }, 200);
      };

      warmup.onerror = () => {
        clearInterval(progressInterval);
        isPreloadedRef.current = true;
        setLoadProgress(100);
        setPhase('listening');
      };

      speechSynthesis.speak(warmup);
    };

    waitForVoices();
  }, [user?.targetLanguage]);

  const speak = useCallback((fromWordIndex: number) => {
    if (!challenge?.originalText) return;

    isTransitioningRef.current = true;
    setPlayState('playing');
    speechSynthesis.cancel();

    const words = wordsRef.current;
    const safeIndex = Math.max(0, fromWordIndex);

    currentIndexRef.current = safeIndex;
    setProgress(words.length > 0 ? safeIndex / words.length : 0);

    const textToSpeak = words.slice(safeIndex).join(' ');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.lang = challenge.targetLanguage || user?.targetLanguage || 'en-US';
    utterance.rate = speedRef.current;

    // Use cached voice reference (no lookup needed)
    if (cachedVoiceRef.current) {
      utterance.voice = cachedVoiceRef.current;
    }

    utterance.onboundary = (e) => {
      if (e.name === 'word') {
        const spokenPart = textToSpeak.substring(0, e.charIndex);
        const count = spokenPart.split(/\s+/).filter(Boolean).length;
        const absoluteIndex = safeIndex + count;

        currentIndexRef.current = absoluteIndex;
        setProgress(Math.min(1, absoluteIndex / words.length));
      }
    };

    utterance.onstart = () => {
      isTransitioningRef.current = false;
    };

    utterance.onend = () => {
      if (!isTransitioningRef.current) {
        if (currentIndexRef.current >= words.length - 1) {
          setPlayState('stopped');
          setProgress(1);
          currentIndexRef.current = words.length - 1;
        }
      }
    };

    utterance.onerror = () => {
      if (!isTransitioningRef.current) setPlayState('stopped');
    };

    speechSynthesis.speak(utterance);
  }, [challenge, user?.targetLanguage]);

  const handlePlay = useCallback(() => {
    if (playState === 'playing') {
      setPlayState('paused');
      speechSynthesis.pause();
    } else if (playState === 'paused') {
      setPlayState('playing');
      speechSynthesis.resume();
      if (!speechSynthesis.speaking) {
        speak(currentIndexRef.current);
      }
    } else {
      setPlayCount(prev => prev + 1);
      speak(0);
    }
  }, [playState, speak]);

  const handleStop = useCallback(() => {
    isTransitioningRef.current = true;
    speechSynthesis.cancel();
    setPlayState('stopped');
    setProgress(0);
    currentIndexRef.current = -1;
  }, []);

  const handleSkipBack = useCallback(() => {
    const target = Math.max(0, currentIndexRef.current - 3);
    speak(target);
  }, [speak]);

  const handleSkipForward = useCallback(() => {
    const target = Math.min(wordsRef.current.length - 1, currentIndexRef.current + 3);
    speak(target);
  }, [speak]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = Math.floor(pct * wordsRef.current.length);
    speak(target);
  }, [speak]);

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    speedRef.current = newSpeed;
    if (playState !== 'stopped') {
      speak(currentIndexRef.current);
    }
  }, [playState, speak]);

  const handleVoiceChange = useCallback((voiceName: string) => {
    setSelectedVoice(voiceName);
    const voice = availableVoices.find(v => v.name === voiceName);
    if (voice) {
      cachedVoiceRef.current = voice;
    }
    // If playing, restart with new voice
    if (playState !== 'stopped') {
      speak(currentIndexRef.current);
    }
  }, [availableVoices, playState, speak, setSelectedVoice]);

  const handleSubmit = async () => {
    if (!user || !challenge || !typedText.trim()) return;
    setPhase('analyzing');
    handleStop();
    try {
      const result = await challengeApi.submitListening({
        userId: user.id,
        challengeId: challenge.id,
        typedText: typedText.trim(),
      });
      setChallenge(result);
      if (result.analysisJson) setAnalysis(JSON.parse(result.analysisJson));
      setPhase('results');
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setPhase('listening');
    }
  };

  const handleNewChallenge = async () => {
    if (!user || !aiConfig) return;
    handleStop();
    setPhase('loading');
    try {
      const result = await challengeApi.generateListening({ userId: user.id });
      navigate(`/listening/${result.id}`, { replace: true });
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

  const AudioPlayer = ({ compact = false }: { compact?: boolean }) => (
    <div className="space-y-3">
      <div className="relative h-2 bg-muted rounded-full cursor-pointer group" onClick={handleSeek}>
        <div className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-150" style={{ width: `${progress * 100}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${progress * 100}% - 8px)` }} />
      </div>

      <div className="flex items-center justify-center gap-2">
        <button onClick={handleSkipBack} disabled={playState === 'stopped'} className="p-2 rounded-full hover:bg-muted disabled:opacity-30 transition-colors">
          <SkipBack className="w-5 h-5" />
        </button>

        <button onClick={handlePlay} className={cn("p-3 rounded-full transition-all active:scale-95", compact ? "w-12 h-12" : "w-14 h-14", playState === 'playing' ? "bg-primary text-primary-foreground shadow-lg" : "bg-primary/10 text-primary hover:bg-primary/20")}>
          {playState === 'playing' ? <Pause className={compact ? "w-5 h-5 mx-auto" : "w-6 h-6 mx-auto"} /> : <Play className={cn(compact ? "w-5 h-5 mx-auto" : "w-6 h-6 mx-auto", "ml-0.5")} />}
        </button>

        <button onClick={handleSkipForward} disabled={playState === 'stopped'} className="p-2 rounded-full hover:bg-muted disabled:opacity-30 transition-colors">
          <SkipForward className="w-5 h-5" />
        </button>

        {playState !== 'stopped' && (
          <button onClick={handleStop} className="p-2 rounded-full hover:bg-muted transition-colors ml-1">
            <Square className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1">
        {SPEEDS.map((s) => (
          <button key={s.value} onClick={() => handleSpeedChange(s.value)} className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", speed === s.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
            {s.label}
          </button>
        ))}
      </div>

      {!compact && availableVoices.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <select value={selectedVoice || ''} onChange={(e) => handleVoiceChange(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-background max-w-[250px] truncate">
            {availableVoices.map((voice) => (
              <option key={voice.name} value={voice.name}>{cleanVoiceName(voice.name)}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex items-start justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2">
              <Link to="/listening">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('common.back')}
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Headphones className="w-6 h-6 text-primary" />
              {t('listening.title')}
            </h1>
          </div>
          {user && <LevelBadge level={user.level} />}
        </div>

        {(phase === 'loading' || phase === 'preloading') && (
          <Card className="py-16 border-primary/20">
            <CardContent className="text-center space-y-6">
              <div className="relative w-20 h-20 mx-auto">
                <Loader2 className="w-20 h-20 animate-spin text-primary opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-primary">
                  {loadProgress}%
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  {phase === 'loading' ? t('common.loading') : t('listening.generating')}
                </p>
                <div className="w-48 h-1.5 bg-muted mx-auto rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${loadProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  {t('listening.subtitle')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {phase === 'listening' && challenge && (
          <>
            {challenge.prompt && (
              <Card><CardContent className="pt-6 text-center"><p className="text-sm text-muted-foreground">{t('listening.contextHint')}</p><p className="text-lg font-medium mt-1">{challenge.prompt}</p></CardContent></Card>
            )}
            <Card className="border-primary/30 shadow-md">
              <CardContent className="pt-8 pb-6 space-y-2">
                <AudioPlayer />
                <p className="text-xs text-muted-foreground text-center pt-1">{t('listening.unlimitedReplays')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t('listening.typeHere')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <input type="text" className="w-full p-4 rounded-lg border bg-background text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all" placeholder={t('listening.placeholder')} value={typedText} onChange={(e) => setTypedText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && typedText.trim()) handleSubmit(); }} />
                <Button className="w-full btn-gradient shadow-lg" size="lg" onClick={handleSubmit} disabled={!typedText.trim()}>{t('listening.submit')}</Button>
              </CardContent>
            </Card>
          </>
        )}

        {phase === 'analyzing' && (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" /><p className="text-lg font-semibold">{t('listening.submitting')}</p>
            </CardContent>
          </Card>
        )}

        {phase === 'results' && analysis && (
          <>
            <Card className="border-2 border-primary/20 shadow-xl">
              <CardContent className="pt-8 text-center space-y-4">
                <div className={cn("text-6xl font-bold", getScoreColor(analysis.score))}>{analysis.score}%</div>
                <p className="text-muted-foreground font-medium">{analysis.score >= 80 ? t('practice.excellent') : analysis.score >= 50 ? t('practice.goodProgress') : t('practice.keepImproving')}</p>
              </CardContent>
            </Card>
            {challenge?.originalText && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Volume2 className="w-5 h-5 text-primary" />{t('listening.original')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg font-medium leading-relaxed">{challenge.originalText}</p>
                  <AudioPlayer compact />
                </CardContent>
              </Card>
            )}
            {analysis.words && analysis.words.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('listening.wordComparison')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-x-3 gap-y-10 items-start">
                    {analysis.words.map((w: any, i: number) => {
                      const expected = w.expected || w.original || "?";
                      const got = (w.got !== undefined && w.got !== null) ? w.got : (w.student !== undefined ? w.student : "");
                      const displayGot = got !== "" ? got : "\u2014";

                      return (
                        <div key={i} className="flex flex-col items-center min-w-fit">
                          <div
                            className={cn(
                              "px-4 py-2 rounded-2xl font-bold text-sm transition-all border-2 shadow-sm",
                              w.correct
                                ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400"
                                : "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400"
                            )}
                          >
                            {w.correct ? expected : displayGot}
                          </div>
                          {!w.correct && (
                            <div className="mt-2.5 px-3 py-1 rounded-full bg-emerald-500 text-white shadow-md border border-emerald-400 animate-in fade-in zoom-in-95 slide-in-from-top-2">
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                {expected}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
            <Button className="w-full gap-2 shadow-md" size="lg" onClick={handleNewChallenge}><RotateCcw className="w-4 h-4" />{t('listening.newChallenge')}</Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
