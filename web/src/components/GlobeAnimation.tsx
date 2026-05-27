"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface GlobeAnimationProps {
  isSpeaking: boolean;
}

export function GlobeAnimation({ isSpeaking }: GlobeAnimationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const speakingRef = useRef(isSpeaking);

  useEffect(() => {
    speakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Create particles on a sphere
    const particleCount = 400;
    const radius = 5;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      positions[i * 3] = radius * Math.cos(theta) * Math.sin(phi);
      positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const pMaterial = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
    });
    const particleSystem = new THREE.Points(particles, pMaterial);

    // Create lines connecting close particles
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.15,
    });
    
    const linePositions = [];
    const maxDistance = 1.8;
    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < maxDistance) {
          linePositions.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          );
        }
      }
    }
    const linesGeometry = new THREE.BufferGeometry();
    linesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(linesGeometry, lineMaterial);

    const group = new THREE.Group();
    group.add(particleSystem);
    group.add(lines);
    scene.add(group);

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      time += 0.08;

      group.rotation.y += 0.001;
      group.rotation.x += 0.0005;

      if (speakingRef.current) {
        // Pulsate effect
        const scale = 1 + Math.sin(time) * 0.04;
        group.scale.set(scale, scale, scale);
        // Rotate slightly faster
        group.rotation.y += 0.004;
        pMaterial.opacity = 1;
        lineMaterial.opacity = 0.3;
        pMaterial.color.setHex(0x00ffff);
        lineMaterial.color.setHex(0x00ffff);
      } else {
        // Smooth transition back to normal scale
        group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
        pMaterial.opacity = 0.6;
        lineMaterial.opacity = 0.1;
        pMaterial.color.setHex(0x00aaff);
        lineMaterial.color.setHex(0x00aaff);
      }

      renderer.render(scene, camera);
    };
    render();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const mountNode = mountRef.current;
    
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountNode) {
        mountNode.removeChild(renderer.domElement);
      }
      particles.dispose();
      pMaterial.dispose();
      linesGeometry.dispose();
      lineMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full min-h-[300px]" />;
}
