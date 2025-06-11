import React, { useState, useRef, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { getChatResponse } from '../lib/openai';
import TouchWrapper from './common/TouchWrapper';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const { rawData, uploadLimits } = useFinancial();

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatBoxRef.current && !chatBoxRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Auto-popup after 30 seconds of inactivity
  useEffect(() => {
    if (!isOpen && messages.length === 0) {
      const timer = setTimeout(() => {
        onClose(); // This will trigger opening the chat due to toggle behavior
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length, onClose]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    setInput('');
    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await getChatResponse(message, rawData);
      
      if (!response) {
        throw new Error('Failed to get response from AI assistant');
      }
      
      const assistantMessage: Message = {
        id: Date.now().toString(),
        text: response,
        sender: 'assistant',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting response:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={chatBoxRef}
      className={`fixed bottom-16 sm:bottom-24 right-3 sm:right-6 w-[95vw] sm:w-full sm:max-w-md 
        transition-all duration-300 ease-in-out transform 
        ${isOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-8 opacity-0 pointer-events-none'} 
        ${isMinimized ? 'h-14 sm:h-16' : 'h-[80vh] sm:h-[450px]'} 
        z-20 backdrop-blur-sm`}
      style={{ touchAction: 'none' }}
    >
      <TouchWrapper
        onSwipeDown={() => setIsMinimized(true)}
        onSwipeUp={() => setIsMinimized(false)}
        className="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white"
      >
        <div 
          className="bg-primary-600 text-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between cursor-pointer select-none" 
          onClick={() => setIsMinimized(!isMinimized)}
        >
          <div className="flex items-center">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-sm sm:text-base font-medium">Financial Assistant</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              className="hover:bg-primary-500 p-1 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              aria-label={isMinimized ? "Expand chat" : "Minimize chat"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMinimized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                )}
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="hover:bg-primary-500 p-1 rounded focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              aria-label="Close chat"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50 ${isMinimized ? 'hidden' : ''}`}>
          {/* Chat messages */}
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No messages yet. Start a conversation!</p>
              <div className="space-y-2">
                <p 
                  className="text-sm bg-gray-100 p-2 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                  onClick={() => handleSendMessage("What was my highest expense last month?")}
                >
                  "What was my highest expense last month?"
                </p>
                <p 
                  className="text-sm bg-gray-100 p-2 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
                  onClick={() => handleSendMessage("How does my income compare to last quarter?")}
                >
                  "How does my income compare to last quarter?"
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2.5 
                  ${message.sender === 'user' 
                    ? 'bg-primary-500 text-white' 
                    : 'bg-white border border-gray-200 shadow-sm'
                  }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                <div
                  className={`text-xs mt-1 ${message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'}`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 animate-pulse">
                <div className="h-4 w-20 bg-gray-300 rounded"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {!isMinimized && (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || isLoading) return;
            handleSendMessage(input.trim());
          }} className="flex items-center p-3 bg-white border-t border-gray-200">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`ml-2 bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center text-sm
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'} 
                transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span>Send</span>
              )}
            </button>
          </form>
        )}
      </TouchWrapper>
    </div>
  );
};

export default ChatBox;