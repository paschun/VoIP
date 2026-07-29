import { useToggle } from 'bootstrap-vue-next'

/** Id of the responsive sidebar offcanvas in DashboardView. */
export const MOBILE_SIDEBAR_ID = 'mobile-sidebar'

/** Closes the sidebar drawer from anywhere in the dashboard. No-op at/above `sm`, where the sidebar renders inline. */
export function useMobileSidebar() {
  const { hide } = useToggle(MOBILE_SIDEBAR_ID)
  return {
    closeSidebar: (): void => {
      void hide()
    },
  }
}
