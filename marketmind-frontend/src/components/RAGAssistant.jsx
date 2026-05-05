import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon,
  SparklesIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  chatWithAssistant, 
  getChatHistory, 
  getContentSuggestions 
} from '../services/api';

const shellCard = 'rounded-2xl border border-gray-200 bg-[hsl(0,0%,99.5%)] shadow-sm';

const RAGAssistant = ({ brandId, brandName }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (brandId) {
      loadChatHistory();
      loadSuggestions();
    }
  }, [brandId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(brandId);
      setMessages(history.messages || []);
      setSessionId(history.session_id);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Don't show error toast for history loading
    }
  };

  const loadSuggestions = async () => {
    try {
      const data = await getContentSuggestions(brandId);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText = null) => {
    const message = messageText || inputMessage.trim();
    if (!message) return;

    // Add user message immediately
    const userMessage = {
      id: Date.now(),
      message_type: 'user',
      content: message,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const response = await chatWithAssistant(brandId, message, sessionId);
      
      // Add assistant response
      const assistantMessage = {
        id: Date.now() + 1,
        message_type: 'assistant',
        content: response.response,
        sources: response.sources || [],
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setSessionId(response.session_id);
      
    } catch (error) {
      toast.error('Failed to get response from assistant');
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`${shellCard} p-4 mb-4`}>
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Brand Assistant</h3>
            <p className="text-sm text-gray-500">Ask questions about {brandName || 'your brand'}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={`${shellCard} flex-1 p-4 mb-4 overflow-hidden flex flex-col`}>
        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">
                Start a conversation with your brand assistant
              </p>
              {suggestions.length > 0 && showSuggestions && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">Suggested questions:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${message.message_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.message_type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Sources for assistant messages */}
                {message.message_type === 'assistant' && message.sources && message.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1 mb-1">
                      <DocumentTextIcon className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-500">Sources:</span>
                    </div>
                    <div className="space-y-1">
                      {message.sources.slice(0, 3).map((source, sourceIndex) => (
                        <div key={sourceIndex} className="text-xs text-gray-600">
                          • {source.document_filename} (Score: {source.similarity_score.toFixed(2)})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-70 mt-1">
                  {formatTime(message.created_at)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-gray-400 rounded-full animate-pulse" />
                  <div className="h-4 w-4 bg-gray-400 rounded-full animate-pulse delay-75" />
                  <div className="h-4 w-4 bg-gray-400 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className={`${shellCard} p-4`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your brand guidelines, campaigns, or content..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        
        {/* Warning about empty knowledge base */}
        {messages.length === 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
            <ExclamationTriangleIcon className="h-3 w-3" />
            <span>Assistant works best when you have documents uploaded to your knowledge base</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RAGAssistant;
