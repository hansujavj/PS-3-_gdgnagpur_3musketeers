import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from functools import lru_cache


MODEL_PATH = "model/model.pkl"
COMMODITIES_PATH = "model/commodities.pkl"


class MandiPredictor:

    def __init__(self):
        self.model = self._load_model()
        self.commodities = self._load_commodities()

    @staticmethod
    @lru_cache()
    def _load_model():
        return joblib.load(MODEL_PATH)

    @staticmethod
    @lru_cache()
    def _load_commodities():
        return joblib.load(COMMODITIES_PATH)

    def _create_features(self, dt: datetime, commodity: str):
        month = dt.month
        week = dt.isocalendar()[1]
        year = dt.year

        month_sin = np.sin(2 * np.pi * month / 12)
        month_cos = np.cos(2 * np.pi * month / 12)

        df = pd.DataFrame({
            "Commodity": [commodity],
            "month": [month],
            "week": [week],
            "year": [year],
            "month_sin": [month_sin],
            "month_cos": [month_cos]
        })
        df["Commodity"] = pd.Categorical(df["Commodity"], categories=self.commodities)
        return df

    def predict_price(self, date: str, commodity: str):
        dt = datetime.strptime(date, "%Y-%m-%d")
        features = self._create_features(dt, commodity)

        prediction = self.model.predict(features)[0]
        return round(float(prediction), 2)

    def predict_range(self, start_date: str, commodity: str, days: int = 365):
        start = datetime.strptime(start_date, "%Y-%m-%d")

        future_dates = [
            start + timedelta(days=i)
            for i in range(days)
        ]

        predictions = []

        for dt in future_dates:
            features = self._create_features(dt, commodity)
            price = self.model.predict(features)[0]

            predictions.append({
                "date": dt.strftime("%Y-%m-%d"),
                "predicted_price": round(float(price), 2)
            })

        return predictions

    def best_sowing_window(self, commodity: str, crop_duration_days: int = 90):
        today = datetime.today()

        predictions = self.predict_range(
            start_date=today.strftime("%Y-%m-%d"),
            commodity=commodity,
            days=365
        )

        prices = [p["predicted_price"] for p in predictions]
        max_index = np.argmax(prices)

        harvest_date = datetime.strptime(
            predictions[max_index]["date"],
            "%Y-%m-%d"
        )

        sowing_date = harvest_date - timedelta(days=crop_duration_days)

        return {
            "commodity": commodity,
            "best_sowing_date": sowing_date.strftime("%Y-%m-%d"),
            "expected_harvest_date": harvest_date.strftime("%Y-%m-%d"),
            "expected_peak_price": predictions[max_index]["predicted_price"]
        }