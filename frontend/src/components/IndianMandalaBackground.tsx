import { useEffect, useRef, useState } from 'react';

interface ParticleType {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  type: 'mandala' | 'dot' | 'line';
}

export default function IndianMandalaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const rotationRef = useRef(0);
  const particlesRef = useRef<ParticleType[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Indian color palette
    const colors = {
      saffron: '#FF9933',
      white: '#FFFFFF',
      green: '#138808',
      navy: '#001a4d',
      gold: '#D4AF37',
      teal: '#20B2AA',
      accent: '#E8E8E8',
      darkblue: '#0F1419',
    };

    // Initialize particles
    const initializeParticles = () => {
      const particles: ParticleType[] = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Create floating particles around the mandala
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        particles.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          vx: Math.cos(angle) * 0.3,
          vy: Math.sin(angle) * 0.3,
          size: 2 + Math.random() * 4,
          opacity: 0.3 + Math.random() * 0.4,
          color: [colors.saffron, colors.teal, colors.gold][Math.floor(Math.random() * 3)],
          type: 'dot',
        });
      }
      return particles;
    };

    particlesRef.current = initializeParticles();

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseRef.current.active = true;

      // Reset after inactivity
      setTimeout(() => {
        mouseRef.current.active = false;
      }, 2000);
    };

    // Touch tracking for interactivity
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      mouseRef.current.x = (touch.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (touch.clientY / window.innerHeight) * 2 - 1;
      mouseRef.current.active = true;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    // Draw mandala pattern with improvements
    const drawMandala = (
      x: number,
      y: number,
      size: number,
      rotation: number,
      opacity: number,
      color: string,
      complexity: number
    ) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(x, y);
      ctx.rotate(rotation);

      const petals = 8 + complexity;
      const innerRadius = size * 0.1;
      const outerRadius = size * 0.5;

      for (let i = 0; i < petals; i++) {
        const angle = (Math.PI * 2 * i) / petals;
        ctx.rotate((Math.PI * 2) / petals);

        // Draw petal with gradient
        ctx.fillStyle = color;
        ctx.globalAlpha = opacity * (0.4 + 0.6 * Math.sin(rotation + i));

        // Petal shape using bezier curves
        ctx.beginPath();
        ctx.moveTo(0, innerRadius);
        ctx.bezierCurveTo(
          size * 0.2,
          outerRadius * 0.7,
          size * 0.15,
          outerRadius,
          0,
          outerRadius
        );
        ctx.bezierCurveTo(
          -size * 0.15,
          outerRadius,
          -size * 0.2,
          outerRadius * 0.7,
          0,
          innerRadius
        );
        ctx.fill();
      }

      // Decorative inner circles
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      for (let r = innerRadius; r < size * 0.2; r += size * 0.05) {
        ctx.globalAlpha = opacity * (1 - r / (size * 0.2));
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center dot
      ctx.globalAlpha = opacity * 0.9;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, innerRadius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    // Draw geometric patterns with improved visuals
    const drawGeometry = () => {
      ctx.save();
      ctx.strokeStyle = colors.saffron;
      ctx.lineWidth = 1;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.max(canvas.width, canvas.height) * 0.7;

      // Concentric circles with rotation
      for (let r = maxRadius * 0.1; r < maxRadius; r += maxRadius * 0.12) {
        ctx.globalAlpha = 0.04 + (0.08 * Math.sin(rotationRef.current * 0.0008 + r * 0.002));
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Radial lines with gradient effect
      for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24 + rotationRef.current * 0.00008;
        const x1 = centerX + Math.cos(angle) * maxRadius * 0.15;
        const y1 = centerY + Math.sin(angle) * maxRadius * 0.15;
        const x2 = centerX + Math.cos(angle) * maxRadius;
        const y2 = centerY + Math.sin(angle) * maxRadius;

        ctx.globalAlpha = 0.025 + 0.025 * Math.sin(rotationRef.current * 0.0005 + i);
        ctx.strokeStyle = [colors.saffron, colors.teal, colors.gold][i % 3];
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Triangular grid pattern
      const w = 80;
      for (let x = -w; x < canvas.width + w; x += w) {
        for (let y = -w; y < canvas.height + w; y += w) {
          ctx.globalAlpha = 0.02;
          ctx.strokeStyle = colors.teal;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w / 2, y + (w * Math.sqrt(3)) / 2);
          ctx.lineTo(x - w / 2, y + (w * Math.sqrt(3)) / 2);
          ctx.closePath();
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    // Update and draw particles
    const updateParticles = () => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      particlesRef.current.forEach((particle) => {
        // Movement
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Attraction to center with damping
        const dx = centerX - particle.x;
        const dy = centerY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const force = 0.0001;
        particle.vx += (dx / distance) * force;
        particle.vy += (dy / distance) * force;
        particle.vx *= 0.99;
        particle.vy *= 0.99;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));

        // Draw particle
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    // Animation loop
    let mouseInfluence = 0;
    const animate = () => {
      // Clear with semi-transparent background
      ctx.fillStyle = 'rgba(15, 20, 25, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const baseSize = Math.min(canvas.width, canvas.height) * 0.08;

      // Smooth mouse influence
      const targetInfluence = mouseRef.current.active
        ? Math.sqrt(mouseRef.current.x ** 2 + mouseRef.current.y ** 2) * 0.15
        : 0;
      mouseInfluence += (targetInfluence - mouseInfluence) * 0.1;

      // Draw background geometry
      drawGeometry();

      // Draw main rotating mandalas with varying speeds
      drawMandala(
        centerX,
        centerY,
        baseSize * (1.3 + mouseInfluence * 0.4),
        rotationRef.current * 0.00025,
        0.35 + mouseInfluence * 0.15,
        colors.saffron,
        0
      );

      drawMandala(
        centerX,
        centerY,
        baseSize * (0.9 + mouseInfluence * 0.25),
        -rotationRef.current * 0.00012,
        0.22,
        colors.green,
        2
      );

      drawMandala(
        centerX,
        centerY,
        baseSize * (1.6 + mouseInfluence * 0.5),
        rotationRef.current * 0.0001,
        0.18 + mouseInfluence * 0.08,
        colors.teal,
        1
      );

      // Draw particles
      updateParticles();

      // Mouse interactive glow
      if (mouseRef.current.active) {
        const particleX = centerX + mouseRef.current.x * (canvas.width * 0.25);
        const particleY = centerY + mouseRef.current.y * (canvas.height * 0.25);

        // Large glow effect
        const glow = ctx.createRadialGradient(particleX, particleY, 10, particleX, particleY, 150);
        glow.addColorStop(0, `rgba(212, 175, 55, ${0.3 * mouseInfluence})`);
        glow.addColorStop(0.5, `rgba(255, 153, 51, ${0.15 * mouseInfluence})`);
        glow.addColorStop(1, 'rgba(255, 153, 51, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cursor circle
        ctx.strokeStyle = colors.gold;
        ctx.globalAlpha = 0.4 * mouseInfluence;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 40, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Center glow effect
      const centerGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 250 + mouseInfluence * 100);
      centerGlow.addColorStop(0, `rgba(255, 153, 51, ${0.12 + mouseInfluence * 0.08})`);
      centerGlow.addColorStop(1, 'rgba(255, 153, 51, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      rotationRef.current += 0.6;
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initializeParticles();
    };

    // Handle visibility
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full z-0 cursor-crosshair"
      style={{ display: isVisible ? 'block' : 'none' }}
    />
  );
}
