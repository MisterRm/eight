import { useEffect, useRef } from "react";

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire: () => void;
  resetSignal?: number;
}

export default function TurnstileWidget({ siteKey, onVerify, onExpire, resetSignal }: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const load = () => {
      if (!ref.current || !(window as any).turnstile) return;
      if (widgetId.current) {
        (window as any).turnstile.remove(widgetId.current);
      }
      widgetId.current = (window as any).turnstile.render(ref.current, {
        sitekey: siteKey,
        callback: onVerify,
        "expired-callback": onExpire,
        theme: "dark",
      });
    };

    if ((window as any).turnstile) {
      load();
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = load;
      document.head.appendChild(script);
    }

    return () => {
      if (widgetId.current) {
        (window as any).turnstile?.remove(widgetId.current);
      }
    };
  }, [siteKey, resetSignal]);

  return <div ref={ref} className="mt-1" />;
}
