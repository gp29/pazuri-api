'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const _ = require('underscore');
const moment = require('moment');
const timeZone = require('moment-timezone');

const getStatistics = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let total_users = await query.countRecord(dbConstants.dbSchema.users, {});
            let total_compliances = await query.countRecord(dbConstants.dbSchema.compliances, {});

            // FOR THIS MONTH COMPLIANCES
            let start = moment().startOf('month').toDate();
            start = moment(start).format('YYYY-MM-DD')
            let end = moment().endOf('month').toDate();
            end = moment(end).format('YYYY-MM-DD')
            let matchColumn = {
                created_at: {
                    $lte: new Date(end + 'T23:59:59.000Z'),
                    $gte: new Date(start + 'T00:00:00.000Z')
                }
            }
            let total_compliances_this_month = await query.countRecord(dbConstants.dbSchema.compliances, matchColumn);
            resolve({total_users, total_compliances, total_amount_this_month:0, total_compliances_this_month})
            return;
            resolve(response);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

module.exports = {
    getStatistics
};