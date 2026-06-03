import { Schema, model } from 'mongoose'

const mediaSchema = new Schema({ 
    media: String,
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User',
    },
})
const Media = model('Media', mediaSchema);

export default Media
