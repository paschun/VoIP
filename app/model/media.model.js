import mongoose from 'mongoose'

const Media = mongoose.model('Media', { 
    media: String,
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
});


export default Media