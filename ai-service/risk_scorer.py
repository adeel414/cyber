"""
risk_scorer.py - ML-based risk scoring for CyberLens AI
Uses Random Forest classifier to predict website security risk score
"""
import os
import sys
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "trained_model.pkl")

# Feature names matching the API input
FEATURE_NAMES = [
    "ssl_valid",
    "has_csp",
    "has_hsts",
    "has_xframe",
    "has_xcontent",
    "sqli_found",
    "xss_found",
    "csrf_found",
    "vuln_count",
    "critical_count",
]


def generate_training_data(n_samples: int = 5000) -> tuple:
    """
    Generate synthetic training data for the risk scoring model.
    In production, this would be replaced by real scan data.
    """
    np.random.seed(42)

    # Generate feature data
    ssl_valid = np.random.binomial(1, 0.7, n_samples)
    has_csp = np.random.binomial(1, 0.4, n_samples)
    has_hsts = np.random.binomial(1, 0.5, n_samples)
    has_xframe = np.random.binomial(1, 0.55, n_samples)
    has_xcontent = np.random.binomial(1, 0.6, n_samples)
    sqli_found = np.random.binomial(1, 0.1, n_samples)
    xss_found = np.random.binomial(1, 0.15, n_samples)
    csrf_found = np.random.binomial(1, 0.2, n_samples)
    vuln_count = np.random.poisson(3, n_samples)
    critical_count = np.random.poisson(0.5, n_samples)

    X = np.column_stack([
        ssl_valid, has_csp, has_hsts, has_xframe, has_xcontent,
        sqli_found, xss_found, csrf_found, vuln_count, critical_count
    ])

    # Calculate risk score based on weighted features
    risk_score = (
        (1 - ssl_valid) * 20 +          # No SSL: +20
        (1 - has_csp) * 10 +             # No CSP: +10
        (1 - has_hsts) * 8 +             # No HSTS: +8
        (1 - has_xframe) * 7 +           # No X-Frame: +7
        (1 - has_xcontent) * 5 +         # No X-Content: +5
        sqli_found * 20 +                # SQLi: +20
        xss_found * 15 +                 # XSS: +15
        csrf_found * 12 +                # CSRF: +12
        vuln_count * 2 +                 # Each vuln: +2
        critical_count * 5 +             # Each critical: +5
        np.random.normal(0, 3, n_samples) # noise
    )

    # Clip to [0, 100]
    risk_score = np.clip(risk_score, 0, 100)

    return X, risk_score


def train_model() -> Pipeline:
    """Train and save the risk scoring model."""
    logger.info("Generating training data...")
    X, y = generate_training_data(10000)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Build pipeline with scaling and Random Forest
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1,
        )),
    ])

    logger.info("Training Random Forest model...")
    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    logger.info(f"Model MAE: {mae:.2f}")

    # Save model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    logger.info(f"Model saved to {MODEL_PATH}")

    return pipeline


def load_model() -> Pipeline:
    """Load the trained model or train a new one."""
    if os.path.exists(MODEL_PATH):
        logger.info(f"Loading model from {MODEL_PATH}")
        return joblib.load(MODEL_PATH)
    else:
        logger.info("No saved model found. Training new model...")
        return train_model()


def predict_risk(features: dict) -> dict:
    """
    Predict risk score for given features.

    Args:
        features: Dict with keys matching FEATURE_NAMES

    Returns:
        Dict with risk_score, confidence, risk_level, and factor_breakdown
    """
    model = load_model()

    # Build feature vector
    feature_vector = np.array([[
        features.get("ssl_valid", 1),
        features.get("has_csp", 0),
        features.get("has_hsts", 0),
        features.get("has_xframe", 0),
        features.get("has_xcontent", 0),
        features.get("sqli_found", 0),
        features.get("xss_found", 0),
        features.get("csrf_found", 0),
        features.get("vuln_count", 0),
        features.get("critical_count", 0),
    ]])

    # Predict
    risk_score = float(np.clip(model.predict(feature_vector)[0], 0, 100))

    # Calculate confidence using tree variance
    rf_model = model.named_steps["model"]
    scaler = model.named_steps["scaler"]
    scaled_features = scaler.transform(feature_vector)
    tree_predictions = np.array([tree.predict(scaled_features)[0] for tree in rf_model.estimators_])
    std_dev = np.std(tree_predictions)
    confidence = float(max(0, min(100, 100 - (std_dev / risk_score * 100 if risk_score > 0 else 0))))

    # Risk level
    if risk_score >= 80:
        risk_level = "CRITICAL"
    elif risk_score >= 60:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Factor breakdown
    factors = []
    if not features.get("ssl_valid", 1):
        factors.append({"factor": "No SSL/HTTPS", "impact": 20, "severity": "HIGH"})
    if features.get("sqli_found", 0):
        factors.append({"factor": "SQL Injection", "impact": 20, "severity": "CRITICAL"})
    if features.get("xss_found", 0):
        factors.append({"factor": "XSS Vulnerability", "impact": 15, "severity": "HIGH"})
    if features.get("csrf_found", 0):
        factors.append({"factor": "CSRF Vulnerability", "impact": 12, "severity": "HIGH"})
    if not features.get("has_csp", 0):
        factors.append({"factor": "Missing CSP Header", "impact": 10, "severity": "MEDIUM"})
    if not features.get("has_hsts", 0):
        factors.append({"factor": "Missing HSTS Header", "impact": 8, "severity": "MEDIUM"})

    return {
        "risk_score": round(risk_score, 1),
        "confidence": round(confidence, 1),
        "risk_level": risk_level,
        "factors": sorted(factors, key=lambda x: x["impact"], reverse=True),
    }


if __name__ == "__main__":
    if "--train" in sys.argv:
        train_model()
        print("Model training complete.")
    else:
        # Test prediction
        test_features = {
            "ssl_valid": 0,
            "has_csp": 0,
            "has_hsts": 0,
            "has_xframe": 0,
            "has_xcontent": 1,
            "sqli_found": 1,
            "xss_found": 0,
            "csrf_found": 1,
            "vuln_count": 5,
            "critical_count": 2,
        }
        result = predict_risk(test_features)
        print(f"Risk Score: {result['risk_score']}")
        print(f"Risk Level: {result['risk_level']}")
        print(f"Confidence: {result['confidence']}%")
        print(f"Factors: {result['factors']}")
