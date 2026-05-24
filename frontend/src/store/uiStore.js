import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  isDark: true,
  toggle: () => set((s) => {
    const next = !s.isDark;
    if (next) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    return { isDark: next };
  }),
  init: () => {
    document.documentElement.classList.add('dark');
  },
}));

export const useAlertStore = create((set) => ({
  alerts: [],
  emergencyAlerts: [],

  addAlert: (alert) => set((s) => {
    // Avoid flooding with duplicates for the same patient+message within 5s
    const now = Date.now();
    const duplicate = s.alerts.find(
      (a) => a.patient_id === alert.patient_id && a.message === alert.message &&
        now - new Date(a.timestamp).getTime() < 5000
    );
    if (duplicate) return {};
    const newAlerts = [{ ...alert, resolved: false }, ...s.alerts].slice(0, 50);
    let newEmergency = s.emergencyAlerts;
    
    if (alert.severity === 'critical') {
      newEmergency = [alert, ...s.emergencyAlerts].slice(0, 5);
      
      // Native Browser Push Notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('MediSync Critical Alert', {
            body: `⚠️ ${alert.patient_name}: ${alert.message}`,
            icon: '/vite.svg',
            tag: alert.patient_id, // Prevent duplicate popups for same patient
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('MediSync Critical Alert', {
                body: `⚠️ ${alert.patient_name}: ${alert.message}`,
                icon: '/vite.svg',
              });
            }
          });
        }
      }
    }
    
    return { alerts: newAlerts, emergencyAlerts: newEmergency };
  }),

  resolveAlert: (id) => set((s) => ({
    alerts: s.alerts.map((a) => a.id === id ? { ...a, resolved: true } : a),
  })),

  dismissEmergency: (id) => set((s) => ({
    emergencyAlerts: s.emergencyAlerts.filter((a) => a.id !== id),
    alerts: s.alerts.map((a) => a.id === id ? { ...a, resolved: true } : a),
  })),

  clearAll: () => set({ alerts: [], emergencyAlerts: [] }),
}));
