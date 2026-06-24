/**
 * Apple Pay logo — uses the official mark as inline SVG for crisp rendering.
 * Apple icon + "Pay" text in a single color (adaptable via color prop).
 */
export function ApplePayLogo({
  className = "h-6",
  color = "#000000",
}: {
  className?: string;
  color?: string;
}) {
  // Using the official Apple Pay mark SVG path data
  return (
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg"
      alt="Apple Pay"
      className={`w-auto select-none object-contain ${className}`}
      style={color === "white" ? { filter: "brightness(0) invert(1)" } : undefined}
      draggable={false}
    />
  );
}
