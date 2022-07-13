// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var authoritySchema = new Schema({
    authority_id: {
        type: String,
        default:''
    },
    name: {
        type: String,
        default:''
    },
    contact_person: {
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
authoritySchema.pre('save', async function(callback) {
    this.authority_id = await idGenerator.generateId('AUT'); 
});

var Authority = mongoose.model('Authority', authoritySchema);
module.exports = Authority;