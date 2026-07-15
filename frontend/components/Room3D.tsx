"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";
import HumanSkeleton3D from "./HumanSkeleton3D";
import type { PoseFrame } from "@/lib/types";

// Dimensions chambre : 4m × 2.5m × 3.5m (x,y,z) centrée sur (0,0,0)
const W = 4.0;
const H = 2.5;
const D = 3.5;

function RoomGeometry() {
  const wallMat = (
    <meshStandardMaterial color="#1a1f2e" transparent opacity={0.55} side={THREE.BackSide} />
  );
  return (
    <group>
      {/* Boîte principale de la chambre */}
      <mesh>
        <boxGeometry args={[W, H, D]} />
        {wallMat}
      </mesh>

      {/* Grille au sol */}
      <Grid
        position={[0, -H / 2, 0]}
        args={[W, D]}
        cellSize={0.5}
        cellThickness={0.4}
        cellColor="#1e2a3a"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="#2a3f55"
        fadeDistance={8}
        fadeStrength={1.2}
        infiniteGrid={false}
      />

      {/* Lit */}
      <group position={[-1.2, -0.9, -0.8]}>
        <mesh castShadow>
          <boxGeometry args={[1.4, 0.12, 2.1]} />
          <meshStandardMaterial color="#2c3350" />
        </mesh>
        {/* Matelas */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <boxGeometry args={[1.38, 0.22, 2.05]} />
          <meshStandardMaterial color="#3d4870" />
        </mesh>
        {/* Tête de lit */}
        <mesh position={[0, 0.3, -0.95]} castShadow>
          <boxGeometry args={[1.4, 0.6, 0.1]} />
          <meshStandardMaterial color="#1e2438" />
        </mesh>
      </group>

      {/* Bureau */}
      <group position={[1.5, -0.78, -1.3]}>
        <mesh castShadow>
          <boxGeometry args={[1.0, 0.05, 0.6]} />
          <meshStandardMaterial color="#2a2020" />
        </mesh>
        {/* Pied bureau */}
        <mesh position={[0, -0.37, 0]}>
          <boxGeometry args={[0.98, 0.7, 0.04]} />
          <meshStandardMaterial color="#252020" />
        </mesh>
        {/* Écran moniteur */}
        <mesh position={[0, 0.35, -0.22]} castShadow>
          <boxGeometry args={[0.65, 0.4, 0.03]} />
          <meshStandardMaterial color="#111318" emissive="#0f1f3d" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Chaise */}
      <group position={[1.5, -0.95, -0.55]}>
        <mesh castShadow>
          <boxGeometry args={[0.48, 0.05, 0.48]} />
          <meshStandardMaterial color="#1e2438" />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.46, 0.45, 0.04]} />
          <meshStandardMaterial color="#1e2438" />
        </mesh>
      </group>

      {/* Fenêtre */}
      <mesh position={[0, 0.3, -D / 2 + 0.01]}>
        <planeGeometry args={[1.4, 1.0]} />
        <meshStandardMaterial
          color="#3a6080"
          transparent
          opacity={0.3}
          emissive="#1a4060"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Cadre fenêtre */}
      <lineSegments position={[0, 0.3, -D / 2 + 0.015]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(1.4, 1.0)]} />
        <lineBasicMaterial color="#4a7a9b" />
      </lineSegments>

      {/* Routeur WiFi */}
      <WiFiRouter />
    </group>
  );
}

function WiFiRouter() {
  const pulseRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (pulseRef.current) {
      const s = 1.0 + 0.25 * Math.sin(t.current * 2.5);
      pulseRef.current.scale.setScalar(s);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.08 + 0.08 * Math.sin(t.current * 2.5);
    }
  });

  return (
    <group position={[-1.8, 0.95, -1.6]}>
      {/* Corps du routeur */}
      <mesh castShadow>
        <boxGeometry args={[0.2, 0.04, 0.12]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#00ff88" emissiveIntensity={0.15} />
      </mesh>
      {/* Antennes */}
      {[-0.07, 0.07].map((x, i) => (
        <mesh key={i} position={[x, 0.07, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.14, 6]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      ))}
      {/* LED verte */}
      <mesh position={[0, 0.025, 0.04]}>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} />
      </mesh>
      {/* Pulse WiFi */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.02, 8, 32]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

interface Props {
  frame: PoseFrame | null;
}

export default function Room3D({ frame }: Props) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      <Canvas
        camera={{ position: [3.5, 2.5, 4.5], fov: 50 }}
        shadows
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          {/* Éclairage */}
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[2, 4, 3]}
            intensity={0.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-1.8, 0.95, -1.6]} intensity={0.4} color="#00d4ff" />
          {/* Lumière de la fenêtre */}
          <pointLight position={[0, 0.3, -D / 2 + 0.5]} intensity={0.6} color="#3a80c0" />

          <RoomGeometry />

          {frame?.presence && frame.keypoints.length > 0 && (
            <HumanSkeleton3D keypoints={frame.keypoints} activity={frame.activity} />
          )}

          <OrbitControls
            enablePan={false}
            minDistance={3}
            maxDistance={9}
            maxPolarAngle={Math.PI / 1.8}
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
