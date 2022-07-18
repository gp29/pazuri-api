'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const user = require('./../models/user');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');
const imgHandler = require('./../model_handlers/image-handler');
const passwordHandler = require('./../utils/password-handler');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.user_id){
                columnValue.user_id = requestParam.user_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.users, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.user_id){
                response = response[0]
                response.profile_photo = response.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${response.profile_photo}`}) : ''
                resolve(response);
                return;
            }
            resolve(response);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const getSort = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnAndValue = {}
            if(requestParam.text && requestParam.text !=''){
                columnAndValue['$or'] = [{
                    user_id: new RegExp(requestParam.text, 'i')
                }, {
                    name: new RegExp(requestParam.text, 'i')
                }, {
                    email: new RegExp(requestParam.text, 'i')
                }, {
                    mobile_country_code: new RegExp(requestParam.text, 'i')
                }, {
                    mobile: new RegExp(requestParam.text, 'i')
                }, {
                    status: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.users, columnAndValue)
            let joinArr = [{ 
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
                    user_id:1,
                    name:1,
                    email:1,
                    mobile:{ $concat: [ "$mobile_country_code", " ", "$mobile" ] },
                    status:1,
                    created_at:1,
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.users, joinArr);
            data = JSON.parse(JSON.stringify(data))
            _.each(data, (elem) => {
                elem.created_at = timeZone(new Date(elem.created_at)).tz(requestParam.time_zone).format('lll')
            })
            obj.data = data;
            obj.count = count;
            resolve(obj);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const create = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            requestParam.email = requestParam.email.trim();
            let regexEmail = new RegExp(['^', requestParam.email, '$'].join(''), 'i');
            let compareColumnAndValues = {
                 $or: [{
                    email: regexEmail
                }, {
                    mobile: requestParam.mobile,
                    mobile_country_code: requestParam.mobile_country_code,
                }]
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, compareColumnAndValues, { _id: 0, user_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_EMAIL_OR_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files){
                if(req.files.profile_photo){
                    requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.userBucket)
                }
            }
            requestParam.password = await passwordHandler.encrypt(requestParam.password.toString())
            await query.insertSingle(dbConstants.dbSchema.users, requestParam);
            resolve({});
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const update = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            requestParam.email = requestParam.email.trim();
            let regexEmail = new RegExp(['^', requestParam.email, '$'].join(''), 'i');
            let compareColumnAndValues = {
                $and: [{
                    $or: [{
                        email: regexEmail
                    }, {
                        mobile: requestParam.mobile,
                        mobile_country_code: requestParam.mobile_country_code,
                    }]
                }, {
                    user_id: {
                        $ne: requestParam.user_id
                    }
                }]
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, compareColumnAndValues, { _id: 0, user_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_EMAIL_OR_MOBILE_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let customer = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, profile_photo:1}, { created_at: 1 });
            if (requestParam.change_logo) {
                const objects = [{
                    Key: `pazuri/users/${customer.profile_photo}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.userBucket)
            }
            else{
                delete requestParam.profile_photo
            }
            await query.updateSingle(dbConstants.dbSchema.users, requestParam, {user_id: requestParam.user_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const action = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            if (requestParam['type']== "delete") {
                let response = await query.selectWithAnd(dbConstants.dbSchema.users, {user_id: {$in: requestParam.ids}}, { _id: 0, user_id:1, profile_photo:1}, { created_at: 1 });
                let objects = []
                await Promise.all(response.map(async (elem) => {
                    objects.push({
                        Key: `pazuri/users/${elem.profile_photo}`
                    });
                }))
                if(objects.length > 0) await imgHandler.deleteImage(objects, config.aws.bucketName)
                await query.removeMultiple(dbConstants.dbSchema.users, { user_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.users, {status: requestParam.type}, {user_id: { $in: requestParam['ids']}});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const changePassword = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            requestParam.password = await passwordHandler.encrypt(requestParam.password.toString())
            await query.updateSingle(dbConstants.dbSchema.users, requestParam, {user_id: requestParam.user_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

// API
const userList = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let ids = [requestParam.user_id]

            let friends = await query.selectWithAnd(dbConstants.dbSchema.friends, {user_id: requestParam.user_id}, { _id:0, opponent_user_id:1} );
            ids.push(_.pluck(friends,'opponent_user_id'))

            let friend_reqs = await query.selectWithAnd(dbConstants.dbSchema.friend_requests, {user_id: requestParam.user_id}, { _id:0, opponent_user_id:1} );
            ids.push(_.pluck(friend_reqs,'opponent_user_id'))

            ids = _.flatten(ids)
            let lists = await query.selectWithAnd(dbConstants.dbSchema.users, {status:'active', user_id:{$nin: ids}}, { _id:0, user_id: 1, name:1, profile_photo:1, username:1} );
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.profile_photo = elem.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${elem.profile_photo}`}) : ''
            }))
            resolve(lists);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const details = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let user = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.opponent_user_id}, { _id:0, user_id: 1, name:1, profile_photo:1, about:1, username:1} );
            if(!user){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            user = JSON.parse(JSON.stringify(user))
            user.profile_photo = user.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${user.profile_photo}`}) : ''
            resolve(user);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

module.exports = {
    get,
    getSort,
    create,
    update,
    action,
    changePassword,

    //API
    userList,
    details,
};