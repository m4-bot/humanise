# Dengue Risk Spotter: Architecture

> **Status: practice architecture.** Distinguish planned components from components verified to run. The example dataset is synthetic, and model outputs are not clinically validated.

## 1. System overview and data flow

**Target flow:**

```text
Synthetic dengue_sample.csv (30 example rows)
             |
             v
    Data ingestion / validation
             |
             v
   MySQL: dengue_practice.patient_cases
             |                         +--------------------------+
             |                         | Model training (offline) |
             +----> export/features -->| backend/train.py         |
                                       | Random Forest pipeline   |
                                       +------------+-------------+
                                                    |
                                                    v
                                  backend/models/random_forest.joblib
                                                    |
                                                    v
 React input form ---- POST /predict ----> FastAPI inference service
        ^                                           |
        |                                        JSON result
        +-------------------------------------------+

 React Leaflet map <-- GET /cases <--- FastAPI <-- MySQL patient_cases
                                      (or CSV fallback in early practice)
```

**Important implementation detail:** The provided practice training script reads `data/dengue_sample.csv` directly, not MySQL. An example `/cases` route also reads CSV when the MySQL integration is not complete. Therefore, the full `CSV -> MySQL -> model -> API -> map` loop is a **target**, not automatically achieved just because the files exist.

### Data fields

`district`, `area_type`, `age`, `fever_days`, `temperature_c`, `platelet_count`, `wbc_count`, `rainfall_mm`, `lat`, `lng`; practice target `high_risk` (`0` or `1`). Database rows additionally have auto-incremented `id`.

## 2. Main components

| Component | Responsibility | Files / dependencies |
| --- | --- | --- |
| Synthetic data | Practice examples for training and visualization | `data/dengue_sample.csv` |
| MySQL | Structured case storage | `database/schema.sql`, optional loading script |
| Trainer | Preprocess categorical/numeric columns; train Random Forest; save model | `backend/train.py`, pandas, scikit-learn, joblib |
| API | Validate requests; load model; return JSON; provide case positions | `backend/main.py`, FastAPI |
| UI | Display input form, prediction state, map and errors | `frontend/src/App.jsx`, React, Leaflet |

### Training versus prediction

- **Training:** run manually with `python backend/train.py` when the sample data changes. Save a model artifact with joblib.
- **Prediction:** load a trusted saved model; convert validated JSON to the expected feature columns; return `high_risk`, `risk_probability` and `risk_label`.
- **Map:** fetch case coordinates using `GET /cases` and render markers on Leaflet. The map visualizes synthetic cases, not observed outbreaks.

## 3. API design

### GET /

Health response: `{"status":"ok"}`.

### POST /predict

Request has exactly these input keys: `district`, `area_type`, `age`, `fever_days`, `temperature_c`, `platelet_count`, `wbc_count`, `rainfall_mm`, `lat`, `lng`.

Response example (illustrative):

```json
{
  "status": "ok",
  "model_name": "random_forest",
  "high_risk": 1,
  "risk_probability": 0.87,
  "risk_label": "High"
}
```

### GET /cases

Returns `status` and a `cases` array. Each case has `id`, `district`, `lat`, `lng`, `high_risk`.

### Error convention

```json
{"status":"error","message":"age must be a number"}
```

Implement consistent error responses for validation failures, missing data/model files and MySQL connection failures. The example FastAPI route must be tested so that exception handlers, response codes and Pydantic version match the documented behavior.

## 4. Design choices

- **FastAPI:** simple typed endpoints, rapid local iteration, automatic `/docs` test UI.
- **Random Forest:** straightforward baseline for small structured/tabular practice datasets; accepts preprocessed categorical and numeric features.
- **pandas:** easy CSV validation and table transformations.
- **MySQL:** relational records with fixed columns, suitable for a beginner-friendly storage exercise.
- **React/Vite:** separates input/display state from Python inference logic.
- **Leaflet / OpenStreetMap tiles:** lightweight interactive point map; map attribution and network/tile-service conditions must be respected.

These are **development convenience choices**, not evidence of clinical suitability or deployment readiness.

## 5. Efficiency considerations

- Train separately from HTTP requests so `/predict` does not retrain the model each time.
- Load/cached model from a local artifact at application startup where practical, instead of re-reading on every request.
- Limit records returned by `/cases` as data volume grows, and avoid returning sensitive fields to the map.
- Use marker aggregation/clustering and pagination if the dataset eventually becomes large.
- Avoid unnecessary remote inference calls; current model is intended to run locally.

**No measured latency/throughput claims have been made.** Record actual timings before reporting performance.

## 6. Resilience, validation and security

- Reject invalid input types, missing fields, non-finite values, negative counts and geographic coordinates outside valid latitude/longitude ranges.
- Return a consistent JSON error shape with an appropriate HTTP status.
- On missing model: explain that training must be run before inference. Do not silently invent a risk value.
- On missing MySQL connection: return a clear error, or use an **explicitly labeled synthetic CSV fallback** only in practice mode.
- Keep credentials in a local `.env`, and commit only `.env.example` containing placeholders.
- Exclude `.env` and `.venv/` from Git; do not push real patient data.
- Restrict CORS to known frontend origins before public deployment. A wildcard is a local-development convenience, not a production security policy.
- Only deserialize locally generated, trusted joblib model artifacts. Never load untrusted serialized models.
- The frontend should show loading, no data, input error and unavailable-backend states.

## 7. Limitations and responsible use

- The practice dataset is fabricated (about 30 records); it is too small for reliable clinical risk modeling.
- Test accuracy based on a handful of held-out examples is unstable and must not be advertised as real-world model performance.
- A Random Forest score (`risk_probability`) is not necessarily a calibrated disease-risk probability.
- Geographic markers represent synthetic example rows, **not** true dengue prevalence or outbreak forecasts.
- No medical diagnosis, prognosis, intervention or triage decisions should be based on this system.

## 8. Integration and verification plan

1. **Database member:** verify CSV field names; create MySQL schema; import synthetic rows; share environment variable names (not passwords).
2. **Backend member:** install Python dependencies, train the model, implement and test `/`, `/predict`, `/cases`, and provide sample requests/responses.
3. **Frontend member:** scaffold `frontend/` with Vite, install required dependencies, use the agreed JSON contract, render map and error states.
4. **Team:** verify end-to-end flow using **two running terminals**; document whether `/cases` uses MySQL or a CSV fallback.
5. **Team:** complete factual AI-tool disclosure, team names, demo video and external attributions in `README.md`.

## 9. Repository workflow for teammates

- Create separate work branches (for example `practice/tarif-ml` and another member's branch).
- Commit and push small tested changes to your own branch.
- Open pull requests into the shared `main` branch after reviewing the changed files.
- Pull the latest `main` before merging new changes; resolve conflicts carefully and never force-push shared `main`.
- A fork and the original repository are different repositories. Updates in a fork do not automatically appear in the original; they require a pull request or another deliberate sync.

## 10. Submission note

This document was prepared from the team's practice brief and requested checklist, **not from an independently verified official hackathon rulebook**. Review the official rules for mandatory file names, AI disclosure, demo requirements and any restrictions before an actual submission.
