'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Animation = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale-up' | 'fade';

interface RevealProps {
  children: ReactNode;
  animation?: Animation;
  delay?: number;
  duration?: number;
  className?: string;
  as?: keyof HTMLElementTagNameMap;
  threshold?: number;
  once?: boolean;
}

export function Reveal({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 700,
  className = '',
  threshold = 0.15,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return (
    <div
      ref={ref}
      className={`reveal reveal--${animation} ${isVisible ? 'reveal--visible' : ''} ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Stagger helper — wraps children with incremental delays.
 */
interface StaggerProps {
  children: ReactNode[];
  animation?: Animation;
  baseDelay?: number;
  stagger?: number;
  duration?: number;
  className?: string;
}

export function Stagger({
  children,
  animation = 'fade-up',
  baseDelay = 0,
  stagger = 120,
  duration = 700,
  className = '',
}: StaggerProps) {
  return (
    <>
      {children.map((child, i) => (
        <Reveal
          key={i}
          animation={animation}
          delay={baseDelay + i * stagger}
          duration={duration}
          className={className}
        >
          {child}
        </Reveal>
      ))}
    </>
  );
}
