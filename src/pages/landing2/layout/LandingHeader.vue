<template>
  <header>
    <nav :class="['landing-nav', { 'is-scrolled': scrolled }]">
      <div class="nav-container">
        <div class="nav-inner">
          <router-link to="/" class="nav-logo-link">
            <img :src="logoImg" alt="United Network" class="nav-logo" />
          </router-link>

          <div class="nav-links desktop-only">
            <a
              v-for="link in navLinks"
              :key="link.href"
              :href="link.href"
              @click.prevent="handleNavClick(link.href)"
              class="nav-link"
              :class="{ 'active': isLinkActive(link.href) }"
            >
              {{ link.label }}
            </a>
          </div>

          <div class="nav-actions">
            <a
              href="https://shop.united.network/products/nfc-card-wallet/"
              target="_blank"
              rel="noopener noreferrer"
              class="shop-btn desktop-only"
            >
              {{ t('landing_v2.header.shopNow') }}
            </a>

            <button
              @click="toggleMobileMenu"
              class="hamburger mobile-only"
              aria-label="Toggle menu"
            >
              <span :class="['hamburger-line', { 'top-active': mobileOpen }]"></span>
              <span :class="['hamburger-line', { 'middle-hidden': mobileOpen }]"></span>
              <span :class="['hamburger-line', { 'bottom-active': mobileOpen }]"></span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <transition name="fade">
      <div v-if="mobileOpen" class="mobile-menu-overlay">
        <div class="mobile-menu-content">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            @click.prevent="handleNavClick(link.href, true)"
            class="mobile-nav-link"
            :class="{ 'active': isLinkActive(link.href) }"
          >
            {{ link.label }}
          </a>
          <a
            href="https://shop.united.network/products/nfc-card-wallet/"
            target="_blank"
            rel="noopener noreferrer"
            @click="toggleMobileMenu"
            class="mobile-shop-btn"
          >
            {{ t('landing_v2.header.shopNow') }}
          </a>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const logoImg = new URL('@/pages/landing2/assets/images/logo-full-orange.png', import.meta.url).href;

const navLinks = computed(() => [
  { href: "/", label: t('landing_v2.header.home') },
  { href: "/#features", label: t('landing_v2.header.features') },
  { href: "/#how-it-works", label: t('landing_v2.header.howItWorks') },
  { href: "/enterprise", label: t('landing_v2.header.enterprise') },
  { href: "/#faq", label: t('landing_v2.header.faq') },
]);

const scrolled = ref(false);
const mobileOpen = ref(false);
const activeSection = ref('');

const isLinkActive = (href) => {
  if (href === '/') return route.path === '/' && activeSection.value === '';
  if (href.startsWith('/#')) return route.path === '/' && activeSection.value === href.replace('/#', '');
  return route.path === href;
};

const handleNavClick = (href, isMobile = false) => {
  if (isMobile) toggleMobileMenu();
  
  if (href === '/') {
    if (route.path !== '/') {
      router.push('/');
    } else {
      const scrollOpts = { top: 0, behavior: 'smooth' };
      window.scrollTo(scrollOpts);
      document.body.scrollTo(scrollOpts);
      document.documentElement.scrollTo(scrollOpts);
      activeSection.value = '';
      window.history.replaceState(null, '', window.location.pathname);
    }
  } else if (href.startsWith('/#')) {
    if (route.path !== '/') {
      router.push(href);
    } else {
      const targetId = href.replace('/#', '');
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        activeSection.value = targetId;
        window.history.replaceState(null, '', `#${targetId}`);
      }
    }
  } else {
    if (route.path === href) {
      const scrollOpts = { top: 0, behavior: 'smooth' };
      window.scrollTo(scrollOpts);
      document.body.scrollTo(scrollOpts);
      document.documentElement.scrollTo(scrollOpts);
    } else {
      router.push(href);
    }
  }
};

const handleScroll = (e) => {
  const target = e.target;
  const scrollTop = target.scrollTop !== undefined 
    ? target.scrollTop 
    : (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);

  scrolled.value = scrollTop > 20;
};

const toggleMobileMenu = () => {
  mobileOpen.value = !mobileOpen.value;
  document.body.style.overflow = mobileOpen.value ? "hidden" : "";
};

let observer;

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  document.body.addEventListener("scroll", handleScroll, { passive: true });
  
  const appEl = document.getElementById('app');
  if(appEl) {
    appEl.addEventListener("scroll", handleScroll, { passive: true });
  }

  observer = new IntersectionObserver((entries) => {
    let visibleEntries = entries.filter(e => e.isIntersecting);
    if(visibleEntries.length > 0) {
      visibleEntries.sort((a,b) => b.intersectionRatio - a.intersectionRatio);
      activeSection.value = visibleEntries[0].target.id;
    } else if (window.scrollY < 300) {
      activeSection.value = '';
    }
  }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5] });

  ['features', 'how-it-works', 'faq'].forEach(id => {
    const el = document.getElementById(id);
    if(el) observer.observe(el);
  });
  
  if(route.hash) {
    activeSection.value = route.hash.replace('#', '');
  }
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  document.body.removeEventListener("scroll", handleScroll);
  const appEl = document.getElementById('app');
  if(appEl) {
    appEl.removeEventListener("scroll", handleScroll);
  }
  document.body.style.overflow = "";
  if(observer) observer.disconnect();
});
</script>

<style scoped>
.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 8px;
  z-index: 50;
  padding-top: 16px;
  transition: padding 0.5s ease, background 0.5s ease;
}

.landing-nav.is-scrolled {
  padding-top: 8px;
  padding-bottom: 8px;
  background: linear-gradient(#0d0d0d 0%, #0d0d0d99 70%, #0000 100%);
}

.landing-nav.is-scrolled::before {
  content: '';
  position: absolute;
  inset: 0;
  backdrop-filter: blur(12px);
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 20px;
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  transition: background 0.5s, box-shadow 0.5s, padding 0.5s, border-radius 0.5s;
}

.landing-nav.is-scrolled .nav-inner {
  padding-top: 10px;
  padding-bottom: 10px;
  border-radius: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: #0d0d0de0;
  border: none;
  box-shadow: 0 8px 32px #00000080;
}

.nav-logo-link {
  display: flex;
  align-items: center;
}

.nav-logo {
  height: 30px;
  width: auto;
  object-fit: contain;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 28px;
}

.nav-link {
  font-size: 13px;
  font-weight: 500;
  color: #a1a1aa; 
  transition: color 0.2s;
  text-decoration: none;
}

.nav-link:hover {
  color: #ffffff;
}

.nav-link.active {
  color: #ff9800; 
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shop-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f7931a, #ffad42);
  color: #000;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.2s;
}

.shop-btn:hover {
  box-shadow: 0 0 32px 4px rgba(247, 147, 26, 0.3);
  transform: translateY(-2px);
}

.hamburger {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
}

.hamburger-line {
  display: block;
  width: 22px;
  height: 2px;
  background-color: #fff;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.top-active {
  transform: translateY(7px) rotate(45deg);
}

.middle-hidden {
  opacity: 0;
}

.bottom-active {
  transform: translateY(-7px) rotate(-45deg);
}

.mobile-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background-color: rgba(23, 23, 23, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-menu-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.mobile-nav-link {
  font-size: 20px;
  font-weight: 600;
  color: #a1a1aa;
  text-decoration: none;
  transition: color 0.2s;
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  color: #ff9800;
}

.mobile-shop-btn {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%);
  color: #000;
  font-weight: 700;
  font-size: 16px;
  text-decoration: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
}

@media (min-width: 769px) {
  .mobile-only {
    display: none !important;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
