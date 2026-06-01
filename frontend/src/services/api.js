import axios from 'axios';

// Detect and extract the base URL from the environment config
const getBaseUrl = () => {
  // If running in Vite development server, let proxy handle CORS route redirection
  if (import.meta.env && import.meta.env.DEV) {
    return ''; // Relative path utilizes Vite server proxy configuration
  }
  // Check Vite native config first
  if (import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env && import.meta.env.REACT_APP_API_BASE_URL) {
    return import.meta.env.REACT_APP_API_BASE_URL;
  }
  // Fallback to process.env for Node/CRA/Next.js compatibility
  try {
    if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE_URL) {
      return process.env.REACT_APP_API_BASE_URL;
    }
  } catch (e) {
    // Silence reference errors for 'process' in strictly web-only contexts
  }
  return 'http://localhost:5000';
};

const API_BASE_URL = getBaseUrl();
const isDev = import.meta.env.DEV || false;

if (isDev) {
  console.log(`[API Init] Base URL set to: "${API_BASE_URL}" (Proxy Active: ${import.meta.env.DEV})`);
}

// Create Axios Instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Custom error wrapper to format and log API connection errors in development mode
 * @param {Error} error - The caught Axios error
 * @param {string} contextMessage - Descriptive text about the failed request scope
 */
const handleError = (error, contextMessage) => {
  let message = 'An unexpected connection error occurred.';

  if (error.response) {
    // The server responded with a status code outside the 2xx range
    message = error.response.data?.error || `Server responded with status: ${error.response.status}`;
  } else if (error.request) {
    // The request was made but no response was received
    message = 'No response received from the backend API. Please check your network connection.';
  } else {
    // An error occurred during request assembly
    message = error.message || message;
  }

  const descriptiveError = new Error(`${contextMessage}: ${message}`);

  if (isDev) {
    console.error(`[API Dev-Log] ${contextMessage} failed:`, {
      originalError: error,
      errorMessage: descriptiveError.message,
    });
  }

  throw descriptiveError;
};

/**
 * Triggers a browser download prompt for a binary file blob
 * @param {Blob} blob - Binary data blob
 * @param {string} filename - Target filename for download
 */
export const triggerPSDDownload = (blob, filename) => {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (isDev) {
      console.error('[Download Dev-Log] File download trigger failed:', error);
    }
    throw new Error(`File download failed: ${error.message}`);
  }
};

export const api = {
  /**
   * Uploads an image file to trigger PSD decomposition
   * @param {File} file - Selected raster or generative design file
   * @returns {Promise<{ job_id: string, status: string }>}
   */
  uploadImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (isDev) {
        console.log(`[API Trace] Uploading file: ${file.name} (${file.size} bytes)`);
      }

      const response = await apiClient.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      handleError(error, 'Image upload failed');
    }
  },

  /**
   * Fetches the current processing status and progress of a decomposition task
   * @param {string} jobId - The unique task job ID
   * @returns {Promise<{ job_id: string, status: string, progress: number }>}
   */
  pollStatus: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/status/${jobId}`);
      return response.data;
    } catch (error) {
      handleError(error, `Failed to retrieve status for job ID: ${jobId}`);
    }
  },

  /**
   * Fetches the decomposed layers once the job status is 'done'
   * @param {string} jobId - The unique task job ID
   * @returns {Promise<{ layers: Array<{ layer_id: string, type: string, label: string, bounding_box: object, thumbnail_url: string }> }>}
   */
  fetchResult: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/result/${jobId}`);
      
      if (isDev) {
        console.log(`[API Trace] fetchResult payload for job ${jobId}:`, response.data);
      }

      const rawData = response.data;
      
      // Defensive fallback extraction
      let extractedLayers = [];
      if (rawData && Array.isArray(rawData.layers)) {
        extractedLayers = rawData.layers;
      } else if (rawData && rawData.data && Array.isArray(rawData.data.layers)) {
        extractedLayers = rawData.data.layers; // Handles nested data envelopment
      } else {
        if (isDev) {
          console.warn('[API Warn] Unexpected layers payload shape. Defaulting to empty array.', rawData);
        }
      }

      // Check structure of individual layers to prevent downstream component crashes
      const validatedLayers = extractedLayers.map((layer, index) => ({
        layer_id: layer.layer_id || `extracted-layer-${index}`,
        type: ['background', 'object', 'text'].includes(layer.type) ? layer.type : 'object',
        label: layer.label || `Layer ${index + 1}`,
        bounding_box: {
          x: typeof layer.bounding_box?.x === 'number' ? layer.bounding_box.x : 0,
          y: typeof layer.bounding_box?.y === 'number' ? layer.bounding_box.y : 0,
          width: typeof layer.bounding_box?.width === 'number' ? layer.bounding_box.width : 100,
          height: typeof layer.bounding_box?.height === 'number' ? layer.bounding_box.height : 100,
        },
        thumbnail_url: layer.thumbnail_url || '',
      }));

      return { layers: validatedLayers };
    } catch (error) {
      handleError(error, `Failed to fetch results for job ID: ${jobId}`);
    }
  },

  /**
   * Downloads the reconstructed .psd file as a binary Blob
   * @param {string} jobId - The unique task job ID
   * @returns {Promise<Blob>}
   */
  downloadPSD: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/download/${jobId}`, {
        responseType: 'blob',
      });

      const blob = response.data;
      if (isDev) {
        console.log(`[API Trace] Downloaded blob size: ${blob.size} bytes, mime: ${blob.type}`);
      }

      // Check if blob is actually a JSON error packaged in binary form
      if (blob.type === 'application/json') {
        const text = await blob.text();
        const jsonError = JSON.parse(text);
        throw new Error(jsonError.error || 'Server error packaged as binary.');
      }

      if (blob.size === 0) {
        throw new Error('Downloaded file is empty (0 bytes).');
      }

      return blob;
    } catch (error) {
      handleError(error, `Failed to retrieve PSD file for job ID: ${jobId}`);
    }
  },

  /**
   * Downloads the text_manifest.json file for a job
   * @param {string} jobId - The unique task job ID
   * @returns {Promise<Blob>}
   */
  downloadTextManifest: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/outputs/${jobId}/text_manifest.json`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      handleError(error, `Failed to retrieve text manifest for job ID: ${jobId}`);
    }
  },

  /**
   * Downloads the import_text_layers.jsx file for a job
   * @param {string} jobId - The unique task job ID
   * @returns {Promise<Blob>}
   */
  downloadImportScript: async (jobId) => {
    try {
      const response = await apiClient.get(`/api/outputs/${jobId}/import_text_layers.jsx`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      handleError(error, `Failed to retrieve Photoshop script for job ID: ${jobId}`);
    }
  },
};

export default {
  ...api,
  triggerPSDDownload,
};
