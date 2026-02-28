import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getParkingLots, planTrip, type ParkingLot, type TripPlan } from '../services/api';

const MODE_ICON: Record<string, string> = {
  walk: '🚶',
  bus: '🚌',
  metro: '🚇',
  tram: '🚊',
};

function ParkingCard({ lot }: { lot: ParkingLot }) {
  const { t } = useTranslation();
  const full = lot.available_spots === 0;
  return (
    <View style={[styles.parkingCard, full && styles.parkingFull]}>
      <Text style={styles.parkingName}>{lot.name}</Text>
      <View style={styles.parkingStats}>
        <View style={styles.spotBadge}>
          <Text style={styles.spotNum}>{lot.available_spots}</Text>
          <Text style={styles.spotLabel}>{t('mobility.available')}</Text>
        </View>
        {lot.predicted_availability_1h != null && (
          <View style={[styles.spotBadge, { backgroundColor: '#e8f0fe' }]}>
            <Text style={[styles.spotNum, { color: '#1a73e8' }]}>{lot.predicted_availability_1h}</Text>
            <Text style={styles.spotLabel}>{t('mobility.predicted_1h')}</Text>
          </View>
        )}
      </View>
      <View style={styles.occupancyBar}>
        <View style={[styles.occupancyFill, { width: `${lot.occupancy_pct}%` }]} />
      </View>
      <Text style={styles.occupancyPct}>{lot.occupancy_pct}% occupied</Text>
    </View>
  );
}

export default function MobilityScreen() {
  const { t } = useTranslation();
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loadingParking, setLoadingParking] = useState(true);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [planningTrip, setPlanningTrip] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Simple placeholder coordinates for demo
  const [originLat, setOriginLat] = useState('36.7372');
  const [originLng, setOriginLng] = useState('3.0864');
  const [destLat, setDestLat] = useState('36.7500');
  const [destLng, setDestLng] = useState('3.1000');

  const loadParking = useCallback(async () => {
    try {
      const { data } = await getParkingLots();
      setParkingLots(data);
    } catch {
      // keep existing
    } finally {
      setLoadingParking(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadParking(); }, []);

  const findRoute = async () => {
    setPlanningTrip(true);
    setTripPlan(null);
    try {
      const { data } = await planTrip(
        parseFloat(originLat), parseFloat(originLng),
        parseFloat(destLat), parseFloat(destLng),
      );
      setTripPlan(data);
    } catch {
      // handle
    } finally {
      setPlanningTrip(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadParking(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('mobility.title')}</Text>
      </View>

      {/* Trip planner */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('mobility.plan_trip')}</Text>
        <View style={styles.coordRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.coordLabel}>{t('mobility.origin')} lat</Text>
            <TextInput style={styles.coordInput} value={originLat} onChangeText={setOriginLat} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coordLabel}>{t('mobility.origin')} lng</Text>
            <TextInput style={styles.coordInput} value={originLng} onChangeText={setOriginLng} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.coordRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.coordLabel}>{t('mobility.destination')} lat</Text>
            <TextInput style={styles.coordInput} value={destLat} onChangeText={setDestLat} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coordLabel}>{t('mobility.destination')} lng</Text>
            <TextInput style={styles.coordInput} value={destLng} onChangeText={setDestLng} keyboardType="decimal-pad" />
          </View>
        </View>
        <TouchableOpacity style={styles.routeBtn} onPress={findRoute} disabled={planningTrip}>
          {planningTrip ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.routeBtnText}>
              <Ionicons name="navigate" size={16} /> {t('mobility.search')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Trip result */}
        {tripPlan && (
          <View style={styles.tripCard}>
            <View style={styles.tripSummaryRow}>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatValue}>{tripPlan.total_duration_minutes}</Text>
                <Text style={styles.tripStatLabel}>{t('mobility.mins')}</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={styles.tripStatValue}>{tripPlan.total_distance_km}</Text>
                <Text style={styles.tripStatLabel}>{t('mobility.km')}</Text>
              </View>
              <View style={styles.tripStat}>
                <Text style={[styles.tripStatValue, { color: '#00c853' }]}>{tripPlan.co2_saved_kg}</Text>
                <Text style={styles.tripStatLabel}>kg CO₂ saved</Text>
              </View>
            </View>
            {tripPlan.legs.map((leg, idx) => (
              <View key={idx} style={styles.legRow}>
                <Text style={styles.legIcon}>{MODE_ICON[leg.mode] ?? '🚐'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.legMode}>{leg.mode.toUpperCase()}{leg.route_name ? ` · ${leg.route_name}` : ''}</Text>
                  {leg.from_stop && <Text style={styles.legStops}>{leg.from_stop} → {leg.to_stop}</Text>}
                </View>
                <Text style={styles.legDuration}>{leg.duration_minutes} min</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Parking */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('mobility.parking')}</Text>
        {loadingParking ? (
          <ActivityIndicator color="#1a73e8" />
        ) : (
          parkingLots.map((lot) => <ParkingCard key={lot.id} lot={lot} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#7b1fa2', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  section: { margin: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  coordRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  coordLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  coordInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#333',
    elevation: 1,
  },
  routeBtn: {
    backgroundColor: '#7b1fa2',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  routeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    elevation: 2,
  },
  tripSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tripStat: { alignItems: 'center' },
  tripStatValue: { fontSize: 22, fontWeight: '800', color: '#333' },
  tripStatLabel: { fontSize: 12, color: '#888' },
  legRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
    gap: 10,
  },
  legIcon: { fontSize: 22 },
  legMode: { fontSize: 14, fontWeight: '600', color: '#333' },
  legStops: { fontSize: 12, color: '#888' },
  legDuration: { fontSize: 13, color: '#7b1fa2', fontWeight: '700' },
  parkingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  parkingFull: { opacity: 0.6 },
  parkingName: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6 },
  parkingStats: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  spotBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  spotNum: { fontSize: 20, fontWeight: '800', color: '#00897b' },
  spotLabel: { fontSize: 11, color: '#666' },
  occupancyBar: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3 },
  occupancyFill: { height: 6, backgroundColor: '#7b1fa2', borderRadius: 3 },
  occupancyPct: { fontSize: 12, color: '#888', marginTop: 4 },
});
