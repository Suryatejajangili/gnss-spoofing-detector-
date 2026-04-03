import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';

export default function DataUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.csv')) {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please upload a valid CSV file.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile?.name.endsWith('.csv')) {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please upload a valid CSV file.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('http://localhost:8000/api/upload', formData);
      setResult(response.data);
      // Pass the explanations to Analytics dashboard via state
      setTimeout(() => {
         navigate('/dashboard/analytics', { state: { result: response.data } });
      }, 3000);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(`Backend error: ${err.response.data.detail}`);
      } else {
        setError('Error uploading file. Make sure backend is running.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1>Data Upload</h1>
      <p style={{ marginBottom: '2rem' }}>Upload receiver GNSS logs (CSV format) to detect spoofing signatures based on the C-SVM model.</p>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div 
          className="upload-zone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload').click()}
        >
          <UploadCloud size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
          <h3>Drag & Drop your CSV file here</h3>
          <p>or click to browse from your computer</p>
          <input 
            type="file" 
            id="file-upload" 
            style={{ display: 'none' }} 
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>

        {file && (
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <CheckCircle color="var(--success)" size={20} />
               <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: 'auto' }} 
              onClick={(e) => { e.stopPropagation(); handleUpload(); }}
              disabled={uploading}
            >
              {uploading ? 'Analyzing...' : 'Analyze Data'}
            </button>
          </div>
        )}
        
        {error && (
          <div style={{ marginTop: '1rem', color: 'var(--danger)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '8px', border: `1px solid ${result.results.trust_score > 90 ? 'var(--success)' : 'var(--danger)'}`, background: 'rgba(0,0,0,0.2)' }}>
            <h3>Analysis Complete</h3>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
               <div>
                  <p className="input-label">Total Signals</p>
                  <h2>{result.results.total_rows}</h2>
               </div>
               <div>
                  <p className="input-label">Authentic</p>
                  <h2 style={{ color: 'var(--success)' }}>{result.results.authentic}</h2>
               </div>
               <div>
                  <p className="input-label">Manipulated</p>
                  <h2 style={{ color: 'var(--danger)' }}>{result.results.manipulated}</h2>
               </div>
               <div>
                  <p className="input-label">Trust Score</p>
                  <h2>{result.results.trust_score}%</h2>
               </div>
            </div>
            <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>Redirecting to analytics...</p>
          </div>
        )}
      </div>
    </div>
  );
}
