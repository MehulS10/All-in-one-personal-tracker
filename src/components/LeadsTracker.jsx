import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import LinkPreview from './LinkPreview';
import AttachmentsArea from './AttachmentsArea';
import RichTextEditor from './RichTextEditor';
import { 
  Plus, 
  Search, 
  X, 
  Edit, 
  Trash2, 
  DollarSign, 
  Briefcase,
  User,
  Building,
  Mail,
  Phone,
  Tag,
  Calendar,
  AlertCircle,
  Globe,
  Settings,
  ExternalLink,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';


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

const toTitleCase = (str) => {
  if (!str) return 'General';
  const trimmed = str.trim();
  if (!trimmed) return 'General';
  return trimmed.split(/\s+/).map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

export default function LeadsTracker({ selectedLeadId, setSelectedLeadId }) {
  // Query leads from Dexie
  const leads = useLiveQuery(() => db.leads.toArray()) || [];

  // Custom dialog/prompt state
  const [customPromptOpen, setCustomPromptOpen] = useState(false);
  const [customPromptTitle, setCustomPromptTitle] = useState('');
  const [customPromptPlaceholder, setCustomPromptPlaceholder] = useState('');
  const [customPromptValue, setCustomPromptValue] = useState('');
  const [customPromptCallback, setCustomPromptCallback] = useState(null);

  const showCustomPrompt = (title, placeholder, defaultValue, callback) => {
    setCustomPromptTitle(title);
    setCustomPromptPlaceholder(placeholder);
    setCustomPromptValue(defaultValue);
    setCustomPromptCallback(() => callback);
    setCustomPromptOpen(true);
  };

  // Derived workspaces list from leads locations (case-insensitive deduplication)
  const uniqueLocations = Array.from(new Set(
    leads.map(l => toTitleCase(l.location || 'General'))
  )).filter(ws => ws !== 'General' && ws !== 'All').sort();

  const [activeWorkspace, setActiveWorkspace] = useState('All');
  const [customWorkspaces, setCustomWorkspaces] = useState([]);

  const workspacesList = ['All', 'General', ...uniqueLocations];
  customWorkspaces.forEach(cw => {
    const clean = toTitleCase(cw);
    if (!workspacesList.includes(clean)) {
      workspacesList.push(clean);
    }
  });

  // Component states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'dashboard'
  const [selectedIds, setSelectedIds] = useState([]); // for multi-select

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Row Density & Column Width Resizing states
  const [rowDensity, setRowDensity] = useState('medium'); // 'compact', 'medium', 'cozy'
  const [colWidths, setColWidths] = useState({
    name: 200,
    type: 130,
    phone: 130,
    email: 180,
    website: 80,
    company: 150,
    value: 90,
    status: 100
  });
  const [resizingCol, setResizingCol] = useState(null);

  const startResize = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(colKey);
    const startX = e.clientX;
    const startWidth = colWidths[colKey];

    const doResize = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + deltaX);
      setColWidths(prev => ({
        ...prev,
        [colKey]: newWidth
      }));
    };

    const stopResize = () => {
      setResizingCol(null);
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
    };

    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
  };

  // Form Fields
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('New');
  const [value, setValue] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  const [location, setLocation] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [customFields, setCustomFields] = useState([]);

  // Import mapping states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importRawRows, setImportRawRows] = useState([]);
  const [importLocation, setImportLocation] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importMappings, setImportMappings] = useState({
    name: -1,
    company: -1,
    type: -1,
    phone: -1,
    email: -1,
    link: -1,
    notes: -1,
    value: -1,
    source: -1
  });

  // Detail Drawer State
  const [drawerLead, setDrawerLead] = useState(null);

  // Auto-open drawer if selectedLeadId is passed (e.g. from Dashboard click)
  useEffect(() => {
    if (selectedLeadId) {
      const match = leads.find(l => l.id === selectedLeadId);
      if (match) setDrawerLead(match);
    }
  }, [selectedLeadId, leads]);

  // Sync drawer contents if leads update
  useEffect(() => {
    if (drawerLead) {
      const updated = leads.find(l => l.id === drawerLead.id);
      if (updated) setDrawerLead(updated);
    }
  }, [leads]);

  // Toggle selection for a single lead
  const handleToggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select all visible filtered leads
  const handleSelectAllLeads = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredLeads.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Bulk Delete Selected Leads
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected leads?`)) return;
    try {
      await db.leads.bulkDelete(selectedIds);
      setSelectedIds([]);
      setDrawerLead(null);
      setSelectedLeadId(null);
      alert('Selected leads deleted successfully.');
    } catch (err) {
      alert(`Bulk Delete Error: ${err.message}`);
    }
  };

  // Bulk Status Update Selected Leads
  const handleBulkStatusChange = async (newStatus) => {
    if (!newStatus) return;
    try {
      await Promise.all(selectedIds.map(id => db.leads.update(id, { status: newStatus })));
      setSelectedIds([]);
      alert(`Updated status of selected leads to "${newStatus}".`);
    } catch (err) {
      alert(`Bulk Update Error: ${err.message}`);
    }
  };

  // Bulk Workspace Assignment Selected Leads
  const handleBulkAssignWorkspace = async (targetWorkspace) => {
    if (!targetWorkspace) return;
    try {
      const normalizedWorkspace = toTitleCase(targetWorkspace);
      await Promise.all(selectedIds.map(id => db.leads.update(id, { location: normalizedWorkspace })));
      setSelectedIds([]);
      alert(`Moved selected leads to "${normalizedWorkspace}".`);
    } catch (err) {
      alert(`Bulk Assign Error: ${err.message}`);
    }
  };

  // Reset form helper
  const resetForm = () => {
    setName('');
    setCompany('');
    setType('');
    setEmail('');
    setPhone('');
    setStatus('New');
    setValue('');
    setSource('');
    setNotes('');
    setLink('');
    setLocation('');
    setAttachments([]);
    setCustomFields([]);
    setEditId(null);
    setIsEditMode(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (lead) => {
    setEditId(lead.id);
    setName(lead.name || '');
    setCompany(lead.company || '');
    setType(lead.type || '');
    setEmail(lead.email || '');
    setPhone(lead.phone || '');
    setStatus(lead.status || 'New');
    setValue(lead.value || '');
    setSource(lead.source || '');
    setNotes(lead.notes || '');
    setLink(lead.link || '');
    setLocation(lead.location || '');
    setAttachments(lead.attachments || []);
    setCustomFields(lead.customFields || []);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Submit Lead Form (Create or Update)
  const handleSubmitLead = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Name is required');

    // Find duplicates on Name, Email, or Phone
    const matchedFields = [];
    const duplicateLead = leads.find(l => {
      if (l.id === editId) return false;
      
      const nameMatch = !isPlaceholder(name) && !isPlaceholder(l.name) && l.name.toLowerCase().trim() === name.toLowerCase().trim();
      const emailMatch = !isPlaceholder(email) && !isPlaceholder(l.email) && l.email.toLowerCase().trim() === email.toLowerCase().trim();
      const phoneMatch = !isPlaceholder(phone) && !isPlaceholder(l.phone) && l.phone.toLowerCase().trim() === phone.toLowerCase().trim();

      if (nameMatch) matchedFields.push(`Name "${l.name}"`);
      if (emailMatch) matchedFields.push(`Email "${l.email}"`);
      if (phoneMatch) matchedFields.push(`Mobile "${l.phone}"`);

      return nameMatch || emailMatch || phoneMatch;
    });

    if (duplicateLead && matchedFields.length > 0) {
      const proceed = confirm(
        `Warning: A lead with similar details already exists:\n` +
        matchedFields.map(f => `- Matches ${f}`).join('\n') +
        `\n\nDo you still want to proceed and save this lead?`
      );
      if (!proceed) return;
    }

    const leadData = {
      name: name.trim(),
      company: company.trim(),
      type: type.trim(),
      email: email.trim(),
      phone: phone.trim(),
      status,
      value: parseFloat(value) || 0,
      source: source.trim(),
      notes: notes.trim(),
      link: link.trim(),
      location: location.trim() || 'General',
      attachments,
      customFields: customFields.filter(f => f.key.trim() !== ''),
      createdDate: isEditMode ? drawerLead.createdDate : new Date().toISOString()
    };

    try {
      if (isEditMode) {
        await db.leads.update(editId, leadData);
        // Refresh drawer object
        setDrawerLead({ id: editId, ...leadData });
      } else {
        const id = await db.leads.add(leadData);
        // Automatically open the details drawer for new items
        const newItem = { id, ...leadData };
        setDrawerLead(newItem);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (id) => {
    if (!confirm('Are you sure you want to delete this lead? All associated logs will remain, but the lead link will clear.')) return;
    
    try {
      await db.leads.delete(id);
      setDrawerLead(null);
      setSelectedLeadId(null);
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  };

  // Spawn Note Page from Lead
  const handleSpawnNote = async (lead) => {
    const noteTitle = `${lead.company || lead.name} Notes`;
    
    try {
      await db.notesPages.add({
        title: noteTitle,
        blocks: [
          { id: Math.random().toString(36).substring(7), type: 'h1', content: noteTitle },
          { id: Math.random().toString(36).substring(7), type: 'p', content: `Workspace notes spawned from Lead profile: ${lead.name}` },
          { id: Math.random().toString(36).substring(7), type: 'p', content: lead.email ? `Email: ${lead.email}` : '' },
          { id: Math.random().toString(36).substring(7), type: 'p', content: lead.phone ? `Phone: ${lead.phone}` : '' }
        ],
        updatedDate: new Date().toISOString()
      });

      alert(`Successfully created Notes Workspace Page: "${noteTitle}"!`);
    } catch (err) {
      alert(`Spawn Note failed: ${err.message}`);
    }
  };

  // Create Project from Lead
  const handleCreateProject = async (lead) => {
    const projectName = `${lead.company || lead.name} Project`;
    
    try {
      await db.projects.add({
        leadId: lead.id,
        name: projectName,
        status: 'Planning',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 45 days from now
        description: `Project for ${lead.company || lead.name}. Lead notes: ${lead.notes}`,
        tasks: [
          { id: 1, title: 'Kickoff meeting', status: 'todo' },
          { id: 2, title: 'Requirement analysis', status: 'todo' }
        ],
        attachments: lead.attachments || []
      });

      alert(`Successfully spawned Project: "${projectName}"!`);
    } catch (err) {
      alert(`Project creation failed: ${err.message}`);
    }
  };

  // Helper to parse dates from spreadsheet cells (including Excel numeric dates)
  const parseExcelDate = (val) => {
    if (!val) return '';
    const valStr = val.toString().trim();
    if (!valStr) return '';
    
    // Check if it's a number (Excel serial date number)
    if (!isNaN(valStr) && parseFloat(valStr) > 30000 && parseFloat(valStr) < 60000) {
      try {
        const dateObj = new Date((parseFloat(valStr) - 25569) * 86400 * 1000);
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toISOString();
        }
      } catch (e) {}
    }
    
    // Fallback: try parsing as generic date string
    try {
      const dateObj = new Date(valStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString();
      }
    } catch (e) {}
    
    return valStr;
  };

  // Bulk Excel/CSV Import handler - Refactored to open mapping modal
  const handleImportExcel = () => {
    showCustomPrompt(
      'Import Workspace Destination',
      'Enter a Workspace/Location folder name for these records (e.g. Hyderabad):',
      'Hyderabad',
      async (workspacePrompt) => {
        if (workspacePrompt === null) return; // User cancelled
        const locationTag = toTitleCase(workspacePrompt || 'General');

        try {
          const file = await window.api.selectFile();
          if (!file) return; // User cancelled
          
          if (!['xlsx', 'xls', 'csv'].includes(file.type)) {
            alert('Please select an Excel (.xlsx, .xls) or CSV (.csv) file.');
            return;
          }

          const res = await window.api.parseExcel(file.path);
          if (!res.success) {
            alert(`Failed to parse file: ${res.error}`);
            return;
          }

          const rawRows = res.rawRows;
          if (!rawRows || rawRows.length === 0) {
            alert('No data rows found in this sheet.');
            return;
          }

          // Find the header row dynamically
          const leadsKeywords = ['name', 'type', 'mobile number', 'mobile', 'website', 'company', 'firm', 'mobie numder', 'website'];
          let headerRowIndex = -1;
          
          for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!Array.isArray(row)) continue;
            
            const matchCount = row.filter(cell => {
              if (cell === null || cell === undefined || cell === '') return false;
              const cellStr = cell.toString().toLowerCase().trim().replace(/_/g, ' ');
              if (cellStr === '') return false;
              return leadsKeywords.some(keyword => cellStr.includes(keyword) || keyword.includes(cellStr));
            }).length;

            if (matchCount >= 2) {
              headerRowIndex = i;
              break;
            }
          }

          let headers = [];
          let dataRows = [];

          if (headerRowIndex !== -1) {
            headers = rawRows[headerRowIndex].map(h => (h || '').toString().trim());
            dataRows = rawRows.slice(headerRowIndex + 1);
          } else {
            // Fallback: assume first row has headers
            headers = rawRows[0].map(h => (h || '').toString().trim());
            dataRows = rawRows.slice(1);
          }

          setImportHeaders(headers);
          setImportRawRows(dataRows);
          setImportLocation(locationTag);

          // Normalize headers for guess matching
          const cleanHeaders = headers.map(h => h.toLowerCase().trim().replace(/_/g, ' '));
          const guessMapping = (possibleKeywords) => {
            return cleanHeaders.findIndex(h => h && possibleKeywords.some(pk => h.includes(pk) || pk.includes(h)));
          };

          setImportMappings({
            name: guessMapping(['name', 'contact name', 'prospect name', 'client name', 'architect name', 'firm name']),
            company: guessMapping(['company', 'firm', 'company name', 'business name']),
            type: guessMapping(['type', 'category', 'profession', 'specialty', 'firm type']),
            phone: guessMapping(['mobile', 'mobile number', 'phone', 'phone number', 'contact', 'mobie numder', 'cell']),
            email: guessMapping(['email', 'email address', 'mail']),
            link: guessMapping(['website', 'url', 'link', 'site', 'resource url']),
            notes: guessMapping(['notes', 'note', 'description', 'remarks']),
            value: guessMapping(['value', 'deal value', 'deal size', 'amount', 'est value']),
            source: guessMapping(['source', 'lead source'])
          });

          setImportModalOpen(true);
        } catch (err) {
          alert(`Import error: ${err.message}`);
        }
      }
    );
  };

  // Perform the mapped database batch write
  const handleConfirmMappedImport = async () => {
    if (isImporting) return;
    if (importMappings.name === -1) {
      alert('You must map the "Contact Name" field to complete the import.');
      return;
    }

    setIsImporting(true);

    try {
      let importedCount = 0;
      let duplicateCount = 0;
      const sessionRecords = [];

      for (const row of importRawRows) {
        if (!Array.isArray(row) || row.every(cell => cell === null || cell === undefined || cell === '')) continue;

        const getMappedVal = (mappedIdx) => {
          if (mappedIdx === -1 || mappedIdx === undefined || mappedIdx === null) return '';
          const cellVal = row[mappedIdx];
          return cellVal !== undefined && cellVal !== null ? cellVal.toString().trim() : '';
        };

        const nameVal = getMappedVal(importMappings.name);
        if (!nameVal) continue; // Name is required

        const companyVal = getMappedVal(importMappings.company) || nameVal;
        const typeVal = getMappedVal(importMappings.type);
        const phoneVal = getMappedVal(importMappings.phone);
        const emailVal = getMappedVal(importMappings.email);
        const linkVal = getMappedVal(importMappings.link);
        const notesVal = getMappedVal(importMappings.notes);
        const valueVal = parseFloat(getMappedVal(importMappings.value)) || 0;
        const sourceVal = getMappedVal(importMappings.source) || 'Excel Import';
        const dateVal = new Date().toISOString();

        // Duplicate checks
        const isDuplicateOf = (l) => {
          const nameMatch = l.name.toLowerCase().trim() === nameVal.toLowerCase().trim();
          const companyMatch = (l.company || '').toLowerCase().trim() === companyVal.toLowerCase().trim();
          
          const hasEmail = !isPlaceholder(l.email) && !isPlaceholder(emailVal);
          const emailMatch = hasEmail && l.email.toLowerCase().trim() === emailVal.toLowerCase().trim();
          
          const hasPhone = !isPlaceholder(l.phone) && !isPlaceholder(phoneVal);
          const phoneMatch = hasPhone && l.phone.toLowerCase().trim() === phoneVal.toLowerCase().trim();

          if (!nameMatch || !companyMatch) return false;
          if (hasEmail && l.email.toLowerCase().trim() !== emailVal.toLowerCase().trim()) return false;
          if (hasPhone && l.phone.toLowerCase().trim() !== phoneVal.toLowerCase().trim()) return false;

          return true;
        };

        const inDbDuplicate = leads.some(isDuplicateOf);
        const inSessionDuplicate = sessionRecords.some(isDuplicateOf);

        if (inDbDuplicate || inSessionDuplicate) {
          duplicateCount++;
          continue;
        }

        await db.leads.add({
          name: nameVal,
          company: companyVal,
          type: typeVal,
          phone: phoneVal,
          email: emailVal,
          link: linkVal,
          notes: notesVal,
          value: valueVal,
          status: 'New',
          source: sourceVal,
          location: importLocation,
          attachments: [],
          createdDate: dateVal
        });

        sessionRecords.push({
          name: nameVal,
          company: companyVal,
          phone: phoneVal,
          email: emailVal
        });
        importedCount++;
      }

      alert(`Excel/CSV Import Complete!\n\nImported successfully: ${importedCount} records\nSkipped duplicates: ${duplicateCount}`);
      setImportRawRows([]); // Clear raw data to prevent duplicate uploads
      setImportModalOpen(false);
      setActiveWorkspace(importLocation);
    } catch (err) {
      alert(`Database Import Error: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Apply sorting and filtering to Leads
  const sortedLeads = React.useMemo(() => {
    // 1. First apply filter criteria
    const filtered = leads.filter(l => {
      const matchesSearch = 
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.company && l.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.type && l.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.source && l.source.toLowerCase().includes(searchTerm.toLowerCase()));
        
      const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
      
      // Workspace Location Filter
      const leadLoc = toTitleCase(l.location || 'General');
      const matchesWorkspace = activeWorkspace === 'All' || leadLoc.toLowerCase().trim() === activeWorkspace.toLowerCase().trim();
      
      return matchesSearch && matchesStatus && matchesWorkspace;
    });

    // 2. Apply sorting if configured
    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle undefined/null/empty values by pushing them to bottom
      if (aVal === undefined || aVal === null || aVal === '') return 1;
      if (bVal === undefined || bVal === null || bVal === '') return -1;

      // Handle custom fields sorting
      if (sortConfig.key.startsWith('custom_')) {
        const fieldKey = sortConfig.key.replace('custom_', '');
        const aField = a.customFields?.find(f => f.key === fieldKey);
        const bField = b.customFields?.find(f => f.key === fieldKey);
        aVal = aField ? aField.value : '';
        bVal = bField ? bField.value : '';
      }

      // Convert to appropriate type for comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toString().toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [leads, searchTerm, statusFilter, activeWorkspace, sortConfig]);

  // Filter Leads (for retro-compatibility with some references if any, but sortedLeads is the primary one now)
  const filteredLeads = sortedLeads;

  // Calculate lead sub-dashboard statistics
  const totalLeadsCount = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'New').length;
  const contactedLeadsCount = leads.filter(l => l.status === 'Contacted').length;
  const nurturingLeadsCount = leads.filter(l => l.status === 'Nurturing').length;
  const qualifiedLeadsCount = leads.filter(l => l.status === 'Qualified').length;
  const unqualifiedLeadsCount = leads.filter(l => l.status === 'Unqualified').length;

  const totalPipelineValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
  const avgLeadValue = totalLeadsCount > 0 ? (totalPipelineValue / totalLeadsCount) : 0;

  // Source distribution
  const sourceDistribution = leads.reduce((acc, curr) => {
    const src = curr.source || 'Direct / Unknown';
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  // Real-time duplicates lookup (ignoring placeholders)
  const nameDuplicate = name && leads.find(l => 
    l.id !== editId &&
    !isPlaceholder(name) && !isPlaceholder(l.name) &&
    l.name.toLowerCase().trim() === name.toLowerCase().trim()
  );

  const emailDuplicate = email && leads.find(l => 
    l.id !== editId &&
    !isPlaceholder(email) && !isPlaceholder(l.email) &&
    l.email.toLowerCase().trim() === email.toLowerCase().trim()
  );

  const phoneDuplicate = phone && leads.find(l => 
    l.id !== editId &&
    !isPlaceholder(phone) && !isPlaceholder(l.phone) &&
    l.phone.toLowerCase().trim() === phone.toLowerCase().trim()
  );

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ' ⇅';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads Directory</h1>
          <p className="page-subtitle">Identify prospects, capture contact details, and follow opportunities.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleImportExcel}
            title="Import lead records from .xlsx or .csv"
          >
            <FileSpreadsheet size={16} /> Import Excel/CSV
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { resetForm(); setIsModalOpen(true); }}
          >
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="view-tabs">
        <div 
          className={`view-tab ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          Directory List
        </div>
        <div 
          className={`view-tab ${viewMode === 'dashboard' ? 'active' : ''}`}
          onClick={() => setViewMode('dashboard')}
        >
          Leads Dashboard
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Bulk Actions Floating Bar */}
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <div className="bulk-actions-info">
                <span>Selected {selectedIds.length} lead records</span>
              </div>
              <div className="bulk-actions-controls">
                <select 
                  className="form-select" 
                  style={{ width: '170px', padding: '6px 10px', fontSize: '12px' }}
                  onChange={(e) => {
                    handleBulkStatusChange(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Update Status To...</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Nurturing">Nurturing</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Unqualified">Unqualified</option>
                </select>
                <select 
                  className="form-select" 
                  style={{ width: '180px', padding: '6px 10px', fontSize: '12px' }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'CREATE_NEW') {
                      showCustomPrompt(
                        'Create & Move to Workspace',
                        'e.g. Hyderabad, Mumbai, VIP...',
                        '',
                        async (wsName) => {
                          if (wsName && wsName.trim()) {
                            const cleanName = toTitleCase(wsName);
                            try {
                              await Promise.all(selectedIds.map(id => db.leads.update(id, { location: cleanName })));
                              if (!customWorkspaces.includes(cleanName)) {
                                setCustomWorkspaces(prev => [...prev, cleanName]);
                              }
                              setActiveWorkspace(cleanName);
                              setSelectedIds([]);
                              alert(`Moved selected leads to new workspace "${cleanName}".`);
                            } catch (err) {
                              alert(`Bulk Assign Error: ${err.message}`);
                            }
                          }
                        }
                      );
                    } else if (val) {
                      handleBulkAssignWorkspace(val);
                    }
                    e.target.value = '';
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Move to Workspace...</option>
                  {workspacesList.filter(ws => ws !== 'All').map(ws => (
                    <option key={ws} value={ws}>{ws}</option>
                  ))}
                  <option value="CREATE_NEW">+ Create New Folder...</option>
                </select>
                <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleBulkDelete}>
                  <Trash2 size={12} /> Delete Selected
                </button>
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setSelectedIds([])}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                className="form-input"
                placeholder="Search by name, company, type, or source..."
                style={{ paddingLeft: '38px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Status:</span>
              <select 
                className="form-select" 
                style={{ width: '150px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Stages</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Nurturing">Nurturing</option>
                <option value="Qualified">Qualified</option>
                <option value="Unqualified">Unqualified</option>
              </select>
            </div>

            {/* Row Density Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Row Size:</span>
              <select 
                className="form-select" 
                style={{ width: '130px' }}
                value={rowDensity}
                onChange={(e) => setRowDensity(e.target.value)}
              >
                <option value="compact">Compact</option>
                <option value="medium">Normal</option>
                <option value="cozy">Tall</option>
              </select>
            </div>
          </div>

          {/* Workspace Folders Header Card Grid */}
          <div style={{ marginBottom: '18px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Workspace Folder Databases
            </span>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '10px 0', scrollbarWidth: 'thin' }}>
              {workspacesList.map(ws => {
                const count = ws === 'All' 
                  ? leads.length 
                  : leads.filter(l => toTitleCase(l.location || 'General').toLowerCase().trim() === ws.toLowerCase().trim()).length;
                
                const isActive = activeWorkspace.toLowerCase().trim() === ws.toLowerCase().trim();
                
                return (
                  <div 
                    key={ws}
                    onClick={() => setActiveWorkspace(ws)}
                    className="glass-card"
                    style={{ 
                      padding: '12px 18px', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      background: isActive ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                      border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                      boxShadow: isActive ? '0 0 10px rgba(6, 182, 212, 0.15)' : 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      minWidth: '140px',
                      flexShrink: 0,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '700', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ws === 'All' ? '📂 All Leads' : `📍 ${ws}`}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {count} {count === 1 ? 'record' : 'records'}
                    </span>
                  </div>
                );
              })}
              
              {/* Add Workspace Card */}
              <div 
                onClick={() => {
                  showCustomPrompt(
                    'Create New Workspace Folder',
                    'e.g. Mumbai, VIP, Hot Leads...',
                    '',
                    (wsName) => {
                      if (wsName && wsName.trim()) {
                        const cleanName = toTitleCase(wsName);
                        if (!customWorkspaces.includes(cleanName)) {
                          setCustomWorkspaces(prev => [...prev, cleanName]);
                        }
                        setActiveWorkspace(cleanName);
                      }
                    }
                  );
                }}
                className="glass-card"
                style={{ 
                  padding: '12px 18px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  border: '1px dashed var(--border-color)',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '140px',
                  flexShrink: 0,
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={12} /> Add Place
                </span>
              </div>
            </div>
          </div>

          {/* Leads Table Container */}
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            {sortedLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No leads found matching your criteria.
              </div>
            ) : (
              <div className="track-table-container">
                <table className="track-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={sortedLeads.length > 0 && sortedLeads.every(l => selectedIds.includes(l.id))}
                          onChange={handleSelectAllLeads}
                        />
                      </th>
                      <th style={{ width: colWidths.name, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('name')}>
                        Name<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('name')}</span>
                        <div className={`resize-handle ${resizingCol === 'name' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'name')} onClick={(e) => e.stopPropagation()} />
                      </th>
                      <th style={{ width: colWidths.type, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('type')}>
                        Type<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('type')}</span>
                        <div className={`resize-handle ${resizingCol === 'type' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'type')} onClick={(e) => e.stopPropagation()} />
                      </th>
                      <th style={{ width: colWidths.phone, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('phone')}>
                        Mobile Number<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('phone')}</span>
                        <div className={`resize-handle ${resizingCol === 'phone' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'phone')} onClick={(e) => e.stopPropagation()} />
                      </th>
                      <th style={{ width: colWidths.email, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('email')}>
                        Email<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('email')}</span>
                        <div className={`resize-handle ${resizingCol === 'email' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'email')} onClick={(e) => e.stopPropagation()} />
                      </th>
                      <th style={{ width: colWidths.website, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('link')}>
                        Website<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('link')}</span>
                        <div className={`resize-handle ${resizingCol === 'website' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'website')} onClick={(e) => e.stopPropagation()} />
                      </th>
                      <th style={{ width: colWidths.company, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('company')}>
                        Company<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('company')}</span>
                        <div className={`resize-handle ${resizingCol === 'company' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'company')} onClick={(e) => e.stopPropagation()} />
                      </th>
                      <th style={{ width: colWidths.value, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('value')}>
                        Value<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('value')}</span>
                        <div className={`resize-handle ${resizingCol === 'value' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'value')} onClick={(e) => e.stopPropagation()} />
                      </th>
                      <th style={{ width: colWidths.status, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('status')}>
                        Status<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('status')}</span>
                        <div className={`resize-handle ${resizingCol === 'status' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'status')} onClick={(e) => e.stopPropagation()} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLeads.map(l => {
                      let badgeClass = 'badge-info';
                      if (l.status === 'Qualified') badgeClass = 'badge-success';
                      if (l.status === 'Unqualified') badgeClass = 'badge-danger';
                      if (l.status === 'Nurturing') badgeClass = 'badge-warning';

                      const isChecked = selectedIds.includes(l.id);

                      let cellPadding = '16px';
                      if (rowDensity === 'compact') cellPadding = '8px 16px';
                      if (rowDensity === 'cozy') cellPadding = '22px 16px';

                      return (
                        <tr 
                          key={l.id} 
                          onClick={() => { setDrawerLead(l); setSelectedLeadId(l.id); }}
                          style={{ background: isChecked ? 'rgba(6, 182, 212, 0.05)' : '' }}
                        >
                          <td style={{ textAlign: 'center', padding: cellPadding }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleSelect(e, l.id)}
                            />
                          </td>
                          <td style={{ fontWeight: '600', padding: cellPadding, width: colWidths.name, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</td>
                          <td style={{ padding: cellPadding, width: colWidths.type, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.type || '—'}</td>
                          <td style={{ padding: cellPadding, width: colWidths.phone, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.phone || '—'}</td>
                          <td style={{ padding: cellPadding, width: colWidths.email, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email || '—'}</td>
                          <td style={{ padding: cellPadding, width: colWidths.website }}>
                            {l.link ? (
                              <a 
                                href={l.link} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                onClick={(e) => e.stopPropagation()} 
                                style={{ color: 'var(--accent-primary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '2px' }}
                              >
                                Site <ExternalLink size={10} style={{ display: 'inline' }} />
                              </a>
                            ) : '—'}
                          </td>
                          <td style={{ padding: cellPadding, width: colWidths.company, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.company || '—'}</td>
                          <td style={{ fontWeight: '700', color: 'var(--accent-primary)', padding: cellPadding, width: colWidths.value }}>
                            {l.value ? `$${l.value.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ padding: cellPadding, width: colWidths.status }}>
                            <span className={`badge ${badgeClass}`}>{l.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Sub-dashboard Analytics View */
        <div className="sub-dashboard-grid">
          {/* Summary stats */}
          <div className="glass-card stat-card" style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
              <div className="stat-label">Total Leads</div>
              <div className="stat-value" style={{ fontSize: '32px' }}>{totalLeadsCount}</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
              <div className="stat-label">Total Pipeline</div>
              <div className="stat-value" style={{ fontSize: '32px', color: 'var(--accent-primary)' }}>${totalPipelineValue.toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="stat-label">Average Value</div>
              <div className="stat-value" style={{ fontSize: '32px', color: 'var(--color-success)' }}>${Math.round(avgLeadValue).toLocaleString()}</div>
            </div>
          </div>

          {/* SVG Leads by Status chart */}
          <div className="glass-card">
            <h3>Leads by Stage</h3>
            <div className="chart-container" style={{ marginTop: '16px', minHeight: '200px' }}>
              <svg width="100%" height="200" viewBox="0 0 300 200">
                {/* Horizontal simple bars */}
                {[
                  { label: 'New', count: newLeadsCount, fill: 'var(--color-info)' },
                  { label: 'Contacted', count: contactedLeadsCount, fill: 'var(--accent-secondary)' },
                  { label: 'Nurturing', count: nurturingLeadsCount, fill: 'var(--color-warning)' },
                  { label: 'Qualified', count: qualifiedLeadsCount, fill: 'var(--color-success)' },
                  { label: 'Unqualified', count: unqualifiedLeadsCount, fill: 'var(--color-danger)' }
                ].map((item, idx) => {
                  const maxVal = Math.max(newLeadsCount, contactedLeadsCount, nurturingLeadsCount, qualifiedLeadsCount, unqualifiedLeadsCount, 1);
                  const barWidth = Math.max((item.count / maxVal) * 160, 5);
                  const y = 20 + idx * 35;
                  return (
                    <g key={idx}>
                      <text x="10" y={y + 12} fill="var(--text-secondary)" fontSize="11" fontWeight="600">{item.label}</text>
                      <rect x="90" y={y} width={barWidth} height="16" rx="4" fill={item.fill} className="svg-bar" />
                      <text x={95 + barWidth} y={y + 12} fill="var(--text-primary)" fontSize="11" fontWeight="700">{item.count}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Leads by Source chart */}
          <div className="glass-card">
            <h3>Leads by Source</h3>
            <div className="chart-container" style={{ marginTop: '16px', minHeight: '200px', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch' }}>
              {Object.keys(sourceDistribution).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>No source data.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '180px', paddingRight: '4px' }}>
                  {Object.entries(sourceDistribution).map(([src, count], idx) => {
                    const pct = Math.round((count / totalLeadsCount) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{src}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>{count} leads ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Slide-out Drawer */}
      {drawerLead && (
        <>
          <div className="detail-drawer-overlay" onClick={() => { setDrawerLead(null); setSelectedLeadId(null); }} />
          <div className="detail-drawer">
            <div className="detail-drawer-header">
              <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--accent-primary)' }}>Lead Details</span>
              <button 
                className="modal-close-btn"
                onClick={() => { setDrawerLead(null); setSelectedLeadId(null); }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="detail-drawer-body">
              {/* Header Profile */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center', alignSelf: 'center', color: 'var(--accent-primary)' }}>
                  <User size={30} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '4px 0 0 0' }}>{drawerLead.name}</h2>
                {(drawerLead.company || drawerLead.type) && (
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    {drawerLead.company && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building size={13} /> {drawerLead.company}</span>}
                    {drawerLead.type && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Settings size={13} /> {drawerLead.type}</span>}
                  </span>
                )}
                <div style={{ alignSelf: 'center', marginTop: '6px' }}>
                  <span className={`badge ${drawerLead.status === 'Qualified' ? 'badge-success' : drawerLead.status === 'Unqualified' ? 'badge-danger' : drawerLead.status === 'Nurturing' ? 'badge-warning' : 'badge-info'}`}>
                    {drawerLead.status}
                  </span>
                </div>
              </div>

              {/* CRM Conversion shortcuts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleSpawnNote(drawerLead)}
                  style={{ display: 'flex', justifyContent: 'center', fontSize: '12px' }}
                >
                  <BookOpen size={14} style={{ color: 'var(--color-success)' }} /> Spawn Note
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleCreateProject(drawerLead)}
                  style={{ display: 'flex', justifyContent: 'center', fontSize: '12px' }}
                >
                  <Briefcase size={14} style={{ color: 'var(--accent-primary)' }} /> Spawn Project
                </button>
              </div>

              {/* Core Attributes */}
              <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <span className="detail-section-title">Contact Information</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', marginTop: '6px' }}>
                  {drawerLead.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                      <a href={`mailto:${drawerLead.email}`} style={{ color: 'var(--text-primary)' }}>{drawerLead.email}</a>
                    </div>
                  )}
                  {drawerLead.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Mobile: {drawerLead.phone}</span>
                    </div>
                  )}
                  {drawerLead.value > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DollarSign size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: '700' }}>Est. Deal Size: ${drawerLead.value.toLocaleString()}</span>
                    </div>
                  )}
                  {drawerLead.source && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Source: {drawerLead.source}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>Workspace: {drawerLead.location || 'General'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>Captured: {new Date(drawerLead.createdDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Custom Fields */}
              {drawerLead.customFields && drawerLead.customFields.length > 0 && (
                <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="detail-section-title">Additional Fields</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', marginTop: '8px' }}>
                    {drawerLead.customFields.map((cf, index) => (
                      <div key={index} style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>{cf.key}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px', fontWeight: '500' }}>{cf.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description/Notes */}
              {drawerLead.notes && (
                <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="detail-section-title">Notes / Description</span>
                  <div 
                    style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '6px' }}
                    dangerouslySetInnerHTML={{ __html: drawerLead.notes }}
                  />
                </div>
              )}

              {/* Links and Preview */}
              {drawerLead.link && (
                <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="detail-section-title">Website Link Preview</span>
                  <LinkPreview url={drawerLead.link} />
                </div>
              )}

              {/* Document Attachments */}
              <div className="detail-section">
                <span className="detail-section-title">Attachments</span>
                <AttachmentsArea 
                  attachments={drawerLead.attachments || []}
                  onAddAttachment={async (file) => {
                    const updatedList = [...(drawerLead.attachments || []), file];
                    await db.leads.update(drawerLead.id, { attachments: updatedList });
                  }}
                  onRemoveAttachment={async (index) => {
                    const updatedList = [...(drawerLead.attachments || [])];
                    updatedList.splice(index, 1);
                    await db.leads.update(drawerLead.id, { attachments: updatedList });
                  }}
                />
              </div>

              {/* Footer action buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleOpenEdit(drawerLead)}
                  style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}
                >
                  <Edit size={14} /> Edit Lead
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteLead(drawerLead.id)}
                  style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Create / Edit Modal Form */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">{isEditMode ? 'Modify Lead Info' : 'Create New Lead'}</span>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmitLead}>
              <div className="modal-body">
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Contact Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. aakar design studio"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    {nameDuplicate && (
                      <span style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '4px', fontWeight: '600' }}>
                        ⚠️ Name matches: {nameDuplicate.company ? `${nameDuplicate.name} at ${nameDuplicate.company}` : nameDuplicate.name} ({nameDuplicate.location || 'General'})
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Studio23"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type / Category</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Architect, Interior Designer"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 098269 20099"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    {phoneDuplicate && (
                      <span style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '4px', fontWeight: '600' }}>
                        ⚠️ Registered to: {phoneDuplicate.name} ({phoneDuplicate.company || 'Private'})
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="e.g. contact@studio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    {emailDuplicate && (
                      <span style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '4px', fontWeight: '600' }}>
                        ⚠️ Registered to: {emailDuplicate.name} ({emailDuplicate.company || 'Private'})
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website (URL)</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="e.g. http://www.studio.com"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Lead Status</label>
                    <select 
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Nurturing">Nurturing</option>
                      <option value="Qualified">Qualified</option>
                      <option value="Unqualified">Unqualified</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Est. Deal Value ($)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="e.g. 5000"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Lead Source</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Google Maps, Referral"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location / Workspace Folder</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Hyderabad, Mumbai..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Internal Notes</label>
                  <RichTextEditor 
                    value={notes}
                    onChange={setNotes}
                    placeholder="Provide details about discussions, interest, or requirements..."
                  />
                </div>

                {/* Form-level Attachments dropzone */}
                <div className="form-group">
                  <label className="form-label">Upload Documents / Pitch decks</label>
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

                {/* Dynamic Custom Fields Section */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <span className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Custom Fields</span>
                  {customFields.map((cf, index) => (
                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Field Name (e.g. GSTIN)" 
                        value={cf.key}
                        onChange={(e) => {
                          const list = [...customFields];
                          list[index].key = e.target.value;
                          setCustomFields(list);
                        }}
                        style={{ flex: 1 }}
                        required
                      />
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Value" 
                        value={cf.value}
                        onChange={(e) => {
                          const list = [...customFields];
                          list[index].value = e.target.value;
                          setCustomFields(list);
                        }}
                        style={{ flex: 2 }}
                        required
                      />
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        style={{ padding: '8px 12px' }}
                        onClick={() => {
                          const list = customFields.filter((_, i) => i !== index);
                          setCustomFields(list);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setCustomFields([...customFields, { key: '', value: '' }])}
                    style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={12} /> Add Custom Field
                  </button>
                </div>

              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{isEditMode ? 'Update Details' : 'Create Prospect'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {customPromptOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <span className="modal-title">{customPromptTitle}</span>
              <button 
                className="modal-close-btn" 
                onClick={() => {
                  setCustomPromptOpen(false);
                  if (customPromptCallback) customPromptCallback(null);
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              setCustomPromptOpen(false);
              if (customPromptCallback) customPromptCallback(customPromptValue);
            }}>
              <div className="modal-body" style={{ padding: '20px 24px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder={customPromptPlaceholder}
                  value={customPromptValue}
                  onChange={(e) => setCustomPromptValue(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="modal-footer" style={{ padding: '12px 24px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setCustomPromptOpen(false);
                    if (customPromptCallback) customPromptCallback(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div>
                <span className="modal-title" style={{ display: 'block' }}>Map Excel Columns to Lead Fields</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Workspace: 📍 {importLocation} ({importRawRows.length} rows parsed)</span>
              </div>
              <button className="modal-close-btn" onClick={() => setImportModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Contact Name * (Required)</label>
                  <select 
                    className="form-select"
                    value={importMappings.name}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, name: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Company Name</label>
                  <select 
                    className="form-select"
                    value={importMappings.company}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, company: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Type / Profession</label>
                  <select 
                    className="form-select"
                    value={importMappings.type}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, type: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Mobile Number</label>
                  <select 
                    className="form-select"
                    value={importMappings.phone}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, phone: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Email Address</label>
                  <select 
                    className="form-select"
                    value={importMappings.email}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, email: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Website URL</label>
                  <select 
                    className="form-select"
                    value={importMappings.link}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, link: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Deal Value ($)</label>
                  <select 
                    className="form-select"
                    value={importMappings.value}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, value: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Lead Source</label>
                  <select 
                    className="form-select"
                    value={importMappings.source}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, source: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontWeight: '700' }}>Internal Notes / Descriptions</label>
                  <select 
                    className="form-select"
                    value={importMappings.notes}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, notes: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <span className="form-label" style={{ fontWeight: '700', marginBottom: '8px', display: 'block' }}>Sample Data Preview (First 3 Rows)</span>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Name</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Company</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Type</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Phone</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Email</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Notes</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRawRows.slice(0, 3).map((row, rIdx) => {
                        const getPreview = (idx) => {
                          if (idx === -1 || idx === undefined || idx === null) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Skipped</span>;
                          return row[idx] !== undefined && row[idx] !== null ? row[idx].toString() : '';
                        };
                        return (
                          <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.name)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.company)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.type)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.phone)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.email)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getPreview(importMappings.notes)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.value)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 24px' }}>
              <button className="btn btn-secondary" onClick={() => setImportModalOpen(false)} disabled={isImporting}>Cancel</button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmMappedImport}
                disabled={importMappings.name === -1 || isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${importRawRows.length} Leads`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
