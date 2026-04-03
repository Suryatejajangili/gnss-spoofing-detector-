import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/history');
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div>
      <h1>History Log</h1>
      <p style={{ marginBottom: '2rem' }}>Review previous spoofing detection analysis records.</p>
      
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading history...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date & Time</th>
                <th>Filename</th>
                <th>Authentic Signals</th>
                <th>Spoofed Signals</th>
                <th>Trust Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map(log => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.filename}</td>
                  <td>{log.auth_count}</td>
                  <td>{log.spoofed_count}</td>
                  <td>{log.trust_score.toFixed(1)}%</td>
                  <td>
                    <span className={`badge ${log.trust_score > 90 ? 'safe' : 'danger'}`}>
                      {log.trust_score > 90 ? 'SECURE' : 'COMPROMISED'}
                    </span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No historical data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
