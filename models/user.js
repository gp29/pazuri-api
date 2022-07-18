// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var userSchema = new Schema({
    user_id: {
        type: String,
        default:''
    },
    name: {
        type: String,
        default:''
    },
    email: {
        type: String,
        default:''
    },
    mobile_country_code: {
        type: String,
        default:''
    },
    mobile: {
        type: String,
        default:''
    },
    password: {
        type: String,
        default:''
    },
    username: {
        type: String,
        default:''
    },
    region_id: {
        type: String,
        default:''
    },
    profile_photo: {
        type: String,
        default:''
    },
    device_token: {
        type: String,
        default:''
    },
    status: {
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

// // Execute before each user.save() call
userSchema.pre('save', async function(callback) {
    this.user_id = await idGenerator.generateId('USE'); 
});

var User = mongoose.model('User', userSchema);
module.exports = User;