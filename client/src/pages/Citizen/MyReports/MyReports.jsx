import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiTrash2, FiClock, FiMapPin, FiPlusCircle, 
  FiCheckCircle, FiActivity, FiChevronRight, FiAlertCircle, FiArrowRight, FiShield
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import './MyReports.css';

export default function MyReports() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { t, language } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/issues/my-reports');
      if (res.data && Array.isArray(res.data)) {
        const mapped = res.data.map(item => ({
          id: item.complaintId || item._id,
          _id: item._id,
          complaintId: item.complaintId || item._id,
          title: item.title,
          category: item.category,
          status: item.status || 'Submitted',
          priority: item.priority || item.aiSeverity || 'High',
          location: item.location,
          ward: item.wardName || item.wardId || 'Ward 4',
          assignedDept: item.assignedDept || 'Roads & Infrastructure Department',
          image: item.image || `https://picsum.photos/seed/${item._id}/400/300`,
          date: new Date(item.createdAt || item.reportedDate || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }));
        setReports(mapped);
      }
    } catch (err) {
      console.error("Error fetching my reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [token]);

  // Filter Reports
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      (r.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.complaintId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.location || '').toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (statusFilter !== 'All') {
      const s = (r.status || '').toLowerCase();
      if (statusFilter === 'Pending') {
        matchesStatus = s.includes('submit') || s.includes('ward') || s.includes('under review') || s.includes('report') || s.includes('unsolved');
      } else if (statusFilter === 'In Progress') {
        matchesStatus = s.includes('progress') || s.includes('assigned');
      } else if (statusFilter === 'Resolved') {
        matchesStatus = s.includes('resolv') || s.includes('solved');
      } else if (statusFilter === 'Rejected') {
        matchesStatus = s.includes('reject');
      } else {
        matchesStatus = s === statusFilter.toLowerCase();
      }
    }

    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('resolv') || s.includes('solved')) return 'badge-solved';
    if (s.includes('progress') || s.includes('assigned') || s.includes('complet')) return 'badge-in-progress';
    if (s.includes('reject')) return 'badge-rejected';
    return 'badge-unsolved';
  };

  return (
    <div className="my-reports-page animate-fade-in">
      <div className="reports-top-header">
        <div>
          <h1 className="page-heading">My Submitted Complaints</h1>
          <p className="page-subheading">
            Track the real-time progress of civic issues you have reported.
          </p>
        </div>
        <button className="btn-new-report" onClick={() => navigate('/report-issue')}>
          <FiPlusCircle /> Report New Issue
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="reports-filter-bar">
        <div className="search-box">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by Complaint ID, title, or location..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {['All', 'Pending', 'In Progress', 'Resolved', 'Rejected'].map((status) => (
            <button 
              key={status}
              className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
          <FiActivity className="animate-spin" style={{ fontSize: '2rem', color: '#EA580C', marginBottom: '12px' }} />
          <p>Loading your complaint history from municipal database...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="empty-reports-card">
          <FiAlertCircle className="empty-icon" />
          <h3>No complaints found</h3>
          <p>You haven't filed any complaints matching this filter.</p>
          <button className="btn-new-report" onClick={() => navigate('/report-issue')}>
            <FiPlusCircle /> Submit a Civic Complaint
          </button>
        </div>
      ) : (
        <div className="reports-grid">
          {filteredReports.map((report) => (
            <div key={report.id || report._id} className="report-card">
              <div className="report-card-image-wrap">
                <img src={report.image} alt={report.title} className="report-card-image" />
                <span className={`report-status-badge ${getStatusBadgeClass(report.status)}`}>
                  {report.status}
                </span>
              </div>

              <div className="report-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="report-id-text">#{report.complaintId || report.id}</span>
                  <span className="report-category-text">{report.category}</span>
                </div>

                <h3 className="report-card-title">{report.title}</h3>
                <p className="report-card-loc">
                  <FiMapPin /> {report.location}
                </p>

                <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', margin: '8px 0' }}>
                  <FiShield style={{ color: '#EA580C' }} /> Ward: <strong>{report.ward}</strong>
                </div>

                <div className="report-card-footer">
                  <span className="report-date-text">
                    <FiClock /> {report.date}
                  </span>
                  <button 
                    className="btn-track-action"
                    onClick={() => navigate(`/track-report/${report.complaintId || report._id}`)}
                  >
                    Track Progress <FiArrowRight />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
