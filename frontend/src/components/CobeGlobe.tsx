import createGlobe from "cobe";
import { useEffect, useRef } from "react";

export function CobeGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 1.3; // Centered near India
    let theta = 0.3;

    if (!canvasRef.current) return;

    // Use a width/height suitable for the globe to be larger than the screen
    const width = 1200;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: phi,
      theta: theta,
      dark: 0, 
      diffuse: 1.2,
      mapSamples: 24000,
      mapBrightness: 3.5, 
      baseColor: [0.96, 0.91, 0.84], // Ivory base
      markerColor: [0.06, 0.82, 0.71], // Teal markers
      glowColor: [0.90, 0.43, 0.18], // Saffron glow effect behind globe!
      markers: [
        { location: [28.6139, 77.2090], size: 0.12 }
      ],
      // @ts-ignore - onRender is valid in cobe but missing from some TS defs
      onRender: (state: Record<string, any>) => {
        state.phi = phi + 0.003;
        phi += 0.002;
      }
    });

    return () => {
      globe.destroy();
    };
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center -translate-y-10 scale-125 md:scale-[1.6]">
      <canvas
        ref={canvasRef}
        style={{
          width: 1200,
          height: 1200,
          maxWidth: "100%",
          aspectRatio: "1/1",
        }}
        className="cursor-pointer active:cursor-grabbing hover:drop-shadow-2xl transition-all"
      />
    </div>
  );
}
