"""
feature_engineering.py - Feature engineering utilities for CyberLens AI risk scoring.
Provides helpers for normalizing and validating scan features before ML prediction.
"""
import numpy as np

# Valid feature keys and their expected ranges
FEATURE_SCHEMA = {
    "ssl_valid":      {"min": 0, "max": 1, "default": 1, "type": "binary"},
    "has_csp":        {"min": 0, "max": 1, "default": 0, "type": "binary"},
    "has_hsts":       {"min": 0, "max": 1, "default": 0, "type": "binary"},
    "has_xframe":     {"min": 0, "max": 1, "default": 0, "type": "binary"},
    "has_xcontent":   {"min": 0, "max": 1, "default": 0, "type": "binary"},
    "sqli_found":     {"min": 0, "max": 1, "default": 0, "type": "binary"},
    "xss_found":      {"min": 0, "max": 1, "default": 0, "type": "binary"},
    "csrf_found":     {"min": 0, "max": 1, "default": 0, "type": "binary"},
    "vuln_count":     {"min": 0, "max": 500, "default": 0, "type": "count"},
    "critical_count": {"min": 0, "max": 100, "default": 0, "type": "count"},
}

FEATURE_ORDER = [
    "ssl_valid", "has_csp", "has_hsts", "has_xframe", "has_xcontent",
    "sqli_found", "xss_found", "csrf_found", "vuln_count", "critical_count",
]


def validate_features(features: dict) -> dict:
    """
    Validate and sanitize input features.
    
    Fills missing features with defaults and clips values to valid ranges.
    
    Args:
        features: Raw feature dictionary from scanner
        
    Returns:
        Validated and sanitized feature dictionary
    """
    validated = {}

    for key, schema in FEATURE_SCHEMA.items():
        value = features.get(key, schema["default"])

        # Type coercion
        try:
            if schema["type"] == "binary":
                value = int(bool(value))
            else:
                value = int(value)
        except (TypeError, ValueError):
            value = schema["default"]

        # Clip to valid range
        value = max(schema["min"], min(schema["max"], value))
        validated[key] = value

    return validated


def build_feature_vector(features: dict) -> np.ndarray:
    """
    Convert a feature dictionary to a numpy array in the correct order.
    
    Args:
        features: Validated feature dictionary
        
    Returns:
        1D numpy array with features in model-expected order
    """
    validated = validate_features(features)
    return np.array([[validated[key] for key in FEATURE_ORDER]], dtype=float)


def compute_rule_based_score(features: dict) -> float:
    """
    Compute a simple rule-based risk score as a fallback.
    
    Uses weighted sum of features without ML.
    
    Args:
        features: Feature dictionary
        
    Returns:
        Risk score in range [0, 100]
    """
    f = validate_features(features)

    score = (
        (1 - f["ssl_valid"]) * 20
        + (1 - f["has_csp"]) * 10
        + (1 - f["has_hsts"]) * 8
        + (1 - f["has_xframe"]) * 7
        + (1 - f["has_xcontent"]) * 5
        + f["sqli_found"] * 20
        + f["xss_found"] * 15
        + f["csrf_found"] * 12
        + f["vuln_count"] * 2
        + f["critical_count"] * 5
    )

    return float(np.clip(score, 0, 100))


def get_risk_factors(features: dict) -> list:
    """
    Return a list of risk factors with impact scores based on features.
    
    Args:
        features: Validated feature dictionary
        
    Returns:
        List of dicts: {factor, impact, severity}
    """
    f = validate_features(features)
    factors = []

    impact_map = [
        ("ssl_valid",    False, "No SSL/HTTPS",            20, "HIGH"),
        ("sqli_found",   True,  "SQL Injection",           20, "CRITICAL"),
        ("xss_found",    True,  "XSS Vulnerability",       15, "HIGH"),
        ("csrf_found",   True,  "CSRF Vulnerability",      12, "HIGH"),
        ("has_csp",      False, "Missing CSP Header",      10, "MEDIUM"),
        ("has_hsts",     False, "Missing HSTS Header",      8, "MEDIUM"),
        ("has_xframe",   False, "Missing X-Frame-Options",  7, "MEDIUM"),
        ("has_xcontent", False, "Missing X-Content-Type",   5, "LOW"),
    ]

    for key, flag_value, label, impact, severity in impact_map:
        if bool(f[key]) == flag_value:
            factors.append({
                "factor": label,
                "impact": impact,
                "severity": severity,
            })

    # Add count-based factors
    if f["vuln_count"] > 0:
        factors.append({
            "factor": f"Total vulnerabilities: {f['vuln_count']}",
            "impact": min(f["vuln_count"] * 2, 20),
            "severity": "MEDIUM",
        })

    return sorted(factors, key=lambda x: x["impact"], reverse=True)
