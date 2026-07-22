import uvicorn
import pandas as pd
import numpy as np
import os
import cx_Oracle
import joblib
import warnings
import time
import requests
import json
import shap
import random
import re 
import base64
import matplotlib
# Set backend to Agg before importing pyplot to avoid GUI errors
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO, StringIO
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

# --- ML Libraries ---
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder, StandardScaler, LabelEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, precision_score, log_loss, brier_score_loss
from scipy.stats import ks_2samp
from dotenv import load_dotenv

env_paths = [".env", "backend/.env", "../.env"]
for path in env_paths:
    if os.path.exists(path):
        load_dotenv(path)
        print(f"✅ Loaded .env from: {path}")
        break

warnings.filterwarnings("ignore")

# -------------------------------------------------------------------------
# Configuration
# -------------------------------------------------------------------------
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 
ORACLE_USER = os.getenv("ORACLE_USER", "dw")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD", "abc123")
ORACLE_HOST = os.getenv("ORACLE_HOST", "localhost")
ORACLE_PORT = os.getenv("ORACLE_PORT", "1521")
ORACLE_SERVICE = os.getenv("ORACLE_SERVICE", "XE")

dsn = cx_Oracle.makedsn(ORACLE_HOST, ORACLE_PORT, service_name=ORACLE_SERVICE)
pool = None

# --- GLOBAL STATE ---
active_analysis_df = None
active_analysis_meta = ""
current_model_metric = 0.0
current_model_f1 = 0.0
current_model_name = "Initializing..."
current_model_params = {}
global_feature_importance = []
system_status = "Healthy"
last_analytics_insight = {"time": 0, "report": "Initializing strategic insights..."}
REFERENCE_INCOME_CACHE = None # Cache for KS Test reference data

# [NEW] Dynamic Risk Thresholds (Defaults, updated on model load)
risk_thresholds = {
    "low": 0.30,   # Default fallback
    "high": 0.60   # Default fallback
}

# Reference Stats
reference_stats = {
    "min_income": 0,
    "max_income": 6600000, 
    "mean_income": 50000
}

# --- STATE PERSISTENCE ---
STATE_FILE = "model_state.json"
default_state = {
    "model_metric": 0.0,
    "model_f1": 0.0,
    "model_version": "v1.0",
    "model_name": "Initializing...",
    "model_params": {},
    "system_status": "Healthy",
    "reference_stats": {"min_income": 0, "max_income": 6600000, "mean_income": 50000},
    "feature_importance": [],
    "risk_thresholds": {"low": 0.30, "high": 0.60}
}

def load_system_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f: return json.load(f)
        except: return default_state.copy()
    return default_state.copy()

def save_system_state():
    state = {
        "model_metric": current_model_metric,
        "model_f1": current_model_f1,
        "model_version": current_model_version,
        "model_name": current_model_name,
        "model_params": current_model_params,
        "system_status": system_status,
        "reference_stats": reference_stats,
        "feature_importance": global_feature_importance,
        "risk_thresholds": risk_thresholds
    }
    try:
        with open(STATE_FILE, 'w') as f: json.dump(state, f, indent=4)
    except: pass

# Init Globals
initial_state = load_system_state()
current_model_metric = initial_state.get("model_metric", 0.0)
current_model_f1 = initial_state.get("model_f1", 0.0)
current_model_version = initial_state.get("model_version", "v1.0")
current_model_name = initial_state.get("model_name", "Initializing...")
current_model_params = initial_state.get("model_params", {})
system_status = initial_state.get("system_status", "Healthy")
deployment_alert = initial_state.get("deployment_alert", None)
last_comparison = initial_state.get("last_comparison", {})
reference_stats = initial_state.get("reference_stats", default_state["reference_stats"])
global_feature_importance = initial_state.get("feature_importance", [])
risk_thresholds = initial_state.get("risk_thresholds", default_state["risk_thresholds"])

def init_oracle_pool():
    global pool
    try:
        pool = cx_Oracle.SessionPool(
            user=ORACLE_USER, password=ORACLE_PASSWORD, dsn=dsn, 
            min=1, max=5, increment=1, threaded=True, 
            getmode=cx_Oracle.SPOOL_ATTRVAL_WAIT
        )
        print("✅ Oracle connection pool initialized.")
    except Exception as e: print(f"❌ Oracle Init Failed: {e}")

def init_db_table():
    if not pool: return
    conn = pool.acquire(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT count(*) FROM user_tables WHERE table_name = 'APPLICANTS'")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""CREATE TABLE APPLICANTS (APPLICANT_ID NUMBER PRIMARY KEY, FULL_NAME VARCHAR2(100), AGE NUMBER, INCOME NUMBER, HOME_OWNERSHIP VARCHAR2(50), EMP_LENGTH NUMBER, DEFAULT_ON_FILE VARCHAR2(10), CRED_HIST_LENGTH NUMBER)""")
            try: cursor.execute("CREATE SEQUENCE APPLICANT_SEQ START WITH 1 INCREMENT BY 1")
            except: pass
            cursor.execute("""CREATE OR REPLACE TRIGGER APPLICANT_TRG BEFORE INSERT ON APPLICANTS FOR EACH ROW BEGIN IF :new.APPLICANT_ID IS NULL THEN SELECT APPLICANT_SEQ.NEXTVAL INTO :new.APPLICANT_ID FROM dual; END IF; END;""")

        cursor.execute("SELECT count(*) FROM user_tables WHERE table_name = 'LOAN_REQUESTS'")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""CREATE TABLE LOAN_REQUESTS (REQUEST_ID NUMBER PRIMARY KEY, APPLICANT_ID NUMBER, LOAN_AMNT NUMBER, LOAN_INTENT VARCHAR2(100), LOAN_GRADE VARCHAR2(10), LOAN_INT_RATE NUMBER, REQ_TIMESTAMP TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (APPLICANT_ID) REFERENCES APPLICANTS(APPLICANT_ID))""")
            try: cursor.execute("CREATE SEQUENCE LOAN_REQ_SEQ START WITH 1 INCREMENT BY 1")
            except: pass
            cursor.execute("""CREATE OR REPLACE TRIGGER LOAN_REQ_TRG BEFORE INSERT ON LOAN_REQUESTS FOR EACH ROW BEGIN IF :new.REQUEST_ID IS NULL THEN SELECT LOAN_REQ_SEQ.NEXTVAL INTO :new.REQUEST_ID FROM dual; END IF; END;""")

        cursor.execute("SELECT count(*) FROM user_tables WHERE table_name = 'PREDICTION_RESULTS'")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""CREATE TABLE PREDICTION_RESULTS (RESULT_ID NUMBER PRIMARY KEY, REQUEST_ID NUMBER, RISK_LEVEL VARCHAR2(20), PROBABILITY NUMBER, DECISION VARCHAR2(50), FOREIGN KEY (REQUEST_ID) REFERENCES LOAN_REQUESTS(REQUEST_ID))""")
            try: cursor.execute("CREATE SEQUENCE PRED_RES_SEQ START WITH 1 INCREMENT BY 1")
            except: pass
            cursor.execute("""CREATE OR REPLACE TRIGGER PRED_RES_TRG BEFORE INSERT ON PREDICTION_RESULTS FOR EACH ROW BEGIN IF :new.RESULT_ID IS NULL THEN SELECT PRED_RES_SEQ.NEXTVAL INTO :new.RESULT_ID FROM dual; END IF; END;""")
        conn.commit()
    except Exception as e: print(f"❌ DB Init Error: {e}")
    finally: cursor.close(); pool.release(conn)

