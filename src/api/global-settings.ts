export type CardIoMethod = 'fido' | 'nfc';

export interface UniGlobalSettings {
    ioMethod: CardIoMethod;
}

let _settings: UniGlobalSettings = {
    ioMethod: 'fido',
}

export function getUniSettings(): UniGlobalSettings {
    return { ..._settings };
}

export function setUniSettings(settings: UniGlobalSettings) {
    _settings = { ...settings };
}
