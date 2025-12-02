// app/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import SHAPModal from "../components/SHAPModel";
import FeatureForm from "../components/FeatureForm";
import api from "../lib/api";
import { useAuth } from "../lib/auth";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [detectResult, setDetectResult] = useState<any | null>(null);
  const [trainingResult, setTrainingResult] = useState<any | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [predictResult, setPredictResult] = useState<any | null>(null);
  const [shapOpen, setShapOpen] = useState(false);
  const [shapFeatures, setShapFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Redirect to login if not logged in
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Redirect to role-based dashboard if not customer
  useEffect(() => {
    if (!user) return;
    if (user.role === "manager") router.push("/manager");
    if (user.role === "officer") router.push("/officer");
    // customer can stay on this page (HomePage)
  }, [user, router]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setDetectResult(null);
    setTrainingResult(null);
    setModels([]);
    setPredictResult(null);
  }

  async function autoDetect() {
    if (!file) return alert("Upload CSV first");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/model/auto-detect", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const analysis = res.data.analysis ?? res.data;
      const parsed = typeof analysis === "string" ? JSON.parse(analysis) : analysis;
      setDetectResult(parsed);
      const init: Record<string, any> = {};
      (parsed.features || []).forEach((f: string) => (init[f] = ""));
      setFormValues(init);
    } catch (err: any) {
      console.error(err);
      alert("Auto-detect failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function train() {
    if (!file) return alert("Upload CSV first");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (detectResult) {
        fd.append(
          "payload",
          JSON.stringify({ features: detectResult.features, target: detectResult.target })
        );
      }
      const res = await api.post("/model/train-auto", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTrainingResult(res.data);
      const modelKeys = Object.keys(res.data.results || {});
      setModels(modelKeys);
      setSelectedModel(modelKeys[0] ?? "");
      alert("Training completed");
    } catch (err: any) {
      console.error(err);
      alert("Training failed: " + (err?.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function predict() {
    if (!selectedModel) return alert("Choose a model");
    try {
      const payload = { model_name: selectedModel, ...formValues };
      const res = await api.post("/model/predict", payload);
      setPredictResult(res.data);
    } catch (err: any) {
      console.error(err);
      alert("Predict failed: " + (err?.response?.data?.detail || err.message));
    }
  }

  async function explain() {
    if (!selectedModel) return alert("Choose a model");
    try {
      const payload = { model_name: selectedModel, ...formValues };
      const res = await api.post("/model/explain", payload);
      const top = res.data.top_features ?? [];
      setShapFeatures(top);
      setShapOpen(true);
    } catch (err: any) {
      console.error(err);
      alert("Explain failed: " + (err?.response?.data?.detail || err.message));
    }
  }

  // Render nothing if not logged in yet
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <section className="mb-6 p-6 bg-white rounded shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Model Management</h2>
                  <p className="text-slate-500">
                    Upload dataset, detect features, train models and serve predictions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <input type="file" accept=".csv" onChange={handleFile} className="hidden" id="csvFile" />
                  <label htmlFor="csvFile" className="px-4 py-2 bg-slate-100 rounded cursor-pointer">
                    Choose CSV
                  </label>
                  <button
                    onClick={autoDetect}
                    className="px-4 py-2 bg-indigo-600 text-white rounded"
                    disabled={!file || loading}
                  >
                    {loading ? "Processing..." : "Auto-detect"}
                  </button>
                  <button
                    onClick={train}
                    className="px-4 py-2 bg-green-600 text-white rounded"
                    disabled={!file || loading}
                  >
                    Train
                  </button>
                </div>
              </div>

              {detectResult && (
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded">
                    <h4 className="font-semibold">Target</h4>
                    <div className="mt-2 text-lg">{detectResult.target}</div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded col-span-2">
                    <h4 className="font-semibold mb-2">Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {detectResult.features.map((f: string) => (
                        <div key={f} className="px-3 py-1 bg-white border rounded text-sm">
                          {f}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="mb-6 p-6 bg-white rounded shadow">
              <h3 className="text-lg font-semibold mb-3">Prediction</h3>

              <div className="mb-4">
                <label className="block text-sm text-slate-600">Select Model</label>
                <select
                  className="border p-2 rounded w-64"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <option value="">-- choose model --</option>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {detectResult ? (
                <>
                  <FeatureForm
                    features={detectResult.features}
                    values={formValues}
                    onChange={(k, v) => setFormValues((s) => ({ ...s, [k]: v }))}
                  />

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={predict}
                      className="px-4 py-2 bg-indigo-600 text-white rounded"
                    >
                      Predict
                    </button>
                    <button
                      onClick={explain}
                      className="px-4 py-2 bg-purple-600 text-white rounded"
                    >
                      Explain (SHAP)
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500">Run auto-detect to create a prediction form.</div>
              )}

              {predictResult && (
                <div className="mt-4 p-3 bg-slate-50 rounded">
                  <div>
                    <strong>Prediction:</strong>{" "}
                    {predictResult.prediction === 1 ? (
                      <span className="text-red-600">High Risk</span>
                    ) : (
                      <span className="text-green-600">Low Risk</span>
                    )}
                  </div>
                  <div>
                    <strong>Probability:</strong>{" "}
                    {Array.isArray(predictResult.probability)
                      ? predictResult.probability[1] ?? predictResult.probability[0]
                      : predictResult.probability}
                  </div>
                </div>
              )}
            </section>

            <section className="p-6 bg-white rounded shadow">
              <h3 className="text-lg font-semibold mb-3">Training Results</h3>
              {!trainingResult ? (
                <div className="text-sm text-slate-500">No training run yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(trainingResult.results || {}).map(([k, v]: any) => (
                    <div key={k} className="p-4 bg-slate-50 rounded">
                      <h4 className="font-semibold">{k}</h4>
                      <div className="text-sm">
                        F1: <strong>{Number(v.f1_score).toFixed(3)}</strong>
                      </div>
                      <div className="text-sm">
                        AUC: <strong>{v.auc_score ?? "N/A"}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <SHAPModal open={shapOpen} onClose={() => setShapOpen(false)} features={shapFeatures} />
    </div>
  );
}
