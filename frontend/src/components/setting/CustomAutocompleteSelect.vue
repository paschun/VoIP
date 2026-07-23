<template>
  <div class="custom-select" @click="toggleDropdown">
    <!-- potentially undefined as a result of the `.find` -->
    <div class="selected-option">
      {{ selectedOption?.[labelProp] }}
    </div>
    <div v-if="showDropdown" class="dropdown">
      <input ref="autocompleteInput" v-model="searchTerm" @input="filterOptions" @focus="showAllOptions" @blur="hideOptions" @keydown="handleKeyDown">
      <ul class="form-group">
        <li
          v-for="(option, index) in filteredOptions"
          :key="option[valueProp]"
          :class="{ highlighted: index === highlightedIndex }"
          @click="selectOption(option)"
        >
          {{ option[labelProp] }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<LK | VK, string>, LK extends string, VK extends string">
import { computed, nextTick, ref, shallowRef, useTemplateRef } from 'vue'

const props = defineProps<{
  options: T[]
  labelProp: LK
  valueProp: VK
}>()
const model = defineModel<T[VK]>()

const autocompleteInput = useTemplateRef<HTMLInputElement>('autocompleteInput')
const searchTerm = ref('')
const filteredOptions = shallowRef<T[]>([])
const showDropdown = ref(false)
const highlightedIndex = ref(-1)

const selectedOption = computed(() => props.options.find((option) => option[props.valueProp] === model.value))

function filterOptions() {
  showDropdown.value = true
  filteredOptions.value = props.options.filter((option) => option[props.labelProp].toLowerCase().includes(searchTerm.value.toLowerCase()))
}
function showAllOptions() {
  showDropdown.value = true
  filteredOptions.value = props.options
}
function hideOptions() {
  setTimeout(() => {
    showDropdown.value = false
  }, 2000)
}
function selectOption(option: T) {
  hideOptions()
  searchTerm.value = option[props.labelProp]
  model.value = option[props.valueProp]
}
function toggleDropdown() {
  showDropdown.value = !showDropdown.value
  if (showDropdown.value) {
    void nextTick(() => autocompleteInput.value?.focus())
  }
}
function highlightNextOption() {
  if (highlightedIndex.value < filteredOptions.value.length - 1) highlightedIndex.value++
}
function highlightPreviousOption() {
  if (highlightedIndex.value > 0) highlightedIndex.value--
}
function selectHighlightedOption() {
  if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredOptions.value.length) {
    const option = filteredOptions.value[highlightedIndex.value]
    if (option) selectOption(option)
  }
}
function handleKeyDown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      highlightNextOption()
      break
    case 'ArrowUp':
      event.preventDefault()
      highlightPreviousOption()
      break
    case 'Enter':
      event.preventDefault()
      selectHighlightedOption()
      break
  }
}
</script>

<style scoped>
.custom-select {
  position: relative;
  display: inline-block;
  width: 100%;
}

.selected-option {
  padding: 8px 20px;
  border: 1px solid #ccc;
  background-color: #fff;
  cursor: pointer;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  background-color: #fff;
  border: 1px solid #ccc;
  border-top: none;
}

input {
  width: 100%;
  padding: 8px;
  border: none;
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

li {
  cursor: pointer;
  padding: 5px;
}

li:hover {
  background-color: #f2f2f2;
}
</style>
