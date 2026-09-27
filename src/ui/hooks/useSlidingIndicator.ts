import type { JSX } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

export function useSlidingIndicator<T extends HTMLElement>(activeKey: string, animate = true) {
  const containerRef = useRef<T>(null);
  const hasPositionedRef = useRef(false);
  const [indicatorStyle, setIndicatorStyle] = useState<JSX.CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const active = container.querySelector<HTMLElement>('[data-selected="true"]');
      if (!active) return;
      setIndicatorStyle({
        opacity: 1,
        width: active.offsetWidth,
        height: active.offsetHeight,
        transform: `translate3d(${active.offsetLeft}px, ${active.offsetTop}px, 0)`,
        transition: hasPositionedRef.current && animate ? undefined : 'none',
      });
      hasPositionedRef.current = true;
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    Array.from(container.children).forEach(child => observer.observe(child));
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [activeKey, animate]);

  return { containerRef, indicatorStyle };
}
