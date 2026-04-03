# GNSS Spoofing & Meaconing Detector 🛰️

A machine learning-powered system that detects GPS signal spoofing and meaconing attacks with **99% accuracy** using a C-SVM classifier on 11 real GNSS receiver features.

## 📋 Project Overview

This full-stack application analyzes critical GNSS signal parameters to identify:
- **Spoofing**: False GPS signals transmitted at higher power to override authentic signals
- **Meaconing**: Delayed retransmission of authentic signals to deceive receiver location

**Key Capabilities:**
- Real-time signal classification (Authentic vs Manipulated)
- Interactive analytics dashboard with feature distributions
- Explainability engine showing exactly why signals are flagged
- CSV batch upload for analyzing multiple GNSS datasets

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **Recharts** - Data visualization (charts, histograms, radar plots)
- **React Router** - Navigation & page routing
- **Lucide React** - Icon library
- **CSS** - Responsive glass-morphism styling

### Backend
- **Python 3.x** - Core language
- **FastAPI** - REST API framework
- **scikit-learn** - C-SVM model & preprocessing
- **Pandas** - CSV data processing
- **Uvicorn** - ASGI server

### Database
- **SQLite** (optional) - Historical data storage

### ML Model
- **Algorithm**: C-SVM with RBF Kernel
- **Features**: 11 GNSS receiver signals (lock_time, cn0, doppler, carrier_variance, clk_drift, etc.)
- **Performance**: 99.99% test accuracy, 99.98% manipulation recall

## 🚀 Quick Start

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 📊 Model Performance

| Metric | Score |
|--------|-------|
| Test Accuracy | 99.992% |
| CV Accuracy | 99.975% |
| Manipulation Recall | 99.987% |
| Support Vectors | 235 |

## 📁 Key Files

- **backend/main.py** - FastAPI server with prediction endpoints
- **backend/predictor.py** - SVM inference & explainability logic
- **frontend/src/pages/ModelInsights.jsx** - Feature distributions & performance metrics
- **frontend/src/pages/Analytics.jsx** - Per-row prediction explanations
- **frontend/src/pages/DataUpload.jsx** - Batch CSV upload interface
- **feature_config.json** - Model configuration & feature metadata
