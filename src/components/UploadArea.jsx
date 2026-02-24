import { useState, useRef } from "react";

export default function UploadArea({ onImageLoad, brandColor }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 800;
        let w = img.width;
        let h = img.height;
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
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFile(e.dataTransfer.files[0]); }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      style={{
        width: "100%", maxWidth: 480, padding: "60px 40px",
        border: `2px dashed ${isDragOver ? brandColor : "rgba(255,255,255,0.15)"}`,
        borderRadius: 16, cursor: "pointer", textAlign: "center",
        background: isDragOver ? `${brandColor}10` : "rgba(255,255,255,0.02)",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
      <p style={{ color: "#fff", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        사진을 드래그하거나 클릭하여 업로드
      </p>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
        JPG, PNG 지원
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
