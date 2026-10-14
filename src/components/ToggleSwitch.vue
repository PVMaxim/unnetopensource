<template>
  <div class="toggle-switch-group">
    <ul
      class="toggle-switch"
      :class="{'square' : defaultOptions.layout.squareCorners}"
    >
      <li
        v-for="(item, index) in defaultOptions.config.items"
        :style="itemStyle(item)"
        :key="index"
      >
        <input
          :disabled="defaultOptions.config.disabled || disabled"
          :id="item.value + group" :value="item.value"
          :name="name"
          :class="{ active: !defaultOptions.config.disabled || disabled}"
          type="radio"
          v-on:click="toggle"
        >
        <label
          v-if="item.value === selectedItem"
          :style="labelStyleSelected(item)"
          :class="{ active: !defaultOptions.config.disabled || disabled}"
          class="selected"
          :for="item.value + group"
          type="radio"
          
        >
          {{ item.name }}
        </label>
        <label
          v-else
          :style="labelStyle(item)"
          :class="{active: !defaultOptions.config.disabled || disabled}"
          :for="item.value + group"
          type="radio"
        >
          {{ item.name }}
        </label>
      </li>
    </ul>
  </div>
</template>

<script>

import { defineComponent, onMounted, computed, ref, reactive } from 'vue'
const rem = v => v + 'rem'

export default defineComponent({
name: 'ToggleSwitch',
emits: ['update:selectedSwitch', 'change', 'selected', 'input'],
props: {
  selectedSwitch: {
    type: [String, null],
    required: false,
  },
  options: {
    type: Object,
    required: false,
  },
  name: {
    type: String,
    required: false
  },
  group: {
    type: String,
    required: false,
    default: ''
  },
  disabled: {
    type: Boolean,
    required: false,
    default: false
  }
},

setup(props, { emit }) {
  const selected = ref(false);
  const selectedItem = ref('unknown');
  const defaultOptions = reactive({
    layout: {
      color: 'black',
      backgroundColor: 'lightgray',
      selectedColor: 'white',
      selectedBackgroundColor: 'green',
      borderColor: 'gray',
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fontWeightSelected: 'bold',
      squareCorners: false,
      noBorder: false
    },
    size: {
      fontSize: 1.5,
      height: 3.25,
      padding: 0.5,
      width: 10
    },
    config: {
      preSelected: 'unknown',
      disabled: false,
      items: [
        { name: 'Off', value: "Off", color: 'white', backgroundColor: 'red' },
        { name: 'On', value: "On", color: 'white', backgroundColor: 'green' }
      ]
    }
  });

  const layout = computed(() => {
  })

  const toggleSwitchStyle = computed(() => {
    return {
      width: rem(defaultOptions.size.width),
      height: rem(defaultOptions.size.height)
    }
  });

  const itemStyle = (item) => {
    const style = ref([]);
    item?.width ? style['width'] = item?.width : null;
    item?.height ? style['height'] = item?.height : null;
    item?.borderColor ? style['borderColor'] = item?.borderColor : null;
    return  style;
  };

  const labelStyle = (item) => {
    const style = ref([]);
      item?.padding ? style['padding'] = item?.padding : null;
      item?.borderColor ? style['borderColor'] = item?.borderColor : null;
      item?.fontWeight ? style['fontWeight'] = item?.fontWeight : null;
      defaultOptions?.layout?.backgroundColor ? style['backgroundColor'] = defaultOptions?.layout?.backgroundColor : null;
      item?.color ? style['color'] = item?.color : null;
      return style;
  };

  const labelStyleSelected = (item) => {
    const style = ref([]);
    item?.padding ? style['padding'] = item?.padding : null;
    item?.borderColor ? style['borderColor'] = item?.borderColor : null;
    item?.fontWeight ? style['fontWeight'] = item?.fontWeight : null;
    item?.backgroundColor ? style['backgroundColor'] = item?.backgroundColor : defaultOptions?.layout?.selectedBackgroundColor ? style['backgroundColor'] = defaultOptions?.layout?.selectedBackgroundColor : null;
    item?.color ? style['color'] = item?.color : null;
    return style;
  };

  const toggle = async (event) => {
    if (!defaultOptions.config.disabled) {
      selected.value = true
      selectedItem.value = event.target.id.replace(props.group, '')
      emit('selected', selected.value)
      emit('update:selectedSwitch', event.target.id.replace(props.group, ''))
      emit('input', selectedItem.value)
      emit('change', {
        value: event.target.id.replace(props.group, ''),
        srcEvent: event
      })
    }
  };

  const mergeDefaultOptionsWithProp = async (options) => {
    var result = defaultOptions
    for (var option in options) {
      if (options[option] !== null && typeof (options[option]) === 'object') {
        for (var subOption in options[option]) {
          if (options[option][subOption] !== undefined && options[option][subOption] !== null) {
            result[option][subOption] = options[option][subOption]
          }
        }
      } else {
        result[option] = options[option]
      }
    }
  }

  onMounted(async () => {
    if (props.options !== null && props.options !== undefined) {
      await mergeDefaultOptionsWithProp(props.options)
    }
    if (defaultOptions.config.preSelected !== 'unknown') {
      selectedItem.value = defaultOptions.config.preSelected
      emit('update:selectedSwitch', selectedItem.value)
      emit('input', selectedItem.value)
    } else if (props.selectedSwitch) {
      selectedItem.value = props.selectedSwitch
      emit('update:selectedSwitch', selectedItem.value)
      emit('input', selectedItem.value)
    }
  });

  return { defaultOptions, toggleSwitchStyle, itemStyle, labelStyleSelected, props, toggle, labelStyle, selectedItem }
}
  
})
</script>
<style scoped lang="scss">
.toggle-switch-group {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-content: center;
  justify-content: center;
  width: 100%;
.toggle-switch {
  list-style: none;
  padding: 0;
  margin: 0;
  display: -webkit-inline-box;
  display: -ms-inline-flexbox;
  display: inline-flex;
  border: 1px solid $color-black-40;
  background-color: $color-black-23;
  border-radius: 25px;

    &.square {
      &:first-of-type label {
        border-radius: 25px 0 0 25px;
      }

      &:last-of-type label {
        border-radius: 0 25px 25px 0;
      }

    }
}
input[type="radio"] {
  display: none;
}
label {
  display: block;
  text-align: center;
  cursor: pointer;
  margin: 0;

  &.selected {
    cursor: default;
    border-radius: 25px 25px 25px 25px !important;
  }
}
}
</style>