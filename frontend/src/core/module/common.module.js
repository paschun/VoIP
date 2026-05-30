import { api } from '@/core/services/api.service'
import router from '../../router'
import Vue from 'vue'

// Vuex action names dispatched by components.
export const post = 'post'
export const get = 'get'

const swalError = (text) => Vue.swal.fire({
  title: 'Error',
  text,
  icon: 'error',
  confirmButtonClass: 'btn btn-secondary',
  heightAuto: false
})

const handleError = (err) => {
  if (err.status === 401) {
    swalError(err.data?.error ?? 'Unauthorized Access!')
    Vue.cookie.delete('access_token')
    Vue.cookie.delete('userdata')
    const path = window.location.pathname.split('/')[1]
    router.push(`/${path}/`)
  } else if (err.status === 400) {
    swalError(err.data?.message)
  }
  return false
}

export default {
  actions: {
    [post] (_ctx, request) {
      return api.post(request.url, request.data).catch(handleError)
    },
    [get] (_ctx, request) {
      return api.get(`${request.url}/`).catch(handleError)
    }
  },

  mutations: {
    SET_ERROR (state, error) {
      state.errors = error
    }
  },

  state: {
    panel: []
  },

  getters: {
  }
}
