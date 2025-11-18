import createGlobe from "cobe";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface GlobeProps {
  className?: string;
}

export const Globe = ({ className = "" }: GlobeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let phi = 0;
    let width = 0;

    if (!canvasRef.current) return;

    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 600 * 2,
      height: 600 * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.2, 0.2, 0.25], // Dark slate water
      markerColor: [0.251, 0.557, 0.965], // Blue glowing markers (LinkSecure brand)
      glowColor: [0.4, 0.6, 1], // Blue glow
      markers: [
        // Major cities representing secure file transfers
        { location: [37.7595, -122.4367], size: 0.08 }, // San Francisco
        { location: [40.7128, -74.006], size: 0.1 }, // New York
        { location: [51.5074, -0.1278], size: 0.08 }, // London
        { location: [35.6762, 139.6503], size: 0.08 }, // Tokyo
        { location: [48.8566, 2.3522], size: 0.07 }, // Paris
        { location: [52.52, 13.405], size: 0.07 }, // Berlin
        { location: [-33.8688, 151.2093], size: 0.07 }, // Sydney
        { location: [55.7558, 37.6173], size: 0.07 }, // Moscow
        { location: [19.4326, -99.1332], size: 0.07 }, // Mexico City
        { location: [1.3521, 103.8198], size: 0.08 }, // Singapore
        { location: [-23.5505, -46.6333], size: 0.07 }, // São Paulo
        { location: [28.6139, 77.209], size: 0.07 }, // New Delhi
      ],
      onRender: (state) => {
        // Rotate the globe
        state.phi = phi;
        // Adjust speed based on hover state
        phi += isHovered ? 0.005 : 0.003;
        // Auto-rotate
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [isHovered]);

  return (
    <motion.div
      className={`flex items-center justify-center ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ 
        scale: 1.15,
        transition: { type: "spring", stiffness: 100, damping: 15 }
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          aspectRatio: "1",
          contain: "layout paint size",
        }}
      />
    </motion.div>
  );
};

export default Globe;
