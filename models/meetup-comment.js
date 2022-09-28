// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var meetupCommentSchema = new Schema({
    comment_id: {
        type: String,
        default:''
    },
    meetup_id: {
        type: String,
        default:''
    },
    user_id: {
        type: String,
        default:''
    },
    type: {
        type: String,
        default:''
    },
    msg: {
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
meetupCommentSchema.pre('save', async function(callback) {
    this.comment_id = await idGenerator.generateId('CMT'); 
});

var Meetup_comment = mongoose.model('Meetup_comment', meetupCommentSchema);
module.exports = Meetup_comment;