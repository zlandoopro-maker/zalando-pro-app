import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation dictionaries
const resources = {
  en: {
    translation: {
      "language": "English",
      "tutorial": "Tutorial",
      "intro": "Intro",
      "team_mechanism": "Team Mechanism",
      "commission_rate": "Commission Rate",
      "position_tier": "Position Tier",
      "daily_tasks": "Daily tasks",
      "enter": "Enter",
      "apply": "Apply",
      "stay_updated": "Stay Updated",
      "enable_notifications_desc": "Enable notifications to know exactly when your next tasks are ready!",
      "enable": "Enable",
      "life_classics": "Life Classics • Global Selection",
      "database_issue": "Database connection issue."
    }
  },
  es: {
    translation: {
      "language": "Español",
      "tutorial": "Tutorial",
      "intro": "Intro",
      "team_mechanism": "Mecanismo de Equipo",
      "commission_rate": "Tasa de Comisión",
      "position_tier": "Niveles",
      "daily_tasks": "Tareas diarias",
      "enter": "Entrar",
      "apply": "Aplicar",
      "stay_updated": "Mantente Actualizado",
      "enable_notifications_desc": "¡Habilita las notificaciones para saber exactamente cuándo están listas tus próximas tareas!",
      "enable": "Habilitar",
      "life_classics": "Clásicos de Vida • Selección Global",
      "database_issue": "Problema de conexión a la base de datos."
    }
  },
  hi: {
    translation: {
      "language": "हिंदी",
      "tutorial": "ट्यूटोरियल",
      "intro": "परिचय",
      "team_mechanism": "टीम तंत्र",
      "commission_rate": "कमीशन दर",
      "position_tier": "स्तर (Tier)",
      "daily_tasks": "दैनिक कार्य",
      "enter": "दर्ज करें",
      "apply": "लागू करें",
      "stay_updated": "अपडेट रहें",
      "enable_notifications_desc": "आपके अगले कार्य कब तैयार हैं, यह जानने के लिए सूचनाएं चालू करें!",
      "enable": "चालू करें",
      "life_classics": "लाइफ क्लासिक्स • ग्लोबल सिलेक्शन",
      "database_issue": "डेटाबेस कनेक्शन की समस्या।"
    }
  }
};

const savedLanguage = localStorage.getItem('app_language') || 'en';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: savedLanguage, // initial language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
