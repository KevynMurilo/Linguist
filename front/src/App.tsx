import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/lib/store";
import { TranslationProvider, useTranslation } from "@/i18n";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Lessons from "./pages/Lessons";
import NewLesson from "./pages/NewLesson";
import LessonPractice from "./pages/LessonPractice";
import Mastery from "./pages/Mastery";
import Timeline from "./pages/Timeline";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function TitleHandler() {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const path = location.pathname;
    
    // Mapeamento de rotas para chaves de tradução ou nomes fixos
    const routeTitles: Record<string, string> = {
      "/": "Linguist | Welcome",
      "/dashboard": t('nav.dashboard') + " | Linguist",
      "/lessons": t('nav.lessons') + " | Linguist",
      "/lessons/new": t('practice.newLesson') || "New Lesson | Linguist",
      "/mastery": t('nav.mastery') + " | Linguist",
      "/timeline": t('nav.history') + " | Linguist",
      "/settings": t('nav.settings') + " | Linguist",
    };

    // Lógica para rotas com ID (ex: /lessons/123)
    if (path.startsWith("/lessons/") && path !== "/lessons/new") {
      document.title = "Practice Session | Linguist";
    } else {
      document.title = routeTitles[path] || "Linguist";
    }
  }, [location, t]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((state) => state.user);
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TranslationProvider>
        <TooltipProvider>
          <BrowserRouter>
            {/* Componente que cuida do nome na aba */}
            <TitleHandler />
            
            <Routes>
              <Route path="/" element={<Onboarding />} />
              
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/lessons" element={<ProtectedRoute><Lessons /></ProtectedRoute>} />
              <Route path="/lessons/new" element={<ProtectedRoute><NewLesson /></ProtectedRoute>} />
              <Route path="/lessons/:id" element={<ProtectedRoute><LessonPractice /></ProtectedRoute>} />
              <Route path="/mastery" element={<ProtectedRoute><Mastery /></ProtectedRoute>} />
              <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </BrowserRouter>
        </TooltipProvider>
      </TranslationProvider>
    </QueryClientProvider>
  );
}