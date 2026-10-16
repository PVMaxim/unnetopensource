function isEmpty (opt) {
    if (opt === 0) return false
    if (Array.isArray(opt) && opt.length === 0) return true
    return !opt
  }

  function not (fun) {
    return (...params) => !fun(...params)
  }

  function includes (str, query) {
    if (str === undefined) str = 'undefined'
    if (str === null) str = 'null'
    if (str === false) str = 'false'
    const text = str.toString().toLowerCase()
    return text.indexOf(query.trim()) !== -1
  }

  function filterOptions (options, search, label, customLabel) {
    return search ? options
      .filter((option) => includes(customLabel(option, label), search))
      .sort((a, b) => customLabel(a, label).length - customLabel(b, label).length) : options
  }

  function stripGroups (options) {
    return options.filter((option) => !option.$isLabel)
  }

  function flattenOptions (values, label) {
    return (options) =>
      options.reduce((prev, curr) => {
        if (curr[values] && curr[values].length) {
          prev.push({
            $groupLabel: curr[label],
            $isLabel: true
          })
          return prev.concat(curr[values])
        }
        return prev
      }, [])
  }

  function filterGroups (search, label, values, groupLabel, customLabel) {
    return (groups) =>
      groups.map((group) => {
        if (!group[values]) {
          return []
        }
        const groupOptions = filterOptions(group[values], search, label, customLabel)

        return groupOptions.length
          ? {
            [groupLabel]: group[groupLabel],
            [values]: groupOptions
          }
          : []
      })
  }

  const flow = (...fns) => (x) => fns.reduce((v, f) => f(v), x)

  export default {
    data () {
      return {
        search: '',
        isOpen: false,
        preferredOpenDirection: 'below',
        optimizedHeight: this.maxHeight
      }
    },
    props: {
      internalSearch: {
        type: Boolean,
        default: true
      },
      options: {
        type: Array,
        required: true
      },
      multiple: {
        type: Boolean,
        default: false
      },
      trackBy: {
        type: String
      },
      label: {
        type: String
      },
      searchable: {
        type: Boolean,
        default: true
      },
      clearOnSelect: {
        type: Boolean,
        default: true
      },
      hideSelected: {
        type: Boolean,
        default: false
      },
      placeholder: {
        type: String,
        default: 'Select option'
      },
      allowEmpty: {
        type: Boolean,
        default: true
      },
      resetAfter: {
        type: Boolean,
        default: false
      },
      closeOnSelect: {
        type: Boolean,
        default: true
      },
      customLabel: {
        type: Function,
        default (option, label) {
          if (isEmpty(option)) return ''
          return label ? option[label] : option
        }
      },
      taggable: {
        type: Boolean,
        default: false
      },
      tagPlaceholder: {
        type: String,
        default: 'Press enter to create a tag'
      },
      tagPosition: {
        type: String,
        default: 'top'
      },
      max: {
        type: [Number, Boolean],
        default: false
      },
      id: {
        default: null
      },
      optionsLimit: {
        type: Number,
        default: 1000
      },
      groupValues: {
        type: String
      },
      groupLabel: {
        type: String
      },
      groupSelect: {
        type: Boolean,
        default: false
      },
      blockKeys: {
        type: Array,
        default () {
          return []
        }
      },
      preserveSearch: {
        type: Boolean,
        default: false
      },
      preselectFirst: {
        type: Boolean,
        default: false
      },
      preventAutofocus: {
        type: Boolean,
        default: false
      }
    },
    mounted () {
      if (!this.multiple && this.max) {
      }
      if (
        this.preselectFirst &&
        !this.internalValue.length &&
        this.options.length
      ) {
        this.select(this.filteredOptions[0])
      }
    },
    computed: {
      internalValue () {
        return this.modelValue || this.modelValue === 0
          ? Array.isArray(this.modelValue) ? this.modelValue : [this.modelValue]
          : []
      },
      filteredOptions () {
        const search = this.search || ''
        const normalizedSearch = search.toLowerCase().trim()

        let options = this.options.concat()

        if (this.internalSearch) {
          options = this.groupValues
            ? this.filterAndFlat(options, normalizedSearch, this.label)
            : filterOptions(options, normalizedSearch, this.label, this.customLabel)
        } else {
          options = this.groupValues ? flattenOptions(this.groupValues, this.groupLabel)(options) : options
        }

        options = this.hideSelected
          ? options.filter(not(this.isSelected))
          : options

        if (this.taggable && normalizedSearch.length && !this.isExistingOption(normalizedSearch)) {
          if (this.tagPosition === 'bottom') {
            options.push({isTag: true, label: search})
          } else {
            options.unshift({isTag: true, label: search})
          }
        }

        return options.slice(0, this.optionsLimit)
      },
      valueKeys () {
        if (this.trackBy) {
          return this.internalValue.map((element) => element[this.trackBy])
        } else {
          return this.internalValue
        }
      },
      optionKeys () {
        const options = this.groupValues ? this.flatAndStrip(this.options) : this.options
        return options.map((element) => this.customLabel(element, this.label).toString().toLowerCase())
      },
      currentOptionLabel () {
        return this.multiple
          ? this.searchable ? '' : this.placeholder
          : this.internalValue.length
            ? this.getOptionLabel(this.internalValue[0])
            : this.searchable ? '' : this.placeholder
      }
    },
    watch: {
      internalValue: {
        handler () {
          if (this.resetAfter && this.internalValue.length) {
            this.search = ''
            this.$emit('update:modelValue', this.multiple ? [] : null)
          }
        },
        deep: true
      },
      search () {
        this.$emit('search-change', this.search)
      }
    },
    emits: ['open', 'search-change', 'close', 'select', 'update:modelValue', 'remove', 'tag'],
    methods: {
      getValue () {
        return this.multiple
          ? this.internalValue
          : this.internalValue.length === 0
            ? null
            : this.internalValue[0]
      },
      filterAndFlat (options, search, label) {
        return flow(
          filterGroups(search, label, this.groupValues, this.groupLabel, this.customLabel),
          flattenOptions(this.groupValues, this.groupLabel)
        )(options)
      },
      flatAndStrip (options) {
        return flow(
          flattenOptions(this.groupValues, this.groupLabel),
          stripGroups
        )(options)
      },
      updateSearch (query) {
        this.search = query
      },
      isExistingOption (query) {
        return !this.options
          ? false
          : this.optionKeys.indexOf(query) > -1
      },
      isSelected (option) {
        const opt = this.trackBy
          ? option[this.trackBy]
          : option
        return this.valueKeys.indexOf(opt) > -1
      },
      isOptionDisabled (option) {
        return !!option.$isDisabled
      },
      getOptionLabel (option) {
        if (isEmpty(option)) return ''
        if (option.isTag) return option.label
        if (option.$isLabel) return option.$groupLabel

        const label = this.customLabel(option, this.label)
        if (isEmpty(label)) return ''
        return label
      },
      select (option, key) {
        if (option.$isLabel && this.groupSelect) {
          this.selectGroup(option)
          return
        }
        if (this.blockKeys.indexOf(key) !== -1 ||
          this.disabled ||
          option.$isDisabled ||
          option.$isLabel
        ) return
        if (this.max && this.multiple && this.internalValue.length === this.max) return
        if (key === 'Tab' && !this.pointerDirty) return
        if (option.isTag) {
          this.$emit('tag', option.label, this.id)
          this.search = ''
          if (this.closeOnSelect && !this.multiple) this.deactivate()
        } else {
          const isSelected = this.isSelected(option)

          if (isSelected) {
            if (key !== 'Tab') this.removeElement(option)
            return
          }

          if (this.multiple) {
            this.$emit('update:modelValue', this.internalValue.concat([option]))
          } else {
            this.$emit('update:modelValue', option)
          }

          this.$emit('select', option, this.id)

          if (this.clearOnSelect) this.search = ''
        }
        if (this.closeOnSelect) this.deactivate()
      },
      selectGroup (selectedGroup) {
        const group = this.options.find((option) => {
          return option[this.groupLabel] === selectedGroup.$groupLabel
        })

        if (!group) return

        if (this.wholeGroupSelected(group)) {
          this.$emit('remove', group[this.groupValues], this.id)

          const groupValues = this.trackBy ? group[this.groupValues].map(val => val[this.trackBy]) : group[this.groupValues]
          const newValue = this.internalValue.filter(
            option => groupValues.indexOf(this.trackBy ? option[this.trackBy] : option) === -1
          )

          this.$emit('update:modelValue', newValue)
        } else {
          let optionsToAdd = group[this.groupValues].filter(
            option => !(this.isOptionDisabled(option) || this.isSelected(option))
          )

          if (this.max) {
            optionsToAdd.splice(this.max - this.internalValue.length)
          }

          this.$emit('select', optionsToAdd, this.id)
          this.$emit(
            'update:modelValue',
            this.internalValue.concat(optionsToAdd)
          )
        }

        if (this.closeOnSelect) this.deactivate()
      },
      wholeGroupSelected (group) {
        return group[this.groupValues].every((option) => this.isSelected(option) || this.isOptionDisabled(option)
        )
      },
      wholeGroupDisabled (group) {
        return group[this.groupValues].every(this.isOptionDisabled)
      },
      removeElement (option, shouldClose = true) {
        if (this.disabled) return
        if (option.$isDisabled) return
        if (!this.allowEmpty && this.internalValue.length <= 1) {
          this.deactivate()
          return
        }

        const index = typeof option === 'object'
          ? this.valueKeys.indexOf(option[this.trackBy])
          : this.valueKeys.indexOf(option)

        if (this.multiple) {
          const newValue = this.internalValue.slice(0, index).concat(this.internalValue.slice(index + 1))
          this.$emit('update:modelValue', newValue)
        } else {
          this.$emit('update:modelValue', null)
        }
        this.$emit('remove', option, this.id)

        if (this.closeOnSelect && shouldClose) this.deactivate()
      },
      removeLastElement () {
        if (this.blockKeys.indexOf('Delete') !== -1) return
        if (this.search.length === 0 && Array.isArray(this.internalValue) && this.internalValue.length) {
          this.removeElement(this.internalValue[this.internalValue.length - 1], false)
        }
      },
      activate () {
        if (this.isOpen || this.disabled) return

        this.adjustPosition()
        if (this.groupValues && this.pointer === 0 && this.filteredOptions.length) {
          this.pointer = 1
        }

        this.isOpen = true
        if (this.searchable) {
          if (!this.preserveSearch) this.search = ''
          if (!this.preventAutofocus) this.$nextTick(() => this.$refs.search && this.$refs.search.focus())
        } else if (!this.preventAutofocus) {
          if (typeof this.$el !== 'undefined') this.$el.focus()
        }
        this.$emit('open', this.id)
      },
      deactivate () {
        if (!this.isOpen) return

        this.isOpen = false
        if (this.searchable) {
          if (this.$refs.search !== null && typeof this.$refs.search !== 'undefined') this.$refs.search.blur()
        } else {
          if (typeof this.$el !== 'undefined') this.$el.blur()
        }
        if (!this.preserveSearch) this.search = ''
        this.$emit('close', this.getValue(), this.id)
      },
      toggle () {
        this.isOpen
          ? this.deactivate()
          : this.activate()
      },
      adjustPosition () {
        if (typeof window === 'undefined') return

        const spaceAbove = this.$el.getBoundingClientRect().top
        const spaceBelow = window.innerHeight - this.$el.getBoundingClientRect().bottom
        const hasEnoughSpaceBelow = spaceBelow > this.maxHeight

        if (hasEnoughSpaceBelow || spaceBelow > spaceAbove || this.openDirection === 'below' || this.openDirection === 'bottom') {
          this.preferredOpenDirection = 'below'
          this.optimizedHeight = Math.min(spaceBelow - 40, this.maxHeight)
        } else {
          this.preferredOpenDirection = 'above'
          this.optimizedHeight = Math.min(spaceAbove - 40, this.maxHeight)
        }
      }
    }
  }