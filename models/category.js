// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var categorySchema = new Schema({
    category_id: {
        type: String,
        default:''
    },
    title: {
        type: String,
        default:''
    },
    status: {
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
categorySchema.pre('save', async function(callback) {
    this.category_id = await idGenerator.generateId('CAT'); 
});

var Category = mongoose.model('Category', categorySchema);
module.exports = Category;