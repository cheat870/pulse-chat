import React, { useRef, useEffect, useState } from 'react';

// ── Audio Waveform Visualizer Component ──────────────────────────────────────
// Two modes:
//   mode="record"  — live mic input bars (pass mediaStream)
//   mode="play"    — playback bars synced to <audio> element (pass audioSrc)

export default function AudioWaveform({ mode = 'play', mediaStream = null, audioSrc = null, barCount = 40 }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Build an AnalyserNode from a stream (record mode)
  useEffect(() => {
    if (mode !== 'record' || !mediaStream) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(mediaStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyserRef.current = analyser;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx2d = canvas.getContext('2d');
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      const barW = canvas.width / barCount;
      for (let i = 0; i < barCount; i++) {
        const val = data[Math.floor(i * data.length / barCount)] / 255;
        const h = Math.max(4, val * canvas.height);
        const x = i * barW + barW * 0.15;
        const gradient = ctx2d.createLinearGradient(0, canvas.height, 0, canvas.height - h);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#a78bfa');
        ctx2d.fillStyle = gradient;
        ctx2d.beginPath();
        ctx2d.roundRect(x, canvas.height - h, barW * 0.7, h, 3);
        ctx2d.fill();
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ctx.close().catch(() => {});
    };
  }, [mode, mediaStream, barCount]);

  // Playback waveform — static bars with playback position highlight
  useEffect(() => {
    if (mode !== 'play' || !audioSrc) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');

    const drawStatic = (progressFraction = 0) => {
      ctx2d.clearRect(0, 0, canvas.width, canvas.height);
      // Generate pseudo-random bar heights from audioSrc string (deterministic)
      const seed = audioSrc.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const rng = (i) => {
        const x = Math.sin(seed + i * 9301 + 49297) * 233280;
        return (x - Math.floor(x));
      };

      const barW = canvas.width / barCount;
      for (let i = 0; i < barCount; i++) {
        const val = 0.2 + rng(i) * 0.8;
        const h = Math.max(4, val * canvas.height);
        const x = i * barW + barW * 0.15;
        const played = (i / barCount) <= progressFraction;
        ctx2d.fillStyle = played ? '#6366f1' : '#334155';
        ctx2d.beginPath();
        ctx2d.roundRect(x, canvas.height - h, barW * 0.7, h, 3);
        ctx2d.fill();
      }
    };

    drawStatic(progress);
  }, [mode, audioSrc, progress, barCount]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (mode === 'record') {
    return (
      <canvas
        ref={canvasRef}
        width={200}
        height={48}
        className="rounded-xl w-full h-12"
      />
    );
  }

  // Play mode
  return (
    <div className="flex items-center gap-2 w-full">
      <button
        type="button"
        onClick={togglePlay}
        className="flex-shrink-0 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center text-white transition-all shadow"
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <canvas
          ref={canvasRef}
          width={200}
          height={32}
          className="w-full h-8 cursor-pointer rounded"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const fraction = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = fraction * duration;
            setProgress(fraction);
          }}
        />
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{formatTime(progress * duration)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioSrc}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={(e) => {
          const d = e.target.duration;
          if (d) setProgress(e.target.currentTime / d);
        }}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
      />
    </div>
  );
}
