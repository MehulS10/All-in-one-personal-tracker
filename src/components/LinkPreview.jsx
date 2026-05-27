import React, { useState, useEffect } from 'react';
import { Globe, Loader } from 'lucide-react';

export default function LinkPreview({ url }) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) {
      setMetadata(null);
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (_) {
      setError(true);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);

    // Call the Electron main process scraper
    window.api.scrapeLink(url)
      .then((res) => {
        if (!isMounted) return;
        if (res.error || (!res.title && !res.description)) {
          setError(true);
        } else {
          setMetadata(res);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (!url) return null;

  if (loading) {
    return (
      <div className="link-preview-card" style={{ padding: '12px', alignItems: 'center', gap: '8px' }}>
        <Loader className="animate-spin" size={16} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading preview for {url}...</span>
      </div>
    );
  }

  if (error || !metadata) {
    let displayHost = '';
    try {
      displayHost = new URL(url).hostname;
    } catch (_) {
      displayHost = url;
    }
    
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview-card">
        <div className="link-preview-info">
          <span className="link-preview-host"><Globe size={12} /> {displayHost}</span>
          <span className="link-preview-title" style={{ color: 'var(--accent-primary)' }}>{url}</span>
          <span className="link-preview-desc">Click to open this link in your default web browser.</span>
        </div>
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="link-preview-card">
      {metadata.image && (
        <div 
          className="link-preview-image" 
          style={{ backgroundImage: `url(${metadata.image})` }}
        />
      )}
      <div className="link-preview-info">
        <span className="link-preview-host">
          <Globe size={12} /> {metadata.hostname || 'Webpage'}
        </span>
        <span className="link-preview-title">{metadata.title || url}</span>
        {metadata.description && (
          <span className="link-preview-desc">{metadata.description}</span>
        )}
      </div>
    </a>
  );
}
