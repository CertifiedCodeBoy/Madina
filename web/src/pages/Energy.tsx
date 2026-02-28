import { useQuery } from 'react-query';
import { useTranslation } from 'react-i18next';
import { Lightbulb, Zap, Sun, TrendingDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { getEnergyDashboard, getParkingLots, type ParkingLot } from '../services/api';
import clsx from 'clsx';

const USER_ID = 'citizen_001';

function StatCard({ label, value, unit, icon: Icon, color }: {
  label: string; value: number; unit: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className={clsx('bg-white rounded-2xl p-5 shadow-sm border-l-4', `border-[${color}]`)}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl" style={{ backgroundColor: `${color}20` }}>
          <Icon size={22} style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-extrabold text-gray-800">
            {value.toFixed(1)} <span className="text-sm font-normal text-gray-500">{unit}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function ParkingRow({ lot }: { lot: ParkingLot }) {
  const occ = lot.occupancy_pct;
  const barColor = occ > 80 ? '#ef4444' : occ > 50 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      <div className="flex-1">
        <p className="font-medium text-gray-800 text-sm">{lot.name}</p>
        <p className="text-xs text-gray-400">{lot.available_spots} available · {lot.predicted_availability_1h} predicted 1h</p>
      </div>
      <div className="w-32">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${occ}%`, backgroundColor: barColor }} />
        </div>
        <p className="text-xs text-right mt-1 text-gray-400">{occ}%</p>
      </div>
    </div>
  );
}

// Synthetic 24h chart data (in production: from energy readings)
const mockHourlyData = Array.from({ length: 24 }, (_, h) => ({
  hour: `${String(h).padStart(2, '0')}:00`,
  consumption: Math.max(0.3, 1.2 + Math.sin((h - 8) * Math.PI / 8) * 0.8 + Math.random() * 0.2),
  solar: h >= 6 && h <= 19 ? Math.max(0, Math.sin((h - 6) * Math.PI / 13) * 0.7) : 0,
}));

export default function Energy() {
  const { t } = useTranslation();

  const { data: dashData } = useQuery('energy', () => getEnergyDashboard(USER_ID));
  const { data: parkingData } = useQuery('parking', () => getParkingLots());

  const dash = dashData?.data;
  const lots = parkingData?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6">{t('energy.title')}</h1>

      {dash && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label={t('energy.your_usage')} value={dash.period_kwh} unit="kWh" icon={Zap} color="#1a73e8" />
            <StatCard label={t('energy.district_avg')} value={dash.district_avg_kwh} unit="kWh" icon={TrendingDown} color="#7b1fa2" />
            <StatCard label={t('energy.solar')} value={dash.solar_kwh} unit="kWh" icon={Sun} color="#f9a825" />
            <StatCard label={t('energy.sold')} value={dash.grid_kwh_sold} unit="kWh" icon={Zap} color="#00897b" />
          </div>

          {/* Usage vs avg comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-base font-bold text-gray-700 mb-4">24h Energy Profile</h2>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={mockHourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={3} />
                  <YAxis tick={{ fontSize: 11 }} unit=" kWh" />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)} kWh`} />
                  <Legend />
                  <Area type="monotone" dataKey="consumption" stroke="#1a73e8" fill="#e8f0fe" name="Consumption" />
                  <Area type="monotone" dataKey="solar" stroke="#f9a825" fill="#fff9e6" name="Solar" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Tip */}
            <div className="bg-yellow-50 rounded-2xl p-5 flex flex-col justify-center border border-yellow-200">
              <div className="flex items-center gap-2 text-amber-600 font-bold mb-3">
                <Lightbulb size={20} /> {t('energy.tip')}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{dash.savings_tip}</p>
            </div>
          </div>
        </>
      )}

      {/* Parking */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">{t('mobility.parking')}</h2>
        {lots.length === 0 ? (
          <p className="text-gray-400 text-sm">{t('common.loading')}</p>
        ) : (
          lots.map((lot) => <ParkingRow key={lot.id} lot={lot} />)
        )}
      </div>
    </div>
  );
}
