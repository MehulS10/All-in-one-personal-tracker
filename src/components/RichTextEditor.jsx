import React, { useRef, useEffect } from 'react';
import { Bold, Italic, Underline, Highlighter, Type, RotateCcw } from 'lucide-react';

export default function RichTextEditor({ value, onChange, placeholder = 'Write notes here...' }) {
  const editorRef = useRef(null);

  // Set initial content if it changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleHighlight = (color) => {
    executeCommand('backColor', color);
  };

  const handleFontSize = (size) => {
    // execCommand fontSize accepts 1-7
    executeCommand('fontSize', size);
  };

  return (
    <div className="rich-editor-container">
      {/* Formatting Toolbar */}
      <div className="rich-editor-toolbar">
        <button
          type="button"
          className="rich-editor-btn"
          onClick={() => executeCommand('bold')}
          title="Bold"
        >
          <Bold size={14} />
        </button>
        <button
          type="button"
          className="rich-editor-btn"
          onClick={() => executeCommand('italic')}
          title="Italic"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          className="rich-editor-btn"
          onClick={() => executeCommand('underline')}
          title="Underline"
        >
          <Underline size={14} />
        </button>

        <div className="rich-editor-divider" />

        {/* Font Size Selector */}
        <div className="rich-editor-dropdown-wrapper">
          <button type="button" className="rich-editor-btn" title="Font Size">
            <Type size={14} />
          </button>
          <div className="rich-editor-dropdown">
            <button type="button" onClick={() => handleFontSize('2')}>Small</button>
            <button type="button" onClick={() => handleFontSize('3')}>Normal</button>
            <button type="button" onClick={() => handleFontSize('5')}>Large</button>
            <button type="button" onClick={() => handleFontSize('6')}>Extra Large</button>
          </div>
        </div>

        {/* Highlight Color Picker */}
        <div className="rich-editor-dropdown-wrapper">
          <button type="button" className="rich-editor-btn" title="Highlight Text">
            <Highlighter size={14} />
          </button>
          <div className="rich-editor-dropdown color-dropdown">
            <button type="button" style={{ backgroundColor: '#fef08a', color: '#000' }} onClick={() => handleHighlight('#fef08a')}>Yellow</button>
            <button type="button" style={{ backgroundColor: '#a5f3fc', color: '#000' }} onClick={() => handleHighlight('#a5f3fc')}>Cyan</button>
            <button type="button" style={{ backgroundColor: '#bbf7d0', color: '#000' }} onClick={() => handleHighlight('#bbf7d0')}>Green</button>
            <button type="button" style={{ backgroundColor: '#fbcfe8', color: '#000' }} onClick={() => handleHighlight('#fbcfe8')}>Pink</button>
            <button type="button" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }} onClick={() => handleHighlight('rgba(0,0,0,0)')}>None</button>
          </div>
        </div>

        <div className="rich-editor-divider" />

        <button
          type="button"
          className="rich-editor-btn"
          onClick={() => executeCommand('removeFormat')}
          title="Clear Formatting"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Content Editable Body */}
      <div
        ref={editorRef}
        className="rich-editor-body"
        contentEditable
        onInput={handleInput}
        placeholder={placeholder}
        style={{
          minHeight: '120px',
          padding: '12px',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          outline: 'none',
        }}
      />
    </div>
  );
}
