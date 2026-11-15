import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FaSearch, FaEye, FaUserCheck, FaTrash, FaCheckDouble, FaSync, FaShieldAlt, 
  FaUndo, FaCheckCircle, FaTimesCircle, FaImage, FaStar
} from 'react-icons/fa';
import api from '../../../services/api';
import { DeleteModal, AssignOfficerModal, ViewDetailsModal } from '../../../components/Common/Modals';
import '../AdminStyles.css';

export default function ManageIssues() {
  const location = useLocation();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const [selectedIssue, setSelectedIssue] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [adminVerifyModalOpen, setAdminVerifyModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);
  
  const [adminRemarks, setAdminRemarks] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [notification, setNotification] = useState('');

  // Handle URL query parameters from AdminDashboard drill-down
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    const searchParam = params.get('search');
    if (statusParam) setStatusFilter(statusParam);
    if (searchParam) setSearchTerm(searchParam);
  }, [location.search]);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const res = await api.get('/issues');
      if (res.data && Array.isArray(res.data)) {
        const mapped = res.data.map(i => ({
          id: i.complaintId || i._id,
          _id: i._id,
          complaintId: i.complaintId || i._id,
          title: i.title,
          category: i.category || 'Roads',
          priority: i.priority || 'High',
          location: i.location || 'Unknown Location',
          ward: i.wardId || i.wardName || 'Unassigned',
          department: i.assignedDept || 'Pending Assignment',
          status: i.status || 'Submitted',
          assignedOfficer: i.assignmentDetails?.assignedTo || 'Pending Assignment',
          description: i.description,
          image: i.image || i.imageUrl,
          completionDetails: i.completionDetails,
          verificationDetails: i.verificationDetails,
          citizenFeedback: i.citizenFeedback,
          date: new Date(i.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }));
        setIssues(mapped);
      }
    } catch (err) {
      console.error('Error loading admin issues:', err);
      showNotification('Failed to load issues from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4500);
  };

  const handleAssignOfficer = async (dept, officer) => {
    if (!selectedIssue) return;
    try {
      await api.put(`/issues/${selectedIssue._id}/department-assign`, {
        assignedDept: dept || 'Roads & Infrastructure Department',
        assignedTo: officer || 'Designated Field Team',
        priority: selectedIssue.priority || 'High',
        workInstructions: `Assigned directly by Municipal Administrator to ${dept}.`
      });
      showNotification(`Ticket #${selectedIssue.id} assigned to ${dept}!`);
      loadIssues();
      setAssignModalOpen(false);
    } catch (err) {
      console.error('Error assigning officer:', err);
      showNotification(err.response?.data?.message || 'Error assigning department');
    }
  };

  const handleAdminVerify = async (approved) => {
    if (!selectedIssue) return;
    setSubmittingAction(true);
    try {
      await api.put(`/issues/${selectedIssue._id}/admin-verify`, {
        approved,
        reviewRemarks: adminRemarks || (approved ? 'Admin inspected evidence: Resolution Approved.' : 'Corrections needed: Quality did not meet municipal standards.')
      });
      showNotification(approved ? `Ticket #${selectedIssue.id} resolution approved & resolved!` : `Ticket #${selectedIssue.id} sent back for correction.`);
      setAdminVerifyModalOpen(false);
      setAdminRemarks('');
      loadIssues();
    } catch (err) {
      console.error('Error in admin verification:', err);
      showNotification(err.response?.data?.message || 'Error processing admin verification');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReopenComplaint = async () => {
    if (!selectedIssue || !reopenReason.trim()) {
      alert('Please provide a mandatory reason for reopening this complaint.');
      return;
    }
    setSubmittingAction(true);
    try {
      await api.post(`/issues/${selectedIssue._id}/reopen`, {
        reason: reopenReason
      });
      showNotification(`Complaint #${selectedIssue.id} reopened successfully.`);
      setReopenModalOpen(false);
      setReopenReason('');
      loadIssues();
    } catch (err) {
      console.error('Error reopening issue:', err);
      showNotification(err.response?.data?.message || 'Error reopening complaint');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!selectedIssue) return;
    try {
      await api.delete(`/issues/${selectedIssue._id}`);
      setIssues(prev => prev.filter(i => i._id !== selectedIssue._id));
      setDeleteModalOpen(false);
      showNotification(`Issue #${selectedIssue.id} permanently deleted.`);
    } catch (err) {
      console.error('Error deleting issue:', err);
      showNotification(err.response?.data?.message || 'Error deleting ticket');
    }
  };

  const filteredIssues = issues.filter(i => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = (i.title || '').toLowerCase().includes(term) || 
                          (i.location || '').toLowerCase().includes(term) ||
                          String(i.id || '').toLowerCase().includes(term);
    const matchesCat = categoryFilter === 'All' || (i.category || '').toLowerCase().includes(categoryFilter.toLowerCase());
    const matchesStatus = statusFilter === 'All' || (i.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesPri = priorityFilter === 'All' || (i.priority || '').toLowerCase().includes(priorityFilter.toLowerCase());
    return matchesSearch && matchesCat && matchesStatus && matchesPri;
  });

  return (
    <div className="admin-page-container">
      {/* Top Header */}
      <div className="admin-top-header">
        <div className="admin-header-title">
          <h1>Global Ticket Management</h1>
          <p>Administer, verify completion evidence, re-route, and monitor all civic reports across the municipal platform.</p>
        </div>
        <div className="admin-header-actions">
          <div className="admin-pill-badge">
            <FaShieldAlt /> Central Operations
          </div>
          <button onClick={loadIssues} className="admin-refresh-btn">
            <FaSync className={loading ? 'animate-spin' : ''} /> Refresh Global Database
          </button>
        </div>
      </div>

      {notification && (
        <div className="admin-toast-banner">
          ✓ {notification}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="admin-filters-card">
        <div className="admin-search-wrapper">
          <FaSearch style={{ color: '#EA580C' }} />
          <input 
            type="text" 
            placeholder="Search complaint ID (CH-XXXX), title, or location..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="admin-filter-selects">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="admin-select">
            <option value="All">All Categories</option>
            <option value="Damaged roads">Damaged roads</option>
            <option value="Overflowing drainage">Overflowing drainage</option>
            <option value="Garbage collection problems">Garbage collection problems</option>
            <option value="Broken streetlights">Broken streetlights</option>
            <option value="Water supply problems">Water supply problems</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-select">
            <option value="All">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Ward Verification">Under Ward Verification</option>
            <option value="Verified">Verified</option>
            <option value="Forwarded to Department">Forwarded to Department</option>
            <option value="Work Assigned">Work Assigned</option>
            <option value="Work In Progress">Work In Progress</option>
            <option value="Work Completed">Work Completed</option>
            <option value="Awaiting Admin Verification">Awaiting Admin Verification</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
            <option value="Reopened">Reopened</option>
          </select>

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="admin-select">
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Table Card Container */}
      <div className="admin-table-card">
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Complaint ID & Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Location</th>
                <th>Ward</th>
                <th>Department</th>
                <th>Status</th>
                <th>Assigned Officer</th>
                <th style={{ textAlign: 'center' }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <FaSync className="animate-spin" style={{ marginRight: '8px', color: '#EA580C' }} /> Loading database issues...
                  </td>
                </tr>
              ) : filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No matching reports found in database.
                  </td>
                </tr>
              ) : (
                filteredIssues.map(issue => {
                  const statusNormalized = (issue.status || 'Submitted').toLowerCase().replace(/\s+/g, '-');
                  const priorityNormalized = (issue.priority || 'medium').toLowerCase();
                  const isAwaitingVerification = issue.status === 'Awaiting Admin Verification' || issue.status === 'Work Completed';
                  return (
                    <tr key={issue._id}>
                      <td>
                        <strong style={{ color: '#0F172A', display: 'block' }}>{issue.title}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#EA580C', fontFamily: 'monospace', fontWeight: 700 }}>{issue.id}</span>
                      </td>
                      <td>
                        <span className="admin-category-badge">{issue.category}</span>
                      </td>
                      <td>
                        <span className={`admin-priority-badge ${priorityNormalized}`}>
                          ● {issue.priority}
                        </span>
                      </td>
                      <td style={{ maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={issue.location}>
                        📍 {issue.location}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#475569' }}>{issue.ward}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.825rem', color: '#334155' }}>{issue.department}</span>
                      </td>
                      <td>
                        <span className={`admin-pill-status ${statusNormalized}`}>
                          {issue.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: issue.assignedOfficer === 'Pending Assignment' ? '#94A3B8' : '#0F172A', fontWeight: issue.assignedOfficer === 'Pending Assignment' ? 400 : 600 }}>
                          {issue.assignedOfficer}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions-cell" style={{ justifyContent: 'center', gap: '6px' }}>
                          <button 
                            className="admin-btn-action view" 
                            title="View Full Details & Evidence" 
                            onClick={() => { setSelectedIssue(issue); setViewModalOpen(true); }}
                          >
                            <FaEye />
                          </button>
                          
                          {isAwaitingVerification && (
                            <button 
                              className="admin-btn-action resolve" 
                              title="Review Completion & Verify" 
                              style={{ background: '#EA580C', color: '#fff', borderColor: '#C2410C' }}
                              onClick={() => { setSelectedIssue(issue); setAdminVerifyModalOpen(true); }}
                            >
                              <FaCheckCircle /> Verify
                            </button>
                          )}

                          <button 
                            className="admin-btn-action assign" 
                            title="Assign Department/Team" 
                            onClick={() => { setSelectedIssue(issue); setAssignModalOpen(true); }}
                          >
                            <FaUserCheck />
                          </button>

                          {issue.status === 'Resolved' && (
                            <button 
                              className="admin-btn-action" 
                              title="Reopen Complaint"
                              style={{ background: '#FEF3C7', color: '#D97706', borderColor: '#FDE68A' }}
                              onClick={() => { setSelectedIssue(issue); setReopenModalOpen(true); }}
                            >
                              <FaUndo />
                            </button>
                          )}

                          <button 
                            className="admin-btn-action delete" 
                            title="Delete Ticket" 
                            onClick={() => { setSelectedIssue(issue); setDeleteModalOpen(true); }}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN COMPLETION VERIFICATION MODAL */}
      {adminVerifyModalOpen && selectedIssue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              Admin Verification: #{selectedIssue.id}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '16px' }}>
              Inspect completion evidence submitted by the department before approving resolution or requesting corrections.
            </p>

            {/* Before & After Photo Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ background: '#F1F5F9', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>BEFORE REPAIR</div>
                <img 
                  src={selectedIssue.completionDetails?.beforeWorkPhoto || selectedIssue.image || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'} 
                  alt="Before" 
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }} 
                />
              </div>
              <div style={{ border: '1px solid #BBF7D0', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ background: '#DCFCE7', padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>AFTER REPAIR</div>
                <img 
                  src={selectedIssue.completionDetails?.afterWorkPhoto || 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=400&q=80'} 
                  alt="After" 
                  style={{ width: '100%', height: '150px', objectFit: 'cover' }} 
                />
              </div>
            </div>

            {selectedIssue.completionDetails?.completionRemarks && (
              <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '16px', fontSize: '0.875rem' }}>
                <strong>Department Remarks:</strong> {selectedIssue.completionDetails.completionRemarks}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Admin Review Remarks:
              </label>
              <textarea 
                rows="3" 
                value={adminRemarks} 
                onChange={(e) => setAdminRemarks(e.target.value)} 
                placeholder="Enter verification notes, quality assessment, or reasons for correction..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.875rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setAdminVerifyModalOpen(false)}
                style={{ padding: '10px 16px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                disabled={submittingAction}
                onClick={() => handleAdminVerify(false)}
                style={{ padding: '10px 16px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                Request Corrections
              </button>
              <button 
                disabled={submittingAction}
                onClick={() => handleAdminVerify(true)}
                style={{ padding: '10px 20px', background: '#16A34A', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                Approve & Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REOPEN COMPLAINT MODAL */}
      {reopenModalOpen && selectedIssue && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#9A3412', margin: '0 0 8px' }}>
              Reopen Complaint: #{selectedIssue.id}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.875rem', marginBottom: '16px' }}>
              Provide an official administrative reason for reopening this resolved complaint. The department will be re-assigned.
            </p>
            <textarea 
              rows="4" 
              value={reopenReason} 
              onChange={(e) => setReopenReason(e.target.value)} 
              placeholder="State reason for reopening (e.g., citizen reported recurring water leakage)..."
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.875rem', outline: 'none', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setReopenModalOpen(false)}
                style={{ padding: '8px 14px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                disabled={submittingAction}
                onClick={handleReopenComplaint}
                style={{ padding: '8px 18px', background: '#D97706', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      <AssignOfficerModal 
        isOpen={assignModalOpen} 
        onClose={() => setAssignModalOpen(false)} 
        issueId={selectedIssue?.id} 
        onAssign={(dept, officer) => {
          handleAssignOfficer(dept, officer);
        }} 
      />

      <ViewDetailsModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        title={`Complaint Details: #${selectedIssue?.id}`} 
        data={selectedIssue} 
      />

      <DeleteModal 
        isOpen={deleteModalOpen} 
        onClose={() => setDeleteModalOpen(false)} 
        onConfirm={handleDeleteIssue} 
        itemName={selectedIssue?.title} 
      />
    </div>
  );
}
