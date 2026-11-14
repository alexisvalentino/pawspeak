import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pawspeak.app',
  appName: 'PawSpeak',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
