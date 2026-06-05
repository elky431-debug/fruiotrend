"use client";

import { useId, useRef, useState } from "react";
import {
  filterImageFiles,
  processProductImageFile,
} from "@/lib/processProductImage";

export type ScreenshotAsset = {
  base64: string;
  mimeType: string;
  url: string;
};

interface Props {
  screenshots: ScreenshotAsset[];
  onChange: (imgs: ScreenshotAsset[]) => void;
  maxFiles?: number;
}

export default function ScreenshotUploader({
  screenshots,
  onChange,
  maxFiles = 3,
}: Props) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const listRef = useRef(screenshots);

  listRef.current = screenshots;

  const canAdd = !uploading && screenshots.length < maxFiles;

  const addFiles = async (fileList: FileList | File[]) => {
    const files = filterImageFiles(fileList);
    if (files.length === 0) {
      setError("Aucune image reconnue (JPG/PNG).");
      return;
    }
    setUploading(true);
    setError(null);
    const next = [...listRef.current];

    for (const file of files) {
      if (next.length >= maxFiles) break;
      try {
        const { base64, mimeType, previewUrl } =
          await processProductImageFile(file);
        next.push({ base64, mimeType, url: previewUrl });
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Impossible d'ajouter l'image."
        );
        break;
      }
    }
    onChange(next);
    setUploading(false);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (canAdd) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (canAdd && e.dataTransfer.files?.length) {
            void addFiles(e.dataTransfer.files);
          }
        }}
        style={{
          display: "block",
          padding: 20,
          borderRadius: 12,
          border: `1px dashed ${dragOver ? "#E8313A" : "rgba(255,255,255,0.15)"}`,
          background: dragOver ? "rgba(232,49,58,0.08)" : "rgba(255,255,255,0.03)",
          textAlign: "center",
          cursor: canAdd ? "pointer" : "not-allowed",
          opacity: canAdd ? 1 : 0.6,
        }}
      >
        <span style={{ fontSize: 24 }}>{uploading ? "⏳" : "📸"}</span>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: "8px 0 0" }}>
          {uploading
            ? "Traitement…"
            : `Glisse ou clique (${screenshots.length}/${maxFiles})`}
        </p>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: "none" }}
        disabled={!canAdd}
        onChange={(e) => {
          if (e.target.files?.length) {
            void addFiles(e.target.files).finally(() => {
              e.target.value = "";
            });
          }
        }}
      />

      {error && (
        <p style={{ color: "#ff8fa3", fontSize: 12, marginTop: 8 }}>{error}</p>
      )}

      {screenshots.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 12,
          }}
        >
          {screenshots.map((s, i) => (
            <div key={s.url} style={{ position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt=""
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
              <button
                type="button"
                onClick={() => onChange(screenshots.filter((_, j) => j !== i))}
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  border: "none",
                  background: "#E8313A",
                  color: "#fff",
                  fontSize: 11,
                  cursor: "pointer",
                }}
                aria-label="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
