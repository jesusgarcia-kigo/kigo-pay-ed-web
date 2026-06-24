import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Check, ShieldCheck, AlertCircle, Loader2,
  Plus, MapPin, Ticket,
  X,
} from "lucide-react";
import { PayPalLogo } from "@/components/logos/PayPalLogo";
import { ApplePayLogo } from "@/components/logos/ApplePayLogo";
import { KigoLogo, KigoLogoWhite } from "@/components/logos/KigoLogo";
import { LottieClient } from "@/components/LottieClient";

export const Route = createFileRoute("/")({
  component: KigoApp,
});

type View = "scan" | "manual" | "checkout" | "confirming" | "success";
type Method = "card-visa" | "card-master" | "apple" | "paypal";

function KigoApp() {
  const [view, setView] = useState<View>("scan");
  const [method, setMethod] = useState<Method>("card-master");
  const [isPayLoading, setIsPayLoading] = useState(false);
  const [showPayError, setShowPayError] = useState(false);

  const pay = () => {
    setIsPayLoading(true);
    setShowPayError(false);
    // Simulate payment processing inside the button
    setTimeout(() => {
      setIsPayLoading(false);
      const success = Math.random() > 0.15;
      if (success) {
        setView("confirming"); // Show success Lottie animation
        setTimeout(() => setView("success"), 2200); // Then transition to detail
      } else {
        setShowPayError(true); // Show error swipe overlay on checkout
      }
    }, 1800);
  };

  // PROTOTYPE ONLY: force error for PayPal demo
  const payForceError = () => {
    setIsPayLoading(true);
    setShowPayError(false);
    setTimeout(() => {
      setIsPayLoading(false);
      setShowPayError(true);
    }, 1800);
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="phone-frame relative flex min-h-dvh flex-col">
        {view === "scan" && (
          <Scanner
            onManual={() => {}}
            onDetect={() => setView("checkout")}
          />
        )}
        {view === "manual" && (
          <Scanner
            onManual={() => {}}
            onDetect={() => setView("checkout")}
            forceManualOpen
            onManualClose={() => setView("scan")}
          />
        )}
        {view === "checkout" && (
          <Checkout
            method={method}
            setMethod={setMethod}
            onPay={pay}
            onPayForceError={payForceError}
            onBack={() => setView("scan")}
            isPayLoading={isPayLoading}
            showPayError={showPayError}
            onDismissError={() => setShowPayError(false)}
          />
        )}
        {view === "confirming" && <ConfirmingAnimation />}
        {view === "success" && (
          <Success method={method} onDone={() => setView("scan")} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────  Scanner  ───────────────────────── */

function Scanner({ onManual, onDetect, forceManualOpen, onManualClose }: { onManual: () => void; onDetect: () => void; forceManualOpen?: boolean; onManualClose?: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [camState, setCamState] = useState<"idle" | "ready" | "denied" | "unsupported">("idle");
  const [tapCount, setTapCount] = useState(0);
  const [showPaidAlert, setShowPaidAlert] = useState(false);
  const [showCantReadAlert, setShowCantReadAlert] = useState(false);
  const [showManualSwipe, setShowManualSwipe] = useState(forceManualOpen ?? false);
  const [manualCode, setManualCode] = useState("");
  const [paidAlertDrag, setPaidAlertDrag] = useState(0);
  const [cantReadDrag, setCantReadDrag] = useState(0);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const dragStartY = useRef(0);
  const manualCodeValid = manualCode.replace(/\s/g, "").length >= 6;

  /**
   * PROTOTYPE ONLY — Scanner feedback scenarios:
   * 
   * Phase 1 (0-9s): Orientation hints cycling every 3s
   *   - "Acerca más la cámara"
   *   - "Aleja la cámara"
   *   - "Enfoca el código del boleto"
   * 
   * Phase 2 (9s+): Legibility warnings cycling every 5s
   *   - "El boleto no es posible leerlo"
   *   - "Enfoca de una mejor manera el boleto"
   * 
   * First tap on scan area: Shows "Boleto pagado o inválido" swipe alert
   * Second tap: Proceeds to checkout
   * 
   * HANDOFF NOTE: In production these scenarios are triggered by actual
   * barcode/QR detection logic, not timers. The swipe alert appears when
   * backend returns ticket_status: "paid" or "invalid".
   */

  // Feedback messages
  const orientationHints = [
    "Acerca más la cámara",
    "Aleja la cámara",
    "Enfoca el código del boleto",
  ];
  const legibilityWarnings = [
    "El boleto no es posible leerlo",
    "Enfoca de una mejor manera el boleto",
  ];

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const totalOrientation = orientationHints.length;

    // Phase 1: orientation hints every 3s, then phase 2: legibility every 5s
    let currentIndex = 0;
    const cycle = () => {
      currentIndex++;
      setFeedbackIndex(currentIndex);
    };

    // Start with 3s intervals for orientation
    timer = setInterval(cycle, 3000);

    // After orientation phase (9s), switch to 5s interval
    const switchTimer = setTimeout(() => {
      clearInterval(timer);
      timer = setInterval(cycle, 5000);
    }, totalOrientation * 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(switchTimer);
    };
  }, []);

  const getCurrentFeedback = () => {
    const totalOrientation = orientationHints.length;
    if (feedbackIndex < totalOrientation) {
      return { text: orientationHints[feedbackIndex], type: "hint" as const };
    }
    const warnIndex = (feedbackIndex - totalOrientation) % legibilityWarnings.length;
    return { text: legibilityWarnings[warnIndex], type: "warning" as const };
  };

  const feedback = getCurrentFeedback();

  // Handle tap on scan area
  const handleScanTap = () => {
    if (tapCount === 0) {
      // First tap: show "boleto pagado/inválido" swipe alert
      setTapCount(1);
      setShowPaidAlert(true);
    } else if (tapCount === 1) {
      // Second tap: show "can't read" swipe alert → opens manual entry
      setShowPaidAlert(false);
      setTapCount(2);
      setShowCantReadAlert(true);
    } else {
      // Third tap: proceed to checkout
      onDetect();
    }
  };

  // Handle drag on paid alert
  const handleDragStart = (clientY: number) => {
    dragStartY.current = clientY;
  };
  const handleDragMove = (clientY: number) => {
    const diff = clientY - dragStartY.current;
    if (diff > 0) setPaidAlertDrag(diff);
  };
  const handleDragEnd = () => {
    if (paidAlertDrag > 80) {
      // Dismiss if dragged down enough
      setShowPaidAlert(false);
      setPaidAlertDrag(0);
    } else {
      setPaidAlertDrag(0);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCamState("unsupported");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCamState("ready");
      } catch {
        setCamState("denied");
      }
    }
    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-black text-white">
      {/* Live camera — fullscreen, continuous behind UI */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Fallback when camera off — subtle, no harsh blocks */}
      {camState !== "ready" && (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(140%_90%_at_50%_40%,#1f1f1f_0%,#000_75%)]"
        />
      )}

      {/* Gradient top overlay — elegant separation for the header block */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[180px] bg-gradient-to-b from-black/65 via-black/25 to-transparent"
      />

      {/* Subtle blur + dim OUTSIDE the scan frame — clip-path cuts out center */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[6] bg-black/20"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          clipPath: "polygon(0% 0%, 0% 100%, calc(50% - 140px) 100%, calc(50% - 140px) calc(50% - 140px), calc(50% + 140px) calc(50% - 140px), calc(50% + 140px) calc(50% + 140px), calc(50% - 140px) calc(50% + 140px), calc(50% - 140px) 100%, 100% 100%, 100% 0%)",
        }}
      />

      {/* Bottom gradient — anchors the secondary action */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[160px] bg-gradient-to-t from-black/70 via-black/25 to-transparent"
      />

      {/* Header — generous top padding, clear hierarchy */}
      <header className="relative z-20 flex flex-col items-center px-6 pt-[max(calc(env(safe-area-inset-top)+12px),32px)]">
        <KigoWordmark className="h-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" variant="white" />
        <h1
          className="mt-4 text-[24px] font-bold leading-tight tracking-[-0.02em] text-white"
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
        >
          Escanea tu boleto
        </h1>
        <p
          className="mt-1.5 text-[14px] font-medium leading-snug text-white/85"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
        >
          Centra el código dentro del marco
        </p>
      </header>

      {/* Scan guide — corners only, portrait, vertically centered */}
      <ScanCutout />

      {/* Tap-to-simulate detection (invisible) */}
      <button
        aria-label="Simular detección"
        onClick={handleScanTap}
        className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
      >
        <span className="h-[280px] w-[280px] sm:h-[320px] sm:w-[320px]" />
      </button>

      {/* Feedback toast — only gray orientation hints (no red warnings) */}
      {!showPaidAlert && !showCantReadAlert && (
        <div className="pointer-events-none absolute left-1/2 z-30 -translate-x-1/2" style={{ top: "calc(50% + 160px)" }}>
          <div
            key={feedbackIndex}
            className="rounded-full bg-black/50 px-4 py-2 text-center backdrop-blur-md"
          >
            <p className="whitespace-nowrap text-[13px] font-medium text-white/90">
              {feedback.type === "hint" ? feedback.text : feedback.text}
            </p>
          </div>
        </div>
      )}

      {/* Paid/Invalid ticket swipe alert — PROTOTYPE ONLY (1st tap) */}
      {showPaidAlert && (
        <>
          <div className="absolute inset-0 z-[39] bg-black/20 backdrop-blur-[3px]" onClick={() => { setShowPaidAlert(false); setTapCount(1); }} />
          <div className="absolute inset-x-0 bottom-0 z-40">
          <div className="rounded-t-[28px] bg-[#1A1A1A]/95 px-6 pb-[max(env(safe-area-inset-bottom),28px)] pt-8 shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            {/* Icon → Title → Description (centered) */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                <AlertCircle className="size-6 text-white" />
              </div>
              <h3 className="mt-4 text-[18px] font-bold text-white">
                Boleto pagado o inválido
              </h3>
              <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-white/70">
                Asegúrate de leer un boleto válido del lugar donde te encuentras.
              </p>
            </div>
            {/* CTA button */}
            <button
              onClick={() => { setShowPaidAlert(false); setTapCount(1); }}
              className="mt-6 flex h-[50px] w-full items-center justify-center rounded-xl bg-white text-[15px] font-semibold text-[#1A1A1A] transition hover:bg-white/90 active:translate-y-px"
            >
              Reintentar escaneo
            </button>
          </div>
        </div>
        </>
      )}

      {/* Can't read ticket swipe alert — PROTOTYPE ONLY (2nd tap) */}
      {showCantReadAlert && (
        <>
          <div className="absolute inset-0 z-[39] bg-black/20 backdrop-blur-[3px]" onClick={() => { setShowCantReadAlert(false); setTapCount(2); }} />
          <div className="absolute inset-x-0 bottom-0 z-40">
          <div className="rounded-t-[28px] bg-[#1A1A1A]/95 px-6 pb-[max(env(safe-area-inset-bottom),28px)] pt-8 shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            {/* Icon → Title → Description (centered) */}
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-white/10">
                <AlertCircle className="size-6 text-white" />
              </div>
              <h3 className="mt-4 text-[18px] font-bold text-white">
                No fue posible leer el boleto
              </h3>
              <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-white/70">
                Intenta nuevamente enfocando mejor el código, o ingresa los dígitos manualmente.
              </p>
            </div>
            {/* CTA button */}
            <button
              onClick={() => { setShowCantReadAlert(false); setShowManualSwipe(true); }}
              className="mt-6 flex h-[50px] w-full items-center justify-center rounded-xl bg-white text-[15px] font-semibold text-[#1A1A1A] transition hover:bg-white/90 active:translate-y-px"
            >
              Ingresar código manualmente
            </button>
          </div>
        </div>
        </>
      )}

      {/* Permission states */}
      {camState === "denied" && (
        <div className="absolute left-1/2 bottom-32 z-30 w-[80%] -translate-x-1/2 rounded-2xl bg-black/55 p-4 text-center backdrop-blur-md ring-1 ring-white/10">
          <p className="text-[13.5px] font-semibold">Permiso de cámara requerido</p>
          <p className="mt-1 text-[12px] text-white/65">
            Habilita el acceso a la cámara para escanear tu boleto.
          </p>
        </div>
      )}
      {camState === "unsupported" && (
        <div className="absolute left-1/2 bottom-32 z-30 w-[80%] -translate-x-1/2 rounded-2xl bg-black/55 p-4 text-center backdrop-blur-md ring-1 ring-white/10">
          <p className="text-[13.5px] font-semibold">Cámara no disponible</p>
          <p className="mt-1 text-[12px] text-white/65">
            Usa "Ingresar código manualmente" para continuar.
          </p>
        </div>
      )}

      {/* Bottom secondary action — higher contrast for visibility */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-5 pb-[max(env(safe-area-inset-bottom),40px)] pt-10">
        <button
          onClick={() => setShowManualSwipe(true)}
          className="flex w-[280px] items-center justify-center gap-1.5 rounded-full bg-white/12 py-3 text-[14px] font-semibold tracking-[-0.005em] text-white backdrop-blur-sm transition hover:bg-white/20 active:translate-y-px"
        >
          Ingresar código manualmente
          <span aria-hidden className="text-white/90">→</span>
        </button>
      </div>

      {/* Manual code entry swipe — same style as alerts */}
      {showManualSwipe && (
        <>
          <div className="absolute inset-0 z-[39] bg-black/20 backdrop-blur-[3px]" onClick={() => { setShowManualSwipe(false); if (onManualClose) onManualClose(); }} />
          <div className="absolute inset-x-0 bottom-0 z-40">
            <div className="rounded-t-[28px] bg-[#1A1A1A]/95 px-6 pb-[max(env(safe-area-inset-bottom),28px)] pt-8 shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {/* Title + description */}
              <div className="text-center">
                <h3 className="text-[20px] font-bold text-white">
                  Ingresa el código del boleto
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-white/65">
                  Encuentra el código impreso en la parte inferior de tu boleto.
                </p>
              </div>

              {/* Input */}
              <div className="mt-6">
                <label className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/50">
                  Código
                </label>
                <input
                  inputMode="numeric"
                  autoFocus
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
                  placeholder="99988000"
                  className="mt-2 h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 font-mono text-[20px] tracking-[0.18em] text-white placeholder-white/30 outline-none transition focus:border-kigo focus:ring-2 focus:ring-kigo/30"
                />
              </div>

              {/* CTA button */}
              <button
                disabled={!manualCodeValid}
                onClick={() => { setShowManualSwipe(false); onDetect(); }}
                className="mt-6 flex h-[50px] w-full items-center justify-center rounded-xl bg-white text-[15px] font-semibold text-[#1A1A1A] transition hover:bg-white/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScanCutout() {
  // SVG-based scan frame — 4 corner brackets, perfectly centered.
  // Using SVG guarantees pixel-perfect rendering regardless of CSS framework.
  const size = 280;
  const cornerLen = 50;
  const r = 16; // corner radius
  const sw = 3; // stroke width

  return (
    <div className="pointer-events-none fixed inset-0 z-[15] flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-scan-breathe"
        style={{ filter: "drop-shadow(0 0 8px rgba(255,105,0,0.3))" }}
      >
        {/* Top-left */}
        <path
          d={`M ${sw / 2} ${cornerLen} L ${sw / 2} ${r} Q ${sw / 2} ${sw / 2} ${r} ${sw / 2} L ${cornerLen} ${sw / 2}`}
          stroke="rgba(255,255,255,0.92)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {/* Top-right */}
        <path
          d={`M ${size - cornerLen} ${sw / 2} L ${size - r} ${sw / 2} Q ${size - sw / 2} ${sw / 2} ${size - sw / 2} ${r} L ${size - sw / 2} ${cornerLen}`}
          stroke="rgba(255,255,255,0.92)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {/* Bottom-left */}
        <path
          d={`M ${sw / 2} ${size - cornerLen} L ${sw / 2} ${size - r} Q ${sw / 2} ${size - sw / 2} ${r} ${size - sw / 2} L ${cornerLen} ${size - sw / 2}`}
          stroke="rgba(255,255,255,0.92)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {/* Bottom-right */}
        <path
          d={`M ${size - cornerLen} ${size - sw / 2} L ${size - r} ${size - sw / 2} Q ${size - sw / 2} ${size - sw / 2} ${size - sw / 2} ${size - r} L ${size - sw / 2} ${size - cornerLen}`}
          stroke="rgba(255,255,255,0.92)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function KigoWordmark({ className = "h-8", variant = "orange" }: { className?: string; variant?: "orange" | "white" }) {
  if (variant === "white") {
    return <KigoLogoWhite className={className} />;
  }
  return <KigoLogo className={className} />;
}

/* ─────────────────────────  Manual code entry  ───────────────────────── */

function ManualCode({ onBack, onSubmit }: { onBack: () => void; onSubmit: () => void }) {
  const [code, setCode] = useState("");
  const valid = code.replace(/\s/g, "").length >= 6;

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-[max(env(safe-area-inset-top),16px)]">
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          aria-label="Cerrar"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm"
        >
          <X className="size-4 text-foreground" />
        </button>
        <KigoWordmark className="h-12" />
        <div className="w-10" />
      </div>

      <div className="mt-8">
        <h1 className="mt-1 text-[26px] font-semibold leading-[1.15] tracking-tight">
          Ingresa el código del boleto
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Encuentra el código impreso en la parte inferior de tu boleto.
        </p>
      </div>

      <label className="mt-8 block">
        <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Código
        </span>
        <input
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))}
          placeholder="99988000"
          className="mt-2 h-12 w-full rounded-[10px] border-[1.5px] border-border bg-[var(--field)] px-4 font-mono text-[20px] tracking-[0.18em] outline-none transition focus:border-kigo focus:bg-card focus:ring-4 focus:ring-kigo/15"
        />
      </label>

      <div className="mt-auto pb-[max(env(safe-area-inset-bottom),20px)] pt-6">
        <button
          disabled={!valid}
          onClick={onSubmit}
          className="btn-kigo flex h-[50px] w-full items-center justify-center rounded-full px-5 text-[14px] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  Checkout  ───────────────────────── */

function Checkout({
  method, setMethod, onPay, onPayForceError, onBack, isPayLoading, showPayError, onDismissError,
}: {
  method: Method; setMethod: (m: Method) => void; onPay: () => void; onPayForceError: () => void; onBack: () => void; isPayLoading: boolean; showPayError: boolean; onDismissError: () => void;
}) {
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const cardValid = cardNumber.replace(/\s/g, "").length === 16 && expiry.length === 5 && cvv.length >= 3;

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pt-[max(env(safe-area-inset-top),16px)]">
      {/* Header */}
      <div className="flex items-center justify-center pt-2">
        <KigoWordmark className="h-12" />
      </div>

      {/* Total a pagar */}
      <section className="mt-10 text-center">
        <p className="text-[16px] font-semibold text-kigo">Total a pagar</p>
        <p className="mt-3 text-[52px] font-bold leading-none tracking-[-0.03em] text-foreground">
          $75.50
        </p>
      </section>

      {/* Detail card — single card, rows separated by dividers */}
      <section className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[14px] font-semibold text-foreground">Ubicación:</span>
          <span className="text-[14px] text-foreground">Plaza Solesta</span>
        </div>
        <div className="mx-5 h-px bg-border" />
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[14px] font-semibold text-foreground">No. Código:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-foreground">ED99988000SHSAJS</span>
            <button className="text-muted-foreground hover:text-foreground" aria-label="Copiar código">
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mx-5 h-px bg-border" />
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[14px] font-semibold text-foreground">Tiempo de estancia</span>
          <span className="text-[14px] text-foreground">2 h 30 min</span>
        </div>
      </section>

      {/* Payment methods — grouped in a warm-toned card */}
      <section className="mt-6 overflow-hidden rounded-2xl bg-[#FEF5EE] px-5 py-6">
        <p className="mb-5 text-center text-[14px] font-medium text-muted-foreground">
          Selecciona tu método de pago:
        </p>

        {/* Apple Pay */}
        <button
          onClick={() => { setMethod("apple"); setShowCardForm(false); onPay(); }}
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-black text-white transition hover:bg-black/90 active:translate-y-px"
        >
          <ApplePayLogo className="h-5" color="white" />
        </button>

        {/* PayPal */}
        <button
          onClick={() => { setMethod("paypal"); setShowCardForm(false); /* PROTOTYPE: always show error for PayPal */ onPayForceError(); }}
          className="mt-3 flex h-[52px] w-full items-center justify-center rounded-xl bg-[#FFC439] transition hover:bg-[#f5bb30] active:translate-y-px"
        >
          <PayPalLogo className="h-5" />
        </button>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[14px] font-semibold text-muted-foreground">o</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Card option — toggle button */}
        <button
          onClick={() => setShowCardForm(!showCardForm)}
          className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border transition ${showCardForm ? "border-kigo bg-white" : "border-border bg-white hover:bg-muted/50"} active:translate-y-px`}
        >
          <svg className="size-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="3" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <span className="text-[14px] font-medium text-foreground">Tarjeta de crédito o débito</span>
          <svg className={`size-4 text-muted-foreground transition-transform ${showCardForm ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Card form — expands when selected */}
        {showCardForm && (
          <div className="mt-4 space-y-3">
            {/* Card number */}
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Número de tarjeta</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-4 text-[15px] outline-none transition focus:border-kigo focus:ring-2 focus:ring-kigo/15"
              />
            </div>

            {/* Expiry + CVV row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[12px] font-medium text-muted-foreground">Vencimiento</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/AA"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-4 text-[15px] outline-none transition focus:border-kigo focus:ring-2 focus:ring-kigo/15"
                />
              </div>
              <div className="w-[100px]">
                <label className="text-[12px] font-medium text-muted-foreground">CVV</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-4 text-[15px] outline-none transition focus:border-kigo focus:ring-2 focus:ring-kigo/15"
                />
              </div>
            </div>

            {/* Cardholder name */}
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Nombre del titular</label>
              <input
                type="text"
                placeholder="Como aparece en la tarjeta"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-border bg-white px-4 text-[15px] outline-none transition focus:border-kigo focus:ring-2 focus:ring-kigo/15"
              />
            </div>

            {/* Save card toggle */}
            <button
              onClick={() => setSaveCard(!saveCard)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 text-left transition hover:bg-muted/30"
            >
              <div className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${saveCard ? "bg-kigo" : "bg-border"}`}>
                <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${saveCard ? "translate-x-4" : "translate-x-0"}`} />
              </div>
              <span className="text-[13px] font-medium text-foreground">Guardar tarjeta para próxima ocasión</span>
            </button>

            {/* Pay button */}
            <button
              disabled={!cardValid || isPayLoading}
              onClick={() => { setMethod("card-master"); onPay(); }}
              className="btn-pay mt-2 flex h-[52px] w-full items-center justify-center rounded-xl px-5 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {isPayLoading ? (
                <LottieClient src="/src/assets/loading-animation.json" loop className="h-8 w-8" />
              ) : (
                "Pagar $75.50 MXN"
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Pago seguro · cifrado de extremo a extremo
            </p>
          </div>
        )}
      </section>

      {/* Spacer */}
      <div className="mt-auto pb-[max(env(safe-area-inset-bottom),20px)]" />

      {/* Payment error swipe overlay */}
      {showPayError && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[3px]" onClick={onDismissError} />
          <div className="fixed inset-x-0 bottom-0 z-50">
            <div className="rounded-t-[28px] bg-white px-6 pb-[max(env(safe-area-inset-bottom),28px)] pt-8 shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.2)]">
              {/* Icon → Title → Description (centered) */}
              <div className="flex flex-col items-center text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="size-6 text-destructive" />
                </div>
                <h3 className="mt-4 text-[18px] font-bold text-foreground">
                  No pudimos procesar el pago
                </h3>
                <p className="mt-2 max-w-[280px] text-[14px] leading-relaxed text-muted-foreground">
                  Tu banco rechazó la transacción. Verifica el saldo o intenta con otro método de pago.
                </p>
              </div>
              {/* CTA buttons */}
              <button
                onClick={() => { onDismissError(); onPay(); }}
                className="btn-kigo mt-6 flex h-[50px] w-full items-center justify-center rounded-xl px-5 text-[15px] font-semibold"
              >
                Intentar de nuevo
              </button>
              <button
                onClick={onDismissError}
                className="mt-3 flex h-[50px] w-full items-center justify-center rounded-xl border border-border bg-card text-[15px] font-semibold text-foreground transition hover:bg-muted/50 active:translate-y-px"
              >
                Cambiar método de pago
              </button>
              <p className="mt-4 text-center text-[12px] text-muted-foreground">
                No se realizó ningún cargo
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function methodLabel(m: Method) {
  return m === "apple" ? "Apple Pay"
    : m === "paypal" ? "PayPal"
    : m === "card-visa" ? "Visa •••• 0412"
    : "Mastercard •••• 6874";
}
function methodSub(m: Method) {
  return m === "apple" || m === "paypal" ? ""
    : m === "card-master" ? "Predeterminada"
    : "Crédito";
}

function MethodBrand({ method }: { method: Method }) {
  if (method === "card-master") return <MasterBrand />;
  if (method === "card-visa") return <VisaBrand />;
  if (method === "apple")
    return (
      <div className="flex size-10 items-center justify-center rounded-xl bg-foreground/[0.04]">
        <ApplePayLogo className="h-5" />
      </div>
    );
  return (
    <div className="flex size-10 items-center justify-center rounded-xl bg-[#253B80]/[0.06]">
      <PayPalLogo className="h-4" />
    </div>
  );
}

function MethodPicker({
  current, onSelect, onClose,
}: { current: Method; onSelect: (m: Method) => void; onClose: () => void }) {
  const items: { id: Method; label: string; sub: string }[] = [
    { id: "card-master", label: "Mastercard •••• 6874", sub: "Predeterminada" },
    { id: "card-visa", label: "Visa •••• 0412", sub: "Crédito" },
    { id: "apple", label: "Apple Pay", sub: "" },
    { id: "paypal", label: "PayPal", sub: "" },
  ];
  return (
    <div className="absolute inset-0 z-40">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-background pb-[max(env(safe-area-inset-bottom),16px)] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.35)]">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="px-5 pt-3 pb-2">
          <h3 className="text-[16px] font-semibold tracking-tight">Método de pago</h3>
        </div>
        <div className="px-3 pb-3">
          {items.map((it) => {
            const selected = current === it.id;
            return (
              <button
                key={it.id}
                onClick={() => onSelect(it.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${selected ? "bg-kigo-soft/50" : "hover:bg-muted/60"}`}
              >
                <MethodBrand method={it.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold">{it.label}</p>
                  {it.sub && (
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{it.sub}</p>
                  )}
                </div>
                <span className={`flex size-5 items-center justify-center rounded-full border-2 transition ${selected ? "border-kigo bg-kigo" : "border-border bg-card"}`}>
                  {selected && <Check className="size-3 text-kigo-foreground" strokeWidth={3.5} />}
                </span>
              </button>
            );
          })}
          <button className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-muted/60">
            <div className="flex size-10 items-center justify-center rounded-xl border border-dashed border-border text-foreground/60">
              <Plus className="size-4" />
            </div>
            <span className="text-[14px] font-medium">Agregar método de pago</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MasterBrand() {
  return (
    <div className="flex size-10 items-center justify-center rounded-xl bg-foreground/[0.04]">
      <svg viewBox="0 0 32 20" className="h-5 w-8" aria-hidden>
        <circle cx="12" cy="10" r="7" fill="#EB001B" />
        <circle cx="20" cy="10" r="7" fill="#F79E1B" />
        <path d="M16 5.2a7 7 0 0 1 0 9.6 7 7 0 0 1 0-9.6z" fill="#FF5F00" />
      </svg>
    </div>
  );
}
function VisaBrand() {
  return (
    <div className="flex size-10 items-center justify-center rounded-xl bg-[#1A1F71]/8">
      <span className="text-[11px] font-extrabold italic tracking-tight text-[#1A1F71]">VISA</span>
    </div>
  );
}

function Hairline({ indent }: { indent?: boolean }) {
  return <div className={`h-px bg-border ${indent ? "ml-[68px]" : ""}`} />;
}

function PayBar({ onPay }: { onPay: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0">
      <div className="pointer-events-auto bg-gradient-to-t from-background via-background/95 to-background/0 px-5 pt-6 pb-[max(env(safe-area-inset-bottom),20px)]">
        <button
          onClick={onPay}
          className="btn-pay flex h-[50px] w-full items-center justify-center gap-2 rounded-full px-5 text-[14.5px]"
        >
          Pagar $75.50 MXN
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5" /> Pago seguro · cifrado de extremo a extremo
        </p>
      </div>
    </div>
  );
}

/**
 * ConfirmingAnimation — Full-screen Lottie animation shown after successful payment.
 * Plays the "Success 1" animation before transitioning to the detail screen.
 */
function ConfirmingAnimation() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8">
      <LottieClient
        src="/src/assets/success-animation.json"
        loop={false}
        className="h-40 w-40"
      />
    </div>
  );
}

function ErrorView({ onRetry, onBack }: { onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col px-5 pt-5">
      <button onClick={onBack} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 hover:bg-muted" aria-label="Volver">
        <ArrowLeft className="size-5" />
      </button>
      <div className="mt-10 flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-7 text-destructive" />
        </div>
        <h1 className="mt-5 text-[22px] font-semibold tracking-tight">No pudimos procesar el pago</h1>
        <p className="mt-2 max-w-[300px] text-[14px] leading-relaxed text-muted-foreground">
          Tu banco rechazó la transacción. Verifica el saldo o intenta con otro método de pago.
        </p>
      </div>
      <div className="mt-auto space-y-2.5 pb-6">
        <button onClick={onRetry} className="btn-kigo flex h-[50px] w-full items-center justify-center rounded-full px-5 text-[14px]">Intentar de nuevo</button>
        <button onClick={onBack} className="btn-secondary-kigo flex h-[50px] w-full items-center justify-center rounded-full px-5 text-[14px]">Cambiar método de pago</button>
        <p className="pt-2 text-center text-[12px] text-muted-foreground">No se realizó ningún cargo</p>
      </div>
    </div>
  );
}

function Success({ method, onDone }: { method: Method; onDone: () => void }) {
  const methodLabel =
    method === "apple" ? "Apple Pay" :
    method === "paypal" ? "Paypal" :
    method === "card-visa" ? "Visa ·· 0412" : "Mastercard ·· 6874";

  // --- Countdown timer state ---
  // Total exit time: 15 minutes (in production comes from API)
  const TOTAL_SECONDS = 15 * 60;
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [notifyMe, setNotifyMe] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  /**
   * Countdown Animation Documentation:
   * - Timer starts at TOTAL_SECONDS (15 min) and counts down to 0
   * - The elapsed time label on the left shows minutes passed (0 min → 1 min → ... → 15 min)
   * - Progress bar advances from left to right: progress = elapsed / total * 100%
   * - When time reaches 0, "Expira" label turns red (transition to expired screen TBD)
   * - The "Avisarme 5 min antes" toggle enables push notification (handled by backend)
   */
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const elapsedSeconds = TOTAL_SECONDS - secondsLeft;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const progress = (elapsedSeconds / TOTAL_SECONDS) * 100;

  // --- Copy code handler ---
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText("ED99988000SHSAJS");
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = "ED99988000SHSAJS";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  // --- Deeplink detection ---
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const appStoreUrl = "https://apps.apple.com/app/kigo/id1234567890";
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.kigo.app";

  return (
    <div className="relative flex min-h-dvh flex-col bg-background px-5 pt-[max(env(safe-area-inset-top),16px)]">
      {/* Header — logo centered */}
      <div className="flex items-center justify-center pt-4">
        {/* PROTOTYPE ONLY — skip button to advance state */}
        <button
          onClick={() => {
            if (secondsLeft > 0) {
              setSecondsLeft(0); // Jump to expired
            } else {
              onDone(); // Go back to scanner
            }
          }}
          className="absolute left-5 top-[max(env(safe-area-inset-top),16px)] z-50 flex h-8 items-center gap-1 rounded-full border border-dashed border-kigo/40 bg-kigo-soft/50 px-3 text-[11px] font-medium text-kigo"
        >
          {secondsLeft > 0 ? "Expirar ▸" : "Scanner ▸"}
        </button>
        <KigoWordmark className="h-12" />
      </div>

      {/* Success icon + message — evolves when time expires */}
      <div className="mt-8 flex flex-col items-center text-center transition-all duration-700">
        <div className="flex size-14 items-center justify-center rounded-full bg-pay/15">
          <ShieldCheck className="size-7 text-pay" strokeWidth={2.5} />
        </div>
        {secondsLeft > 0 ? (
          <>
            <p className="mt-3 text-[16px] font-semibold text-pay">Pago exitoso</p>
            <h1 className="mt-1 text-[24px] font-bold tracking-tight text-foreground">
              ¡Preparate para salir!
            </h1>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-[22px] font-bold tracking-tight text-pay">
              ¡Gracias por usar Kigo!
            </h1>
          </>
        )}
      </div>

      {/* Countdown timer card — evolves to "Tiempo completado" when expired */}
      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card px-5 py-5 transition-all duration-700">
        {secondsLeft > 0 ? (
          <>
            <p className="text-center text-[14px] font-medium text-muted-foreground">Tiempo restante</p>
            <p className="mt-2 text-center text-[42px] font-bold leading-none tracking-tight text-foreground">
              {String(minutes).padStart(2, "0")} : {String(seconds).padStart(2, "0")}
            </p>
          </>
        ) : (
          <p className="text-center text-[16px] font-semibold text-foreground">Tiempo completado</p>
        )}

        {/* Progress bar */}
        <div className={`${secondsLeft > 0 ? "mt-5" : "mt-4"} flex items-center gap-2`}>
          <span className="text-[11px] font-medium text-muted-foreground">{elapsedMinutes} min</span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-linear ${secondsLeft <= 0 ? "bg-kigo" : "bg-kigo"}`}
              style={{ width: `${progress}%` }}
            />
            {/* Arrow indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-linear"
              style={{ left: `${Math.min(progress, 97)}%` }}
            >
              <div className="flex size-4 -translate-x-1/2 items-center justify-center rounded-full bg-kigo">
                <svg className="size-2.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          <span className={`text-[11px] font-medium ${secondsLeft <= 0 ? "text-kigo" : "text-kigo"}`}>
            Expira
          </span>
        </div>

        {/* Notify toggle — only shows when time is still running */}
        {secondsLeft > 0 && (
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setNotifyMe(!notifyMe)}
              className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${notifyMe ? "bg-pay" : "bg-border"}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${notifyMe ? "translate-x-5" : "translate-x-0"}`} />
            </button>
            <span className="text-[13px] text-foreground">
              <span className="font-semibold">Avisarme</span> 5 min antes de que expire
            </span>
          </div>
        )}
      </section>

      {/* App download banner — actionable with deeplink */}
      <section className="mt-5">
        <a
          href={isIOS ? appStoreUrl : playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden rounded-2xl"
        >
          <img
            src="/src/assets/banner-publicity.png"
            alt="Descarga la app de Kigo"
            className="w-full rounded-2xl"
            draggable={false}
          />
        </a>
      </section>

      {/* Detail card — Ubicación, Folio (con copiar), Tiempo, Método de pago */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[14px] font-semibold text-foreground">Ubicación:</span>
          <span className="text-[14px] text-foreground">Plaza Solesta</span>
        </div>
        <div className="mx-5 h-px bg-border" />
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[14px] font-semibold text-foreground">No. Código:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-foreground">ED99988000SHSAJS</span>
            <button
              onClick={handleCopyCode}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Copiar código"
            >
              {codeCopied ? (
                <Check className="size-4 text-pay" strokeWidth={2.5} />
              ) : (
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="mx-5 h-px bg-border" />
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[14px] font-semibold text-foreground">Tiempo de estancia:</span>
          <span className="text-[14px] text-foreground">2 h 30 min</span>
        </div>
        <div className="mx-5 h-px bg-border" />
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <svg className="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="3" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <span className="text-[14px] font-semibold text-foreground">{methodLabel}</span>
          </div>
          <span className="text-[14px] font-semibold text-foreground">$75.50</span>
        </div>
      </section>

      {/* Bottom spacer */}
      <div className="pb-[max(env(safe-area-inset-bottom),24px)]" />
    </div>
  );
}

function ReceiptRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={`text-[13.5px] font-medium ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
