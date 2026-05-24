import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

function HumanBody({ vitals }) {
  const heartRef = useRef();
  const lungsRef = useRef();

  // Determine distress states based on vitals
  const heartRate = vitals?.heart_rate || 75;
  const spo2 = vitals?.spo2 || 98;
  const isHeartCritical = heartRate > 120 || heartRate < 50;
  const isLungsCritical = spo2 < 92;

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Heart pulsing
    if (heartRef.current) {
      const pulseSpeed = isHeartCritical ? 10 : 3;
      const scale = 1 + Math.sin(t * pulseSpeed) * (isHeartCritical ? 0.2 : 0.1);
      heartRef.current.scale.set(scale, scale, scale);
    }
    // Lungs breathing
    if (lungsRef.current) {
      const breathSpeed = isLungsCritical ? 8 : 2;
      const scaleX = 1 + Math.sin(t * breathSpeed) * 0.05;
      const scaleY = 1 + Math.cos(t * breathSpeed) * 0.05;
      lungsRef.current.scale.set(scaleX, scaleY, 1);
    }
  });

  return (
    <group position={[0, -1, 0]}>
      {/* Body Silhouette */}
      <mesh position={[0, 1.5, 0]}>
        <capsuleGeometry args={[0.6, 1.4, 4, 16]} />
        <meshStandardMaterial color="#00d4ff" transparent opacity={0.15} wireframe />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 3.2, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#00d4ff" transparent opacity={0.15} wireframe />
      </mesh>

      {/* Shoulders / Arms hint */}
      <mesh position={[-0.8, 1.8, 0]}>
        <capsuleGeometry args={[0.2, 1, 4, 16]} />
        <meshStandardMaterial color="#00d4ff" transparent opacity={0.1} wireframe />
      </mesh>
      <mesh position={[0.8, 1.8, 0]}>
        <capsuleGeometry args={[0.2, 1, 4, 16]} />
        <meshStandardMaterial color="#00d4ff" transparent opacity={0.1} wireframe />
      </mesh>

      {/* Heart */}
      <mesh ref={heartRef} position={[0.15, 1.7, 0.2]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color={isHeartCritical ? "#ff3366" : "#ff8c00"} 
          emissive={isHeartCritical ? "#ff3366" : "#ff8c00"} 
          emissiveIntensity={isHeartCritical ? 2 : 0.5} 
        />
      </mesh>

      {/* Lungs */}
      <group ref={lungsRef} position={[0, 1.9, 0]}>
        {/* Left Lung */}
        <mesh position={[-0.25, 0, 0.1]}>
          <capsuleGeometry args={[0.15, 0.35, 4, 16]} />
          <meshStandardMaterial 
            color={isLungsCritical ? "#ff3366" : "#00d4ff"} 
            emissive={isLungsCritical ? "#ff3366" : "#00d4ff"} 
            emissiveIntensity={isLungsCritical ? 1.5 : 0.3} 
          />
        </mesh>
        {/* Right Lung */}
        <mesh position={[0.25, 0, 0.1]}>
          <capsuleGeometry args={[0.15, 0.35, 4, 16]} />
          <meshStandardMaterial 
            color={isLungsCritical ? "#ff3366" : "#00d4ff"} 
            emissive={isLungsCritical ? "#ff3366" : "#00d4ff"} 
            emissiveIntensity={isLungsCritical ? 1.5 : 0.3} 
          />
        </mesh>
      </group>
    </group>
  );
}

export default function DigitalTwin3D({ vitals }) {
  return (
    <div className="w-full h-full min-h-[350px] glass rounded-2xl overflow-hidden relative">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          3D Digital Twin
        </h3>
        <p className="text-slate-400 text-xs mt-1">Real-time Organ Status</p>
      </div>
      <Canvas camera={{ position: [0, 1.5, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <HumanBody vitals={vitals} />
        <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 4} />
      </Canvas>
    </div>
  );
}
