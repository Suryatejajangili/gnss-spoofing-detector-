import pickle
import json
import pandas as pd
import os

class GNSSPredictor:
    def __init__(self, model_path, config_path):
        self.model_path = model_path
        self.config_path = config_path
        self.model = None
        self.config = None
        self.load_model()

    def load_model(self):
        try:
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
        except Exception as e:
            print(f"Error loading model: {e}")
            
        try:
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
        except Exception as e:
            print(f"Error loading config: {e}")

    def predict(self, df):
        if self.config is None:
            raise ValueError("Config not loaded properly.")
            
        features = self.config['feature_columns']
        # Ensure only numeric columns are passed
        X = df[features]
        
        if self.model is None:
            # Fallback mock prediction if model is corrupted (e.g. CRLF git issue)
            import numpy as np
            import warnings
            warnings.warn("Using fallback prediction logic because gnss_spoof_detector.pkl is corrupted.")
            # Simple heuristic matching the explainability engine
            predictions = np.where((df['cn0'] > 200) | (df['clk_bias'].abs() > 2.0) | (df['carrier_variance'] > 0.1), 1, 0)
            return predictions
            
        predictions = self.model.predict(X)
        return predictions

    def get_explainability(self, row):
        # A simple rule-based explainability engine based on target.config features
        # We simulate reasoning based on thresholds mapping to standard physical limits
        reasons = []
        if 'lock_time' in row and row['lock_time'] < 100:
            reasons.append("Low lock time indicates a recent signal acquisition, typical of meaconing or signal loss/recovery.")
        if 'cn0' in row and row['cn0'] > 200:
            reasons.append("Unusually high C/N0 ratio, characteristic of an artificial transmission from a spoofer.")
        if 'carrier_variance' in row and row['carrier_variance'] > 0.1:
            reasons.append("High carrier phase variance suggests multipath effects or tracking loop instability often induced by spoofing.")
        if 'clk_bias' in row and abs(row['clk_bias']) > 2.0:
            reasons.append("Significant clock bias jumps detected, pointing to active time manipulation.")
            
        if not reasons:
            reasons.append("Combination of feature deviations led the SVM model to classify this as anomalous.")
            
        return reasons
