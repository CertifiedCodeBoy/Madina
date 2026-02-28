import { useState } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { Navigation, Footprints, Bus, Train } from 'lucide-react';
import clsx from 'clsx';
import { planTrip, type TripPlan } from '../services/api';

const MODE_ICON: Record<string, React.ElementType> = {
  walk: Footprints,
  bus: Bus,
  metro: Train,
  tram: Train,
};

const MODE_COLOR: Record<string, string> = {
  walk: '#9e9e9e',
  bus: '#1a73e8',
  metro: '#7b1fa2',
  tram: '#e67e22',
};

export default function Mobility() {
  const { t } = useTranslation();
  const [originLat, setOriginLat] = useState('36.7372');
  const [originLng, setOriginLng] = useState('3.0864');
  const [destLat, setDestLat] = useState('36.7500');
  const [destLng, setDestLng] = useState('3.1000');
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState('');

  const findRoute = async () => {
    setPlanning(true);
    setError('');
    setTripPlan(null);
    try {
      const { data } = await planTrip(
        parseFloat(originLat), parseFloat(originLng),
        parseFloat(destLat), parseFloat(destLng),
      );
      setTripPlan(data);
    } catch {
      setError(t('common.error'));
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{t('mobility.title')}</h1>

      {/* Trip planner */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Navigation size={20} className="text-purple-600" />
          {t('mobility.plan_trip')}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <CoordInput label={`${t('mobility.origin')} Lat`} value={originLat} onChange={setOriginLat} />
          <CoordInput label={`${t('mobility.origin')} Lng`} value={originLng} onChange={setOriginLng} />
          <CoordInput label={`${t('mobility.destination')} Lat`} value={destLat} onChange={setDestLat} />
          <CoordInput label={`${t('mobility.destination')} Lng`} value={destLng} onChange={setDestLng} />
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          onClick={findRoute}
          disabled={planning}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {planning ? 'Planning…' : t('mobility.search')}
        </button>
      </div>

      {/* Trip result */}
      {tripPlan && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b">
            <MetricBox
              value={`${tripPlan.total_duration_minutes} ${t('mobility.mins')}`}
              label={t('mobility.total_time')}
              color="text-purple-600"
            />
            <MetricBox
              value={`${tripPlan.total_distance_km} ${t('mobility.km')}`}
              label={t('mobility.distance')}
              color="text-blue-600"
            />
            <MetricBox
              value={`${tripPlan.co2_saved_kg} ${t('mobility.kg')}`}
              label={t('mobility.co2_saved')}
              color="text-green-600"
            />
          </div>

          {/* Legs */}
          <div className="space-y-3">
            {tripPlan.legs.map((leg, idx) => {
              const Icon = MODE_ICON[leg.mode] ?? Bus;
              const color = MODE_COLOR[leg.mode] ?? '#888';
              return (
                <div key={idx} className="flex items-center gap-4 rounded-xl p-4 bg-gray-50">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}20` }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-800 capitalize">
                      {leg.mode}{leg.route_name ? ` · ${leg.route_name}` : ''}
                    </p>
                    {leg.from_stop && (
                      <p className="text-xs text-gray-500">{leg.from_stop} → {leg.to_stop}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color }}>{leg.duration_minutes} min</p>
                    <p className="text-xs text-gray-400">{leg.distance_km} km</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CoordInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    </div>
  );
}

function MetricBox({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={clsx('text-2xl font-extrabold', color)}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
