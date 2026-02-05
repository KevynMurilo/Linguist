import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Dumbbell, Loader2, CheckCircle, XCircle,
  BookOpen, ChevronRight, RotateCcw, Trophy, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLayout } from '@/components/AppLayout';
import { MasteryBar } from '@/components/MasteryBar';
import { useAppStore } from '@/lib/store';
import { masteryApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  CompetenceResponse, ExerciseDTO, RelatedLessonDTO,
  SubmitExercisesResponse, getMasteryLevel
} from '@/lib/types';
import { cn } from '@/lib/utils';

type Phase = 'info' | 'loading' | 'quiz' | 'result';

export default function RulePractice() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, aiConfig, setCompetences } = useAppStore();

  const [competence, setCompetence] = useState<CompetenceResponse | null>(null);
  const [relatedLessons, setRelatedLessons] = useState<RelatedLessonDTO[]>([]);
  const [exercises, setExercises] = useState<ExerciseDTO[]>([]);
  const [phase, setPhase] = useState<Phase>('info');
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);

  // Result state
  const [submitResult, setSubmitResult] = useState<SubmitExercisesResponse | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!id || !user) return;
    setIsLoadingInfo(true);
    try {
      const [compsPage, lessonsPage] = await Promise.all([
        masteryApi.getByUser(user.id, 0, 100),
        masteryApi.getRelatedLessons(id, 0, 50),
      ]);
      const found = (compsPage.content || []).find(c => c.id === id);
      if (!found) {
        toast({ title: 'Erro', description: 'Regra nao encontrada.', variant: 'destructive' });
        navigate('/mastery');
        return;
      }
      setCompetence(found);
      setRelatedLessons(lessonsPage.content || []);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      navigate('/mastery');
    } finally {
      setIsLoadingInfo(false);
    }
  }, [id, user]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const handleGenerateExercises = async () => {
    if (!id || !aiConfig) {
      toast({ title: 'Configure a IA', description: 'Va em Configuracoes e adicione sua chave de API.', variant: 'destructive' });
      return;
    }
    setPhase('loading');
    try {
      const response = await masteryApi.generateExercises(id);
      setExercises(response.exercises);
      setCompetence(response.competence);
      if (response.relatedLessons) setRelatedLessons(response.relatedLessons);
      setCurrentIndex(0);
      setSelectedOption(null);
      setAnswered(false);
      setCorrectCount(0);
      setAnswers([]);
      setPhase('quiz');
    } catch (error: any) {
      toast({ title: 'Erro ao gerar exercicios', description: error.message, variant: 'destructive' });
      setPhase('info');
    }
  };

  const handleSelectOption = (index: number) => {
    if (answered) return;
    setSelectedOption(index);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === exercises[currentIndex].correctIndex;
    setAnswered(true);
    setAnswers(prev => [...prev, isCorrect]);
    if (isCorrect) setCorrectCount(prev => prev + 1);
  };

  const handleNextQuestion = async () => {
    if (currentIndex + 1 < exercises.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
    } else {
      // Quiz finished - submit results
      try {
        const result = await masteryApi.submitExercises(id!, correctCount, exercises.length);
        setSubmitResult(result);
        setCompetence(result.competence);

        // Update global competences
        if (user) {
          const updated = await masteryApi.getByUser(user.id, 0, 100);
          setCompetences(updated.content || []);
        }
        setPhase('result');
      } catch (error: any) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      }
    }
  };

  const handleRetry = () => {
    setPhase('info');
    setExercises([]);
    setSubmitResult(null);
    fetchInfo();
  };

  const getMasteryColorClass = (level: number) => {
    if (level < 30) return 'text-red-500';
    if (level < 50) return 'text-orange-500';
    if (level < 70) return 'text-yellow-500';
    if (level < 90) return 'text-green-500';
    return 'text-emerald-500';
  };

  if (isLoadingInfo || !competence) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh] animate-pulse">
          Carregando...
        </div>
      </AppLayout>
    );
  }

  const currentExercise = exercises[currentIndex];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in pb-20">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/mastery"><ArrowLeft className="w-4 h-4 mr-2" />Voltar ao Grafo</Link>
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-primary" />
              {competence.ruleName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Pratique para melhorar seu dominio nesta regra
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Dominio</p>
            <p className={cn("text-3xl font-bold", getMasteryColorClass(competence.masteryLevel))}>
              {competence.masteryLevel}%
            </p>
          </div>
        </div>

        <MasteryBar value={competence.masteryLevel} showPercentage size="lg" />

        {/* Info Phase */}
        {phase === 'info' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold">{competence.practiceCount}</p>
                  <p className="text-xs text-muted-foreground">Praticas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold text-destructive">{competence.failCount}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-2xl font-bold">
                    {competence.practiceCount > 0
                      ? Math.round(((competence.practiceCount - competence.failCount) / competence.practiceCount) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Acertos</p>
                </CardContent>
              </Card>
            </div>

            {/* Related Lessons */}
            {relatedLessons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Aulas com esta regra
                  </CardTitle>
                  <CardDescription>
                    Aulas onde "{competence.ruleName}" foi praticada
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {relatedLessons.map(lesson => (
                    <Link
                      key={lesson.id}
                      to={`/lessons/${lesson.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{lesson.topic}</p>
                        <p className="text-xs text-muted-foreground">{lesson.targetLanguage}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-sm font-bold",
                          lesson.bestScore >= 80 ? "text-green-500" : "text-muted-foreground"
                        )}>
                          {lesson.bestScore}%
                        </span>
                        {lesson.completed && <CheckCircle className="w-4 h-4 text-green-500" />}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Generate Exercises Button */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 text-center space-y-4">
                <Target className="w-12 h-12 text-primary mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">Exercicios focados</h3>
                  <p className="text-sm text-muted-foreground">
                    Gere 5 exercicios de multipla escolha focados em "{competence.ruleName}" para melhorar seu dominio.
                  </p>
                </div>
                <Button size="lg" className="gap-2" onClick={handleGenerateExercises}>
                  <Dumbbell className="w-5 h-5" />
                  Gerar Exercicios
                </Button>
                {!aiConfig && (
                  <p className="text-xs text-destructive">
                    Configure sua chave de IA em Configuracoes primeiro.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Loading Phase */}
        {phase === 'loading' && (
          <Card className="py-16">
            <CardContent className="text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Gerando exercicios...</h3>
                <p className="text-sm text-muted-foreground">
                  A IA esta criando exercicios personalizados para "{competence.ruleName}"
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz Phase */}
        {phase === 'quiz' && currentExercise && (
          <>
            {/* Progress */}
            <div className="flex items-center gap-2">
              {exercises.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    i < currentIndex ? (answers[i] ? "bg-green-500" : "bg-red-500")
                      : i === currentIndex ? "bg-primary"
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Exercicio {currentIndex + 1} de {exercises.length}
            </p>

            {/* Question */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg leading-relaxed">
                  {currentExercise.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentExercise.options.map((option, i) => {
                  const isCorrect = i === currentExercise.correctIndex;
                  const isSelected = i === selectedOption;

                  let optionClass = "border-2 p-4 rounded-lg cursor-pointer transition-all";
                  if (!answered) {
                    optionClass += isSelected
                      ? " border-primary bg-primary/10"
                      : " border-muted hover:border-primary/50";
                  } else {
                    if (isCorrect) {
                      optionClass += " border-green-500 bg-green-500/10";
                    } else if (isSelected && !isCorrect) {
                      optionClass += " border-red-500 bg-red-500/10";
                    } else {
                      optionClass += " border-muted opacity-50";
                    }
                    optionClass += " cursor-default";
                  }

                  return (
                    <div
                      key={i}
                      className={optionClass}
                      onClick={() => handleSelectOption(i)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                          answered && isCorrect ? "bg-green-500 text-white"
                            : answered && isSelected && !isCorrect ? "bg-red-500 text-white"
                            : isSelected ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {answered && isCorrect ? <CheckCircle className="w-5 h-5" />
                            : answered && isSelected && !isCorrect ? <XCircle className="w-5 h-5" />
                            : String.fromCharCode(65 + i)}
                        </span>
                        <span className="font-medium">{option}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Explanation (shown after answering) */}
                {answered && (
                  <div className={cn(
                    "p-4 rounded-lg mt-4 border-l-4",
                    selectedOption === currentExercise.correctIndex
                      ? "bg-green-500/10 border-green-500"
                      : "bg-orange-500/10 border-orange-500"
                  )}>
                    <p className="text-sm font-semibold mb-1">
                      {selectedOption === currentExercise.correctIndex ? 'Correto!' : 'Resposta incorreta'}
                    </p>
                    <p className="text-sm text-muted-foreground">{currentExercise.explanation}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  {!answered ? (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleConfirmAnswer}
                      disabled={selectedOption === null}
                    >
                      Confirmar
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleNextQuestion}
                    >
                      {currentIndex + 1 < exercises.length ? 'Proximo' : 'Ver Resultado'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Result Phase */}
        {phase === 'result' && submitResult && (
          <Card className="border-2 border-primary/20">
            <CardContent className="pt-8 text-center space-y-6">
              <Trophy className={cn(
                "w-16 h-16 mx-auto",
                correctCount >= 4 ? "text-yellow-500" : correctCount >= 3 ? "text-green-500" : "text-muted-foreground"
              )} />

              <div>
                <h2 className="text-2xl font-bold">
                  {correctCount}/{exercises.length} corretas
                </h2>
                <p className="text-muted-foreground">
                  {correctCount === exercises.length ? 'Perfeito!'
                    : correctCount >= 4 ? 'Excelente!'
                    : correctCount >= 3 ? 'Bom progresso!'
                    : 'Continue praticando!'}
                </p>
              </div>

              {/* Mastery change */}
              <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-center gap-4 text-lg">
                  <span className="text-muted-foreground">{submitResult.previousMastery}%</span>
                  <span className={cn(
                    "font-bold",
                    submitResult.change > 0 ? "text-green-500" : submitResult.change < 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {submitResult.change > 0 ? '+' : ''}{submitResult.change}%
                  </span>
                  <span className={cn("font-bold", getMasteryColorClass(submitResult.newMastery))}>
                    {submitResult.newMastery}%
                  </span>
                </div>
                <MasteryBar value={submitResult.newMastery} showPercentage size="lg" />
              </div>

              {/* Answer summary */}
              <div className="flex justify-center gap-2">
                {answers.map((correct, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      correct ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    )}
                  >
                    {correct ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleRetry}>
                  <RotateCcw className="w-4 h-4" />
                  Praticar Novamente
                </Button>
                <Button className="flex-1" onClick={() => navigate('/mastery')}>
                  Voltar ao Grafo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
