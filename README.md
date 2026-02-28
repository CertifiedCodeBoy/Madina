# 📱 Madina — AI-Powered Smart City Citizen Services Platform

![Stack](https://img.shields.io/badge/Stack-React%20Native%20%7C%20FastAPI%20%7C%20AI-blue) ![Status](https://img.shields.io/badge/Status-Completed-green)

## 📌 Overview

**Madina** (مدينة) is a unified citizen-facing mobile + web platform that consolidates all smart city services into a single, AI-enhanced interface. Citizens can report infrastructure issues, access real-time transit data, receive personalized AQI alerts, pay city fees, and interact with an AI assistant for municipal services — all from one app.

The platform acts as the **human interface layer** of the smart city, turning backend data intelligence into actionable, accessible citizen experiences.

---

## 🎯 Problem Statement

Smart city infrastructure investments fail to deliver their full value when citizens cannot easily interact with city services. Common barriers include:

- Fragmented apps for different services (transit, utilities, reporting)
- Long queues for administrative tasks that could be digital
- Citizens unaware of real-time conditions (traffic, air quality, outages)
- No feedback loop between citizens and city operations

**Madina** closes this gap with a single, intuitive platform.

---

## ✨ Core Modules

### 🗺️ 1. Live City Dashboard
- Real-time public transit positions (bus/metro/tram)
- AQI levels by district with health recommendations
- Planned and unplanned road disruptions
- Public facility status (parks, hospitals, parking availability)

### 📸 2. Issue Reporting with AI Triage
Citizens photograph infrastructure problems (potholes, broken lights, illegal dumping). An **image classification model** (MobileNetV3) automatically:
- Categorizes the issue type
- Estimates severity
- Routes to the correct municipal department
- Provides expected resolution time based on queue depth

### 🤖 3. AI Municipal Assistant (Arabic + French + English)
A fine-tuned conversational AI that handles:
- Administrative procedure guidance ("How do I renew my residency papers?")
- Document requirement lookup
- Appointment booking for city offices
- Utility bill queries

### ⚡ 4. Smart Energy Dashboard (for residential users)
- Personal energy consumption vs. neighborhood average
- Personalized tips to reduce bills
- Real-time grid status and outage alerts
- Option to sell excess solar back to grid (when applicable)

### 🚌 5. Smart Mobility
- Multimodal trip planner (walk + bus + metro)
- Real-time crowding levels per vehicle
- Parking slot availability (ML-predicted based on time/day)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│     React Native App (iOS & Android)     │
│     React Web App (Desktop Portal)       │
└──────────────────┬──────────────────────┘
                   │ REST + WebSocket
┌──────────────────▼──────────────────────┐
│          FastAPI Backend                 │
│  Auth | Notifications | Services Router  │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌───────────────┐   ┌──────────────────┐
│  City Data    │   │   AI Services    │
│  Aggregator   │   │  Image Classify  │
│  (all IoT     │   │  NLP Assistant   │
│   streams)    │   │  Demand Predict  │
└───────────────┘   └──────────────────┘
```

---

## 🤖 ML Components

| Feature | Model | Accuracy |
|---------|-------|----------|
| Issue photo classification | MobileNetV3 (transfer learning) | 91.3% |
| Parking availability prediction | Random Forest | 87.6% |
| Transit delay prediction | Gradient Boosting | 89.1% |
| Personalized AQI health alerts | Rule-based + user profile ML | — |

---

## 🛠️ Tech Stack

- **Mobile:** React Native (Expo)
- **Web:** React + Tailwind CSS
- **Backend:** FastAPI (Python)
- **AI Services:** TensorFlow Lite (mobile), Hugging Face (NLP)
- **Database:** PostgreSQL + PostGIS, Redis (cache)
- **Notifications:** Firebase Cloud Messaging
- **Maps:** Mapbox GL JS

---

## 🚀 Getting Started

```bash
git clone https://github.com/yourusername/madina-smart-city-app
cd madina-smart-city-app

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Mobile App
cd mobile
npm install
npx expo start

# Web App
cd web
npm install && npm start
```

---

## 🌍 Localization

Full support for:
- 🇩🇿 Arabic (Darija + MSA)
- 🇫🇷 French
- 🇬🇧 English

---

## 📄 License

MIT License © 2026
