import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/lib/store';
import { aiApi } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const formatMessage = (text: string) => {
    const cleanText = text.replace(/\[\d+\]/g, '').trim();

    return cleanText.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-2 last:mb-0 leading-relaxed">
          {parts.map((part, j) => 
            part.startsWith('**') && part.endsWith('**') 
              ? <strong key={j} className="font-bold text-primary">{part.slice(2, -2)}</strong> 
              : part
          )}
        </p>
      );
    });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !user || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const data = await aiApi.chat(userMessage, user.id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Ops, tive um erro ao processar. Tente novamente!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <Card className="mb-4 w-[350px] sm:w-[400px] h-[550px] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 duration-300 border-primary/20">
          <CardHeader className="p-4 bg-primary text-primary-foreground flex flex-row items-center justify-between rounded-t-xl shrink-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Linguist Assistant
            </CardTitle>
            <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/20 text-white" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-hidden bg-muted/5">
            <ScrollArea className="h-full p-4" ref={scrollRef}>
              <div className="flex flex-col gap-4 pb-4">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none text-sm shadow-sm border border-border max-w-[85%]">
                    Olá <strong>{user?.name}</strong>! Como posso te ajudar com seu inglês hoje?
                  </div>
                </div>

                {messages.map((m, i) => (
                  <div key={i} className={cn("flex gap-3 items-start", m.role === 'user' && "flex-row-reverse")}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                      m.role === 'user' ? "bg-accent border-accent/20" : "bg-primary/10 border-primary/20"
                    )}>
                      {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-primary" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm shadow-sm max-w-[85%]",
                      m.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-white border border-border rounded-tl-none text-foreground"
                    )}>
                      {m.role === 'assistant' ? formatMessage(m.content) : m.content}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                    <div className="bg-white/50 p-2.5 rounded-2xl rounded-tl-none border border-dashed border-primary/30">
                      <span className="text-[10px] text-muted-foreground animate-pulse font-medium uppercase tracking-wider">Digitando...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          <CardFooter className="p-3 border-t bg-background shrink-0">
            <form className="flex w-full items-center gap-2" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
              <Input 
                placeholder="Tire sua dúvida..." 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 focus-visible:ring-primary"
                autoFocus
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="shrink-0 shadow-md">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}

      <Button 
        size="lg" 
        className={cn(
          "rounded-full h-14 w-14 shadow-2xl transition-all duration-300 hover:scale-110",
          isOpen ? "bg-destructive hover:bg-destructive rotate-90" : "bg-primary hover:bg-primary/90"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </Button>
    </div>
  );
}