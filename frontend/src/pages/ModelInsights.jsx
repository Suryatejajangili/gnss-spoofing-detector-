import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { Brain, Activity, Layers, TrendingUp, ChevronDown, ChevronUp, Zap, Info } from 'lucide-react';

// ─── Real parameters from feature_config.json + sample_test.csv analysis ───
const FEATURES = [
  {
    id: 1, name: 'Lock Time', col: 'lock_time', unit: 's',
    importance: 89, category: 'Tracking', color: '#3b82f6',
    description: 'Duration the receiver has maintained continuous lock on the satellite signal. Short lock times are a hallmark of meaconing — the spoofer resets or loses the signal as it takes over.',
    threshold: '< 100 s → Suspicious',
    auth: { mean: 490, std: 130, min: 303, max: 667 },
    spoof: { mean: 112, std: 80, min: 13, max: 226 },
    spoofEffect: 'Short lock time (< 100s): signal recently acquired — typical of spoofer injection or meaconing.',
  },
  {
    id: 2, name: 'C/N0 Ratio', col: 'cn0', unit: 'dBHz (×10⁻¹)',
    importance: 92, category: 'Signal Power', color: '#10b981',
    description: 'Carrier-to-Noise density ratio. The raw values in this dataset are scaled (×10⁻¹ format). A spoofed transmitter broadcasts at higher power, pushing CN0 above the physical limit of real satellites (~55 dBHz).',
    threshold: '> 200 → Suspicious',
    auth: { mean: 178, std: 9, min: 165, max: 191 },
    spoof: { mean: 188, std: 10, min: 165, max: 201 },
    spoofEffect: 'Values exceeding 200 are physically impossible for authentic GNSS satellites.',
  },
  {
    id: 3, name: 'Pseudorange', col: 'pseudorange', unit: 'm',
    importance: 74, category: 'Ranging', color: '#f59e0b',
    description: 'Measured satellite-to-receiver distance. GPS satellites orbit at ~20,200 km, so valid pseudoranges are ~20M–26M m. Spoofed signals encode incorrect distances, often inconsistent across SVs.',
    threshold: 'Cross-SV consistency check',
    auth: { mean: 22600000, std: 1800000, min: 20600000, max: 26700000 },
    spoof: { mean: 23400000, std: 2200000, min: 19200000, max: 26700000 },
    spoofEffect: 'Inconsistent pseudorange geometry across satellite vehicles reveals a single-point spoofer.',
  },
  {
    id: 4, name: 'Doppler Shift', col: 'doppler', unit: 'Hz',
    importance: 78, category: 'Frequency', color: '#8b5cf6',
    description: 'Frequency offset due to satellite–receiver relative motion. Values in this dataset are in raw receiver units. Authentic Doppler follows satellite orbital mechanics; spoofed Doppler is often frozen or inconsistent with receiver kinematics.',
    threshold: 'Kinematic consistency check',
    auth: { mean: 8200000, std: 9800000, min: -8900000, max: 21000000 },
    spoof: { mean: 3100000, std: 10200000, min: -17600000, max: 18200000 },
    spoofEffect: 'Doppler values inconsistent with receiver velocity or satellite ephemeris indicate spoofing.',
  },
  {
    id: 5, name: 'Carrier Phase', col: 'carrier_phase', unit: 'cycles',
    importance: 71, category: 'Phase', color: '#06b6d4',
    description: "Accumulated phase count of the carrier wave. Normally increases smoothly. Spoofing causes non-physical jumps (cycle slips) as the attacker's replica signal deviates from the authentic satellite.",
    threshold: 'Phase continuity check',
    auth: { mean: 126000000, std: 9500000, min: 110700000, max: 139300000 },
    spoof: { mean: 122000000, std: 12000000, min: 100800000, max: 140500000 },
    spoofEffect: 'Phase discontinuities and irregular accumulation reveal synthetic signal injection.',
  },
  {
    id: 6, name: 'MP Correction', col: 'mp_correction', unit: 'm',
    importance: 68, category: 'Environment', color: '#f97316',
    description: 'Multipath error correction estimate for pseudorange. Authentic signals in open-sky show moderate multipath (±500–2500 m correction). Spoofed signals transmitted from a nearby device can show extreme values or artificially clean corrections.',
    threshold: 'Extreme values flag spoofing',
    auth: { mean: -960, std: 2300, min: -6394, max: 2297 },
    spoof: { mean: 1490, std: 4100, min: -3593, max: 13465 },
    spoofEffect: 'Very large MP corrections (> 5000m) indicate transmission from a non-satellite source.',
  },
  {
    id: 7, name: 'Code Variance', col: 'code_variance', unit: 'm²',
    importance: 86, category: 'Signal Quality', color: '#ef4444',
    description: "Variance of pseudorange code measurements. High variance means noisy or unstable ranging, typical when a spoofer's signal interferes with the authentic signal. Low variance in a noisy environment is equally suspicious ('too clean').",
    threshold: 'High values → Suspicious',
    auth: { mean: 153, std: 32, min: 99, max: 203 },
    spoof: { mean: 319, std: 140, min: 95, max: 571 },
    spoofEffect: 'Elevated code variance (> 250 m²) indicates tracking loop instability from spoofing interference.',
  },
  {
    id: 8, name: 'Carrier Variance', col: 'carrier_variance', unit: 'cycles²',
    importance: 91, category: 'Signal Quality', color: '#ec4899',
    description: 'Variance of carrier phase measurements over an observation window. The most discriminative feature in the dataset. Spoofed signals destabilize the carrier tracking loop, producing dramatically higher variance.',
    threshold: '> 0.1 cycles² → Suspicious',
    auth: { mean: 0.064, std: 0.015, min: 0.036, max: 0.084 },
    spoof: { mean: 0.275, std: 0.165, min: 0.067, max: 0.554 },
    spoofEffect: 'Carrier variance > 0.1 cycles² is the strongest single indicator of spoofing in this model.',
  },
  {
    id: 9, name: 'Carrier MP Correction', col: 'car_mp_correction', unit: 'cycles',
    importance: 72, category: 'Environment', color: '#84cc16',
    description: 'Carrier-phase multipath correction estimate. Authentic signals show bounded corrections (±135 cycles). Spoofing produces extreme values as the carrier loop tries to reconcile the fake signal with physical reality.',
    threshold: 'Values > ±250 cycles → Suspicious',
    auth: { mean: -22, std: 68, min: -135, max: 91 },
    spoof: { mean: 100, std: 245, min: -248, max: 554 },
    spoofEffect: 'Large carrier multipath corrections indicate the receiver is tracking an off-geometry signal.',
  },
  {
    id: 10, name: 'Clock Bias', col: 'clk_bias', unit: 's',
    importance: 88, category: 'Clock', color: '#fbbf24',
    description: 'Receiver clock offset from GPS system time. Authentic receivers maintain a small, slowly-drifting bias (within ±1s). Spoofing attacks manipulate the receiver clock — through signal timing — causing sudden large jumps.',
    threshold: '|bias| > 2.0s → Suspicious',
    auth: { mean: -0.11, std: 0.47, min: -1.05, max: 0.42 },
    spoof: { mean: 0.38, std: 2.8, min: -5.48, max: 4.48 },
    spoofEffect: 'Clock bias jumps > ±2.0s are physically impossible from oscillator drift alone — sign of time manipulation.',
  },
  {
    id: 11, name: 'Clock Drift', col: 'clk_drift', unit: 's/s',
    importance: 95, category: 'Clock', color: '#a78bfa',
    description: 'Rate of change of the receiver clock bias. The most distinctive feature: authentic receivers using a TCXO/OCXO oscillator maintain a nearly constant drift. The dataset shows authentic clk_drift clusters tightly around −0.692 s/s. Any deviation is a spoofing signature.',
    threshold: 'Outside −0.685 to −0.700 → Suspicious',
    auth: { mean: -0.692, std: 0.003, min: -0.698, max: -0.686 },
    spoof: { mean: -0.31, std: 0.72, min: -0.62, max: 2.26 },
    spoofEffect: 'Clock drift outside the authentic cluster (−0.692 ± 0.007) is the strongest clock-domain spoofing indicator.',
  },
];

