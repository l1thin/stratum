import { useState } from 'react';

/**
 * LayerList Component
 * @param {Object} props
 * @param {Array} props.layers - Array of decomposed layer objects from the API
 * @param {Function} props.downloadPSD - Callback function when 'Download PSD' is clicked
 * @param {string} [props.selectedLayerId] - Active highlighted layer ID
 * @param {Function} [props.onLayerSelect] - Callback when a layer card is clicked
 * @param {Function} [props.onLayerHover] - Callback when hovering over a layer card (receives layerId or null)
 */
export default function LayerList({ 
  layers = [], 
  downloadPSD, 
  downloading = false,
  selectedLayerId, 
  onLayerSelect, 
  onLayerHover,
  downloadTextManifest,
  downloadImportScript
}) {
  const [activeTab, setActiveTab] = useState('all'); // all | background | object | text
  const [brokenImages, setBrokenImages] = useState({});

  // Grouping count calculations
  const backgroundLayers = layers.filter(l => l.type === 'background');
  const objectLayers = layers.filter(l => l.type === 'object');
  const textLayers = layers.filter(l => l.type === 'text');

  // Filter layers based on current active tab
  const getFilteredLayers = () => {
    switch (activeTab) {
      case 'background': return backgroundLayers;
      case 'object': return objectLayers;
      case 'text': return textLayers;
      default: return layers;
    }
  };

  const handleImageError = (layerId) => {
    setBrokenImages(prev => ({ ...prev, [layerId]: true }));
  };

  // Color mappings for requested type badges: blue = background, green = object, orange = text
  const badgeStyles = {
    background: {
      backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue
      color: '#60a5fa',
      border: '1px solid rgba(59, 130, 246, 0.25)'
    },
    object: {
      backgroundColor: 'rgba(34, 197, 94, 0.15)', // Green
      color: '#4ade80',
      border: '1px solid rgba(34, 197, 94, 0.25)'
    },
    text: {
      backgroundColor: 'rgba(249, 115, 22, 0.15)', // Orange
      color: '#fb923c',
      border: '1px solid rgba(249, 115, 22, 0.25)'
    }
  };

  const filteredLayersList = getFilteredLayers();

  return (
    <div className="layer-explorer" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
      
      {/* Component Header Area */}
      <div className="layer-explorer-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Detected Elements
          </span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.15rem', color: 'var(--text-primary)' }}>
            Layers Count: <span style={{ color: 'var(--color-primary)' }}>{layers.length}</span>
          </h3>
        </div>

        {/* Top-Right PSD Download Trigger */}
        {downloadPSD && (
          <button
            onClick={downloadPSD}
            disabled={downloading}
            className="btn-primary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              borderRadius: '0.5rem',
              width: 'auto',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            {downloading ? (
              <>
                <div className="loading-spinner" style={{ 
                  width: '0.8rem', 
                  height: '0.8rem', 
                  borderColor: 'rgba(255,255,255,0.2)', 
                  borderTopColor: 'white' 
                }}></div>
                Exporting...
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PSD
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabs Filter Bar: All | Backgrounds | Objects | Texts */}
      <div className="layer-filter-bar" style={{ display: 'flex', gap: '0.35rem' }}>
        <button
          className={`filter-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All ({layers.length})
        </button>
        <button
          className={`filter-btn ${activeTab === 'background' ? 'active' : ''}`}
          onClick={() => setActiveTab('background')}
        >
          Background ({backgroundLayers.length})
        </button>
        <button
          className={`filter-btn ${activeTab === 'object' ? 'active' : ''}`}
          onClick={() => setActiveTab('object')}
        >
          Objects ({objectLayers.length})
        </button>
        <button
          className={`filter-btn ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTab('text')}
        >
          Text ({textLayers.length})
        </button>
      </div>

      {/* Layers List Grid */}
      <div className="layer-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredLayersList.map(layer => {
          const isSelected = selectedLayerId === layer.layer_id;
          const isImageBroken = brokenImages[layer.layer_id];
          const hasCustomBadgeStyle = badgeStyles[layer.type] || {};

          return (
            <div
              key={layer.layer_id}
              className={`layer-card ${isSelected ? 'active' : ''}`}
              onClick={() => onLayerSelect && onLayerSelect(layer.layer_id)}
              onMouseEnter={() => onLayerHover && onLayerHover(layer.layer_id)}
              onMouseLeave={() => onLayerHover && onLayerHover(null)}
            >
              {/* Thumbnail Display with error fallback */}
              <div className="layer-thumbnail-container">
                {isImageBroken ? (
                  // Fallback geometric placeholder SVG for broken images
                  <svg 
                    width="100%" 
                    height="100%" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="var(--text-muted)" 
                    strokeWidth="1.5" 
                    style={{ background: '#1e293b', padding: '0.75rem' }}
                  >
                    {layer.type === 'text' ? (
                      <text x="50%" y="60%" textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="bold">T</text>
                    ) : layer.type === 'background' ? (
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    ) : (
                      <polygon points="12 2 2 22 22 22" />
                    )}
                  </svg>
                ) : (
                  <img
                    src={layer.thumbnail_url}
                    alt={layer.label}
                    className="layer-thumbnail"
                    onError={() => handleImageError(layer.layer_id)}
                  />
                )}
              </div>

              {/* Card Details */}
              <div className="layer-details" style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div className="layer-label-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="layer-title" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    {layer.label}
                  </span>
                  
                  {/* Color coded badge */}
                  <span 
                    className="layer-badge" 
                    style={{
                      fontSize: '0.65rem',
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      ...hasCustomBadgeStyle
                    }}
                  >
                    {layer.type}
                  </span>
                </div>

                {/* Dimensions metadata display */}
                <div className="layer-dimensions" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Box: X={layer.bounding_box.x}%, Y={layer.bounding_box.y}% | W={layer.bounding_box.width}%, H={layer.bounding_box.height}%
                </div>
              </div>

              {/* Selection Indicator Light */}
              {isSelected && (
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-primary)',
                  boxShadow: '0 0 8px var(--color-primary)',
                  marginLeft: 'auto'
                }}></div>
              )}
            </div>
          );
        })}

        {/* Empty state for current filter */}
        {filteredLayersList.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1.5rem',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            background: 'rgba(255,255,255,0.01)',
            borderRadius: '0.5rem',
            border: '1px dashed var(--border-color)'
          }}>
            No {activeTab} layers found in this image decomposition.
          </div>
        )}
      </div>

      {/* Photoshop Integration Toolkit Section */}
      {(downloadTextManifest || downloadImportScript) && (
        <div className="export-section" style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.25rem',
          marginTop: '0.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Photoshop Text Layer Toolset</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Decompose text separate from raster images. Download the script and manifest, open the PSD in Photoshop, and run the script to rebuild editable TypeLayers.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {downloadTextManifest && (
              <button
                onClick={downloadTextManifest}
                className="sample-trigger"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.65rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'rgba(255,255,255,0.02)'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Text Manifest (.json)
              </button>
            )}
            {downloadImportScript && (
              <button
                onClick={downloadImportScript}
                className="sample-trigger"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  padding: '0.65rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'rgba(255,255,255,0.02)'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                PS Script (.jsx)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
