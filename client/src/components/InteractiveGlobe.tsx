import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface HexagonData {
  originalPosition: THREE.Vector3;
  targetHeight: number;
  currentHeight: number;
}

const InteractiveGlobe = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const hexagonsRef = useRef<THREE.Mesh[]>([]);
  const mouseRef = useRef(new THREE.Vector2());
  const raycasterRef = useRef(new THREE.Raycaster());
  const sphereRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // slate-950
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Create invisible sphere for raycasting
    const sphereGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a1a3e,
      wireframe: false,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);
    sphereRef.current = sphere;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const pointLight1 = new THREE.PointLight(0x3b82f6, 1.2, 100);
    pointLight1.position.set(10, 10, 10);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x1e40af, 0.5, 100);
    pointLight2.position.set(0, -10, 0);
    scene.add(pointLight2);

    // Create hexagons on sphere surface
    const hexRadius = 0.08;
    const hexagons: THREE.Mesh[] = [];
    const hexGroup = new THREE.Group();
    
    // Generate points on sphere using fibonacci sphere
    const numHexagons = 600;
    const phi = Math.PI * (Math.sqrt(5) - 1); // golden angle

    for (let i = 0; i < numHexagons; i++) {
      const y = 1 - (i / (numHexagons - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      const position = new THREE.Vector3(x, y, z).multiplyScalar(2.5);
      
      // Create hexagon shape
      const hexShape = new THREE.Shape();
      for (let j = 0; j < 6; j++) {
        const angle = (Math.PI / 3) * j;
        const hx = hexRadius * Math.cos(angle);
        const hy = hexRadius * Math.sin(angle);
        if (j === 0) {
          hexShape.moveTo(hx, hy);
        } else {
          hexShape.lineTo(hx, hy);
        }
      }
      hexShape.closePath();
      
      const hexGeometry = new THREE.ShapeGeometry(hexShape);
      const hexMaterial = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.7,
        roughness: 0.5,
        emissive: 0x3b82f6,
        emissiveIntensity: 0,
        side: THREE.DoubleSide
      });
      
      const hex = new THREE.Mesh(hexGeometry, hexMaterial);
      
      // Position and orient hexagon on sphere surface
      hex.position.copy(position);
      hex.lookAt(0, 0, 0);
      hex.rotateX(Math.PI);
      
      const userData: HexagonData = {
        originalPosition: hex.position.clone(),
        targetHeight: 0,
        currentHeight: 0
      };
      hex.userData = userData;
      
      hexagons.push(hex);
      hexGroup.add(hex);
    }
    
    scene.add(hexGroup);
    hexagonsRef.current = hexagons;

    // Mouse move handler
    const onMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    window.addEventListener('mousemove', onMouseMove);

    // Animation loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate globe slowly
      hexGroup.rotation.y += 0.002;

      // Raycast to find intersection point
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      if (sphereRef.current) {
        const intersects = raycasterRef.current.intersectObject(sphereRef.current);
        
        if (intersects.length > 0) {
          const intersectionPoint = intersects[0].point;
          
          // Update hexagons based on distance from intersection
          hexagonsRef.current.forEach(hex => {
            const worldPos = new THREE.Vector3();
            hex.getWorldPosition(worldPos);
            const distance = worldPos.distanceTo(intersectionPoint);
            
            // Calculate influence based on distance (closer = more elevation)
            const maxDistance = 1.5;
            const influence = Math.max(0, 1 - distance / maxDistance);
            const heightMultiplier = 0.6;
            
            (hex.userData as HexagonData).targetHeight = influence * heightMultiplier;
          });
        } else {
          // No intersection, reset all hexagons
          hexagonsRef.current.forEach(hex => {
            (hex.userData as HexagonData).targetHeight = 0;
          });
        }
      }

      // Smooth animation for hexagon heights
      hexagonsRef.current.forEach(hex => {
        const userData = hex.userData as HexagonData;
        const lerpSpeed = 0.15;
        userData.currentHeight += (userData.targetHeight - userData.currentHeight) * lerpSpeed;
        
        const direction = userData.originalPosition.clone().normalize();
        hex.position.copy(
          userData.originalPosition.clone().add(
            direction.multiplyScalar(userData.currentHeight)
          )
        );
        
        // Scale based on height
        const scale = 1 + userData.currentHeight * 2;
        hex.scale.set(scale, scale, scale);
        
        // Color intensity based on height
        const intensity = userData.currentHeight / 0.6;
        const material = hex.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = intensity * 2;
        
        // Adjust base color brightness
        const hue = 0.58; // Blue hue
        const saturation = 0.7;
        const lightness = 0.15 + intensity * 0.3;
        material.color.setHSL(hue, saturation, lightness);
      });

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      
      // Dispose geometries and materials
      hexagonsRef.current.forEach(hex => {
        hex.geometry.dispose();
        (hex.material as THREE.Material).dispose();
      });
      
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
};

export default InteractiveGlobe;
