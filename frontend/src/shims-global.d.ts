// https://vuejs.org/guide/typescript/options-api.html#augmenting-global-properties
// Module augmentation for globals installed on every component instance via `app.config.globalProperties`

export {}

import type Swal from 'sweetalert2'

declare module 'vue' {
  interface ComponentCustomProperties {
    // vue-sweetalert2's index.d.ts types are written for vue 2, do the vue 3 setup here:
    $swal: typeof Swal
  }
}
