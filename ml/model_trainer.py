import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

MODEL_PATH = "/saved_models/gradient_boosting_(gbm)_model.pkl"

def train_model(df, info):
    target = info["target"]
    features = info["features"]

    X = df[features]
    y = df[target]

    if info["ml_task"] == "classification":
        model = RandomForestClassifier()
    else:
        model = RandomForestRegressor()

    model.fit(X, y)
    joblib.dump((model, features), MODEL_PATH)

    return MODEL_PATH

def load_trained_model():
    model, features = joblib.load(MODEL_PATH)
    return model
