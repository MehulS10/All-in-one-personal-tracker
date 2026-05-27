import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Table, 
  Type, 
  Heading1, 
  Heading2, 
  List, 
  Grid3X3,
  ChevronRight
} from 'lucide-react';

export default function NotionWorkspace() {
  const notes = useLiveQuery(() => db.notesPages.toArray()) || [];
  
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activePage, setActivePage] = useState(null);

  // Sync active page data from IndexedDB
  useEffect(() => {
    if (selectedPageId) {
      const match = notes.find(n => n.id === selectedPageId);
      if (match) {
        setActivePage(match);
      }
    } else {
      setActivePage(null);
    }
  }, [selectedPageId, notes]);

  // Create a new Note Page
  const handleAddPage = async () => {
    const newPage = {
      title: 'Untitled Page',
      blocks: [
        { id: Math.random().toString(36).substring(7), type: 'h1', content: 'Welcome to your new page!' },
        { id: Math.random().toString(36).substring(7), type: 'p', content: 'Use the toolbar above or add structural blocks to organize your thoughts.' }
      ],
      updatedDate: new Date().toISOString()
    };
    try {
      const id = await db.notesPages.add(newPage);
      setSelectedPageId(id);
    } catch (err) {
      alert(`Failed to add page: ${err.message}`);
    }
  };

  // Delete a Note Page
  const handleDeletePage = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this page?')) return;
    try {
      await db.notesPages.delete(id);
      if (selectedPageId === id) {
        setSelectedPageId(null);
        setActivePage(null);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Update Page in DB
  const savePageUpdate = async (updatedPage) => {
    if (!updatedPage || !updatedPage.id) return;
    try {
      const cleanPage = {
        title: updatedPage.title,
        blocks: updatedPage.blocks,
        updatedDate: new Date().toISOString()
      };
      await db.notesPages.update(updatedPage.id, cleanPage);
    } catch (err) {
      console.error('Failed to save notes change:', err);
    }
  };

  // Update Page Title
  const handleTitleChange = (val) => {
    if (!activePage) return;
    const updated = { ...activePage, title: val };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Add Block to active page
  const addBlock = (type) => {
    if (!activePage) return;
    let newBlock = {};
    const blockId = Math.random().toString(36).substring(7);

    if (type === 'table') {
      newBlock = {
        id: blockId,
        type: 'table',
        headers: ['Header 1', 'Header 2', 'Header 3'],
        rows: [
          ['Data A', 'Data B', 'Data C'],
          ['Data D', 'Data E', 'Data F']
        ]
      };
    } else {
      newBlock = {
        id: blockId,
        type: type, // 'p', 'h1', 'h2', 'ul'
        content: ''
      };
    }

    const updated = { ...activePage, blocks: [...activePage.blocks, newBlock] };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Delete Block
  const deleteBlock = (blockId) => {
    if (!activePage) return;
    const list = activePage.blocks.filter(b => b.id !== blockId);
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Move Block Up/Down
  const moveBlock = (index, direction) => {
    if (!activePage) return;
    const list = [...activePage.blocks];
    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Edit Standard Text Block Content
  const updateBlockContent = (blockId, val) => {
    if (!activePage) return;
    const list = activePage.blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, content: val };
      }
      return b;
    });
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Table Cell Editing
  const updateTableCell = (blockId, rowIdx, colIdx, val) => {
    if (!activePage) return;
    const list = activePage.blocks.map(b => {
      if (b.id === blockId && b.type === 'table') {
        const updatedRows = [...b.rows];
        updatedRows[rowIdx] = [...updatedRows[rowIdx]];
        updatedRows[rowIdx][colIdx] = val;
        return { ...b, rows: updatedRows };
      }
      return b;
    });
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Table Header Editing
  const updateTableHeader = (blockId, colIdx, val) => {
    if (!activePage) return;
    const list = activePage.blocks.map(b => {
      if (b.id === blockId && b.type === 'table') {
        const updatedHeaders = [...b.headers];
        updatedHeaders[colIdx] = val;
        return { ...b, headers: updatedHeaders };
      }
      return b;
    });
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Table Structure Altering: Add Row
  const addTableRow = (blockId) => {
    if (!activePage) return;
    const list = activePage.blocks.map(b => {
      if (b.id === blockId && b.type === 'table') {
        const colCount = b.headers.length;
        const newRow = Array(colCount).fill('');
        return { ...b, rows: [...b.rows, newRow] };
      }
      return b;
    });
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Table Structure Altering: Add Column
  const addTableColumn = (blockId) => {
    if (!activePage) return;
    const list = activePage.blocks.map(b => {
      if (b.id === blockId && b.type === 'table') {
        const updatedHeaders = [...b.headers, `Header ${b.headers.length + 1}`];
        const updatedRows = b.rows.map(row => [...row, '']);
        return { ...b, headers: updatedHeaders, rows: updatedRows };
      }
      return b;
    });
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Table Structure Altering: Delete Row
  const deleteTableRow = (blockId, rowIdx) => {
    if (!activePage) return;
    const list = activePage.blocks.map(b => {
      if (b.id === blockId && b.type === 'table') {
        if (b.rows.length <= 1) return b; // Keep at least 1 row
        const updatedRows = b.rows.filter((_, idx) => idx !== rowIdx);
        return { ...b, rows: updatedRows };
      }
      return b;
    });
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Table Structure Altering: Delete Column
  const deleteTableColumn = (blockId, colIdx) => {
    if (!activePage) return;
    const list = activePage.blocks.map(b => {
      if (b.id === blockId && b.type === 'table') {
        if (b.headers.length <= 1) return b; // Keep at least 1 column
        const updatedHeaders = b.headers.filter((_, idx) => idx !== colIdx);
        const updatedRows = b.rows.map(row => row.filter((_, idx) => idx !== colIdx));
        return { ...b, headers: updatedHeaders, rows: updatedRows };
      }
      return b;
    });
    const updated = { ...activePage, blocks: list };
    setActivePage(updated);
    savePageUpdate(updated);
  };

  // Filter Note Pages
  const filteredPages = notes.filter(n => 
    (n.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: '100%', gap: '20px', width: '100%' }}>
      {/* Workspace Sidebar */}
      <div className="glass-card" style={{ width: '280px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BookOpen size={16} style={{ color: 'var(--accent-primary)' }} />
            Pages Directory
          </h2>
          <button 
            className="btn btn-primary" 
            style={{ padding: '6px 10px', fontSize: '12px' }}
            onClick={handleAddPage}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search note pages..." 
            style={{ paddingLeft: '32px', fontSize: '12px', padding: '8px 10px 8px 32px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Directory List */}
        <div style={{ overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredPages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '20px 0' }}>
              No pages found.
            </div>
          ) : (
            filteredPages.map(page => (
              <div 
                key={page.id}
                onClick={() => setSelectedPageId(page.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '8px 12px', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: selectedPageId === page.id ? 'var(--bg-tertiary)' : 'transparent',
                  border: selectedPageId === page.id ? '1px solid var(--border-color)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                className="activity-item"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <ChevronRight size={12} style={{ color: selectedPageId === page.id ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: selectedPageId === page.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {page.title || 'Untitled Page'}
                  </span>
                </div>
                <button 
                  onClick={(e) => handleDeletePage(e, page.id)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                  title="Delete note page"
                  className="delete-hover-btn"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Notion Canvas */}
      <div className="glass-card" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', padding: '24px', height: '100%', overflow: 'hidden' }}>
        {!activePage ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)', gap: '12px' }}>
            <BookOpen size={48} style={{ color: 'var(--border-color-hover)' }} />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>Select a page from directory or add a new one to start writing.</span>
            <button className="btn btn-primary" onClick={handleAddPage} style={{ fontSize: '13px' }}>
              <Plus size={14} /> Create a Page
            </button>
          </div>
        ) : (
          <>
            {/* Editor Top Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginRight: '8px' }}>ADD BLOCK:</span>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addBlock('h1')}>
                <Heading1 size={13} /> H1
              </button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addBlock('h2')}>
                <Heading2 size={13} /> H2
              </button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addBlock('p')}>
                <Type size={13} /> Paragraph
              </button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addBlock('ul')}>
                <List size={13} /> Bullet List
              </button>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => addBlock('table')}>
                <Table size={13} /> Data Table
              </button>
            </div>

            {/* Document Canvas Body */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Document Header Page Title */}
              <input 
                type="text"
                value={activePage.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Untitled Document"
                style={{ 
                  width: '100%', 
                  background: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  fontSize: '28px', 
                  fontWeight: '800', 
                  color: 'var(--text-primary)',
                  marginBottom: '10px'
                }}
              />

              {/* Block List Canvas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activePage.blocks && activePage.blocks.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '10px' }}>
                    Document has no content. Choose a block from the toolbar to add content.
                  </div>
                ) : (
                  (activePage.blocks || []).map((block, idx) => {
                    return (
                      <div key={block.id} className="notion-block-wrapper" style={{ display: 'flex', alignItems: 'flex-start', group: 'true', position: 'relative' }}>
                        
                        {/* Block Reorder & Delete Floating Controls */}
                        <div className="notion-block-controls">
                          <button onClick={() => moveBlock(idx, 'up')} disabled={idx === 0}><ArrowUp size={11} /></button>
                          <button onClick={() => moveBlock(idx, 'down')} disabled={idx === activePage.blocks.length - 1}><ArrowDown size={11} /></button>
                          <button onClick={() => deleteBlock(block.id)} style={{ color: 'var(--color-danger)' }}><Trash2 size={11} /></button>
                        </div>

                        {/* Rendering different Block Types */}
                        <div style={{ flexGrow: 1, paddingLeft: '8px' }}>
                          {block.type === 'h1' && (
                            <input 
                              type="text" 
                              value={block.content}
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              className="notion-h1-input"
                              placeholder="Heading 1"
                            />
                          )}

                          {block.type === 'h2' && (
                            <input 
                              type="text" 
                              value={block.content}
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              className="notion-h2-input"
                              placeholder="Heading 2"
                            />
                          )}

                          {block.type === 'p' && (
                            <textarea 
                              value={block.content}
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              className="notion-p-input"
                              placeholder="Start typing notes..."
                              rows={Math.max(block.content.split('\n').length, 1)}
                              onKeyDown={(e) => {
                                // Auto resize rows
                                e.target.rows = Math.max(e.target.value.split('\n').length, 1);
                              }}
                            />
                          )}

                          {block.type === 'ul' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '16px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>•</span>
                              <input 
                                type="text" 
                                value={block.content}
                                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                className="notion-li-input"
                                placeholder="Bullet point list item..."
                              />
                            </div>
                          )}

                          {block.type === 'table' && (
                            <div style={{ background: 'var(--bg-tertiary)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Grid3X3 size={12} /> DATATABLE BLOCK
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => addTableRow(block.id)}>+ Add Row</button>
                                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => addTableColumn(block.id)}>+ Add Column</button>
                                </div>
                              </div>
                              <table className="track-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                                <thead>
                                  <tr>
                                    {block.headers.map((hdr, cIdx) => (
                                      <th key={cIdx} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <input 
                                            type="text" 
                                            value={hdr} 
                                            onChange={(e) => updateTableHeader(block.id, cIdx, e.target.value)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontWeight: '700', fontSize: '11px', width: '100%' }}
                                          />
                                          {block.headers.length > 1 && (
                                            <button 
                                              onClick={() => deleteTableColumn(block.id, cIdx)}
                                              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                                              title="Delete Column"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {block.rows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} style={{ padding: '8px 12px', border: '1px solid var(--border-color)', background: 'transparent' }}>
                                          <input 
                                            type="text" 
                                            value={cell} 
                                            onChange={(e) => updateTableCell(block.id, rIdx, cIdx, e.target.value)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: '12px', width: '100%' }}
                                          />
                                        </td>
                                      ))}
                                      {block.rows.length > 1 && (
                                        <td style={{ width: '40px', padding: '8px', border: 'none', textAlign: 'center', background: 'transparent' }}>
                                          <button 
                                            onClick={() => deleteTableRow(block.id, rIdx)}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                                            title="Delete Row"
                                          >
                                            ×
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
