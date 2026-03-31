"use client";

import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { Sparkles } from "lucide-react";

interface AvatarStageProps {
  palette: string[];
  dropActive?: boolean;
  dropHovered?: boolean;
  dragHint?: string;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
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

export function AvatarStage({ palette, dropActive = false, dropHovered = false, dragHint, onDragOver, onDragLeave, onDrop }: AvatarStageProps) {
  return (
    <div
      className={`section-card story-gradient relative h-[520px] overflow-hidden rounded-[34px] p-4 transition ${dropActive ? "ring-2 ring-[var(--accent)] shadow-[var(--shadow-glow)]" : ""} ${dropHovered ? "scale-[1.01]" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="hero-glow absolute inset-0 opacity-80" />
      {dropActive ? (
        <motion.div
          initial={{ opacity: 0.45, scale: 0.98 }}
          animate={{ opacity: dropHovered ? 0.92 : 0.6, scale: dropHovered ? 1 : 0.985 }}
          className="pointer-events-none absolute inset-6 z-10 rounded-[28px] border-2 border-dashed border-[var(--accent)] bg-white/35"
        />
      ) : null}
      {dropActive ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: dropHovered ? 1.02 : 1 }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className={`rounded-full px-5 py-3 text-sm shadow-[var(--shadow-float)] ${dropHovered ? "bg-[var(--accent)] text-white" : "bg-white/88 text-[var(--ink)]"}`}>
            {dropHovered ? "Release to style the avatar" : "Bring it closer to the avatar"}
          </div>
        </motion.div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-3">
        <div className="pill bg-white/85">
          <Sparkles className="size-4" />
          {dragHint ?? "Drag garments here or tap on the right to preview layers"}
        </div>
        <div className={`rounded-full px-3 py-1 text-xs ${dropActive ? "bg-[var(--accent)] text-white" : "bg-white/80 text-[var(--ink)]"}`}>
          {dropActive ? "Release to wear" : `${palette.length} active layers`}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-6 bottom-5 z-10">
        <div className="mx-auto max-w-md rounded-full border border-white/70 bg-white/72 px-4 py-3 text-center text-xs leading-5 text-[var(--muted)] shadow-[var(--shadow-soft)]">
          Drag from the wardrobe rail to layer pieces onto the 2.5D avatar. This keeps the MVP playful now and ready for generated try-on later.
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          {(palette.length > 0 ? palette : ["#c9eddc", "#f3ead4", "#355172"]).slice(0, 5).map((color, index) => (
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
