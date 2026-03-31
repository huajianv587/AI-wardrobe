"use client";

import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";

interface AvatarStageProps {
  palette: string[];
}

function AvatarFigure({ palette }: AvatarStageProps) {
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

export function AvatarStage({ palette }: AvatarStageProps) {
  return (
    <div className="section-card relative h-[520px] overflow-hidden rounded-[34px] p-4">
      <div className="hero-glow absolute inset-0 opacity-80" />
      <Canvas camera={{ position: [0, 0.2, 5.2], fov: 34 }}>
        <ambientLight intensity={1.4} />
        <directionalLight position={[3, 4, 4]} intensity={2.2} />
        <directionalLight position={[-3, 2, 2]} intensity={1.2} color="#d8cff7" />
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