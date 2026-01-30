import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Play, Pause, RotateCcw, Mic, Square, Volume2, Loader2,
  CheckCircle, XCircle, AlertTriangle, BookOpen, X,
  History as HistoryIcon, MessageSquare, Trash2, ChevronLeft, ChevronRight, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { AppLayout } from '@/components/AppLayout';
import { LevelBadge } from '@/components/LevelBadge';
import { useAppStore } from '@/lib/store';
import { lessonApi, progressApi, masteryApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { SpeechAnalysisResponse, LessonResponseDTO, ExplainWordResponse, PracticeSessionResponseDTO } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export default function LessonPractice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, aiConfig, token, setDashboard, setCompetences, selectedVoice, setSelectedVoice } = useAppStore();

  const [lesson, setLesson] = useState<LessonResponseDTO | null>(null);
  const [history, setHistory] = useState<PracticeSessionResponseDTO[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isMicReady, setIsMicReady] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SpeechAnalysisResponse | null>(null);
  const [playingSessionId, setPlayingSessionId] = useState<string | null>(null);
  
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedContext, setSelectedContext] = useState<string>('');
  const [wordExplanation, setWordExplanation] = useState<ExplainWordResponse | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentWordRange, setCurrentWordRange] = useState({ start: -1, end: -1 });

  const charIndexRef = useRef(0);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchHistory = useCallback(async (page: number) => {
    if (!id) return;
    try {
      const response = await lessonApi.getHistory(id, page, 5);
      setHistory(response.content);
      setTotalPages(response.totalPages);
      setCurrentPage(response.number);
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  const fetchData = async () => {
    if (!id) return;
    try {
      const lessonData = await lessonApi.getById(id);
      setLesson(lessonData);
      await fetchHistory(0);
    } catch (error: any) {
      toast({ title: t('toast.failedToLoad'), description: error.message, variant: 'destructive' });
      navigate('/lessons');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id, fetchHistory]);

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const targetLang = lesson?.targetLanguage || user?.targetLanguage;
      if (!targetLang) return;
      const langPrefix = targetLang.split('-')[0];
      const filtered = voices.filter(v => v.lang.startsWith(langPrefix));
      filtered.sort((a, b) => {
        const aScore = (!a.localService ? 2 : 0) + (/Google|Microsoft|Natural/i.test(a.name) ? 1 : 0);
        const bScore = (!b.localService ? 2 : 0) + (/Google|Microsoft|Natural/i.test(b.name) ? 1 : 0);
        return bScore - aScore;
      });
      setAvailableVoices(filtered);
    };
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, [lesson?.targetLanguage, user?.targetLanguage]);

  const createUtterance = (text: string, offset: number) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lesson?.targetLanguage || user?.targetLanguage || 'en-US';
    utterance.rate = speed;
    if (selectedVoice) {
      const voice = availableVoices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const absoluteStart = event.charIndex + offset;
        charIndexRef.current = absoluteStart;
        setCurrentWordRange({ start: absoluteStart, end: absoluteStart + event.charLength });
      }
    };
    utterance.onend = () => {
      if (!speechSynthesis.speaking) {
        setIsPlaying(false);
        setCurrentWordRange({ start: -1, end: -1 });
        if (charIndexRef.current >= (lesson?.simplifiedText.length || 0) - 5) charIndexRef.current = 0;
      }
    };
    return utterance;
  };

  useEffect(() => {
    if (isPlaying && lesson) {
      speechSynthesis.cancel();
      const offset = charIndexRef.current;
      const utterance = createUtterance(lesson.simplifiedText.slice(offset), offset);
      speechSynthRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  }, [speed, selectedVoice]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lesson?.targetLanguage || user?.targetLanguage || 'en-US';

      recognition.onstart = () => setIsMicReady(true);

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setSpokenText(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'aborted') {
          setIsRecording(false);
          setIsMicReady(false);
        }
      };

      recognition.onend = () => {
        setIsMicReady(false);
      };

      recognitionRef.current = recognition;
    }
  }, [lesson?.targetLanguage, user?.targetLanguage]);

  const handlePlay = () => {
    if (!lesson) return;
    if (isPlaying) {
      speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const offset = charIndexRef.current;
      const utterance = createUtterance(lesson.simplifiedText.slice(offset), offset);
      speechSynthRef.current = utterance;
      speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    speechSynthesis.cancel();
    charIndexRef.current = 0;
    setIsPlaying(false);
    setCurrentWordRange({ start: -1, end: -1 });
    setSpokenText('');
    setAnalysisResult(null);
  };

  const handleStartRecording = async () => {
    if (!recognitionRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setSpokenText('');
      setAnalysisResult(null);
      setIsRecording(true);
      recognitionRef.current.start();
    } catch (err) {
      toast({ title: "Microphone Error", description: "Access denied", variant: "destructive" });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleAnalyze = async () => {
    if (!user || !lesson || !spokenText.trim() || !aiConfig) return;
    setIsAnalyzing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('spokenText', spokenText.trim());
      formData.append('userId', user.id);
      formData.append('lessonId', lesson.id);
      const result = await lessonApi.analyzeSpeech(formData);
      setAnalysisResult(result);
      const [newDashboard, newCompetences, updatedLesson] = await Promise.all([
        progressApi.getDashboard(user.id),
        masteryApi.getByUser(user.id),
        lessonApi.getById(lesson.id)
      ]);
      setDashboard(newDashboard);
      setCompetences(newCompetences);
      setLesson(updatedLesson);
      await fetchHistory(0);
    } catch (error: any) {
      toast({ title: t('toast.analysisFailed'), description: error.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stopCurrentHistoryAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setPlayingSessionId(null);
  };

  const handlePlaySessionAudio = async (sessionId: string, audioUrl: string) => {
    if (playingSessionId === sessionId) {
      stopCurrentHistoryAudio();
      return;
    }
    stopCurrentHistoryAudio();
    try {
      const response = await fetch(`http://localhost:8080${audioUrl}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      setPlayingSessionId(sessionId);
      audio.onended = () => setPlayingSessionId(null);
      audio.play();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao carregar áudio.", variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!user || !sessionToDelete) return;
    setIsDeletingId(sessionToDelete);
    try {
      await lessonApi.deleteSession(sessionToDelete, user.id);
      toast({ title: "Sucesso", description: "Tentativa removida." });
      await Promise.all([
        fetchHistory(currentPage),
        lessonApi.getById(lesson!.id).then(setLesson)
      ]);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsDeletingId(null);
      setSessionToDelete(null);
    }
  };

  const handleWordClick = async (word: string, sentence: string) => {
    if (!user || !lesson || !aiConfig) return;
    const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
    if (!cleanWord) return;
    setSelectedWord(cleanWord);
    setSelectedContext(sentence);
    setWordExplanation(null);
    setIsExplaining(true);
    try {
      const result = await lessonApi.explainWord({ userId: user.id, lessonId: lesson.id, word: cleanWord, context: sentence });
      setWordExplanation(result);
    } catch (error: any) {
      toast({ title: t('toast.failedToExplain'), description: error.message, variant: 'destructive' });
      setSelectedWord(null);
    } finally {
      setIsExplaining(false);
    }
  };

  const cleanVoiceName = (name: string) => name.replace(/Microsoft|Google|Apple|Desktop|Natural|Online|Cloud/gi, '').replace(/[()\-]/g, '').trim();

  const formatRichText = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*|\[[^\]]+\]\([^)]+\))/g);
      return (
        <p key={i} className="mb-3 leading-relaxed last:mb-0">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="text-foreground font-bold">{part.slice(2, -2)}</strong>;
            }
            const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (linkMatch) {
              return (
                <a key={j} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {linkMatch[1]}
                </a>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  const renderClickableText = (text: string) => {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    let cumulativeCharIndex = 0;
    return sentences.map((sentence, si) => {
      const segments = sentence.split(/(\s+)/);
      return (
        <span key={si}>
          {segments.map((segment, wi) => {
            const start = cumulativeCharIndex;
            cumulativeCharIndex += segment.length;
            if (/^\s+$/.test(segment)) return <span key={wi}>{segment}</span>;
            const isActive = start >= currentWordRange.start && start < currentWordRange.end;
            return (
              <span key={wi} onClick={() => handleWordClick(segment, sentence.trim())} className={cn("cursor-pointer rounded px-0.5 transition-all duration-150 inline-block", isActive ? "bg-yellow-300 text-black font-bold scale-110 shadow-sm" : "hover:bg-primary/20 hover:text-primary")}>
                {segment}
              </span>
            );
          })}
        </span>
      );
    });
  };

  const currentWordIndex = useMemo(() => {
    if (!lesson || currentWordRange.start < 0) return -1;
    const textBefore = lesson.simplifiedText.substring(0, currentWordRange.start);
    return textBefore.split(/\s+/).filter(w => w.length > 0).length;
  }, [lesson, currentWordRange]);

  const renderPhoneticText = (text: string) => {
    const continuousText = text.replace(/\n+/g, ' ');
    const segments = continuousText.split(/(\s+)/);
    let globalWordIdx = 0;

    return (
      <div className="leading-relaxed">
        {segments.map((segment, si) => {
          if (/^\s+$/.test(segment) || !segment) return <span key={si}>{segment}</span>;
          
          const idx = globalWordIdx;
          globalWordIdx++;
          const isActive = idx === currentWordIndex;

          return (
            <span
              key={si}
              className={cn(
                "rounded px-0.5 transition-all duration-150 inline-block",
                isActive 
                  ? "bg-violet-300 dark:bg-violet-500 text-black dark:text-white font-bold scale-105 shadow-sm" 
                  : ""
              )}
            >
              {segment}
            </span>
          );
        })}
      </div>
    );
  };

  if (isLoading || !lesson) return <AppLayout><div className="flex items-center justify-center min-h-[60vh] animate-pulse">{t('practice.loading')}</div></AppLayout>;

  return (
    <AppLayout>
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md mx-4 shadow-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle>Tem certeza?</CardTitle>
              <CardDescription>Esta ação não pode ser desfeita. Sua nota e estatísticas serão recalculadas.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSessionToDelete(null)} disabled={!!isDeletingId}>Cancelar</Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={confirmDelete} disabled={!!isDeletingId}>
                {isDeletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Excluir
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-6 animate-fade-in pb-20">
        <Button variant="ghost" size="sm" asChild><Link to="/lessons"><ArrowLeft className="w-4 h-4 mr-2" />{t('practice.backToLessons')}</Link></Button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2"><LevelBadge level={lesson.level} />{lesson.targetLanguage && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{lesson.targetLanguage}</span>}{lesson.completed && <span className="text-sm px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">{t('common.completed')}</span>}</div>
            <h1 className="text-2xl font-bold">{lesson.topic}</h1>
            <div className="flex flex-wrap gap-2 mt-2">{lesson.grammarFocus.map((rule) => <span key={rule} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{rule}</span>)}</div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('practice.bestScore')}</p>
            <p className={cn("text-2xl font-bold", lesson.bestScore >= 80 ? "text-success" : "text-muted-foreground")}>{lesson.bestScore}%</p>
          </div>
        </div>

        {lesson.teachingNotes && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="w-5 h-5 text-primary" />{t('practice.teachingNotes')}</CardTitle><CardDescription>{t('practice.teachingNotesDesc')}</CardDescription></CardHeader>
            <CardContent><div className="text-sm leading-relaxed">{formatRichText(lesson.teachingNotes)}</div></CardContent>
          </Card>
        )}

        {lesson.vocabularyList && (
          <Card className="border-accent/20 bg-accent/5">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg">📖 {t('practice.vocabulary')}</CardTitle></CardHeader>
            <CardContent><div className="text-sm leading-relaxed whitespace-pre-line">{lesson.vocabularyList}</div></CardContent>
          </Card>
        )}

        {lesson.culturalNote && (
          <Card className="border-warning/20 bg-warning/5">
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg">🌍 {t('practice.culturalNote')}</CardTitle></CardHeader>
            <CardContent><div className="text-sm leading-relaxed">{formatRichText(lesson.culturalNote)}</div></CardContent>
          </Card>
        )}

        {lesson.phoneticMarkers && (
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-lg">🔊</span>
                {t('practice.phoneticGuide')}
              </CardTitle>
              <CardDescription>{t('practice.phoneticGuideDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-muted/20 rounded-xl text-base font-medium">
                {renderPhoneticText(lesson.phoneticMarkers)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Volume2 className="w-5 h-5" />{t('practice.shadowingText')}</CardTitle><CardDescription>{t('practice.shadowingTextDesc')}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 bg-muted/30 rounded-xl text-xl leading-relaxed font-medium">{renderClickableText(lesson.simplifiedText)}</div>
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button variant={isPlaying ? 'destructive' : 'default'} size="lg" onClick={handlePlay} className="gap-2">{isPlaying ? <><Pause className="w-5 h-5" />{t('practice.stop')}</> : <><Play className="w-5 h-5" />{t('practice.listen')}</>}</Button>
                <Button variant="outline" size="lg" onClick={handleReset}><RotateCcw className="w-5 h-5" /></Button>
              </div>
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <span className="text-sm text-muted-foreground">{t('practice.speed')}</span>
                <Slider value={[speed]} onValueChange={(v) => setSpeed(v[0])} min={0.5} max={2} step={0.1} className="flex-1" />
                <span className="text-sm font-medium w-12">{speed}x</span>
              </div>
              {availableVoices.length > 0 && (
                <select value={selectedVoice || ''} onChange={(e) => setSelectedVoice(e.target.value)} className="text-sm border rounded-lg px-3 py-2 bg-background flex-1 truncate max-w-[250px]">
                  {availableVoices.map((voice) => <option key={voice.name} value={voice.name}>{cleanVoiceName(voice.name)}</option>)}
                </select>
              )}
            </div>
          </CardContent>
        </Card>

        {(selectedWord || isExplaining) && (
          <Card className="animate-fade-in border-primary/30 bg-primary/5">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">{isExplaining ? t('practice.explaining') : `"${wordExplanation?.word || selectedWord}"`}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedWord(null)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent>
              {isExplaining ? (
                <div className="flex items-center gap-3 py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-muted-foreground">{t('practice.gettingExplanation')}</span></div>
              ) : wordExplanation ? (
                <div className="space-y-4">
                  <div><p className="text-sm font-semibold mb-1">{t('practice.definition')}</p><p className="text-sm text-muted-foreground">{wordExplanation.definition}</p></div>
                  {wordExplanation.pronunciation && (<div><p className="text-sm font-semibold mb-1">{t('practice.pronunciation')}</p><p className="text-sm text-muted-foreground">{wordExplanation.pronunciation}</p></div>)}
                  {wordExplanation.usage && (<div><p className="text-sm font-semibold mb-1">{t('practice.usage')}</p><p className="text-sm text-muted-foreground">{wordExplanation.usage}</p></div>)}
                  {wordExplanation.examples?.length > 0 && (
                    <div><p className="text-sm font-semibold mb-1">{t('practice.examples')}</p><ul className="space-y-1">{wordExplanation.examples.map((ex, i) => (<li key={i} className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30">{ex}</li>))}</ul></div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Mic className="w-5 h-5" />{t('practice.yourTurn')}</CardTitle><CardDescription>{t('practice.yourTurnDesc')}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <Button size="lg" className="btn-accent gap-2" onClick={handleStartRecording}><Mic className="w-5 h-5" />{t('practice.startRecording')}</Button>
              ) : (
                <Button size="lg" variant="destructive" className="gap-2" onClick={handleStopRecording} disabled={!isMicReady}>
                  {isMicReady ? <><Square className="w-5 h-5" />{t('practice.stopRecording')}</> : <><Loader2 className="w-5 h-5 animate-spin" /> {t('common.loading')}</>}
                </Button>
              )}
              {isRecording && isMicReady && <div className="flex items-center gap-2"><span className="w-3 h-3 bg-destructive rounded-full animate-pulse" /><span className="text-sm text-muted-foreground">{t('practice.recording')}</span></div>}
            </div>
            {spokenText && (
              <div className="p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                <p className="text-foreground transition-all duration-75">
                  {spokenText}
                  {isRecording && <span className="inline-block w-1 h-4 ml-1 bg-primary animate-pulse" />}
                </p>
              </div>
            )}
            {spokenText && !isRecording && <Button className="w-full btn-gradient" size="lg" onClick={handleAnalyze} disabled={isAnalyzing}>{isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('practice.analyzeSpeech')}</Button>}
          </CardContent>
        </Card>

        {analysisResult && (
          <Card className="animate-fade-in border-2 border-primary/20">
            <CardHeader><CardTitle className="flex items-center gap-2">{analysisResult.accuracy >= 80 ? <CheckCircle className="w-5 h-5 text-success" /> : <AlertTriangle className="w-5 h-5 text-warning" />}{t('practice.analysisResults')}</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-6">
                <div className={cn("text-6xl font-bold mb-2", analysisResult.accuracy >= 80 ? "text-success" : analysisResult.accuracy >= 40 ? "text-warning" : "text-destructive")}>{analysisResult.accuracy}%</div>
                <p className="text-muted-foreground">{analysisResult.accuracy >= 80 ? t('practice.excellent') : analysisResult.accuracy >= 40 ? t('practice.goodProgress') : "Tente ler o texto completo para melhorar."}</p>
              </div>
              {analysisResult.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">{t('practice.errorsFound')}</h4>
                  {analysisResult.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2 flex-wrap"><span className="font-medium">"{error.expected}"</span><span className="text-muted-foreground">&rarr;</span><span className="text-destructive font-bold">"{error.got}"</span></div>
                        <p className="text-muted-foreground mt-1"><strong>{error.rule}</strong>: {error.tip}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t"><Button onClick={handleReset} variant="outline" className="flex-1">{t('practice.tryAgain')}</Button></div>
            </CardContent>
          </Card>
        )}

        {history.length > 0 && (
          <div className="space-y-4 pt-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><HistoryIcon className="w-5 h-5 text-muted-foreground" /><h2 className="text-xl font-bold">Histórico de Prática</h2></div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => fetchHistory(currentPage - 1)} disabled={currentPage === 0}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm font-medium">{currentPage + 1} / {totalPages}</span>
                <Button variant="outline" size="icon" onClick={() => fetchHistory(currentPage + 1)} disabled={currentPage + 1 >= totalPages}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="grid gap-4">
              {history.map((session) => (
                <Card key={session.id} className="bg-muted/10 border-primary/5 group transition-all hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className={cn("text-xl font-bold", session.accuracy >= 80 ? "text-success" : "text-warning")}>{session.accuracy}%</div>
                          <span className="text-xs text-muted-foreground">{new Date(session.createdAt).toLocaleDateString()} {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm italic text-muted-foreground">"{session.transcribedText}"</p>
                        <div className="text-xs bg-primary/5 p-2 rounded flex gap-2 items-start"><MessageSquare className="w-3 h-3 mt-0.5 text-primary shrink-0" /><span>{session.feedback}</span></div>
                      </div>
                      <div className="flex items-center gap-3">
                        {session.audioUrl && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className={cn("rounded-full w-12 h-12 p-0", playingSessionId === session.id ? "bg-destructive/10" : "hover:bg-primary/10")}
                            onClick={() => handlePlaySessionAudio(session.id, session.audioUrl)}
                          >
                            {playingSessionId === session.id ? <Square className="w-5 h-5 text-destructive" /> : <Play className="w-5 h-5 text-primary" />}
                          </Button>
                        )}
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setSessionToDelete(session.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}