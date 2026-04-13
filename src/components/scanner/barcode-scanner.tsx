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
  const mountedRef = useRef(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    mountedRef.current = true

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode")

        // Check if still mounted after dynamic import
        if (!mountedRef.current) return

        const containerId = "scanner-container"
        // Make sure DOM element exists
        if (!document.getElementById(containerId)) return

        const scanner = new Html5Qrcode(containerId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            if (mountedRef.current) onScan(decodedText)
          },
          () => {}
        )
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err?.message || "無法存取相機")
        }
      }
    }

    initScanner()

    return () => {
      mountedRef.current = false
      const scanner = scannerRef.current
      if (scanner) {
        try {
          const state = scanner.getState?.()
          // Only stop if scanner is actually running (state 2 = SCANNING)
          if (state === 2) {
            scanner.stop().catch(() => {})
          }
        } catch {
          // Scanner may already be destroyed
        }
        scannerRef.current = null
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
