<template>
  <div class="language-dropdown notselect" :class="{open:isActive}" v-clickoutside="close" >
    <div @click="toggle()" class="selected-language" role="button">
    <div class="active-language">{{ storeLocale }}</div>
    </div>
    <ul class="select-language">
      <li v-for="(value) in locales.filter(item => item != storeLocale )" class="dropdown-item"
         @click="setLocale(value)">
        {{ value }}
      </li>
    </ul>
  </div>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import { i18n, SUPPORT_LOCALES, setI18nLanguage } from '@/plugins/i18n'
import { useStore } from 'vuex'
import router from '@/router/index'
import clickOutside from '@/plugins/click-outside/click-outside'

export default defineComponent({
  name: 'LocalDropdown',
  directives: {
    clickoutside: clickOutside,
  },
    setup() {
      const store = useStore();
      const isActive = ref(false);
      const locales = computed(() => store.state.lang.locales || SUPPORT_LOCALES);
      const storeLocale = computed(() => {return store.state.lang.locale });

      const setLocale = (locale) => {
        if (i18n.global.locale.value !== locale) {
          store.dispatch('lang/setLocale', { locale })
          setI18nLanguage(locale)
          router.currentRoute.value.name
          ? router.push({ name: router.currentRoute.value.name, params: { locale: locale } }) : NULL
        }
        toggle()
      }

      const toggle = () => {
        isActive.value = !isActive.value
      }

      close = () => {
        isActive.value = false
      }

      return { isActive, setLocale, toggle, locales, close, storeLocale }
    }
})
</script>

<style scoped lang="scss">
.select-language{
  position: absolute;
  width: 50px;
  margin: 0;
  padding: 0;
  list-style: none;
  text-align: center;
  height: 0;
  overflow: hidden;
  z-index: 12;
  @include transition( .2s ease-in-out);
  .dropdown-item{
      padding: .2rem 0;
      color: $color-white;
      &.selected{
          cursor: default;
      }
  }
}

.selected-language{
  padding: 5px;
  width: 40px;
  height: 50px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
    &:hover{cursor: pointer;}
  .active-language{
      display: inline-block;
      vertical-align: middle;
      color: $color-white;
      @include transition(color .3s ease-in-out);
  }
  &:hover{
      .active-language{
      color: $color-orange;
      }
  }
}

.language-dropdown{
  position: relative;
  display: inline-block;
  &:hover{cursor: pointer;}
  &.open{
      background-color: $color-orange;
      .active-language {
        color:$color-white;
        &:hover{color:$color-white}
      }
      .select-language{
          display: block;
          height: 60px;
          background-color: $color-orange;
      }
  }
}
</style>