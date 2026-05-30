// Module augmentation for globals installed on every component instance.
// Without this, `this.$post`, `this.$cookie`, etc. would error once a
// component becomes `<script lang="ts">`.
//
// The bare `import 'vue'` makes this file a module (required for augmentation).
import 'vue'

declare module 'vue/types/vue' {
  interface Vue {
    // core/api.plugin — resolve to the parsed body on success, or `false` on
    // failure (401/400 are swallowed there). Guard on a falsy return.
    // Pass a contract type to get a typed response: `this.$post<ApiEnvelope<Foo>>(url)`.
    // Default `T = any` keeps untyped call sites returning `any`.
    $post<T = any>(url: string, data?: unknown): Promise<T | false>
    $get<T = any>(url: string): Promise<T | false>

    // vue-cookie (no bundled types).
    $cookie: {
      get(name: string): string | null
      set(
        name: string,
        value: string,
        opts?: number | string | Record<string, unknown>
      ): void
      delete(name: string): void
    }

    // vuelidate 0.7 types are poor; kept loose for the migration.
    // Tighten per-form later (e.g. typed `Validation` shapes) if desired.
    $v: any

    // vue-moment — proxies the `moment` factory.
    $moment: (...args: any[]) => any

    // vue-moment also registers a global `moment` filter (`{{ x | moment(...) }}`).
    // vue-tsc resolves the filter to this instance member; type-only (at runtime
    // Vue 2's filter mechanism handles it).
    moment: (...args: any[]) => any

    // NOTE: `$swal` is contributed by vue-sweetalert2's own types. If, once you
    // convert a component, `this.$swal` is reported as unknown, uncomment:
    // $swal: typeof import('sweetalert2').default
  }

  // Static side (used by core/api.plugin: `Vue.swal`, `Vue.cookie`).
  interface VueConstructor {
    swal: typeof import('sweetalert2').default
    cookie: Vue['$cookie']
  }
}
