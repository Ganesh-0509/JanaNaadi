"""Train a lightweight backup sentiment classifier (scikit-learn)."""

import pickle
import pathlib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

MODEL_DIR = pathlib.Path(__file__).resolve().parent


def train_and_save():
    """Train a simple TF-IDF + Logistic Regression sentiment model."""
    # Training data — Indian public discourse samples
    texts = [
        # Positive (label=2)
        "The new metro line is excellent, really improving connectivity",
        "Thanking the government for the clean drinking water initiative",
        "Road repair in our area was done quickly, very happy",
        "New school building inaugurated, quality education",
        "Great job on the Swachh Bharat mission in our ward",
        "Naya sadak bahut accha bana hai, shukriya",
        "Hospital mein free treatment mil raha hai, bahut accha",
        "WiFi zone is working great in our neighborhood",
        "Electricity supply improved significantly",
        "Accha kaam ho raha hai development mein",
        # Negative (label=0)
        "Terrible road conditions, potholes everywhere",
        "No water supply for 3 days, this is shameful",
        "Corruption in municipal office, nothing gets done without bribe",
        "Garbage not collected for a week, stinking everywhere",
        "Power cuts daily for 4-5 hours, unbearable",
        "Sadak toot gayi hai, koi sunne wala nahi",
        "Paani nahi aa raha hai, neta kuch nahi karte",
        "Hospital mein dawai nahi milti, patients suffer",
        "Sewage overflow on main road, health hazard",
        "Kharab haalat hai yahan ki roads ki, bahut bura",
        # Neutral (label=1)
        "Election schedule announced for next month",
        "New policy on housing to be discussed in parliament",
        "Census data collection starting next week",
        "Weather forecast shows normal monsoon expected",
        "Budget session begins on February 1st",
        "Naya scheme launch hone wala hai next month",
        "Commissioner ka transfer ho gaya hai",
        "Meeting scheduled for ward development plan",
        "Survey being conducted for BPL families",
        "Government office timings changed to 9am-5pm",
    ]

    labels = [2]*10 + [0]*10 + [1]*10

    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X = vectorizer.fit_transform(texts)
    y = np.array(labels)

    model = LogisticRegression(max_iter=1000, class_weight="balanced")
    model.fit(X, y)

    # Save model and vectorizer
    with open(MODEL_DIR / "sentiment_model.pkl", "wb") as f:
        pickle.dump(model, f)
    with open(MODEL_DIR / "tfidf_vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)

    print(f"Model trained on {len(texts)} samples and saved.")


if __name__ == "__main__":
    train_and_save()
