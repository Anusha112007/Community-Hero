import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiFilter, FiSettings, FiActivity, FiArrowRight, FiCheckCircle, FiClock, FiAlertCircle, FiAlertTriangle, FiFileText, FiRefreshCw
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import '../../Officer/Dashboard/OfficerDashboard.css';
import '../../../components/dashboards/OfficerDashboardCards/OfficerDashboardCards.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    newComplaints: 0,
    pendingVerification: 0,
    verifiedComplaints: 0,
    departmentAssigned: 0,
    workInProgress: 0,
    completedWork: 0,
    awaitingAdminVerification: 0,
    resolvedComplaints: 0,
    rejectedComplaints: 0,
    overdueComplaints: 0,
  });
  const [userStats, setUserStats] = useState({ total: 0, citizens: 0, wardOfficers: 0, deptOfficers: 0 });
  const [loading, setLoading] = useState(true);

  const adminName = user?.name || 'City Administrator';

  const loadAdminDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, issuesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/issues')
      ]);

      if (statsRes.data && statsRes.data.stats) {
        setStats(statsRes.data.stats);
        if (statsRes.data.users) {
          setUserStats(statsRes.data.users);
        }
      }

      if (issuesRes.data && Array.isArray(issuesRes.data)) {
        const sortedRecent = [...issuesRes.data]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 6);
        setIssues(sortedRecent);
      }
    } catch (err) {
      console.error('Admin dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminDashboardData();
  }, []);

  const handleStatCardClick = (statusFilter) => {
    navigate(`/admin/manage-issues?status=${encodeURIComponent(statusFilter)}`);
  };

  return (
    <div className="officer-dashboard-page">
      {/* HEADER SECTION */}
      <div className="officer-top-header">
        <div className="officer-header-left">
          <h1>Good day, {adminName} 👋</h1>
          <p className="officer-subtitle">
            Municipal Command Center — Global Oversight, Verification, & Civic Performance Metrics.
          </p>
        </div>
        <div className="officer-header-right" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={loadAdminDashboardData}
            style={{ padding: '8px 14px', background: '#FFF7ED', color: '#EA580C', border: '1.5px solid #FED7AA', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} /> Refresh Global
          </button>
          <div className="ward-badge-tag" style={{ background: '#FFF7ED', color: '#C2410C', borderColor: '#FED7AA' }}>
            <FiSettings /> Master Oversight
          </div>
          <div className="realtime-status-pill">
            <span className="pulse-green-dot"></span> System Online
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE 11-METRIC STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', margin: '20px 0' }}>
        
        {/* Total Complaints */}
        <div className="kpi-card" onClick={() => handleStatCardClick('All')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num">{stats.total}</span>
            <p className="kpi-label">Total Complaints</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#EA580C' }}>
            <FiActivity /> <span>All-time platform issues</span>
          </div>
        </div>

        {/* New Complaints */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Submitted')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num">{stats.newComplaints}</span>
            <p className="kpi-label">New Complaints</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#3B82F6' }}>
            <FiFileText /> <span>Newly submitted by citizens</span>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Under Ward Verification')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num">{stats.pendingVerification}</span>
            <p className="kpi-label">Pending Verification</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#F59E0B' }}>
            <FiAlertCircle /> <span>Awaiting ward officers</span>
          </div>
        </div>

        {/* Verified Complaints */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Verified')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num">{stats.verifiedComplaints}</span>
            <p className="kpi-label">Verified Complaints</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#10B981' }}>
            <FiCheckCircle /> <span>Validated by ward staff</span>
          </div>
        </div>

        {/* Department Assigned */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Forwarded to Department')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num">{stats.departmentAssigned}</span>
            <p className="kpi-label">Department Assigned</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#8B5CF6' }}>
            <FiClock /> <span>Routing to work crews</span>
          </div>
        </div>

        {/* Work In Progress */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Work In Progress')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num">{stats.workInProgress}</span>
            <p className="kpi-label">Work In Progress</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#EA580C' }}>
            <FiActivity /> <span>Active field execution</span>
          </div>
        </div>

        {/* Completed Work */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Work Completed')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num">{stats.completedWork}</span>
            <p className="kpi-label">Completed Work</p>
          </div>
          <div className="kpi-trend trend-up">
            <FiCheckCircle /> <span>Submitted by department</span>
          </div>
        </div>

        {/* Awaiting Admin Verification */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Awaiting Admin Verification')} style={{ cursor: 'pointer', border: stats.awaitingAdminVerification > 0 ? '1.5px solid #EA580C' : '1px solid #E2E8F0' }}>
          <div className="kpi-val-group">
            <span className="kpi-num" style={{ color: stats.awaitingAdminVerification > 0 ? '#EA580C' : '#0F172A' }}>{stats.awaitingAdminVerification}</span>
            <p className="kpi-label" style={{ fontWeight: 800 }}>Awaiting Admin Verification</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#EA580C' }}>
            <FiAlertTriangle /> <span>Needs your sign-off</span>
          </div>
        </div>

        {/* Resolved Complaints */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Resolved')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num" style={{ color: '#16A34A' }}>{stats.resolvedComplaints}</span>
            <p className="kpi-label">Resolved Complaints</p>
          </div>
          <div className="kpi-trend trend-up">
            <FiCheckCircle /> <span>Officially closed</span>
          </div>
        </div>

        {/* Rejected Complaints */}
        <div className="kpi-card" onClick={() => handleStatCardClick('Rejected')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num" style={{ color: '#DC2626' }}>{stats.rejectedComplaints}</span>
            <p className="kpi-label">Rejected Complaints</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#DC2626' }}>
            <FiAlertCircle /> <span>Invalid / duplicate</span>
          </div>
        </div>

        {/* Overdue Complaints */}
        <div className="kpi-card" onClick={() => handleStatCardClick('All')} style={{ cursor: 'pointer' }}>
          <div className="kpi-val-group">
            <span className="kpi-num" style={{ color: stats.overdueComplaints > 0 ? '#DC2626' : '#64748B' }}>{stats.overdueComplaints}</span>
            <p className="kpi-label">Overdue Complaints</p>
          </div>
          <div className="kpi-trend trend-orange" style={{ color: '#DC2626' }}>
            <FiClock /> <span>Open &gt; 7 days</span>
          </div>
        </div>
      </div>

      {/* USER ECOSYSTEM STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#F8FAFC', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Registered Citizens</span>
          <strong style={{ fontSize: '1.25rem', color: '#0F172A' }}>{userStats.citizens}</strong>
        </div>
        <div style={{ background: '#F8FAFC', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Ward Officers</span>
          <strong style={{ fontSize: '1.25rem', color: '#0F172A' }}>{userStats.wardOfficers}</strong>
        </div>
        <div style={{ background: '#F8FAFC', padding: '14px 18px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Department Officers</span>
          <strong style={{ fontSize: '1.25rem', color: '#0F172A' }}>{userStats.deptOfficers}</strong>
        </div>
      </div>

      {/* RECENT GLOBAL OPERATIONS */}
      <div className="officer-reports-section">
        <div className="officer-reports-header">
          <h2>Recent Platform Complaints ({issues.length})</h2>
          <Link to="/admin/manage-issues" className="view-all-link" style={{ color: '#EA580C', fontWeight: 700, textDecoration: 'none' }}>
            View Full Database <FiArrowRight />
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Loading real-time platform issues...</div>
        ) : issues.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            No complaints found in the database.
          </div>
        ) : (
          <div className="officer-cards-list">
            {issues.map((t) => (
              <div key={t._id || t.id} className="officer-issue-card">
                <div className="officer-card-img">
                  <img src={t.image || t.imageUrl || `https://picsum.photos/seed/${t._id}/400/300`} alt={t.title} />
                </div>

                <div className="officer-card-body">
                  <div className="officer-card-header">
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>
                        {t.complaintId || t._id}
                      </span>
                      <h3 style={{ margin: '2px 0 0' }}>{t.title}</h3>
                    </div>
                    <div className="officer-badge-cluster">
                      <span className={`officer-status-pill ${(t.status || 'Submitted').toLowerCase().replace(/\s+/g, '-')}`}>
                        {t.status || 'Submitted'}
                      </span>
                      <span className={`officer-priority-pill ${(t.priority || 'Medium').toLowerCase()}`}>
                        {t.priority || 'Medium'}
                      </span>
                    </div>
                  </div>

                  <div className="officer-meta-row">
                    <span className="officer-category-badge">{t.category || 'General'}</span>
                    <span className="meta-sep">•</span>
                    <span>Ward: {t.wardId || 'Unassigned'}</span>
                    <span className="meta-sep">•</span>
                    <span>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recent'}</span>
                    <span className="meta-sep">•</span>
                    <span className="officer-location-text">
                      📍 {t.location || 'Municipal Area'}
                    </span>
                  </div>
                </div>

                <div className="officer-card-actions" style={{ gap: '8px' }}>
                  <Link to={`/admin/manage-issues?search=${encodeURIComponent(t.complaintId || t._id)}`} className="btn-manage-action" style={{ background: '#FFF7ED', color: '#EA580C', border: '1.5px solid #FED7AA', fontWeight: 700 }}>
                    <FiSearch style={{ marginRight: '6px' }} /> Inspect Record
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
