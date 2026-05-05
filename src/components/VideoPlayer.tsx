
import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  isReel?: boolean;
  onPlayChange?: (isPlaying: boolean) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster, autoPlay = false, loop = false, className = '', isReel = false, onPlayChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    onPlayChange?.(isPlaying);
  }, [isPlaying, onPlayChange]);

  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    if (!autoPlay || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => setIsPlaying(false));
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [autoPlay]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      setCurrentTime(current);
      setDuration(total);
      setProgress((current / total) * 100);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = (parseFloat(e.target.value) / 100) * videoRef.current.duration;
      videoRef.current.currentTime = newTime;
      setProgress(parseFloat(e.target.value));
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current?.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group bg-black overflow-hidden flex items-center justify-center ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video 
        ref={videoRef}
        src={src}
        poster={poster}
        className={`w-full h-full ${isReel ? 'object-cover' : 'object-contain'}`}
        muted={isMuted}
        loop={loop}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onClick={togglePlay}
        onLoadedMetadata={handleTimeUpdate}
      />

      {/* Central Play Button */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 cursor-pointer" onClick={togglePlay}>
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-2xl transition-transform hover:scale-110">
            <PlayIcon className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Mute Toggle Bottom Right (Facebook style) */}
      <button 
        onClick={toggleMute}
        className="absolute bottom-4 right-4 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
      >
        {isMuted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
      </button>

      {/* Controls Bar */}
      <div className={`absolute inset-x-0 bottom-0 p-4 pt-12 bg-gradient-to-t from-black/90 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="relative w-full h-1 group/progress mb-3 cursor-pointer">
          <input 
            type="range" 
            min="0" max="100" step="0.1"
            value={progress} 
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
          <div className="absolute inset-y-0 left-0 w-full h-full bg-white/20 rounded-full"></div>
          <div className="absolute inset-y-0 left-0 h-full bg-brand rounded-full" style={{ width: `${progress}%` }}>
            <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-brand rounded-full scale-0 group-hover/progress:scale-100 transition-transform"></div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
              {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
            </button>
            <div className="text-[10px] font-bold text-white/80 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          <button onClick={handleFullscreen} className="text-white hover:scale-110 transition-transform">
            <ArrowsPointingOutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
