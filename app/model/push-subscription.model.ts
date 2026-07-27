import mongoose, { model } from 'mongoose'

/**
 * One browser's Web Push subscription. A user has one per device/browser, so `endpoint` (the push service's unique
 * URL for that client) is the identity, not `user`. Rows are pruned when the push service reports the endpoint gone.
 */
export const pushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, unique: true },
    // Client-generated ECDH public key + auth secret the payload is encrypted against. Declared as a required
    // subschema rather than a bare nested object so it types as not optional.
    keys: {
      type: new mongoose.Schema(
        { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
        { strict: 'throw', strictQuery: 'throw', _id: false },
      ),
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { strict: 'throw', strictQuery: 'throw', id: false, timestamps: true },
)

const PushSubscription = model('PushSubscription', pushSubscriptionSchema)

export default PushSubscription
