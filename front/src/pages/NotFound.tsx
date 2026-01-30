import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from '@/i18n';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center animate-fade-in">
      <div className="space-y-6 max-w-md">
        {/* Visual de erro impactante e limpo */}
        <h1 className="text-9xl font-black text-primary/10 select-none">404</h1>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            {t('notFound.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('notFound.message')}
          </p>
        </div>

        {/* Botão de Voltar para a página anterior */}
        <Button 
          size="lg" 
          variant="default"
          className="gap-2 shadow-lg transition-all hover:scale-105"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
          {t('common.back') || 'Voltar'}
        </Button>
      </div>
    </div>
  );
};

export default NotFound;