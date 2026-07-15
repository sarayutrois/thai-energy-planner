"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncPlaybackPreference = () => {
      if (reducedMotion.matches) {
        video.pause();
        setIsPlaying(false);
        setIsReady(true);
        return;
      }

      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
      setIsReady(true);
    };

    syncPlaybackPreference();
    reducedMotion.addEventListener("change", syncPlaybackPreference);
    return () =>
      reducedMotion.removeEventListener("change", syncPlaybackPreference);
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (!isPlaying) {
      void video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
      return;
    }

    video.pause();
  }

  return (
    <>
      <video
        ref={videoRef}
        aria-hidden="true"
        data-testid="solar-hero-video"
        loop
        muted
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        playsInline
        poster="/solarcell-poster.jpg"
        preload="metadata"
        tabIndex={-1}
        className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover object-center"
      >
        <source src="/solarcell.mp4" type="video/mp4" />
      </video>
      <button
        type="button"
        aria-label={isPlaying ? "หยุดวิดีโอพื้นหลัง" : "เล่นวิดีโอพื้นหลัง"}
        aria-pressed={isPlaying}
        data-testid="hero-video-toggle"
        disabled={!isReady}
        onClick={togglePlayback}
        className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur-md transition hover:bg-black/65 focus:outline-none focus:ring-2 focus:ring-white md:right-6 md:top-6"
      >
        {isPlaying ? (
          <Pause aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Play aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
    </>
  );
}
