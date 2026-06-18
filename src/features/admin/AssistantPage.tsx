import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { aiApi } from '../../lib/api';
import { AiChat, type ChatMessage } from '../../components/ai/AiChat';

export function AssistantPage() {
  const { state: { tenant } } = useAuth();
  const slug = tenant?.slug;
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!slug) return;
    aiApi.status(slug).then((r) => setEnabled(r.enabled)).catch(() => setEnabled(false));
  }, [slug]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-[#8B4513]" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Assistant</h1>
      </div>

      {enabled === false ? (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 text-sm text-amber-800">
          The AI assistant isn't configured yet. Add an <code>ANTHROPIC_API_KEY</code> to the server to enable it.
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          {slug && (
            <AiChat
              greeting="Ask about your sales, menu, or orders — or have me draft menu copy."
              placeholder="e.g. How did we do this week?"
              suggestions={[
                'How much revenue this month?',
                'What are my top 5 items?',
                'Write a description for my best-seller',
                'Show recent orders',
              ]}
              send={(messages: ChatMessage[]) => aiApi.adminChat(slug, messages)}
            />
          )}
        </div>
      )}
    </div>
  );
}
