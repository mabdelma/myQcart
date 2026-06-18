import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

interface AiChatProps {
  send: (messages: ChatMessage[]) => Promise<{ reply: string }>;
  placeholder?: string;
  greeting?: string;
  suggestions?: string[];
}

export function AiChat({ send, placeholder, greeting, suggestions = [] }: AiChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError('');
    const next = [...messages, { role: 'user' as const, content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const { reply } = await send(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError((err as { message?: string }).message || 'The assistant is unavailable.');
      setMessages(messages); // roll back the optimistic user turn
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => { e.preventDefault(); ask(input); };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto space-y-3 p-1">
        {messages.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 p-3">
            <div className="flex items-center gap-2 text-[#8B4513] font-medium mb-2"><Sparkles className="h-4 w-4" /> {greeting || 'Ask me anything.'}</div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">{s}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-[#8B4513] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}>{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <div className="px-3 py-2 text-xs text-red-600">{error}</div>}

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-gray-100 dark:border-gray-700 p-2">
        <input
          value={input} onChange={(e) => setInput(e.target.value)} disabled={busy}
          placeholder={placeholder || 'Type a message…'}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 px-3 py-2 text-sm focus:border-[#8B4513] focus:outline-none focus:ring-1 focus:ring-[#8B4513] disabled:opacity-50"
        />
        <button type="submit" disabled={busy || !input.trim()}
          className="flex items-center justify-center rounded-lg bg-[#8B4513] p-2.5 text-white hover:bg-[#5C4033] disabled:opacity-50">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
