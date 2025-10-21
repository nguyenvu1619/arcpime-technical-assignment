import React, { useState, useEffect } from "react";

interface PDFPreviewProps {
  /** The S3 key or file name to generate a signed URL for */
  s3Key?: string;
  /** Custom height for the preview */
  height?: string;
  /** Show loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string;
  /** Callback when PDF loads successfully */
  onLoad?: () => void;
  /** Callback when PDF fails to load */
  onError?: (error: string) => void;
  /** Callback when user wants to try a different document (for relevance errors) */
  onTryDifferent?: () => void;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({
  s3Key,
  height = "500px",
  loading = false,
  error,
  onLoad,
  onError,
  onTryDifferent,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(error || null);

  const backendBaseUrl = (import.meta as any)?.env?.VITE_BACKEND_URL || "http://localhost:3000";

  // Generate signed URL if we have a s3Key or fileName but no direct URL
  useEffect(() => {
    const generateSignedUrl = async () => {

      // If we have s3Key, use it to generate signed URL
      const targetFileName = s3Key
      if (!targetFileName) return;

      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await fetch(`${backendBaseUrl}/api/files/view-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            fileName: targetFileName,
            expiresIn: 3600 // 1 hour
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errorData.message || `HTTP ${response.status}: Failed to generate signed URL`);
        }

        const data = await response.json();
        setSignedUrl(data.signedUrl);
      } catch (err: any) {
        const errorMessage = err.message || "Failed to load PDF";
        setLoadError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    generateSignedUrl();
  }, [s3Key, backendBaseUrl, onError]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(null);
    onLoad?.();
  };

  const handleIframeError = () => {
    const errorMessage = "Failed to load PDF preview";
    setLoadError(errorMessage);
    onError?.(errorMessage);
  };

  // Show loading state
  if (loading || isLoading) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl"
        style={{ height }}
      >
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <div className="text-sm text-gray-500">Processing...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadError) {
    const isRelevanceError = loadError.includes("Document Not Relevant");
    
    return (
      <div 
        className={`flex items-center justify-center rounded-xl ${
          isRelevanceError 
            ? "bg-amber-50 border border-amber-200" 
            : "bg-red-50 border border-red-200"
        }`}
        style={{ height }}
      >
        <div className="text-center">
          <div className={`mb-2 ${isRelevanceError ? "text-amber-600" : "text-red-600"}`}>
            {isRelevanceError ? (
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <div className={`text-sm font-medium ${isRelevanceError ? "text-amber-700" : "text-red-700"}`}>
            {isRelevanceError ? "Document Not Suitable" : "Failed to load PDF"}
          </div>
          <div className={`text-xs mt-1 ${isRelevanceError ? "text-amber-600" : "text-red-600"}`}>
            {isRelevanceError 
              ? "This document does not contain patentable inventions or technical innovations suitable for disclosure analysis."
              : loadError
            }
          </div>
          {isRelevanceError && onTryDifferent && (
            <button
              onClick={onTryDifferent}
              className="mt-3 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
            >
              Try Different Document
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show no PDF state
  if (!signedUrl && !s3Key) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 rounded-xl"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="text-sm">No PDF to preview</div>
        </div>
      </div>
    );
  }

  // Show PDF preview
  const displayUrl = signedUrl
  return (
    <div className="h-full relative">
      <iframe
        src={`${displayUrl}#toolbar=1&navpanes=0&scrollbar=1`}
        className="w-full border border-gray-300 rounded-xl"
        style={{ height }}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title="PDF Preview"
      />
      <div className="absolute top-2 right-2">
        <a
          href={displayUrl || ''}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50 shadow-sm"
        >
          Open in new tab
        </a>
      </div>
    </div>
  );
};

export default PDFPreview;
