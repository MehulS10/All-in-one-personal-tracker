import React, { useState } from 'react';
import { 
  Paperclip, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  Trash2, 
  ExternalLink,
  Loader
} from 'lucide-react';

// Helper to determine icon based on file type
function getFileIcon(type) {
  const t = type.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(t)) {
    return <FileImage size={18} style={{ color: '#ec4899' }} />; // Pink
  }
  if (['xls', 'xlsx', 'csv'].includes(t)) {
    return <FileSpreadsheet size={18} style={{ color: '#10b981' }} />; // Green
  }
  if (['pdf'].includes(t)) {
    return <FileText size={18} style={{ color: '#ef4444' }} />; // Red
  }
  if (['doc', 'docx', 'txt', 'rtf'].includes(t)) {
    return <FileText size={18} style={{ color: '#3b82f6' }} />; // Blue
  }
  return <File size={18} style={{ color: '#94a3b8' }} />; // Gray
}

// Helper to format bytes to human readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function AttachmentsArea({ attachments = [], onAddAttachment, onRemoveAttachment }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Drag Over
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  // Process File Path from Drop
  const processAndSaveFile = async (filePath) => {
    setLoading(true);
    setError('');
    try {
      const savedFile = await window.api.saveAttachment(filePath);
      if (savedFile.error) {
        setError(`Failed to save: ${savedFile.error}`);
      } else {
        onAddAttachment(savedFile);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle Drop event
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // In Electron, dropped files have a path property on the File object containing the local absolute path!
      const filesArray = Array.from(e.dataTransfer.files);
      for (const file of filesArray) {
        if (file.path) {
          await processAndSaveFile(file.path);
        }
      }
    }
  };

  // Open Dialog for File Selection
  const handleBrowseFiles = async () => {
    setError('');
    try {
      const selected = await window.api.selectFile();
      if (!selected) return; // User cancelled
      
      setLoading(true);
      const savedFile = await window.api.saveAttachment(selected.path);
      if (savedFile.error) {
        setError(`Failed to save: ${savedFile.error}`);
      } else {
        onAddAttachment(savedFile);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Open File natively
  const handleOpenFile = async (e, filePath) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const res = await window.api.openAttachment(filePath);
      if (!res.success) {
        alert(res.error || 'Failed to open file');
      }
    } catch (err) {
      alert(`System Error: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div 
        className={`attachments-zone ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={handleBrowseFiles}
      >
        {loading ? (
          <Loader className="animate-spin" size={24} style={{ color: 'var(--accent-primary)' }} />
        ) : (
          <Paperclip size={24} style={{ color: 'var(--accent-primary)' }} />
        )}
        <div className="attachments-zone-text">
          {loading ? 'Processing file...' : 'Drag & Drop files here, or click to browse'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Supports PDF, Word, Excel, Images, and more
        </div>
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: 'var(--color-danger)', fontWeight: '600' }}>
          {error}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="attachments-list">
          {attachments.map((file, idx) => (
            <div 
              key={idx} 
              className="attachment-file-card"
              onClick={(e) => handleOpenFile(e, file.path)}
              title="Double-click to open in system application"
            >
              <div className="attachment-file-info">
                {getFileIcon(file.type)}
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span className="attachment-file-name">{file.name}</span>
                  <span className="attachment-file-meta">
                    {file.type.toUpperCase()} • {formatBytes(file.size)}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button 
                  className="attachment-action-btn"
                  onClick={(e) => handleOpenFile(e, file.path)}
                  title="Open file"
                >
                  <ExternalLink size={14} />
                </button>
                {onRemoveAttachment && (
                  <button 
                    className="attachment-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to remove this attachment?')) {
                        onRemoveAttachment(idx);
                      }
                    }}
                    title="Remove attachment"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
