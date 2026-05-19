
import React, { useState, useEffect, useRef } from 'react';
import { PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  isReel?: boolean;
  muted?: boolean;
  onMuteChange?: (isMuted: boolean) => void;
  onPlayChange?: (isPlaying: boolean) => void;
  onProgressChange?: (progress: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  poster, 
  autoPlay = false, 
  loop = false, 
  className = '', 
  isReel = false, 
  muted: externalMuted,
  onMuteChange,
  onPlayChange,
  onProgressChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    onPlayChange?.(isPlaying);
  }, [isPlaying, onPlayChange]);

  const [isMuted, setIsMuted] = useState(externalMuted ?? true);
  
  useEffect(() => {
    if (externalMuted !== undefined) {
      setIsMuted(externalMuted);
    }
  }, [externalMuted]);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    setShowControls(true);
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // 3 seconds of inactivity
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!autoPlay || !videoRef.current || !src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch((err) => {
              console.warn("Video play failed:", err.message);
              setIsPlaying(false);
            });
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
  }, [autoPlay, src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current && src) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch((err) => {
          console.warn("Manual video play failed:", err.message);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteValue = !isMuted;
    if (videoRef.current) {
      videoRef.current.muted = newMuteValue;
      setIsMuted(newMuteValue);
      onMuteChange?.(newMuteValue);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime || 0;
      const total = videoRef.current.duration || 0;
      
      setCurrentTime(current);
      setDuration(total);
      
      if (total > 0) {
        const p = (current / total) * 100;
        const safeP = isNaN(p) || !isFinite(p) ? 0 : p;
        setProgress(safeP);
        onProgressChange?.(safeP);
      } else {
        setProgress(0);
        onProgressChange?.(0);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const val = parseFloat(e.target.value);
      const safeVal = isNaN(val) ? 0 : val;
      const newTime = (safeVal / 100) * (videoRef.current.duration || 0);
      videoRef.current.currentTime = isNaN(newTime) ? 0 : newTime;
      setProgress(safeVal);
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
    } else if ((videoRef.current as any)?.webkitRequestFullscreen) {
      (videoRef.current as any).webkitRequestFullscreen();
    }
  };

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteValue = !isMuted;
    if (videoRef.current) {
      videoRef.current.muted = newMuteValue;
      setIsMuted(newMuteValue);
      onMuteChange?.(newMuteValue);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative group bg-black overflow-hidden flex items-center justify-center ${isReel ? className : `aspect-video rounded-xl shadow-2xl ${className}`} ${!showControls && isPlaying ? 'cursor-none' : 'cursor-default'}`}
      onMouseEnter={resetControlsTimeout}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={resetControlsTimeout}
    >
      {src ? (
        <video 
          ref={videoRef}
          src={src}
          poster={poster}
          className={`w-full h-full ${isReel ? 'object-cover' : 'object-contain'}`}
          muted={isMuted}
          loop={loop}
          playsInline
          webkit-playsinline="true"
          controls={false}
          controlsList="nodownload nofullscreen noremoteplayback"
          disablePictureInPicture
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          onLoadedMetadata={handleTimeUpdate}
          onError={() => {
            console.error("Video player error: Failed to load resource");
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-500 italic">
          <SpeakerXMarkIcon className="h-12 w-12 mb-2 opacity-20" />
          <p className="text-[10px] uppercase font-black tracking-widest opacity-30">Vídeo indisponível</p>
        </div>
      )}

      {/* Central Play Button (Minimal for non-reels) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/20 cursor-pointer" onClick={togglePlay}>
          <div className={`${isReel ? 'w-16 h-16' : 'w-20 h-20'} bg-brand/90 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 shadow-2xl transition-transform hover:scale-110`}>
            <PlayIcon className={`${isReel ? 'h-8 w-8' : 'h-10 w-10'} text-white ml-1`} />
          </div>
        </div>
      )}

      {/* Mute Toggle Bottom Right (Only if reel or overlay) */}
      {isReel && (
        <button 
          onClick={toggleMute}
          className="absolute bottom-20 right-4 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-white hover:bg-black/60 transition-all opacity-0 group-hover:opacity-100"
        >
          {isMuted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
        </button>
      )}

      {/* YouTube Style Controls Bar */}
      <div className={`absolute inset-x-0 bottom-0 px-3 py-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        {/* Progress Bar Container */}
        <div className="relative w-full h-1 group/progress mb-2 flex items-end cursor-pointer">
          <input 
            type="range" 
            min="0" max="100" step="0.1"
            value={progress} 
            onChange={handleSeek}
            className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer z-30"
          />
          {/* Track background */}
          <div className="absolute inset-x-0 bottom-0 w-full h-1 bg-white/20 transition-all group-hover/progress:h-1.5"></div>
          {/* Progress fill (YouTube Red for non-reels) */}
          <div className={`absolute inset-y-0 bottom-0 left-0 h-1 ${isReel ? 'bg-brand' : 'bg-[#FF0000]'} transition-all group-hover/progress:h-1.5`} style={{ width: `${progress}%` }}>
            <div className={`absolute right-[-7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isReel ? 'bg-brand' : 'bg-[#FF0000]'} rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow-lg border-2 border-white/20`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform p-1">
              {isPlaying ? <PauseIcon className="h-6 w-6 fill-current" /> : <PlayIcon className="h-6 w-6 fill-current" />}
            </button>
            <div className="flex items-center gap-1 group/volume">
               <button onClick={toggleMute} className="text-white hover:scale-110 transition-transform p-1">
                 {isMuted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <SpeakerWaveIcon className="h-5 w-5" />}
               </button>
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-white/90 tabular-nums ml-1">
              {formatTime(currentTime)} <span className="text-white/40 mx-0.5">/</span> {formatTime(duration)}
            </div>
          </div>
          {!isReel && (
            <div className="flex items-center gap-2">
              <button onClick={handleFullscreen} className="text-white hover:scale-110 transition-transform p-1">
                <ArrowsPointingOutIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
