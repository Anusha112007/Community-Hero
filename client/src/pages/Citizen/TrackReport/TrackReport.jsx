import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../../services/api';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  FiArrowLeft, FiShare2, FiMapPin, FiClock, FiCheckCircle, 
  FiAlertCircle, FiThumbsUp, FiHeart, FiEye, FiShield, FiLoader, FiBriefcase, FiCalendar, FiEdit3, FiStar, FiRefreshCw, FiMessageSquare
} from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';
import './TrackReport.css';

// Leaflet SVG DivIcon for exact marker pin
const customPinIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `
    <div class="custom-marker-wrapper">
      <div class="custom-marker-head">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
      <div class="custom-marker-shadow"></div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 44],
});

export default function TrackReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(1);
  const isMountedRef = useRef(true);

  // Citizen Feedback Form State
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Additional Information Response State
  const [moreInfoText, setMoreInfoText] = useState('');
  const [isSubmittingInfo, setIsSubmittingInfo] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);

  // Reopen Modal State
  const [reopenReason, setReopenReason] = useState('');
  const [isSubmittingReopen, setIsSubmittingReopen] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);

  // Fetch Report with Auto-Polling
  const fetchReportDetails = async (isInitial = false) => {
    if (!id) {
      setError("Invalid Report ID provided.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(`/issues/${id}`);
      if (res.data && isMountedRef.current) {
        setReport(res.data);
        const likesArr = res.data.likes || [];
        setLikesCount(Array.isArray(likesArr) ? likesArr.length : (likesArr || 0));
        setViewsCount(res.data.views != null ? res.data.views : 1);

        if (user && Array.isArray(likesArr) && likesArr.some(l => l.user === user._id || l.user?._id === user._id || l === user._id)) {
          setIsLiked(true);
        }
        setError(null);
      }
    } catch (err) {
      console.error("Track report error:", err);
      if (isInitial && isMountedRef.current) {
        setError(err.response?.data?.message || "Complaint not found in municipal database.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchReportDetails(true);

    const interval = setInterval(() => {
      fetchReportDetails(false);
    }, 4000);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [id]);

  const handleToggleLike = async () => {
    if (isLiked) {
      setIsLiked(false);
      setLikesCount(prev => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    }

    if (token && id) {
      try {
        const res = await api.post(`/issues/${id}/like`);
        if (res.data) {
          setLikesCount(res.data.likesCount);
          setIsLiked(res.data.isLiked);
        }
      } catch (err) {
        console.error("Toggle like error:", err);
      }
    }
  };

  // Submit Feedback
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      await api.post(`/issues/${id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment,
      });
      setFeedbackSuccess(true);
      fetchReportDetails(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Submit Additional Info
  const handleProvideInfoSubmit = async (e) => {
    e.preventDefault();
    if (!moreInfoText.trim()) return;
    setIsSubmittingInfo(true);
    try {
      await api.post(`/issues/${id}/provide-info`, {
        additionalInfo: moreInfoText.trim(),
      });
      setInfoSuccess(true);
      setMoreInfoText('');
      fetchReportDetails(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit information.");
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  // Submit Reopen Request
  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim()) return;
    setIsSubmittingReopen(true);
    try {
      await api.post(`/issues/${id}/reopen`, {
        reason: reopenReason.trim(),
      });
      setShowReopenModal(false);
      setReopenReason('');
      fetchReportDetails(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reopen complaint.");
    } finally {
      setIsSubmittingReopen(false);
    }
  };

  if (loading) {
    return (
      <div className="track-report-loading-container">
        <FiLoader className="spin-icon text-blue" />
        <p>Loading real-time complaint status...</p>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="track-report-error-container">
        <FiAlertCircle className="error-icon" />
        <h2>Complaint Not Found</h2>
        <p>{error}</p>
        <button className="btn-back-home" onClick={() => navigate('/my-reports')}>
          Back to My Complaints
        </button>
      </div>
    );
  }

  // Extract Report Properties
  const reportId = report.complaintId || report._id || id;
  const title = report.title || 'Civic Issue Report';
  const category = report.category || 'General';
  const description = report.description || 'No detailed description provided.';
  const location = report.location || 'Local Ward Location';
  const rawStatus = (report.status || 'Submitted').trim();
  const priority = report.priority || 'High';
  const image = report.image || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80';
  const lat = Number(report.latitude ?? report.locationCoords?.lat ?? 17.6868);
  const lng = Number(report.longitude ?? report.locationCoords?.lng ?? 83.2185);
  const reportedDate = report.createdAt || report.reportedDate 
    ? new Date(report.createdAt || report.reportedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
    : 'Recent';

  // Details from verification, assignment, completion, admin review
  const verification = report.verificationDetails || {};
  const assignment = report.assignmentDetails || {};
  const completion = report.completionDetails || {};
  const adminReview = report.adminReview || {};
  const citizenFeedback = report.citizenFeedback || {};
  const assignedDepartment = report.assignedDept || 'Roads & Infrastructure Department';

  // Determine Primary Statuses
  let statusBadgeClass = 'badge-unsolved';
  let statusLabel = '🔴 SUBMITTED';
  let statusMessage = 'The complaint has been logged and is awaiting Ward Officer verification.';

  if (rawStatus === 'Resolved' || rawStatus === 'SOLVED') {
    statusBadgeClass = 'badge-solved';
    statusLabel = '🟢 RESOLVED';
    statusMessage = 'The complaint has been resolved by the Department and approved by Administration.';
  } else if (rawStatus === 'Work Completed' || rawStatus === 'Awaiting Admin Verification' || rawStatus === 'Completed') {
    statusBadgeClass = 'badge-in-progress';
    statusLabel = '🔵 WORK COMPLETED (Awaiting Admin Review)';
    statusMessage = 'The department has completed physical work with proof. Pending final administrative verification.';
  } else if (rawStatus === 'Work In Progress' || rawStatus === 'In Progress' || rawStatus === 'IN PROGRESS') {
    statusBadgeClass = 'badge-in-progress';
    statusLabel = '🟠 WORK IN PROGRESS';
    statusMessage = 'Field squad is actively executing repairs on site.';
  } else if (rawStatus === 'Work Assigned' || rawStatus === 'Assigned') {
    statusBadgeClass = 'badge-under-review';
    statusLabel = '🟣 WORK ASSIGNED';
    statusMessage = 'Department supervisor has assigned work to field crew.';
  } else if (rawStatus === 'Forwarded to Department' || rawStatus === 'Verified') {
    statusBadgeClass = 'badge-under-review';
    statusLabel = '🟡 VERIFIED & FORWARDED';
    statusMessage = 'Ward Officer verified this complaint as genuine and forwarded it to the relevant department.';
  } else if (rawStatus === 'More Information Required') {
    statusBadgeClass = 'badge-unsolved';
    statusLabel = '⚠️ MORE INFORMATION REQUIRED';
    statusMessage = 'Ward Officer requested additional information from the citizen.';
  } else if (rawStatus === 'Rejected') {
    statusBadgeClass = 'badge-unsolved';
    statusLabel = '❌ REJECTED';
    statusMessage = `Rejected by Ward Officer. Reason: "${verification.rejectionReason || 'Duplicate or non-civic report'}"`;
  } else if (rawStatus === 'Reopened') {
    statusBadgeClass = 'badge-unsolved';
    statusLabel = '🔄 REOPENED';
    statusMessage = 'Complaint has been reopened for additional inspection or remediation.';
  }

  // 6-Stage Lifecycle Timeline
  const isSubmittedDone = true;
  const isVerifiedDone = [
    'Forwarded to Department', 'Verified', 'Work Assigned', 'Work In Progress', 
    'Work Completed', 'Awaiting Admin Verification', 'Resolved'
  ].includes(rawStatus);
  const isAssignedDone = [
    'Work Assigned', 'Work In Progress', 'Work Completed', 'Awaiting Admin Verification', 'Resolved'
  ].includes(rawStatus);
  const isInProgressDone = [
    'Work In Progress', 'Work Completed', 'Awaiting Admin Verification', 'Resolved'
  ].includes(rawStatus);
  const isCompletedDone = [
    'Work Completed', 'Awaiting Admin Verification', 'Resolved'
  ].includes(rawStatus);
  const isResolvedDone = rawStatus === 'Resolved' || rawStatus === 'SOLVED';

  const timelineStages = [
    { key: 'submitted', label: '1. Submitted', isDone: isSubmittedDone },
    { key: 'verified', label: '2. Ward Verified', isDone: isVerifiedDone },
    { key: 'assigned', label: '3. Dept Assigned', isDone: isAssignedDone },
    { key: 'progress', label: '4. In Progress', isDone: isInProgressDone },
    { key: 'completed', label: '5. Work Done', isDone: isCompletedDone },
    { key: 'resolved', label: '6. Resolved', isDone: isResolvedDone },
  ];

  const isAuthor = user?._id && (report.user === user._id || report.user?._id === user._id);

  return (
    <div className="track-report-page-container">
      {/* Top Back Navigation Bar */}
      <div className="track-top-bar">
        <button className="btn-back-link" onClick={() => navigate('/my-reports')}>
          <FiArrowLeft /> Back to My Complaints
        </button>
        <span className="page-title-badge">Civic Issue Tracker</span>
      </div>

      {/* Main Tracking Card */}
      <div className="track-main-card">
        {/* Card Header */}
        <div className="track-card-header">
          <div>
            <h1 className="track-issue-title">{title}</h1>
            <div className="track-id-row">
              <span className="id-label">Complaint ID:</span>
              <span className="id-value" style={{ color: '#EA580C', fontWeight: 800 }}>#{reportId}</span>
              <span style={{ fontSize: '0.85rem', color: '#64748B', marginLeft: '12px' }}>
                Ward: <strong>{report.wardName || report.wardId || 'WARD-04'}</strong>
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="category-pill-badge">{category}</span>
            <span className={`priority-badge ${priority.toLowerCase()}`}>{priority} Priority</span>
          </div>
        </div>

        {/* CURRENT STATUS CARD */}
        <div className="current-status-section">
          <label className="section-micro-label">CURRENT LIFECYCLE STATUS</label>
          <div className={`status-display-box ${statusBadgeClass}`}>
            <div className="status-header-line">
              <span className="status-badge-text">{statusLabel}</span>
            </div>
            <p className="status-explanation-text">{statusMessage}</p>
          </div>
        </div>

        {/* 6-STAGE VISUAL TIMELINE */}
        <div className="status-timeline-section">
          <label className="section-micro-label">COMPLAINT LIFECYCLE PROGRESS</label>
          <div className="timeline-horizontal-flow">
            {timelineStages.map((stage, idx) => (
              <React.Fragment key={stage.key}>
                <div className={`timeline-stage-item ${stage.isDone ? 'completed' : 'pending'}`}>
                  <div className="stage-icon-circle">
                    {stage.isDone ? <FiCheckCircle /> : <span className="ring-icon" />}
                  </div>
                  <span className="stage-label">{stage.label}</span>
                </div>
                {idx < timelineStages.length - 1 && (
                  <div className={`timeline-connector-line ${timelineStages[idx + 1].isDone ? 'active' : ''}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* SECTION: MORE INFORMATION REQUIRED BY WARD OFFICER */}
        {rawStatus === 'More Information Required' && (
          <div style={{ background: '#FFFBEB', border: '2px solid #FDE68A', borderRadius: '12px', padding: '20px', margin: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#B45309', marginBottom: '8px' }}>
              <FiAlertCircle /> Ward Officer Request for Additional Information
            </div>
            <p style={{ color: '#92400E', fontSize: '0.95rem', margin: '0 0 12px 0' }}>
              "{verification.infoRequested || report.officerRemarks || 'Please provide clearer location landmarks or photo evidence.'}"
            </p>

            {infoSuccess ? (
              <div style={{ background: '#ECFDF5', color: '#065F46', padding: '10px 14px', borderRadius: '8px', fontWeight: 700 }}>
                ✓ Additional information submitted! Your complaint has been moved back to 'Under Ward Verification'.
              </div>
            ) : isAuthor ? (
              <form onSubmit={handleProvideInfoSubmit} style={{ marginTop: '12px' }}>
                <textarea
                  rows="3"
                  value={moreInfoText}
                  onChange={(e) => setMoreInfoText(e.target.value)}
                  placeholder="Provide additional details or landmarks here..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmittingInfo}
                  style={{ marginTop: '8px', padding: '8px 18px', background: '#EA580C', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmittingInfo ? 'Submitting...' : 'Submit Additional Information'}
                </button>
              </form>
            ) : null}
          </div>
        )}

        {/* SECTION: WARD OFFICER VERIFICATION DETAILS */}
        {(verification.verifiedAt || verification.remarks || report.officerRemarks) && (
          <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '18px', margin: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#0F172A', fontSize: '0.95rem', marginBottom: '10px' }}>
              <FiShield style={{ color: '#EA580C' }} /> Ward Officer Verification Details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.85rem', color: '#475569' }}>
              <div>Officer: <strong>{verification.officerName || 'Ward Inspector'}</strong></div>
              <div>Status: <strong>{verification.status || 'Verified'}</strong></div>
              <div>Verified On: <strong>{verification.verifiedAt ? new Date(verification.verifiedAt).toLocaleString() : 'Recent'}</strong></div>
            </div>
            <div style={{ fontSize: '0.88rem', color: '#0F172A', background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', marginTop: '10px' }}>
              <strong>Verification Remarks:</strong> "{verification.remarks || report.officerRemarks || 'Verified on-site.'}"
            </div>
          </div>
        )}

        {/* SECTION: DEPARTMENT WORK ASSIGNMENT DETAILS */}
        {(assignment.assignedAt || assignment.assignedStaff || assignment.assignedTeam) && (
          <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '18px', margin: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#0369A1', fontSize: '0.95rem', marginBottom: '10px' }}>
              <FiBriefcase style={{ color: '#0284C7' }} /> Department Work Order & Assignment
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.85rem', color: '#0369A1' }}>
              <div>Department: <strong>{assignedDepartment}</strong></div>
              <div>Assigned Staff: <strong>{assignment.assignedStaff || 'Field Crew'}</strong></div>
              <div>Field Squad: <strong>{assignment.assignedTeam || 'Unit A'}</strong></div>
              {assignment.staffPhone && <div>Contact: <strong>{assignment.staffPhone}</strong></div>}
            </div>
            {assignment.workInstructions && (
              <div style={{ fontSize: '0.88rem', color: '#0C4A6E', background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #E0F2FE', marginTop: '10px' }}>
                <strong>Work Instructions:</strong> "{assignment.workInstructions}"
              </div>
            )}
            {report.progress !== undefined && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#0369A1', marginBottom: '4px' }}>
                  <span>Work Progress</span>
                  <span>{report.progress}%</span>
                </div>
                <div style={{ height: '8px', background: '#E0F2FE', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${report.progress}%`, height: '100%', background: '#0284C7', borderRadius: '4px' }} />
                </div>
                {report.progressNotes && (
                  <p style={{ fontSize: '0.8rem', color: '#0284C7', marginTop: '4px', fontStyle: 'italic' }}>
                    Latest Note: {report.progressNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECTION: WORK COMPLETION EVIDENCE (BEFORE & AFTER PHOTOGRAPHS) */}
        {(completion.completedAt || report.resolutionImage) && (
          <div style={{ background: '#F0FDF4', border: '2px solid #86EFAC', borderRadius: '14px', padding: '20px', margin: '20px 0' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.05rem', color: '#166534', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiCheckCircle /> Work Completion & Resolution Proof
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>BEFORE (Reported Incident Photo)</span>
                <img src={completion.beforeImage || image} alt="Before work" style={{ width: '100%', height: '170px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #CBD5E1' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '4px' }}>AFTER (Field Completion Photograph)</span>
                <img src={completion.afterImage || report.resolutionImage} alt="After work proof" style={{ width: '100%', height: '170px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #86EFAC' }} />
              </div>
            </div>
            {(completion.completionRemarks || report.resolutionNote) && (
              <p style={{ margin: '12px 0 0 0', fontSize: '0.9rem', color: '#15803D', fontWeight: 600, background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                "{completion.completionRemarks || report.resolutionNote}"
              </p>
            )}
          </div>
        )}

        {/* SECTION: ADMIN VERIFICATION & APPROVAL */}
        {adminReview.reviewedAt && (
          <div style={{ background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '12px', padding: '16px', margin: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: '#7E22CE', fontSize: '0.95rem', marginBottom: '6px' }}>
              <FiShield style={{ color: '#9333EA' }} /> Administrator Oversight & Audit
            </div>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#6B21A8' }}>
              Reviewed by: <strong>{adminReview.adminName || 'System Admin'}</strong> on {new Date(adminReview.reviewedAt).toLocaleDateString()}.
              {adminReview.approved ? ' ✓ Completion Evidence Approved.' : ' ⚠️ Sent back for corrections.'}
            </p>
            {adminReview.remarks && (
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#581C87', fontStyle: 'italic' }}>
                "{adminReview.remarks}"
              </p>
            )}
          </div>
        )}

        {/* SECTION: CITIZEN RESOLUTION FEEDBACK (POST-RESOLUTION) */}
        {isResolvedDone && (
          <div style={{ background: '#FFFBF7', border: '2px solid #FED7AA', borderRadius: '14px', padding: '20px', margin: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#C2410C', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiStar style={{ color: '#EA580C' }} /> Citizen Resolution Feedback
              </h3>
              {(isAuthor || user?.role === 'admin') && !showReopenModal && (
                <button
                  type="button"
                  onClick={() => setShowReopenModal(true)}
                  style={{ background: 'transparent', border: '1px solid #DC2626', color: '#DC2626', padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <FiRefreshCw /> Reopen Issue
                </button>
              )}
            </div>

            {citizenFeedback.rating ? (
              <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: '10px', border: '1px solid #FED7AA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#EA580C', fontWeight: 800 }}>
                  {[...Array(citizenFeedback.rating)].map((_, i) => (
                    <FiStar key={i} style={{ fill: '#EA580C' }} />
                  ))}
                  <span style={{ color: '#1E293B', marginLeft: '6px' }}>({citizenFeedback.rating} / 5 Stars)</span>
                </div>
                {citizenFeedback.comment && (
                  <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '0.9rem' }}>
                    "{citizenFeedback.comment}"
                  </p>
                )}
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', marginTop: '6px' }}>
                  Submitted on {new Date(citizenFeedback.submittedAt).toLocaleDateString()}
                </span>
              </div>
            ) : feedbackSuccess ? (
              <div style={{ background: '#ECFDF5', color: '#065F46', padding: '10px 14px', borderRadius: '8px', fontWeight: 700 }}>
                ✓ Thank you for your feedback! It helps improve municipal response quality.
              </div>
            ) : isAuthor ? (
              <form onSubmit={handleFeedbackSubmit}>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: '#7C2D12' }}>
                  How satisfied are you with the resolution of this issue?
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.5rem',
                        color: star <= feedbackRating ? '#EA580C' : '#CBD5E1',
                      }}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontWeight: 700, color: '#EA580C', fontSize: '0.9rem' }}>
                    {feedbackRating} / 5 Stars
                  </span>
                </div>
                <textarea
                  rows="2"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Leave a comment on the quality of work..."
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #FED7AA', fontSize: '0.9rem' }}
                />
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  style={{ marginTop: '8px', padding: '8px 20px', background: '#EA580C', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', fontStyle: 'italic' }}>
                Awaiting citizen feedback.
              </p>
            )}
          </div>
        )}

        {/* REOPEN MODAL */}
        {showReopenModal && (
          <div style={{ background: '#FEF2F2', border: '2px solid #FCA5A5', borderRadius: '12px', padding: '16px', margin: '16px 0' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#991B1B', fontWeight: 800 }}>
              Reopen Resolved Complaint
            </h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#7F1D1D' }}>
              If the problem recurred or repairs were incomplete, provide a reason to reopen:
            </p>
            <form onSubmit={handleReopenSubmit}>
              <textarea
                rows="2"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Reason for reopening (e.g., Pothole reopened after heavy rain)..."
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #FCA5A5', fontSize: '0.9rem' }}
                required
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={isSubmittingReopen}
                  style={{ padding: '6px 16px', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmittingReopen ? 'Reopening...' : 'Confirm Reopen'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  style={{ padding: '6px 14px', background: '#E2E8F0', color: '#334155', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <hr className="divider-line" />

        {/* REPORT SUMMARY DETAILS */}
        <div className="problem-details-section">
          <label className="section-micro-label">PROBLEM DESCRIPTION & EVIDENCE</label>
          <p className="problem-description">{description}</p>
          
          {image && (
            <div className="report-image-preview-wrapper" style={{ marginTop: '12px' }}>
              <img src={image} alt={title} className="report-image-preview" />
            </div>
          )}

          <div className="report-meta-info-grid" style={{ marginTop: '16px' }}>
            <div>
              <span className="meta-label">Category:</span>
              <span className="meta-val">{category}</span>
            </div>
            <div>
              <span className="meta-label">Date Reported:</span>
              <span className="meta-val">{reportedDate}</span>
            </div>
            <div>
              <span className="meta-label">Ward Jurisdiction:</span>
              <span className="meta-val">{report.wardName || report.wardId || 'WARD-04'}</span>
            </div>
            <div>
              <span className="meta-label">Assigned Department:</span>
              <span className="meta-val">{assignedDepartment}</span>
            </div>
          </div>
        </div>

        {/* REPORT LOCATION & MAP */}
        <div className="location-map-section">
          <label className="section-micro-label">📍 GEOGRAPHIC LOCATION</label>
          <p className="location-address-text">{location}</p>
          
          <div style={{ fontSize: '0.8rem', color: '#EA580C', fontFamily: 'monospace', marginBottom: '8px' }}>
            Latitude: {lat.toFixed(6)} | Longitude: {lng.toFixed(6)}
          </div>

          <div className="small-leaflet-map-wrapper">
            <MapContainer
              center={[lat, lng]}
              zoom={15}
              scrollWheelZoom={false}
              className="small-leaflet-canvas"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[lat, lng]} icon={customPinIcon} />
            </MapContainer>
          </div>
        </div>

        {/* COMMUNITY IMPACT & ENGAGEMENT */}
        <div className="community-engagement-section">
          <label className="section-micro-label">COMMUNITY IMPACT & ENGAGEMENT</label>

          <div className="engagement-counters-row">
            <div className="counter-badge view-counter">
              <FiEye className="icon blue" />
              <span>{viewsCount} Viewed</span>
            </div>

            <div className="counter-badge like-counter">
              <FiHeart className="icon red" />
              <span>{likesCount} {likesCount === 1 ? 'Like' : 'Likes'}</span>
            </div>
          </div>

          <button 
            type="button" 
            className={`btn-like-toggle ${isLiked ? 'liked' : ''}`}
            onClick={handleToggleLike}
          >
            <FiHeart className="heart-icon" />
            <span>{isLiked ? 'Liked' : 'Like Complaint'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
