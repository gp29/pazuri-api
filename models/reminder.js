// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var reminderSchema = new Schema({
    reminder_id: {
        type: String,
        default:''
    },
    compliance_id: {
        type: String,
        default:''
    },
    days: {
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
reminderSchema.pre('save', async function(callback) {
    this.reminder_id = await idGenerator.generateId('REM'); 
});

var Reminder = mongoose.model('Reminder', reminderSchema);
module.exports = Reminder;