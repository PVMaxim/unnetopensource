<template>
  <div class="input-box">
    <SearchIcon v-if="dataInput.search.length < 1" />
    <CloseIcon v-if="dataInput.search.length > 0" @click=clearInput />
    <div v-if="attention" class="attention">{{ $t('searchTokens.minChars') }}</div>
    <input
      :name="name"
      :id="name"
      type="text"
      autocomplete="off"
      :spellcheck="false"
      :placeholder="placeholder"
      :disabled="disabled"
      v-model="dataInput.search"
      @input="updateSearch"
      class="search-token-input"
    />
  </div>
</template>

<script>
import { defineComponent, reactive, ref, shallowRef, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { initialManager } from '@/api/ApiHandler';
import { useEventsBus } from '@/plugins/eventBus.js';
import { useDebounceFn } from '@/plugins/utils/useDebounceFn';
import SearchIcon from '@/components/svg/searchIcon.vue';
import CloseIcon from '@/components/svg/closeIcon.vue';

export default defineComponent({
  name: 'SearchTokens',
  emits: ['searchText', 'searchResults', 'update:errorSearch'],
    props: {
      name: {
        type: [String, undefined],
        default: 'search-token-input',
        required: false
      },
      placeholder: {
        type: [String, undefined],
        default: undefined,
        required: false
      },
      errorSearch: {
        type: [String, null],
        default: null,
        required: false
      },
      disabled: {
        type: [Boolean],
        default: false,
        required: false
      },

    },
    components: {
      SearchIcon,
      CloseIcon
    },

    setup(props, { emit }) {
      const { t } = useI18n();
      const dataInput = reactive({
        search: ''
      });
      const attention = computed(() => {
        if (dataInput.search?.trim().length > 0 && dataInput.search?.trim().length < 3) {
          return true;
        }
        return false;
      });
      const data = ref('');
      const searchResults = ref(null);
      const mgr = shallowRef(initialManager());

      const clearInput = () => {
        dataInput.search = '';
        searchResults.value = null;
        emit('update:errorSearch', null )
        emit('searchResults', {
          value: searchResults.value,
          srcEvent: 'searchResults'
        });
        emit('searchText', {
          value: 0,
          srcEvent: 'searchText'
        });
      }

      const updateSearch = useDebounceFn( async() => {
        dataInput.search = dataInput.search?.trim().length > 0 ? dataInput.search?.trim() : '' ;
        emit('update:errorSearch', null )
        emit('searchText', {
          value: dataInput.search,
          srcEvent: 'searchText'
        });
        if (dataInput.search?.trim().length < 3) {
          return;
        }
        const token = shallowRef(null);
        try {
          token.value = await mgr.value.findTokens(dataInput?.search);
        } catch(err) {
          emit('update:errorSearch', t('searchTokens.errorGetData') )
        }
        if ( token.value === undefined || token.value === null ) {
          emit('searchResults', {
            value: null,
            srcEvent: 'searchResults'
          });
          return;
        }

        const response = shallowRef([]);
        for ( const tokenItem of token?.value ) {
          const item = {
            "root": tokenItem.id,
            "symbol": await tokenItem?.getSymbol(),
            "tip3": tokenItem
          };
          response.value.push(item);
        }
        emit('searchResults', {
          value: response.value,
          srcEvent: 'searchResults'
        });
      }, 1000, { maxWait: 5000 });

      useEventsBus().on('rpcProviderChange', (payload) => {
        clearInput();
        mgr.value = initialManager(true);
      });

      return { data, attention, dataInput, searchResults, updateSearch, clearInput }
    }
})
</script>

<style scoped lang="scss">
  .input-box {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    svg {
      position: absolute;
      width: 16px;
      height: 16px;
      right: 12px;
    }
    .closeIcon {
      stroke: $color-gray;
    }
    .search-token-input {
      width: calc(100% - 16px);
      min-width: 150px;
      background-color: $color-black-17 !important;
      border: none;
      border-radius: 10px;
      padding: 12px;
      color: #fff;
      padding-right: 40px;
    }
    .attention {
      position: absolute;
      right: 40px;
      font-size: 12px;
      color: $color-red;
    }
  }
</style>