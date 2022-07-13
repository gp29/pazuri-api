// grab the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const idGenerator = require('./../utils/id-generator');

// create a schema
var complianceSchema = new Schema({
    compliance_id: {
        type: String,
        default:''
    },
    authority_id: {
        type: String,
        default:''
    },
    name: {
        type: String,
        default:''
    },
    description: {
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
complianceSchema.pre('save', async function(callback) {
    this.compliance_id = await idGenerator.generateId('COM'); 
});

var Compliance = mongoose.model('Compliance', complianceSchema);
module.exports = Compliance;