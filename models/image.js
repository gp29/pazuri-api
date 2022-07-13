// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var imageSchema = new Schema({
    image_id: {
        type: String,
        default:''
    },
    name: {
        type: String,
        default:''
    },
    image: {
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
imageSchema.pre('save', async function(callback) {
    this.image_id = await idGenerator.generateId('IMG'); 
});

var Image = mongoose.model('Image', imageSchema);
module.exports = Image;