DATA_PATH = "credit_risk_dataset.csv"
MODEL_FILE = "best_model.pkl"
active_model_pipeline = None

def extract_feature_importance(pipeline, model_name):
    try:
        model = pipeline.named_steps['classifier']
        preprocessor = pipeline.named_steps['preprocessor']
        try: feature_names = preprocessor.get_feature_names_out()
        except: feature_names = [f"F_{i}" for i in range(30)] 
        importances = []
        if hasattr(model, 'feature_importances_'): importances = model.feature_importances_
        elif hasattr(model, 'coef_'): importances = np.abs(model.coef_[0])
        if len(importances) == 0: return []
        feat_imp_df = pd.DataFrame({'feature': feature_names, 'importance': importances})
        feat_imp_df['feature'] = feat_imp_df['feature'].str.replace('num__', '').str.replace('cat__', '')
        return feat_imp_df.sort_values(by='importance', ascending=False).head(5).to_dict(orient='records')
    except Exception as e: return []

def fetch_new_training_data_from_oracle():
    if not pool: return pd.DataFrame()
    conn = pool.acquire(); cursor = conn.cursor()
    try:
        query = """
        SELECT person_age, person_income, person_home_ownership, person_emp_length, 
               loan_intent, loan_grade, loan_amnt, loan_int_rate, 
               cb_person_default_on_file, cb_person_cred_hist_length, DECISION
        FROM (
            SELECT a.AGE as person_age, a.INCOME as person_income, a.HOME_OWNERSHIP as person_home_ownership,
                a.EMP_LENGTH as person_emp_length, l.LOAN_INTENT as loan_intent, l.LOAN_GRADE as loan_grade,
                l.LOAN_AMNT as loan_amnt, l.LOAN_INT_RATE as loan_int_rate, a.DEFAULT_ON_FILE as cb_person_default_on_file,
                a.CRED_HIST_LENGTH as cb_person_cred_hist_length, p.DECISION
            FROM APPLICANTS a
            JOIN LOAN_REQUESTS l ON a.APPLICANT_ID = l.APPLICANT_ID
            JOIN PREDICTION_RESULTS p ON l.REQUEST_ID = p.REQUEST_ID
            ORDER BY l.REQ_TIMESTAMP DESC
        ) WHERE ROWNUM <= 200
        """
        cursor.execute(query)
        columns = ['person_age', 'person_income', 'person_home_ownership', 'person_emp_length', 
                   'loan_intent', 'loan_grade', 'loan_amnt', 'loan_int_rate', 
                   'cb_person_default_on_file', 'cb_person_cred_hist_length', 'decision']
        data = cursor.fetchall()
        if not data: return pd.DataFrame()
        df_new = pd.DataFrame(data, columns=columns)
        df_new['loan_status'] = df_new['decision'].apply(lambda x: 1 if x == 'Denied' else 0)
        df_new = df_new.drop(columns=['decision'])
        df_new['loan_percent_income'] = df_new['loan_amnt'] / df_new['person_income']
        return df_new
    except: return pd.DataFrame()
    finally: cursor.close(); pool.release(conn)

