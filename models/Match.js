const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    group: {
        type: String,
        required: true},
    date: {
        type: String,
    },
    homeTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    awayTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    homeScore: {
        type: Number,
        default: null},
    awayScore: {
        type: Number,
        default: null},
        local: {
        type: String}
    ,
    nextMatch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match'
    },
    nextSlot: {
        type: String,
        enum: ['home','away']
    }
    ,
    penaltiesHome: {
        type: Number,
        default: null
    },
    penaltiesAway: {
        type: Number,
        default: null
    },
    decidedByPenalties: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Match', matchSchema);