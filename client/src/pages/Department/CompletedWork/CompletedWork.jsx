import { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaDownload, FaSync, FaMapMarkerAlt, FaCheckDouble } from 'react-icons/fa';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { ViewDetailsModal } from '../../../components/Common/DepartmentModals';

import '../../Officer/Dashboard/OfficerDashboard.css';
import '../../../components/dashboards/OfficerDashboardCards/OfficerDashboardCards.css';

export default function CompletedWork() {
  const { user } = useAuth();
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWork, setSelectedWork] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const departmentName = user?.departmentName || 'Roads & Infrastructure Department';

  const loadCompletedWorks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/issues/department/${encodeURIComponent(departmentName)}?status=completed`);
      if (res.data && Array.isArray(res.data)) {
        const mapped = res.data.map(item => ({
          id: item.complaintId || item._id,
          _id: item._id,
          title: item.title,
          description: item.description,
          ward: item.wardId || item.wardName || 'Ward Assigned',
          department: item.assignedDept || departmentName,
          status: item.status,
          finalStatus: item.status === 'Resolved' ? 'Resolved & Verified' : item.status,
          completedDate: item.completionDetails?.completedAt 
            ? new Date(item.completionDetails.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : new Date(item.updatedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          beforeImage: item.completionDetails?.beforeWorkPhoto || item.image || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
          afterImage: item.completionDetails?.afterWorkPhoto || item.resolutionImage || 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80',
          resolutionNote: item.completionDetails?.completionRemarks || item.resolutionNote || 'Civic repair completed and inspected.',
          location: item.location,
          category: item.category,
          priority: item.priority || 'Medium',
          feedback: item.citizenFeedback
        }));
        setCompleted(mapped);
      }
    } catch (err) {
      console.error('Error loading completed works:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompletedWorks();
  }, [departmentName]);

  const filtered = completed.filter(c => {
    const term = (search || '').toLowerCase();
    return (
      (c.title || '').toLowerCase().includes(term) || 
      (String(c.id || '')).toLowerCase().includes(term) ||
      (c.location && c.location.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>Completed Work Archive</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Historical record of resolved municipal tickets with before/after photo verification.</p>
        </div>
        <button 
          onClick={loadCompletedWorks}
          style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
        >
          <FaSync className={loading ? 'animate-spin' : ''} /> Refresh Archive
        </button>
      </div>

      <div style={{ padding: '12px 16px', background: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', width: '340px' }}>
        <FaSearch style={{ color: '#64748b', marginRight: '10px' }} />
        <input 
          type="text" 
          placeholder="Search resolved archive..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent', fontSize: '0.875rem' }} 
        />
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading completed work records...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>No Completed Work Archived Yet</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Once department crews resolve tickets in "Update Progress", they will permanently appear here.</p>
        </div>
      ) : (
        <div className="officer-cards-list">
          {filtered.map(item => (
            <div key={item.id} className="officer-issue-card">
              <div className="officer-card-img">
                <img src={item.afterImage || item.beforeImage || `https://picsum.photos/seed/${item.id}/400/300`} alt={item.title} />
              </div>

              <div className="officer-card-body">
                <div className="officer-card-header">
                  <h3>{item.title}</h3>
                  <div className="officer-badge-cluster">
                    <span className={`officer-status-pill solved`}>
                      {item.finalStatus || 'RESOLVED'}
                    </span>
                    <span className={`officer-priority-pill ${(item.priority || 'medium').toLowerCase()}`}>
                      {item.priority || 'Medium'} Priority
                    </span>
                  </div>
                </div>

                <div className="officer-meta-row">
                  <span className="officer-category-badge">{item.ward || item.department}</span>
                  <span className="meta-sep">•</span>
                  <span>{item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString() : item.completedDate || 'Recently'}</span>
                  <span className="meta-sep">•</span>
                  <span className="officer-location-text">
                    <FaMapMarkerAlt style={{ color: '#ef4444', marginRight: '4px' }} />
                    {item.location}
                  </span>
                </div>
              </div>

              <div className="officer-card-actions" style={{ gap: '8px' }}>
                <button 
                  className="btn-manage-action"
                  style={{ background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)', borderColor: '#D97706' }}
                  onClick={() => alert(`Certificate of completion downloaded for ticket #${item.id}`)}
                >
                  <FaDownload /> Certificate
                </button>
                <button 
                  className="btn-manage-action"
                  style={{ background: '#FFFFFF', color: '#EA580C', border: '1px solid #fed7aa' }}
                  onClick={() => { setSelectedWork(item); setViewModalOpen(true); }}
                >
                  <FaEye /> Full Ticket
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ViewDetailsModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        work={selectedWork} 
      />
    </div>
  );
}