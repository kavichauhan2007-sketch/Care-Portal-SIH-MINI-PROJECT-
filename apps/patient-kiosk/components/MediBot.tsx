'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Sparkles, ChevronDown } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export default function MediBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m MediBot, your medical assistant. How can I help you today?',
      timestamp: new Date(),
      suggestions: [
        'What symptoms should I report?',
        'How do I describe my pain?',
        'What documents do I need?',
        'How long will this take?',
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const generateBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('symptom') || lowerMessage.includes('report')) {
      return 'When reporting symptoms, please include:\n\n1. When did it start?\n2. Where is the pain/discomfort?\n3. How severe is it (1-10)?\n4. What makes it better or worse?\n5. Any associated symptoms?\n\nThis information helps doctors diagnose you faster!';
    }
    
    if (lowerMessage.includes('pain')) {
      return 'To describe your pain effectively:\n\n• Location: Where exactly does it hurt?\n• Quality: Sharp, dull, burning, aching?\n• Severity: Rate 1-10 (1=mild, 10=severe)\n• Timing: Constant or comes and goes?\n• Triggers: What makes it worse?\n\nUse our interactive body map on the pain location page!';
    }
    
    if (lowerMessage.includes('document') || lowerMessage.includes('bring')) {
      return 'Please bring these documents if available:\n\n✓ Previous prescriptions\n✓ Lab reports (last 6 months)\n✓ Discharge summaries\n✓ Allergy records\n✓ Current medication list\n✓ ID proof (Aadhar/ABHA)\n\nYou can upload them digitally during registration!';
    }
    
    if (lowerMessage.includes('time') || lowerMessage.includes('long')) {
      return 'The registration process typically takes 5-7 minutes. It includes:\n\n1. Identity verification (1 min)\n2. Consent forms (1 min)\n3. Symptoms description (2 min)\n4. Medical history (2 min)\n5. Document upload (1 min - optional)\n\nYou\'ll see your queue number after completion.';
    }
    
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      return '🚨 For medical emergencies:\n\n• Chest pain\n• Difficulty breathing\n• Severe bleeding\n• Loss of consciousness\n• Severe allergic reaction\n\nPlease alert staff immediately or call emergency services. Don\'t wait for registration!';
    }
    
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      return 'You\'re welcome! I\'m here to help. Feel free to ask if you have any other questions about the registration process. 😊';
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Hello! How can I assist you with your medical registration today?';
    }

    return 'I can help you with:\n\n• How to describe symptoms\n• What documents to bring\n• Pain assessment guidance\n• Registration process\n• Estimated waiting time\n\nPlease ask me anything about your visit!';
  };

  const handleSendMessage = async (content?: string) => {
    const messageContent = content || inputValue.trim();
    if (!messageContent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: generateBotResponse(messageContent),
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 700);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <>
      {/* Floating Toggle Button (Visible when chat is closed) */}
      {!isOpen && (
        <motion.button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-28 right-6 md:bottom-28 md:right-8 z-50 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl flex items-center justify-center bg-[#00685f] hover:bg-[#005049] text-white transition-all cursor-pointer"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          title="Open MediBot Assistant"
        >
          <Bot className="w-7 h-7 stroke-[2.2]" />
          
          {/* Notification Badge */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#ba1a1a] rounded-full flex items-center justify-center border-2 border-white">
            <span className="text-white text-[10px] font-bold">!</span>
          </div>
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-28 right-4 sm:right-6 md:right-8 w-[calc(100vw-2rem)] sm:w-[380px] md:w-[400px] h-[480px] sm:h-[520px] max-h-[calc(100vh-8.5rem)] bg-white rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-[#00685f]/30"
          >
            {/* Header with Prominent Close / Back Button */}
            <div className="bg-gradient-to-r from-[#00685f] to-[#008378] p-4 flex items-center justify-between text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border border-white/30">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-white font-bold text-base">MediBot</h3>
                    <span className="w-2 h-2 rounded-full bg-[#89f5e7] animate-pulse" />
                  </div>
                  <p className="text-white/80 text-[11px]">AI Medical Assistant</p>
                </div>
              </div>

              {/* Close / Minimize Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
                title="Close MediBot"
                aria-label="Close"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f9f9ff]">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-2xl p-3.5 text-xs sm:text-sm ${
                        message.type === 'user'
                          ? 'bg-[#00685f] text-white rounded-br-xs shadow-xs'
                          : 'bg-white text-[#151c27] rounded-bl-xs shadow-xs border border-slate-200/80'
                      }`}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{message.content}</p>
                    </div>
                    <p className="text-[10px] text-[#64748b] mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {/* Suggestions */}
                    {message.suggestions && (
                      <div className="mt-2 space-y-1.5">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="block w-full text-left text-xs px-3 py-2 bg-white hover:bg-teal-50/80 border border-slate-200 hover:border-[#00685f]/40 rounded-xl transition-all text-[#151c27] font-medium shadow-2xs"
                          >
                            💡 {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white rounded-2xl rounded-bl-xs p-3 shadow-xs border border-slate-200">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#00685f] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-[#00685f] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-[#00685f] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2 items-center"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask MediBot anything..."
                  className="flex-1 px-4 py-2.5 bg-[#f0f3ff] border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#00685f]/30 focus:border-[#00685f] text-xs sm:text-sm text-[#151c27]"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="w-10 h-10 rounded-full bg-[#00685f] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#005049] transition-colors shrink-0 shadow-xs cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4 -translate-x-0.5" />
                </button>
              </form>
              <p className="text-[10px] text-[#64748b] text-center mt-1.5">
                CarePortal AI Assistant • Instant Help
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
