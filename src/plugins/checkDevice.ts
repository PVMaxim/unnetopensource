  export interface DeviceState {
    isDesktop: boolean
    desktopOS: DesktopOS | undefined
    isWindowsDesktop: boolean
    isLinuxOrUnixDesktop: boolean

    isMobile: boolean
    mobileOS: MobileOS | undefined
    isAndroidDevice: boolean
    isAppleDevice: boolean
    isUnknownMobileDevice: boolean

    isTablet: boolean
    isLandscapeOrientation: () => boolean
    isPortraitOrientation: () => boolean
  }

  export const userAgent: string = navigator.userAgent || navigator.vendor || (window as any).opera || undefined

  const SEARCHBOX_UA_REGEX = /alexa|bot|crawl(er|ing)|facebookexternalhit|feedburner|google web preview|nagios|postrank|pingdom|slurp|spider|yahoo!|yandex/;
  export type Browser =
  | 'aol'
  | 'edge'
  | 'edge-ios'
  | 'yandexbrowser'
  | 'kakaotalk'
  | 'samsung'
  | 'silk'
  | 'miui'
  | 'beaker'
  | 'edge-chromium'
  | 'vivaldi'
  | 'brave'
  | 'chrome'
  | 'chromium-webview'
  | 'phantomjs'
  | 'crios'
  | 'firefox'
  | 'fxios'
  | 'opera-mini'
  | 'opera'
  | 'pie'
  | 'netfront'
  | 'ie'
  | 'bb10'
  | 'android'
  | 'ios'
  | 'safari'
  | 'facebook'
  | 'instagram'
  | 'ios-webview'
  | 'curl'
  | 'searchbot';

  type UserAgentRule = [Browser, RegExp];
  type UserAgentMatch = [Browser, RegExpExecArray] | boolean | Browser;
  const userAgentRules: UserAgentRule[] = [
    ['aol', /AOLShield\/([0-9\._]+)/],
    ['edge', /Edge\/([0-9\._]+)/],
    ['edge-ios', /EdgiOS\/([0-9\._]+)/],
    ['yandexbrowser', /YaBrowser\/([0-9\._]+)/],
    ['kakaotalk', /KAKAOTALK\s([0-9\.]+)/],
    ['samsung', /SamsungBrowser\/([0-9\.]+)/],
    ['silk', /\bSilk\/([0-9._-]+)\b/],
    ['miui', /MiuiBrowser\/([0-9\.]+)$/],
    ['beaker', /BeakerBrowser\/([0-9\.]+)/],
    ['edge-chromium', /EdgA?\/([0-9\.]+)/],
    ['vivaldi', /Vivaldi\/([0-9\.]+)/],
    ['brave', /Brave\/([0-9\.]+)/],
    [
      'chromium-webview',
      /(?!Chrom.*OPR)wv\).*Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/,
    ],
    ['chrome', /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/],
    ['phantomjs', /PhantomJS\/([0-9\.]+)(:?\s|$)/],
    ['crios', /CriOS\/([0-9\.]+)(:?\s|$)/],
    ['firefox', /Firefox\/([0-9\.]+)(?:\s|$)/],
    ['fxios', /FxiOS\/([0-9\.]+)/],
    ['opera-mini', /Opera Mini.*Version\/([0-9\.]+)/],
    ['opera', /Opera\/([0-9\.]+)(?:\s|$)/],
    ['opera', /OPR\/([0-9\.]+)(:?\s|$)/],
    ['pie', /^Microsoft Pocket Internet Explorer\/(\d+\.\d+)$/],
    ['pie', /^Mozilla\/\d\.\d+\s\(compatible;\s(?:MSP?IE|MSInternet Explorer) (\d+\.\d+);.*Windows CE.*\)$/],
    ['netfront', /^Mozilla\/\d\.\d+.*NetFront\/(\d.\d)/],
    ['ie', /Trident\/7\.0.*rv\:([0-9\.]+).*\).*Gecko$/],
    ['ie', /MSIE\s([0-9\.]+);.*Trident\/[4-7].0/],
    ['ie', /MSIE\s(7\.0)/],
    ['bb10', /BB10;\sTouch.*Version\/([0-9\.]+)/],
    ['android', /Android\s([0-9\.]+)/],
    ['ios', /Version\/([0-9\._]+).*Mobile.*Safari.*/],
    ['safari', /Version\/([0-9\._]+).*Safari/],
    ['facebook', /FB[AS]V\/([0-9\.]+)/],
    ['instagram', /Instagram\s([0-9\.]+)/],
    ['ios-webview', /AppleWebKit\/([0-9\.]+).*Mobile/],
    ['ios-webview', /AppleWebKit\/([0-9\.]+).*Gecko\)$/],
    ['curl', /^curl\/([0-9\.]+)$/],
    ['searchbot', SEARCHBOX_UA_REGEX],
  ];

  const allowedBrowsers = [
    'android',
    'ios',
    'safari',
    'chrome',
    'crios',
    'vivaldi',
    'brave'
  ];

  const isBrave = (): boolean => {
    try {
      const maybeBrave = (window.navigator as { brave?: any }).brave;
      return maybeBrave != undefined && maybeBrave.isBrave.name == 'isBrave';
    } catch (error) {
      return false
    }
  }

  const isDuckDuckGo = (): boolean => {
    try {
      const maybeDDL = (window.navigator as { _duckduckgoloader_?: any })._duckduckgoloader_;
      return maybeDDL !== undefined || !!(window as any).DDG;
    } catch (error) {
      return false
    }
  }

  const isVivaldi = () => {
    return false
  }

  export const supportedBrowser = (): UserAgentMatch => {
    if (isBrave() || isDuckDuckGo()) {
      return false;
    }
    const browserName = (
      typeof (userAgent) !== 'undefined' &&
      userAgentRules.reduce<UserAgentMatch>(
        (matched: UserAgentMatch, [browser, regex]) => {
          if (matched) {
            return matched;
          }

          const uaMatch = regex.exec(userAgent);
          return !!uaMatch && browser;
        },
        false,
      )
    );
    return allowedBrowsers.indexOf(browserName.toString()) !== -1;
  }


  const isMobileDevice = (): boolean => {
    const regexs = [/(Android)(.+)(Mobile)/i, /BlackBerry/i, /iPhone|iPod/i, /Opera Mini/i, /IEMobile/i]
    return regexs.some((b) => userAgent.match(b))
  }

  const isTabletDevice = (): boolean => {
    const regex = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/
    return regex.test(userAgent.toLowerCase())
  }

  const isChrome = (): boolean => {
    const regexs = /(?!Chrom.*OPR)Chrom(?:e|ium)\/([0-9\.]+)(:?\s|$)/
    return regexs.test(userAgent)
  }

  const isSafari = (): boolean => {
    const regexs = /Version\/([0-9\._]+).*Safari/
    return regexs.test(userAgent)
  }

  const isFirefox = (): boolean => {
    const regexs = /Firefox\/([0-9\.]+)(?:\s|$)/
    return regexs.test(userAgent)
  }

  const isDesktopDevice = (): boolean => !isMobileDevice() && !isTabletDevice()

  export const isDesktop = false
  const isMobile = isMobileDevice()
  const isTablet = isTabletDevice()


  enum MobileOS {
    Android = 'android',
    iOS = 'ios',
    Unknown = 'unknown',
    WindowsPhone = 'Windows Phone'
  }

  const getMobileOS = (): MobileOS | undefined => {
    if (isMobileDevice()) {
      if (/windows phone/i.test(userAgent)) return MobileOS.WindowsPhone
      else if (/android/i.test(userAgent)) return MobileOS.Android
      else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) return MobileOS.iOS

      return MobileOS.Unknown
    } else return undefined
  }

  enum DesktopOS {
    Linux = 'linux',
    MacOS = 'mac_os',
    Unix = 'unix',
    Unknown = 'unknown',
    Windows = 'windows'
  }

  const getDesktopOS = (): DesktopOS | undefined => {
    if (isDesktopDevice()) {
      if (userAgent.indexOf('Win') !== -1) return DesktopOS.Windows
      else if (userAgent.indexOf('Mac') !== -1) return DesktopOS.MacOS
      else if (userAgent.indexOf('X11') !== -1) return DesktopOS.Unix
      else if (userAgent.indexOf('Linux') !== -1) return DesktopOS.Linux

      return DesktopOS.Unknown
    } else return undefined
  }

  type DeviceOS = DesktopOS | MobileOS

  const getDeviceOS = (): DeviceOS | undefined => getMobileOS() ?? getDesktopOS()

  const mobileOS: MobileOS | undefined = getMobileOS()
  export const isAndroidDevice = getDeviceOS() === MobileOS.Android
  export const isAppleDevice = getDeviceOS() === MobileOS.iOS || getDeviceOS() === DesktopOS.MacOS
  export const isMobileAndroidDevice = getDeviceOS() === MobileOS.Android
  export const isMobileAppleDevice = getDeviceOS() === MobileOS.iOS

  export const isChromeBrowser = isChrome();
  export const isSafariBrowser = isSafari();
  export const isFirefoxBrowser = isFirefox();

  const isUnknownMobileDevice = getDeviceOS() === MobileOS.Unknown

  const desktopOS: DesktopOS | undefined = getDesktopOS()
  const isWindowsDesktop = getDeviceOS() === DesktopOS.Windows
  const isLinuxOrUnixDesktop = getDeviceOS() === DesktopOS.Linux || getDeviceOS() === DesktopOS.Unix


  const hasScreen = typeof screen !== 'undefined';
  const hasMatchMedia = typeof matchMedia !== 'undefined';

  const supportedScreenOrientation =
    hasScreen ? ((screen?.orientation || {}).type ?? (screen as any).mozOrientation ?? (screen as any).msOrientation) : undefined;

  const safariScreenOrientation: OrientationType =
    hasScreen && !screen?.orientation && hasMatchMedia && matchMedia('(orientation: portrait)').matches ? 'portrait-primary' : 'landscape-primary';

  const initialScreenOrientation = supportedScreenOrientation ?? safariScreenOrientation ?? 'portrait-primary';
  let screenOrientation: OrientationType = initialScreenOrientation;

  if (hasScreen && screen.orientation) {
    screen.orientation.addEventListener(
      'change',
      (ev: Event) => (screenOrientation = (ev.target ?? ({} as any)).type)
    );
  }

  const isLandscapeOrientation = () => ['landscape-primary', 'landscape-secondary'].includes(screenOrientation)
  const isPortraitOrientation = () => ['portrait-primary', 'portrait-secondary'].includes(screenOrientation)

  export const useDevice = (): DeviceState => ({
    isDesktop,
    desktopOS,
    isWindowsDesktop,
    isLinuxOrUnixDesktop,
    isMobile,
    mobileOS,
    isAndroidDevice,
    isAppleDevice,
    isUnknownMobileDevice,
    isTablet,
    isLandscapeOrientation,
    isPortraitOrientation
  })