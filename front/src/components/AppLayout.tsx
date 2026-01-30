import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  History,
  Settings,
  GraduationCap,
  LogOut,
  User,
  Globe,
  Check,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useTranslation, SUPPORTED_LOCALES } from '@/i18n';
import { LevelBadge } from './LevelBadge';
import { StreakDisplay } from './StreakDisplay';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from 'react';
import { AIChatBot } from './AIChatBot';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, reset } = useAppStore();
  const { t, locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/lessons', label: t('nav.lessons'), icon: BookOpen },
    { path: '/mastery', label: t('nav.mastery'), icon: BarChart3 },
    { path: '/timeline', label: t('nav.history'), icon: History },
  ];

  const handleLogout = () => {
    reset();
    window.location.href = '/';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container relative flex h-16 items-center justify-between px-4">
          
          <Link to="/dashboard" className="flex items-center gap-2 z-10">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:inline">
              Linguist
            </span>
          </Link>

          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 z-10">
            {user && (
              <>
                <div className="flex items-center gap-2 mr-1 sm:mr-4">
                  <StreakDisplay currentStreak={user.currentStreak} size="sm" />
                  <div className="hidden xs:block">
                    <LevelBadge level={user.level} size="sm" />
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
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

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <div className="flex flex-col gap-1 p-2">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs text-muted-foreground leading-none mt-1">{user.email}</p>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="cursor-pointer w-full flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          {t('nav.profile')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/settings" className="cursor-pointer w-full flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          {t('nav.settings')}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="cursor-pointer text-destructive focus:text-destructive w-full flex items-center"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('nav.logout')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 ml-1">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                      <SheetHeader className="text-left">
                        <SheetTitle className="flex items-center gap-2">
                          <GraduationCap className="h-6 w-6 text-primary" />
                          Linguist
                        </SheetTitle>
                      </SheetHeader>
                      <nav className="flex flex-col gap-2 mt-8">
                        {navItems.map((item) => {
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setOpen(false)}
                              className={cn(
                                'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors',
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              )}
                            >
                              <item.icon size={20} />
                              {item.label}
                            </Link>
                          );
                        })}
                      </nav>
                      <div className="absolute bottom-8 left-6 right-6">
                        <div className="p-4 bg-muted rounded-xl">
                          <div className="flex items-center gap-3 mb-3">
                            <LevelBadge level={user.level} />
                            <StreakDisplay currentStreak={user.currentStreak} />
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.name}
                          </p>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 mx-auto">
        {children}
      </main>

      {user && <AIChatBot />}
    </div>
  );
}