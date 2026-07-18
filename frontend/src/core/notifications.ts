/** Desktop-notify an incoming message, requesting Notification permission on first use. */
export async function showMessageNotification(number: string, message: string): Promise<void> {
  if (!('Notification' in window)) {
    alert('This browser does not support desktop notification')
    return
  }
  if (Notification.permission === 'denied') return
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') return
  const icon = new URL('@/assets/img/icon.png', import.meta.url).href
  new Notification('Message from ' + number, { body: message, dir: 'auto', icon })
}
