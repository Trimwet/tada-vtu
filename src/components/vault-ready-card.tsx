"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { IonIcon } from "@/components/ion-icon";
import { VaultQRModal } from "@/components/vault-qr-modal";
import { toast } from "@/lib/toast";
import confetti from "canvas-confetti";

// ── Helpers ───────────────────────────────────────────────────────────────

function getExpiryInfo(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { label: "Expired", color: "text-red-500", urgent: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days === 0 && hours < 6) return { label: `${hours}h left`, color: "text-red-500", urgent: true };
  if (days <= 1) return { label: `${hours}h left`, color: "text-amber-500", urgent: true };
  if (days <= 3) return { label: `${days}d ${hours}h left`, color: "text-amber-500", urgent: false };
  return { label: `${days}d left`, color: "text-muted-foreground", urgent: false };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-NG", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Timeline ──────────────────────────────────────────────────────────────

function VaultTimeline({ vault }: { vault: any }) {
  const steps = [
    {
      label: "ENTRY LOGGED",
      sub: "Parked in vault",
      time: vault.purchased_at,
      icon: "archive",
      color: "#16a34a",
      done: true,
    },
    {
      label: vault.status === "delivered"
        ? "DELIVERY COMPLETE"
        : vault.status === "expired"
        ? "CYCLE EXPIRED"
        : "AWAITING EXECUTION",
      sub: vault.status === "delivered"
        ? `Delivered to ${vault.recipient_phone}`
        : vault.status === "expired"
        ? "Automatic refund issued"
        : "In queue for delivery",
      time: vault.delivered_at || (vault.status === "expired" ? vault.expires_at : null),
      icon: vault.status === "delivered" ? "checkmark-circle" : vault.status === "expired" ? "time" : "hourglass",
      color: vault.status === "delivered" ? "#2563eb" : vault.status === "expired" ? "#d97706" : "#64748b",
      done: vault.status !== "ready",
    },
  ];

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-border/40" />
        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest px-2">Audit Logs</p>
        <div className="h-px flex-1 bg-border/40" />
      </div>
      <div className="space-y-5 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border/40">
        {steps.map((step, i) => (
          <div key={i} className="relative flex gap-4">
            <div
              className={`relative z-10 w-6 h-6 border rounded-[2px] flex items-center justify-center shrink-0 shadow-sm ${step.done ? "bg-card" : "bg-muted"}`}
              style={{ borderColor: step.done ? step.color + "30" : "transparent" }}
            >
              <IonIcon name={step.icon} size="11px" color={step.done ? step.color : "#64748b"} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <p className={`text-xs font-semibold tracking-tight ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
                {step.time && (
                  <p className="text-[10px] font-mono font-medium text-muted-foreground/70">{fmtDate(step.time).toUpperCase()}</p>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed font-medium">{step.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Single Vault Card ─────────────────────────────────────────────────────

interface VaultCardProps {
  item: any;
  tab: "ready" | "delivered" | "expired";
  isDelivering: string | null;
  isRefunding: string | null;
  onDeliver: (id: string) => void;
  onRefund: (id: string) => void;
  onDownloadReceipt: (id: string) => void;
  onQR: (item: any) => void;
}

function VaultCard({ item, tab, isDelivering, isRefunding, onDeliver, onRefund, onDownloadReceipt, onQR }: VaultCardProps) {
  const [expandedTimeline, setExpandedTimeline] = useState(false);
  const expiry = tab === "ready" ? getExpiryInfo(item.expires_at) : null;

  const accentColor =
    tab === "ready" ? "#16a34a" :
    tab === "delivered" ? "#2563eb" : "#d97706";

  const iconBg =
    tab === "ready" ? "bg-green-600/10 border-green-600/20" :
    tab === "delivered" ? "bg-blue-600/10 border-blue-600/20" :
    "bg-amber-600/10 border-amber-600/20";

  return (
    <div
      className={`group relative overflow-hidden border transition-all duration-200 rounded-[4px] ${
        expiry?.urgent
          ? "border-amber-500/40 bg-amber-500/[0.02]"
          : "border-border bg-card/30 hover:bg-card/50 hover:border-green-600/50"
      }`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-3 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity pointer-events-none select-none font-mono text-[60px] leading-none font-black italic">
        VAULT
      </div>

      <div className="relative z-10 p-4 sm:p-5">
        {/* Top Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 flex items-center justify-center shrink-0 border rounded-[4px] ${iconBg}`}>
              <IonIcon name="wifi" size="20px" color={accentColor} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight mb-1">
                {item.network} {item.plan_name}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {item.network}
                </span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">{item.recipient_phone}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 bg-muted/20 sm:bg-transparent px-2 py-1 sm:p-0 rounded-[4px] border border-border/50 sm:border-0">
            <p className="text-xl font-bold text-foreground leading-none tracking-tight">₦{item.amount.toLocaleString()}</p>
            <span className="text-[9px] font-semibold text-green-600 uppercase tracking-widest mt-1">Value</span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50 mb-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Date Parked</p>
            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
              <IonIcon name="calendar" size="14px" className="text-muted-foreground" />
              {fmtDate(item.purchased_at)}
            </div>
          </div>
          <div className="space-y-1 text-right sm:text-left">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Expiration</p>
            {expiry ? (
              <div className={`flex items-center justify-end sm:justify-start gap-1.5 text-xs font-medium ${expiry.color}`}>
                <IonIcon name="time" size="14px" />
                {expiry.label}
              </div>
            ) : (
              <div className="flex items-center justify-end sm:justify-start gap-1.5 text-xs font-medium text-green-600">
                <IonIcon name="checkmark-circle" size="14px" />
                {tab === "delivered" ? "Delivered" : "Expired"}
              </div>
            )}
          </div>
        </div>

        {/* Journey Toggle */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => setExpandedTimeline(!expandedTimeline)}
            className="group/btn text-[10px] font-black text-muted-foreground hover:text-green-600 flex items-center gap-2 transition-all border border-border hover:border-green-600/30 px-3 py-2 rounded-[4px] bg-muted/10 uppercase tracking-widest"
          >
            <IonIcon name={expandedTimeline ? "caret-up" : "caret-down"} size="14px" />
            {expandedTimeline ? "Collapse Logs" : "Inspect Journey"}
          </button>
          {expandedTimeline && (
            <div className="mt-3 p-4 bg-black/20 rounded-[4px] border border-border/50 animate-in fade-in slide-in-from-top-1">
              <VaultTimeline vault={item} />
            </div>
          )}
        </div>

        {/* Actions */}
        {tab === "ready" && (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => onQR(item)}
                className="gap-2 h-11 rounded-lg text-sm font-semibold border-border hover:border-green-500/50 hover:bg-green-50/10 transition-all active:scale-95"
              >
                <IonIcon name="qr-code" size="18px" className="text-green-500" />
                QR Code
              </Button>
              <Button
                onClick={() => onDeliver(item.id)}
                disabled={isDelivering === item.id || isRefunding === item.id}
                className="gap-2 h-11 rounded-lg text-sm font-bold bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20 transition-all active:scale-95"
              >
                {isDelivering === item.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <IonIcon name="send" size="18px" />
                    Send Now
                  </>
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => onRefund(item.id)}
              disabled={isDelivering === item.id || isRefunding === item.id}
              className="gap-2 h-11 rounded-lg text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50/10 transition-all"
            >
              {isRefunding === item.id ? (
                <>
                  <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  Refunding...
                </>
              ) : (
                <>
                  <IonIcon name="refresh" size="16px" />
                  Refund to Wallet
                </>
              )}
            </Button>
          </div>
        )}

        {tab === "delivered" && (
          <Button
            variant="outline"
            onClick={() => onDownloadReceipt(item.id)}
            className="gap-2 h-11 w-full rounded-lg text-sm font-semibold border-border hover:border-green-500/50 transition-all"
          >
            <IonIcon name="receipt" size="18px" className="text-green-500" />
            Download Receipt
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Carousel with Navigation Indicators ──────────────────────────────────

interface VaultCarouselProps {
  items: any[];
  tab: "ready" | "delivered" | "expired";
  isDelivering: string | null;
  isRefunding: string | null;
  onDeliver: (id: string) => void;
  onRefund: (id: string) => void;
  onDownloadReceipt: (id: string) => void;
}

export function VaultCarousel({
  items,
  tab,
  isDelivering,
  isRefunding,
  onDeliver,
  onRefund,
  onDownloadReceipt,
}: VaultCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [selectedVault, setSelectedVault] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = items.length;

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, total - 1));
    setCurrent(clamped);
    const el = containerRef.current?.children[clamped] as HTMLElement;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [total]);

  const handleDeliver = async (id: string) => {
    onDeliver(id);
  };

  const handleRefund = async (id: string) => {
    onRefund(id);
  };

  if (total === 0) return null;

  return (
    <div className="space-y-4">
      {/* Cards scroll container */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const cardWidth = el.scrollWidth / total;
          const idx = Math.round(el.scrollLeft / cardWidth);
          setCurrent(idx);
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="snap-center shrink-0 w-full"
          >
            <VaultCard
              item={item}
              tab={tab}
              isDelivering={isDelivering}
              isRefunding={isRefunding}
              onDeliver={handleDeliver}
              onRefund={handleRefund}
              onDownloadReceipt={onDownloadReceipt}
              onQR={(v) => { setSelectedVault(v); setShowQRModal(true); }}
            />
          </div>
        ))}
      </div>

      {/* Navigation indicators — only show when more than 1 card */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-3">
          {/* Prev arrow */}
          <button
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] border border-border bg-muted/30 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <IonIcon name="chevron-back" size="14px" className="text-muted-foreground" />
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`transition-all duration-200 rounded-full ${
                  i === current
                    ? "w-5 h-2 bg-green-500"
                    : "w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          {/* Next arrow */}
          <button
            onClick={() => goTo(current + 1)}
            disabled={current === total - 1}
            className="w-7 h-7 flex items-center justify-center rounded-[4px] border border-border bg-muted/30 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <IonIcon name="chevron-forward" size="14px" className="text-muted-foreground" />
          </button>

          {/* Counter */}
          <span className="text-[10px] font-mono font-semibold text-muted-foreground/60 ml-1">
            {current + 1}/{total}
          </span>
        </div>
      )}

      {selectedVault && (
        <VaultQRModal
          isOpen={showQRModal}
          onClose={() => { setShowQRModal(false); setSelectedVault(null); }}
          vault={selectedVault}
        />
      )}
    </div>
  );
}
