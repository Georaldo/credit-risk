# api/model_api.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from fastapi.responses import JSONResponse
from typing import List, Dict, Any
import os, joblib, shutil, glob, uuid

router = APIRouter()
MODEL_DIR = os.getenv("MODEL_DIR", "models")
os.makedirs(MODEL_DIR, exist_ok=True)
ACTIVE_MODEL_FILE = os.path.join(MODEL_DIR, "active_model.txt")
PREPROCESSOR_NAME = "preprocessor.pkl"
FEATURE_LIST_NAME = "model_feature_list.pkl"

# Helper
def model_path(name: str):
    return os.path.join(MODEL_DIR, f"{name}.pkl")

def list_models() -> List[Dict[str, Any]]:
    files = glob.glob(os.path.join(MODEL_DIR, "*.pkl"))
    models = []
    active = None
    if os.path.exists(ACTIVE_MODEL_FILE):
        with open(ACTIVE_MODEL_FILE, "r") as f:
            active = f.read().strip()
    for p in files:
        base = os.path.basename(p)
        name = base.rsplit(".", 1)[0]
        models.append({"name": name, "path": p, "active": (name == active)})
    return models

@router.get("/list")
def get_model_list():
    return list_models()

@router.post("/upload")
async def upload_model(model_file: UploadFile = File(...), name: str = Body(None)):
    """
    Accept a .pkl or .joblib model file.
    Optional body 'name' sets model name; else random uuid.
    """
    if not model_file.filename.lower().endswith((".pkl", ".joblib")):
        raise HTTPException(status_code=400, detail="Only .pkl or .joblib files allowed")
    model_name = name or model_file.filename.rsplit(".", 1)[0] or str(uuid.uuid4())
    target = model_path(model_name)
    try:
        with open(target, "wb") as f:
            shutil.copyfileobj(model_file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok", "name": model_name}

@router.post("/activate")
def activate_model(payload: Dict[str, str] = Body(...)):
    """
    payload: { "name": "<model_name>" }
    """
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Missing model name")
    p = model_path(name)
    if not os.path.exists(p):
        raise HTTPException(status_code=404, detail="Model not found")
    with open(ACTIVE_MODEL_FILE, "w") as f:
        f.write(name)
    return {"status": "activated", "name": name}

@router.delete("/{name}")
def delete_model(name: str):
    p = model_path(name)
    if not os.path.exists(p):
        raise HTTPException(status_code=404, detail="Model not found")
    os.remove(p)
    # if deleted model was active clear active
    if os.path.exists(ACTIVE_MODEL_FILE):
        with open(ACTIVE_MODEL_FILE, "r") as f:
            active = f.read().strip()
        if active == name:
            os.remove(ACTIVE_MODEL_FILE)
    return {"status": "deleted", "name": name}

# Prediction endpoint uses active model
@router.post("/predict")
def predict(payload: Dict[str, Any] = Body(...)):
    # payload: { model_name (optional), <feature>: value ... }
    model_name = payload.get("model_name")
    features_input = {k:v for k,v in payload.items() if k != "model_name"}
    # pick model_name: explicit or active
    if model_name is None:
        if os.path.exists(ACTIVE_MODEL_FILE):
            with open(ACTIVE_MODEL_FILE, "r") as f:
                model_name = f.read().strip()
        else:
            raise HTTPException(status_code=404, detail="No active model and no model_name supplied")
    mpath = model_path(model_name)
    preproc_path = os.path.join(MODEL_DIR, PREPROCESSOR_NAME)
    feature_list_path = os.path.join(MODEL_DIR, FEATURE_LIST_NAME)
    if not os.path.exists(mpath):
        raise HTTPException(status_code=404, detail="Model not found")
    try:
        model = joblib.load(mpath)
        preprocessor = joblib.load(preproc_path) if os.path.exists(preproc_path) else None
        features = joblib.load(feature_list_path) if os.path.exists(feature_list_path) else list(features_input.keys())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Load failed: {e}")
    import pandas as pd
    df = pd.DataFrame([features_input])
    for col in features:
        if col not in df.columns:
            df[col] = 0
    X = df[features]
    if preprocessor is not None:
        X_trans = preprocessor.transform(X)
    else:
        X_trans = X.values
    try:
        pred = model.predict(X_trans)[0]
        proba = model.predict_proba(X_trans)[0].tolist() if hasattr(model, "predict_proba") else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"prediction": int(pred), "probability": proba, "model": model_name}

# Explain wrapper (call your existing SHAP explainer if present)
@router.post("/explain")
def explain(payload: Dict[str, Any] = Body(...)):
    """
    payload: { model_name: optional, <feature>... }
    Returns a list of top_features same as earlier /model/explain contract.
    """
    # We'll try to use existing explainer function if available
    try:
        from ml.shap_explainer import explain_instance
    except Exception:
        explain_instance = None

    model_name = payload.get("model_name")
    features_input = {k:v for k,v in payload.items() if k!="model_name"}

    if explain_instance is None:
        # fallback - return feature magnitudes as fake contributions
        feats = [{"feature": k, "impact": (abs(float(v)) if isinstance(v,(int,float,str)) and str(v).replace('.','',1).isdigit() else 0)} for k,v in features_input.items()]
        feats_sorted = sorted(feats, key=lambda x: x["impact"], reverse=True)[:8]
        return {"top_features": feats_sorted, "raw": {"note": "fallback (no shap)"}}

    try:
        res = explain_instance(model_name, features_input)
        sorted_feats = sorted(res["feature_contributions"].items(), key=lambda x: abs(x[1]), reverse=True)
        top5 = [{"feature": k, "impact": v} for k,v in sorted_feats[:8]]
        return {"top_features": top5, "raw": res}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Model or preprocessor not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
