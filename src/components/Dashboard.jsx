import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Users, 
  BookOpen, 
  Briefcase, 
  CheckSquare, 
  Clock, 
  ArrowRight,
  Plus,
  Sparkles,
  Link2,
  FolderKanban,
  FileText,
  ExternalLink,
  Info
} from 'lucide-react';

export default function Dashboard({ setActiveTab, setSelectedItemId }) {
  // Query all database data reactively using Dexie hooks
  const leads = useLiveQuery(() => db.leads.toArray()) || [];
  const notes = useLiveQuery(() => db.notesPages.toArray()) || [];
  const projects = useLiveQuery(() => db.projects.toArray()) || [];
  const jobs = useLiveQuery(() => db.jobs.toArray()) || [];

  // Summary Stat Calculations
  const activeLeadsCount = leads.filter(l => l.status !== 'Unqualified').length;
  const notesCount = notes.length;
  const activeProjectsCount = projects.filter(p => p.status !== 'Completed').length;
  const activeJobAppsCount = jobs.filter(j => j.status !== 'Rejected').length;

  // QUICK ADD Form states
  const [qaCategory, setQaCategory] = useState('leads');
  const [qaName, setQaName] = useState('');
  const [qaCompany, setQaCompany] = useState('');
  const [qaUrl, setQaUrl] = useState('');
  const [qaNotes, setQaNotes] = useState('');
  const [isScraping, setIsScraping] = useState(false);

  // Link Scraper pre-fill engine
  const handleFetchLinkInfo = async () => {
    if (!qaUrl) {
      alert('Please paste a link first!');
      return;
    }
    setIsScraping(true);
    try {
      const res = await window.api.scrapeLink(qaUrl);
      if (res && !res.error) {
        if (res.title) setQaName(res.title);
        if (res.description) setQaNotes(res.description);
        if (res.hostname && !qaCompany) {
          // Guess company from domain name capitalization
          const part = res.hostname.split('.')[0];
          setQaCompany(part.charAt(0).toUpperCase() + part.slice(1));
        }
      } else {
        alert(`Could not extract page info: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Scraper error: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  // Add to tracker database save handler
  const handleAddQuickAdd = async (e) => {
    e.preventDefault();
    if (!qaName) {
      alert('Please enter a Name or Title!');
      return;
    }

    const isPlaceholder = (val) => {
      if (!val) return true;
      const clean = val.toString().toLowerCase().trim();
      return clean === '' || 
             clean === 'na' || 
             clean === 'n/a' || 
             clean === 'not available' || 
             clean === 'none' || 
             clean === 'no' || 
             clean === '—' || 
             clean === '-';
    };

    try {
      if (qaCategory === 'leads') {
        const duplicateLead = leads.find(l => 
          !isPlaceholder(qaName) && !isPlaceholder(l.name) &&
          l.name.toLowerCase().trim() === qaName.toLowerCase().trim()
        );
        if (duplicateLead) {
          const proceed = confirm(`Warning: A lead with Name "${qaName}" already exists in the database. Do you still want to save?`);
          if (!proceed) return;
        }

        await db.leads.add({
          name: qaName,
          company: qaCompany || 'Individual',
          type: 'Lead Profile',
          phone: '',
          email: '',
          link: qaUrl,
          notes: qaNotes || 'Added via Quick Add.',
          value: 0,
          status: 'New',
          source: 'Quick Add',
          attachments: [],
          createdDate: new Date().toISOString()
        });
      } else if (qaCategory === 'notes') {
        const duplicateNote = notes.find(n => 
          !isPlaceholder(qaName) && !isPlaceholder(n.title) &&
          n.title.toLowerCase().trim() === qaName.toLowerCase().trim()
        );
        if (duplicateNote) {
          const proceed = confirm(`Warning: A note page titled "${qaName}" already exists. Do you still want to save?`);
          if (!proceed) return;
        }

        await db.notesPages.add({
          title: qaName,
          blocks: [
            { id: Math.random().toString(36).substring(7), type: 'h1', content: qaName },
            { id: Math.random().toString(36).substring(7), type: 'p', content: qaNotes || 'Notes details...' },
            { id: Math.random().toString(36).substring(7), type: 'p', content: qaUrl ? `Link: ${qaUrl}` : '' }
          ],
          updatedDate: new Date().toISOString()
        });
      } else if (qaCategory === 'projects') {
        const duplicateProject = projects.find(p => 
          !isPlaceholder(qaName) && !isPlaceholder(p.name) &&
          p.name.toLowerCase().trim() === qaName.toLowerCase().trim()
        );
        if (duplicateProject) {
          const proceed = confirm(`Warning: A project named "${qaName}" already exists. Do you still want to save?`);
          if (!proceed) return;
        }

        await db.projects.add({
          name: qaName,
          status: 'Planning',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week due date
          tasks: qaNotes ? [{ id: Math.random().toString(36).substring(7), name: qaNotes, status: 'todo' }] : []
        });
      } else if (qaCategory === 'jobs') {
        const duplicateJob = jobs.find(j => 
          !isPlaceholder(qaName) && !isPlaceholder(j.title) &&
          j.title.toLowerCase().trim() === qaName.toLowerCase().trim() &&
          !isPlaceholder(qaCompany) && !isPlaceholder(j.company) &&
          j.company.toLowerCase().trim() === qaCompany.toLowerCase().trim()
        );
        if (duplicateJob) {
          const proceed = confirm(`Warning: A job application for "${qaName}" at "${qaCompany || 'Direct Client'}" already exists. Do you still want to save?`);
          if (!proceed) return;
        }

        await db.jobs.add({
          title: qaName,
          company: qaCompany || 'Direct Client',
          url: qaUrl,
          status: 'Applied',
          salary: '',
          location: 'Remote',
          description: qaNotes || 'Imported via Quick Add.',
          dateApplied: new Date().toISOString().split('T')[0],
          applySite: qaUrl ? new URL(qaUrl).hostname : 'Direct',
          followUpDate: '',
          interviewDate: '',
          contactPerson: '',
          attachments: [],
          timeline: [
            { date: new Date().toISOString().split('T')[0], event: 'Application Created', note: 'Added via Quick Add.' }
          ]
        });
      }

      // Reset form fields
      setQaName('');
      setQaCompany('');
      setQaUrl('');
      setQaNotes('');
      
      alert('Record added successfully to tracker!');
    } catch (err) {
      alert(`Failed to add record: ${err.message}`);
    }
  };

  // Compile unified activity feed logs
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const list = [];
    
    leads.slice(-4).forEach(l => {
      list.push({
        type: 'lead',
        text: `Lead Profile: "${l.name}" added`,
        time: new Date(l.createdDate || Date.now()),
        rawId: l.id
      });
    });

    notes.slice(-4).forEach(n => {
      list.push({
        type: 'note',
        text: `Notes: "${n.title || 'Untitled Page'}" updated`,
        time: new Date(n.updatedDate || Date.now()),
        rawId: n.id
      });
    });

    jobs.slice(-4).forEach(j => {
      list.push({
        type: 'job',
        text: `Job App: "${j.title}" at ${j.company} - ${j.status}`,
        time: new Date(j.dateApplied || Date.now()),
        rawId: j.id
      });
    });

    projects.slice(-4).forEach(p => {
      list.push({
        type: 'project',
        text: `Project: "${p.name}" updated`,
        time: new Date(p.dueDate || Date.now()),
        rawId: p.id
      });
    });

    // Sort chronologically (most recent first)
    list.sort((a, b) => b.time - a.time);
    setActivities(list.slice(0, 7));
  }, [leads, notes, jobs, projects]);

  // Mini Pipeline grouping calculations
  const appliedJobs = jobs.filter(j => j.status === 'Applied').slice(0, 3);
  const interviewingJobs = jobs.filter(j => j.status === 'Interviewing').slice(0, 3);
  const offerJobs = jobs.filter(j => j.status === 'Offer').slice(0, 3);

  const newLeads = leads.filter(l => l.status === 'New').slice(0, 3);
  const contactedLeads = leads.filter(l => l.status === 'Contacted').slice(0, 3);
  const qualifiedLeads = leads.filter(l => l.status === 'Qualified').slice(0, 3);

  // Project task progress tracker
  const getProjectProgress = (p) => {
    if (!p.tasks || p.tasks.length === 0) return 0;
    const completed = p.tasks.filter(t => t.status === 'done').length;
    return Math.round((completed / p.tasks.length) * 100);
  };

  return (
    <div className="dashboard-layout-wrapper">
      
      {/* LEFT PANEL - QUICK ADD & ACTIVITY STREAM */}
      <div className="dashboard-left-panel">
        
        {/* QUICK ADD WIDGET */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
            QUICK ADD
          </h2>
          
          <form onSubmit={handleAddQuickAdd} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Paste Link input */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Link2 size={13} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Paste URL..." 
                  style={{ paddingLeft: '28px', fontSize: '12px', padding: '6px 10px 6px 28px' }}
                  value={qaUrl}
                  onChange={(e) => setQaUrl(e.target.value)}
                />
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '6px 10px', fontSize: '11px', flexShrink: 0 }}
                onClick={handleFetchLinkInfo}
                disabled={isScraping}
              >
                {isScraping ? 'Scraping...' : 'Fetch Info'}
              </button>
            </div>

            {/* Name/Title */}
            <div className="form-group">
              <input 
                type="text" 
                className="form-input" 
                placeholder="Name or Title..." 
                style={{ fontSize: '12px', padding: '8px 10px' }}
                value={qaName}
                onChange={(e) => setQaName(e.target.value)}
                required
              />
            </div>

            {/* Category Select */}
            <div className="form-group">
              <select 
                className="form-select" 
                style={{ fontSize: '12px', padding: '6px 10px' }}
                value={qaCategory}
                onChange={(e) => setQaCategory(e.target.value)}
              >
                <option value="leads">Category: Leads CRM</option>
                <option value="notes">Category: Notes Workspace</option>
                <option value="projects">Category: Projects Space</option>
                <option value="jobs">Category: Job Applications</option>
              </select>
            </div>

            {/* Company / Context */}
            {['leads', 'jobs'].includes(qaCategory) && (
              <div className="form-group">
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Company / Employer..." 
                  style={{ fontSize: '12px', padding: '8px 10px' }}
                  value={qaCompany}
                  onChange={(e) => setQaCompany(e.target.value)}
                />
              </div>
            )}

            {/* Notes / Description */}
            <div className="form-group">
              <textarea 
                className="form-textarea" 
                placeholder="Notes or Description details..." 
                style={{ fontSize: '12px', padding: '8px 10px', minHeight: '60px' }}
                value={qaNotes}
                onChange={(e) => setQaNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}>
              <Plus size={14} /> ADD TO TRACKER
            </button>
          </form>
        </div>

        {/* UNIFIED SCROLLING ACTIVITY STREAM */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1 }}>
          <h2 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: 'var(--accent-secondary)' }} />
            GLOBAL FEED
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '350px', paddingRight: '4px' }}>
            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                No recent activity logged.
              </div>
            ) : (
              activities.map((act, index) => {
                const dateStr = act.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                let iconColor = 'var(--accent-primary)';
                if (act.type === 'note') iconColor = 'var(--color-success)';
                if (act.type === 'project') iconColor = 'var(--accent-secondary)';
                if (act.type === 'job') iconColor = 'var(--color-warning)';

                return (
                  <div 
                    key={index} 
                    className="activity-item" 
                    onClick={() => {
                      if (act.type === 'lead') { setActiveTab('leads'); if (act.rawId) setSelectedItemId(act.rawId); }
                      else if (act.type === 'note') { setActiveTab('notes'); }
                      else if (act.type === 'project') { setActiveTab('projects'); }
                      else if (act.type === 'job') { setActiveTab('jobs'); if (act.rawId) setSelectedItemId(act.rawId); }
                    }}
                    style={{ cursor: 'pointer', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '10px', alignItems: 'center' }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: iconColor, flexShrink: 0 }} />
                    <div style={{ flexGrow: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {act.text}
                      </p>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{dateStr}</span>
                    </div>
                    <ArrowRight size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT PANEL - SUMMARY & WORKSPACE PIPELINES */}
      <div className="dashboard-right-panel">
        
        {/* KPI Top Summary Cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div className="glass-card stat-card" onClick={() => setActiveTab('leads')} style={{ cursor: 'pointer', padding: '16px' }}>
            <div className="stat-header">
              <span className="stat-label" style={{ fontSize: '11px' }}>Total Leads</span>
              <div className="stat-icon" style={{ width: '32px', height: '32px' }}><Users size={16} /></div>
            </div>
            <span className="stat-value" style={{ fontSize: '24px' }}>{activeLeadsCount}</span>
          </div>

          <div className="glass-card stat-card" onClick={() => setActiveTab('notes')} style={{ cursor: 'pointer', padding: '16px' }}>
            <div className="stat-header">
              <span className="stat-label" style={{ fontSize: '11px' }}>Workspace Notes</span>
              <div className="stat-icon" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}><BookOpen size={16} /></div>
            </div>
            <span className="stat-value" style={{ fontSize: '24px', color: 'var(--color-success)' }}>{notesCount}</span>
          </div>

          <div className="glass-card stat-card" onClick={() => setActiveTab('projects')} style={{ cursor: 'pointer', padding: '16px' }}>
            <div className="stat-header">
              <span className="stat-label" style={{ fontSize: '11px' }}>Active Projects</span>
              <div className="stat-icon" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-secondary)' }}><FolderKanban size={16} /></div>
            </div>
            <span className="stat-value" style={{ fontSize: '24px' }}>{activeProjectsCount}</span>
          </div>

          <div className="glass-card stat-card" onClick={() => setActiveTab('jobs')} style={{ cursor: 'pointer', padding: '16px' }}>
            <div className="stat-header">
              <span className="stat-label" style={{ fontSize: '11px' }}>Job Trackings</span>
              <div className="stat-icon" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}><Briefcase size={16} /></div>
            </div>
            <span className="stat-value" style={{ fontSize: '24px' }}>{activeJobAppsCount}</span>
          </div>
        </div>

        {/* WORKSPACE PIPELINES FLEX GRID */}
        <div className="dashboard-pipelines-grid">
          
          {/* JOB APPLICATION PIPELINE */}
          <div className="mini-pipeline-column">
            <div className="mini-pipeline-header">
              <span>JOBS PIPELINE</span>
              <Briefcase size={14} style={{ color: 'var(--color-warning)' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {jobs.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No jobs recorded.</div>
              ) : (
                jobs.slice(-5).reverse().map(j => {
                  let statusColor = 'var(--text-muted)';
                  if (j.status === 'Interviewing') statusColor = 'var(--color-warning)';
                  if (j.status === 'Offer') statusColor = 'var(--color-success)';
                  if (j.status === 'Rejected') statusColor = 'var(--color-danger)';
                  if (j.status === 'Applied') statusColor = 'var(--accent-primary)';

                  return (
                    <div 
                      key={j.id} 
                      className="mini-pipeline-card"
                      onClick={() => { setActiveTab('jobs'); setSelectedItemId(j.id); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="mini-card-title">{j.title}</div>
                      <div className="mini-card-subtitle">{j.company}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '9px', color: statusColor, fontWeight: '700', textTransform: 'uppercase' }}>{j.status}</span>
                        {j.salary && <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{j.salary}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* LEADS CRM PIPELINE */}
          <div className="mini-pipeline-column">
            <div className="mini-pipeline-header">
              <span>LEADS CRM</span>
              <Users size={14} style={{ color: 'var(--accent-primary)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {leads.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No leads tracked.</div>
              ) : (
                leads.slice(-5).reverse().map(l => {
                  let statusColor = 'var(--accent-primary)';
                  if (l.status === 'Qualified') statusColor = 'var(--color-success)';
                  if (l.status === 'Unqualified') statusColor = 'var(--color-danger)';
                  if (l.status === 'Nurturing') statusColor = 'var(--color-warning)';

                  return (
                    <div 
                      key={l.id} 
                      className="mini-pipeline-card"
                      onClick={() => { setActiveTab('leads'); setSelectedItemId(l.id); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="mini-card-title">{l.name}</div>
                      <div className="mini-card-subtitle">{l.company}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '9px', color: statusColor, fontWeight: '700', textTransform: 'uppercase' }}>{l.status}</span>
                        {l.value > 0 && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>${l.value.toLocaleString()}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE PROJECTS PROGRESS */}
          <div className="mini-pipeline-column" style={{ maxHeight: '480px' }}>
            <div className="mini-pipeline-header">
              <span>PROJECT PROGRESS</span>
              <FolderKanban size={14} style={{ color: 'var(--accent-secondary)' }} />
            </div>

            <div className="mini-project-list">
              {projects.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No projects created.</div>
              ) : (
                projects.slice(-4).map(p => {
                  const percent = getProjectProgress(p);
                  return (
                    <div 
                      key={p.id} 
                      className="mini-project-card"
                      onClick={() => setActiveTab('projects')}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="mini-project-header">
                        <span className="mini-project-name">{p.name}</span>
                        <span className="mini-project-progress-text">{percent}%</span>
                      </div>
                      <div className="mini-project-progress-bar-container">
                        <div 
                          className="mini-project-progress-bar-fill"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
