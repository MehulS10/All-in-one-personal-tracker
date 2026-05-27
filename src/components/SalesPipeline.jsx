import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import AttachmentsArea from './AttachmentsArea';
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  X, 
  Edit, 
  Trash2, 
  ArrowRightLeft,
  User,
  Clock,
  TrendingUp,
  FileText,
  ExternalLink
} from 'lucide-react';

export default function SalesPipeline() {
  // Query sales and leads reactively
  const sales = useLiveQuery(() => db.sales.toArray()) || [];
  const leads = useLiveQuery(() => db.leads.toArray()) || [];

  // Local state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [leadId, setLeadId] = useState('');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState('Prospect');
  const [closeDate, setCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState([]);

  // Sync selected deal if sales update
  useEffect(() => {
    if (selectedDeal) {
      const updated = sales.find(s => s.id === selectedDeal.id);
      setSelectedDeal(updated || null);
    }
  }, [sales]);

  const stagesList = [
    'Prospect',
    'Qualified',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost'
  ];

  // Helper: Get lead name by ID
  const getLeadName = (id) => {
    const lead = leads.find(l => l.id === parseInt(id));
    return lead ? `${lead.name} (${lead.company || 'Private'})` : '';
  };

  // Reset form
  const resetForm = () => {
    setTitle('');
    setLeadId('');
    setAmount('');
    setStage('Prospect');
    setCloseDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default 30 days
    setNotes('');
    setAttachments([]);
    setEditId(null);
    setIsEditMode(false);
  };

  // Handle Edit Deal
  const handleOpenEdit = (deal) => {
    setEditId(deal.id);
    setTitle(deal.title || '');
    setLeadId(deal.leadId ? deal.leadId.toString() : '');
    setAmount(deal.amount || '');
    setStage(deal.stage || 'Prospect');
    setCloseDate(deal.closeDate || '');
    setNotes(deal.notes || '');
    setAttachments(deal.attachments || []);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Form Submit
  const handleSubmitDeal = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Deal title is required');

    // Duplicate Check
    const isDuplicate = sales.some(s => 
      s.id !== editId &&
      s.title.toLowerCase().trim() === title.toLowerCase().trim() &&
      s.leadId === (leadId ? parseInt(leadId) : null)
    );

    if (isDuplicate) {
      alert(`Data Exists: A sales deal with title "${title}" already exists under this lead connection!`);
      return;
    }

    const dealData = {
      title: title.trim(),
      leadId: leadId ? parseInt(leadId) : null,
      amount: parseFloat(amount) || 0,
      stage,
      closeDate,
      notes: notes.trim(),
      attachments,
      updatedDate: new Date().toISOString()
    };

    try {
      if (isEditMode) {
        await db.sales.update(editId, dealData);
        setSelectedDeal({ id: editId, ...dealData });
      } else {
        await db.sales.add(dealData);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  };

  // Delete Deal
  const handleDeleteDeal = async (id) => {
    if (!confirm('Are you sure you want to delete this sales deal?')) return;
    try {
      await db.sales.delete(id);
      setSelectedDeal(null);
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  };

  // Calculate sum of deal value by stage
  const getStageTotal = (stageName) => {
    const total = sales
      .filter(s => s.stage === stageName)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(total);
  };

  // Move stage directly
  const handleMoveStage = async (dealId, newStage) => {
    try {
      await db.sales.update(dealId, { 
        stage: newStage,
        updatedDate: new Date().toISOString() 
      });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales Pipeline</h1>
          <p className="page-subtitle">Track opportunities through deal progression, negotiations, and closed accounts.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => { resetForm(); setIsModalOpen(true); }}
        >
          <Plus size={16} /> Create Deal
        </button>
      </div>

      {/* Kanban Board Layout */}
      <div className="kanban-board">
        {stagesList.map(stg => {
          const stageSales = sales.filter(s => s.stage === stg);
          
          return (
            <div className="kanban-column" key={stg}>
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <div style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%',
                    backgroundColor: 
                      stg === 'Closed Won' ? 'var(--color-success)' : 
                      stg === 'Closed Lost' ? 'var(--color-danger)' : 
                      stg === 'Negotiation' ? 'var(--accent-secondary)' : 
                      'var(--accent-primary)' 
                  }} />
                  <span>{stg}</span>
                </div>
                <span className="kanban-column-count">{stageSales.length}</span>
              </div>
              
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', padding: '0 4px' }}>
                Value: {getStageTotal(stg)}
              </div>

              <div className="kanban-cards-container">
                {stageSales.map(deal => (
                  <div 
                    key={deal.id} 
                    className="kanban-card"
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <span className="kanban-card-title">{deal.title}</span>
                    {deal.leadId && (
                      <span className="kanban-card-company">{getLeadName(deal.leadId)}</span>
                    )}
                    <span className="kanban-card-value">${(deal.amount || 0).toLocaleString()}</span>
                    
                    {deal.closeDate && (
                      <div className="kanban-card-date">
                        <Calendar size={11} />
                        <span>Close: {deal.closeDate}</span>
                      </div>
                    )}
                  </div>
                ))}
                
                {stageSales.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px 0', fontSize: '12px', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                    Empty Column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Detail Slide Drawer */}
      {selectedDeal && (
        <>
          <div className="detail-drawer-overlay" onClick={() => setSelectedDeal(null)} />
          <div className="detail-drawer">
            <div className="detail-drawer-header">
              <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--accent-primary)' }}>Deal Workcard</span>
              <button className="modal-close-btn" onClick={() => setSelectedDeal(null)}><X size={20} /></button>
            </div>

            <div className="detail-drawer-body">
              {/* Header profile info */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{selectedDeal.title}</h2>
                <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-success)' }}>
                  ${(selectedDeal.amount || 0).toLocaleString()}
                </span>
                
                {/* Stage dropdown trigger in details drawer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                  <ArrowRightLeft size={14} style={{ color: 'var(--text-muted)' }} />
                  <select 
                    className="form-select"
                    style={{ width: '160px', padding: '4px 8px', fontSize: '12px' }}
                    value={selectedDeal.stage}
                    onChange={(e) => handleMoveStage(selectedDeal.id, e.target.value)}
                  >
                    {stagesList.map(stg => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Connected Lead Card */}
              {selectedDeal.leadId && (
                <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="detail-section-title">Associated Prospect</span>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: 'var(--bg-tertiary)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)',
                    fontSize: '13px',
                    marginTop: '6px'
                  }}>
                    <User size={16} style={{ color: 'var(--accent-primary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600' }}>{getLeadName(selectedDeal.leadId)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Closing Timeline */}
              <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <span className="detail-section-title">Closing Details</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginTop: '6px' }}>
                  {selectedDeal.closeDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Target Closing Date: {selectedDeal.closeDate}</span>
                    </div>
                  )}
                  {selectedDeal.updatedDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Last Updated: {new Date(selectedDeal.updatedDate).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Deal Notes */}
              {selectedDeal.notes && (
                <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="detail-section-title">Deal Proposal / Notes</span>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '6px', whiteSpace: 'pre-wrap' }}>
                    {selectedDeal.notes}
                  </p>
                </div>
              )}

              {/* Deal attachments */}
              <div className="detail-section">
                <span className="detail-section-title">Contracts & Specifications</span>
                <AttachmentsArea 
                  attachments={selectedDeal.attachments || []}
                  onAddAttachment={async (file) => {
                    const list = [...(selectedDeal.attachments || []), file];
                    await db.sales.update(selectedDeal.id, { attachments: list });
                  }}
                  onRemoveAttachment={async (index) => {
                    const list = [...(selectedDeal.attachments || [])];
                    list.splice(index, 1);
                    await db.sales.update(selectedDeal.id, { attachments: list });
                  }}
                />
              </div>

              {/* Drawer Action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleOpenEdit(selectedDeal)}
                  style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}
                >
                  <Edit size={14} /> Edit Deal
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteDeal(selectedDeal.id)}
                  style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Creation and Modification Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">{isEditMode ? 'Edit Deal Proposal' : 'Register Sales Deal'}</span>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmitDeal}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">Deal Title *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Acme Software Licensing"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Link Lead Profile</label>
                    <select 
                      className="form-select"
                      value={leadId}
                      onChange={(e) => setLeadId(e.target.value)}
                    >
                      <option value="">No linked lead</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.company || 'Private'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deal Amount ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 15000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Pipeline Stage</label>
                    <select 
                      className="form-select"
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                    >
                      {stagesList.map(stg => (
                        <option key={stg} value={stg}>{stg}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Close Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={closeDate}
                      onChange={(e) => setCloseDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Proposal Notes / Specifications</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Document scope, product details, payment terms, or meeting summaries..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* File Attachments Dropzone */}
                <div className="form-group">
                  <label className="form-label">Contracts / Specifications Attachments</label>
                  <AttachmentsArea 
                    attachments={attachments}
                    onAddAttachment={(file) => setAttachments([...attachments, file])}
                    onRemoveAttachment={(index) => {
                      const list = [...attachments];
                      list.splice(index, 1);
                      setAttachments(list);
                    }}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditMode ? 'Update Deal' : 'Log Deal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
