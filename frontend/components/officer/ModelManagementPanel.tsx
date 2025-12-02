"use client";
import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { useToasts } from "../../components/Toast";

interface Model {
  model_name: string;
  version: string;
  active: boolean;
}

export default function ModelManagementPanel() {
  const { pushToast } = useToasts();
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  async function fetchModels() {
    setLoading(true);
    try {
      const res = await api.get("/model/list");
      setModels(res.data);
    } catch (err) {
      console.error(err);
      pushToast({ type: "error", message: "Failed to fetch models." });
    } finally {
      setLoading(false);
    }
  }

  async function activateModel(modelName: string) {
    try {
      await api.post("/model/activate", { model_name: modelName });
      pushToast({ type: "success", message: `Model "${modelName}" activated.` });
      fetchModels();
    } catch (err) {
      console.error(err);
      pushToast({ type: "error", message: `Failed to activate "${modelName}".` });
    }
  }

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Model Management</h2>
      {loading ? (
        <p>Loading models...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {models.map((m) => (
            <div key={m.model_name} className="flex justify-between items-center p-2 border rounded">
              <span>
                {m.model_name} (v{m.version}) {m.active && <strong className="text-green-600">[Active]</strong>}
              </span>
              {!m.active && (
                <button
                  className="px-2 py-1 bg-indigo-600 text-white rounded"
                  onClick={() => activateModel(m.model_name)}
                >
                  Activate
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
