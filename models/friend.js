// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const moment = require('moment');

var friendSchema = new Schema({
    friend_id: {
        type: String,
        default:''
    },
    user_id: {
        type: String,
        default: ''
    },
    opponent_user_id: {
        type: String,
        default:''
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

friendSchema.pre('save', async function(callback) {
    this.friend_id = await idGenerator.generateId('FRI'); 
});

var Friend = mongoose.model('Friend', friendSchema);
module.exports = Friend;