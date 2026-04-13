"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, X } from "lucide-react"

interface Props {
  onScan: (code: string) => void
  onClose?: () => void
}

export function BarcodeScanner({ onScan, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let scanner: any = null

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")
        const containerId = "scanner-container"
        scanner = new Html5Qrcode(containerId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            onScan(decodedText)
          },
          () => {} // ignore errors during scanning
        )
      } catch (err: any) {
        setError(err?.message || "無法存取相機")
      }
    }

    initScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="relative">
      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>
      )}
      <div
        id="scanner-container"
        ref={containerRef}
        className="w-full max-w-md mx-auto rounded-lg overflow-hidden"
      />
      {error && (
        <div className="text-center py-8 space-y-3">
          <Camera className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">請確認已授權相機存取權限</p>
        </div>
      )}
    </div>
  )
}
