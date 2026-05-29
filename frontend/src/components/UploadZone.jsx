import React, { useState, useRef } from 'react';

/**
 * UploadZone Component
 * @param {Object} props
 * @param {Function} props.onSubmit - Callback function triggered when 'Analyze Image' is clicked
 * @param {Function} [props.onReset] - Optional callback triggered when resetting the selection
 */
export default function UploadZone({ onSubmit, onReset }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  // Constants for validation
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const MAX_SIZE_MB = 20;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  // Handle Drag Over/Enter
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Validate file types and size
  const validateFile = (file) => {
    setErrorMsg('');
    
    if (!file) return false;

    // Type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload a PNG, JPG, or WEBP image.');
      return false;
    }

    // Size validation
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMsg(`File is too large. Max size allowed is ${MAX_SIZE_MB}MB.`);
      return false;
    }

    return true;
  };

  // Process selected file and load preview with FileReader
  const processFile = (file) => {
    if (!validateFile(file)) {
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }

    setSelectedFile(file);
    
    // Generate image preview using FileReader
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.onerror = () => {
      setErrorMsg('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  // Handle File Drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Handle File browse selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Clear states
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setErrorMsg('');
    if (onReset) onReset();
  };

  // Trigger Submit
  const handleSubmit = () => {
    if (selectedFile && onSubmit) {
      onSubmit(selectedFile);
    }
  };

  // Human-readable size converter
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="upload-zone-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Upload Zone & Drop Area */}
      {!selectedFile ? (
        <div 
          className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            style={{ display: 'none' }}
            accept=".png, .jpg, .jpeg, .webp"
            onChange={handleFileChange}
          />
          <div className="upload-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div className="upload-text">
            <p>Drag & drop design poster here</p>
            <span>PNG, JPG or WEBP (max {MAX_SIZE_MB}MB)</span>
          </div>
          <button 
            type="button" 
            className="sample-trigger"
            onClick={(e) => {
              e.stopPropagation();
              // Create a dummy triggers to let parent know if they want sample loading
              fileInputRef.current.click();
            }}
          >
            Browse Files
          </button>
        </div>
      ) : (
        /* Selected File Card Details & Preview */
        <div className="preview-card">
          <img 
            src={previewUrl} 
            alt="Upload Preview" 
            className="preview-thumbnail" 
          />
          <div className="preview-details">
            <div className="preview-name">{selectedFile.name}</div>
            <div className="preview-size">{formatBytes(selectedFile.size)}</div>
          </div>
          <button className="reset-button" onClick={handleReset} title="Remove image">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      )}

      {/* Reusable Visual Error Alert */}
      {errorMsg && (
        <div className="upload-error-alert" style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '0.75rem',
          padding: '0.75rem 1rem',
          color: '#fca5a5',
          fontSize: '0.85rem'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: '#ef4444', flexShrink: 0, marginTop: '0.1rem'}}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong style={{ display: 'block', color: '#f87171', fontWeight: 600, marginBottom: '0.15rem' }}>Upload Error</strong>
            {errorMsg}
          </div>
        </div>
      )}

      {/* Analyze Image Action Trigger Button */}
      {selectedFile && !errorMsg && (
        <button 
          className="btn-primary"
          onClick={handleSubmit}
          style={{ width: '100%' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.25rem'}}>
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <polyline points="11 8 11 14 14 11"/>
          </svg>
          Analyze Image
        </button>
      )}
    </div>
  );
}