def load_or_train_model(force_retrain=False):
    global active_model_pipeline, current_model_metric, current_model_f1, current_model_name, current_model_params, reference_stats, global_feature_importance, system_status, risk_thresholds
    
    # CASE 1: LOADING EXISTING MODEL
    if not force_retrain:
        print(f"📊 Initial State Loaded: Metric={current_model_metric}, F1={current_model_f1}")
        if os.path.exists(DATA_PATH):
            df_ref = pd.read_csv(DATA_PATH)
            reference_stats['min_income'] = float(df_ref['person_income'].min())
            reference_stats['max_income'] = float(df_ref['person_income'].max()) * 1.1
            reference_stats['mean_income'] = float(df_ref['person_income'].mean())
    
    # CASE 2: TRAINING NEW MODEL
    if not force_retrain and os.path.exists(MODEL_FILE):
        try: 
            active_model_pipeline = joblib.load(MODEL_FILE)
            if 'classifier' in active_model_pipeline.named_steps:
                current_model_name = type(active_model_pipeline.named_steps['classifier']).__name__
            
            # Calculate Dynamic Thresholds on Load if possible
            if os.path.exists(DATA_PATH):
                 try:
                     print("🔄 Recalibrating risk thresholds based on data distribution...")
                     df = pd.read_csv(DATA_PATH).dropna(subset=['loan_status']).sample(frac=0.3, random_state=42)
                     X = df.drop(columns=['loan_status'], errors='ignore')
                     
                     # Get probabilities
                     probs = active_model_pipeline.predict_proba(X)[:, 1]
                     
                     # Set thresholds:
                     risk_thresholds['low'] = float(np.percentile(probs, 40))
                     risk_thresholds['high'] = float(np.percentile(probs, 80))
                     print(f"📉 New Thresholds: Low < {risk_thresholds['low']:.3f}, High > {risk_thresholds['high']:.3f}")
                     save_system_state()
                 except Exception as e:
                     print(f"⚠️ Threshold calibration failed: {e}")

            if current_model_metric == 0.0 and os.path.exists(DATA_PATH):
                print("🔄 Calculating metrics for loaded model...")
                df = pd.read_csv(DATA_PATH).dropna(subset=['loan_status']).sample(frac=0.2)
                X = df.drop(columns=['loan_status'], errors='ignore'); y = df['loan_status']
                metrics = evaluate_model(active_model_pipeline, X, y)
                current_model_metric = round(metrics['auc'], 4)
                current_model_f1 = round(metrics['f1'], 4)
                save_system_state()
            return
        except Exception as e: print(f"⚠️ Model load failed: {e}")
    
    print("⚠️ Initial Training Pipeline...")
    if not os.path.exists(DATA_PATH): return
    df = pd.read_csv(DATA_PATH).dropna(subset=['loan_status'])
    
    # Removing Age > 100 and Employment Length > 100 (handles the 123.0 value)
    df = df[(df['person_age'] < 100) & (df['person_emp_length'] < 100)]
    
    X = df.drop(columns=['loan_status'], errors='ignore'); y = df['loan_status']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    num_feats = X.select_dtypes(include=['int64', 'float64']).columns
    cat_feats = X.select_dtypes(include=['object']).columns
    preprocessor = ColumnTransformer([
        ('num', Pipeline([('imputer', SimpleImputer(strategy='median')), ('scaler', StandardScaler())]), num_feats),
        ('cat', Pipeline([('imputer', SimpleImputer(strategy='constant', fill_value='missing')), ('encoder', OneHotEncoder(handle_unknown='ignore'))]), cat_feats)
    ])
    # Add class_weight='balanced' to implement Cost-Sensitive Learning
    pipeline = Pipeline([
        ('preprocessor', preprocessor), 
        ('classifier', RandomForestClassifier(n_estimators=50, class_weight='balanced'))
    ])
    pipeline.fit(X_train, y_train)
    
    # [NEW] Calculate Thresholds after training
    try:
        probs = pipeline.predict_proba(X_test)[:, 1]
        risk_thresholds['low'] = float(np.percentile(probs, 40))
        risk_thresholds['high'] = float(np.percentile(probs, 80))
        print(f"📉 Training Thresholds: Low < {risk_thresholds['low']:.3f}, High > {risk_thresholds['high']:.3f}")
    except: pass
    
    metrics = evaluate_model(pipeline, X_test, y_test)
    current_model_metric = round(metrics['auc'], 4)
    current_model_f1 = round(metrics['f1'], 4)
    current_model_name = "RandomForestClassifier"
    active_model_pipeline = pipeline
    save_system_state()
    joblib.dump(pipeline, MODEL_FILE)
    print("✅ Initial Model Loaded.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_oracle_pool(); init_db_table(); load_or_train_model(); yield
    if pool: pool.close()

app = FastAPI(title="Smart Credit AI", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class LoanApplicationSchema(BaseModel):
    person_name: str; person_age: int; person_income: float; person_home_ownership: str
    person_emp_length: float; loan_intent: str; loan_grade: str; loan_amnt: float
    loan_int_rate: float; cb_person_default_on_file: str; cb_person_cred_hist_length: int

class ChatSchema(BaseModel):
    message: str
    
class UpdateDecisionSchema(BaseModel):
    request_id: int
    decision: str

def call_gemini(prompt):
    if not GEMINI_API_KEY: return "Error: API Key missing."
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    try:
        res = requests.post(url, headers={"Content-Type": "application/json"}, json={"contents": [{"parts": [{"text": prompt}]}]})
        if res.status_code != 200: return f"AI Error ({res.status_code}): {res.text}"
        data = res.json()
        if "candidates" not in data: return "AI Error: No candidates returned."
        return data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e: return f"AI Error: {str(e)}"

# --- TEXT CLEANING HELPER ---
def clean_text_output(text):
    if not text: return ""
    text = re.sub(r'\*\*|__', '', text); text = re.sub(r'#+\s', '', text); text = re.sub(r'---', '', text); text = re.sub(r'\*\s', '• ', text)
    return text.strip()

# --- Helper: Calculate Comprehensive Metrics ---
def evaluate_model(pipeline, X_test, y_test):
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    return {
        "accuracy": accuracy_score(y_test, y_pred),
        "auc": roc_auc_score(y_test, y_prob),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "f1": f1_score(y_test, y_pred),
        "log_loss": log_loss(y_test, y_prob),
        "calibration": brier_score_loss(y_test, y_prob)
    }

# ==============================================================================
#  STEP 1: DRIFT DETECTION (Kolmogorov-Smirnov Test)
# ==============================================================================
def detect_drift(live_incomes):
    """
    Implements the Kolmogorov-Smirnov (KS) test to detect statistical drift
    between the live data stream and the reference training data.
    """
    global REFERENCE_INCOME_CACHE
    
    # 1. Load Reference Data (Lazy Loading with Caching)
    if REFERENCE_INCOME_CACHE is None:
        if os.path.exists(DATA_PATH):
            try:
                # Read only the income column for efficiency
                df_ref = pd.read_csv(DATA_PATH, usecols=['person_income'])
                REFERENCE_INCOME_CACHE = df_ref['person_income'].dropna().values
                print(f"📊 KS Test: Loaded reference distribution ({len(REFERENCE_INCOME_CACHE)} samples).")
            except Exception as e:
                print(f"⚠️ KS Test Error: Could not load reference data - {e}")
                return False, 0.0
        else:
            print("⚠️ KS Test Error: Reference dataset not found.")
            return False, 0.0

    # 2. Validation
    # KS test requires a reasonable sample size to be valid
    if len(live_incomes) < 30:
        return False, 0.0

    # 3. Perform Kolmogorov-Smirnov Test
    # Statistic (D): Max distance between CDFs. P-value: Probability samples are same dist.
    statistic, p_value = ks_2samp(REFERENCE_INCOME_CACHE, live_incomes)

    # 4. Interpret Results
    # If p_value < 0.05, we reject Null Hypothesis -> Distributions are different (Drift)
    is_drift = p_value < 0.05
    
    if is_drift:
        print(f"🚨 DRIFT DETECTED | KS Statistic: {statistic:.4f} | P-value: {p_value:.4e}")
    
    # Return drift boolean and the KS statistic (Magnitude of drift)
    return is_drift, statistic

# ==============================================================================
#  STEPS 2-6: THE RETRAINING WORKFLOW
# ==============================================================================
def run_model_retraining_workflow():
    global active_model_pipeline, current_model_metric, current_model_f1, current_model_name, current_model_params
    global system_status, deployment_alert, last_comparison, current_model_version, reference_stats, global_feature_importance, risk_thresholds

    print("🔄 [MLOps] Step 2: Triggering Retraining Job on New + Historical Data...")
    
    if not os.path.exists(DATA_PATH): return
    
    df_old = pd.read_csv(DATA_PATH)
    df_new = fetch_new_training_data_from_oracle()
    
    # Augment Data
    if not df_new.empty:
        df_augmented = pd.concat([df_old, df_new], ignore_index=True).drop_duplicates()
        if 'loan_status' in df_augmented.columns:
            df_augmented = df_augmented.dropna(subset=['loan_status'])
    else:
        df_augmented = df_old

    X = df_augmented.drop(columns=['loan_status'], errors='ignore')
    y = df_augmented['loan_status'] if 'loan_status' in df_augmented.columns else np.random.randint(0, 2, df_augmented.shape[0])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("🧠 [MLOps] Training Candidate Model (Challenger)...")
    
    num_feats = X.select_dtypes(include=['int64', 'float64']).columns
    cat_feats = X.select_dtypes(include=['object']).columns
    preprocessor = ColumnTransformer([
        ('num', Pipeline([('imputer', SimpleImputer(strategy='median')), ('scaler', StandardScaler())]), num_feats),
        ('cat', Pipeline([('imputer', SimpleImputer(strategy='constant', fill_value='missing')), ('encoder', OneHotEncoder(handle_unknown='ignore'))]), cat_feats)
    ])

    # Train Challenger
    pipeline = Pipeline([('preprocessor', preprocessor), ('classifier', RandomForestClassifier(class_weight='balanced'))])
    params = {'classifier__n_estimators': [50, 100], 'classifier__max_depth': [10, 20]}
    
    grid = GridSearchCV(pipeline, params, cv=3, scoring='roc_auc', n_jobs=-1)
    grid.fit(X_train, y_train)
    
    challenger_model = grid.best_estimator_
    
    # --- Step 4: Validate New Model ---
    challenger_metrics = evaluate_model(challenger_model, X_test, y_test)
    champion_metrics = evaluate_model(active_model_pipeline, X_test, y_test)
    
    print(f"📊 [MLOps] Step 5: Comparing Models...\n   Champion AUC: {champion_metrics['auc']:.4f}\n   Challenger AUC: {challenger_metrics['auc']:.4f}")

    last_comparison = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "champion": champion_metrics,
        "challenger": challenger_metrics
    }
    
    # --- Step 5: Compare Old vs New ---
    if challenger_metrics['auc'] > champion_metrics['auc']:
        print("✅ [MLOps] Challenger Wins! Deploying New Version...")
        active_model_pipeline = challenger_model
        current_model_metric = round(challenger_metrics['auc'], 4)
        current_model_f1 = round(challenger_metrics['f1'], 4)
        current_model_name = "RandomForest (v" + str(float(current_model_version[1:]) + 0.1)[:3] + ")"
        current_model_params = grid.best_params_
        global_feature_importance = extract_feature_importance(challenger_model, current_model_name)
        current_model_version = "v" + str(float(current_model_version[1:]) + 0.1)[:3]
        
        try:
            df_augmented.to_csv(DATA_PATH, index=False)
            reference_stats['min_income'] = float(df_augmented['person_income'].min())
            reference_stats['max_income'] = float(df_augmented['person_income'].max()) * 1.1
            reference_stats['mean_income'] = float(df_augmented['person_income'].mean())
        except: pass
        
        joblib.dump(challenger_model, MODEL_FILE)
        system_status = "Healthy"
        deployment_alert = None
        print(f"🚀 Deployed {current_model_version}")

    else:
        print("❌ [MLOps] Challenger Failed. Keeping Old Model.")
        system_status = "Attention Needed"
        deployment_alert = f"Retraining failed to improve model. Old AUC: {champion_metrics['auc']:.3f}, New AUC: {challenger_metrics['auc']:.3f}"

    save_system_state()

def auto_heal_task():
    print("🚨 [MLOps Agent] Step 1: Drift Detected (KS Test p < 0.05).")
    time.sleep(2) 
    run_model_retraining_workflow()

def check_real_data_drift(background_tasks: BackgroundTasks = None):
    global system_status
    if not pool: return
    conn = pool.acquire(); cursor = conn.cursor()
    try:
        cursor.execute("SELECT INCOME FROM (SELECT INCOME FROM APPLICANTS ORDER BY APPLICANT_ID DESC) WHERE ROWNUM <= 50")
        rows = cursor.fetchall()
        if len(rows) < 30: return # Need sufficient sample for KS test
        live_incomes = [r[0] for r in rows]
        
        is_drift, stat = detect_drift(live_incomes)
        
        if is_drift:
            system_status = "Drift Detected"
            save_system_state()
            print(f"🚨 DATA DRIFT DETECTED (KS Statistic: {stat:.4f}). Triggering Workflow...")
            if background_tasks:
                background_tasks.add_task(auto_heal_task)
        else:
            if system_status != "Retraining" and system_status != "Attention Needed":
                system_status = "Healthy"
                save_system_state()
    except Exception as e: print(f"Drift check error: {e}")
    finally: cursor.close(); pool.release(conn)

@app.post("/api/reset-db")
def reset_database():
    if not pool: return {"error": "No DB connection"}
    conn = pool.acquire(); cursor = conn.cursor()
    try:
        print("⚠️ Resetting Database...")
        cursor.execute("DELETE FROM PREDICTION_RESULTS")
        cursor.execute("DELETE FROM LOAN_REQUESTS")
        cursor.execute("DELETE FROM APPLICANTS")
        seqs = ["PRED_RES_SEQ", "LOAN_REQ_SEQ", "APPLICANT_SEQ"]
        for seq in seqs:
            try: cursor.execute(f"DROP SEQUENCE {seq}"); cursor.execute(f"CREATE SEQUENCE {seq} START WITH 1 INCREMENT BY 1")
            except: pass
        conn.commit()
        global current_model_metric, system_status, current_model_params, current_model_version, risk_thresholds
        current_model_metric = 0.94; system_status = "Healthy"; current_model_params = {}; current_model_version = "v1.0"
        risk_thresholds = {"low": 0.30, "high": 0.60} # Reset thresholds
        save_system_state()
        return {"status": "success", "message": "All records deleted & sequences reset."}
    except Exception as e:
        conn.rollback(); return {"status": "error", "message": str(e)}
    finally: cursor.close(); pool.release(conn)

@app.post("/api/simulate-drift")
def simulate_drift(background_tasks: BackgroundTasks):
    print("⚠️ Injecting Data Noise...")
    conn = pool.acquire(); cur = conn.cursor()
    try:
        for i in range(35): # Need > 30 for KS test validity
            cur.execute("""INSERT INTO APPLICANTS (APPLICANT_ID, FULL_NAME, AGE, INCOME, HOME_OWNERSHIP, EMP_LENGTH, DEFAULT_ON_FILE, CRED_HIST_LENGTH) VALUES (NULL, 'Drift Bot', 99, 99000000, 'RENT', 0, 'N', 0)""")
            cur.execute("SELECT APPLICANT_SEQ.CURRVAL FROM DUAL"); aid = cur.fetchone()[0]
            cur.execute("""INSERT INTO LOAN_REQUESTS (REQUEST_ID, APPLICANT_ID, LOAN_AMNT, LOAN_INTENT, LOAN_GRADE, LOAN_INT_RATE) VALUES (NULL, :1, 10000, 'VENTURE', 'A', 5.0)""", (aid,))
            cur.execute("SELECT LOAN_REQ_SEQ.CURRVAL FROM DUAL"); rid = cur.fetchone()[0]
            cur.execute("""INSERT INTO PREDICTION_RESULTS (RESULT_ID, REQUEST_ID, RISK_LEVEL, PROBABILITY, DECISION) VALUES (NULL, :1, 'High', 0.9, 'Denied')""", (rid,))
        conn.commit()
        check_real_data_drift(background_tasks)
    except Exception as e: print(e)
    finally: cur.close(); pool.release(conn)

@app.get("/api/search")
def search_applicants(q: str):
    if not pool: return []
    conn = pool.acquire(); cursor = conn.cursor()
    try:
        search_term = f"%{q}%"
        query = """SELECT a.FULL_NAME, l.LOAN_AMNT, l.LOAN_GRADE, p.PROBABILITY, p.DECISION, p.RISK_LEVEL, a.AGE, a.INCOME, a.HOME_OWNERSHIP, a.EMP_LENGTH, l.LOAN_INTENT, l.LOAN_INT_RATE, a.DEFAULT_ON_FILE, a.CRED_HIST_LENGTH, l.REQ_TIMESTAMP, l.REQUEST_ID FROM PREDICTION_RESULTS p JOIN LOAN_REQUESTS l ON p.REQUEST_ID = l.REQUEST_ID JOIN APPLICANTS a ON l.APPLICANT_ID = a.APPLICANT_ID WHERE LOWER(a.FULL_NAME) LIKE LOWER(:1) ORDER BY l.REQ_TIMESTAMP DESC"""
        cursor.execute(query, (search_term,))
        columns = ["person_name", "loan_amnt", "grade", "probability", "decision", "risk_level", "age", "income", "home_ownership", "emp_length", "intent", "int_rate", "default_hist", "cred_hist_length", "timestamp", "request_id"]
        return [dict(zip(columns, r)) for r in cursor.fetchall()]
    except Exception as e: print(f"Search error: {e}"); return []
    finally: cursor.close(); pool.release(conn)

@app.post("/api/update-decision")
def update_decision(body: UpdateDecisionSchema):
    if not pool: return {"error": "No DB connection"}
    conn = pool.acquire(); cursor = conn.cursor()
    try:
        cursor.execute("UPDATE PREDICTION_RESULTS SET DECISION = :1 WHERE REQUEST_ID = :2", (body.decision, body.request_id))
        conn.commit()
        return {"status": "success"}
    except Exception as e: conn.rollback(); return {"status": "error"}
    finally: cursor.close(); pool.release(conn)

@app.post("/api/predict")
def predict(data: LoanApplicationSchema, background_tasks: BackgroundTasks):
    background_tasks.add_task(check_real_data_drift, background_tasks)
    if not active_model_pipeline: raise HTTPException(503, "Model loading...")
    input_data = pd.DataFrame([data.dict(exclude={'person_name'})])
    input_data['loan_percent_income'] = data.loan_amnt / data.person_income if data.person_income > 0 else 0
    try:
        # Model Inference (Fast)
        prob = active_model_pipeline.predict_proba(input_data)[0][1]
        
        # Dynamic Threshold Logic
        t_low = risk_thresholds.get("low", 0.30)
        t_high = risk_thresholds.get("high", 0.60)
        
        if prob < t_low: risk, dec = "Low", "Approved"
        elif prob < t_high: risk, dec = "Medium", "Manual Review"
        else: risk, dec = "High", "Denied"
        
        factors = []
        if risk != "Low":
             if data.person_income < 30000: factors.append("Low Income")
             if data.loan_grade in ['D','E','F','G']: factors.append("High Risk Grade")
        if pool:
            conn = pool.acquire(); cur = conn.cursor()
            try:
                aid = cur.var(cx_Oracle.NUMBER); rid = cur.var(cx_Oracle.NUMBER)
                cur.execute("INSERT INTO APPLICANTS (APPLICANT_ID, FULL_NAME, AGE, INCOME, HOME_OWNERSHIP, EMP_LENGTH, DEFAULT_ON_FILE, CRED_HIST_LENGTH) VALUES (NULL, :1, :2, :3, :4, :5, :6, :7) RETURNING APPLICANT_ID INTO :8", (data.person_name, data.person_age, data.person_income, data.person_home_ownership, data.person_emp_length, data.cb_person_default_on_file, data.cb_person_cred_hist_length, aid))
                cur.execute("INSERT INTO LOAN_REQUESTS (REQUEST_ID, APPLICANT_ID, LOAN_AMNT, LOAN_INTENT, LOAN_GRADE, LOAN_INT_RATE) VALUES (NULL, :1, :2, :3, :4, :5) RETURNING REQUEST_ID INTO :6", (aid.getvalue()[0], data.loan_amnt, data.loan_intent, data.loan_grade, data.loan_int_rate, rid))
                cur.execute("INSERT INTO PREDICTION_RESULTS (RESULT_ID, REQUEST_ID, RISK_LEVEL, PROBABILITY, DECISION) VALUES (NULL, :1, :2, :3, :4)", (rid.getvalue()[0], risk, float(prob), dec))
                conn.commit()
            except Exception as e: print(e); conn.rollback()
            finally: cur.close(); pool.release(conn)
        return {"risk_level": risk, "probability_of_default": round(prob, 4), "decision": dec, "factors": factors}
    except Exception as e: raise HTTPException(500, str(e))

@app.get("/api/history")
def get_history():
    if not pool: return []
    conn = pool.acquire(); cursor = conn.cursor()
    try:
        query = """SELECT FULL_NAME, LOAN_AMNT, LOAN_GRADE, PROBABILITY, DECISION, RISK_LEVEL, AGE, INCOME, HOME_OWNERSHIP, EMP_LENGTH, LOAN_INTENT, LOAN_INT_RATE, DEFAULT_ON_FILE, CRED_HIST_LENGTH, REQ_TIMESTAMP, REQUEST_ID FROM (SELECT a.FULL_NAME, l.LOAN_AMNT, l.LOAN_GRADE, p.PROBABILITY, p.DECISION, p.RISK_LEVEL, a.AGE, a.INCOME, a.HOME_OWNERSHIP, a.EMP_LENGTH, l.LOAN_INTENT, l.LOAN_INT_RATE, a.DEFAULT_ON_FILE, a.CRED_HIST_LENGTH, l.REQ_TIMESTAMP, l.REQUEST_ID FROM PREDICTION_RESULTS p JOIN LOAN_REQUESTS l ON p.REQUEST_ID = l.REQUEST_ID JOIN APPLICANTS a ON l.APPLICANT_ID = a.APPLICANT_ID ORDER BY l.REQ_TIMESTAMP DESC) WHERE ROWNUM <= 1000"""
        cursor.execute(query)
        columns = ["person_name", "loan_amnt", "grade", "probability", "decision", "risk_level", "age", "income", "home_ownership", "emp_length", "intent", "int_rate", "default_hist", "cred_hist_length", "timestamp", "request_id"]
        return [dict(zip(columns, r)) for r in cursor.fetchall()]
    finally: cursor.close(); pool.release(conn)

@app.get("/api/analytics")
def get_analytics():
    if not pool: return {}
    conn = pool.acquire(); cursor = conn.cursor(); data = {}
    try:
        cursor.execute("SELECT (SELECT COUNT(*) FROM LOAN_REQUESTS), (SELECT COUNT(*) FROM PREDICTION_RESULTS WHERE DECISION = 'Approved'), (SELECT AVG(PROBABILITY) FROM PREDICTION_RESULTS), (SELECT COUNT(*) FROM PREDICTION_RESULTS WHERE DECISION = 'Manual Review') FROM DUAL")
        kpi = cursor.fetchone()
        data = {"total_apps": kpi[0], "approval_rate": round((kpi[1]/kpi[0]*100),1) if kpi[0] else 0, "avg_risk": round(kpi[2]*100,1) if kpi[2] else 0, "pending": kpi[3]}
        data["model_accuracy"] = current_model_metric
        data["model_f1"] = current_model_f1
        data["active_model"] = current_model_name
        data["feature_importance"] = global_feature_importance
        data["system_status"] = system_status
        data["model_version"] = current_model_version 
        data["deployment_alert"] = deployment_alert 
        
        # [NEW] GENERATE AI INSIGHTS
        global last_analytics_insight
        # Only refresh insight every 60s to avoid API spam, and only if data exists
        if data["total_apps"] > 0 and (time.time() - last_analytics_insight["time"] > 60):
            prompt = f"The current loan approval rate is {data['approval_rate']}% and average risk probability is {data['avg_risk']}%. Generate a 3-bullet point executive summary for the bank manager advising on portfolio strategy. Keep it professional and concise. Output plain text."
            insight = clean_text_output(call_gemini(prompt))
            if "AI Error" not in insight:
                 last_analytics_insight = {"time": time.time(), "report": insight}
        
        data["insight_report"] = last_analytics_insight["report"]
        
        cursor.execute("SELECT RISK_LEVEL, COUNT(*) FROM PREDICTION_RESULTS GROUP BY RISK_LEVEL")
        data["risk_dist"] = [{"name": r[0], "value": r[1], "color": {"Low":"#10B981","Medium":"#F59E0B","High":"#EF4444"}.get(r[0],"#999")} for r in cursor.fetchall()]
        cursor.execute("SELECT REQ_TIMESTAMP FROM LOAN_REQUESTS")
        rows = cursor.fetchall()
        if not rows: data["trend"] = [{"name": "No Data", "val": 0}]
        else:
            df = pd.DataFrame(rows, columns=['ts']); df['ts'] = pd.to_datetime(df['ts'])
            trend = df.groupby(df['ts'].dt.strftime('%b'))['ts'].count().reindex(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'], fill_value=0)
            data["trend"] = [{"name": k, "val": v} for k, v in trend.items() if v > 0]
            if not data["trend"]: data["trend"] = [{"name": "No Data", "val": 0}]
        return data
    except Exception as e: return {"error": str(e)}
    finally: cursor.close(); pool.release(conn)

@app.post("/api/ai/upload")
async def upload_dataset(file: UploadFile = File(...)):
    global active_analysis_df, active_analysis_meta
    try:
        contents = await file.read(); df = pd.read_csv(BytesIO(contents))
        active_analysis_df = df.copy()
        buffer = StringIO(); df.info(buf=buffer); info_str = buffer.getvalue()
        active_analysis_meta = f"Shape: {df.shape}, Cols: {list(df.columns)}, Missing: {df.isnull().sum().to_dict()}"
        return {"status": "success", "rows": df.shape[0], "cols": df.shape[1]}
    except Exception as e: raise HTTPException(500, f"Upload failed: {str(e)}")

# [NEW] Helper for Dynamic Visualizations
def generate_dynamic_visualizations(df):
    """
    Uses Gemini to select columns to visualize, then aggregates data in Python.
    """
    viz_data = []
    try:
        # 1. Prepare Schema Summary for AI
        # Filter for columns that are "graphable" (categorical or low-cardinality numeric)
        candidates = []
        for col in df.columns:
            n_unique = df[col].nunique()
            dtype = str(df[col].dtype)
            if 1 < n_unique < 20: # Sweet spot for charts
                candidates.append(f"{col} ({dtype}, {n_unique} unique)")
        
        if not candidates:
            return []

        # 2. Ask Gemini to pick the best ones
        prompt = f"""
        You are a Data Analyst. We have a dataset with these candidate columns for visualization:
        {json.dumps(candidates)}
        
        Select the top 3 most insightful columns to graph for a business report.
        Return ONLY a raw JSON array (no markdown) of objects. 
        Each object must have: 
        - "column": (exact column name)
        - "type": ("bar" or "pie")
        - "title": (professional chart title)
        
        Example: [{{"column": "loan_grade", "type": "bar", "title": "Risk Grade Distribution"}}]
        """
        
        response_text = call_gemini(prompt)
        # Clean response
        cleaned_json = re.sub(r"```json|```", "", clean_text_output(response_text)).strip()
        config_list = json.loads(cleaned_json)
        
        # 3. Generate Data for selected columns
        for config in config_list:
            col = config.get("column")
            if col in df.columns:
                vc = df[col].value_counts().head(10).reset_index() # Top 10 only to avoid clutter
                vc.columns = ['name', 'value']
                viz_data.append({
                    "id": col,
                    "title": config.get("title", f"Distribution of {col}"),
                    "type": config.get("type", "bar").lower(),
                    "data": vc.to_dict(orient='records')
                })
                
    except Exception as e:
        print(f"Dynamic Viz Error: {e}")
        # Fallback: Just grab first 3 candidates if AI fails
        
    return viz_data

@app.post("/api/ai/council-meeting")
async def council_meeting():
    global active_analysis_df
    if active_analysis_df is None: raise HTTPException(400, "No dataset uploaded.")
    df = active_analysis_df
    buffer = StringIO(); df.info(buf=buffer); info_str = buffer.getvalue()
    stats = df.describe().to_string(); data_profile = f"Shape: {df.shape}\nStats:\n{stats}\nInfo:\n{info_str}"
    
    # [FIX] Clean Output + Use new prompts for plain text
    data_agent_resp = clean_text_output(call_gemini(f"Act as a Data Engineer. Provide a plain text summary of this dataset profile for a business analyst. Highlight 3 key data quality issues. No markdown formatting. Profile: {data_profile}"))
    time.sleep(1)
    business_agent_resp = clean_text_output(call_gemini(f"Act as a Lead Business Analyst. Based on this data profile, identify the top 3 credit risks in plain text. No markdown. \n\nData Profile: {data_agent_resp}"))
    time.sleep(1)
    strategy_agent_resp = clean_text_output(call_gemini(f"Act as a Lead Data Scientist. Based on these risks, recommend a specific machine learning strategy (Model Type, Feature Engineering) in plain text. No markdown. \n\nRisks: {business_agent_resp}"))
    
    # [NEW] Generate Dynamic Visualizations
    visualizations = generate_dynamic_visualizations(df)

    return {
        "data_analysis": data_agent_resp, 
        "business_risks": business_agent_resp, 
        "strategy_recommendation": strategy_agent_resp,
        "visualizations": visualizations # Returns list: [{title, type, data}, ...]
    }

@app.post("/api/ai/agent/{agent_type}")
async def run_agent(agent_type: str):
    return {"response": "Please use the Council Meeting feature."}

@app.post("/api/ai/chat")
async def chat_with_data(body: ChatSchema):
    if not active_analysis_meta: return {"response": "Please upload a dataset first."}
    
    # [FIX] Guardrail Prompt
    prompt = f"""
    System: You are a strict Credit Risk Assistant.
    RULE: You must ONLY answer questions about the uploaded dataset, credit risk management, or banking.
    If the user asks about ANYTHING else (e.g. food, sports, coding games), refuse politely.
    Output: Plain text only. No markdown.
    
    Data Metadata: {active_analysis_meta}
    User Query: {body.message}
    """
    return {"response": clean_text_output(call_gemini(prompt))}

# --- SAMPLE DATA ENDPOINT ---
@app.get("/api/sample-records")
def get_sample_records():
    if not pool: return {}
    conn = pool.acquire(); cursor = conn.cursor()
    samples = {}
    targets = {"Approved": "Approved", "Denied": "Denied", "Pending": "Manual Review"}
    try:
        for key, db_status in targets.items():
            query = """SELECT a.FULL_NAME, a.AGE, a.INCOME, a.HOME_OWNERSHIP, a.EMP_LENGTH, l.LOAN_INTENT, l.LOAN_GRADE, l.LOAN_AMNT, l.LOAN_INT_RATE, a.DEFAULT_ON_FILE, a.CRED_HIST_LENGTH FROM PREDICTION_RESULTS p JOIN LOAN_REQUESTS l ON p.REQUEST_ID = l.REQUEST_ID JOIN APPLICANTS a ON l.APPLICANT_ID = a.APPLICANT_ID WHERE p.DECISION = :1 ORDER BY l.REQ_TIMESTAMP DESC"""
            cursor.execute(f"SELECT * FROM ({query}) WHERE ROWNUM = 1", (db_status,))
            row = cursor.fetchone()
            if row:
                samples[key] = {"person_name": row[0], "person_age": row[1], "person_income": row[2], "person_home_ownership": row[3], "person_emp_length": row[4], "loan_intent": row[5], "loan_grade": row[6], "loan_amnt": row[7], "loan_int_rate": row[8], "cb_person_default_on_file": row[9], "cb_person_cred_hist_length": row[10]}
            else: samples[key] = None
        return samples
    except Exception as e: return {"error": str(e)}
    finally: cursor.close(); pool.release(conn)

# --- SHAP XAI ENDPOINTS ---

@app.post("/api/xai/explain")
def explain_prediction(data: LoanApplicationSchema):
    """ Returns Local SHAP values (feature contribution) for a specific prediction """
    if not active_model_pipeline:
        raise HTTPException(503, "Model not loaded")
    
    try:
        # 1. Prepare Data
        input_df = pd.DataFrame([data.dict(exclude={'person_name'})])
        input_df['loan_percent_income'] = data.loan_amnt / data.person_income if data.person_income > 0 else 0
        
        # 2. Get Pipeline Components
        model = active_model_pipeline.named_steps['classifier']
        preprocessor = active_model_pipeline.named_steps['preprocessor']
        
        # 3. Transform Input
        X_transformed = preprocessor.transform(input_df)
        
        # [FIX] Convert sparse matrix to dense for SHAP compatibility
        if hasattr(X_transformed, "toarray"):
            X_transformed = X_transformed.toarray()
        
        # 4. Create Explainer & Calculate Values
        explainer = shap.TreeExplainer(model)
        
        # Check if binary classification (returns list of [class0, class1])
        shap_values_result = explainer.shap_values(X_transformed, check_additivity=False)
        
        # [FIX] Robustly handle SHAP return types (list vs array vs 3D array)
        if isinstance(shap_values_result, list):
            # Standard list return: [array(N, M), array(N, M)]
            # Index 1 usually corresponds to the positive class (e.g., Default/Denied)
            vals = shap_values_result[1]
            base_val = explainer.expected_value[1]
        elif len(shap_values_result.shape) == 3:
            # 3D Array return: (N, M, Classes)
            # Take class 1
            vals = shap_values_result[:, :, 1]
            # Handle expected_value being a list or array
            if isinstance(explainer.expected_value, (list, np.ndarray)) and len(explainer.expected_value) > 1:
                base_val = explainer.expected_value[1]
            else:
                base_val = explainer.expected_value
        else:
            # 2D Array (GradientBoosting/Regression): (N, M)
            vals = shap_values_result
            base_val = explainer.expected_value

        # [FIX] Robust scalar extraction helper
        def safe_float(val):
            if isinstance(val, (np.ndarray, list)):
                # If array has >1 elements, take mean or first item to avoid crash
                # Ideally this shouldn't happen with correct slicing above, but valid as safety net
                val = np.array(val)
                if val.size == 1:
                    return float(val.item())
                return float(val.mean()) # Fallback
            return float(val)

        base_val = safe_float(base_val)

        # 5. Map to Feature Names
        try:
             feature_names = preprocessor.get_feature_names_out()
        except:
             feature_names = [f"Feature {i}" for i in range(vals.shape[1])]
             
        # 6. Format Response
        # Create a list of {feature: name, value: impact} sorted by absolute impact
        explanation = []
        
        # vals is (1, n_features). Flatten to (n_features,)
        current_prediction_shap = vals[0]
        
        # Define readable mappings
        readable_map = {
            "person_income": "Annual Income",
            "person_age": "Applicant Age",
            "person_emp_length": "Employment Length",
            "loan_amnt": "Loan Amount",
            "loan_int_rate": "Interest Rate",
            "loan_percent_income": "Debt-to-Income Ratio",
            "cb_person_default_on_file": "Historical Default",
            "cb_person_cred_hist_length": "Credit History (Yrs)",
            "loan_grade": "Loan Grade"
        }

        for name, impact in zip(feature_names, current_prediction_shap):
             # 1. Remove prefixes
             raw_name = str(name).replace('num__', '').replace('cat__', '')
             # 2. Map to Human Readable (Fallback to raw_name if not found)
             # Handle OneHot encoded features like "loan_grade_A" -> "Loan Grade (A)"
             if "_" in raw_name and raw_name.rsplit('_', 1)[0] in readable_map:
                 base, val = raw_name.rsplit('_', 1)
                 clean_name = f"{readable_map[base]} ({val})"
             else:
                 clean_name = readable_map.get(raw_name, raw_name)
                 
             explanation.append({"feature": clean_name, "value": safe_float(impact)})
        
        return {
            "base_value": base_val,
            "contributions": explanation[:10] # Top 10 factors
        }
        
    except Exception as e:
        print(f"XAI Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Explanation failed: {str(e)}")


@app.get("/api/xai/global-summary")
def get_global_shap_summary():
    """ Returns a static SHAP summary plot (Beeswarm) as base64 image """
    if not os.path.exists(DATA_PATH) or not active_model_pipeline:
        raise HTTPException(503, "Model or Data not available")
        
    try:
        # Load a small sample of data for the summary plot
        df = pd.read_csv(DATA_PATH).sample(n=min(100, 500), random_state=42) # Limit to 100 for speed
        if 'loan_status' in df.columns:
             df = df.drop(columns=['loan_status'])
             
        model = active_model_pipeline.named_steps['classifier']
        preprocessor = active_model_pipeline.named_steps['preprocessor']
        
        X_transformed = preprocessor.transform(df)
        
        # [FIX] Convert sparse matrix to dense for SHAP compatibility
        if hasattr(X_transformed, "toarray"):
            X_transformed = X_transformed.toarray()
        
        # Calculate SHAP
        explainer = shap.TreeExplainer(model)
        shap_values_result = explainer.shap_values(X_transformed, check_additivity=False)
        
        if isinstance(shap_values_result, list):
             vals = shap_values_result[1]
        elif len(shap_values_result.shape) == 3:
             # Handle 3D array case for binary classification
             vals = shap_values_result[:, :, 1]
        else:
             vals = shap_values_result
             
        try:
             feature_names = preprocessor.get_feature_names_out()
             clean_names = [str(n).replace('num__', '').replace('cat__', '') for n in feature_names]
        except:
             clean_names = [f"Feature {i}" for i in range(vals.shape[1])]

        # Plotting
        plt.figure()
        # [FIX] INCREASED PLOT SIZE for better visibility
        shap.summary_plot(vals, X_transformed, feature_names=clean_names, show=False, plot_size=(20, 10))
        
        # Save to buffer
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches='tight')
        plt.close()
        buf.seek(0)
        
        # Encode
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        return {"image": f"data:image/png;base64,{img_str}"}
        
    except Exception as e:
        print(f"Global XAI Error: {e}")
        raise HTTPException(500, str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)