import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { getEnergyDashboard, getParkingLots, type EnergyDashboard, type ParkingLot } from '../services/api';
import { useAppStore } from '../store';

const GRID_STATUS_COLOR: Record<string, string> = {
  normal: '#00c853',
  outage: '#d50000',
  degraded: '#ff6d00',
};

function StatCard({ label, value, unit, icon, color = '#1a73e8' }: {
  label: string; value: number; unit: string; icon: string; color?: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value.toFixed(1)}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function EnergyScreen() {
  const { t } = useTranslation();
  const { userId } = useAppStore();
  const [dashboard, setDashboard] = useState<EnergyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getEnergyDashboard(userId);
      setDashboard(data);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00897b" />
      </View>
    );
  }

  const usageVsAvg = dashboard
    ? ((dashboard.period_kwh / Math.max(dashboard.district_avg_kwh, 1) - 1) * 100).toFixed(0)
    : '0';
  const usagePct = dashboard
    ? Math.min(100, (dashboard.period_kwh / Math.max(dashboard.district_avg_kwh, 1)) * 100)
    : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('energy.title')}</Text>
      </View>

      {dashboard && (
        <>
          {/* Usage bar */}
          <View style={styles.usageCard}>
            <View style={styles.usageLabelRow}>
              <Text style={styles.usageLabel}>{t('energy.your_usage')}</Text>
              <Text style={[styles.usageDiff, { color: parseFloat(usageVsAvg) > 0 ? '#d50000' : '#00c853' }]}>
                {parseFloat(usageVsAvg) > 0 ? `+${usageVsAvg}%` : `${usageVsAvg}%`} vs avg
              </Text>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${usagePct}%` }]} />
            </View>
            <View style={styles.usageNumbers}>
              <Text style={styles.usageMain}>{dashboard.period_kwh.toFixed(1)} kWh</Text>
              <Text style={styles.usageAvg}>{t('energy.district_avg')}: {dashboard.district_avg_kwh.toFixed(1)} kWh</Text>
            </View>
          </View>

          {/* Stat cards */}
          <View style={styles.statsRow}>
            <StatCard
              label={t('energy.solar')}
              value={dashboard.solar_kwh}
              unit="kWh"
              icon="☀️"
              color="#f9a825"
            />
            <StatCard
              label={t('energy.sold')}
              value={dashboard.grid_kwh_sold}
              unit="kWh"
              icon="⚡"
              color="#00897b"
            />
          </View>

          {/* Savings tip */}
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={24} color="#f9a825" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.tipTitle}>{t('energy.tip')}</Text>
              <Text style={styles.tipText}>{dashboard.savings_tip}</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { backgroundColor: '#00897b', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  usageCard: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
  },
  usageLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  usageLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
  usageDiff: { fontSize: 14, fontWeight: '700' },
  progressBg: { height: 10, backgroundColor: '#e8f5e9', borderRadius: 5 },
  progressFill: { height: 10, backgroundColor: '#00897b', borderRadius: 5 },
  usageNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  usageMain: { fontSize: 20, fontWeight: '800', color: '#333' },
  usageAvg: { fontSize: 13, color: '#888', alignSelf: 'flex-end' },
  statsRow: { flexDirection: 'row', marginHorizontal: 12, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderTopWidth: 4,
    alignItems: 'center',
    elevation: 2,
  },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statUnit: { fontSize: 12, color: '#888' },
  statLabel: { fontSize: 12, color: '#555', marginTop: 4, textAlign: 'center' },
  tipCard: {
    backgroundColor: '#fffde7',
    margin: 12,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 1,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: '#f9a825', marginBottom: 4 },
  tipText: { fontSize: 14, color: '#555', lineHeight: 20 },
});
