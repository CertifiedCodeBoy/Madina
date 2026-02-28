import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { Wind, AlertTriangle, MapPin, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { getVehicles, getAQI, getDisruptions, type AQIReading, type TransitVehicle, type RoadDisruption } from '../services/api';

const AQI_COLOR = (aqi: number) =>
  aqi <= 50 ? 'bg-green-100 text-green-700 border-green-300'
  : aqi <= 100 ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
  : aqi <= 150 ? 'bg-orange-100 text-orange-700 border-orange-300'
  : 'bg-red-100 text-red-700 border-red-300';

const AQI_DOT = (aqi: number) =>
  aqi <= 50 ? 'bg-green-500' : aqi <= 100 ? 'bg-yellow-500' : aqi <= 150 ? 'bg-orange-500' : 'bg-red-500';

const VEHICLE_EMOJI: Record<string, string> = { bus: '🚌', metro: '🚇', tram: '🚊' };

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: vehicles, isLoading: vLoading, refetch: rV } = useQuery<{ data: TransitVehicle[] }>('vehicles', getVehicles, { refetchInterval: 30_000 });
  const { data: aqiData, isLoading: aLoading, refetch: rA } = useQuery<{ data: AQIReading[] }>('aqi', getAQI, { refetchInterval: 60_000 });
  const { data: disruptionsData, isLoading: dLoading, refetch: rD } = useQuery<{ data: RoadDisruption[] }>('disruptions', getDisruptions, { refetchInterval: 60_000 });

  const aqiList = aqiData?.data ?? [];
  const vehicleList = vehicles?.data ?? [];
  const disruptions = disruptionsData?.data ?? [];
  const topAQI = aqiList[0];

  const refresh = () => { rV(); rA(); rD(); };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-500 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <RefreshCw size={16} /> {t('common.retry')}
        </button>
      </div>

      {/* AQI hero banner */}
      {topAQI && (
        <div className={clsx('p-5 rounded-2xl border-2 mb-6 flex items-start gap-4', AQI_COLOR(topAQI.aqi))}>
          <div className="p-3 bg-white/60 rounded-xl">
            <Wind size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold opacity-70">{t('dashboard.aqi')} · {topAQI.district}</p>
            <p className="text-5xl font-extrabold mt-1">{topAQI.aqi}</p>
            <p className="text-sm mt-1 opacity-80">{topAQI.health_recommendation}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: AQI districts + disruptions */}
        <div className="lg:col-span-1 space-y-6">
          {/* AQI cards */}
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-3">{t('dashboard.aqi')}</h2>
            {aLoading ? (
              <LoadingSkeleton rows={5} />
            ) : (
              <div className="space-y-2">
                {aqiList.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className={clsx('w-3 h-3 rounded-full', AQI_DOT(item.aqi))} />
                      <span className="text-sm font-medium text-gray-700">{item.district}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-800">{item.aqi}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Road disruptions */}
          <div>
            <h2 className="text-lg font-bold text-gray-700 mb-3">{t('dashboard.disruptions')}</h2>
            {dLoading ? (
              <LoadingSkeleton rows={3} />
            ) : disruptions.length === 0 ? (
              <p className="text-green-600 font-semibold">✅ No active disruptions</p>
            ) : (
              <div className="space-y-2">
                {disruptions.slice(0, 5).map((d) => (
                  <div key={d.id} className="bg-white rounded-xl p-3 shadow-sm flex items-start gap-3">
                    <AlertTriangle
                      size={18}
                      className={d.severity === 'critical' ? 'text-red-500 mt-0.5' : 'text-orange-400 mt-0.5'}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{d.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{d.disruption_type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live vehicles */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-700 mb-3">{t('dashboard.transit')}</h2>
          {vLoading ? (
            <LoadingSkeleton rows={8} />
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Vehicle</th>
                    <th className="px-4 py-3 text-left">Route</th>
                    <th className="px-4 py-3 text-right">Delay</th>
                    <th className="px-4 py-3 text-right">Occupancy</th>
                    <th className="px-4 py-3 text-right">Speed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicleList.slice(0, 15).map((v) => (
                    <tr key={v.vehicle_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="mr-1">{VEHICLE_EMOJI[v.vehicle_type] ?? '🚐'}</span>
                        <span className="font-medium">{v.vehicle_id}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.route_name ?? v.route_id}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={clsx(
                          'font-semibold',
                          (v.delay_minutes ?? 0) > 5 ? 'text-red-500' : 'text-green-600',
                        )}>
                          {(v.delay_minutes ?? 0) > 0 ? `+${v.delay_minutes?.toFixed(0)}` : '—'} min
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <OccupancyBar pct={v.occupancy_pct ?? 0} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {v.speed_kmh ? `${v.speed_kmh.toFixed(0)} km/h` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OccupancyBar({ pct }: { pct: number }) {
  const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8">{pct.toFixed(0)}%</span>
    </div>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-200 rounded-xl" />
      ))}
    </div>
  );
}
