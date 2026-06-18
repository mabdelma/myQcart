import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { aiApi } from '../../lib/api';

type VoiceState = 'idle' | 'connecting' | 'live' | 'error';

/**
 * Voice ordering — connects the guest's mic to OpenAI's Realtime API over
 * WebRTC using a short-lived token minted by our backend (the API key never
 * reaches the browser). The model has the menu as spoken context.
 */
export function VoiceOrderWidget({ slug }: { slug: string }) {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<VoiceState>('idle');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!slug) return;
    aiApi.status(slug).then((r) => setEnabled(r.enabled)).catch(() => setEnabled(false));
  }, [slug]);

  function cleanup() {
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((t) => t.stop());
    micRef.current = null;
  }
  useEffect(() => cleanup, []);

  async function start() {
    setState('connecting');
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      const { clientSecret, model } = await aiApi.voiceSession(slug);

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.ontrack = (e) => { if (audioRef.current) audioRef.current.srcObject = e.streams[0]; };
      const track = mic.getAudioTracks()[0];
      if (track) pc.addTrack(track, mic);
      pc.createDataChannel('oai-events');
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'failed' || s === 'disconnected' || s === 'closed') { cleanup(); setState('idle'); }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const resp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${clientSecret}`, 'Content-Type': 'application/sdp' },
      });
      if (!resp.ok) throw new Error('connect failed');
      await pc.setRemoteDescription({ type: 'answer', sdp: await resp.text() });
      setState('live');
    } catch {
      cleanup();
      setState('error');
    }
  }

  function stop() { cleanup(); setState('idle'); }

  if (!enabled) return null;

  const live = state === 'live';
  const label = live ? 'Listening… tap to stop' : state === 'connecting' ? 'Connecting…' : state === 'error' ? 'Tap to retry' : 'Order by voice';

  return (
    <>
      <audio ref={audioRef} autoPlay hidden />
      <button
        onClick={live ? stop : start}
        disabled={state === 'connecting'}
        aria-label={live ? 'Stop voice ordering' : 'Order by voice'}
        className={`fixed bottom-6 left-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg disabled:opacity-70 ${
          live ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-[#8B4513] hover:bg-[#5C4033]'
        }`}
      >
        {state === 'connecting' ? <Loader2 className="h-5 w-5 animate-spin" /> : live ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        <span className="text-sm font-medium">{label}</span>
      </button>
    </>
  );
}
