import streamlit as st
import requests
from datetime import date

st.title("🌾 Mandi Trend Predictor")

# Fetch commodities using requests
try:
    commodities_response = requests.get("http://127.0.0.1:8000/commodities/")
    if commodities_response.status_code == 200:
        commodities = commodities_response.json()["commodities"]
    else:
        commodities = ["Tomato"] # Fallback
except Exception:
    commodities = ["Tomato"]

selected_commodity = st.selectbox("Select commodity", commodities)
selected_date = st.date_input("Select date")

if st.button("Predict Price"):
    response = requests.get(
        "http://127.0.0.1:8000/predict/",
        params={"date": selected_date.strftime("%Y-%m-%d"), "commodity": selected_commodity}
    )

    if response.status_code == 200:
        data = response.json()
        st.success(f"Predicted Modal Price for {selected_commodity}: ₹{data['predicted_modal_price']}")
    else:
        st.error("API error")