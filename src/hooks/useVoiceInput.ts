import { useState, useCallback, useRef } from 'react';

interface VoiceInputOptions {
  onResult?: (text: string) => void;
  lang?: string;
  continuous?: boolean;
  unsupportedMessage?: string;
  errorPrefix?: string;
}

export function useVoiceInput(options: VoiceInputOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError(options.unsupportedMessage || 'Voice input is not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = options.lang || 'en-US';
    recognition.continuous = options.continuous ?? false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const current = event.results[event.results.length - 1];
      if (current.isFinal) {
        const text = current[0].transcript;
        setTranscript(text);
        options.onResult?.(text);
      }
    };

    recognition.onerror = (event) => {
      setError(`${options.errorPrefix || 'Voice error'}: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setError(null);
  }, [isSupported, options.lang, options.continuous, options.onResult, options.unsupportedMessage, options.errorPrefix]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return { isListening, transcript, error, isSupported, startListening, stopListening, resetTranscript };
}
