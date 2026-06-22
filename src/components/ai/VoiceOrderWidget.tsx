import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, X } from 'lucide-react';
import { aiApi } from '../../lib/api';
import { useI18n } from '../../contexts/I18nContext';
import { WaveAvatar } from './WaveAvatar';

type VoiceState = 'idle' | 'connecting' | 'live' | 'error';

/**
 * Voice ordering — connects the guest's mic to OpenAI's Realtime API over
 * WebRTC using a short-lived token minted by our backend (the API key never
 * reaches the browser). The model has the menu as spoken context. The live UI
 * mirrors Escoutly's immersive voice panel, re-themed to Qlisted's browns.
 */
export function VoiceOrderWidget({ slug }: { slug: string }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [speaking, setSpeaking] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!slug) return;
    aiApi.status(slug).then((r) => setEnabled(r.enabled)).catch(() => setEnabled(false));
  }, [slug]);

  function cleanup() {
    cancelAnimationFrame(rafRef.current);
    acRef.current?.close().catch(() => {});
    acRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    micRef.current?.getTracks().forEach((tr) => tr.stop());
    micRef.current = null;
    setSpeaking(false);
  }
  useEffect(() => cleanup, []);

  // Drive the avatar from the AI's audio output level (reactive, like Escoutly).
  function attachAnalyser(stream: MediaStream) {
    try {
      const ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      acRef.current = ac;
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setSpeaking(avg > 12);
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* analyser optional */ }
  }

  async function start() {
    setState('connecting');
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      const { clientSecret } = await aiApi.voiceSession(slug);

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.ontrack = (e) => {
        if (audioRef.current) audioRef.current.srcObject = e.streams[0];
        attachAnalyser(e.streams[0]);
      };
      const track = mic.getAudioTracks()[0];
      if (track) pc.addTransceiver(track, { direction: 'sendrecv' });
      pc.createDataChannel('oai-events');
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        if (s === 'failed' || s === 'disconnected' || s === 'closed') { cleanup(); setState('idle'); }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const resp = await fetch('https://api.openai.com/v1/realtime/calls', {
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
  const active = state === 'live' || state === 'connecting';
  const pillLabel = state === 'connecting' ? t('voice.connecting')
    : state === 'error' ? t('voice.retry')
    : t('voice.cta');

  return (
    <>
      <audio ref={audioRef} autoPlay hidden />

      {/* Idle / error → floating pill */}
      {!active && (
        <button
          onClick={start}
          aria-label={t('voice.cta')}
          className="fixed bottom-6 left-5 z-40 flex items-center gap-2 rounded-full bg-[#8B4513] px-4 py-3 text-white shadow-lg hover:bg-[#5C4033]"
        >
          {state === 'error' ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          <span className="text-sm font-medium">{pillLabel}</span>
        </button>
      )}

      {/* Connecting / live → immersive voice panel (Escoutly-style, Qlisted browns) */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative flex w-[min(92vw,26rem)] flex-col items-center gap-6 rounded-3xl bg-gradient-to-b from-[#3f2415] to-[#1c120c] p-8 text-center shadow-2xl ring-1 ring-white/10">
            <button onClick={stop} aria-label={t('voice.stop')} className="absolute right-4 top-4 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <WaveAvatar speaking={live && speaking} />
            <div>
              <p className="text-lg font-semibold text-white">
                {state === 'connecting' ? t('voice.connecting') : speaking ? t('voice.speaking') : t('voice.listening')}
              </p>
              <p className="mt-1 text-sm text-amber-100/70">{t('voice.hint')}</p>
            </div>
            <button
              onClick={stop}
              disabled={state === 'connecting'}
              className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-60"
            >
              {state === 'connecting' ? <Loader2 className="h-5 w-5 animate-spin" /> : <MicOff className="h-5 w-5" />}
              {state === 'connecting' ? t('voice.connecting') : t('voice.stop')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
