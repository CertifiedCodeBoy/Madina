import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  tabs: { dashboard: 'Dashboard', report: 'Report', assistant: 'Assistant', energy: 'Energy', mobility: 'Mobility' },
  dashboard: { title: 'Madina', subtitle: 'Your city at a glance', aqi: 'Air Quality', transit: 'Live Transit', disruptions: 'Road Disruptions' },
  report: { title: 'Report an Issue', subtitle: 'Upload a photo — AI classifies it instantly', description: 'Description', address: 'Address', submit: 'Submit Report', ai_result: 'AI Triage Result', category: 'Category', severity: 'Severity', department: 'Routed to', estimated: 'Estimated resolution', days: 'days', confidence: 'Confidence' },
  assistant: { title: 'Municipal Assistant', placeholder: 'Ask about city services…' },
  energy: { title: 'Energy Dashboard', your_usage: 'Your Usage', district_avg: 'District Average', solar: 'Solar Generated', sold: 'Sold to Grid', tip: 'Savings Tip', kwh: 'kWh' },
  mobility: { title: 'Smart Mobility', plan_trip: 'Plan a Trip', parking: 'Parking', total_time: 'Total time', distance: 'Distance', co2_saved: 'CO₂ saved', origin: 'From', destination: 'To', search: 'Find Route', mins: 'min', km: 'km', kg: 'kg' },
  common: { error: 'Something went wrong. Try again.', retry: 'Refresh', loading: 'Loading…' },
};

const ar = {
  tabs: { dashboard: 'لوحة التحكم', report: 'الإبلاغ', assistant: 'المساعد', energy: 'الطاقة', mobility: 'التنقل' },
  dashboard: { title: 'مدينة', subtitle: 'مدينتك في لمحة', aqi: 'جودة الهواء', transit: 'النقل المباشر', disruptions: 'اضطرابات الطرق' },
  report: { title: 'الإبلاغ عن مشكلة', subtitle: 'ارفع صورة ودع الذكاء الاصطناعي يصنّفها', description: 'وصف', address: 'عنوان', submit: 'إرسال البلاغ', ai_result: 'نتيجة الفرز', category: 'الفئة', severity: 'الخطورة', department: 'تم التحويل إلى', estimated: 'وقت الحل المتوقع', days: 'أيام', confidence: 'الثقة' },
  assistant: { title: 'المساعد البلدي', placeholder: 'اسأل عن خدمات المدينة…' },
  energy: { title: 'لوحة الطاقة', your_usage: 'استهلاكك', district_avg: 'متوسط الحي', solar: 'الطاقة الشمسية', sold: 'مباعة للشبكة', tip: 'نصيحة التوفير', kwh: 'ك.و.س' },
  mobility: { title: 'التنقل الذكي', plan_trip: 'تخطيط رحلة', parking: 'المواقف', total_time: 'المدة الإجمالية', distance: 'المسافة', co2_saved: 'CO₂ موفّر', origin: 'من', destination: 'إلى', search: 'ابحث عن مسار', mins: 'د', km: 'كم', kg: 'كغ' },
  common: { error: 'حدث خطأ. حاول مرة أخرى.', retry: 'تحديث', loading: 'جارٍ التحميل…' },
};

const fr = {
  tabs: { dashboard: 'Tableau de bord', report: 'Signalement', assistant: 'Assistant', energy: 'Énergie', mobility: 'Mobilité' },
  dashboard: { title: 'Madina', subtitle: 'Votre ville en un coup d\'œil', aqi: 'Qualité de l\'air', transit: 'Transport en direct', disruptions: 'Perturbations' },
  report: { title: 'Signaler un problème', subtitle: 'Chargez une photo — l\'IA la classifie instantanément', description: 'Description', address: 'Adresse', submit: 'Soumettre', ai_result: 'Résultat IA', category: 'Catégorie', severity: 'Gravité', department: 'Transmis à', estimated: 'Résolution estimée', days: 'jours', confidence: 'Confiance' },
  assistant: { title: 'Assistant municipal', placeholder: 'Posez une question sur les services…' },
  energy: { title: 'Tableau énergie', your_usage: 'Votre consommation', district_avg: 'Moyenne quartier', solar: 'Solaire produit', sold: 'Revendu au réseau', tip: 'Conseil économie', kwh: 'kWh' },
  mobility: { title: 'Mobilité intelligente', plan_trip: 'Planifier un trajet', parking: 'Parkings', total_time: 'Durée totale', distance: 'Distance', co2_saved: 'CO₂ économisé', origin: 'Départ', destination: 'Arrivée', search: 'Itinéraire', mins: 'min', km: 'km', kg: 'kg' },
  common: { error: 'Une erreur est survenue.', retry: 'Actualiser', loading: 'Chargement…' },
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
    fr: { translation: fr },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
