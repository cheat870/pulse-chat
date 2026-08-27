import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react';

export default function VoiceRecorder({ onSendVoice, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Start recording on mount
  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let mimeType = 'audio/webm';
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/wav'
      ];
      for (const t of candidateTypes) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          mimeType = t;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedType = mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: recordedType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Could not access microphone. Please allow microphone permissions.');
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopTimer();
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSendVoice(audioBlob, duration);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-slate-950/90 border border-indigo-500/40 rounded-2xl animate-fade-in shadow-xl">
      {isRecording ? (
        <>
          <div className="flex items-center gap-2 text-rose-400 font-mono text-sm px-2">
            <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
            <span>Recording {formatTime(duration)}</span>
          </div>

          <div className="flex-1 h-6 flex items-center gap-1 px-2 overflow-hidden">
            {[...Array(16)].map((_, i) => (
              <span
                key={i}
                className="w-1 bg-indigo-500 rounded-full animate-pulse"
                style={{ height: `${Math.max(20, Math.random() * 100)}%`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>

          <button
            onClick={stopRecording}
            className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow transition-all"
            title="Stop Recording"
          >
            <Square className="w-4 h-4 fill-white" />
          </button>
        </>
      ) : (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <button
            onClick={togglePlay}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <span className="text-xs font-mono text-slate-300">
            Voice Note ({formatTime(duration)})
          </span>

          <div className="flex-1" />

          <button
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
            title="Discard"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleSend}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow transition-all"
          >
            <span>Send Voice</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