// Generate smooth distribution curve data
function genDist(feature, bins = 30) {
  const { auth, spoof } = feature;
  const lo = Math.min(auth.min, spoof.min);
  const hi = Math.max(auth.max, spoof.max);
  const data = [];
  for (let i = 0; i < bins; i++) {
    const x = lo + (i / (bins - 1)) * (hi - lo);
    const a = Math.exp(-0.5 * ((x - auth.mean) / auth.std) ** 2) / (auth.std * Math.sqrt(2 * Math.PI));
    const s = Math.exp(-0.5 * ((x - spoof.mean) / spoof.std) ** 2) / (spoof.std * Math.sqrt(2 * Math.PI));
    data.push({ x: parseFloat(x.toPrecision(4)), auth: parseFloat(a.toPrecision(4)), spoof: parseFloat(s.toPrecision(4)) });
  }
  return data;
}

const MODEL = {
  algorithm: 'C-SVM with RBF Kernel',
  paper: 'Semanjski et al. (2020) Sensors 20, 1806',
  C: 7.0, gamma: 0.05, supportVectors: 235,
  cvAcc: 99.975, testAcc: 99.992, manipRecall: 99.987,
  features: 11, scaler: 'StandardScaler (Z-score)',
  split: '80/20 Stratified', cv: '5-Fold Stratified CV',
};

