import { describe, it, expect, afterEach } from 'vitest'
import { DOMWrapper, mount } from '@vue/test-utils'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

afterEach(() => {
  // vitest does not reset the DOM every test
  document.body.innerHTML = ''
})

describe('LoadingSpinner', () => {
  it('show prop = true/false', async () => {
    const body = new DOMWrapper(document.body)
    const wrapper = mount(LoadingSpinner, { props: { show: true } })
    expect(body.find('.sp-circle').exists()).toBe(true)
    expect(body.find('.app-loader').exists()).toBe(true)
    await wrapper.setProps({ show: false })
    expect(body.find('.app-loader').exists()).toBe(false)
  })
  it('show prop = undefined = false', () => {
    const body = new DOMWrapper(document.body)
    // console.log(body.html())
    expect(body.find('[name="loading-fade"]').exists()).toBe(false)
    mount(LoadingSpinner)
    expect(body.find('.app-loader').exists()).toBe(false)
    expect(body.find('[name="loading-fade"]').exists()).toBe(true)
  })
})
