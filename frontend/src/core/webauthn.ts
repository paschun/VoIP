import { notifyError } from '@/core/notify.ts'

/** Runs a WebAuthn ceremony; toasts and returns null if the user cancels or no usable credential comes back. */
export async function requestPublicKeyCredential(
  ceremony: () => Promise<Credential | null>,
): Promise<PublicKeyCredential | null> {
  let credential: Credential | null
  try {
    credential = await ceremony()
  } catch (error) {
    console.error(error)
    void notifyError('Failed to get credentials from user', 'Key Error!')
    return null
  }
  if (!(credential instanceof PublicKeyCredential)) {
    void notifyError('No credential was returned', 'Key Error!')
    return null
  }
  return credential
}
