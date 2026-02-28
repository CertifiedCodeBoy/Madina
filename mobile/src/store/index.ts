import { create } from 'zustand';
import type { AQIReading, TransitVehicle, RoadDisruption, EnergyDashboard, ParkingLot } from '../services/api';

interface AppState {
  // Transit
  vehicles: TransitVehicle[];
  aqiReadings: AQIReading[];
  disruptions: RoadDisruption[];
  setVehicles: (v: TransitVehicle[]) => void;
  setAQI: (a: AQIReading[]) => void;
  setDisruptions: (d: RoadDisruption[]) => void;

  // Energy
  energyDashboard: EnergyDashboard | null;
  parkingLots: ParkingLot[];
  setEnergyDashboard: (e: EnergyDashboard) => void;
  setParkingLots: (p: ParkingLot[]) => void;

  // Settings
  userId: string;
  language: 'en' | 'ar' | 'fr';
  setLanguage: (l: 'en' | 'ar' | 'fr') => void;

  // Assistant session
  sessionId: string;
  setSessionId: (s: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  vehicles: [],
  aqiReadings: [],
  disruptions: [],
  setVehicles: (vehicles) => set({ vehicles }),
  setAQI: (aqiReadings) => set({ aqiReadings }),
  setDisruptions: (disruptions) => set({ disruptions }),

  energyDashboard: null,
  parkingLots: [],
  setEnergyDashboard: (energyDashboard) => set({ energyDashboard }),
  setParkingLots: (parkingLots) => set({ parkingLots }),

  userId: 'citizen_001',
  language: 'en',
  setLanguage: (language) => set({ language }),

  sessionId: '',
  setSessionId: (sessionId) => set({ sessionId }),
}));
