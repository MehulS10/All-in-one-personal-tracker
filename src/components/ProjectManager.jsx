import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import AttachmentsArea from './AttachmentsArea';
import { 
  Plus, 
  Search, 
  X, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Calendar,
  Briefcase,
  User,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  AlertTriangle,
  FileText
} from 'lucide-react';

export default function ProjectManager() {
  // Query projects and leads
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  const leads = useLiveQuery(() => db.leads.toArray()) || [];

  // Local states
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [leadId, setLeadId] = useState('');
  const [status, setStatus] = useState('Planning');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);

  // Detailed Task Fields
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTaskEditMode, setIsTaskEditMode] = useState(false);
  const [editTaskId, setEditTaskId] = useState(null);

  const [taskIdInput, setTaskIdInput] = useState('');
  const [taskNameInput, setTaskNameInput] = useState('');
  const [taskPhase, setTaskPhase] = useState('Phase 1: Concept');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskTeam, setTaskTeam] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('Not Started');
  const [taskStartDate, setTaskStartDate] = useState('');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [taskEstDays, setTaskEstDays] = useState('');
  const [taskCompletedDate, setTaskCompletedDate] = useState('');
  const [taskActualDays, setTaskActualDays] = useState('');
  const [taskIssueGen, setTaskIssueGen] = useState('None');
  const [taskIssueRes, setTaskIssueRes] = useState('N/A');
  const [taskResNotes, setTaskResNotes] = useState('');

  // Selected Project object
  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  // Auto-select first project if none is selected
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects]);

  // Reset project form
  const resetForm = () => {
    setName('');
    setLeadId('');
    setStatus('Planning');
    setDueDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 14 days out
    setDescription('');
    setAttachments([]);
    setEditId(null);
    setIsEditMode(false);
  };

  // Reset task form
  const resetTaskForm = () => {
    setTaskIdInput('');
    setTaskNameInput('');
    setTaskPhase('Phase 1: Concept');
    setTaskAssignedTo('');
    setTaskTeam('');
    setTaskPriority('Medium');
    setTaskStatus('Not Started');
    setTaskStartDate(new Date().toISOString().split('T')[0]);
    setTaskDeadline('');
    setTaskEstDays('');
    setTaskCompletedDate('');
    setTaskActualDays('');
    setTaskIssueGen('None');
    setTaskIssueRes('N/A');
    setResNotes('');
    setEditTaskId(null);
    setIsTaskEditMode(false);
  };

  // Open Edit Project Modal
  const handleOpenEdit = (project) => {
    setEditId(project.id);
    setName(project.name || '');
    setLeadId(project.leadId ? project.leadId.toString() : '');
    setStatus(project.status || 'Planning');
    setDueDate(project.dueDate || '');
    setDescription(project.description || '');
    setAttachments(project.attachments || []);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Submit Project Form
  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Project name is required');

    // Duplicate Project Check
    const isDuplicate = projects.some(p => 
      p.id !== editId &&
      p.name.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (isDuplicate) {
      alert(`Data Exists: A project named "${name}" is already in your database!`);
      return;
    }

    const projectData = {
      name: name.trim(),
      leadId: leadId ? parseInt(leadId) : null,
      status,
      dueDate,
      description: description.trim(),
      attachments,
      tasks: isEditMode ? (selectedProject.tasks || []) : []
    };

    try {
      if (isEditMode) {
        await db.projects.update(editId, projectData);
      } else {
        const id = await db.projects.add(projectData);
        setSelectedProjectId(id);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  };

  // Delete Project
  const handleDeleteProject = async (id) => {
    if (!confirm('Are you sure you want to delete this project and all its tasks?')) return;
    try {
      await db.projects.delete(id);
      setSelectedProjectId(null);
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  };

  // Submit Task (Create or Update)
  const handleSubmitTask = async (e) => {
    e.preventDefault();
    if (!taskIdInput.trim() || !taskNameInput.trim() || !selectedProject) return;

    const currentTasks = selectedProject.tasks || [];

    // Duplicate Task ID Check
    const isTaskDuplicate = currentTasks.some(t => 
      t.id !== editTaskId &&
      t.taskId.toLowerCase().trim() === taskIdInput.toLowerCase().trim()
    );

    if (isTaskDuplicate) {
      alert(`Data Exists: A task with ID "${taskIdInput}" already exists in this project!`);
      return;
    }

    const taskObj = {
      id: isTaskEditMode ? editTaskId : Date.now(),
      taskId: taskIdInput.trim(),
      title: taskNameInput.trim(),
      phase: taskPhase,
      assignedTo: taskAssignedTo.trim(),
      team: taskTeam.trim(),
      priority: taskPriority,
      status: taskStatus,
      startDate: taskStartDate,
      deadline: taskDeadline,
      estimatedDays: taskEstDays,
      completedDate: taskCompletedDate,
      actualDays: taskActualDays,
      issueGenerated: taskIssueGen.trim(),
      issueResolved: taskIssueRes.trim(),
      resolutionNotes: taskResNotes.trim()
    };

    let updatedTasks = [];
    if (isTaskEditMode) {
      updatedTasks = currentTasks.map(t => t.id === editTaskId ? taskObj : t);
    } else {
      updatedTasks = [...currentTasks, taskObj];
    }

    try {
      await db.projects.update(selectedProject.id, { tasks: updatedTasks });
      setIsTaskModalOpen(false);
      resetTaskForm();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Edit Task Modal
  const handleOpenEditTask = (task) => {
    setEditTaskId(task.id);
    setTaskIdInput(task.taskId || '');
    setTaskNameInput(task.title || '');
    setTaskPhase(task.phase || 'Phase 1: Concept');
    setTaskAssignedTo(task.assignedTo || '');
    setTaskTeam(task.team || '');
    setTaskPriority(task.priority || 'Medium');
    setTaskStatus(task.status || 'Not Started');
    setTaskStartDate(task.startDate || '');
    setTaskDeadline(task.deadline || '');
    setTaskEstDays(task.estimatedDays || '');
    setTaskCompletedDate(task.completedDate || '');
    setTaskActualDays(task.actualDays || '');
    setTaskIssueGen(task.issueGenerated || 'None');
    setTaskIssueRes(task.issueResolved || 'N/A');
    setTaskResNotes(task.resolutionNotes || '');
    setIsTaskEditMode(true);
    setIsTaskModalOpen(true);
  };

  // Move Task status directly from board controls
  const handleMoveTask = async (task, newStatus) => {
    if (!selectedProject) return;
    const updatedTasks = (selectedProject.tasks || []).map(t => {
      if (t.id === task.id) {
        return { ...t, status: newStatus };
      }
      return t;
    });

    try {
      await db.projects.update(selectedProject.id, { tasks: updatedTasks });
    } catch (err) {
      alert(err.message);
    }
  };

  // Remove Task
  const handleRemoveTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    if (!selectedProject) return;
    const updatedTasks = (selectedProject.tasks || []).filter(t => t.id !== taskId);

    try {
      await db.projects.update(selectedProject.id, { tasks: updatedTasks });
    } catch (err) {
      alert(err.message);
    }
  };

  // Helper: Get lead details
  const getLeadText = (id) => {
    const lead = leads.find(l => l.id === parseInt(id));
    return lead ? `${lead.name} (${lead.company || 'Private'})` : 'No Client Link';
  };

  // Calculate Progress Percent (Completed vs Total)
  const getProgress = (proj) => {
    if (!proj.tasks || proj.tasks.length === 0) return 0;
    const done = proj.tasks.filter(t => t.status === 'Completed').length;
    return Math.round((done / proj.tasks.length) * 100);
  };

  const statusColumns = ['Not Started', 'In Progress', 'Delayed', 'Completed'];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Project Workspaces</h1>
          <p className="page-subtitle">Organize project tasks, track milestones, and manage shared client assets.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => { resetForm(); setIsModalOpen(true); }}
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', height: '620px', alignItems: 'stretch' }}>
        
        {/* Left Side: Projects Directory List */}
        <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <span style={{ fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            Project Directory
          </span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projects.map(p => {
              const progress = getProgress(p);
              const isSelected = p.id === selectedProjectId;
              
              let statusColor = 'var(--color-info)';
              if (p.status === 'Completed') statusColor = 'var(--color-success)';
              if (p.status === 'On Hold') statusColor = 'var(--color-danger)';
              if (p.status === 'Active') statusColor = 'var(--accent-secondary)';

              return (
                <div 
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyOrigin: 'space-between', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {p.name}
                    </span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusColor }} />
                  </div>
                  
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {p.leadId ? getLeadText(p.leadId) : 'No client link'}
                  </span>

                  <div style={{ marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--bg-primary)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '99px', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                No projects active. Create one to start tracking.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Selected Project Workspace */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          {selectedProject ? (
            <>
              {/* Project Top Summary */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '800' }}>{selectedProject.name}</h2>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} style={{ color: 'var(--accent-primary)' }} /> 
                    {selectedProject.leadId ? getLeadText(selectedProject.leadId) : 'No client profile linked'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge ${selectedProject.status === 'Completed' ? 'badge-success' : selectedProject.status === 'On Hold' ? 'badge-danger' : selectedProject.status === 'Active' ? 'badge-info' : 'badge-warning'}`}>
                    {selectedProject.status}
                  </span>
                  <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => handleOpenEdit(selectedProject)}>
                    <Edit size={14} />
                  </button>
                  <button className="btn btn-danger" style={{ padding: '6px 10px', backgroundColor: 'transparent', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleDeleteProject(selectedProject.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Description & Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Project Scope</span>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {selectedProject.description || 'No project description added yet.'}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: '1px solid var(--border-color)', paddingLeft: '20px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>Due Date: <strong style={{ color: 'var(--text-primary)' }}>{selectedProject.dueDate || '—'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckSquare size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>Tasks Completed: <strong style={{ color: 'var(--text-primary)' }}>{getProgress(selectedProject)}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Tasks Kanban Board */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Task boards</span>
                  
                  {/* Open Task Creator Modal */}
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => { resetTaskForm(); setIsTaskModalOpen(true); }}
                  >
                    <Plus size={14} /> Add Task
                  </button>
                </div>

                {/* Sub-Kanban columns inside project workspace */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', minHeight: '260px' }}>
                  {statusColumns.map(tStatus => {
                    const statusTasks = (selectedProject.tasks || []).filter(t => t.status === tStatus);
                    let labelColor = 'var(--text-muted)';
                    if (tStatus === 'In Progress') labelColor = 'var(--accent-secondary)';
                    if (tStatus === 'Delayed') labelColor = 'var(--color-danger)';
                    if (tStatus === 'Completed') labelColor = 'var(--color-success)';

                    return (
                      <div key={tStatus} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '350px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', color: labelColor }}>
                          <span>{tStatus}</span>
                          <span>{statusTasks.length}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {statusTasks.map(task => {
                            let priBadge = 'badge-info';
                            if (task.priority === 'High') priBadge = 'badge-danger';
                            if (task.priority === 'Medium') priBadge = 'badge-warning';

                            return (
                              <div 
                                key={task.id} 
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                                onClick={() => handleOpenEditTask(task)}
                              >
                                <div style={{ display: 'flex', justifyOrigin: 'space-between', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                                  <span style={{ fontWeight: '700', color: 'var(--accent-primary)' }}>{task.taskId}</span>
                                  <span className={`badge ${priBadge}`} style={{ fontSize: '9px', padding: '2px 6px' }}>{task.priority}</span>
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>
                                  {task.title}
                                </span>
                                {task.phase && (
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{task.phase}</span>
                                )}
                                {task.assignedTo && (
                                  <div style={{ display: 'flex', justifyOrigin: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                    <span>👤 {task.assignedTo}</span>
                                    {task.issueGenerated && task.issueGenerated !== 'None' && (
                                      <span title={`Issue: ${task.issueGenerated}`} style={{ color: 'var(--color-danger)' }}><AlertTriangle size={12} /></span>
                                    )}
                                  </div>
                                )}
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '4px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                                  <button className="attachment-action-btn" onClick={() => handleRemoveTask(task.id)}>
                                    <Trash2 size={10} />
                                  </button>
                                  <div style={{ display: 'flex', gap: '2px' }}>
                                    {tStatus !== 'Not Started' && (
                                      <button className="attachment-action-btn" onClick={() => {
                                        const idx = statusColumns.indexOf(tStatus);
                                        handleMoveTask(task, statusColumns[idx - 1]);
                                      }}>
                                        <ArrowLeft size={10} />
                                      </button>
                                    )}
                                    {tStatus !== 'Completed' && (
                                      <button className="attachment-action-btn" onClick={() => {
                                        const idx = statusColumns.indexOf(tStatus);
                                        handleMoveTask(task, statusColumns[idx + 1]);
                                      }}>
                                        <ArrowRight size={10} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shared Assets & Document Attachments */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
                  Project Resource Files
                </span>
                <AttachmentsArea 
                  attachments={selectedProject.attachments || []}
                  onAddAttachment={async (file) => {
                    const list = [...(selectedProject.attachments || []), file];
                    await db.projects.update(selectedProject.id, { attachments: list });
                  }}
                  onRemoveAttachment={async (index) => {
                    const list = [...(selectedProject.attachments || [])];
                    list.splice(index, 1);
                    await db.projects.update(selectedProject.id, { attachments: list });
                  }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '12px' }}>
              <Briefcase size={40} />
              <span>Please select a project from the directory or create a new one to begin.</span>
            </div>
          )}
        </div>

      </div>

      {/* Creation and Edit Project Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">{isEditMode ? 'Edit Project Profile' : 'Initialize Project'}</span>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmitProject}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Website Redesign v2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Associate Client / Lead</label>
                    <select 
                      className="form-select"
                      value={leadId}
                      onChange={(e) => setLeadId(e.target.value)}
                    >
                      <option value="">No linked Client</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.company || 'Private'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Planning">Planning</option>
                      <option value="Active">Active</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Completion Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Project Scope / Overview</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Document boundaries, deliverables, key tasks, or contact references..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Upload attachment dropzone */}
                <div className="form-group">
                  <label className="form-label">Project Resource Attachments (Specs, Drafts, Assets)</label>
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
                <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Changes' : 'Launch Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation & Edit Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <span className="modal-title">{isTaskEditMode ? 'Edit Task Details' : 'Register Project Task'}</span>
              <button className="modal-close-btn" onClick={() => setIsTaskModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmitTask}>
              <div className="modal-body">
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Task ID *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. ICS-001"
                      value={taskIdInput}
                      onChange={(e) => setTaskIdInput(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Task Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Weekly Planning Meeting"
                      value={taskNameInput}
                      onChange={(e) => setTaskNameInput(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phase</label>
                    <select 
                      className="form-select"
                      value={taskPhase}
                      onChange={(e) => setTaskPhase(e.target.value)}
                    >
                      <option value="Phase 1: Concept">Phase 1: Concept</option>
                      <option value="Phase 2: Blockout">Phase 2: Blockout</option>
                      <option value="Phase 3: Visual Dev">Phase 3: Visual Dev</option>
                      <option value="Phase 4: Social & PR">Phase 4: Social & PR</option>
                      <option value="Phase 5: Ops & Coord">Phase 5: Ops & Coord</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select 
                      className="form-select"
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assigned To</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Rahul, Aryan"
                      value={taskAssignedTo}
                      onChange={(e) => setTaskAssignedTo(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Team</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Full Team, Dev Team, 3D Team"
                      value={taskTeam}
                      onChange={(e) => setTaskTeam(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      className="form-select"
                      value={taskStatus}
                      onChange={(e) => setTaskStatus(e.target.value)}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Delayed">Delayed</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={taskStartDate}
                      onChange={(e) => setTaskStartDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={taskDeadline}
                      onChange={(e) => setTaskDeadline(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Est. Days</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 5"
                      value={taskEstDays}
                      onChange={(e) => setTaskEstDays(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Completed Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={taskCompletedDate}
                      onChange={(e) => setTaskCompletedDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Actual Days</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 6"
                      value={taskActualDays}
                      onChange={(e) => setTaskActualDays(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Issue Generated</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. None, or description of issue"
                      value={taskIssueGen}
                      onChange={(e) => setTaskIssueGen(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Issue Resolved</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. N/A, or details"
                      value={taskIssueRes}
                      onChange={(e) => setTaskIssueRes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Resolution Notes / Description</label>
                  <textarea 
                    className="form-textarea" 
                    placeholder="Details of solution or general task notes..."
                    value={taskResNotes}
                    onChange={(e) => setTaskResNotes(e.target.value)}
                  />
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isTaskEditMode ? 'Save Edits' : 'Register Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
