"use client";

import type { RefObject } from "react";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { Sparkles } from "lucide-react";

interface AvatarStageProps {
  palette: string[];
  dropActive?: boolean;
  dropHovered?: boolean;
  dragHint?: string;
  stageRef?: RefObject<HTMLDivElement | null>;
  dropTone?: string;
  absorbLabel?: string | null;
  absorbActive?: boolean;
}

function AvatarFigure({ palette }: Pick<AvatarStageProps, "palette">) {
  const layers = palette.length > 0 ? palette : ["#c9eddc", "#f3ead4", "#355172"];

  return (
    <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.35}>
      <group position={[0, -1.15, 0]}>
        <mesh position={[0, 2.3, 0]}>
          <sphereGeometry args={[0.44, 48, 48]} />
          <meshStandardMaterial color="#f2d2c7" />
        </mesh>

        <mesh position={[0, 0.7, 0]}>
          <capsuleGeometry args={[0.86, 1.7, 16, 32]} />
          <meshStandardMaterial color="#f8f7f3" />
        </mesh>

        {layers.map((color, index) => (
          <mesh key={`${color}-${index}`} position={[0, 1.05 - index * 0.52, 0.16 + index * 0.02]}>
            <boxGeometry args={[1.7 - index * 0.18, 0.46, 0.32]} />
            <meshStandardMaterial color={color} transparent opacity={0.92} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

export function AvatarStage({
  palette,
  dropActive = false,
  dropHovered = false,
  dragHint,
  stageRef,
  dropTone = "var(--accent)",
  absorbLabel,
  absorbActive = false
}: AvatarStageProps) {
  const visiblePalette = palette.length > 0 ? palette : ["#c9eddc", "#f3ead4", "#355172"];

  return (
    <div
      ref={stageRef}
      data-active={dropActive ? "true" : "false"}
      className={`section-card story-gradient magnetic-stage relative h-[520px] overflow-hidden rounded-[34px] p-4 transition ${dropActive ? "shadow-[var(--shadow-glow)]" : ""} ${dropHovered ? "scale-[1.01]" : ""}`}
      style={{
        boxShadow: dropActive ? `0 20px 70px color-mix(in srgb, ${dropTone} 22%, rgba(255,255,255,0.48))` : undefined
      }}
    >
      <div className="hero-glow absolute inset-0 opacity-80" />
      {dropActive ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: dropHovered ? 0.64 : 0.38, scale: dropHovered ? 1.05 : 1 }}
            className="pointer-events-none absolute inset-[14%] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, color-mix(in srgb, ${dropTone} 28%, rgba(255,255,255,0.55)) 0%, transparent 68%)` }}
          />
          {[0, 1].map((ring) => (
            <motion.div
              key={ring}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: dropHovered ? [0.12, 0.24, 0.12] : [0.08, 0.16, 0.08], scale: dropHovered ? [0.94, 1.03, 0.94] : [0.92, 1, 0.92] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: ring * 0.2, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-[18%] rounded-full border"
              style={{ borderColor: `color-mix(in srgb, ${dropTone} 60%, rgba(255,255,255,0.72))` }}
            />
          ))}
        </>
      ) : null}
      {dropActive ? (
        <motion.div
          initial={{ opacity: 0.45, scale: 0.98 }}
          animate={{ opacity: dropHovered ? 0.92 : 0.6, scale: dropHovered ? 1 : 0.985 }}
          className="pointer-events-none absolute inset-6 z-10 rounded-[28px] border-2 border-dashed bg-white/35"
          style={{ borderColor: dropTone }}
        />
      ) : null}
      {dropActive ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: dropHovered ? 1.02 : 1 }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div
            className={`rounded-full px-5 py-3 text-sm shadow-[var(--shadow-float)] ${dropHovered ? "text-white" : "bg-white/88 text-[var(--ink)]"}`}
            style={dropHovered ? { backgroundColor: dropTone } : undefined}
          >
            {dropHovered ? "Release and let the stage absorb it" : "Bring it into the avatar's magnetic field"}
          </div>
        </motion.div>
      ) : null}
      {absorbActive ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 0], scale: [0.86, 1.08, 1.16] }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div
            className="snap-hint rounded-full px-5 py-3 text-sm"
            style={{ borderColor: `color-mix(in srgb, ${dropTone} 42%, rgba(255,255,255,0.8))` }}
          >
            <Sparkles className="size-4" />
            {absorbLabel ? `${absorbLabel} is now on the avatar` : "Layer added to the avatar"}
          </div>
        </motion.div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-3">
        <div className="pill bg-white/85">
          <Sparkles className="size-4" />
          {dragHint ?? "Drag garments here or tap on the right to preview layers"}
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs ${dropActive ? "text-white" : "bg-white/80 text-[var(--ink)]"}`}
          style={dropActive ? { backgroundColor: dropTone } : undefined}
        >
          {dropActive ? "Release to wear" : `${palette.length} active layers`}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-6 bottom-5 z-10">
        <div className="mx-auto max-w-md rounded-full border border-white/70 bg-white/72 px-4 py-3 text-center text-xs leading-5 text-[var(--muted)] shadow-[var(--shadow-soft)]">
          Drag from the wardrobe rail to layer pieces onto the 2.5D avatar. This keeps the MVP playful now and ready for generated try-on later.
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          {visiblePalette.slice(0, 5).map((color, index) => (
            <motion.span
              key={`${color}-${index}`}
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.12 }}
              className="size-3 rounded-full border border-white/80 shadow-[var(--shadow-soft)]"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <Canvas camera={{ position: [0, 0.2, 5.2], fov: 34 }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 4, 4]} intensity={2.2} />
        <directionalLight position={[-3, 2, 2]} intensity={1.2} color="#ffe2d5" />
        <AvatarFigure palette={palette} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.25, 0]}>
          <circleGeometry args={[2.1, 50]} />
          <meshStandardMaterial color="#e6eef8" transparent opacity={0.55} />
        </mesh>
        <OrbitControls enablePan={false} enableZoom={false} minAzimuthAngle={-0.5} maxAzimuthAngle={0.5} />
      </Canvas>
    </div>
  );
}
