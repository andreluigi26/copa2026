const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    group: {
        type: String,
        required: true
    }
    ,
    flag: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('Team', teamSchema);