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
        default:'active'
    },
    otp: {
        type: String,
        default:''
    },
    about: {
        type: String,
        default:''
    },
    latitude: {
        type: Number,
        default: 0
    },
    longitude: {
        type: Number,
        default: 0
    },
    location: {
        type: {
            type: String,
            default: "Point"
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
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

userSchema.index({ location: '2dsphere' });

// // Execute before each user.save() call
userSchema.pre('save', async function(callback) {
    this.user_id = await idGenerator.generateId('USE'); 
});

var User = mongoose.model('User', userSchema);
module.exports = User;