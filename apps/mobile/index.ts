import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent (rather than AppRegistry directly) also sets up the
// environment for Expo Go and native builds identically, per Expo's docs.
registerRootComponent(App);
