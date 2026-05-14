import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
import TextHeart from './components/TextHeart';

const Typewriter = ({ text, delay = 50, onComplete }: { text: string, delay?: number, onComplete?: () => void }) => {
  const [currentText, setCurrentText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, delay, onComplete]);

  return <span className="font-mono">{currentText}</span>;
};

export default function App() {
  const [stage, setStage] = useState<'console' | 'reveal'>('console');
  const [consoleFinished, setConsoleFinished] = useState(false);
  const [heartComplete, setHeartComplete] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioStarted = useRef(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const setupAnalyser = useCallback(() => {
    if (audioCtxRef.current || !audioRef.current) return;
    try {
      const audioCtx = new AudioContext();
      audioCtx.resume().catch(() => {});
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      const source = audioCtx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
    } catch {
      // beat detection unavailable, timer-based fallback will be used
    }
  }, []);

  const startAudio = useCallback(() => {
    if (!audioRef.current) return;
    if (!audioStarted.current) {
      audioRef.current.play().then(() => { audioStarted.current = true; }).catch(() => {});
    }
    // Set up beat detection on first user gesture (guarantees AudioContext can run)
    setupAnalyser();
  }, [setupAnalyser]);

  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}angel.mp3`);
    audio.loop = true;
    audio.volume = 0.5;
    audio.muted = true;
    audioRef.current = audio;

    audio.play().then(() => {
      audio.muted = false;
      audioStarted.current = true;
    }).catch(() => {
      audio.muted = false;
      document.addEventListener('click', () => {
        audio.play().then(() => { audioStarted.current = true; }).catch(() => {});
      }, { once: true });
    });

    return () => { audio.pause(); };
  }, []);

  const handleReveal = useCallback(() => {
    startAudio();
    if (stage === 'console' && consoleFinished) {
      setStage('reveal');
    }
  }, [stage, consoleFinished, startAudio]);

  return (
    <div
      onClick={handleReveal}
      className={`relative min-h-screen w-full flex items-center justify-center bg-[#050505] selection:bg-pink-deep/30 ${stage === 'console' && consoleFinished ? 'cursor-pointer' : ''}`}
    >
      <div className="scanline" />

      <AnimatePresence mode="wait">
        {stage === 'console' ? (
          <motion.div
            key="console"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl p-8 font-mono text-sm md:text-base text-white/80"
          >
            <div className="space-y-2">
              <div className="flex gap-2 text-pink-soft/60">
                <span>[system]</span>
                <Typewriter
                  text="Initializing heart.PROTOCOL_v2.0..."
                  delay={30}
                  onComplete={() => setConsoleFinished(true)}
                />
              </div>

              <div className="flex gap-2 h-6">
                <span>[status]</span>
                {consoleFinished && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-green-400"
                  >
                    READY
                  </motion.span>
                )}
              </div>

              {consoleFinished && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-8 flex flex-col items-start gap-6"
                >
                  <p className="text-white/40 italic">
                    {">"} One encrypted package found for you.
                  </p>

                  <button
                    id="decrypt-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startAudio();
                      setStage('reveal');
                    }}
                    className="group flex items-center gap-3 px-6 py-3 border border-pink-deep/30 bg-pink-deep/5 hover:bg-pink-deep/10 text-pink-soft transition-all duration-300 pointer-events-auto"
                  >
                    <Lock size={16} className="group-hover:rotate-12 transition-transform" />
                    <span className="font-mono tracking-widest uppercase text-xs">Decrypt Message</span>
                    <span className="terminal-cursor" />
                  </button>

                  <p className="text-[10px] text-white/20 animate-pulse">
                    (or just click anywhere)
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative w-full h-screen flex items-center justify-center overflow-hidden"
          >
            <TextHeart analyserRef={analyserRef} onComplete={() => setHeartComplete(true)} />

            <AnimatePresence>
              {heartComplete && (
                <motion.div
                  key="decrypted"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.5 }}
                  className="z-20 text-center translate-y-[1cm]"
                >
                  <h2 className="text-pink-deep font-mono text-xl tracking-[0.3em] uppercase glow-text mb-2">
                    Decrypted
                  </h2>
                  <div className="w-12 h-px bg-pink-deep/30 mx-auto mb-8" />

                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      startAudio();
                      setHeartComplete(false);
                      setStage('console');
                    }}
                    className="text-white/20 hover:text-white/60 transition-colors uppercase text-[10px] tracking-widest font-mono"
                  >
                    Re-encrypt
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute top-8 left-8 text-[10px] font-mono text-white/10 uppercase tracking-widest space-y-1">
              <div>ln: 420</div>
              <div>id: 0xDEADBEEF</div>
              <div>type: organic_emotion</div>
            </div>

            <div className="absolute bottom-8 right-8 text-[10px] font-mono text-white/10 uppercase tracking-widest">
              heart_reveal // success
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
