import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { aiApi } from '../../lib/api';
import { AiChat, type ChatMessage } from './AiChat';

/** Floating "ask about the menu" assistant for the customer ordering page. */
export function CustomerAiWidget({ slug }: { slug: string }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    aiApi.status(slug).then((r) => setEnabled(r.enabled)).catch(() => setEnabled(false));
  }, [slug]);

  if (!enabled) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask about the menu"
          className="fixed bottom-24 right-5 z-40 flex items-center gap-2 rounded-full bg-[#8B4513] px-4 py-3 text-white shadow-lg hover:bg-[#5C4033]"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Ask</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[28rem] w-[min(92vw,22rem)] flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
          <div className="flex items-center justify-between rounded-t-2xl bg-[#8B4513] px-4 py-3 text-white">
            <span className="text-sm font-semibold">Menu assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 min-h-0 p-2">
            <AiChat
              greeting="Hi! Ask me about the menu or what to order."
              placeholder="What's good here?"
              suggestions={['What do you recommend?', 'Any vegetarian options?', "What's popular?"]}
              send={(messages: ChatMessage[]) => aiApi.customerChat(slug, messages)}
            />
          </div>
        </div>
      )}
    </>
  );
}
