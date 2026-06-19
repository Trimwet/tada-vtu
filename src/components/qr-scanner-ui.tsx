"use client";

import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { IonIcon } from "@/components/ion-icon";
import { Button } from "@/components/ui/button";

interface QRScannerUIProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QRScannerUI({ onScan, onClose }: QRScannerUIProps) {
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 h-20 px-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white"
        >
          <IonIcon name="close-outline" size="24px" />
        </button>
        <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
          <IonIcon name="ellipsis-horizontal" size="20px" />
        </button>
      </div>

      {/* Viewport Overlay */}
      <div className="relative w-full aspect-square max-w-[280px]">
        {/* Scanner Component */}
        <div className="absolute inset-0 rounded-[4px] overflow-hidden border border-white/20">
          <Scanner
            onScan={(result) => {
              if (result?.[0]?.rawValue) {
                onScan(result[0].rawValue);
              }
            }}
            allowMultiple={false}
            paused={false}
            constraints={{
              facingMode: isFrontCamera ? "user" : "environment"
            }}
            components={{
              torch: isTorchOn,
              finder: false
            }}
            styles={{
              container: { width: '100%', height: '100%' },
              video: { width: '100%', height: '100%', objectFit: 'cover' }
            }}
          />
        </div>

        {/* Corner Brackets - Industrial Style */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Top Left */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-[2px]" />
          {/* Top Right */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-[2px]" />
          {/* Bottom Left */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-[2px]" />
          {/* Bottom Right */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-[2px]" />
        </div>

        {/* Scanning Line Animation */}
        <div className="absolute top-0 left-2 right-2 h-px bg-white/60 blur-[0.5px] animate-[scan_2.5s_ease-in-out_infinite] z-30" />
      </div>

      {/* Actions */}
      <div className="absolute bottom-12 inset-x-0 flex flex-col items-center gap-10 z-10 px-6">
        <Button 
          variant="outline" 
          className="bg-white/5 border-white/20 text-white backdrop-blur-md px-6 h-10 rounded-[4px] hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all"
          onClick={() => {}}
        >
          <IonIcon name="image" size="16px" className="mr-2" />
          Choose image
        </Button>

        <div className="flex items-center gap-16">
          <div className="flex flex-col items-center gap-2.5">
            <button 
              onClick={() => setIsTorchOn(!isTorchOn)}
              className={`w-12 h-12 border rounded-[4px] flex items-center justify-center transition-all ${
                isTorchOn ? 'bg-white text-black border-white' : 'bg-black/40 text-white border-white/20 backdrop-blur-md'
              }`}
            >
              <IonIcon name={isTorchOn ? "flashlight" : "flashlight-outline"} size="22px" />
            </button>
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">Flashlight</span>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            <button 
              onClick={() => setIsFrontCamera(!isFrontCamera)}
              className="w-12 h-12 border border-white/20 bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-white/10 transition-all rounded-[4px]"
            >
              <IonIcon name="camera-reverse" size="24px" />
            </button>
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-widest">Flip Camera</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0%, 100% { top: 5%; }
          50% { top: 95%; }
        }
      `}</style>
    </div>
  );
}
