const db_uri = process.env.DB;
import mongoose from 'mongoose'
mongoose.connect(db_uri);
export default mongoose