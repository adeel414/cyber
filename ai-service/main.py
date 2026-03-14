"""
main.py - FastAPI AI Service for CyberLens AI
Provides risk scoring and anomaly detection endpoints
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import logging
from risk_scorer import predict_risk, load_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CyberLens AI Service",
    description="AI-powered security risk scoring microservice",
    version="1.0.0",
)

# CORS for backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production to backend only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-load model on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Loading AI risk scoring model...")
    load_model()
    logger.info("AI model ready.")


class ScanFeatures(BaseModel):
    """Input features for risk prediction."""
    ssl_valid: int = Field(default=1, ge=0, le=1, description="1 if SSL valid, 0 otherwise")
    has_csp: int = Field(default=0, ge=0, le=1, description="1 if CSP header present")
    has_hsts: int = Field(default=0, ge=0, le=1, description="1 if HSTS header present")
    has_xframe: int = Field(default=0, ge=0, le=1, description="1 if X-Frame-Options present")
    has_xcontent: int = Field(default=0, ge=0, le=1, description="1 if X-Content-Type-Options present")
    sqli_found: int = Field(default=0, ge=0, le=1, description="1 if SQL injection detected")
    xss_found: int = Field(default=0, ge=0, le=1, description="1 if XSS detected")
    csrf_found: int = Field(default=0, ge=0, le=1, description="1 if CSRF vulnerability detected")
    vuln_count: int = Field(default=0, ge=0, description="Total number of vulnerabilities")
    critical_count: int = Field(default=0, ge=0, description="Number of critical vulnerabilities")


class RiskPrediction(BaseModel):
    """Risk prediction response."""
    risk_score: float
    confidence: float
    risk_level: str
    factors: list


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "CyberLens AI Service",
        "version": "1.0.0",
    }


@app.post("/predict", response_model=RiskPrediction)
async def predict(features: ScanFeatures):
    """
    Predict security risk score for a website based on scan features.

    Returns a risk score (0-100), confidence percentage, risk level,
    and breakdown of contributing factors.
    """
    try:
        features_dict = features.model_dump()
        result = predict_risk(features_dict)
        return result
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/batch-predict")
async def batch_predict(features_list: list[ScanFeatures]):
    """Batch prediction for multiple scans."""
    if len(features_list) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 items per batch request.")

    results = []
    for features in features_list:
        try:
            result = predict_risk(features.model_dump())
            results.append(result)
        except Exception as e:
            results.append({"error": str(e)})

    return {"results": results}
