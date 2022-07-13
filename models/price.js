// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var priceSchema = new Schema({
    price_id: {
        type: String,
        default:''
    },
    compliance_id: {
        type: String,
        default:''
    },
    amount: {
        type: String,
        default:''
    },
    inclusive_vat: {
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
priceSchema.pre('save', async function(callback) {
    this.price_id = await idGenerator.generateId('PRI'); 
});

var Price = mongoose.model('Price', priceSchema);
module.exports = Price;