import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getVehicles, getAQI, getDisruptions } from '../services/api';
import { useAppStore } from '../store';

const AQI_COLOR = (aqi: number) => {
  if (aqi <= 50) return '#00c853';
  if (aqi <= 100) return '#ffd600';
  if (aqi <= 150) return '#ff6d00';
  return '#d50000';
};

const VEHICLE_ICON: Record<string, string> = {
  bus: '🚌',
  metro: '🚇',
  tram: '🚊',
};

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { vehicles, aqiReadings, disruptions, setVehicles, setAQI, setDisruptions } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [v, a, d] = await Promise.all([
        getVehicles(),
        getAQI(),
        getDisruptions(),
      ]);
      setVehicles(v.data);
      setAQI(a.data);
      setDisruptions(d.data);
    } catch {
      // handle silently — stale data still shown
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a73e8" />
        <Text style={styles.loadingText}>{t('dashboard.loading')}</Text>
      </View>
    );
  }

  const topAQI = aqiReadings[0];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('dashboard.title')}</Text>
        <Text style={styles.headerSubtitle}>{t('dashboard.subtitle')}</Text>
      </View>

      {/* AQI Banner */}
      {topAQI && (
        <View style={[styles.aqiBanner, { backgroundColor: AQI_COLOR(topAQI.aqi) }]}>
          <Ionicons name="leaf-outline" size={24} color="#fff" />
          <View style={styles.aqiText}>
            <Text style={styles.aqiLabel}>{t('dashboard.aqi')} — {topAQI.district}</Text>
            <Text style={styles.aqiValue}>AQI {topAQI.aqi}</Text>
            <Text style={styles.aqiRec}>{topAQI.health_recommendation}</Text>
          </View>
        </View>
      )}

      {/* Live Map */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.transit')}</Text>
        <MapView
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: 36.7372,
            longitude: 3.0864,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }}
        >
          {vehicles.map((v) => (
            <Marker
              key={v.vehicle_id}
              coordinate={{ latitude: v.latitude, longitude: v.longitude }}
              title={`${v.route_name ?? v.route_id} · ${v.delay_minutes?.toFixed(0) ?? 0} min delay`}
              description={`Occupancy: ${v.occupancy_pct?.toFixed(0) ?? '?'}%`}
            >
              <Text style={{ fontSize: 20 }}>{VEHICLE_ICON[v.vehicle_type] ?? '🚐'}</Text>
            </Marker>
          ))}
        </MapView>
      </View>

      {/* AQI by district */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.aqi')}</Text>
        <FlatList
          horizontal
          data={aqiReadings.slice(0, 6)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.aqiCard, { borderLeftColor: AQI_COLOR(item.aqi) }]}>
              <Text style={styles.aqiCardDistrict}>{item.district}</Text>
              <Text style={[styles.aqiCardValue, { color: AQI_COLOR(item.aqi) }]}>{item.aqi}</Text>
            </View>
          )}
        />
      </View>

      {/* Road Disruptions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.disruptions')}</Text>
        {disruptions.length === 0 ? (
          <Text style={styles.emptyText}>✅ No active disruptions</Text>
        ) : (
          disruptions.slice(0, 5).map((d) => (
            <View key={d.id} style={styles.disruptionCard}>
              <Ionicons
                name={d.severity === 'critical' ? 'warning' : 'alert-circle-outline'}
                size={18}
                color={d.severity === 'critical' ? '#d50000' : '#ff6d00'}
              />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.disruptionTitle}>{d.title}</Text>
                <Text style={styles.disruptionType}>{d.disruption_type}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: '#666' },
  header: { backgroundColor: '#1a73e8', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#c8dfff', marginTop: 2 },
  aqiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 12,
    borderRadius: 12,
  },
  aqiText: { marginLeft: 12, flex: 1 },
  aqiLabel: { color: '#fff', fontSize: 13, opacity: 0.9 },
  aqiValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  aqiRec: { color: '#fff', fontSize: 12, opacity: 0.9, marginTop: 2 },
  section: { margin: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 10 },
  map: { height: 220, borderRadius: 12, overflow: 'hidden' },
  aqiCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderLeftWidth: 4,
    padding: 12,
    marginRight: 10,
    minWidth: 100,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  aqiCardDistrict: { fontSize: 12, color: '#666' },
  aqiCardValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  disruptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
  },
  disruptionTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
  disruptionType: { fontSize: 12, color: '#888', textTransform: 'capitalize' },
  emptyText: { color: '#00c853', fontWeight: '600' },
});
