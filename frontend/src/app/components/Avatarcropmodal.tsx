import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Cropper, { Area } from "react-easy-crop";
import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function getCroppedBlob(
  imageSrc: string,
  croppedAreaPixels: Area,
  outputWidth = 400,
  outputHeight = 400,
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
      "image/jpeg",
      0.92
    );
  });
}

// ─── types ────────────────────────────────────────────────────────────────────

interface AvatarCropModalProps {
  /** Controls visibility */
  open: boolean;
  onClose: () => void;
  /**
   * Called with the cropped Blob after the user saves.
   * Upload it however you want — example uses FormData + fetch.
   */
  onSave?: (blob: Blob) => Promise<void>;
  /** Square output size in px (default 400). Used when outputWidth/outputHeight are not set. */
  outputSize?: number;
  /** Output canvas width in px. Overrides outputSize when provided. */
  outputWidth?: number;
  /** Output canvas height in px. Overrides outputSize when provided. */
  outputHeight?: number;
  /** Crop aspect ratio. Default 1 (square). Pass e.g. 1400/400 for banner crops. */
  aspect?: number;
  /** Pre-load this image URL on open. When provided, file-picker step is skipped. */
  imageSrc?: string;
  /** Crop shape: "round" shows a circle overlay, "rect" shows a square */
  cropShape?: "round" | "rect";
}

// ─── component ────────────────────────────────────────────────────────────────

export default function AvatarCropModal({
  open,
  onClose,
  onSave,
  outputSize = 400,
  outputWidth,
  outputHeight,
  aspect = 1,
  imageSrc: externalImageSrc,
  cropShape = "round",
}: AvatarCropModalProps) {
  const { t } = useTranslation();
  const [imageSrc, setImageSrc] = useState<string | null>(externalImageSrc ?? null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (!externalImageSrc) {
      setImageSrc(null);
      return;
    }
    // Fetch once as blob → same-origin blob URL avoids canvas CORS taint
    let blobUrl: string | null = null;
    fetch(externalImageSrc)
      .then((res) => res.blob())
      .then((blob) => {
        blobUrl = URL.createObjectURL(blob);
        setImageSrc(blobUrl);
      })
      .catch(() => setSaveError(t("userProfile.avatarCrop.saveError")));
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, externalImageSrc, t]);

  // ── file input ──────────────────────────────────────────────────────────────
  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSaveError(null);
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
      // reset crop state when a new image is picked
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    },
    []
  );

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  // ── save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaveError(null);
    try {
      setSaving(true);
      const w = outputWidth ?? outputSize;
      const h = outputHeight ?? outputSize;
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, w, h);

      if (onSave) {
        await onSave(blob);
      } else {
        // default: POST FormData to /api/avatar
        const formData = new FormData();
        formData.append("avatar", blob, "avatar.jpg");
        const res = await fetch("/api/avatar", { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
      }

      onClose();
    } catch (err) {
      console.error(err);
      setSaveError(t("userProfile.avatarCrop.saveError"));
    } finally {
      setSaving(false);
    }
  }, [imageSrc, croppedAreaPixels, outputSize, outputWidth, outputHeight, onSave, onClose, t]);

  // ── reset on close ──────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setImageSrc(externalImageSrc ?? null);
    setSaveError(null);
    onClose();
  }, [onClose, externalImageSrc]);

  if (!open) return null;

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`w-full ${aspect > 1 ? "max-w-2xl" : "max-w-sm"} rounded-xl border border-border bg-card text-card-foreground shadow-xl`}>
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-medium text-foreground">
            {t("userProfile.avatarCrop.title")}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("userProfile.avatarCrop.close")}
          >
            ✕
          </button>
        </div>

        {/* crop area or empty state */}
        <div className="p-5">
          {imageSrc ? (
            <>
              <div
                className="relative w-full overflow-hidden rounded-xl bg-muted"
                style={{ aspectRatio: String(aspect), minHeight: 200 }}
              >
                {/* @ts-expect-error react-easy-crop Cropper types are class-based and incompatible with React 18 JSX */}
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  cropShape={cropShape}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-muted-foreground">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M4.5 6.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="range"
                  className="flex-1 accent-primary"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
                <span className="text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M4.5 6.5h4M6.5 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
              </div>
            </>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg className="text-muted-foreground" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M3 13l4-4 3 3 4-5 3 6H3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="1.5" y="1.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {t("userProfile.avatarCrop.uploadImage")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("userProfile.avatarCrop.fileHint")}
                </p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </label>
          )}
          {saveError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* footer */}
        <div className="flex gap-2 border-t border-border px-5 py-4">
          {imageSrc && !externalImageSrc && (
            <label className="flex-1 cursor-pointer">
              <span className="block w-full rounded-lg border border-input bg-background px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                {t("userProfile.avatarCrop.changeImage")}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            </label>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={!imageSrc || saving}
            className="flex-1 min-h-[44px]"
          >
            {saving ? t("userProfile.avatarCrop.saving") : t("userProfile.avatarCrop.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}