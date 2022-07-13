// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var adminSchema = new Schema({
    admin_id: {
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
    mobile: {
        type: String,
        default:''
    },
    password: {
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
adminSchema.pre('save', async function(callback) {
    this.admin_id = await idGenerator.generateId('ADM'); 
});

var Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;