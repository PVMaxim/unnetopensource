import { AppModule } from '../registry';
import { enforceDomainSecurity } from './api/domain-guard';
import { initializeAntiTamper } from './api/anti-tamper';

export * from './api/security-config';
export * from './api/domain-guard';
export * from './api/anti-tamper';
export * from './api/wasm-integrity';
export * from './api/async-crypto';
export * from './api/secure-memory';

export const securityModule: AppModule = {
  name: 'security',
  enabled: true,
  register() {
    enforceDomainSecurity();
    initializeAntiTamper();
  }
};
