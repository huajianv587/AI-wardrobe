"use client";

import { useEffect, useRef, useState } from "react";

type CursorMode = "default" | "hover" | "click";

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number>();
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(false);
  const modeRef = useRef<CursorMode>("default");
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<CursorMode>("default");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const evaluate = () => {
      const canRender = window.innerWidth >= 768 && finePointer.matches && !reducedMotion.matches;
      setEnabled(canRender);

      if (!canRender) {
        visibleRef.current = false;
        setVisible(false);
      }
    };

    evaluate();
    finePointer.addEventListener("change", evaluate);
    reducedMotion.addEventListener("change", evaluate);
    window.addEventListener("resize", evaluate);

    return () => {
      finePointer.removeEventListener("change", evaluate);
      reducedMotion.removeEventListener("change", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.style.cursor = "";
      document.body.style.cursor = "";
      return;
    }

    document.documentElement.style.cursor = "none";
    document.body.style.cursor = "none";

    const applyMode = (nextMode: CursorMode) => {
      if (modeRef.current === nextMode) {
        return;
      }
      modeRef.current = nextMode;
      setMode(nextMode);
    };

    const setModeFromTarget = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target.closest<HTMLElement>("[data-cursor]") : null;
      const cursorMode = element?.dataset.cursor;
      applyMode(cursorMode === "click" ? "click" : cursorMode === "hover" ? "hover" : "default");
    };

    const handleMove = (event: MouseEvent) => {
      targetRef.current = { x: event.clientX, y: event.clientY };

      if (!visibleRef.current) {
        currentRef.current = { x: event.clientX, y: event.clientY };
        visibleRef.current = true;
        setVisible(true);
      }

      setModeFromTarget(event.target);
    };

    const handleOver = (event: MouseEvent) => {
      setModeFromTarget(event.target);
    };

    const handleDown = (event: MouseEvent) => {
      const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-cursor]") : null;

      if (target?.dataset.cursor === "click") {
        applyMode("click");
      }
    };

    const handleUp = (event: MouseEvent) => {
      setModeFromTarget(event.target);
    };

    const hideCursor = () => {
      visibleRef.current = false;
      setVisible(false);
    };

    const render = () => {
      const cursor = cursorRef.current;

      if (cursor) {
        currentRef.current = {
          x: lerp(currentRef.current.x, targetRef.current.x, 0.11),
          y: lerp(currentRef.current.y, targetRef.current.y, 0.11)
        };

        const scale = modeRef.current === "hover" ? 3 : modeRef.current === "click" ? 0.66 : 1;
        cursor.style.transform = `translate3d(${currentRef.current.x}px, ${currentRef.current.y}px, 0) translate(-50%, -50%) scale(${scale})`;
      }

      frameRef.current = window.requestAnimationFrame(render);
    };

    frameRef.current = window.requestAnimationFrame(render);
    window.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseover", handleOver);
    window.addEventListener("mousedown", handleDown);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("blur", hideCursor);
    document.addEventListener("mouseleave", hideCursor);

    return () => {
      document.documentElement.style.cursor = "";
      document.body.style.cursor = "";
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseover", handleOver);
      window.removeEventListener("mousedown", handleDown);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("blur", hideCursor);
      document.removeEventListener("mouseleave", hideCursor);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  const isHover = mode === "hover";

  return (
    <div
      ref={cursorRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[120] h-3 w-3 rounded-full transition-[opacity,background-color,border,box-shadow] duration-200 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        backgroundColor: isHover ? "transparent" : "var(--accent-rose)",
        border: isHover ? "1px solid rgba(255, 143, 163, 0.78)" : "1px solid rgba(255, 181, 200, 0.2)",
        boxShadow: isHover ? "0 0 18px var(--glow-rose)" : "0 0 10px rgba(255, 181, 200, 0.4)"
      }}
    />
  );
}
