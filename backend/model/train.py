import pandas as pd
import numpy as np
import lightgbm as lgb
import joblib

# Load data
df = pd.read_csv("../data/mandi.csv")

# Clean date
df["Date"] = pd.to_datetime(df["Arrival_Date"], dayfirst=True)
df["Commodity"] = df["Commodity"].astype("category")

# Feature engineering
df["month"] = df["Date"].dt.month
df["week"] = df["Date"].dt.isocalendar().week
df["year"] = df["Date"].dt.year

# Encode seasonality
df["month_sin"] = np.sin(2 * np.pi * df["month"]/12)
df["month_cos"] = np.cos(2 * np.pi * df["month"]/12)

# Target
y = df["Modal_x0020_Price"]

# Features
X = df[[
    "Commodity", "month", "week", "year",
    "month_sin", "month_cos"
]]

# Train model
model = lgb.LGBMRegressor(
    n_estimators=300,
    learning_rate=0.05
)

model.fit(X, y)

joblib.dump(model, "model.pkl")
joblib.dump(list(df["Commodity"].cat.categories), "commodities.pkl")

print("Model saved!")