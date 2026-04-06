"use client";

import { useEffect, useRef, useState } from "react";

import { ExperienceTopNav } from "@/components/experience/experience-top-nav";

import styles from "./template-frame.module.css";

interface ExperienceTemplateFrameProps {
  html: string;
  title: string;
}

export function ExperienceTemplateFrame({ html, title }: ExperienceTemplateFrameProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 780px)");
    const sync = () => setIsMobile(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe) {
      return;
    }

    let mutationObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let frameWindow: Window | null = null;
    let rafId = 0;

    const scheduleResize = () => {
      if (!isMobile) {
        iframe.style.removeProperty("--frame-auto-height");
        return;
      }

      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        try {
          const documentElement = iframe.contentDocument?.documentElement;
          const body = iframe.contentDocument?.body;
          if (!documentElement || !body) {
            return;
          }

          const contentHeight = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            documentElement.scrollHeight,
            documentElement.offsetHeight,
          );
          iframe.style.setProperty("--frame-auto-height", `${contentHeight}px`);
        } catch {
          // Ignore cross-document sizing failures and keep the CSS fallback height.
        }
      });
    };

    const bindFrameDocument = () => {
      if (!iframe.contentDocument) {
        return;
      }

      frameWindow = iframe.contentWindow;
      scheduleResize();

      mutationObserver = new MutationObserver(scheduleResize);
      mutationObserver.observe(iframe.contentDocument.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(scheduleResize);
        resizeObserver.observe(iframe.contentDocument.documentElement);
        if (iframe.contentDocument.body) {
          resizeObserver.observe(iframe.contentDocument.body);
        }
      }

      frameWindow?.addEventListener("resize", scheduleResize);
      const fontsReady = iframe.contentDocument.fonts?.ready;
      fontsReady?.then(scheduleResize).catch(() => {});
    };

    iframe.addEventListener("load", bindFrameDocument);

    if (iframe.contentDocument?.readyState === "complete") {
      bindFrameDocument();
    } else {
      scheduleResize();
    }

    window.addEventListener("resize", scheduleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", scheduleResize);
      iframe.removeEventListener("load", bindFrameDocument);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      frameWindow?.removeEventListener("resize", scheduleResize);
    };
  }, [html, isMobile]);

  return (
    <div className={styles.shell}>
      <ExperienceTopNav />
      <div className={styles.frameWrap}>
        <iframe
          ref={frameRef}
          title={title}
          srcDoc={html}
          className={`${styles.frame} ${isMobile ? styles.frameMobile : ""}`}
        />
      </div>
    </div>
  );
}
