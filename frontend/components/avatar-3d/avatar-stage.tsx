"use client";

import type { Ref } from "react";
import { motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { Sparkles } from "lucide-react";
import type { WardrobeItem } from "@/store/wardrobe-store";

type AvatarLayer = Pick<WardrobeItem, "id" | "slot" | "name" | "colorHex" | "processedImageUrl" | "imageUrl" | "isNewArrival">;

interface AvatarStageProps {
  palette: string[];
  dropActive?: boolean;
  dropHovered?: boolean;
  dragHint?: string;
  stageRef?: Ref<HTMLDivElement>;
  dropTone?: string;
  absorbLabel?: string | null;
  absorbActive?: boolean;
  magneticStrength?: number;
  magneticVector?: { x: number; y: number } | null;
  wearingItems?: AvatarLayer[];
  avatarPhotoUrl?: string | null;
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
  absorbActive = false,
  magneticStrength = 0,
  magneticVector = null,
  wearingItems = [],
  avatarPhotoUrl = null,
}: AvatarStageProps) {
  const visiblePalette = palette.length > 0 ? palette : ["#c9eddc", "#f3ead4", "#355172"];
  const canvasOpacity = avatarPhotoUrl ? 0.28 : 1;

  function layerFrame(slot: AvatarLayer["slot"], index: number) {
    if (slot === "top") {
      return { top: "19%", left: "50%", width: avatarPhotoUrl ? "38%" : "34%", transform: "translateX(-50%)" };
    }
    if (slot === "outerwear") {
      return { top: "14%", left: "50%", width: avatarPhotoUrl ? "42%" : "38%", transform: "translateX(-50%)" };
    }
    if (slot === "bottom") {
      return { top: "43%", left: "50%", width: avatarPhotoUrl ? "34%" : "30%", transform: "translateX(-50%)" };
    }
    if (slot === "shoes") {
      return { top: "77%", left: index % 2 === 0 ? "41%" : "58%", width: "18%", transform: "translateX(-50%)" };
    }
    return { top: avatarPhotoUrl ? "36%" : "32%", left: "72%", width: "18%", transform: "translateX(-50%)" };
  }

  return (
    <motion.div
      ref={stageRef}
      data-active={dropActive ? "true" : "false"}
      initial={false}
      animate={{
        scale: dropHovered ? 1.012 + magneticStrength * 0.02 : dropActive ? 1 + magneticStrength * 0.012 : 1,
        rotateX: magneticVector ? -magneticVector.y * (1.2 + magneticStrength * 6) : 0,
        rotateY: magneticVector ? magneticVector.x * (1.8 + magneticStrength * 7) : 0
      }}
      transition={{ type: "spring", stiffness: 220, damping: 24, mass: 0.7 }}
      className={`tryon-stage section-card story-gradient magnetic-stage relative h-[460px] overflow-hidden rounded-[28px] p-3 transition sm:h-[520px] sm:rounded-[34px] sm:p-4 ${dropActive ? "shadow-[var(--shadow-glow)]" : ""}`}
      style={{
        transformPerspective: 1400,
        transformStyle: "preserve-3d",
        boxShadow: dropActive ? `0 20px ${70 + magneticStrength * 22}px color-mix(in srgb, ${dropTone} ${22 + magneticStrength * 18}%, rgba(255,255,255,0.48))` : undefined
      }}
    >
      <div className="hero-glow absolute inset-0 opacity-80" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {avatarPhotoUrl ? (
          <motion.div
            initial={false}
            animate={{
              rotateY: magneticVector ? magneticVector.x * (3 + magneticStrength * 10) : 0,
              rotateX: magneticVector ? -magneticVector.y * (2 + magneticStrength * 6) : 0,
              scale: dropHovered ? 1.02 : 1
            }}
            transition={{ type: "spring", stiffness: 220, damping: 24, mass: 0.72 }}
            className="tryon-stage-photo absolute inset-[11%_15%_12%] z-[4] overflow-hidden rounded-[24px] border border-white/55 bg-white/40 shadow-[0_30px_80px_rgba(54,35,24,0.16)] sm:inset-[10%_17%_10%] sm:rounded-[28px]"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.58),transparent_42%)]" />
            <img src={avatarPhotoUrl} alt="Avatar upload" className="h-full w-full object-cover" />
          </motion.div>
        ) : null}

        {wearingItems.map((item, index) => {
          const src = item.processedImageUrl || item.imageUrl;
          const frame = layerFrame(item.slot, index);
          return (
            <motion.div
              key={item.id}
              initial={false}
              animate={{
                y: dropHovered ? -4 - index : -index * 2,
                rotate: item.slot === "accessory" ? 2 : 0,
                scale: dropHovered ? 1.03 : 1
              }}
              transition={{ type: "spring", stiffness: 260, damping: 24, mass: 0.66 }}
              className="tryon-stage-layer absolute z-[6] overflow-hidden rounded-[18px] border border-white/60 bg-white/55 shadow-[0_22px_42px_rgba(41,27,21,0.14)] backdrop-blur-md sm:rounded-[22px]"
              style={{
                ...frame,
                boxShadow: `0 22px 40px color-mix(in srgb, ${item.colorHex} 16%, rgba(41,27,21,0.12))`
              }}
            >
              {src ? (
                <img src={src} alt={item.name} className="h-full w-full object-contain p-2" />
              ) : (
                <div className="flex h-full min-h-[120px] items-center justify-center px-4 py-6 text-center text-xs text-[var(--ink)]" style={{ background: `linear-gradient(145deg, ${item.colorHex}20, rgba(255,255,255,0.96))` }}>
                  {item.name}
                </div>
              )}
              {item.isNewArrival ? (
                <div className="absolute left-2 top-2 rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-medium tracking-[0.16em] text-white">
                  NEW
                </div>
              ) : null}
            </motion.div>
          );
        })}
      </div>
      {dropActive ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: dropHovered ? 0.64 + magneticStrength * 0.16 : 0.38 + magneticStrength * 0.18, scale: dropHovered ? 1.05 + magneticStrength * 0.06 : 1 + magneticStrength * 0.04 }}
            className="pointer-events-none absolute inset-[14%] rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, color-mix(in srgb, ${dropTone} 28%, rgba(255,255,255,0.55)) 0%, transparent 68%)` }}
          />
          {[0, 1].map((ring) => (
            <motion.div
              key={ring}
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{
                opacity: dropHovered ? [0.12, 0.24 + magneticStrength * 0.22, 0.12] : [0.08, 0.16 + magneticStrength * 0.16, 0.08],
                scale: dropHovered ? [0.94, 1.03 + magneticStrength * 0.06, 0.94] : [0.92, 1 + magneticStrength * 0.05, 0.92]
              }}
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
          animate={{ opacity: dropHovered ? 0.92 : 0.6 + magneticStrength * 0.14, scale: dropHovered ? 1 : 0.985 + magneticStrength * 0.02 }}
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
            className={`rounded-full px-4 py-2 text-xs shadow-[var(--shadow-float)] sm:px-5 sm:py-3 sm:text-sm ${dropHovered ? "text-white" : "bg-white/88 text-[var(--ink)]"}`}
            style={dropHovered ? { backgroundColor: dropTone } : undefined}
          >
            {dropHovered ? "Release and let the stage absorb it" : magneticStrength > 0.45 ? "The stage is starting to lock on" : "Bring it into the avatar's magnetic field"}
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
            className="snap-hint rounded-full px-4 py-2 text-xs sm:px-5 sm:py-3 sm:text-sm"
            style={{ borderColor: `color-mix(in srgb, ${dropTone} 42%, rgba(255,255,255,0.8))` }}
          >
            <Sparkles className="size-4" />
            {absorbLabel ? `${absorbLabel} is now on the avatar` : "Layer added to the avatar"}
          </div>
        </motion.div>
      ) : null}
      <div className="tryon-stage-topline pointer-events-none absolute inset-x-3 top-3 z-10 flex items-center justify-between gap-2 sm:inset-x-4 sm:top-4 sm:gap-3">
        <div className="pill bg-white/85">
          <Sparkles className="size-4" />
          {dragHint ?? (avatarPhotoUrl ? "拖入右侧单品，直接预览到你的全身照舞台" : "Drag garments here or tap on the right to preview layers")}
        </div>
        <div
          className={`rounded-full px-3 py-1 text-xs ${dropActive ? "text-white" : "bg-white/80 text-[var(--ink)]"}`}
          style={dropActive ? { backgroundColor: dropTone } : undefined}
        >
          {dropActive ? `${Math.round((0.35 + magneticStrength * 0.65) * 100)}% locked` : `${palette.length} active layers`}
        </div>
      </div>
      <div className="tryon-stage-note pointer-events-none absolute inset-x-3 bottom-3 z-10 sm:inset-x-6 sm:bottom-5">
        <div className="mx-auto max-w-md rounded-full border border-white/70 bg-white/72 px-4 py-3 text-center text-xs leading-5 text-[var(--muted)] shadow-[var(--shadow-soft)]">
          {avatarPhotoUrl
            ? "当前是用户照片舞台模式，选中的单品会优先贴到你的全身照上形成伪 3D 试衣层。"
            : "Drag from the wardrobe rail to layer pieces onto the 2.5D avatar. This keeps the MVP playful now and ready for generated try-on later."}
        </div>
        <div className="tryon-stage-swatches mt-3 flex items-center justify-center gap-2 sm:mt-4">
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
      <div className="absolute inset-0" style={{ opacity: canvasOpacity }}>
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
    </motion.div>
  );
}
