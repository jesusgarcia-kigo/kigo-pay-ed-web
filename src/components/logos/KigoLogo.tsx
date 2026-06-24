import kigoLogoPng from "@/assets/kigo-logo.png";

/**
 * Kigo logo orange — for light backgrounds (checkout, success, etc.)
 * The source PNG is white, so we apply CSS filters to make it orange (#FF6900).
 */
export function KigoLogo({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src={kigoLogoPng}
      alt="Kigo"
      className={`w-auto select-none ${className}`}
      style={{
        filter: "brightness(0) saturate(100%) invert(39%) sepia(91%) saturate(2457%) hue-rotate(11deg) brightness(103%) contrast(104%)",
      }}
      draggable={false}
    />
  );
}

/**
 * Kigo logo white — for dark backgrounds (scanner).
 * The source PNG is white, displayed as-is.
 */
export function KigoLogoWhite({ className = "h-8" }: { className?: string }) {
  return (
    <img
      src={kigoLogoPng}
      alt="Kigo"
      className={`w-auto select-none ${className}`}
      draggable={false}
    />
  );
}
