
"use client";

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, CornerDownLeft, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { askAssistant } from '@/ai/flows/assistant-flow';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { MessageData } from 'genkit';
import { useAssistant } from './assistant-provider';

type ChatMessage = {
  role: 'user' | 'model';
  content: string;
  isTool?: boolean;
};

const suggestedPrompts = [
    { label: "What's the system status?", prompt: "What is the current system status?" },
    { label: "Create a new report", prompt: "How do I create a new report?" },
    { label: "Show dashboard stats", prompt: "Can you show me the dashboard stats?" },
    { label: "Go to settings", prompt: "Take me to the settings page" },
]

export function Assistant() {
  const { isOpen, setOpen: setIsOpen } = useAssistant();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleSend = async (prompt?: string) => {
    const userMessage = prompt || input;
    if (!userMessage) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const history = newMessages.map(msg => ({ role: msg.role, content: [{ text: msg.content }] }));
      const { output: assistantResponse } = await askAssistant(history);

      if (!assistantResponse) {
        throw new Error("No response from assistant.");
      }

      let finalMessages: ChatMessage[] = [...newMessages];

      if (assistantResponse.content) {
          const modelMessage: ChatMessage = { role: 'model', content: '' };
          assistantResponse.content.forEach(part => {
              if (part.text) {
                  modelMessage.content += part.text;
              }
              if (part.toolRequest) {
                  modelMessage.isTool = true;
                  modelMessage.content += `Using tool: ${part.toolRequest.name}...`;

                  // Handle navigation tool
                  if (part.toolRequest.name === 'navigateTo' && part.toolRequest.input.page) {
                      setTimeout(() => {
                        router.push(part.toolRequest.input.page);
                        setIsOpen(false);
                      }, 1000);
                  }
              }
          });
          finalMessages.push(modelMessage);
      }
      
      setMessages(finalMessages);

    } catch (error) {
      console.error("Assistant error:", error);
      setMessages([...newMessages, { role: 'model', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-5 z-50"
          >
            <Card className="w-[380px] h-[500px] shadow-2xl flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>SCADA Assistant</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="p-6 space-y-4">
                        {messages.length === 0 && !isLoading && (
                            <div className='text-center p-4'>
                                <p className='text-sm text-muted-foreground mb-4'>What can I help you with?</p>
                                <div className='grid grid-cols-2 gap-2'>
                                    {suggestedPrompts.map(p => (
                                        <Button key={p.label} variant='outline' size='sm' className='h-auto justify-between text-left' onClick={() => handleSend(p.prompt)}>
                                            <span>{p.label}</span>
                                            <ArrowRight className='h-4 w-4'/>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map((message, index) => (
                        <div
                            key={index}
                            className={cn(
                            'flex gap-3 text-sm',
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                        >
                            {message.role === 'model' && (
                                <div className="p-2 bg-muted rounded-full h-fit">
                                    <Bot className="h-5 w-5 text-muted-foreground" />
                                </div>
                            )}
                            <div
                            className={cn(
                                'rounded-xl px-4 py-2 max-w-[80%]',
                                message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                            >
                            <p>{message.content}</p>
                            </div>
                        </div>
                        ))}
                         {isLoading && (
                             <div className="flex gap-3 text-sm justify-start">
                                 <div className="p-2 bg-muted rounded-full h-fit">
                                     <Bot className="h-5 w-5 text-muted-foreground" />
                                 </div>
                                 <div className="rounded-xl px-4 py-2 bg-muted flex items-center">
                                     <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                 </div>
                             </div>
                         )}
                    </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="pt-4 border-t">
                <div className="relative w-full">
                    <Input
                        placeholder="Ask me anything..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                    />
                    <Button 
                        size="icon" 
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => handleSend()}
                        disabled={isLoading || !input}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, duration: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-5 right-5 z-50"
      >
        <Button size="icon" className="rounded-full w-14 h-14 shadow-lg" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-7 w-7" /> : <Bot className="h-7 w-7" />}
          <span className="sr-only">Toggle Assistant</span>
        </Button>
      </motion.div>
    </>
  );
}
