export const translations = {
  en: {
    dashboard: "Dashboard",
    activities: "Activities", 
    contacts: "Contacts",
    quickWins: "Quick Wins",
    roadblocks: "Roadblocks",
    agenda: "Agenda",
    timeBlocking: "Time Blocking",
    profile: "Profile",
    settings: "Settings",
    login: "Login",
    logout: "Logout",
    loading: "Loading...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    filter: "Filter",
    darkMode: "Dark mode",
    language: "Language",
    preferences: "Preferences",
    notifications: "Notifications",
    workingHours: "Working Hours",
    timezone: "Timezone",
    resetToSystem: "Reset to System Preferences"
  },
  nl: {
    dashboard: "Dashboard",
    activities: "Activiteiten",
    contacts: "Contacten", 
    quickWins: "Quick Wins",
    roadblocks: "Knelpunten",
    agenda: "Agenda",
    timeBlocking: "Tijd Blokken",
    profile: "Profiel",
    settings: "Instellingen",
    login: "Inloggen",
    logout: "Uitloggen",
    loading: "Laden...",
    save: "Opslaan",
    cancel: "Annuleren",
    delete: "Verwijderen",
    edit: "Bewerken", 
    add: "Toevoegen",
    search: "Zoeken",
    filter: "Filteren",
    darkMode: "Donkere modus",
    language: "Taal",
    preferences: "Voorkeuren",
    notifications: "Meldingen",
    workingHours: "Werktijden",
    timezone: "Tijdzone",
    resetToSystem: "Terugzetten naar Systeemvoorkeuren"
  }
};

export function useTranslation(language: 'en' | 'nl') {
  return function t(key: keyof typeof translations.en): string {
    return translations[language][key] || translations.en[key];
  };
}