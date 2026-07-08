# 🌾 AgriChain - AI Powered Smart Agriculture Platform

AgriChain is an intelligent agriculture platform designed to help farmers improve crop productivity through AI, IoT, and data-driven insights. The platform combines crop disease detection, smart soil monitoring, automated irrigation, and market intelligence into a single mobile application, enabling farmers to make informed decisions at every stage of cultivation.

---

## 🚀 Features

### 🌱 Crop Clinic
- AI-powered crop disease detection from plant images
- Automatic crop health report generation
- Disease severity analysis
- Treatment recommendations
- Suggested pesticides
- Crop history management

#### ScreenShots
<img width="373" height="800" alt="image" src="https://github.com/user-attachments/assets/f9627305-dd0b-4e2d-bf34-563398df7b27" />
<img width="373" height="800" alt="image" src="https://github.com/user-attachments/assets/b54d3105-e603-45dd-9456-14b9c11b1b4f" />


### 🌿 Soil Health & Smart Irrigation
- Real-time soil moisture monitoring
- Temperature and humidity monitoring
- Soil health analysis
- Automated irrigation recommendations
- Smart irrigation control
- Live sensor monitoring

#### ScreenShots
<img width="373" height="800" alt="image" src="https://github.com/user-attachments/assets/7b1a653b-79b6-4a6e-95f9-cccf73340424" />
<img width="373" height="800" alt="image" src="https://github.com/user-attachments/assets/fcbd1a97-bca1-4b3e-843a-1648c69c5d0e" />


### 📈 Market Insights
- Live crop market prices
- Historical market trends
- Future crop price prediction
- Best selling time recommendations
- Market comparison across regions

#### ScreenShots
<img width="373" height="800" alt="image" src="https://github.com/user-attachments/assets/4cf5c933-83aa-4797-b163-0b6becf43d8b" />


### 🌾 My Crops Dashboard
- Crop lifecycle tracking
- Harvest window prediction
- Crop health monitoring
- Irrigation status
- Personalized farming insights

#### ScreenShots
<img width="373" height="800" alt="image" src="https://github.com/user-attachments/assets/41cfa09d-24a5-47c0-aa5f-0617b17e2b8f" />

---

# 🏗️ System Architecture

```
Farmer
   │
   ▼
React Native (Expo)
   │
   ▼
FastAPI Backend
   │
   ├───────────────┐
   │               │
   ▼               ▼
Crop Clinic     Soil Monitoring
   │               │
   ▼               ▼
AI Engine      IoT Sensors
   │               │
   └──────┬────────┘
          ▼
     Supabase Database
          │
          ▼
     AgriChain Dashboard
```

---

# 📱 Technology Stack

## Frontend
- React Native (Expo)
- TypeScript
- React Navigation

## Backend
- Python
- FastAPI

## AI & Computer Vision
- YOLOv8
- EfficientNet-B4
- OpenCV
- Scikit-learn

## Database
- Supabase

## IoT
- ESP32
- Soil Moisture Sensor
- Soil Temperature Sensor
- Temperature & Humidity Sensor
- Relay Module

## APIs
- Google Maps Platform
- Agricultural Market Data APIs

---

# 🔍 Crop Clinic Workflow

```
Leaf Image
     │
     ▼
Image Preprocessing
     │
     ▼
YOLOv8
(Leaf Detection)
     │
     ▼
EfficientNet-B4
(Disease Classification)
     │
     ▼
Treatment Recommendation
     │
     ▼
Crop Health Report
```

---

# 🌱 Soil Health Workflow

```
Sensor Nodes
     │
     ▼
ESP32 Controller
     │
     ▼
Soil Health Analysis
     │
     ▼
Irrigation Decision
     │
     ▼
Relay Module
     │
     ▼
Water Pump
```

---

# 📈 Market Insights Workflow

```
Market Data
     │
     ▼
Price Analysis
     │
     ▼
Trend Prediction
     │
     ▼
Best Selling Recommendation
```

---

# 🎯 Objectives

- Improve crop productivity
- Detect diseases at an early stage
- Optimize water usage
- Enable smart irrigation
- Provide accurate market insights
- Increase farmers' profitability
- Support sustainable farming practices

---

# 👥 Team

**Team Name:** 3 Musketeers

- Jheel Pashine
- Ojas Dhapse
- Hansuja Jambhale
