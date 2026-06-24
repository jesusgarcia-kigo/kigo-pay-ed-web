import { useEffect, useRef, useState } from "react";

/**
 * Client-only Lottie animation component.
 * Loads both lottie-web and the animation JSON dynamically to avoid SSR issues.
 * Pass `src` as the path to the JSON file (will be fetched on client).
 */
export function LottieClient({
  src,
  loop = true,
  className = "",
}: {
  src: string;
  loop?: boolean;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<{ destroy: () => void } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    async function init() {
      try {
        const [lottie, response] = await Promise.all([
          import("lottie-web"),
          fetch(src),
        ]);

        if (cancelled || !containerRef.current) return;

        const animationData = await response.json();
        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = "";

        const anim = lottie.default.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop,
          autoplay: true,
          animationData,
        });

        animationRef.current = anim;
        setLoaded(true);
      } catch (e) {
        console.warn("LottieClient failed to load:", e);
      }
    }

    init();

    return () => {
      cancelled = true;
      animationRef.current?.destroy();
    };
  }, [src, loop]);

  return <div ref={containerRef} className={className} />;
}
