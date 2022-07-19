// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var complySchema = new Schema({
    comply_id: {
        type: String,
        default:''
    },
    compliance_id: {
        type: String,
        default:''
    },
    region_id: {
        type: String,
        default:''
    },
    user_id: {
        type: String,
        default:''
    },
    price: {
        type: String,
        default:''
    },
    status: {
        type: String,
        default:'pending'
    },
    transaction_id: {
        type: String,
        default:''
    },
    paid_status: {
        type: String,
        default:'unpaid'
    },
    expiry_date: {
        type: String,
        default: ''
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
complySchema.pre('save', async function(callback) {
    this.comply_id = await idGenerator.generateId('CPL'); 
});

var Comply = mongoose.model('Comply', complySchema);
module.exports = Comply;