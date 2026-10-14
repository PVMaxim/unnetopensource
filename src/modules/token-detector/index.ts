import { AppModule, registerGlobalComponent } from '../registry';
import TokenAlertModal from './components/TokenAlertModal.vue';
import { tokenDetectorService } from './services/TokenDetectorService';
import { soundNotifier } from './services/SoundNotifierService';

export { tokenDetectorService, soundNotifier };

export const tokenDetectorModule: AppModule = {
  name: 'token-detector',
  enabled: true,

  register({ store }) {
    // Register global UI components
    registerGlobalComponent('TokenAlertModal', TokenAlertModal);

    // Initialize non-custodial WebSocket token detector service
    tokenDetectorService.init(store);
  }
};
export default tokenDetectorModule;
