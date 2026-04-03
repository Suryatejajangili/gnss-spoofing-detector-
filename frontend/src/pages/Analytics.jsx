import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

export default function Analytics() {
  const location = useLocation();
  const { result } = location.state || {};


  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>Analytics & Explainability</h1>
          <p>Deep dive into signal features and prediction reasoning.</p>
        </div>
        {!result && (
          <Link to="/dashboard/upload" className="btn-primary" style={{ width: 'auto' }}>
            Upload Data to Analyze
          </Link>
        )}
      </div>

      {result ? (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info color="var(--accent-color)" /> Prediction Reasons Engine
          </h2>
          <p style={{ marginBottom: '1.5rem' }}>Below are the precise reasons why specific data rows from your upload were flagged as manipulated based on the C-SVM model configurations.</p>
          
          {result.explanations && result.explanations.length > 0 ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {result.explanations.map((exp, idx) => (
                <div key={idx} style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid var(--danger)', borderRadius: '0 8px 8px 0' }}>
                  <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={20} color="var(--danger)" />
                    Row Index: {exp.index}
                  </h3>
                  <ul style={{ paddingLeft: '2rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                    {exp.reasons.map((reason, rIdx) => (
                      <li key={rIdx} style={{ marginBottom: '0.25rem' }}>{reason}</li>
                    ))}
                  </ul>
                  <div style={{ fontSize: '0.875rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                    <span style={{ color: '#94a3b8' }}>Key Features:</span> C/N0 = {exp.data.cn0?.toFixed(2) || 'N/A'}, Clock Bias = {exp.data.clk_bias?.toFixed(2) || 'N/A'}, Carrier Variance = {exp.data.carrier_variance?.toFixed(4) || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid var(--success)' }}>
              <CheckCircle size={48} color="var(--success)" style={{ marginBottom: '1rem' }} />
              <h3>No Spoofing Detected</h3>
              <p>The C-SVM model did not classify any signals as manipulated in the uploaded dataset.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p>Please upload a CSV file on the Data Upload dashboard to view specific prediction explanations.</p>
        </div>
      )}
    </div>
  );
}