const importanceData = [...FEATURES].sort((a, b) => b.importance - a.importance)
  .map(f => ({ name: f.col, value: f.importance, color: f.color }));

const radarData = FEATURES.map(f => ({ feature: f.col.replace('_', '\n'), importance: f.importance }));

// Real signal time-series from sample_test.csv rows
const timeSeriesData = [
  { t: 'Row 1', lock: 667, cv: 0.084, cb: -0.069, cd: -0.695 },
  { t: 'Row 2', lock: 552, cv: 0.074, cb: -0.400, cd: -0.689 },
  { t: 'Row 3', lock: 331, cv: 0.071, cb: -0.249, cd: -0.690 },
  { t: 'Row 4', lock: 303, cv: 0.048, cb: -0.801, cd: -0.693 },
  { t: 'Row 5', lock: 538, cv: 0.062, cb: 0.397, cd: -0.698 },
  // Transition — spoofed below
  { t: 'Row 6*', lock: 35, cv: 0.554, cb: -2.133, cd: 2.264 },
  { t: 'Row 7*', lock: 14, cv: 0.336, cb: -0.361, cd: -0.227 },
  { t: 'Row 8*', lock: 227, cv: 0.096, cb: -0.145, cd: 0.047 },
  { t: 'Row 9*', lock: 132, cv: 0.255, cb: -5.479, cd: -0.333 },
  { t: 'Row 10*', lock: 147, cv: 0.069, cb: 0.115, cd: 0.006 },
];

