# ML Service (model.pkl integration)

This small Python service exposes your `model.pkl` via HTTP so the Node.js backend can call it.

## Setup

1. Make sure you have Python 3.10+ installed.
2. From the `ml_service` folder:

```bash
pip install -r requirements.txt
```

3. Place your trained `model.pkl` file inside this `ml_service` folder (next to `app.py`).

## Run the service

From the `ml_service` directory:

```bash
uvicorn app:app --host 0.0.0.0 --port 9000
```

The prediction endpoint will be available at:

- `POST http://127.0.0.1:9000/predict`

Body example:

```json
{
  "heartRate": 85,
  "temperature": 98.6,
  "spo2": 97
}
```

Response example:

```json
{
  "riskLevel": "High",
  "confidence": 92.5
}
```

Your Node.js backend calls this endpoint from `/api/patient/:id/prediction`.

