"""Lightweight scikit-learn sentiment fallback model."""

import pickle
import pathlib
import numpy as np

MODEL_DIR = pathlib.Path(__file__).resolve().parent
MODEL_PATH = MODEL_DIR / "sentiment_model.pkl"
VECTORIZER_PATH = MODEL_DIR / "tfidf_vectorizer.pkl"

_model = None
_vectorizer = None


def _load():
    global _model, _vectorizer
    if MODEL_PATH.exists() and VECTORIZER_PATH.exists():
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
        with open(VECTORIZER_PATH, "rb") as f:
            _vectorizer = pickle.load(f)
        return True
    return False


def predict_sentiment(text: str) -> dict:
    """
    Predict sentiment using the fallback ML model.
    Returns: {sentiment, score, confidence}
    """
    if _model is None:
        if not _load():
            return {"sentiment": "neutral", "score": 0.0, "confidence": 0.0}

    vec = _vectorizer.transform([text])
    prediction = _model.predict(vec)[0]
    proba = _model.predict_proba(vec)[0]
    confidence = float(np.max(proba))

    label_map = {0: "negative", 1: "neutral", 2: "positive"}
    score_map = {0: -0.7, 1: 0.0, 2: 0.7}

    sentiment = label_map.get(prediction, "neutral")
    score = score_map.get(prediction, 0.0)

    return {
        "sentiment": sentiment,
        "score": score,
        "confidence": confidence,
    }