function FeatureCard({ f }) {
  const [open, setOpen] = useState(false);
  const data = genDist(f);
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: `4px solid ${f.color}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle, ${f.color}18 0%, transparent 70%)`, transform: 'translate(20%,-20%)' }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: f.color, fontWeight: 700 }}>{f.category} · Feature {f.id}</div>
          <h3 style={{ fontSize: '1rem', margin: '0.2rem 0 0.1rem' }}>{f.name}</h3>
          <code style={{ fontSize: '0.72rem', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{f.col}</code>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Importance</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: f.color, lineHeight: 1 }}>{f.importance}%</div>
        </div>
      </div>

      {/* Importance bar */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: '1rem', overflow: 'hidden' }}>
        <div style={{ width: `${f.importance}%`, height: '100%', background: f.color, borderRadius: 2 }} />
      </div>

      {/* Distribution Plot */}
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id={`ga${f.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id={`gs${f.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="x" stroke="#334155" tick={{ fontSize: 9 }} tickCount={4} />
            <YAxis stroke="#334155" tick={{ fontSize: 9 }} />
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.72rem' }}
              formatter={(v, n) => [v.toExponential(2), n === 'auth' ? '🔵 Authentic' : '🔴 Spoofed']}
            />
            <Area type="monotone" dataKey="auth" stroke="#3b82f6" fill={`url(#ga${f.id})`} strokeWidth={2} />
            <Area type="monotone" dataKey="spoof" stroke="#ef4444" fill={`url(#gs${f.id})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', margin: '0.75rem 0' }}>
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(59,130,246,0.08)', borderRadius: 8, fontSize: '0.78rem' }}>
          <div style={{ color: '#3b82f6', fontWeight: 600, marginBottom: 3 }}>🔵 Authentic</div>
          <div style={{ color: '#94a3b8' }}>μ = <strong style={{ color: '#e2e8f0' }}>{f.auth.mean}</strong> {f.unit}</div>
          <div style={{ color: '#94a3b8' }}>σ = <strong style={{ color: '#e2e8f0' }}>{f.auth.std}</strong> {f.unit}</div>
          <div style={{ color: '#94a3b8' }}>Range: [{f.auth.min}, {f.auth.max}]</div>
        </div>
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: '0.78rem' }}>
          <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: 3 }}>🔴 Spoofed</div>
          <div style={{ color: '#94a3b8' }}>μ = <strong style={{ color: '#e2e8f0' }}>{f.spoof.mean}</strong> {f.unit}</div>
          <div style={{ color: '#94a3b8' }}>σ = <strong style={{ color: '#ef4444' }}>{f.spoof.std}</strong> {f.unit}</div>
          <div style={{ color: '#94a3b8' }}>Range: [{f.spoof.min}, {f.spoof.max}]</div>
        </div>
      </div>

      {/* Expand toggle */}
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.78rem', padding: 0, marginTop: '0.5rem' }}>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {open ? 'Hide' : 'Show'} technical details
      </button>

      {open && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.82rem' }}>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.82rem' }}>{f.description}</p>
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239,68,68,0.07)', borderLeft: `3px solid #ef4444`, borderRadius: '0 6px 6px 0', color: '#fca5a5' }}>
            ⚠ {f.spoofEffect}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModelInsights() {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Model Overview', icon: <Brain size={15} /> },
    { id: 'distributions', label: 'Feature Distributions', icon: <Activity size={15} /> },
    { id: 'importance', label: 'Importance & Radar', icon: <TrendingUp size={15} /> },
    { id: 'timeseries', label: 'Signal Timeline', icon: <Layers size={15} /> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(139,92,246,0.2)', borderRadius: 10 }}>
            <Brain size={22} color="#8b5cf6" />
          </div>
          <h1 style={{ fontSize: '1.9rem', background: 'linear-gradient(135deg, #c4b5fd, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Model Insights
          </h1>
        </div>
        <p>C-SVM trained on 11 real GNSS receiver features</p>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'CV Accuracy', value: `${MODEL.cvAcc}%`, color: '#10b981', icon: '🎯' },
          { label: 'Test Accuracy', value: `${MODEL.testAcc}%`, color: '#3b82f6', icon: '✅' },
          { label: 'Manip. Recall', value: `${MODEL.manipRecall}%`, color: '#8b5cf6', icon: '🔍' },
          { label: 'Support Vectors', value: MODEL.supportVectors, color: '#f59e0b', icon: '⚙️' },
          { label: 'C Parameter', value: MODEL.C, color: '#ef4444', icon: '🔧' },
          { label: 'γ (Gamma)', value: MODEL.gamma, color: '#06b6d4', icon: '📐' },
        ].map((m, i) => (
          <div key={i} className="glass-panel" style={{ padding: '1rem', textAlign: 'center', borderTop: `3px solid ${m.color}` }}>
            <div style={{ fontSize: '1.3rem', marginBottom: 2 }}>{m.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '0.4rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.5rem 1.1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 600, fontSize: '0.82rem',
            background: tab === t.id ? 'rgba(139,92,246,0.18)' : 'transparent',
            color: tab === t.id ? '#c4b5fd' : '#64748b',
            borderBottom: tab === t.id ? '2px solid #8b5cf6' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Zap size={18} color="#8b5cf6" />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Training Configuration</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {[
                ['Algorithm', MODEL.algorithm],
                ['Kernel', 'Radial Basis Function (RBF)'], ['Regularization C', MODEL.C],
                ['Gamma (γ)', MODEL.gamma], ['Support Vectors', MODEL.supportVectors],
                ['Feature Scaler', MODEL.scaler], ['Train/Test Split', MODEL.split],
                ['Validation', MODEL.cv], ['Features', `${MODEL.features} GNSS receiver signals`],
              ].map(([k, v], i) => (
                <div key={i} style={{ padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.5)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.88rem' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Explainability thresholds */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <Info size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: '0 0 0.25rem' }}>Rule-Based Spoofing Thresholds</h2>
                <p style={{ fontSize: '0.8rem', margin: 0 }}>These thresholds are used by the explainability engine in combination with SVM decision boundary scores.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {[
                { feat: 'lock_time', rule: '< 100 s', color: '#3b82f6', why: 'Recent acquisition = possible meaconing' },
                { feat: 'cn0', rule: '> 200 (scaled)', color: '#10b981', why: 'Physically impossible signal strength' },
                { feat: 'carrier_variance', rule: '> 0.1 cycles²', color: '#ec4899', why: 'Loop instability from spoofing interference' },
                { feat: 'clk_bias', rule: '|bias| > 2.0 s', color: '#fbbf24', why: 'Impossible from oscillator drift alone' },
                { feat: 'clk_drift', rule: 'Outside −0.692 ± 0.007', color: '#a78bfa', why: 'Authentic TCXO has extremely stable drift' },
                { feat: 'code_variance', rule: 'Elevated (> 250 m²)', color: '#ef4444', why: 'Interference with authentic signal code tracking' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '0.75rem 1rem', background: `${r.color}0d`, border: `1px solid ${r.color}30`, borderRadius: 8 }}>
                  <code style={{ fontSize: '0.78rem', color: r.color, fontWeight: 700 }}>{r.feat}</code>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, margin: '0.25rem 0', color: '#e2e8f0' }}>{r.rule}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.why}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DISTRIBUTIONS ── */}
      {tab === 'distributions' && (
        <div>
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
              <div style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 2 }} />
              <span style={{ color: '#94a3b8' }}>Authentic (Class 0) — ranges from sample_test.csv rows 1–10</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
              <div style={{ width: 12, height: 12, background: '#ef4444', borderRadius: 2 }} />
              <span style={{ color: '#94a3b8' }}>Spoofed / Manipulated (Class 1)</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map(f => <FeatureCard key={f.id} f={f} />)}
          </div>
        </div>
      )}

      {/* ── IMPORTANCE & RADAR ── */}
      {tab === 'importance' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Feature Importance Ranking</h2>
            <p style={{ fontSize: '0.82rem', marginBottom: '1.25rem' }}>Derived from SVM support vector analysis and permutation importance. clk_drift and carrier_variance are the top discriminators.</p>
            <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={importanceData} layout="vertical" margin={{ top: 5, right: 60, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#475569" tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" stroke="#475569" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={v => [`${v}%`, 'Importance']} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} label={{ position: 'right', fill: '#94a3b8', fontSize: 11, formatter: v => `${v}%` }}>
                    {importanceData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Multi-Feature Radar</h2>
            <p style={{ fontSize: '0.82rem', marginBottom: '0.75rem' }}>Coverage of all 11 features across the decision boundary. A balanced polygon means no single feature dominates excessively.</p>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="feature" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" tick={{ fontSize: 9 }} />
                  <Radar name="Importance" dataKey="importance" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={v => [`${v}%`, 'Importance']} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── SIGNAL TIMELINE ── */}
      {tab === 'timeseries' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ padding: '0.9rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, fontSize: '0.82rem', color: '#fca5a5' }}>
            🚨 Rows marked with * are from the manipulated class. The transition is visible in all three key features simultaneously.
          </div>

          {[
            { title: 'Lock Time (s)', key: 'lock', color: '#3b82f6', note: 'Drops sharply from 300–667s (auth) to 13–226s (spoofed)' },
            { title: 'Carrier Variance (cycles²)', key: 'cv', color: '#ec4899', note: 'Jumps from ~0.06 (auth) to 0.25–0.55 (spoofed) — crosses 0.1 threshold' },
            { title: 'Clock Bias (s)', key: 'cb', color: '#fbbf24', note: 'Stays within ±1.05s (auth), explodes to ±5.47s (spoofed)' },
            { title: 'Clock Drift (s/s)', key: 'cd', color: '#a78bfa', note: 'Authentic cluster: −0.692 ± 0.003. Spoofed: scattered −0.62 to +2.26' },
          ].map(({ title, key, color, note }) => (
            <div key={key} className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{title}</h3>
              <p style={{ fontSize: '0.78rem', marginBottom: '1rem', color: '#64748b' }}>{note}</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="t" stroke="#475569" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.75rem' }}
                      formatter={(v, n, p) => [v, p.payload.t.includes('*') ? '🔴 Spoofed' : '🔵 Authentic']}
                    />
                    <Line type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={(props) => {
                      const { cx, cy, payload } = props;
                      const isSpoofed = payload.t.includes('*');
                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={isSpoofed ? '#ef4444' : color} stroke="none" />;
                    }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
