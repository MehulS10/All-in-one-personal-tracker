import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LeadsTracker from './components/LeadsTracker';
import NotionWorkspace from './components/NotionWorkspace';
import ProjectManager from './components/ProjectManager';
import JobTracker from './components/JobTracker';
import { db } from './db';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FolderKanban, 
  Briefcase, 
  Sun, 
  Moon, 
  Activity,
  Minus,
  Square,
  X,
  Download,
  Database,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // States for selected items when navigating from dashboard
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);

  // Sync theme to document element attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Frameless Window Handlers
  const handleMinimize = () => {
    window.api.minimize();
  };

  const handleMaximize = () => {
    window.api.maximize();
  };

  const handleClose = () => {
    window.api.close();
  };

  // System Backup & Export Handlers
  const exportToExcel = async () => {
    try {
      const leadsData = await db.leads.toArray();
      const jobsData = await db.jobs.toArray();
      const projectsData = await db.projects.toArray();
      const notesData = await db.notesPages.toArray();

      const wb = XLSX.utils.book_new();

      // 1. Leads CRM sheet
      const leadsRows = leadsData.map(l => ({
        Name: l.name,
        Company: l.company || '—',
        Category: l.type || '—',
        Phone: l.phone || '—',
        Email: l.email || '—',
        Website: l.link || '—',
        Status: l.status,
        'Est. Value ($)': l.value || 0,
        Source: l.source || '—',
        Location: l.location || 'General',
        'Date Added': l.createdDate ? new Date(l.createdDate).toLocaleDateString() : '—'
      }));
      const wsLeads = XLSX.utils.json_to_sheet(leadsRows);
      XLSX.utils.book_append_sheet(wb, wsLeads, 'Leads CRM');

      // 2. Job Tracker sheet
      const jobsRows = jobsData.map(j => ({
        Company: j.company,
        'Job Position': j.title,
        'JD Link': j.url || '—',
        Status: j.status,
        Salary: j.salary || '—',
        'Date Applied': j.dateApplied || '—',
        'Apply Platform': j.applySite || '—',
        Location: j.location || 'Remote',
        'Contact Person': j.contactPerson || '—',
        'Follow-up Date': j.followUpDate || '—',
        'Interview Date': j.interviewDate || '—',
        Notes: j.description || '—'
      }));
      const wsJobs = XLSX.utils.json_to_sheet(jobsRows);
      XLSX.utils.book_append_sheet(wb, wsJobs, 'Job Tracker');

      // 3. Projects sheet
      const projectsRows = projectsData.map(p => {
        const client = leadsData.find(l => l.id === p.leadId);
        const clientText = client ? `${client.name} (${client.company || 'Private'})` : 'No Client Link';
        const total = p.tasks ? p.tasks.length : 0;
        const done = p.tasks ? p.tasks.filter(t => t.status === 'Completed').length : 0;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        return {
          'Project Name': p.name,
          Status: p.status,
          'Due Date': p.dueDate || '—',
          'Linked Client': clientText,
          'Progress (%)': percent,
          'Total Tasks': total,
          'Tasks Completed': done,
          Scope: p.description || '—'
        };
      });
      const wsProjects = XLSX.utils.json_to_sheet(projectsRows);
      XLSX.utils.book_append_sheet(wb, wsProjects, 'Projects Workspace');

      // 4. Notes Workspace sheet
      const notesRows = notesData.map(n => {
        const plainText = (n.blocks || [])
          .map(b => {
            if (b.type === 'table') {
              return `[Table Headers: ${b.headers.join(' | ')}]\n` + b.rows.map(r => r.join(' | ')).join('\n');
            }
            return b.content || '';
          })
          .filter(Boolean)
          .join('\n\n');

        return {
          'Page Title': n.title || 'Untitled Page',
          'Last Updated': n.updatedDate ? new Date(n.updatedDate).toLocaleString() : '—',
          'Blocks Count': n.blocks ? n.blocks.length : 0,
          Content: plainText
        };
      });
      const wsNotes = XLSX.utils.json_to_sheet(notesRows);
      XLSX.utils.book_append_sheet(wb, wsNotes, 'Notes Workspace');

      const defaultName = `OmniTrack_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const filePath = await window.api.saveDialog({
        title: 'Export all data to Excel Workbook',
        defaultPath: defaultName,
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
      });

      if (!filePath) return;

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
      const res = await window.api.writeFileBinary(filePath, wbout);
      
      if (res && res.success) {
        alert(`Export completed successfully!\n\nFile saved to: ${filePath}`);
      } else {
        alert(`Failed to save Excel file: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Excel export failed: ${err.message}`);
    }
  };

  const exportToJson = async () => {
    try {
      const leadsData = await db.leads.toArray();
      const jobsData = await db.jobs.toArray();
      const projectsData = await db.projects.toArray();
      const notesData = await db.notesPages.toArray();

      const backup = {
        app: 'OmniTrack',
        version: 2,
        exportedAt: new Date().toISOString(),
        tables: {
          leads: leadsData,
          jobs: jobsData,
          projects: projectsData,
          notesPages: notesData
        }
      };

      const defaultName = `OmniTrack_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = await window.api.saveDialog({
        title: 'Export JSON Database Backup',
        defaultPath: defaultName,
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      });

      if (!filePath) return;

      const jsonStr = JSON.stringify(backup, null, 2);
      const res = await window.api.writeFileText(filePath, jsonStr);
      
      if (res && res.success) {
        alert(`System backup saved successfully!\n\nFile saved to: ${filePath}`);
      } else {
        alert(`Failed to save backup file: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`JSON export failed: ${err.message}`);
    }
  };

  const exportToHtml = async () => {
    try {
      const leadsData = await db.leads.toArray();
      const jobsData = await db.jobs.toArray();
      const projectsData = await db.projects.toArray();
      const notesData = await db.notesPages.toArray();

      const leadsRowsHtml = leadsData.map(l => `
        <tr>
          <td><strong>${l.name}</strong></td>
          <td>${l.company || '—'}</td>
          <td>${l.type || '—'}</td>
          <td>${l.email || '—'}<br><small>${l.phone || '—'}</small></td>
          <td><span class="badge status-${l.status.toLowerCase()}">${l.status}</span></td>
          <td>${l.value ? `$${l.value.toLocaleString()}` : '—'}</td>
          <td>${l.location || 'General'}</td>
        </tr>
      `).join('');

      const jobsRowsHtml = jobsData.map(j => `
        <tr>
          <td><strong>${j.company}</strong></td>
          <td>${j.title}</td>
          <td><span class="badge status-${j.status.toLowerCase()}">${j.status}</span></td>
          <td>${j.salary || '—'}</td>
          <td>${j.dateApplied || '—'}</td>
          <td>${j.location || 'Remote'}</td>
        </tr>
      `).join('');

      const projectsHtml = projectsData.map(p => {
        const client = leadsData.find(l => l.id === p.leadId);
        const clientText = client ? `${client.name} (${client.company || 'Private'})` : 'No Client Link';
        const tasksHtml = (p.tasks || []).map(t => `
          <div class="task-item">
            <span class="task-status status-${t.status.toLowerCase().replace(' ', '')}">${t.status}</span>
            <strong>${t.taskId || ''}</strong> ${t.title}
          </div>
        `).join('');

        return `
          <div class="card">
            <h3>${p.name} <span class="badge status-${p.status.toLowerCase()}">${p.status}</span></h3>
            <p><strong>Client Link:</strong> ${clientText} | <strong>Due Date:</strong> ${p.dueDate || '—'}</p>
            <p>${p.description || 'No description scope.'}</p>
            <div class="task-list">
              <strong>Milestone Board / Tasks:</strong>
              ${tasksHtml || '<p style="color: #64748b; font-style: italic;">No tasks created.</p>'}
            </div>
          </div>
        `;
      }).join('');

      const notesHtml = notesData.map(n => {
        const contentHtml = (n.blocks || []).map(b => {
          if (b.type === 'h1') return `<h1>${b.content}</h1>`;
          if (b.type === 'h2') return `<h2>${b.content}</h2>`;
          if (b.type === 'ul') return `<ul><li>${b.content}</li></ul>`;
          if (b.type === 'table') {
            const tableHeaders = b.headers.map(h => `<th>${h}</th>`).join('');
            const tableRows = b.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
            return `<table class="report-table"><thead><tr>${tableHeaders}</tr></thead><tbody>${tableRows}</tbody></table>`;
          }
          return `<p>${b.content}</p>`;
        }).join('');

        return `
          <div class="card">
            <h3>📂 ${n.title || 'Untitled Document'}</h3>
            <small style="color: #64748b;">Last Updated: ${n.updatedDate ? new Date(n.updatedDate).toLocaleString() : '—'}</small>
            <div style="margin-top: 12px; line-height: 1.6;">
              ${contentHtml || '<p style="color: #64748b; font-style: italic;">Document has no blocks.</p>'}
            </div>
          </div>
        `;
      }).join('');

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OmniTrack Workspace Report Summary</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 40px;
      padding: 0;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      color: #0ea5e9;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 5px 0 0 0;
      color: #64748b;
    }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 8px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .report-table th, .report-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .report-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-new, .status-applied { background: #e0f2fe; color: #0369a1; }
    .status-contacted, .status-nurturing, .status-interviewing { background: #fef3c7; color: #b45309; }
    .status-qualified, .status-completed, .status-offer, .status-active { background: #dcfce7; color: #15803d; }
    .status-unqualified, .status-rejected, .status-onhold, .status-delayed { background: #fee2e2; color: #b91c1c; }
    .card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .card h3 {
      margin-top: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .task-list {
      margin-top: 15px;
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .task-item {
      padding: 6px 0;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .task-item:last-child {
      border-bottom: none;
    }
    .task-status {
      font-size: 9px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .task-status.status-completed { background: #dcfce7; color: #15803d; }
    .task-status.status-inprogress { background: #e0f2fe; color: #0369a1; }
    .task-status.status-delayed { background: #fee2e2; color: #b91c1c; }
    .task-status.status-notstarted { background: #f1f5f9; color: #475569; }
    @media print {
      body { margin: 20px; background-color: white; }
      .card, .report-table { box-shadow: none; border: 1px solid #cbd5e1; }
      .header { border-bottom: 1px solid #cbd5e1; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>OmniTrack Workspace Report Summary</h1>
        <p>Generated on ${new Date().toLocaleDateString()} | Local Database Data</p>
      </div>
      <div>
        <strong style="color: #64748b; font-size: 13px;">OmniTrack OS Systems</strong>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Leads Directory</div>
      ${leadsRowsHtml ? `
      <table class="report-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Company</th>
            <th>Type</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Est. Value</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${leadsRowsHtml}
        </tbody>
      </table>
      ` : '<p style="color: #64748b; font-style: italic;">No leads recorded.</p>'}
    </div>

    <div class="section">
      <div class="section-title">Job Applications</div>
      ${jobsRowsHtml ? `
      <table class="report-table">
        <thead>
          <tr>
            <th>Employer</th>
            <th>Position</th>
            <th>Status</th>
            <th>Salary</th>
            <th>Date Applied</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${jobsRowsHtml}
        </tbody>
      </table>
      ` : '<p style="color: #64748b; font-style: italic;">No job tracking logs.</p>'}
    </div>

    <div class="section">
      <div class="section-title">Projects Workspaces</div>
      ${projectsHtml || '<p style="color: #64748b; font-style: italic;">No active projects.</p>'}
    </div>

    <div class="section">
      <div class="section-title">Notes Workspace Documents</div>
      ${notesHtml || '<p style="color: #64748b; font-style: italic;">No notes created.</p>'}
    </div>

  </div>
</body>
</html>
      `;

      const defaultName = `OmniTrack_Report_${new Date().toISOString().split('T')[0]}.html`;
      const filePath = await window.api.saveDialog({
        title: 'Export Workspace HTML Summary Report',
        defaultPath: defaultName,
        filters: [{ name: 'HTML Report', extensions: ['html'] }]
      });

      if (!filePath) return;

      const res = await window.api.writeFileText(filePath, htmlContent);
      if (res && res.success) {
        alert(`HTML summary report exported successfully!\n\nFile saved to: ${filePath}\n\nNote: You can open this file in any web browser and press Ctrl+P to save as a PDF!`);
      } else {
        alert(`Failed to save HTML report: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`HTML export failed: ${err.message}`);
    }
  };

  // Switch tabs and handle deep links
  const handleNavigateToLead = (id) => {
    setSelectedLeadId(id);
    setActiveTab('leads');
  };

  const handleNavigateToJob = (id) => {
    setSelectedJobId(id);
    setActiveTab('jobs');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            setActiveTab={setActiveTab} 
            setSelectedItemId={(id) => {
              // Deduce which module to open based on recent activity click
              // We'll set the appropriate select state in App level
              setSelectedLeadId(id);
              setSelectedJobId(id);
            }} 
          />
        );
      case 'leads':
        return (
          <LeadsTracker 
            selectedLeadId={selectedLeadId} 
            setSelectedLeadId={setSelectedLeadId} 
          />
        );
      case 'notes':
        return <NotionWorkspace />;
      case 'projects':
        return <ProjectManager />;
      case 'jobs':
        return (
          <JobTracker 
            selectedJobId={selectedJobId} 
            setSelectedJobId={setSelectedJobId} 
          />
        );
      default:
        return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Frameless Custom Window Titlebar */}
      <header className="titlebar">
        <div className="titlebar-logo">
          <Activity size={16} />
          <span>OMNITRACK</span>
        </div>
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={handleMinimize} title="Minimize">
            <Minus size={14} />
          </button>
          <button className="titlebar-btn" onClick={handleMaximize} title="Maximize">
            <Square size={10} />
          </button>
          <button className="titlebar-btn close" onClick={handleClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Top Navigation Bar */}
      <nav className="top-nav">
        <div className="top-nav-menu">
          <div 
            className={`top-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); }}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </div>

          <div 
            className={`top-nav-item ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => { setActiveTab('leads'); setSelectedLeadId(null); }}
          >
            <Users size={16} />
            <span>Leads CRM</span>
          </div>

          <div 
            className={`top-nav-item ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => { setActiveTab('notes'); }}
          >
            <BookOpen size={16} />
            <span>Notes Workspace</span>
          </div>

          <div 
            className={`top-nav-item ${activeTab === 'projects' ? 'active' : ''}`}
            onClick={() => { setActiveTab('projects'); }}
          >
            <FolderKanban size={16} />
            <span>Projects Workspace</span>
          </div>

          <div 
            className={`top-nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => { setActiveTab('jobs'); setSelectedJobId(null); }}
          >
            <Briefcase size={16} />
            <span>Job Tracker</span>
          </div>
        </div>

        {/* Top Nav Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="theme-toggle-btn"
            onClick={() => setIsExportModalOpen(true)}
            title="Export Data & Backups"
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Download size={18} />
          </button>
          <button 
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle UI Theme"
            style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Offline Database
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="app-container" style={{ display: 'block', height: 'calc(100vh - var(--titlebar-height) - 56px)' }}>
        {/* Dynamic Main Workspace Viewport */}
        <main className="main-content" style={{ height: '100%', overflowY: 'auto' }}>
          {renderContent()}
        </main>
      </div>

      {/* Backup & Export Studio Modal */}
      {isExportModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} style={{ color: 'var(--accent-primary)' }} />
                Data Backup & Export Studio
              </span>
              <button className="modal-close-btn" onClick={() => setIsExportModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0' }}>
                Export your offline database to external standard formats for report compilations, audits, or backup copies. Select a format below:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Excel Option */}
                <div 
                  onClick={exportToExcel}
                  className="glass-card"
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-success)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileSpreadsheet size={22} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>Export to Excel Workbook (.xlsx)</h4>
                    <p style={{ margin: '0', fontSize: '11px', color: 'var(--text-secondary)' }}>Creates sheets for Leads, Jobs, Projects, and Notes docs.</p>
                  </div>
                </div>

                {/* HTML Report Option */}
                <div 
                  onClick={exportToHtml}
                  className="glass-card"
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={22} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>Export HTML Summary / Print PDF</h4>
                    <p style={{ margin: '0', fontSize: '11px', color: 'var(--text-secondary)' }}>HTML compilation of active records. Print to PDF in any browser.</p>
                  </div>
                </div>

                {/* JSON Backup Option */}
                <div 
                  onClick={exportToJson}
                  className="glass-card"
                  style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-secondary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Database size={22} />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700' }}>Export JSON Database Backup (.json)</h4>
                    <p style={{ margin: '0', fontSize: '11px', color: 'var(--text-secondary)' }}>Full raw database export for platform recovery or diagnostics.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ background: 'var(--bg-secondary)' }}>
              <button className="btn btn-secondary" onClick={() => setIsExportModalOpen(false)} style={{ fontSize: '13px' }}>
                Close Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
