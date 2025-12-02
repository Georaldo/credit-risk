"use client";
import React, { useEffect, useState } from "react";
import api from "../../../lib/api";

export default function ModelManagementPage() {
  const [models, setModels] = useState<any[]>([]);

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await api.get("/model/list");
        setModels(res.data);
      } catch (err) {
        console.error(err);
      }
    }
    fetchModels();
  }, []);

  return (
    <section className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Model Management</h2>
      <ul className="list-disc list-inside">
        {models.map((m) => (
          <li key={m.name}>
            <strong>{m.name}</strong> - Version: {m.version} - Status: {m.active ? "Active" : "Inactive"}
          </li>
        ))}
      </ul>
    </section>
  );
}
