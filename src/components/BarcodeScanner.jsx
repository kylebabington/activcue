// src/components/BarcodeScanner.jsx

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import Modal from "./Modal";

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

function supportsNativeBarcodeDetector() {
  return (
    typeof window !== "undefined" &&
    typeof window.BarcodeDetector === "function"
  );
}

export default function BarcodeScanner({ isOpen, onClose, onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const zxingControlsRef = useRef(null);
  const rafRef = useRef(null);
  const handledRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  function stopCamera() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {
        // ignore stop errors
      }
      zxingControlsRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function emitDetected(rawCode) {
    const code = String(rawCode || "").replace(/\D/g, "");
    if (!/^\d{8,14}$/.test(code) || handledRef.current) {
      return;
    }

    handledRef.current = true;
    stopCamera();
    onDetected(code);
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    handledRef.current = false;
    setErrorMessage("");
    setManualCode("");
    setIsStarting(true);

    let cancelled = false;

    async function startNativeDetector() {
      let detector;
      try {
        detector = new window.BarcodeDetector({
          formats: NATIVE_FORMATS,
        });
      } catch {
        detector = new window.BarcodeDetector();
      }

      const video = videoRef.current;

      async function tick() {
        if (cancelled || handledRef.current || !video) {
          return;
        }

        if (video.readyState >= 2) {
          try {
            const barcodes = await detector.detect(video);
            const first = barcodes?.[0];
            if (first?.rawValue) {
              emitDetected(first.rawValue);
              return;
            }
          } catch {
            // Keep scanning; occasional detect failures are normal.
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    async function startZxingFallback() {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _error, controlsFromCallback) => {
          if (controlsFromCallback && !zxingControlsRef.current) {
            zxingControlsRef.current = controlsFromCallback;
          }

          if (result?.getText) {
            emitDetected(result.getText());
          }
        }
      );

      zxingControlsRef.current = controls;
    }

    async function startScanner() {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setErrorMessage(
          "Camera scanning is not supported in this browser. Enter the barcode digits below."
        );
        setIsStarting(false);
        return;
      }

      try {
        if (supportsNativeBarcodeDetector()) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: "environment" },
            },
          });

          if (cancelled) {
            for (const track of stream.getTracks()) {
              track.stop();
            }
            return;
          }

          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }

          await startNativeDetector();
        } else {
          await startZxingFallback();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        const denied =
          error?.name === "NotAllowedError" ||
          error?.name === "PermissionDeniedError";

        setErrorMessage(
          denied
            ? "Camera permission was denied. Enter the barcode digits below, or allow camera access and try again."
            : "Could not start the camera. Enter the barcode digits below."
        );
      } finally {
        if (!cancelled) {
          setIsStarting(false);
        }
      }
    }

    startScanner();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // emitDetected closes over onDetected; remount when modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function handleManualSubmit(event) {
    event.preventDefault();
    emitDetected(manualCode);
  }

  return (
    <Modal
      title="Scan barcode"
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      fullPage
    >
      <div className="barcode-scanner">
        <div className="barcode-scanner-viewport">
          <video
            ref={videoRef}
            className="barcode-scanner-video"
            muted
            playsInline
            autoPlay
          />
          {isStarting ? (
            <p className="barcode-scanner-status">Starting camera…</p>
          ) : null}
        </div>

        <p className="barcode-scanner-hint">
          Point your camera at a UPC or EAN barcode on the toy box.
        </p>

        <p className="barcode-scanner-notice" role="note">
          This feature is in testing. Lookups share a free daily limit — if a
          match is unavailable, enter the toy name on the next screen.
        </p>

        {errorMessage ? (
          <p className="barcode-scanner-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <form className="barcode-manual-form" onSubmit={handleManualSubmit}>
          <label htmlFor="barcode-manual-input">Or enter barcode digits</label>
          <div className="barcode-manual-row">
            <input
              id="barcode-manual-input"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={manualCode}
              onChange={(event) =>
                setManualCode(event.target.value.replace(/\D/g, ""))
              }
              placeholder="e.g. 088590950367"
            />
            <button type="submit" className="secondary-action">
              Look up
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
