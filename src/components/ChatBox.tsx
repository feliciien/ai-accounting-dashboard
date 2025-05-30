import React, { useState, useRef, useEffect } from 'react';
import { useFinancial } from '../context/FinancialContext';
import { getChatResponse } from '../lib/openai';

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
      className={`fixed bottom-24 right-6 w-full max-w-md transition-all duration-300 ease-in-out transform ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'} ${isMinimized ? 'h-16' : 'h-[450px]'}`}
    >
      <div className="flex flex-col h-full border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white">
      <div className="bg-primary-600 text-white px-4 py-3 flex items-center justify-between cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="font-medium">Financial Assistant</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="hover:bg-primary-500 p-1 rounded"
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
            className="hover:bg-primary-500 p-1 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="p-4 border rounded-lg bg-gray-50 mt-4">
            <p className="text-sm text-gray-600 mb-2">Try asking:</p>
            <div className="space-y-2">
              <button
                onClick={() => handleSendMessage("What's my income trend?")}
                className="w-full text-left p-2 rounded bg-white hover:bg-gray-100 text-sm text-gray-700"
              >
                📈 What's my income trend?
              </button>
              <button
                onClick={() => handleSendMessage("What will my cash position be next month?")}
                className="w-full text-left p-2 rounded bg-white hover:bg-gray-100 text-sm text-gray-700"
              >
                💰 What will my cash position be next month?
              </button>
            </div>
            {!uploadLimits.hasPremium && (
              <p className="text-xs text-gray-500 mt-2">
                Upgrade to Pro for full historical analysis and predictions
              </p>
            )}
          </div>
        )}
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 p-6 bg-white rounded-xl border border-gray-100 shadow-sm">
            <svg className="w-12 h-12 mx-auto text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="font-medium text-gray-700 mt-4">Ask a question about your financial data</p>
            <div className="mt-4 space-y-2">
              <p className="text-sm bg-gray-100 p-2 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                "What was my highest expense category last month?"
              </p>
              <p className="text-sm bg-gray-100 p-2 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                "How does my income compare to last quarter?"
              </p>
              <p className="text-sm bg-gray-100 p-2 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                "What's my projected cash flow for next month?"
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${message.sender === 'user' 
                  ? 'bg-primary-500 text-white' 
                  : 'bg-white border border-gray-200 shadow-sm'}`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                <div
                  className={`text-xs mt-1 ${message.sender === 'user' ? 'text-primary-100' : 'text-gray-500'}`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 animate-pulse">
              <div className="h-4 w-20 bg-gray-300 rounded"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 0 && rawData.length === 0 && (
        <div className="p-4 bg-gray-50 rounded-lg m-4 space-y-3">
          <p className="text-gray-500 text-sm">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleSendMessage("What’s my income trend?")}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
            >
              Income trend
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage("What will my cash position be next month?")}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
            >
              Cash position forecast
            </button>
          </div>
        </div>
      )}

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
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`ml-2 bg-primary-500 text-white px-4 py-2 rounded-lg flex items-center ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-600'} transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing
            </span>
          ) : (
            <>
              <span>Send</span>
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </form>
      </div>
    </div>
  );
};

export default ChatBox;