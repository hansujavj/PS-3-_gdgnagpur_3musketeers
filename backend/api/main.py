from fastapi import FastAPI
from model.predictor import MandiPredictor

app = FastAPI()

predictor = MandiPredictor()


@app.get("/")
def home():
    return {"message": "Mandi ML API running"}


@app.get("/commodities/")
def get_commodities():
    return {"commodities": predictor.commodities}


@app.get("/predict/")
def predict(date: str, commodity: str):
    price = predictor.predict_price(date, commodity)
    return {"predicted_modal_price": price}


@app.get("/best_sowing/")
def best_sowing(commodity: str, crop_duration: int = 90):
    result = predictor.best_sowing_window(commodity, crop_duration)
    return result