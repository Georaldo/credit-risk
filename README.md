# Smart Credit Risk Prediction Application

A modern, full-stack credit risk prediction and analysis system powered by a **FastAPI backend** and a **React + Vite + TailwindCSS frontend**. The system leverages Machine Learning models (Random Forest) for credit risk assessment, provides explainable AI (SHAP), and integrates Google Gemini API for strategic insights.

---

## 🏗️ Project Architecture

- **Backend**: Python (FastAPI, Uvicorn, scikit-learn, joblib, cx_Oracle)
- **Frontend**: React, Vite, TailwindCSS, Recharts, Lucide Icons
- **Database**: Oracle Database Express Edition (XE)

---

## 📋 Prerequisites

Before running the application, make sure you have the following installed on your machine:

1. **Python 3.9+**
2. **Node.js** (v18 or higher) & **npm**
3. **Oracle Database XE** (Express Edition) installed and running locally or accessible remotely.
4. **Oracle Instant Client**:
   - Required by `cx_Oracle` to establish database connections.
   - Download the Instant Client for your OS (e.g., 64-bit Windows) and add its folder to your system environment `PATH` variable.

---

## ⚙️ Environment Configuration

Create or edit the `.env` file at the root directory of the workspace and add your Gemini API Key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> [!NOTE]
> Replace `your_actual_gemini_api_key_here` with your own valid Google Gemini API Key.

---

## 🗄️ Database Setup

1. **Table Initialization**:
   - The backend automatically initializes the required tables (`APPLICANTS`, `LOAN_REQUESTS`, and `PREDICTION_RESULTS`), sequences, and triggers on startup if a connection is established.

2. **Verify Database Connection**:
   You can verify your connection to Oracle Database XE by running the test script from the root folder:
   ```bash
   python test_oracle_connection.py
   ```
   If successful, you will see `Connection successful!` and `Oracle connection working!`.

3. **Local CSV Fallback Database**:
   - **Important Note**: If Oracle Database XE is not running or the connection fails, the application is designed to gracefully fallback to using the local CSV file (`credit_risk_dataset.csv`) as its database. This ensures the prediction and analysis logic remains operational even without an active Oracle connection.

---

## 🚀 Running the Application

### Option A: Running via the Automated Startup Script (Recommended)

An automation script (`run_project.ps1`) is provided to launch both the backend and frontend client automatically in separate Windows PowerShell windows:

1. Open Windows PowerShell in the project directory.
2. Run the script:
   ```powershell
   .\run_project.ps1
   ```
   - The script automatically attempts to activate the Conda environment (`oracle_api_env`), starts the FastAPI backend at [http://localhost:8000](http://localhost:8000), installs React dependencies, and starts the Vite frontend at [http://localhost:5173](http://localhost:5173).

---

### Option B: Troubleshooting & Manual Execution

#### 1. Start the Backend (FastAPI)

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate your Python environment (e.g., Conda environment `oracle_api_env`):
   ```bash
   conda activate oracle_api_env
   ```
3. Install the required Python packages if not already installed:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server by running `main.py` directly (or via `uvicorn`):
   ```bash
   python main.py
   ```
   *Alternative:*
   ```bash
   uvicorn main:app --reload
   ```
   - The backend server will run on [http://localhost:8000](http://localhost:8000).

#### 2. Start the Frontend (React + Vite)

1. Open a new terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the required Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - The frontend server will start (typically on [http://localhost:5173](http://localhost:5173)).

---

## 📄 License

This work is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](LICENSE).
