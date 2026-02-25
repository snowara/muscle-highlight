import { useState, useRef } from "react";

export default function UploadArea({ onFileSelected, isLoading }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDragEnter(e) {
    handleDrag(e);
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    handleDrag(e);
    setIsDragging(false);
  }

  function handleDrop(e) {
    handleDrag(e);
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function processFile(file) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) return;
    if (file.size > 50 * 1024 * 1024) return; // 50MB 제한
    onFileSelected(file, isImage ? "image" : "video");
  }

  if (isLoading) {
    return (
      <div className="upload-area upload-loading">
        <div className="spinner" />
        <p className="upload-loading-text">AI 포즈 분석 중...</p>
        <p className="upload-sub">MediaPipe BlazePose 로딩</p>
      </div>
    );
  }

  return (
    <div
      className={`upload-area ${isDragging ? "dragging" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDrag}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={handleChange}
        hidden
      />
      <div className="upload-icon">📸</div>
      <p className="upload-title">사진 또는 영상을 업로드하세요</p>
      <p className="upload-sub">드래그 & 드롭 또는 클릭 · JPG, PNG, MP4</p>
      <div className="upload-badges">
        <span className="badge badge-blue">사진 분석</span>
        <span className="badge badge-purple">영상 분석</span>
      </div>
    </div>
  );
}
