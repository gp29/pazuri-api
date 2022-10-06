// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var meetupSchema = new Schema({
    meetup_id: {
        type: String,
        default:''
    },
    user_id: {
        type: String,
        default:''
    },
    category_id: {
        type: String,
        default:''
    },
    type: {
        type: String,
        default:''
    },
    limit: {
        type: Number,
        default:0
    },
    amount: {
        type: Number,
        default:0
    },
    friend_ids: {
        type: Array,
        default:[]
    },
    title: {
        type: String,
        default:''
    },
    description: {
        type: String,
        default:''
    },
    date: {
        type: String,
        default:''
    },
    time: {
        type: String,
        default:''
    },
    duration: {
        type: String,
        default:''
    },
    location: {
        type: String,
        default:''
    },
    photo: {
        type: String,
        default:''
    },
    accepted: {
        type: Array,
        default:[]
    },
    rejected: {
        type: Array,
        default:[]
    },
    status: {
        type: String,
        default:'active'
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
meetupSchema.pre('save', async function(callback) {
    this.meetup_id = await idGenerator.generateId('MET'); 
});

var Meetup = mongoose.model('Meetup', meetupSchema);
module.exports = Meetup;