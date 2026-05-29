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
  Briefcase, 
  Building, 
  MapPin, 
  DollarSign, 
  Calendar,
  Clock,
  ExternalLink,
  MessageSquare,
  ChevronRight,
  Globe,
  User,
  FileSpreadsheet,
  FileText,
  Settings
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

export default function JobTracker({ selectedJobId, setSelectedJobId }) {
  // Query jobs
  const jobs = useLiveQuery(() => db.jobs.toArray()) || [];

  // Local states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [drawerJob, setDrawerJob] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'dashboard'
  const [selectedIds, setSelectedIds] = useState([]); // for multi-select

  // Import mapping states
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importHeaders, setImportHeaders] = useState([]);
  const [importRawRows, setImportRawRows] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMappings, setImportMappings] = useState({
    title: -1,
    company: -1,
    url: -1,
    status: -1,
    salary: -1,
    location: -1,
    description: -1,
    dateApplied: -1,
    applySite: -1,
    followUpDate: -1,
    interviewDate: -1,
    contactPerson: -1
  });

  // Row Density & Column Width Resizing states
  const [rowDensity, setRowDensity] = useState('medium'); // 'compact', 'medium', 'cozy'
  const [colWidths, setColWidths] = useState({
    company: 150,
    title: 180,
    dateApplied: 120,
    applySite: 120,
    url: 80,
    status: 100,
    followUpDate: 120,
    interviewDate: 120,
    salary: 100,
    location: 130
  });
  // Column Visibility state
  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = localStorage.getItem('jobs_visible_cols');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      company: true,
      title: true,
      dateApplied: true,
      applySite: true,
      url: true,
      status: true,
      followUpDate: true,
      interviewDate: true,
      salary: true,
      location: true
    };
  });

  useEffect(() => {
    localStorage.setItem('jobs_visible_cols', JSON.stringify(visibleCols));
  }, [visibleCols]);

  const [showColPicker, setShowColPicker] = useState(false);

  const toColumnLabel = (key) => {
    switch (key) {
      case 'company': return 'Company';
      case 'title': return 'Job Position';
      case 'dateApplied': return 'Date Applied';
      case 'applySite': return 'Apply Site';
      case 'url': return 'JD Link';
      case 'status': return 'Status';
      case 'followUpDate': return 'Follow Up Date';
      case 'interviewDate': return 'Interview Date';
      case 'salary': return 'Salary';
      case 'location': return 'Location';
      default: return key;
    }
  };

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
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Applied');
  const [salary, setSalary] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [dateApplied, setDateApplied] = useState('');
  const [applySite, setApplySite] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [attachments, setAttachments] = useState([]);

  const [isScraping, setIsScraping] = useState(false);

  // Link Scraper pre-fill engine for Job Details modal
  const handleFetchJobInfo = async () => {
    if (!url) {
      alert('Please paste a job link first in the Job Posting URL field!');
      return;
    }
    setIsScraping(true);
    try {
      const res = await window.api.scrapeLink(url);
      if (res && !res.error) {
        if (res.title) {
          setTitle(prev => prev ? prev : res.title);
        }
        if (res.hostname && !company) {
          const parts = res.hostname.split('.');
          const part = parts[0] === 'www' ? parts[1] : parts[0];
          setCompany(part.charAt(0).toUpperCase() + part.slice(1));
        }
        if (res.hostname && !applySite) {
          const parts = res.hostname.split('.');
          const domain = parts[0] === 'www' ? parts[1] : parts[0];
          setApplySite(domain.charAt(0).toUpperCase() + domain.slice(1));
        }
        if (res.description && !description) {
          setDescription(res.description);
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

  // Timeline Event inputs
  const [eventText, setEventText] = useState('');
  const [eventDate, setEventDate] = useState('');

  // Handle auto-open drawer from Dashboard click
  useEffect(() => {
    if (selectedJobId) {
      const match = jobs.find(j => j.id === selectedJobId);
      if (match) setDrawerJob(match);
    }
  }, [selectedJobId, jobs]);

  // Sync drawer if database changes
  useEffect(() => {
    if (drawerJob) {
      const updated = jobs.find(j => j.id === drawerJob.id);
      if (updated) setDrawerJob(updated);
    }
  }, [jobs]);

  // Toggle selection for a single job
  const handleToggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Select all visible filtered jobs
  const handleSelectAllJobs = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredJobs.map(j => j.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Bulk Delete Selected Jobs
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected job applications?`)) return;
    try {
      await db.jobs.bulkDelete(selectedIds);
      setSelectedIds([]);
      setDrawerJob(null);
      setSelectedJobId(null);
      alert('Selected job applications deleted successfully.');
    } catch (err) {
      alert(`Bulk Delete Error: ${err.message}`);
    }
  };

  // Bulk Status Update Selected Jobs
  const handleBulkStatusChange = async (newStatus) => {
    if (!newStatus) return;
    try {
      await Promise.all(selectedIds.map(id => db.jobs.update(id, { status: newStatus })));
      setSelectedIds([]);
      alert(`Updated status of selected jobs to "${newStatus}".`);
    } catch (err) {
      alert(`Bulk Update Error: ${err.message}`);
    }
  };

  // Reset form
  const resetForm = () => {
    setTitle('');
    setCompany('');
    setUrl('');
    setStatus('Applied');
    setSalary('');
    setLocation('');
    setDescription('');
    setDateApplied(new Date().toISOString().split('T')[0]); // Default today
    setApplySite('');
    setFollowUpDate('');
    setInterviewDate('');
    setContactPerson('');
    setAttachments([]);
    setEditId(null);
    setIsEditMode(false);
  };

  // Open Edit Modal
  const handleOpenEdit = (job) => {
    setEditId(job.id);
    setTitle(job.title || '');
    setCompany(job.company || '');
    setUrl(job.url || '');
    setStatus(job.status || 'Applied');
    setSalary(job.salary || '');
    setLocation(job.location || '');
    setDescription(job.description || '');
    setDateApplied(job.dateApplied || '');
    setApplySite(job.applySite || '');
    setFollowUpDate(job.followUpDate || '');
    setInterviewDate(job.interviewDate || '');
    setContactPerson(job.contactPerson || '');
    setAttachments(job.attachments || []);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Submit Job
  const handleSubmitJob = async (e) => {
    e.preventDefault();
    if (!title.trim() || !company.trim()) return alert('Title and Company are required');

    // Duplicate detection
    const duplicateJob = jobs.find(j => 
      j.id !== editId &&
      !isPlaceholder(company) && !isPlaceholder(j.company) &&
      j.company.toLowerCase().trim() === company.toLowerCase().trim() &&
      !isPlaceholder(title) && !isPlaceholder(j.title) &&
      j.title.toLowerCase().trim() === title.toLowerCase().trim()
    );

    if (duplicateJob) {
      const proceed = confirm(
        `Warning: A job application for "${title}" at "${company}" already exists in your tracker.\n\n` +
        `Do you still want to proceed and save this job application?`
      );
      if (!proceed) return;
    }

    const jobData = {
      title: title.trim(),
      company: company.trim(),
      url: url.trim(),
      status,
      salary: salary.trim(),
      location: location.trim(),
      description: description.trim(),
      dateApplied,
      applySite: applySite.trim(),
      followUpDate,
      interviewDate,
      contactPerson: contactPerson.trim(),
      attachments,
      timeline: isEditMode ? (drawerJob.timeline || []) : [
        { date: dateApplied, event: 'Application Submitted', note: 'Created initial application log.' }
      ]
    };

    try {
      if (isEditMode) {
        await db.jobs.update(editId, jobData);
        setDrawerJob({ id: editId, ...jobData });
      } else {
        const id = await db.jobs.add(jobData);
        setDrawerJob({ id, ...jobData });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  };

  // Delete Job
  const handleDeleteJob = async (id) => {
    if (!confirm('Are you sure you want to delete this job application?')) return;
    try {
      await db.jobs.delete(id);
      setDrawerJob(null);
      setSelectedJobId(null);
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  };

  // Add timeline event
  const handleAddTimelineEvent = async (e) => {
    e.preventDefault();
    if (!eventText.trim() || !drawerJob) return;

    const newEvent = {
      date: eventDate || new Date().toISOString().split('T')[0],
      event: eventText.trim(),
      note: ''
    };

    const currentTimeline = drawerJob.timeline || [];
    const updatedTimeline = [...currentTimeline, newEvent].sort((a, b) => new Date(a.date) - new Date(b.date));

    try {
      await db.jobs.update(drawerJob.id, { timeline: updatedTimeline });
      setEventText('');
      setEventDate('');
    } catch (err) {
      alert(err.message);
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
          return dateObj.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    
    // Fallback: try parsing as generic date string
    try {
      const dateObj = new Date(valStr);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    } catch (e) {}
    
    return valStr;
  };

  // Bulk Import Jobs from Excel/CSV - Refactored to open mapping modal
  const handleImportExcel = async () => {
    try {
      const file = await window.api.selectFile();
      if (!file) return;

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
      const jobKeywords = ['company', 'job position', 'position', 'job title', 'title', 'status', 'date applied', 'jd link', 'apply site', 'follow up date', 'interview date', 'salary', 'contact person'];
      let headerRowIndex = -1;
      
      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        
        const matchCount = row.filter(cell => {
          if (cell === null || cell === undefined || cell === '') return false;
          const cellStr = cell.toString().toLowerCase().trim().replace(/_/g, ' ');
          if (cellStr === '') return false;
          return jobKeywords.some(keyword => cellStr.includes(keyword) || keyword.includes(cellStr));
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

      // Normalize headers for guess matching
      const cleanHeaders = headers.map(h => h.toLowerCase().trim().replace(/_/g, ' '));
      const guessMapping = (possibleKeywords) => {
        return cleanHeaders.findIndex(h => h && possibleKeywords.some(pk => h.includes(pk) || pk.includes(h)));
      };

      setImportMappings({
        company: guessMapping(['company', 'company name', 'employer']),
        title: guessMapping(['job position', 'position', 'job title', 'title', 'role']),
        dateApplied: guessMapping(['date applied', 'applied date', 'applied', 'date']),
        applySite: guessMapping(['apply site', 'site', 'platform', 'source']),
        url: guessMapping(['jd link', 'jd', 'url', 'posting url', 'link']),
        status: guessMapping(['status', 'state']),
        followUpDate: guessMapping(['follow up date', 'follow up', 'next follow up']),
        interviewDate: guessMapping(['interview date', 'interview', 'interview slot']),
        salary: guessMapping(['salary', 'compensation', 'package', 'salary offer']),
        contactPerson: guessMapping(['contact person', 'contact', 'recruiter', 'hr contact']),
        location: guessMapping(['location', 'city', 'country', 'job type']),
        description: guessMapping(['notes', 'note', 'description', 'remarks'])
      });

      setImportModalOpen(true);
    } catch (err) {
      alert(`Import error: ${err.message}`);
    }
  };

  const handleConfirmMappedImport = async () => {
    if (isImporting) return;
    if (importMappings.title === -1 || importMappings.company === -1) {
      alert('You must map both the "Company Name" and "Job Position" fields to complete the import.');
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

        const companyVal = getMappedVal(importMappings.company);
        const titleVal = getMappedVal(importMappings.title);
        
        if (!companyVal || !titleVal) continue; // required fields

        const dateVal = parseExcelDate(getMappedVal(importMappings.dateApplied));
        const siteVal = getMappedVal(importMappings.applySite);
        const urlVal = getMappedVal(importMappings.url);
        const statusVal = getMappedVal(importMappings.status);
        const followUpVal = parseExcelDate(getMappedVal(importMappings.followUpDate));
        const interviewVal = parseExcelDate(getMappedVal(importMappings.interviewDate));
        const salaryVal = getMappedVal(importMappings.salary);
        const contactVal = getMappedVal(importMappings.contactPerson);
        const locationVal = getMappedVal(importMappings.location) || 'Remote';
        const descriptionVal = getMappedVal(importMappings.description) || 'Imported from spreadsheet.';

        // Duplicate checks
        const isDuplicateOf = (j) => {
          const companyMatch = j.company.toLowerCase().trim() === companyVal.toLowerCase().trim();
          const titleMatch = j.title.toLowerCase().trim() === titleVal.toLowerCase().trim();
          
          const hasUrl = !isPlaceholder(j.url) && !isPlaceholder(urlVal);
          const urlMatch = hasUrl && j.url.toLowerCase().trim() === urlVal.toLowerCase().trim();

          if (!companyMatch || !titleMatch) return false;
          if (hasUrl && j.url.toLowerCase().trim() !== urlVal.toLowerCase().trim()) return false;

          return true;
        };

        const inDbDuplicate = jobs.some(isDuplicateOf);
        const inSessionDuplicate = sessionRecords.some(isDuplicateOf);

        if (inDbDuplicate || inSessionDuplicate) {
          duplicateCount++;
          continue;
        }

        // Clean status to match dropdown values
        let finalStatus = 'Applied';
        const cleanSt = statusVal.toLowerCase().trim();
        if (cleanSt.includes('interview')) finalStatus = 'Interviewing';
        else if (cleanSt.includes('offer')) finalStatus = 'Offer';
        else if (cleanSt.includes('reject')) finalStatus = 'Rejected';

        const finalAppliedDate = dateVal || new Date().toISOString().split('T')[0];

        await db.jobs.add({
          title: titleVal,
          company: companyVal,
          url: urlVal,
          status: finalStatus,
          salary: salaryVal,
          location: locationVal,
          description: descriptionVal,
          dateApplied: finalAppliedDate,
          applySite: siteVal,
          followUpDate: followUpVal,
          interviewDate: interviewVal,
          contactPerson: contactVal,
          attachments: [],
          timeline: [
            { date: finalAppliedDate, event: 'Application Imported', note: 'Bulk loaded from spreadsheet.' }
          ]
        });

        sessionRecords.push({
          title: titleVal,
          company: companyVal,
          url: urlVal
        });

        importedCount++;
      }

      alert(`Excel/CSV Import Complete!\n\nImported successfully: ${importedCount} jobs\nSkipped duplicates: ${duplicateCount}`);
      setImportRawRows([]); // Clear raw rows on completion
      setImportModalOpen(false);
    } catch (err) {
      alert(`Database Import Error: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // PDF Text Extraction & Form Autofill
  const handleAutoFillFromPdf = async () => {
    try {
      const file = await window.api.selectFile();
      if (!file) return;

      if (file.type !== 'pdf') {
        alert('Please select a PDF document.');
        return;
      }

      const res = await window.api.parsePdf(file.path);
      if (!res.success) {
        alert(`Failed to parse PDF: ${res.error}`);
        return;
      }

      const text = res.text;
      if (!text || text.trim().length === 0) {
        alert('Could not extract any text from this PDF file.');
        return;
      }

      // Heuristic text parsing
      // Extract Email
      const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const email = emailMatch ? emailMatch[0] : '';

      // Extract Phone
      const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
      const phone = phoneMatch ? phoneMatch[0] : '';

      // Extract Job link
      const linkMatch = text.match(/https?:\/\/[^\s]+/);
      const jdLink = linkMatch ? linkMatch[0] : '';

      // Guess Job Title & Company (scanning first 10 lines)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      let guessedTitle = '';
      let guessedCompany = '';

      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('title:') || line.includes('position:') || line.includes('role:')) {
          guessedTitle = lines[i].split(':')[1]?.trim() || '';
        }
        if (line.includes('company:') || line.includes('employer:')) {
          guessedCompany = lines[i].split(':')[1]?.trim() || '';
        }
      }

      // Fallbacks if keywords aren't found
      if (!guessedTitle && lines.length > 0) guessedTitle = lines[0];
      if (!guessedCompany && lines.length > 1) guessedCompany = lines[1];

      // Pre-fill form
      resetForm();
      setTitle(guessedTitle.substring(0, 50));
      setCompany(guessedCompany.substring(0, 50));
      setUrl(jdLink);
      setDescription(text.substring(0, 1500)); // Put first 1500 chars in description
      setContactPerson(`HR Recruiter (Parsed)`);
      if (email || phone) {
        setDescription(prev => `[Parsed Contact Details]\nEmail: ${email}\nPhone: ${phone}\n\n` + prev);
      }

      setIsModalOpen(true);
      alert('PDF file processed successfully! The new job form has been pre-filled with the extracted text. Please review and save.');
    } catch (err) {
      alert(`PDF parsing error: ${err.message}`);
    }
  };

  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and Sort applications
  const sortedJobs = React.useMemo(() => {
    // 1. First apply search and status filters
    const filtered = jobs.filter(j => {
      const matchesSearch = 
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.location && j.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (j.applySite && j.applySite.toLowerCase().includes(searchTerm.toLowerCase()));
        
      const matchesStatus = statusFilter === 'All' || j.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // 2. Apply sorting if configured
    if (!sortConfig.key) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle undefined/null/empty values by pushing to bottom
      if (aVal === undefined || aVal === null || aVal === '') return 1;
      if (bVal === undefined || bVal === null || bVal === '') return -1;

      // Handle specific numeric/date conversions for sorting
      if (sortConfig.key === 'salary') {
        // Strip non-numeric chars for a better approximation of salary value
        const cleanA = parseFloat(aVal.toString().replace(/[^0-9.]/g, '')) || 0;
        const cleanB = parseFloat(bVal.toString().replace(/[^0-9.]/g, '')) || 0;
        return sortConfig.direction === 'asc' ? cleanA - cleanB : cleanB - cleanA;
      }

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
  }, [jobs, searchTerm, statusFilter, sortConfig]);

  const filteredJobs = sortedJobs;

  // Calculate job sub-dashboard statistics
  const totalJobsCount = jobs.length;
  const appliedJobsCount = jobs.filter(j => j.status === 'Applied').length;
  const interviewingJobsCount = jobs.filter(j => j.status === 'Interviewing').length;
  const offerJobsCount = jobs.filter(j => j.status === 'Offer').length;
  const rejectedJobsCount = jobs.filter(j => j.status === 'Rejected').length;

  const successRate = totalJobsCount > 0 ? Math.round(((offerJobsCount) / totalJobsCount) * 100) : 0;

  // Apply site distribution
  const siteDistribution = jobs.reduce((acc, curr) => {
    const site = curr.applySite || 'Direct / Other';
    acc[site] = (acc[site] || 0) + 1;
    return acc;
  }, {});

  // Real-time duplicates lookup (ignoring placeholders)
  const companyTitleDuplicate = title && company && jobs.find(j => 
    j.id !== editId &&
    !isPlaceholder(company) && !isPlaceholder(j.company) &&
    j.company.toLowerCase().trim() === company.toLowerCase().trim() &&
    !isPlaceholder(title) && !isPlaceholder(j.title) &&
    j.title.toLowerCase().trim() === title.toLowerCase().trim()
  );

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ' ⇅';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Applications</h1>
          <p className="page-subtitle">Track job descriptions, resume updates, interviews, and salary offers.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary"
            onClick={handleImportExcel}
            title="Bulk load job list from Excel/CSV sheet"
          >
            <FileSpreadsheet size={16} /> Import Excel/CSV
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleAutoFillFromPdf}
            title="Auto-fill form details from PDF Job description / Resume"
          >
            <FileText size={16} /> Auto-fill from PDF
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => { resetForm(); setIsModalOpen(true); }}
          >
            <Plus size={16} /> Track Job
          </button>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="view-tabs">
        <div 
          className={`view-tab ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          Applications List
        </div>
        <div 
          className={`view-tab ${viewMode === 'dashboard' ? 'active' : ''}`}
          onClick={() => setViewMode('dashboard')}
        >
          Job Analytics
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Bulk Actions Floating Bar */}
          {selectedIds.length > 0 && (
            <div className="bulk-actions-bar">
              <div className="bulk-actions-info">
                <span>Selected {selectedIds.length} job applications</span>
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
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
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

          {/* Filters Bar */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', position: 'relative', zIndex: 10 }}>
            <div style={{ position: 'relative', flexGrow: 1, minWidth: '200px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                className="form-input"
                placeholder="Search by job title, company, or location..."
                style={{ paddingLeft: '38px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>Status:</span>
              <select 
                className="form-select" 
                style={{ width: '150px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
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

            {/* Column Selector */}
            <div style={{ position: 'relative' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setShowColPicker(!showColPicker)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px' }}
              >
                <Settings size={14} /> Columns
              </button>
              
              {showColPicker && (
                <>
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setShowColPicker(false)} />
                  <div 
                    className="glass-card" 
                    style={{ 
                      position: 'absolute', 
                      top: '44px', 
                      right: 0, 
                      zIndex: 100, 
                      minWidth: '190px', 
                      padding: '16px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      boxShadow: 'var(--shadow-md)',
                      borderRadius: '8px'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                      Show/Hide Columns
                    </span>
                    {Object.keys(visibleCols).map(colKey => (
                      <label key={colKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                          type="checkbox" 
                          checked={visibleCols[colKey]}
                          onChange={(e) => setVisibleCols(prev => ({ ...prev, [colKey]: e.target.checked }))}
                        />
                        {toColumnLabel(colKey)}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Applications list */}
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            {sortedJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No job application logs found.
              </div>
            ) : (
              <div className="track-table-container">
                <table className="track-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox"
                          checked={sortedJobs.length > 0 && sortedJobs.every(j => selectedIds.includes(j.id))}
                          onChange={handleSelectAllJobs}
                        />
                      </th>
                      {visibleCols.company && (
                        <th style={{ width: colWidths.company, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('company')}>
                          Company<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('company')}</span>
                          <div className={`resize-handle ${resizingCol === 'company' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'company')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.title && (
                        <th style={{ width: colWidths.title, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('title')}>
                          Job Position<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('title')}</span>
                          <div className={`resize-handle ${resizingCol === 'title' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'title')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.dateApplied && (
                        <th style={{ width: colWidths.dateApplied, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('dateApplied')}>
                          Date Applied<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('dateApplied')}</span>
                          <div className={`resize-handle ${resizingCol === 'dateApplied' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'dateApplied')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.applySite && (
                        <th style={{ width: colWidths.applySite, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('applySite')}>
                          Apply Site<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('applySite')}</span>
                          <div className={`resize-handle ${resizingCol === 'applySite' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'applySite')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.url && (
                        <th style={{ width: colWidths.url, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('url')}>
                          JD Link<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('url')}</span>
                          <div className={`resize-handle ${resizingCol === 'url' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'url')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.status && (
                        <th style={{ width: colWidths.status, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('status')}>
                          Status<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('status')}</span>
                          <div className={`resize-handle ${resizingCol === 'status' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'status')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.followUpDate && (
                        <th style={{ width: colWidths.followUpDate, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('followUpDate')}>
                          Follow Up Date<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('followUpDate')}</span>
                          <div className={`resize-handle ${resizingCol === 'followUpDate' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'followUpDate')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.interviewDate && (
                        <th style={{ width: colWidths.interviewDate, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('interviewDate')}>
                          Interview Date<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('interviewDate')}</span>
                          <div className={`resize-handle ${resizingCol === 'interviewDate' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'interviewDate')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.salary && (
                        <th style={{ width: colWidths.salary, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('salary')}>
                          Salary<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('salary')}</span>
                          <div className={`resize-handle ${resizingCol === 'salary' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'salary')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                      {visibleCols.location && (
                        <th style={{ width: colWidths.location, position: 'relative', cursor: 'pointer' }} onClick={() => requestSort('location')}>
                          Location<span style={{ fontSize: '10px', color: 'var(--accent-primary)' }}>{getSortIndicator('location')}</span>
                          <div className={`resize-handle ${resizingCol === 'location' ? 'active' : ''}`} onMouseDown={(e) => startResize(e, 'location')} onClick={(e) => e.stopPropagation()} />
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedJobs.map(j => {
                      let badgeClass = 'badge-info';
                      if (j.status === 'Offer') badgeClass = 'badge-success';
                      if (j.status === 'Rejected') badgeClass = 'badge-danger';
                      if (j.status === 'Interviewing') badgeClass = 'badge-warning';

                      const isChecked = selectedIds.includes(j.id);

                      let cellPadding = '16px';
                      if (rowDensity === 'compact') cellPadding = '8px 16px';
                      if (rowDensity === 'cozy') cellPadding = '22px 16px';

                      return (
                        <tr 
                          key={j.id} 
                          onClick={() => { setDrawerJob(j); setSelectedJobId(j.id); }}
                          style={{ background: isChecked ? 'rgba(6, 182, 212, 0.05)' : '' }}
                        >
                          <td style={{ textAlign: 'center', padding: cellPadding }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleSelect(e, j.id)}
                            />
                          </td>
                          {visibleCols.company && (
                            <td style={{ fontWeight: '600', padding: cellPadding, width: colWidths.company, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.company}</td>
                          )}
                          {visibleCols.title && (
                            <td style={{ padding: cellPadding, width: colWidths.title, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</td>
                          )}
                          {visibleCols.dateApplied && (
                            <td style={{ padding: cellPadding, width: colWidths.dateApplied, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.dateApplied}</td>
                          )}
                          {visibleCols.applySite && (
                            <td style={{ padding: cellPadding, width: colWidths.applySite, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.applySite || '—'}</td>
                          )}
                          {visibleCols.url && (
                            <td style={{ padding: cellPadding, width: colWidths.url }}>
                              {j.url ? (
                                <a 
                                  href={j.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()} 
                                  style={{ color: 'var(--accent-primary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '2px' }}
                                >
                                  JD <ExternalLink size={10} />
                                </a>
                              ) : '—'}
                            </td>
                          )}
                          {visibleCols.status && (
                            <td style={{ padding: cellPadding, width: colWidths.status }}>
                              <span className={`badge ${badgeClass}`}>{j.status}</span>
                            </td>
                          )}
                          {visibleCols.followUpDate && (
                            <td style={{ padding: cellPadding, width: colWidths.followUpDate, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.followUpDate || '—'}</td>
                          )}
                          {visibleCols.interviewDate && (
                            <td style={{ padding: cellPadding, width: colWidths.interviewDate, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.interviewDate || '—'}</td>
                          )}
                          {visibleCols.salary && (
                            <td style={{ padding: cellPadding, width: colWidths.salary, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.salary || '—'}</td>
                          )}
                          {visibleCols.location && (
                            <td style={{ padding: cellPadding, width: colWidths.location, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.location || '—'}</td>
                          )}
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
              <div className="stat-label">Total Applications</div>
              <div className="stat-value" style={{ fontSize: '32px' }}>{totalJobsCount}</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
              <div className="stat-label">Interviewing Stage</div>
              <div className="stat-value" style={{ fontSize: '32px', color: 'var(--color-warning)' }}>{interviewingJobsCount}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="stat-label">Success Rate (Offers)</div>
              <div className="stat-value" style={{ fontSize: '32px', color: 'var(--color-success)' }}>{successRate}%</div>
            </div>
          </div>

          {/* SVG Applications status distribution */}
          <div className="glass-card">
            <h3>Outcome Stages</h3>
            <div className="chart-container" style={{ marginTop: '16px', minHeight: '200px' }}>
              <svg width="100%" height="200" viewBox="0 0 300 200">
                {[
                  { label: 'Applied', count: appliedJobsCount, fill: 'var(--color-info)' },
                  { label: 'Interviewing', count: interviewingJobsCount, fill: 'var(--color-warning)' },
                  { label: 'Offer', count: offerJobsCount, fill: 'var(--color-success)' },
                  { label: 'Rejected', count: rejectedJobsCount, fill: 'var(--color-danger)' }
                ].map((item, idx) => {
                  const maxVal = Math.max(appliedJobsCount, interviewingJobsCount, offerJobsCount, rejectedJobsCount, 1);
                  const barWidth = Math.max((item.count / maxVal) * 160, 5);
                  const y = 30 + idx * 40;
                  return (
                    <g key={idx}>
                      <text x="10" y={y + 12} fill="var(--text-secondary)" fontSize="11" fontWeight="600">{item.label}</text>
                      <rect x="100" y={y} width={barWidth} height="16" rx="4" fill={item.fill} className="svg-bar" />
                      <text x={105 + barWidth} y={y + 12} fill="var(--text-primary)" fontSize="11" fontWeight="700">{item.count}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Top Job Sites distribution */}
          <div className="glass-card">
            <h3>Channels & Platforms</h3>
            <div className="chart-container" style={{ marginTop: '16px', minHeight: '200px', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'stretch' }}>
              {Object.keys(siteDistribution).length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>No platform data.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '180px', paddingRight: '4px' }}>
                  {Object.entries(siteDistribution).map(([site, count], idx) => {
                    const pct = Math.round((count / totalJobsCount) * 100);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{site}</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>{count} roles ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Slide out drawer */}
      {drawerJob && (
        <>
          <div className="detail-drawer-overlay" onClick={() => { setDrawerJob(null); setSelectedJobId(null); }} />
          <div className="detail-drawer">
            <div className="detail-drawer-header">
              <span style={{ fontWeight: '800', fontSize: '16px', color: 'var(--accent-primary)' }}>Job Application CRM</span>
              <button className="modal-close-btn" onClick={() => { setDrawerJob(null); setSelectedJobId(null); }}><X size={20} /></button>
            </div>

            <div className="detail-drawer-body">
              {/* Header profile */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', color: 'var(--color-warning)' }}>
                  <Briefcase size={26} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{drawerJob.title}</h2>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Building size={14} /> {drawerJob.company}
                </span>
                <div style={{ alignSelf: 'center', marginTop: '4px' }}>
                  <span className={`badge ${drawerJob.status === 'Offer' ? 'badge-success' : drawerJob.status === 'Rejected' ? 'badge-danger' : drawerJob.status === 'Interviewing' ? 'badge-warning' : 'badge-info'}`}>
                    {drawerJob.status}
                  </span>
                </div>
              </div>

              {/* Attributes specs */}
              <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', fontSize: '13px' }}>
                <span className="detail-section-title">Application Metadata</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {drawerJob.salary && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DollarSign size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Compensation: <strong style={{ color: 'var(--text-primary)' }}>{drawerJob.salary}</strong></span>
                    </div>
                  )}
                  {drawerJob.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Location: {drawerJob.location}</span>
                    </div>
                  )}
                  {drawerJob.applySite && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Globe size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Apply Site: {drawerJob.applySite}</span>
                    </div>
                  )}
                  {drawerJob.contactPerson && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <User size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>Contact Person: {drawerJob.contactPerson}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                    <span>Applied on: {drawerJob.dateApplied}</span>
                  </div>
                  {drawerJob.interviewDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} style={{ color: 'var(--color-warning)' }} />
                      <span>Interview Date: {drawerJob.interviewDate}</span>
                    </div>
                  )}
                  {drawerJob.followUpDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} style={{ color: 'var(--color-info)' }} />
                      <span>Follow Up Date: {drawerJob.followUpDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {drawerJob.description && (
                <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="detail-section-title">Job Details / Description</span>
                  <div 
                    style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginTop: '6px' }}
                    dangerouslySetInnerHTML={{ __html: drawerJob.description }}
                  />
                </div>
              )}

              {/* Job posting link */}
              {drawerJob.url && (
                <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="detail-section-title">Job Listing Link</span>
                  <LinkPreview url={drawerJob.url} />
                </div>
              )}

              {/* Sequential Event Timeline */}
              <div className="detail-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <span className="detail-section-title">Interview Stage Timeline</span>
                
                {/* Timeline display */}
                <div className="timeline-list" style={{ marginTop: '12px' }}>
                  {(drawerJob.timeline || []).map((tEvent, idx) => (
                    <div key={idx} className="timeline-card">
                      <div className="timeline-dot" />
                      <div className="timeline-header">
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{tEvent.event}</span>
                        <span>{tEvent.date}</span>
                      </div>
                      {tEvent.note && <span className="timeline-text">{tEvent.note}</span>}
                    </div>
                  ))}
                </div>

                {/* Inline add timeline event form */}
                <form onSubmit={handleAddTimelineEvent} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>Log timeline milestone:</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Technical Round Interview"
                      style={{ padding: '6px 10px', fontSize: '12px', flexGrow: 1 }}
                      value={eventText}
                      onChange={(e) => setEventText(e.target.value)}
                      required
                    />
                    <input 
                      type="date" 
                      className="form-input" 
                      style={{ padding: '6px 10px', fontSize: '12px', width: '120px' }}
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '12px' }}>
                      Add
                    </button>
                  </div>
                </form>
              </div>

              {/* Attachments resumes / cover letters */}
              <div className="detail-section">
                <span className="detail-section-title">Submitted Materials (Resumes, Portfolios)</span>
                <AttachmentsArea 
                  attachments={drawerJob.attachments || []}
                  onAddAttachment={async (file) => {
                    const list = [...(drawerJob.attachments || []), file];
                    await db.jobs.update(drawerJob.id, { attachments: list });
                  }}
                  onRemoveAttachment={async (index) => {
                    const list = [...(drawerJob.attachments || [])];
                    list.splice(index, 1);
                    await db.jobs.update(drawerJob.id, { attachments: list });
                  }}
                />
              </div>

              {/* Drawer foot actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleOpenEdit(drawerJob)}
                  style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}
                >
                  <Edit size={14} /> Edit Details
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleDeleteJob(drawerJob.id)}
                  style={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

            </div>
          </div>
        </>
      )}

      {/* Creation Modal form */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-title">{isEditMode ? 'Edit Application Details' : 'Track Job Application'}</span>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmitJob}>
              <div className="modal-body">
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Title / Position *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Operations Associate"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Maxim AI"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {companyTitleDuplicate && (
                  <div style={{ marginTop: '-8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-warning)', fontWeight: '600' }}>
                      ⚠️ Duplicate alert: You already have a tracked application for "{title}" at "{company}" (Stage: {companyTitleDuplicate.status})
                    </span>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Apply Site</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Wellfound, LinkedIn"
                      value={applySite}
                      onChange={(e) => setApplySite(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job Posting URL (JD Link)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="e.g. https://wellfound.com/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        style={{ flexGrow: 1 }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ flexShrink: 0, padding: '10px 14px' }}
                        onClick={handleFetchJobInfo}
                        disabled={isScraping}
                      >
                        {isScraping ? 'Scraping...' : 'Fetch Info'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Application Status</label>
                    <select 
                      className="form-select"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offer">Offer</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Salary Compensation</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. $80,000 / year"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Job Location</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Remote"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Applied</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={dateApplied}
                      onChange={(e) => setDateApplied(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Interview Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={interviewDate}
                      onChange={(e) => setInterviewDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Follow Up Date</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Jane Doe (HR)"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Job Description / Requirements</label>
                  <RichTextEditor 
                    value={description}
                    onChange={setDescription}
                    placeholder="Paste role requirements or note your application strategy..."
                  />
                </div>

                {/* Resumes / cover letter uploads */}
                <div className="form-group">
                  <label className="form-label">Materials Submitted (Resumes, Portfolios, Work Samples)</label>
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
                <button type="submit" className="btn btn-primary">{isEditMode ? 'Save Edits' : 'Track Application'}</button>
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
                <span className="modal-title" style={{ display: 'block' }}>Map Excel Columns to Job Application Fields</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({importRawRows.length} rows parsed)</span>
              </div>
              <button className="modal-close-btn" onClick={() => setImportModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Company Name * (Required)</label>
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
                  <label className="form-label" style={{ fontWeight: '700' }}>Job Position * (Required)</label>
                  <select 
                    className="form-select"
                    value={importMappings.title}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, title: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Date Applied</label>
                  <select 
                    className="form-select"
                    value={importMappings.dateApplied}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, dateApplied: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Apply Site / Platform</label>
                  <select 
                    className="form-select"
                    value={importMappings.applySite}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, applySite: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Job Posting Link (URL)</label>
                  <select 
                    className="form-select"
                    value={importMappings.url}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, url: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Application Status</label>
                  <select 
                    className="form-select"
                    value={importMappings.status}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, status: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Salary Range / Offer</label>
                  <select 
                    className="form-select"
                    value={importMappings.salary}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, salary: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Job Location (City/Remote)</label>
                  <select 
                    className="form-select"
                    value={importMappings.location}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, location: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Follow Up Date</label>
                  <select 
                    className="form-select"
                    value={importMappings.followUpDate}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, followUpDate: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Interview Date</label>
                  <select 
                    className="form-select"
                    value={importMappings.interviewDate}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, interviewDate: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Contact Person / Recruiter</label>
                  <select 
                    className="form-select"
                    value={importMappings.contactPerson}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, contactPerson: parseInt(e.target.value) }))}
                  >
                    <option value="-1">-- Ignore / Skip --</option>
                    {importHeaders.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: '700' }}>Job Description / Notes</label>
                  <select 
                    className="form-select"
                    value={importMappings.description}
                    onChange={(e) => setImportMappings(prev => ({ ...prev, description: parseInt(e.target.value) }))}
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
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Company</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Job Position</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Date Applied</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Status</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Salary</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Location</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-secondary)' }}>Contact Person</th>
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
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.company)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.title)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.dateApplied)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.status)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.salary)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.location)}</td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{getPreview(importMappings.contactPerson)}</td>
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
                disabled={importMappings.title === -1 || importMappings.company === -1 || isImporting}
              >
                {isImporting ? 'Importing...' : `Import ${importRawRows.length} Jobs`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
