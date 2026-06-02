import { useState, useEffect } from 'react';
import api from '../services/api';

// Status list for step rendering
const STEPS = [
  'queued',
  'preprocessing',
  'segmenting',
  'ocr',
  'assembling',
  'done'
];

// User-friendly messages for status values
const STATUS_MESSAGES = {
  queued: 'Waiting in queue...',
  preprocessing: 'Preprocessing image layers...',
  segmenting: 'Analyzing and decomposing layout...',
  ocr: 'Detecting and OCR-ing text layers...',
  assembling: 'Reassembling Photoshop layers...',
  done: 'PSD generation completed!',
  failed: 'Image layer reconstruction failed.'
};

/**
 * ProcessingStatus Component
 * @param {Object} props
 * @param {string} props.jobId - Unique identifier of the processing task
 * @param {boolean} [props.demoMode=true] - Switch to mock progress simulation
 * @param {Function} props.onComplete - Callback fired when status becomes 'done'
 * @param {Function} props.onRetry - Callback fired when user clicks Retry on failure
 */
export default function ProcessingStatus({ jobId, demoMode = true, onComplete, onRetry }) {
  const [prevJobId, setPrevJobId] = useState(jobId);
  const [status, setStatus] = useState('queued');
  const [progress, setProgress] = useState(5);
  const [errorMsg, setErrorMsg] = useState('');

  if (jobId !== prevJobId) {
    setPrevJobId(jobId);
    setStatus('queued');
    setProgress(5);
    setErrorMsg('');
  }

  useEffect(() => {
    let intervalId = null;
    let currentStepIdx = 0;
    const isDev = import.meta.env.DEV || false;

    if (isDev) {
      console.log(`[Interval Trace] Initialized polling loop for job ID: ${jobId}`);
    }

    if (demoMode) {
      // --- DEMO MODE: Local Simulation ---
      intervalId = setInterval(() => {
        currentStepIdx++;
        
        if (currentStepIdx < STEPS.length) {
          const nextStatus = STEPS[currentStepIdx];
          setStatus(nextStatus);
          
          // Progress bar increments based on index
          const calculatedProgress = Math.round((currentStepIdx / (STEPS.length - 1)) * 95) + 5;
          setProgress(calculatedProgress);

          if (nextStatus === 'done') {
            if (isDev) {
              console.log('[Interval Trace] Simulation completed successfully. Cleaning up timer.');
            }
            clearInterval(intervalId);
            setProgress(100);
            if (onComplete) onComplete(jobId);
          }
        }
      }, 1500); // Step updates every 1.5 seconds

    } else {
      // --- LIVE API MODE: Backend Polling ---
      if (!jobId) {
        // jobId not yet assigned (upload still in progress); wait for it
        return;
      }

      const pollBackend = async () => {
        try {
          if (isDev) {
            console.log(`[Interval Trace] Querying status for job: ${jobId}`);
          }
          const statusRes = await api.pollStatus(jobId);
          
          // Update status state
          setStatus(statusRes.status);

          // Update progress state (default estimate if missing)
          if (statusRes.progress !== undefined) {
            setProgress(statusRes.progress);
          } else {
            const stepIndex = STEPS.indexOf(statusRes.status);
            if (stepIndex !== -1) {
              setProgress(Math.round(((stepIndex + 1) / STEPS.length) * 100));
            }
          }

          if (statusRes.status === 'done') {
            if (isDev) {
              console.log('[Interval Trace] Job complete. Cleaning up status interval timer.');
            }
            clearInterval(intervalId);
            setProgress(100);
            if (onComplete) onComplete(jobId);
          } else if (statusRes.status === 'failed') {
            if (isDev) {
              console.warn('[Interval Trace] Job failed on backend. Cleaning up status interval timer.');
            }
            clearInterval(intervalId);
            setErrorMsg('The backend encountered a segmentation boundary error.');
          }
        } catch (err) {
          if (isDev) {
            console.error('[Interval Trace] Polling failed due to error. Cleaning up timer.', err);
          }
          clearInterval(intervalId);
          setStatus('failed');
          setErrorMsg(err.message || 'Failed to poll processing status from server.');
        }
      };

      // Poll immediately and then every 2 seconds
      pollBackend();
      intervalId = setInterval(pollBackend, 2000);
    }

    // Cleanup interval on unmount
    return () => {
      if (intervalId) {
        if (isDev) {
          console.log('[Interval Trace] Cleaning up status interval timer on component unmount.');
        }
        clearInterval(intervalId);
      }
    };
  }, [jobId, demoMode, onComplete]);

  const isFailed = status === 'failed';
  const isDone = status === 'done';
  const isActive = !isDone && !isFailed;

  return (
    <div className="process-tracker" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Info */}
      <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isActive && <div className="loading-spinner" style={{ borderColor: 'rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--color-primary)' }}></div>}
          <span className="progress-label" style={{ fontWeight: 600 }}>
            {STATUS_MESSAGES[status] || 'Processing...'}
          </span>
        </div>
        <span className="progress-percentage" style={{ fontWeight: 700, color: isFailed ? 'var(--color-failed)' : 'var(--color-primary)' }}>
          {isFailed ? 'Error' : `${progress}%`}
        </span>
      </div>

      {/* Progress Bar */}
      {!isFailed && (
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${progress}%`,
              background: isDone 
                ? 'var(--color-done)' 
                : 'linear-gradient(to right, var(--color-primary), var(--color-secondary))'
            }}
          ></div>
        </div>
      )}

      {/* Step Sequence Details */}
      {!isFailed && (
        <div className="steps-list" style={{ marginTop: '0.25rem' }}>
          {STEPS.map((stepName, index) => {
            const stepIndex = STEPS.indexOf(status);
            const isStepActive = status === stepName;
            const isStepCompleted = stepIndex > index || isDone;

            return (
              <div 
                key={stepName} 
                className={`step-item ${isStepActive ? 'active' : ''} ${isStepCompleted ? 'completed' : ''}`}
              >
                <div className="step-indicator"></div>
                <span className="step-label" style={{ textTransform: 'capitalize' }}>{stepName}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Failed Error state display and Retry Button */}
      {isFailed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            color: '#fca5a5',
            lineHeight: 1.4
          }}>
            {errorMsg || 'An unknown parsing error occurred on the decomposition node.'}
          </div>
          {onRetry && (
            <button 
              className="btn-primary" 
              onClick={onRetry}
              style={{ padding: '0.75rem 1.5rem', fontSize: '0.875rem' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '0.25rem'}}>
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              Retry Layer Decomposition
            </button>
          )}
        </div>
      )}

    </div>
  );
}
