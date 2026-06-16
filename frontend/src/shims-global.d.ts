// https://vuejs.org/guide/typescript/options-api.html#augmenting-global-properties
// Module augmentation for globals installed on every component instance via `app.config.globalProperties`

export {}

import type Swal from 'sweetalert2'
import type { ApiPost, ApiGet, ApiPut, ApiPatch } from '@/core/api.plugin.ts'

declare module 'vue' {
  interface ComponentCustomProperties {
    // core/api.plugin — see ApiPost/ApiGet/ApiPut/ApiPatch for the contract.
    $post: ApiPost
    $get: ApiGet
    $put: ApiPut
    $patch: ApiPatch

    // vue-sweetalert2's index.d.ts types are written for vue 2, do the vue 3 setup here:
    $swal: typeof Swal
  }
}
