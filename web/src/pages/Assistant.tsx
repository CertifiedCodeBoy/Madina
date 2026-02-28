import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Bot } from 'lucide-react';
import clsx from 'clsx';
import { sendMessage, type AssistantResponse } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: string[];
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
];

const WELCOME: Record<string, string> = {
  en: "Hello! I'm your Madina municipal assistant. How can I help you?",
  ar: "مرحباً! أنا مساعدك البلدي. كيف يمكنني مساعدتك؟",
  fr: "Bonjour ! Je suis votre assistant municipal Madina. Comment puis-je vous aider ?",
};

export default function Assistant() {
  const { t, i18n } = useTranslation();
  const [lang, setLang] = useState<'en' | 'ar' | 'fr'>('en');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: WELCOME[lang] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const changeLang = (l: 'en' | 'ar' | 'fr') => {
    setLang(l);
    i18n.changeLanguage(l);
    setMessages([{ id: 'welcome', role: 'assistant', content: WELCOME[l] }]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const { data } = await sendMessage(text, lang, sessionId);
      if (!sessionId) setSessionId(data.session_id);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.reply,
          actions: data.suggested_actions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: 'err', role: 'assistant', content: t('common.error') },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('assistant.title')}</h1>
          <p className="text-sm text-gray-500">Multilingual · Arabic · French · English</p>
        </div>
        <div className="flex gap-1">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLang(l.code as 'en' | 'ar' | 'fr')}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                lang === l.code
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={clsx(
                'max-w-[80%] rounded-2xl px-4 py-3',
                msg.role === 'user'
                  ? 'bg-primary-500 text-white rounded-br-sm'
                  : 'bg-white shadow-sm rounded-bl-sm border border-gray-100',
              )}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                  <Bot size={13} /> Madina
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
              {msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.actions.map((action) => (
                    <button
                      key={action}
                      onClick={() => setInput(action)}
                      className="text-xs bg-blue-50 text-primary-600 border border-primary-200 font-semibold px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm border border-gray-100 px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('assistant.placeholder')}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="bg-primary-500 hover:bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
