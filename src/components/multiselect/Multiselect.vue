<template>
    <div
      :tabindex="searchable ? -1 : tabindex"
      :class="{ 'multiselect--active': isOpen, 'multiselect--disabled': disabled, 'multiselect--above': isAbove, 'multiselect--has-options-group': hasOptionGroup }"
      @focus="activate()"
      @blur="searchable ? false : deactivate()"
      @keydown.self.down.prevent="pointerForward()"
      @keydown.self.up.prevent="pointerBackward()"
      @keypress.enter.tab.stop.self="addPointerElement($event)"
      @keyup.esc="deactivate()"
      class="multiselect"
      role="combobox"
      :aria-owns="'listbox-'+id">
      <slot name="caret" :toggle="toggle">
        <div @mousedown.prevent.stop="toggle()" class="multiselect__select"><span class="multiselect__arrow"></span></div>
      </slot>
      <slot name="clear" :search="search"></slot>
      <div ref="tags" class="multiselect__tags">
        <slot
          name="selection"
          :search="search"
          :remove="removeElement"
          :values="visibleValues"
          :is-open="isOpen"
        >
          <div class="multiselect__tags-wrap" v-show="visibleValues.length > 0">
            <template v-for="(option, index) of visibleValues">
              <slot name="tag" :option="option" :search="search" :remove="removeElement">
                <span class="multiselect__tag" :key="index">
                  <span v-text="getOptionLabel(option)"></span>
                  <i tabindex="1" @keypress.enter.prevent="removeElement(option)"
                     @mousedown.prevent="removeElement(option)" class="multiselect__tag-icon"></i>
                </span>
              </slot>
            </template>
          </div>
          <template v-if="internalValue && internalValue.length > limit">
            <slot name="limit">
              <strong class="multiselect__strong" v-text="limitText(internalValue.length - limit)"/>
            </slot>
          </template>
        </slot>
        <transition name="multiselect__loading">
          <slot name="loading">
            <Loading v-if="loading" />
          </slot>
        </transition>
        <input
          ref="search"
          v-if="searchable"
          :name="name"
          :id="id"
          type="text"
          autocomplete="off"
          :spellcheck="false"
          :placeholder="placeholder"
          :style="inputStyle"
          :value="search"
          :disabled="disabled"
          :tabindex="tabindex"
          @input="updateSearch($event.target.value)"
          @focus.prevent="activate()"
          @blur.prevent="deactivate()"
          @keyup.esc="deactivate()"
          @keydown.down.prevent="pointerForward()"
          @keydown.up.prevent="pointerBackward()"
          @keypress.enter.prevent.stop.self="addPointerElement($event)"
          @keydown.delete.stop="removeLastElement()"
          class="multiselect__input"
          :aria-controls="'listbox-'+id"
        />
        <span
          v-if="isSingleLabelVisible && !loading"
          class="multiselect__single"
          @mousedown.prevent="toggle"
        >
          <slot name="singleLabel" :option="singleValue">
            {{ currentOptionLabel }}
          </slot>
        </span>
        <span
          v-if="isPlaceholderVisible && !loading"
          class="multiselect__placeholder"
          @mousedown.prevent="toggle"
        >
          <slot name="placeholder">
            {{ placeholder }}
          </slot>
        </span>
      </div>
      <transition name="multiselect">
        <div
          class="multiselect__content-wrapper"
          v-show="isOpen"
          @focus="activate"
          tabindex="-1"
          @mousedown.prevent
          :style="{ maxHeight: optimizedHeight + 'px' }"
          ref="list"
        >
          <ul class="multiselect__content" :style="contentStyle" role="listbox" :id="'listbox-'+id">
            <slot name="beforeList"></slot>
            <li v-if="multiple && max === internalValue.length">
              <span class="multiselect__option">
                <slot name="maxElements">Maximum of {{ max }} options selected. First remove a selected option to select another.</slot>
              </span>
            </li>
            <template v-if="!max || internalValue.length < max">
              <li class="multiselect__element"
                  v-for="(option, index) of filteredOptions"
                  :key="getOptionKey(option, index)"
                  v-bind:id="id + '-' + index"
                  v-bind:role="!(option && (option.$isLabel || option.$isDisabled)) ? 'option' : null">
                <span
                  v-if="!(option && (option.$isLabel || option.$isDisabled))"
                  :class="optionHighlight(index, option)"
                  @click.stop="select(option)"
                  @mouseenter.self="pointerSet(index)"
                  :data-select="option && option.isTag ? tagPlaceholder : selectLabelText"
                  :data-selected="selectedLabelText"
                  :data-deselect="deselectLabelText"
                  class="multiselect__option">
                  <slot name="option" :option="option" :search="search" :index="index">
                    <span>{{ getOptionLabel(option) }}</span>
                  </slot>
                </span>
                <span
                  v-if="option && (option.$isLabel || option.$isDisabled)"
                  :data-select="groupSelect && selectGroupLabelText"
                  :data-deselect="groupSelect && deselectGroupLabelText"
                  :class="groupHighlight(index, option)"
                  @mouseenter.self="groupSelect && pointerSet(index)"
                  @mousedown.prevent="selectGroup(option)"
                  class="multiselect__option">
                  <slot name="option" :option="option" :search="search" :index="index">
                    <span>{{ getOptionLabel(option) }}</span>
                  </slot>
                </span>
                <slot name="multiselectElementSeparator" :option="option" :index="index"></slot>
              </li>
            </template>
            <li v-show="showNoResults && (filteredOptions.length === 0 && search && !loading)">
              <span class="multiselect__option">
                <slot name="noResult" :search="search">No elements found. Consider changing the search query.</slot>
              </span>
            </li>
            <li v-show="showNoOptions && ((options.length === 0 || (hasOptionGroup === true && filteredOptions.length === 0)) && !search && !loading)">
              <span class="multiselect__option">
                <slot name="noOptions">List is empty.</slot>
              </span>
            </li>
            <slot name="afterList"></slot>
          </ul>
        </div>
      </transition>
    </div>
  </template>
  
  <script>
  import multiselectMixin from './multiselectMixin'
  import pointerMixin from './pointerMixin'
  import Loading from '@/components/Loading.vue';
  
  export default {
    name: 'vue-multiselect',
    mixins: [multiselectMixin, pointerMixin],
    components: {
      Loading
    },
    compatConfig: {
      MODE: 3,
      ATTR_ENUMERATED_COERCION: false
    },
    props: {
      name: {
        type: String,
        default: ''
      },
      modelValue: {
        type: null,
        default () {
          return []
        }
      },
      selectLabel: {
        type: String,
        default: 'Press enter to select'
      },
      selectGroupLabel: {
        type: String,
        default: 'Press enter to select group'
      },
      selectedLabel: {
        type: String,
        default: 'Selected'
      },
      deselectLabel: {
        type: String,
        default: 'Press enter to remove'
      },
      deselectGroupLabel: {
        type: String,
        default: 'Press enter to deselect group'
      },
      showLabels: {
        type: Boolean,
        default: true
      },
      limit: {
        type: Number,
        default: 99999
      },
      maxHeight: {
        type: Number,
        default: 300
      },
      limitText: {
        type: Function,
        default: (count) => `and ${count} more`
      },
      loading: {
        type: Boolean,
        default: false
      },
      disabled: {
        type: Boolean,
        default: false
      },
      openDirection: {
        type: String,
        default: ''
      },
      showNoOptions: {
        type: Boolean,
        default: true
      },
      showNoResults: {
        type: Boolean,
        default: true
      },
      tabindex: {
        type: Number,
        default: 0
      }
    },
    computed: {
      hasOptionGroup () {
        return this.groupValues && this.groupLabel && this.groupSelect
      },
      isSingleLabelVisible () {
        return (
          (this.singleValue || this.singleValue === 0) &&
            (!this.isOpen || !this.searchable) &&
            !this.visibleValues.length
        )
      },
      isPlaceholderVisible () {
        return !this.internalValue.length && (!this.searchable || !this.isOpen)
      },
      visibleValues () {
        return this.multiple ? this.internalValue.slice(0, this.limit) : []
      },
      singleValue () {
        return this.internalValue[0]
      },
      deselectLabelText () {
        return this.showLabels ? this.deselectLabel : ''
      },
      deselectGroupLabelText () {
        return this.showLabels ? this.deselectGroupLabel : ''
      },
      selectLabelText () {
        return this.showLabels ? this.selectLabel : ''
      },
      selectGroupLabelText () {
        return this.showLabels ? this.selectGroupLabel : ''
      },
      selectedLabelText () {
        return this.showLabels ? this.selectedLabel : ''
      },
      inputStyle () {
        if (
          this.searchable ||
            (this.multiple && this.modelValue && this.modelValue.length)
        ) {
          return this.isOpen
            ? {width: '100%'}
            : {width: '0', position: 'absolute', padding: '0'}
        }
        return ''
      },
      contentStyle () {
        return this.options.length
          ? {display: 'inline-block'}
          : {display: 'block'}
      },
      isAbove () {
        if (this.openDirection === 'above' || this.openDirection === 'top') {
          return true
        } else if (
          this.openDirection === 'below' ||
            this.openDirection === 'bottom'
        ) {
          return false
        } else {
          return this.preferredOpenDirection === 'above'
        }
      },
      showSearchInput () {
        return (
          this.searchable &&
            (this.hasSingleSelectedSlot &&
              (this.visibleSingleValue || this.visibleSingleValue === 0)
              ? this.isOpen
              : true)
        )
      }
    },
    methods: {
      getOptionKey (option, index) {
        if (!option) return index
        if (typeof option === 'object') {
          if (this.trackBy && option[this.trackBy] !== undefined) {
            return option[this.trackBy]
          }
          if (option.id !== undefined) return option.id
          if (option.name !== undefined) return option.name
        }
        return option
      }
    }
  }
  </script>
  
  <style>
  
    fieldset[disabled] .multiselect {
      pointer-events: none;
    }
  
    .multiselect__loading-enter-active,
    .multiselect__loading-leave-active {
      transition: opacity 0.4s ease-in-out;
      opacity: 1;
    }
  
    .multiselect__loading-enter,
    .multiselect__loading-leave-active {
      opacity: 0;
    }
  
    .multiselect,
    .multiselect__input,
    .multiselect__single {
      font-family: inherit;
      font-size: 16px;
      touch-action: manipulation;
    }
  
    .multiselect {
      box-sizing: content-box;
      display: block;
      position: relative;
      width: 100%;
      min-height: 40px;
      text-align: left;
      color: #35495e;
    }
  
    .multiselect * {
      box-sizing: border-box;
    }
  
    .multiselect:focus {
      outline: none;
    }
  
    .multiselect--disabled {
      background: #ededed;
      pointer-events: none;
      opacity: 0.6;
    }
  
    .multiselect--active {
      z-index: 50;
    }
  
  
  
    .multiselect--above.multiselect--active .multiselect__current,
    .multiselect--above.multiselect--active .multiselect__input,
    .multiselect--above.multiselect--active .multiselect__tags {
      border-top-left-radius: 0;
      border-top-right-radius: 0;
    }
  
    .multiselect__input,
    .multiselect__single {
      position: relative;
      display: inline-block;
      min-height: 20px;
      line-height: 20px;
      border: none;
      border-radius: 8px;
      background: #fff;
      padding: 0 0 0 5px;
      width: calc(100%);
      transition: border 0.1s ease;
      box-sizing: border-box;
      margin-bottom: 8px;
      vertical-align: top;
    }
  
    .multiselect__input::placeholder {
      color: #35495e;
    }
  
    .multiselect__tag ~ .multiselect__input,
    .multiselect__tag ~ .multiselect__single {
      width: auto;
    }
  
    .multiselect__input:hover,
    .multiselect__single:hover {
      border-color: #cfcfcf;
    }
  
    .multiselect__input:focus,
    .multiselect__single:focus {
      border-color: #a8a8a8;
      outline: none;
    }
  
    .multiselect__single {
      padding-left: 2px;
      margin-bottom: 8px;
    }
  
    .multiselect__tags-wrap {
      display: inline;
    }
  
    .multiselect__tags {
      min-height: 40px;
      display: block;
      padding: 8px 40px 0 8px;
      border-radius: 8px;
      border: 1px solid #e8e8e8;
      background: #fff;
      font-size: 14px;
    }
  
    .multiselect__tag {
      position: relative;
      display: inline-block;
      padding: 4px 26px 4px 10px;
      border-radius: 5px;
      margin-right: 10px;
      color: #fff;
      line-height: 1;
      background: #41b883;
      margin-bottom: 5px;
      white-space: nowrap;
      overflow: hidden;
      max-width: 100%;
      text-overflow: ellipsis;
    }
  
    .multiselect__tag-icon {
      cursor: pointer;
      margin-left: 7px;
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      font-weight: 700;
      font-style: initial;
      width: 22px;
      text-align: center;
      line-height: 22px;
      transition: all 0.2s ease;
      border-radius: 5px;
    }
  
    .multiselect__tag-icon::after {
      content: "×";
      color: #266d4d;
      font-size: 14px;
    }
  
  
    .multiselect__tag-icon:focus::after,
    .multiselect__tag-icon:hover::after {
      color: white;
    }
  
    .multiselect__current {
      line-height: 16px;
      min-height: 40px;
      box-sizing: border-box;
      display: block;
      overflow: hidden;
      padding: 8px 12px 0;
      padding-right: 30px;
      white-space: nowrap;
      margin: 0;
      text-decoration: none;
      border-radius: 5px;
      border: 1px solid #e8e8e8;
      cursor: pointer;
    }
  
    .multiselect__select {
      line-height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      box-sizing: border-box;
      width: 40px;
      height: 38px;
      right: 1px;
      top: 1px;
      padding: 4px 8px;
      margin: 0;
      text-decoration: none;
      text-align: center;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    
    .multiselect__arrow {
      width: 13px;
      height: 13px;
      display: inline-block;
      position: relative;
      transition: 0.4s ease;
      text-align: left;
    }

    .multiselect__arrow:after {
      transform: rotate(-50deg);
      top: 5px;
      left: 3px;
    }

    .multiselect__arrow:before {
      transform: rotate(50deg);
      top: 5px;
      left: -3px;
    }

    .multiselect__arrow:before, .multiselect__arrow:after {
      position: absolute;
      content: "";
      display: inline-block;
      width: 10px;
      height: 2px;
      background-color: #fff;
      transition: 0.4s ease;
    }

    .multiselect--active .multiselect__select .multiselect__arrow {
      transform: rotate(45deg);
    }
    .multiselect--active .multiselect__select .multiselect__arrow:before {
      transform: rotate(180deg) translate(-3px, 0px);
      width: 12px;
    }
    .multiselect--active .multiselect__select .multiselect__arrow:after {
      transform: rotate(90deg) translate(5px, 0);
      width: 12px;
      top: 0px;
      left: 0px;
    }
    .multiselect--active .multiselect__select ul {
      opacity: 0.3;
      height: 108px;
    }
  
  
    .multiselect__placeholder {
      color: #adadad;
      display: inline-block;
      margin-bottom: 10px;
      padding-top: 2px;
    }
  
    .multiselect--active .multiselect__placeholder {
      display: none;
    }
  
    .multiselect__content-wrapper {
      position: absolute;
      display: block;
      background: #fff;
      width: 100%;
      max-height: 240px;
      overflow: auto;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      border-top: none;
      border-bottom-left-radius: 5px;
      border-bottom-right-radius: 5px;
      z-index: 50;
      -webkit-overflow-scrolling: touch;
    }

    .select-provider .multiselect__content-wrapper {
      position: absolute;
    }
  
    .multiselect__content {
      list-style: none;
      display: inline-block;
      padding: 0;
      margin: 0;
      min-width: 100%;
      vertical-align: top;
    }
  
    .multiselect--above .multiselect__content-wrapper {
      bottom: 100%;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-top-left-radius: 5px;
      border-top-right-radius: 5px;
      border-bottom: none;
      border-top: 1px solid #e8e8e8;
    }
  
    .multiselect__content::-webkit-scrollbar {
      display: none;
    }
  
    .multiselect__element {
      display: block;
    }
  
    .multiselect__option {
      display: block;
      padding: 12px;
      min-height: 40px;
      line-height: 16px;
      text-decoration: none;
      text-transform: none;
      vertical-align: middle;
      position: relative;
      cursor: pointer;
      white-space: nowrap;
    }
  
    .multiselect__option::after {
      top: 0;
      right: 0;
      position: absolute;
      line-height: 40px;
      padding-right: 12px;
      padding-left: 20px;
      font-size: 13px;
    }
  
    .multiselect__option--highlight {
      background: #41b883;
      outline: none;
      color: white;
    }
  
    .multiselect__option--highlight::after {
      content: attr(data-select);
      background: #41b883;
      color: white;
    }
  
    .multiselect__option--selected {
      background: #f3f3f3;
      color: #35495e;
      font-weight: bold;
    }
  
    .multiselect__option--selected::after {
      content: attr(data-selected);
      color: silver;
    background: inherit;
    }
  
    .multiselect__option--selected.multiselect__option--highlight {
      background: #ff6a6a;
      color: #fff;
    }
  
    .multiselect__option--selected.multiselect__option--highlight::after {
      background: #ff6a6a;
      content: attr(data-deselect);
      color: #fff;
    }
  
    .multiselect--disabled .multiselect__current,
    .multiselect--disabled .multiselect__select {
      background: #ededed;
      color: #a6a6a6;
    }
  
    .multiselect__option--disabled {
      color: rgba(136, 136, 136, 1);
      cursor: text;
      pointer-events: none;
    }
  
    .multiselect__option--group {
      background: #ededed;
      color: #35495e;
    }
  
    .multiselect__option--group.multiselect__option--highlight {
      background: #35495e;
      color: #fff;
    }
  
    .multiselect__option--group.multiselect__option--highlight::after {
      background: #35495e;
    }
  
    .multiselect__option--disabled.multiselect__option--highlight {
    }
  
    .multiselect__option--group-selected.multiselect__option--highlight {
      background: #ff6a6a;
      color: #fff;
    }
  
    .multiselect__option--group-selected.multiselect__option--highlight::after {
      background: #ff6a6a;
      content: attr(data-deselect);
      color: #fff;
    }
  
    .multiselect-enter-active,
    .multiselect-leave-active {
      transition: all 0.15s ease;
    }
  
    .multiselect-enter,
    .multiselect-leave-active {
      opacity: 0;
    }
  
    .multiselect__strong {
      margin-bottom: 8px;
      line-height: 20px;
      display: inline-block;
      vertical-align: top;
    }
  
    *[dir="rtl"] .multiselect {
      text-align: right;
    }
  
    *[dir="rtl"] .multiselect__select {
      right: auto;
      left: 1px;
    }
  
    *[dir="rtl"] .multiselect__tags {
      padding: 8px 8px 0 40px;
    }
  
    *[dir="rtl"] .multiselect__content {
      text-align: right;
    }
  
    *[dir="rtl"] .multiselect__option::after {
      right: auto;
      left: 0;
    }
  
    *[dir="rtl"] .multiselect__clear {
      right: auto;
      left: 12px;
    }
  
    *[dir="rtl"] .multiselect__spinner {
      right: auto;
      left: 1px;
    }
  
    @keyframes spinning {
      from {
        transform: rotate(0);
      }
  
      to {
        transform: rotate(2turn);
      }
    }
  </style>

<style scoped lang="scss">
  :deep(.loader) {
    width: 26px;
    height: 26px;
    border-width: 6px;
  }
</style>