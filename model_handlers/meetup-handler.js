'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const meetup = require('./../models/meetup');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const LD = require('lodash');
const moment = require('moment');
const timeZone = require('moment-timezone');
const imgHandler = require('./../model_handlers/image-handler');

const getSort = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnAndValue = {}
            if(requestParam.text && requestParam.text !=''){
                columnAndValue['$or'] = [{
                    meetup_id: new RegExp(requestParam.text, 'i')
                }, {
                    title: new RegExp(requestParam.text, 'i')
                }, {
                    description: new RegExp(requestParam.text, 'i')
                }, {
                    'userDetails.name': new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let joinArr = [{
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'user_id',
                    as: 'userDetails',
                },
            }, {
                $unwind: "$userDetails"
            }, {
                $lookup: {
                    from: 'categories',
                    localField: 'category_id',
                    foreignField: 'category_id',
                    as: 'catDetails',
                },
            }, {
                $unwind: "$catDetails"
            }, { 
                $match : columnAndValue
            }, { 
                $sort : {created_at:-1}
            }, {
                $project: {
                    _id: 0,
                    meetup_id: 1,
                }
            }];
            let count = await query.joinWithAnd(dbConstants.dbSchema.meetups, joinArr);

            joinArr = [{
                $lookup: {
                    from: 'users',
                    localField: 'user_id',
                    foreignField: 'user_id',
                    as: 'userDetails',
                },
            }, {
                $unwind: "$userDetails"
            }, {
                $lookup: {
                    from: 'categories',
                    localField: 'category_id',
                    foreignField: 'category_id',
                    as: 'catDetails',
                },
            }, {
                $unwind: "$catDetails"
            }, { 
                $match : columnAndValue
            }, { 
                $sort : {created_at:-1}
            }, {
                $skip: skip
            }, {
                $limit: sizePerPage
            }, {
                $project: {
                    _id: 0,
                    meetup_id: 1,
                    title: 1,
                    description: 1,
                    type: 1,
                    date_time: { $concat: [ "$date", ", ", "$time" ] },
                    duration: 1,
                    location: 1,
                    photo: 1,
                    created_at: 1,
                    status: 1,
                    user_name: "$userDetails.name",
                    category_name: "$catDetails.title",
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.meetups, joinArr);
            data = JSON.parse(JSON.stringify(data))
            await Promise.all(data.map(async (elem) => {
                elem.photo = elem.photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${elem.photo}`}) : ''
                elem.created_at = timeZone(new Date(elem.created_at)).tz(requestParam.time_zone).format('lll')
                elem.type = LD.upperFirst(elem.type)
            }))
            obj.data = data;
            obj.count = count.length;
            resolve(obj);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const action = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            if (requestParam['type']== "delete") {
                await query.removeMultiple(dbConstants.dbSchema.meetups, { meetup_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.meetups, {status: requestParam.type}, {meetup_id: { $in: requestParam['ids']}});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

module.exports = {
    getSort,
    action,
};