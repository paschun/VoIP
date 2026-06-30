## Services

A service is a framework-agnostic module that encapsulates one area of business logic or external communication — talking to an API, handling authentication, formatting domain data, and so on. It's plain TypeScript (a class or a set of exported functions) and knows nothing about Vue components, reactivity, or the DOM.

The point is separation of concerns: components decide how things look and respond to user input, while services own what actually happens. Keeping fetch calls, business rules, and third-party integrations out of components keeps the UI layer thin, makes logic reusable across components, composables, and stores, and makes that logic easy to test in isolation.

Architecturally, services sit at the bottom of the data flow. Components and composables call into them, and state stores (e.g. Pinia) use them to load and persist data. A service itself holds no UI state and has no Vue dependencies — that's what distinguishes it from a composable or a store.