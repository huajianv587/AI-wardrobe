"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const posterSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600" viewBox="0 0 900 1600">
    <defs>
      <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFF7FB"/>
        <stop offset="48%" stop-color="#FFE2EB"/>
        <stop offset="100%" stop-color="#F9EDF3"/>
      </linearGradient>
      <radialGradient id="heroGlow" cx="50%" cy="38%" r="44%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.98)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <rect width="900" height="1600" fill="url(#heroBg)" />
    <circle cx="450" cy="500" r="260" fill="url(#heroGlow)" />
    <ellipse cx="450" cy="1320" rx="220" ry="72" fill="rgba(255,143,163,0.14)" />
  </svg>
`;

const posterDataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(posterSvg)}`;

const getVideoMaskStyle = () =>
  ({
    maskImage:
      "radial-gradient(ellipse 95% 96% at 50% 50%, black 42%, rgba(0,0,0,0.92) 62%, rgba(0,0,0,0.66) 78%, transparent 92%)",
    WebkitMaskImage:
      "radial-gradient(ellipse 95% 96% at 50% 50%, black 42%, rgba(0,0,0,0.92) 62%, rgba(0,0,0,0.66) 78%, transparent 92%)"
  }) as const;

function VideoFallbackCanvas({
  className,
  style
}: {
  className?: string;
  style?: CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let frameId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const render = (time: number) => {
      const { width, height } = canvas.getBoundingClientRect();
      const t = time * 0.001;

      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#FFF6FA");
      gradient.addColorStop(0.45, "#FFE6EE");
      gradient.addColorStop(1, "#F8EAF2");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const halo = context.createRadialGradient(width * 0.52, height * 0.38, 28, width * 0.52, height * 0.38, width * 0.26);
      halo.addColorStop(0, "rgba(255,255,255,0.98)");
      halo.addColorStop(0.42, "rgba(255,181,200,0.46)");
      halo.addColorStop(1, "rgba(255,181,200,0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(width * 0.52, height * 0.38, width * 0.18, 0, Math.PI * 2);
      context.fill();

      for (let index = 0; index < 7; index += 1) {
        const angle = t * (0.18 + index * 0.03) + (Math.PI * 2 * index) / 7;
        const orbitX = width * 0.5 + Math.cos(angle) * (width * (0.12 + index * 0.012));
        const orbitY = height * 0.46 + Math.sin(angle * 1.1) * (height * (0.08 + index * 0.01));
        const radius = 4 + (index % 3);
        const dotGradient = context.createRadialGradient(orbitX, orbitY, 0, orbitX, orbitY, radius * 3.6);
        dotGradient.addColorStop(0, "rgba(255,255,255,0.94)");
        dotGradient.addColorStop(0.6, index % 2 === 0 ? "rgba(255,181,200,0.54)" : "rgba(244,201,138,0.42)");
        dotGradient.addColorStop(1, "rgba(255,181,200,0)");
        context.fillStyle = dotGradient;
        context.beginPath();
        context.arc(orbitX, orbitY, radius * 2.4, 0, Math.PI * 2);
        context.fill();
      }

      frameId = window.requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    frameId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} style={style} />;
}

export function VideoMask() {
  const sources = useMemo(
    () => ["/UIdemo/demo1.mp4?v=hero-20260402-demo1"],
    []
  );
  const [sourceIndex, setSourceIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(9 / 16);

  const currentSource = sources[sourceIndex] ?? sources[0];
  const maskStyle = getVideoMaskStyle();
  const isLastSource = sourceIndex >= sources.length - 1;
  const shouldShowCanvasFallback = hasFailed && isLastSource;

  useEffect(() => {
    setIsReady(false);
    setHasFailed(false);
  }, [currentSource]);

  useEffect(() => {
    if (isReady || hasFailed || isLastSource) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSourceIndex((index) => (index < sources.length - 1 ? index + 1 : index));
    }, 3200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasFailed, isLastSource, isReady, sources.length, sourceIndex]);

  const handleVideoError = () => {
    if (!isLastSource) {
      setSourceIndex((index) => index + 1);
      return;
    }

    setHasFailed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.82, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto flex w-full justify-center"
    >
      <motion.div
        whileHover={{ y: -6, scale: 1.012 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
        className="hero-media-shell hero-media-shell--portrait group relative flex items-center justify-center"
        data-cursor="hover"
      >
        <div className="video-glow transition-opacity duration-500 group-hover:opacity-100" />

        <div className="hero-video-frame">
          <div className="hero-video-backdrop">
            {!shouldShowCanvasFallback ? (
              <video
                key={`${currentSource}-backdrop`}
                aria-hidden
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                className="hero-video-backdrop__media"
                src={currentSource}
              />
            ) : (
              <VideoFallbackCanvas className="hero-video-backdrop__media" />
            )}
            <div className="hero-video-backdrop__veil" />
          </div>

          {!isReady ? (
            shouldShowCanvasFallback ? (
              <VideoFallbackCanvas
                className="hero-video hero-video--foreground absolute inset-0 h-full w-full"
                style={maskStyle}
              />
            ) : (
              <Image
                src={posterDataUri}
                alt=""
                aria-hidden
                className="hero-video hero-video--foreground absolute inset-0 h-full w-full object-cover"
                style={maskStyle}
                fill
                unoptimized
              />
            )
          ) : null}

          <video
            key={currentSource}
            aria-label="云衣橱试衣展示视频"
            autoPlay
            loop
            muted
            playsInline
            poster={posterDataUri}
            preload="auto"
            className="hero-video hero-video--foreground relative object-cover"
            style={{
              ...maskStyle,
              aspectRatio,
              opacity: isReady && !hasFailed ? 1 : 0.01
            }}
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget;

              if (videoWidth > 0 && videoHeight > 0) {
                setAspectRatio(videoWidth / videoHeight);
              }
            }}
            onCanPlay={() => {
              setHasFailed(false);
              setIsReady(true);
            }}
            onLoadedData={() => {
              setHasFailed(false);
              setIsReady(true);
            }}
            onError={handleVideoError}
            src={currentSource}
          />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.18),transparent_34%)] opacity-80 mix-blend-screen" />
          <div className="hero-video-edge-softener pointer-events-none absolute inset-0" />
        </div>
      </motion.div>
    </motion.div>
  );
}
