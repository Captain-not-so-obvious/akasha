import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.akasha.app',
  appName: 'Akasha',
  webDir: 'dist',
  server: {
    url: 'http://10.0.2.2:5173',
    cleartext: true
  }
};

export default config;
