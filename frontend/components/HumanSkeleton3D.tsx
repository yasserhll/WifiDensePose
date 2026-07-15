"use client";

import { useRef } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Keypoint } from "@/lib/types";
import { SKELETON_CONNECTIONS, ACTIVITY_COLORS } from "@/lib/types";
import type { Activity } from "@/lib/types";

interface Props {
  keypoints: Keypoint[];
  activity: Activity;
}

// Chambre : 4m × 3.5m × 2.5m — convertit coordonnées réelles en scène Three.js
// Dans la scène : centre de la chambre = (0,0,0), Y=haut
function toScene(kp: Keypoint): [number, number, number] {
  return [kp.x - 2.0, kp.y - 1.25, kp.z - 1.75];
}

export default function HumanSkeleton3D({ keypoints, activity }: Props) {
  const color = ACTIVITY_COLORS[activity] ?? "#00d4ff";
  const meshRef = useRef<THREE.Group>(null);

  if (!keypoints.length) return null;

  const positions = keypoints.map(toScene);

  return (
    <group ref={meshRef}>
      {/* Articulations */}
      {keypoints.map((kp, i) => {
        const [x, y, z] = positions[i];
        const isHead = i < 5;
        const radius = isHead ? 0.045 : 0.035;
        const opacity = 0.5 + 0.5 * kp.confidence;
        return (
          <mesh key={kp.name} position={[x, y, z]} castShadow>
            <sphereGeometry args={[radius, 12, 12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.6}
              transparent
              opacity={opacity}
            />
          </mesh>
        );
      })}

      {/* Os du squelette */}
      {SKELETON_CONNECTIONS.map(([a, b], i) => {
        const pa = positions[a];
        const pb = positions[b];
        if (!pa || !pb) return null;
        const conf = Math.min(keypoints[a]?.confidence ?? 0, keypoints[b]?.confidence ?? 0);
        return (
          <Line
            key={i}
            points={[
              new THREE.Vector3(...pa),
              new THREE.Vector3(...pb),
            ]}
            color={color}
            lineWidth={2.5}
            transparent
            opacity={0.3 + 0.7 * conf}
          />
        );
      })}

      {/* Halo de présence au sol */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
    </group>
  );
}
