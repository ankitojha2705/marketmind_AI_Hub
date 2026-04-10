import { useRevealOnScroll } from '../hooks/useRevealOnScroll';

export default function RevealSection({ className = '', children }) {
  const { ref, isVisible } = useRevealOnScroll();

  return (
    <section
      ref={ref}
      className={[
        'transform-gpu will-change-transform motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none',
        'transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </section>
  );
}
