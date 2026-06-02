import React, { useState, useEffect, useRef } from 'react';
import api from './services/api';
import samplePoster from './assets/sample_poster.png';
import UploadZone from './components/UploadZone';
import ProcessingStatus from './components/ProcessingStatus';
import LayerList from './components/LayerList';


export default function App() {
  // Demo Mode is enabled by default to explore the interface without a live backend
  const [demoMode, setDemoMode] = useState(true);
  
  // File and Preview States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Job and Processing States
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | uploading | queued | preprocessing | segmenting | ocr | assembling | done | failed
  const [progress, setProgress] = useState(0);
  const [processingError, setProcessingError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Results and Layers States
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [hoveredLayerId, setHoveredLayerId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  
  // Notification states
  const [notification, setNotification] = useState(null);


  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle Notifications
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  // Helper to convert file size to readable format
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };



  // Reset all workspace and processing states
  const resetState = () => {
    if (previewUrl && previewUrl !== samplePoster) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setJobId(null);
    setStatus('idle');
    setProgress(0);
    setLayers([]);
    setSelectedLayerId(null);
    setHoveredLayerId(null);
    setProcessingError(null);
    setIsProcessing(false);
    setIsUploading(false);
  };

  // Quick-load the pre-generated Synthwave Sample Poster
  const loadSampleImage = async () => {
    try {
      resetState();
      // Fetch the sample poster asset and convert it to a File object
      const response = await fetch(samplePoster);
      const blob = await response.blob();
      const file = new File([blob], 'synthwave_sample.png', { type: 'image/png' });
      
      setSelectedFile(file);
      setPreviewUrl(samplePoster);
      showNotification('Loaded sample retro-synthwave poster!', 'success');
    } catch (error) {
      // Fallback: Use URL directly as preview, but mock file metadata
      setPreviewUrl(samplePoster);
      setSelectedFile({
        name: 'synthwave_sample.png',
        size: 13057,
        type: 'image/png'
      });
      showNotification('Loaded sample retro-synthwave poster!', 'success');
    }
  };

  // Submit handler passed to modular UploadZone component
  const handleUploadZoneSubmit = async (file) => {
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setIsProcessing(true);
    setProcessingError(null);
    setLayers([]);
    
    if (demoMode) {
      runDemoSimulation();
    } else {
      runRealAPIUpload(file);
    }
  };

  // Trigger decomposition process (e.g. for retry)
  const startDecomposition = async () => {
    if (selectedFile) {
      handleUploadZoneSubmit(selectedFile);
    }
  };

  // REAL API FLOW: Upload, update status to queued, let ProcessingStatus poll backend
  const runRealAPIUpload = async (fileToUpload) => {
    const file = fileToUpload || selectedFile;
    if (!file) return;

    try {
      setIsUploading(true);
      setStatus('uploading');
      setProgress(5);
      showNotification('Uploading image to Stratum AI backend...', 'info');

      const uploadRes = await api.uploadImage(file);
      setIsUploading(false);
      setJobId(uploadRes.job_id);
      setStatus(uploadRes.status || 'queued');
      showNotification(`Upload successful! Job ID: ${uploadRes.job_id}`, 'success');
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      setStatus('failed');
      setIsProcessing(false);
      setProcessingError(err.message || 'API Upload failed.');
      showNotification('Backend not reachable. Please switch to Demo Mode to explore the interface.', 'error');
    }
  };

  // MOCK DEMO FLOW: Set a dummy job ID and trigger status simulation
  const runDemoSimulation = () => {
    const mockJobId = `mock-job-${Date.now()}`;
    setJobId(mockJobId);
    setStatus('queued');
    setProgress(5);
    showNotification('Starting image decomposition simulation...', 'info');
  };

  // Callback triggered when ProcessingStatus successfully reaches 'done'
  const handleDecompositionComplete = async (completedJobId) => {
    setStatus('done');
    setIsProcessing(false);
    setProgress(100);

    if (demoMode) {
      // Define mock layers
      const mockLayers = [
        {
          layer_id: 'layer-bg',
          type: 'background',
          label: 'Background Canvas',
          bounding_box: { x: 0, y: 0, width: 100, height: 100 },
          thumbnail_url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=120&auto=format&fit=crop&q=60'
        },
        {
          layer_id: 'layer-sun',
          type: 'object',
          label: 'Retro Synthwave Sun',
          bounding_box: { x: 26, y: 18, width: 48, height: 38 },
          thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=60'
        },
        {
          layer_id: 'layer-grid',
          type: 'object',
          label: 'Neon Wireframe Grid',
          bounding_box: { x: 5, y: 55, width: 90, height: 40 },
          thumbnail_url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=120&auto=format&fit=crop&q=60'
        },
        {
          layer_id: 'layer-text-title',
          type: 'text',
          label: 'Main Header Text ("SYNTH")',
          bounding_box: { x: 12, y: 6, width: 76, height: 12 },
          thumbnail_url: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=120&auto=format&fit=crop&q=60'
        },
        {
          layer_id: 'layer-text-subtitle',
          type: 'text',
          label: 'Date/Venue Label',
          bounding_box: { x: 30, y: 92, width: 40, height: 4 },
          thumbnail_url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=120&auto=format&fit=crop&q=60'
        }
      ];
      setLayers(mockLayers);
      showNotification('Simulation complete! 5 layers identified.', 'success');
    } else {
      // Live API: fetch final segmented layer results
      try {
        showNotification('Retrieving segmented layer layout...', 'info');
        const results = await api.fetchResult(completedJobId);
        setLayers(results.layers || []);
        showNotification('PSD layers successfully generated!', 'success');
      } catch (err) {
        console.error(err);
        setProcessingError(err.message || 'Failed to fetch layers from backend.');
        setStatus('failed');
        showNotification('Failed fetching layers.', 'error');
      }
    }
  };

  // Download PSD File
  const handleDownloadPsd = async () => {
    setDownloading(true);
    showNotification('Preparing PSD file download...', 'info');

    try {
      const filename = `${selectedFile?.name ? selectedFile.name.split('.')[0] : 'design'}_reconstructed.psd`;
      if (demoMode) {
        // Simulate PSD creation as a text blob containing mock bytes
        setTimeout(() => {
          const fakePsdContent = '8BPS\x00\x01\x00\x00\x00\x00\x00\x00... [Stratum PSD Layer Export Binary]';
          const blob = new Blob([fakePsdContent], { type: 'application/octet-stream' });
          api.triggerPSDDownload(blob, filename);
          setDownloading(false);
          showNotification('PSD downloaded successfully!', 'success');
        }, 1500);
      } else {
        const fileBlob = await api.downloadPSD(jobId);
        api.triggerPSDDownload(fileBlob, filename);
        setDownloading(false);
        showNotification('PSD downloaded successfully!', 'success');
      }
    } catch (err) {
      console.error(err);
      setDownloading(false);
      showNotification(err.message || 'Failed to download PSD file. Try again.', 'error');
    }
  };

  // Download Text Manifest JSON
  const handleDownloadTextManifest = async () => {
    if (!jobId) return;
    showNotification('Downloading text_manifest.json...', 'info');
    try {
      const filename = `${selectedFile?.name ? selectedFile.name.split('.')[0] : 'design'}_text_manifest.json`;
      if (demoMode) {
        const mockManifest = [
          { "text": "SYNTH", "conf": 96, "bbox": [120, 60, 880, 180] }
        ];
        const blob = new Blob([JSON.stringify(mockManifest, null, 2)], { type: 'application/json' });
        api.triggerPSDDownload(blob, filename);
        showNotification('Downloaded text_manifest.json!', 'success');
      } else {
        const fileBlob = await api.downloadTextManifest(jobId);
        api.triggerPSDDownload(fileBlob, filename);
        showNotification('Downloaded text_manifest.json!', 'success');
      }
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to download text manifest.', 'error');
    }
  };

  // Download Photoshop Import Script JSX
  const handleDownloadImportScript = async () => {
    if (!jobId) return;
    showNotification('Downloading import_text_layers.jsx...', 'info');
    try {
      const filename = 'import_text_layers.jsx';
      if (demoMode) {
        const mockScript = 'alert("Mock script downloaded");';
        const blob = new Blob([mockScript], { type: 'application/octet-stream' });
        api.triggerPSDDownload(blob, filename);
        showNotification('Downloaded import_text_layers.jsx!', 'success');
      } else {
        const fileBlob = await api.downloadImportScript(jobId);
        api.triggerPSDDownload(fileBlob, filename);
        showNotification('Downloaded import_text_layers.jsx!', 'success');
      }
    } catch (err) {
      console.error(err);
      showNotification(err.message || 'Failed to download Photoshop script.', 'error');
    }
  };



  return (
    <div className="app-container">
      {/* Header Banner */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-name">Stratum</h1>
          </div>
        </div>
        
        <div className="header-actions">
          {/* Demo Mode Switch */}
          <div className="mode-toggle" title="Demo mode simulates backend API steps without requiring a live backend service.">
            <span>Demo Mode</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={demoMode} 
                onChange={(e) => {
                  setDemoMode(e.target.checked);
                  showNotification(
                    e.target.checked 
                      ? 'Switched to Demo Simulation Mode.' 
                      : 'Switched to Live API Mode (Requires Backend).',
                    'info'
                  );
                }} 
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="workspace">
        
        {/* LEFT PANEL: Upload & Execution */}
        <section className="panel">
          <div>
            <h2 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-primary)'}}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload Design
            </h2>
            <p className="panel-subtitle">Upload your raster image to decompose it into layered files.</p>
          </div>

          {/* Drag & Drop Upload Zone or Selected Preview */}
          {status === 'idle' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <UploadZone 
                onSubmit={handleUploadZoneSubmit} 
                onReset={resetState} 
              />
              <button 
                type="button" 
                className="sample-trigger" 
                onClick={loadSampleImage}
                style={{ width: '100%', marginTop: '-0.5rem' }}
              >
                Use Sample Synthwave Image
              </button>
            </div>
          ) : (
            /* Selected File Summary Card during/after processing */
            <div className="preview-card">
              <img 
                src={previewUrl} 
                alt="Upload Preview" 
                className="preview-thumbnail" 
              />
              <div className="preview-details">
                <div className="preview-name">{selectedFile?.name || 'reconstructed_image.png'}</div>
                <div className="preview-size">{selectedFile?.size ? formatBytes(selectedFile.size) : ''}</div>
              </div>
              
              {!isProcessing && (
                <button className="reset-button" onClick={resetState} title="Clear selected file">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Processing Tracker Overlay */}
          {status !== 'idle' && status !== 'done' && (
            isUploading ? (
              <div className="process-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="loading-spinner" style={{ borderColor: 'rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--color-primary)' }}></div>
                    <span className="progress-label" style={{ fontWeight: 600 }}>Uploading image...</span>
                  </div>
                  <span className="progress-percentage" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{progress}%</span>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progress}%`, background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))' }}></div>
                </div>
              </div>
            ) : (
              <ProcessingStatus
                jobId={jobId}
                demoMode={demoMode}
                onComplete={handleDecompositionComplete}
                onRetry={startDecomposition}
              />
            )
          )}
        </section>

        {/* RIGHT PANEL: Extracted Layers and Canvas Bounding Boxes */}
        <section className="panel">
          <div>
            <h2 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--color-secondary)'}}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              Extracted Layers
            </h2>
            <p className="panel-subtitle">Review detected bounding boxes and structural hierarchies.</p>
          </div>

          {/* No Layers / Empty State */}
          {layers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3>Decomposition Workspace</h3>
              <p>Upload a creative file in the left panel and start the process. Decomposed layers will populate here.</p>
            </div>
          ) : (
            /* Active Result State Workspace */
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%'}}>
              
              {/* Responsive Bounding Box Canvas Overlay */}
              <div className="canvas-container">
                <img 
                  src={previewUrl} 
                  alt="Segmented Workspace" 
                  className="canvas-image" 
                />
                <div className="canvas-overlay">
                  {layers.map(layer => {
                    const { x, y, width: w, height: h } = layer.bounding_box;
                    const isSelected = selectedLayerId === layer.layer_id;
                    const isHovered = hoveredLayerId === layer.layer_id;
                    
                    return (
                      <div
                        key={layer.layer_id}
                        className={`canvas-bbox type-${layer.type} ${isSelected || isHovered ? 'active' : ''}`}
                        style={{
                          left: `${x}%`,
                          top: `${y}%`,
                          width: `${w}%`,
                          height: `${h}%`,
                        }}
                        onMouseEnter={() => setHoveredLayerId(layer.layer_id)}
                        onMouseLeave={() => setHoveredLayerId(null)}
                        onClick={() => setSelectedLayerId(layer.layer_id)}
                      >
                        <span className="bbox-label">{layer.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modular Layer List Explorer Component */}
              <LayerList
                layers={layers}
                downloadPSD={handleDownloadPsd}
                downloading={downloading}
                selectedLayerId={selectedLayerId}
                onLayerSelect={setSelectedLayerId}
                onLayerHover={setHoveredLayerId}
                downloadTextManifest={handleDownloadTextManifest}
                downloadImportScript={handleDownloadImportScript}
              />
            </div>
          )}
        </section>
      </main>

      {/* Global Action Notifications */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: notification.type === 'success' ? 'var(--color-done)' : notification.type === 'error' ? 'var(--color-failed)' : 'var(--color-primary)'
          }}></div>
          <span style={{fontSize: '0.85rem', fontWeight: 500}}>{notification.message}</span>
        </div>
      )}
    </div>
  );
}
