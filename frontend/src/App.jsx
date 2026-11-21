import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [cases, setCases] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    district: "Dhaka",
    area_type: "urban",
    age: 24,
    fever_days: 5,
    temperature_c: 38.9,
    platelet_count: 62000,
    wbc_count: 2800,
    rainfall_mm: 310,
    lat: 23.7806,
    lng: 90.4193,
  });

  useEffect(() => {
    fetch(`${API_BASE}/cases`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok") setCases(data.cases || []);
      })
      .catch(() => setErrorMsg("Could not load /cases from backend."));
  }, []);

  function handleChange(e) {
    const { name, value, type } = e.target;
    const numericFields = [
      "age",
      "fever_days",
      "temperature_c",
      "platelet_count",
      "wbc_count",
      "rainfall_mm",
      "lat",
      "lng",
    ];
    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setResult(data);
      } else {
        setErrorMsg(data.message || "Prediction failed.");
      }
    } catch {
      setErrorMsg("Backend unreachable. Is uvicorn running?");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">
        Dengue Risk Spotter — Bangladesh
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-5 rounded-xl shadow space-y-3"
        >
          <h2 className="font-semibold text-lg">Patient & Area Inputs</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(form).map(([key, val]) => (
              <label key={key} className="flex flex-col">
                <span className="text-slate-600 mb-1">{key}</span>
                <input
                  name={key}
                  value={val}
                  onChange={handleChange}
                  className="border rounded px-2 py-1"
                />
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700"
          >
            Predict Risk
          </button>

          {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}
          {result && (
            <div className="p-3 rounded bg-slate-50 border text-sm">
              <p>
                <strong>Risk:</strong> {result.risk_label} ({result.high_risk})
              </p>
              <p>
                <strong>Probability:</strong> {result.risk_probability}
              </p>
              <p>
                <strong>Model:</strong> {result.model_name}
              </p>
            </div>
          )}
        </form>

        <div className="bg-white p-3 rounded-xl shadow h-[460px]">
          <MapContainer
            center={[23.7, 90.4]}
            zoom={7}
            className="h-full w-full rounded-lg"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {cases.map((c) => (
              <CircleMarker
                key={c.id}
                center={[c.lat, c.lng]}
                radius={7}
                pathOptions={{
                  color: c.high_risk === 1 ? "#dc2626" : "#16a34a",
                }}
              >
                <Popup>
                  <strong>{c.district}</strong> —{" "}
                  {c.high_risk === 1 ? "High Risk" : "Low Risk"}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}