/**
 * PayPal logo — uses official brand asset as image.
 * Displays the full PayPal wordmark with P icon.
 */
export function PayPalLogo({ className = "h-6" }: { className?: string }) {
  return (
    <img
      src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png"
      alt="PayPal"
      className={`w-auto select-none object-contain ${className}`}
      draggable={false}
    />
  );
}
