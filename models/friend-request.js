// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const moment = require('moment');

var friednReqSchema = new Schema({
    request_id: {
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

friednReqSchema.pre('save', async function(callback) {
    this.request_id = await idGenerator.generateId('FRQ'); 
});

var Friend_request = mongoose.model('Friend_request', friednReqSchema);
module.exports = Friend_request;