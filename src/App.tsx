import { motion, useScroll, useTransform, AnimatePresence, useSpring } from 'motion/react';
import { ArrowUpRight, Menu, MessageCircle } from 'lucide-react';
import React, { useEffect, useState, useRef, createContext, useContext, ReactNode } from 'react';
import Lenis from 'lenis';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Spline from '@splinetool/react-spline';
import { LanguageProvider, useLanguage, Language } from './contexts/LanguageContext';
import { GoogleGenerativeAI } from '@google/generative-ai';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Contexts ---
type CursorState = { active: boolean; text: string };
const CursorContext = createContext<{
  cursor: CursorState;
  setCursor: (state: CursorState) => void;
}>({
  cursor: { active: false, text: '' },
  setCursor: () => {},
});

// --- Components ---

function Preloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const interval = 20;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min(Math.round((currentStep / steps) * 100), 100);
      setProgress(newProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 500);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center"
      initial={{ y: 0 }}
      exit={{ y: '-100%', transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } }}
    >
      <div className="font-display text-[15vw] font-medium tracking-tighter text-white">
        {progress}%
      </div>
      <div className="absolute bottom-12 font-mono text-sm uppercase tracking-widest text-white/40">
        kial dev
      </div>
    </motion.div>
  );
}

function CustomCursor() {
  const { cursor } = useContext(CursorContext);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Smooth springs for cursor position
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const cursorX = useSpring(0, springConfig);
  const cursorY = useSpring(0, springConfig);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const updatePosition = (e: MouseEvent) => {
      setIsVisible(true);
      setPosition({ x: e.clientX, y: e.clientY });
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [cursorX, cursorY]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[150] flex items-center justify-center"
      style={{ x: cursorX, y: cursorY }}
    >
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-white mix-blend-difference"
        animate={{
          width: cursor.active ? 80 : 16,
          height: cursor.active ? 80 : 16,
          x: '-50%',
          y: '-50%',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      >
        <AnimatePresence>
          {cursor.active && cursor.text && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute text-black font-mono text-[10px] uppercase tracking-widest font-bold mix-blend-normal"
            >
              {cursor.text}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Magnetic({ children, className }: { children: ReactNode; className?: string; key?: React.Key }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { setCursor } = useContext(CursorContext);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.2, y: middleY * 0.2 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
    setCursor({ active: false, text: '' });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      onMouseEnter={() => setCursor({ active: true, text: '' })}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15, mass: 0.1 }}
      className={cn("inline-block", className)}
    >
      {children}
    </motion.div>
  );
}

function RevealText({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  
  return (
    <div className={cn("flex flex-wrap gap-x-[0.25em] gap-y-[0.1em]", className)}>
      {words.map((word, i) => (
        <div key={i} className="overflow-hidden inline-block">
          <motion.div
            initial={{ y: '100%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block"
          >
            {word}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

// --- Sections ---

function Nav() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-8 mix-blend-difference">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center">
        <Magnetic>
          <Link to="/" className="font-display font-medium text-xl tracking-tight cursor-pointer">
            Kial Dev
          </Link>
        </Magnetic>
        <div className="hidden md:flex items-center gap-10 font-sans text-sm font-medium">
          {['about', 'projects', 'process'].map((item) => (
            <Magnetic key={item}>
              <a href={`/#${item}`} className="hover:opacity-60 transition-opacity">{t(`nav.${item}`)}</a>
            </Magnetic>
          ))}
          <div className="flex items-center gap-4 border-l border-white/20 pl-4">
            <Magnetic>
              <a href="https://wa.me/244947109187" target="_blank" rel="noreferrer" className="hover:opacity-60 transition-opacity flex items-center justify-center" aria-label={t('nav.whatsapp')}>
                <MessageCircle className="w-5 h-5" />
              </a>
            </Magnetic>
            <Magnetic>
              <a href="mailto:kialungajs@gmail.com" className="hover:opacity-60 transition-opacity">{t('nav.email')}</a>
            </Magnetic>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button 
              onClick={() => setLanguage('pt')} 
              className={cn("hover:opacity-60 transition-opacity", language === 'pt' ? "opacity-100" : "opacity-40")}
            >
              PT
            </button>
            <span className="opacity-40">/</span>
            <button 
              onClick={() => setLanguage('en')} 
              className={cn("hover:opacity-60 transition-opacity", language === 'en' ? "opacity-100" : "opacity-40")}
            >
              EN
            </button>
          </div>
        </div>
        <Magnetic className="md:hidden">
          <button className="flex items-center gap-2 font-sans text-sm font-medium hover:opacity-60 transition-opacity">
            <Menu className="w-5 h-5" />
          </button>
        </Magnetic>
      </div>
    </nav>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity = useTransform(scrollY, [300, 1000], [1, 0]);
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 pt-32 pb-20">
      <motion.div style={{ y, opacity }} className="relative z-10 max-w-[1400px] mx-auto w-full">
        <div className="overflow-hidden mb-4">
          <motion.p 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-mono text-xs md:text-sm tracking-widest uppercase text-white/50 flex items-center gap-4"
          >
            <span className="w-8 h-[1px] bg-white/50" />
            {t('hero.partner')}
          </motion.p>
        </div>
        
        <h1 className="text-[12vw] md:text-[9vw] leading-[0.9] font-display font-medium tracking-tighter">
          <div className="overflow-hidden">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              {t('hero.title1')}
            </motion.div>
          </div>
          <div className="overflow-hidden">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}>
              <span className="text-white/40 italic font-light">{t('hero.title2')}</span>
            </motion.div>
          </div>
          <div className="overflow-hidden">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}>
              {t('hero.title3')}
            </motion.div>
          </div>
        </h1>
        
        <motion.div 
          className="mt-16 md:mt-32 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <p className="max-w-xl text-white/70 font-light text-xl md:text-2xl leading-relaxed">
            {t('hero.desc')}
          </p>
          
          <div className="flex gap-6 font-sans text-sm font-medium uppercase tracking-widest text-white/50">
            <Magnetic>
              <a href="https://wa.me/244947109187" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors bg-white/20 px-6 py-3 rounded-full">
                {t('nav.whatsapp')} <ArrowUpRight className="w-4 h-4" />
              </a>
            </Magnetic>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

function Intro() {
  const { t } = useLanguage();
  return (
    <section id="about" className="py-32 px-6 md:px-12 max-w-[1400px] mx-auto border-t border-white/10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative">
        <div className="md:col-span-12 mb-4">
          <p className="font-sans text-sm font-medium text-white/40 uppercase tracking-widest">{t('intro.label')}</p>
        </div>

        {/* Large Text */}
        <div className="md:col-span-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 z-10">
          <RevealText 
            text={t('intro.text1')}
            className="text-3xl md:text-5xl lg:text-6xl font-display font-medium leading-[1.1] tracking-tight"
          />
        </div>

        {/* Top Right Image */}
        <motion.div
          className="hidden md:block md:col-span-3 md:col-start-10 md:-mt-12 z-0"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10">
            <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop" alt="Office" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
          </div>
        </motion.div>

        {/* Bottom Left Image */}
        <motion.div
          className="md:col-span-5 mt-8 md:mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden border border-white/10">
            <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2070&auto=format&fit=crop" alt="Team" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
          </div>
        </motion.div>

        {/* Bottom Right Text */}
        <div className="md:col-span-6 md:col-start-7 mt-8 md:mt-32 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 self-start z-10">
          <motion.p 
            className="text-lg md:text-2xl text-white/70 font-light leading-relaxed mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {t('intro.text2')}
          </motion.p>
          <Magnetic>
            <a href="https://wa.me/244947109187" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#d4ff3f] text-black px-6 py-3 rounded-full font-sans text-sm font-medium uppercase tracking-widest hover:bg-white transition-colors">
              <ArrowUpRight className="w-4 h-4" /> {t('intro.cta')}
            </a>
          </Magnetic>
        </div>
      </div>
    </section>
  );
}

function StudioIntro() {
  const { t } = useLanguage();
  return (
    <section id="studio" className="py-32 px-6 md:px-12 max-w-[1400px] mx-auto border-t border-white/10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative">
        <div className="md:col-span-12 mb-4">
          <p className="font-sans text-sm font-medium text-white/40 uppercase tracking-widest">{t('studio.label')}</p>
        </div>

        {/* Large Text */}
        <div className="md:col-span-9 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 z-10">
          <RevealText 
            text={t('studio.text1')}
            className="text-3xl md:text-5xl lg:text-6xl font-display font-medium leading-[1.1] tracking-tight"
          />
        </div>

        {/* Top Right Image */}
        <motion.div
          className="hidden md:block md:col-span-3 md:col-start-10 md:-mt-24 z-0"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden border border-white/10">
            <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" alt="Strategy" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
          </div>
        </motion.div>

        {/* Bottom Left Image */}
        <motion.div
          className="md:col-span-4 mt-8 md:mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10">
            <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop" alt="Meeting" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
          </div>
        </motion.div>

        {/* Bottom Right Text */}
        <div className="md:col-span-7 md:col-start-6 mt-8 md:mt-24 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12 self-start z-10">
          <motion.p 
            className="text-lg md:text-2xl text-white/70 font-light leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {t('studio.text2')}
          </motion.p>
        </div>
      </div>
    </section>
  );
}



function Approach() {
  const { t } = useLanguage();
  return (
    <section id="process" className="py-32 px-6 md:px-12 max-w-[1400px] mx-auto border-t border-white/10">
      <div className="grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <p className="font-sans text-sm font-medium text-white/40 uppercase tracking-widest">{t('process.label')}</p>
        </div>
        <div className="md:col-span-8 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12">
          <RevealText 
            text={t('process.text1')}
            className="text-3xl md:text-5xl lg:text-6xl font-display font-medium leading-[1.1] tracking-tight mb-12"
          />
          <div className="grid sm:grid-cols-2 gap-12 mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col gap-6"
            >
              <div className="rounded-2xl overflow-hidden aspect-video border border-white/10">
                <img src="https://images.unsplash.com/photo-1544391496-1ca7c974456e?q=80&w=2071&auto=format&fit=crop" alt="Discovery" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h4 className="text-xl font-display font-medium mb-4">{t('process.step1.title')}</h4>
                <p className="text-white/50 font-light leading-relaxed">{t('process.step1.desc')}</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col gap-6"
            >
              <div className="rounded-2xl overflow-hidden aspect-video border border-white/10">
                <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop" alt="Execution" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h4 className="text-xl font-display font-medium mb-4">{t('process.step2.title')}</h4>
                <p className="text-white/50 font-light leading-relaxed">{t('process.step2.desc')}</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const { t, services } = useLanguage();
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const serviceImages = [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop", // Web Creation
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?q=80&w=2000&auto=format&fit=crop", // Systems
    "https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?q=80&w=2070&auto=format&fit=crop", // UX Design
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"  // Hosting
  ];

  return (
    <section className="py-32 px-6 md:px-12 border-t border-white/10 relative" onMouseMove={handleMouseMove}>
      <AnimatePresence>
        {hoveredTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed pointer-events-none z-[200] bg-white text-black px-4 py-2 rounded-md text-sm font-medium shadow-xl max-w-[250px]"
            style={{ 
              left: tooltipPos.x + 20, 
              top: tooltipPos.y + 20 
            }}
          >
            {hoveredTooltip}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-12 gap-12 mb-20">
          <div className="md:col-span-4">
            <p className="font-sans text-sm font-medium text-white/40 uppercase tracking-widest">{t('capabilities.label')}</p>
          </div>
          <div className="md:col-span-8">
            <RevealText 
              text={t('capabilities.text1')}
              className="text-3xl md:text-5xl lg:text-6xl font-display font-medium tracking-tight"
            />
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20 bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12">
          {services.map((service, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="flex flex-col"
            >
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 mb-8">
                <img src={serviceImages[i]} alt={service.title} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
              </div>
              <h3 className="text-xl md:text-2xl font-display font-medium mb-6">{service.title}</h3>
              <ul className="flex flex-col gap-3">
                {service.items.map((item, j) => (
                  <li 
                    key={j} 
                    className="font-sans text-sm text-white/60 flex items-center gap-3 cursor-pointer hover:text-white transition-colors w-fit"
                    onMouseEnter={() => setHoveredTooltip(item.tooltip)}
                    onMouseLeave={() => setHoveredTooltip(null)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryMedia({ src, alt }: { src: string; alt: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = src.endsWith('.mkv') || src.endsWith('.mp4') || src.endsWith('.webm');

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity duration-500"
        muted
        loop
        playsInline
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="absolute inset-0 w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity duration-500" 
      referrerPolicy="no-referrer" 
    />
  );
}

function DynamicGallery() {
  const [hovered, setHovered] = useState<number | null>(null);
  
  const items = [
    { src: "/galeria/video_1.mkv", alt: "Project Video 1" },
    { src: "/galeria/foto_1.webp", alt: "Project Photo 1" },
    { src: "/galeria/video_2.mkv", alt: "Project Video 2" },
    { src: "/galeria/foto_2.jpg", alt: "Project Photo 2" },
    { src: "/galeria/video_3.mkv", alt: "Project Video 3" },
    { src: "/galeria/foto_3.jpg", alt: "Project Photo 3" },
  ];
  
  return (
    <section id="projects" className="py-20 px-6 md:px-12 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row gap-4 h-[1200px] md:h-[600px] w-full z-10 relative">
        {/* Column 1 */}
        <div 
          className={cn(
            "flex flex-col gap-4 transition-all duration-500 ease-in-out",
            (hovered === 0 || hovered === 1) ? "md:flex-[2] flex-[2]" : hovered === null ? "md:flex-1 flex-1" : "md:flex-[0.5] flex-[0.5]"
          )}
        >
          <div 
            className={cn(
              "relative rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 ease-in-out cursor-pointer",
              hovered === 0 ? "flex-[2]" : hovered === null ? "flex-1" : "flex-[0.5]"
            )}
            onMouseEnter={() => setHovered(0)}
            onMouseLeave={() => setHovered(null)}
          >
            <GalleryMedia src={items[0].src} alt={items[0].alt} />
          </div>
          <div 
            className={cn(
              "relative rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 ease-in-out cursor-pointer",
              hovered === 1 ? "flex-[2]" : hovered === null ? "flex-1" : "flex-[0.5]"
            )}
            onMouseEnter={() => setHovered(1)}
            onMouseLeave={() => setHovered(null)}
          >
            <GalleryMedia src={items[1].src} alt={items[1].alt} />
          </div>
        </div>
        
        {/* Column 2 */}
        <div 
          className={cn(
            "flex flex-col gap-4 transition-all duration-500 ease-in-out",
            (hovered === 2 || hovered === 3) ? "md:flex-[2] flex-[2]" : hovered === null ? "md:flex-1 flex-1" : "md:flex-[0.5] flex-[0.5]"
          )}
        >
          <div 
            className={cn(
              "relative rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 ease-in-out cursor-pointer",
              hovered === 2 ? "flex-[2]" : hovered === null ? "flex-1" : "flex-[0.5]"
            )}
            onMouseEnter={() => setHovered(2)}
            onMouseLeave={() => setHovered(null)}
          >
            <GalleryMedia src={items[2].src} alt={items[2].alt} />
          </div>
          <div 
            className={cn(
              "relative rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 ease-in-out cursor-pointer",
              hovered === 3 ? "flex-[2]" : hovered === null ? "flex-1" : "flex-[0.5]"
            )}
            onMouseEnter={() => setHovered(3)}
            onMouseLeave={() => setHovered(null)}
          >
            <GalleryMedia src={items[3].src} alt={items[3].alt} />
          </div>
        </div>

        {/* Column 3 */}
        <div 
          className={cn(
            "flex flex-col gap-4 transition-all duration-500 ease-in-out",
            (hovered === 4 || hovered === 5) ? "md:flex-[2] flex-[2]" : hovered === null ? "md:flex-1 flex-1" : "md:flex-[0.5] flex-[0.5]"
          )}
        >
          <div 
            className={cn(
              "relative rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 ease-in-out cursor-pointer",
              hovered === 4 ? "flex-[2]" : hovered === null ? "flex-1" : "flex-[0.5]"
            )}
            onMouseEnter={() => setHovered(4)}
            onMouseLeave={() => setHovered(null)}
          >
            <GalleryMedia src={items[4].src} alt={items[4].alt} />
          </div>
          <div 
            className={cn(
              "relative rounded-2xl overflow-hidden border border-white/10 transition-all duration-500 ease-in-out cursor-pointer",
              hovered === 5 ? "flex-[2]" : hovered === null ? "flex-1" : "flex-[0.5]"
            )}
            onMouseEnter={() => setHovered(5)}
            onMouseLeave={() => setHovered(null)}
          >
            <GalleryMedia src={items[5].src} alt={items[5].alt} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  return (
    <div className="py-10 border-y border-white/10 overflow-hidden bg-black/80 backdrop-blur-md relative z-10 flex items-center">
      <motion.div 
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      >
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center">
            <span className="text-4xl md:text-6xl font-display font-medium uppercase tracking-tighter px-8">
              kial dev
            </span>
            <span className="text-4xl md:text-6xl font-display font-medium text-white/20 uppercase tracking-tighter px-8">
              Desenvolvedor Criativo
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function Footer() {
  const { t } = useLanguage();
  return (
    <footer id="connect" className="pt-32 pb-8 px-6 md:px-12 bg-black/80 backdrop-blur-xl border-t border-white/10 overflow-hidden relative z-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-12 gap-12 mb-32">
          <div className="md:col-span-4">
            <p className="font-sans text-sm font-medium text-white/40 uppercase tracking-widest mb-8">{t('footer.connect')}</p>
            <div className="flex flex-col gap-2 font-sans text-lg">
              <Magnetic className="self-start">
                <a href="mailto:kialungajs@gmail.com" className="hover:opacity-60 transition-opacity">kialungajs@gmail.com</a>
              </Magnetic>
              <Magnetic className="self-start">
                <a href="https://wa.me/244947109187" target="_blank" rel="noreferrer" className="hover:opacity-60 transition-opacity flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> WhatsApp
                </a>
              </Magnetic>
            </div>
          </div>
          <div className="md:col-span-8">
            <h2 className="text-5xl md:text-8xl font-display font-medium mb-16 leading-[0.9] tracking-tighter">
              {t('footer.title')} <br/> Kial Dev
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 font-sans text-sm font-medium">
              <div className="flex flex-col gap-4 items-start">
                {['about', 'projects', 'process'].map(link => (
                  <Magnetic key={link}><a href={`/#${link}`} className="hover:opacity-60 transition-opacity">{t(`nav.${link}`)}</a></Magnetic>
                ))}
              </div>
              <div className="flex flex-col gap-4 items-start">
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-sm text-white/40 font-sans font-medium">
          <p>© {new Date().getFullYear()} Kial Dev</p>
          <Magnetic>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors mt-4 md:mt-0">
              {t('footer.backToTop')}
            </button>
          </Magnetic>
        </div>
      </div>
    </footer>
  );
}

function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Intro />
      <DynamicGallery />
      <Services />
      <Approach />
      <Marquee />
      <Footer />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function SplineBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* We make the container taller than the screen so the bottom logo gets cut off by overflow-hidden */}
      <div className="absolute top-0 left-0 w-full" style={{ height: 'calc(100% + 100px)' }}>
        <Spline scene="https://prod.spline.design/ebyeB-yOYw7mROVn/scene.splinecode" />
      </div>
    </div>
  );
}

function WatermarkCover() {
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.03] contrast-150 grayscale mix-blend-overlay">
      <svg className="h-full w-full">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}

function AIProposalGenerator() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Data, 2: AI Interaction, 3: Result
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    employees: '',
    email: '',
    whatsapp: '',
    social: '',
    serviceType: '',
    description: ''
  });
  const [proposal, setProposal] = useState('');
  const { language } = useLanguage();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateProposal = async () => {
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = language === 'pt' 
        ? `Você é o assistente comercial sênior do "Kial Dev".
           DADOS DO CLIENTE:
           - Empresa: ${formData.companyName}
           - Tamanho: ${formData.employees} funcionários
           - Serviço: ${formData.serviceType}
           - Descrição: ${formData.description}
           - Contato: ${formData.email} / ${formData.whatsapp}
           
           TAREFA:
           Crie uma proposta comercial estratégica.
           REGRAS OBRIGATÓRIAS:
           1. Proponha uma faixa de PREÇO estimada (em Kwanza ou Dólar, sendo competitivo mas premium).
           2. Destaque OBRIGATORIAMENTE os "7 DIAS DE TESTE GRÁTIS" para validar o produto.
           3. Use um tom profissional, técnico e persuasivo.
           4. Formate com Markdown elegante.`
        : `You are the Senior Sales Assistant for "Kial Dev".
           CLIENT DATA:
           - Company: ${formData.companyName}
           - Size: ${formData.employees} employees
           - Service: ${formData.serviceType}
           - Description: ${formData.description}
           - Contact: ${formData.email} / ${formData.whatsapp}
           
           TASK:
           Create a strategic business proposal.
           MANDATORY RULES:
           1. Propose an estimated PRICE range (Competitive but premium).
           2. MANDATORILY highlight the "7-DAY FREE TRIAL" to validate the product.
           3. Use a professional, technical, and persuasive tone.
           4. Format with elegant Markdown.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setProposal(response.text());
      setStep(3);
    } catch (error) {
      console.error(error);
      setProposal(language === 'pt' ? "Erro ao gerar proposta. Verifique sua chave API." : "Error generating proposal. Check your API key.");
      setStep(3);
    }
    setLoading(false);
  };

  const sendToEmail = () => {
    const subject = encodeURIComponent(`Nova Proposta Comercial - ${formData.companyName}`);
    const body = encodeURIComponent(
      `Olá Kial,\n\n` +
      `Gostaria de solicitar um orçamento com base na proposta gerada pela IA:\n\n` +
      `--- DADOS DA EMPRESA ---\n` +
      `Empresa: ${formData.companyName}\n` +
      `Funcionários: ${formData.employees}\n` +
      `WhatsApp: ${formData.whatsapp}\n` +
      `Rede Social: ${formData.social}\n` +
      `Serviço: ${formData.serviceType}\n\n` +
      `--- PROPOSTA GERADA ---\n` +
      `${proposal}\n\n` +
      `--- FIM DA PROPOSTA ---`
    );
    window.location.href = `mailto:kialungajs@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <>
      <div className="fixed bottom-8 right-8 z-[120]">
        <Magnetic>
          <button 
            onClick={() => setIsOpen(true)}
            className="bg-[#d4ff3f] text-black p-4 md:p-6 rounded-full shadow-2xl flex items-center gap-3 hover:scale-110 transition-transform group"
          >
            <span className="font-sans text-xs font-bold uppercase tracking-widest hidden md:block">
              {language === 'pt' ? 'Solicitar Orçamento IA' : 'AI Quote Request'}
            </span>
            <ArrowUpRight className="w-6 h-6" />
          </button>
        </Magnetic>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#0a0a0a] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#d4ff3f] flex items-center justify-center text-black font-bold text-xs">
                    {step}
                  </div>
                  <h2 className="font-display text-xl font-medium tracking-tight">
                    {step === 1 && (language === 'pt' ? 'Dados do Projeto' : 'Project Data')}
                    {step === 2 && (language === 'pt' ? 'Interação com IA' : 'AI Interaction')}
                    {step === 3 && (language === 'pt' ? 'Sua Proposta Exclusiva' : 'Your Exclusive Proposal')}
                  </h2>
                </div>
                <button onClick={() => {setIsOpen(false); setStep(1); setProposal('');}} className="text-white/40 hover:text-white transition-colors uppercase text-xs tracking-widest font-bold">
                  {language === 'pt' ? '[ Fechar ]' : '[ Close ]'}
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                {step === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{language === 'pt' ? 'Nome da Empresa' : 'Company Name'}</label>
                      <input name="companyName" value={formData.companyName} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[#d4ff3f]/50 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{language === 'pt' ? 'Funcionários' : 'Employees'}</label>
                      <input name="employees" type="number" value={formData.employees} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[#d4ff3f]/50 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Email</label>
                      <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[#d4ff3f]/50 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">WhatsApp</label>
                      <input name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[#d4ff3f]/50 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{language === 'pt' ? 'Rede Social' : 'Social Media'}</label>
                      <input name="social" value={formData.social} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[#d4ff3f]/50 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{language === 'pt' ? 'Tipo de Serviço' : 'Service Type'}</label>
                      <select name="serviceType" value={formData.serviceType} onChange={handleInputChange} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[#d4ff3f]/50 outline-none">
                        <option value="">{language === 'pt' ? 'Selecione...' : 'Select...'}</option>
                        <option value="Website">Website</option>
                        <option value="Web App">Web App</option>
                        <option value="Landing Page">Landing Page</option>
                        <option value="E-commerce">E-commerce</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{language === 'pt' ? 'Descrição do Projeto' : 'Project Description'}</label>
                      <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[#d4ff3f]/50 outline-none resize-none" />
                    </div>
                    <button 
                      onClick={() => setStep(2)}
                      disabled={!formData.companyName || !formData.email}
                      className="md:col-span-2 bg-[#d4ff3f] text-black py-5 rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-white transition-colors disabled:opacity-30"
                    >
                      {language === 'pt' ? 'Avançar para IA' : 'Proceed to AI'}
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="text-center space-y-8 py-10">
                    <div className="w-20 h-20 bg-[#d4ff3f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageCircle className="w-10 h-10 text-[#d4ff3f]" />
                    </div>
                    <h3 className="text-3xl font-display font-medium">
                      {language === 'pt' ? 'Deseja interagir com nossa IA?' : 'Want to interact with our AI?'}
                    </h3>
                    <p className="text-white/60 max-w-md mx-auto">
                      {language === 'pt' 
                        ? 'Você pode tirar dúvidas agora ou clicar em avançar para gerar sua proposta completa com preços e o teste de 7 dias.'
                        : 'You can ask questions now or click proceed to generate your full proposal with prices and the 7-day trial.'}
                    </p>
                    <div className="flex flex-col gap-4 max-w-md mx-auto">
                      <button 
                        onClick={generateProposal}
                        className="bg-[#d4ff3f] text-black py-5 rounded-2xl font-sans font-bold uppercase tracking-widest hover:bg-white transition-colors"
                      >
                        {loading ? <div className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto" /> : (language === 'pt' ? 'Gerar Proposta Final' : 'Generate Final Proposal')}
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8">
                    <div className="bg-[#d4ff3f]/5 border border-[#d4ff3f]/20 p-6 rounded-2xl flex items-center gap-4 mb-8">
                      <div className="bg-[#d4ff3f] text-black p-2 rounded-lg font-bold text-xs uppercase tracking-tighter">7 Dias</div>
                      <p className="text-sm font-medium text-[#d4ff3f]">
                        {language === 'pt' 
                          ? 'Lembre-se: Você tem 7 dias de teste grátis para validar o produto!' 
                          : 'Remember: You have a 7-day free trial to validate the product!'}
                      </p>
                    </div>
                    <div className="prose prose-invert max-w-none bg-white/5 p-8 rounded-3xl border border-white/10">
                      <div className="whitespace-pre-wrap font-sans text-lg leading-relaxed text-white/90">
                        {proposal}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button 
                        onClick={sendToEmail}
                        className="bg-white text-black py-4 rounded-xl font-sans font-bold uppercase tracking-widest text-xs hover:bg-[#d4ff3f] transition-colors"
                      >
                        {language === 'pt' ? 'Enviar p/ Email' : 'Send to Email'}
                      </button>
                      <a 
                        href={`https://wa.me/244947109187?text=${encodeURIComponent(`Olá Kial! Acabei de gerar uma proposta para a ${formData.companyName}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#25D366] text-white py-4 rounded-xl font-sans font-bold uppercase tracking-widest text-xs text-center hover:opacity-80 transition-opacity"
                      >
                        WhatsApp
                      </a>
                      <button 
                        onClick={() => {setStep(1); setProposal('');}}
                        className="border border-white/10 py-4 rounded-xl font-sans font-bold uppercase tracking-widest text-xs hover:bg-white/5 transition-colors"
                      >
                        {language === 'pt' ? 'Nova Consulta' : 'New Inquiry'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<CursorState>({ active: false, text: '' });

  useEffect(() => {
    // Initialize Lenis for smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <LanguageProvider>
      <CursorContext.Provider value={{ cursor, setCursor }}>
        <AnimatePresence mode="wait">
          {isLoading && <Preloader onComplete={() => setIsLoading(false)} />}
        </AnimatePresence>

        <div className={cn(
          "bg-[#050505] text-white min-h-screen font-sans selection:bg-white selection:text-black cursor-none relative",
          isLoading ? "h-screen overflow-hidden" : ""
        )}>
          <SplineBackground />
          <WatermarkCover />
          <CustomCursor />
          <AIProposalGenerator />
          {!isLoading && (
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Home />} />
              </Routes>
            </BrowserRouter>
          )}
        </div>
      </CursorContext.Provider>
    </LanguageProvider>
  );
}
