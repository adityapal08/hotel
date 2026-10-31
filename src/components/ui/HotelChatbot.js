'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  RotateCcw,
  CalendarCheck,
  Sparkles,
  MapPin,
  ShieldCheck,
  Check,
  ChevronRight,
  Loader2,
} from 'lucide-react';

const INITIAL_WELCOME_MESSAGE = {
  id: 'welcome-1',
  role: 'assistant',
  content:
    'Namaste & welcome to **Red Roots Villa**! I am your personal Villa Concierge.\n\nI can help you explore our three boutique homestays in Pondicherry, answer questions on room amenities and rates, check real-time date availability, or guide you through an instant cardless reservation.\n\nHow may I assist you today?',
  action: null,
};

const SUGGESTIONS = [
  'Can I get a discount for a 2-night stay?',
  'Explore All 3 Homestays',
  'Entire 3BHK Villa & Pool Rates',
  'What is the Zero Online Payment policy?',
];

export default function HotelChatbot({ onOpenModal }) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  const [messages, setMessages] = useState([INITIAL_WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isOpen, messages, isLoading]);

  const handleSendMessage = async (textToSend = null) => {
    const messageContent = (textToSend !== null ? textToSend : input).trim();
    if (!messageContent || isLoading) return;

    setHasInteracted(true);
    setInput('');

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.success && data.message) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.message.content,
            action: data.message.action || null,
          },
        ]);
      } else {
        throw new Error('Invalid response from assistant');
      }
    } catch (err) {
      console.error('Chatbot request error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content:
            'I apologize for the momentary delay. You can ask me about our homestay rates, private pool amenities, or dates, or click below to view the reservation form.',
          action: {
            type: 'open_booking_modal',
            propertyId: 'red-roots-villa',
            propertyName: 'Red Roots Villa',
            roomType: 'Deluxe Room',
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    setInput('');
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  };

  const handleProceedToBooking = (actionData) => {
    if (onOpenModal) {
      onOpenModal({
        propertyId: actionData.propertyId || 'red-roots-villa',
        propertyName: actionData.propertyName || 'Red Roots Villa',
        roomType: actionData.roomType || '',
        checkIn: actionData.checkIn || '',
        checkOut: actionData.checkOut || '',
        rooms: actionData.rooms || 1,
        adults: actionData.adults || 2,
        isNegotiated: Boolean(actionData.isNegotiated),
        originalTotalPrice: actionData.originalTotalPrice || 0,
        originalPricePerNight: actionData.originalPricePerNight || 0,
        negotiatedTotalPrice: actionData.negotiatedTotalPrice || actionData.totalPrice || 0,
        negotiatedPricePerNight: actionData.negotiatedPricePerNight || actionData.pricePerNight || 0,
        estimatedTotal: actionData.negotiatedTotalPrice || actionData.totalPrice || 0,
      });
    }
  };

  // Simple clean markdown parser for bold, bullets, and line breaks
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bullet point line
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('* ') || line.trim().startsWith('- ');
      const cleanLine = isBullet ? line.trim().replace(/^[•*-]\s*/, '') : line;

      // Parse bold **text**
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const renderedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#762F3D] mt-1.5 flex-shrink-0" />
            <span className="leading-relaxed">{renderedParts}</span>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="my-1 leading-relaxed">
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Chat Launcher Button (Replaces old Request a Call button) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close Villa Concierge Chat' : 'Open Villa Concierge Chat'}
          className="relative w-14 h-14 rounded-full bg-[#762F3D] text-white flex items-center justify-center shadow-[0_8px_30px_rgba(118,47,61,0.45)] hover:bg-[#5F2530] transition-colors border border-[#F7F3ED]/25 cursor-pointer group"
        >
          {/* Active online pulse dot */}
          {!isOpen && (
            <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#171719]" />
            </span>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <X className="w-6 h-6 stroke-[2]" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <MessageSquare className="w-6 h-6 fill-white stroke-none" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Hover Tooltip */}
          {!isOpen && (
            <span className="hidden sm:inline-block absolute right-full mr-3.5 top-1/2 -translate-y-1/2 bg-[#171719] text-[#F7F3ED] text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#762F3D]/30">
              Chat with Villa Concierge
            </span>
          )}
        </motion.button>
      </div>

      {/* Boutique Hotel Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[82vh] bg-[#171719] border border-[#762F3D]/30 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden text-white"
          >
            {/* Header */}
            <div className="bg-[#171719] border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#762F3D] border border-[#F7F3ED]/20 flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                  <Sparkles className="w-5 h-5 text-[#F7F3ED]" />
                </div>
                <div>
                  <h3 className="font-serif text-sm sm:text-base font-bold tracking-tight text-[#F7F3ED] leading-none">
                    Red Roots Concierge
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span className="text-[10px] tracking-wider uppercase text-[#F7F3ED]/60 font-medium">
                      Live Homestay Assistant • Online
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Reset Conversation"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#F7F3ED]/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close Window"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#F7F3ED]/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Zero-Payment Policy Micro-Banner */}
            <div className="bg-[#762F3D]/20 border-b border-[#762F3D]/30 px-4 py-2 flex items-center gap-2 text-[11px] text-[#F7F3ED]/80">
              <ShieldCheck className="w-3.5 h-3.5 text-[#F7F3ED] flex-shrink-0" />
              <span>Cardless Reservations • Pay Directly at Check-In</span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#121214] text-xs sm:text-sm">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-xs ${
                        isAssistant
                          ? 'bg-[#1F1F24] text-[#F7F3ED] border border-white/5 rounded-tl-xs'
                          : 'bg-[#762F3D] text-white rounded-tr-xs'
                      }`}
                    >
                      {renderFormattedText(msg.content)}

                      {/* Interactive Reservation Card inside Assistant Message */}
                      {isAssistant && msg.action && msg.action.type === 'open_booking_modal' && (
                        <div className="mt-3.5 pt-3 border-t border-white/10 bg-[#171719]/90 rounded-xl p-3 text-left border border-white/5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                msg.action.isNegotiated
                                  ? 'bg-[#762F3D]/40 text-[#F7F3ED] border border-[#762F3D]/60'
                                  : 'text-[#F7F3ED]/60'
                              }`}
                            >
                              {msg.action.isNegotiated ? 'Special Negotiated Rate' : 'Verified Reservation'}
                            </span>

                            {msg.action.isNegotiated && msg.action.negotiatedTotalPrice ? (
                              <div className="text-right">
                                {msg.action.originalTotalPrice > msg.action.negotiatedTotalPrice && (
                                  <span className="line-through text-[11px] text-[#F7F3ED]/40 mr-1.5 font-normal">
                                    ₹{Number(msg.action.originalTotalPrice).toLocaleString('en-IN')}
                                  </span>
                                )}
                                <span className="text-sm font-bold text-white">
                                  ₹{Number(msg.action.negotiatedTotalPrice).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ) : msg.action.pricePerNight > 0 ? (
                              <span className="text-xs font-bold text-white">
                                ₹{msg.action.pricePerNight.toLocaleString('en-IN')}{' '}
                                <span className="text-[10px] font-normal text-gray-400">/ night</span>
                              </span>
                            ) : null}
                          </div>

                          <div className="font-serif text-sm font-bold text-white mb-1">
                            {msg.action.roomType || 'Accommodation'}
                          </div>
                          <div className="text-[11px] text-[#F7F3ED]/70 mb-3 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-[#762F3D]" />
                            <span>{msg.action.propertyName || 'Red Roots Villa'}</span>
                            {msg.action.checkIn && msg.action.checkOut && (
                              <span>
                                • {msg.action.checkIn} to {msg.action.checkOut}
                              </span>
                            )}
                            {msg.action.rooms > 1 && (
                              <span>• {msg.action.rooms} Rooms</span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleProceedToBooking(msg.action)}
                            className="w-full py-2.5 rounded-xl bg-[#762F3D] hover:bg-[#5F2530] text-white text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                            <span>{msg.action.isNegotiated ? 'Continue to Booking' : 'Proceed to Reservation Form'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-[#F7F3ED]/60 bg-[#1F1F24] border border-white/5 px-3.5 py-2.5 rounded-2xl rounded-tl-xs w-fit">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#762F3D] animate-bounce" />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#762F3D] animate-bounce"
                      style={{ animationDelay: '0.15s' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[#762F3D] animate-bounce"
                      style={{ animationDelay: '0.3s' }}
                    />
                  </div>
                  <span className="text-[11px] ml-1">Concierge is checking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips (Visible before active interaction or upon greeting) */}
            {messages.length <= 2 && !isLoading && (
              <div className="px-3 py-2 bg-[#171719] border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(sug)}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#1F1F24] hover:bg-[#762F3D] border border-white/10 hover:border-[#762F3D] text-[11px] text-[#F7F3ED] hover:text-white transition-all cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-[#171719] border-t border-white/10 p-3 flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about rooms, dates, rates, or amenities..."
                disabled={isLoading}
                className="flex-1 bg-[#1F1F24] border border-white/10 text-white placeholder:text-[#F7F3ED]/40 text-xs sm:text-sm rounded-full px-4 py-2.5 focus:outline-none focus:border-[#762F3D] transition-colors disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-full bg-[#762F3D] hover:bg-[#5F2530] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-[#762F3D] cursor-pointer flex-shrink-0"
                aria-label="Send Message"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 ml-0.5" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
