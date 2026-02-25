import { useState, useRef } from "react";

const isMobile = /iPhone|iPad|iPod|Android/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "");

export default function UploadArea({ onImageLoad, brandColor, uploadLabel }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다 (JPG, PNG)");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("파일 크기가 50MB를 초과합니다");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (file.size === 0) {
      setError("빈 파일입니다");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onerror = () => {
      setError("파일을 읽을 수 없습니다");
      setTimeout(() => setError(null), 3000);
    };
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        setError("이미지를 로드할 수 없습니다. 손상된 파일일 수 있습니다.");
        setTimeout(() => setError(null), 3000);
      };
      img.onload = () => {
        const maxSize = 800;
        let w = img.width;
        let h = img.height;
        if (w === 0 || h === 0) {
          setError("유효하지 않은 이미지입니다");
          setTimeout(() => setError(null), 3000);
          return;
        }
        if (w > maxSize || h > maxSize) {
          const scale = maxSize / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const resizedImg = new Image();
        resizedImg.onload = () => onImageLoad(resizedImg, w, h);
        resizedImg.src = canvas.toDataURL("image/png");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        style={{
          width: "100%", padding: "60px 40px",
          border: `2px dashed ${isDragOver ? brandColor : "rgba(255,255,255,0.15)"}`,
          borderRadius: 16, cursor: "pointer", textAlign: "center",
          background: isDragOver ? `${brandColor}10` : "rgba(255,255,255,0.02)",
          transition: "all 0.2s ease",
        }}
      >
        <div className="upload-pulse-wrapper" style={{ marginBottom: 16 }}>
          <div className="upload-pulse-ring" />
          <div style={{ fontSize: 48 }}>📸</div>
        </div>
        <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {uploadLabel || "사진을 드래그하거나 클릭하여 업로드"}
        </p>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
          JPG, PNG 지원 (최대 50MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
        />
      </div>

      {/* Mobile camera button */}
      {isMobile && (
        <button
          onClick={() => cameraRef.current?.click()}
          style={{
            padding: "14px 20px", borderRadius: 12, border: "none", cursor: "pointer",
            background: `${brandColor}22`, color: brandColor,
            fontSize: 14, fontWeight: 600,
            outline: `1.5px solid ${brandColor}40`,
          }}
        >
          📷 카메라로 촬영
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => { handleFile(e.target.files[0]); e.target.value = ""; }}
          />
        </button>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.2)",
          color: "#FF3B5C", fontSize: 12, textAlign: "center",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
