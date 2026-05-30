// Lets TypeScript understand `import X from './Foo.vue'`.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // Loose generic args — fine for Options-API SFCs during migration.
  const component: DefineComponent<{}, {}, any>
  export default component
}
