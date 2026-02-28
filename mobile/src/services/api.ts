import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface TransitVehicle {
  id: string;
  vehicle_id: string;
  route_id: string;
  route_name: string | null;
  vehicle_type: 'bus' | 'metro' | 'tram';
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  occupancy_pct: number | null;
  delay_minutes: number | null;
}

export interface AQIReading {
  id: string;
  district: string;
  aqi: number;
  pm25: number | null;
  health_recommendation: string | null;
  recorded_at: string;
}

export interface RoadDisruption {
  id: string;
  title: string;
  disruption_type: string;
  start_lat: number;
  start_lng: number;
  severity: string;
  active: boolean;
}

export interface ParkingLot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  total_spots: number;
  available_spots: number;
  occupancy_pct: number;
  predicted_availability_1h: number | null;
}

export interface EnergyDashboard {
  user_id: string;
  period_kwh: number;
  district_avg_kwh: number;
  savings_tip: string;
  solar_kwh: number;
  grid_kwh_sold: number;
}

export interface Issue {
  id: string;
  category: string;
  severity: string;
  status: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
  department: string | null;
  estimated_resolution_days: number | null;
  ai_confidence: number | null;
  created_at: string;
}

export interface AssistantResponse {
  reply: string;
  language: string;
  session_id: string;
  suggested_actions: string[];
}

export interface TripPlan {
  total_duration_minutes: number;
  total_distance_km: number;
  co2_saved_kg: number;
  legs: Array<{
    mode: string;
    route_name: string | null;
    from_stop: string | null;
    to_stop: string | null;
    duration_minutes: number;
    distance_km: number;
  }>;
}

// ── Transit ──────────────────────────────────────────────────────────────────

export const getVehicles = (vehicleType?: string) =>
  api.get<TransitVehicle[]>('/transit/vehicles', { params: { vehicle_type: vehicleType } });

export const getAQI = (district?: string) =>
  api.get<AQIReading[]>('/transit/aqi', { params: { district } });

export const getDisruptions = () =>
  api.get<RoadDisruption[]>('/transit/disruptions');

export const planTrip = (originLat: number, originLng: number, destLat: number, destLng: number) =>
  api.post<TripPlan>('/transit/trip-plan', {
    origin_lat: originLat, origin_lng: originLng,
    dest_lat: destLat, dest_lng: destLng,
  });

// ── Issues ───────────────────────────────────────────────────────────────────

export const getIssues = (status?: string) =>
  api.get<Issue[]>('/issues/', { params: { status } });

export const reportIssue = (formData: FormData) =>
  api.post<Issue>('/issues/report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ── Energy ───────────────────────────────────────────────────────────────────

export const getEnergyDashboard = (userId: string) =>
  api.get<EnergyDashboard>(`/energy/dashboard/${userId}`);

export const getParkingLots = (district?: string) =>
  api.get<ParkingLot[]>('/energy/parking', { params: { district } });

// ── Assistant ────────────────────────────────────────────────────────────────

export const sendMessage = (message: string, language: string, sessionId: string) =>
  api.post<AssistantResponse>('/assistant/chat', { message, language, session_id: sessionId });
