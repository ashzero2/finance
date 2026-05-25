"use client";

import { useState, useRef } from "react";
import { Icon } from "./icon";
import { Button } from "./button";

interface ImportResult {
  imported: number;
  total: number;
  errors?: string[];
}

export function CSVImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.imported > 0) onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Import failed");
      }
    } catch {
      setError("Network error");
    }
    setUploading(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
        width: "100%", maxWidth: 420, padding: 28,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Import Transactions</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-tertiary)", padding: 4 }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {!result ? (
          <>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16, lineHeight: 1.6 }}>
              Upload a CSV file with columns like: <span style={{ color: "var(--text-secondary)" }}>date, description, amount, type</span>.
              The importer will try to auto-detect column names.
            </p>

            {/* File picker */}
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            <div
              onClick={() => inputRef.current?.click()}
              style={{
                border: "2px dashed var(--border)", borderRadius: "var(--radius-md)",
                padding: "28px 20px", textAlign: "center", cursor: "pointer",
                background: file ? "var(--bg-elevated)" : "transparent",
                marginBottom: 16,
              }}
            >
              {file ? (
                <div>
                  <Icon name="check" size={20} color="var(--positive)" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </div>
                </div>
              ) : (
                <div>
                  <Icon name="upload" size={24} color="var(--text-tertiary)" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>Click to select a CSV file</div>
                </div>
              )}
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--negative-dim)", color: "var(--negative)", fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <Button onClick={handleUpload} disabled={!file || uploading} style={{ width: "100%" }}>
              {uploading ? "Importing..." : "Import"}
            </Button>
          </>
        ) : (
          <>
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <Icon name="check" size={40} color="var(--positive)" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                {result.imported} of {result.total} imported
              </div>
              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: 12, textAlign: "left" }}>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Issues:</div>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: "var(--warning)", marginBottom: 2 }}>{e}</div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={onClose} style={{ width: "100%", marginTop: 12 }}>Done</Button>
          </>
        )}
      </div>
    </div>
  );
}