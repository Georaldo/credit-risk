# ml/shap_explainer.py
import joblib
import pandas as pd
import numpy as np
import os
from config import MODEL_DIR
import shap

def explain_prediction(model_name: str, raw_input: dict):
    # load preprocessor and features
    preprocessor = joblib.load(os.path.join(MODEL_DIR, "preprocessor.pkl"))
    features = joblib.load(os.path.join(MODEL_DIR, "model_feature_list.pkl"))

    model_path = os.path.join(MODEL_DIR, f"{model_name}.pkl")
    if not os.path.exists(model_path):
        raise FileNotFoundError("Model not found")

    model = joblib.load(model_path)
    df = pd.DataFrame([raw_input])
    # ensure all feature columns exist
    for col in features:
        if col not in df.columns:
            df[col] = 0
    X = df[features]
    X_trans = preprocessor.transform(X)

    # Build explainer: prefer TreeExplainer if tree-based
    try:
        if hasattr(model, "feature_importances_") or model.__class__.__name__.lower().find("forest")!=-1 or model.__class__.__name__.lower().find("gradient")!=-1:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_trans)
            expected = explainer.expected_value
        else:
            # Kernel explainer requires a background dataset - use small sample from saved training set if exists
            # We'll create a small background of zeros if not available
            background = np.zeros((1, X_trans.shape[1]))
            explainer = shap.KernelExplainer(model.predict_proba if hasattr(model, "predict_proba") else model.predict, background)
            shap_values = explainer.shap_values(X_trans)
            expected = None
    except Exception as e:
        # fallback generic
        explainer = shap.Explainer(model, X_trans)
        shap_values = explainer(X_trans).values
        expected = None

    # Normalize output into understandable structure
    # If shap_values is list (multi-class), pick class 1 shap
    if isinstance(shap_values, list):
        # choose index 1 if exists else 0
        sv = shap_values[1] if len(shap_values)>1 else shap_values[0]
    else:
        sv = shap_values

    sv = np.array(sv).tolist()
    # Map back to feature names after preprocessing: we need to get preprocessor output feature names
    # For simplicity, we'll return shap contributions mapped to original features (note: for one-hot, mapping will be to aggregated original feature)
    feature_contribs = {f: float(s) for f, s in zip(features, sv[0])}

    return {"input": raw_input, "feature_contributions": feature_contribs, "expected_value": None}
