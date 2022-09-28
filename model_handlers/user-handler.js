'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const user = require('./../models/user');
const meetup = require('./../models/meetup');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');
const imgHandler = require('./../model_handlers/image-handler');
const passwordHandler = require('./../utils/password-handler');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');
const FCM = require('fcm-push');
let fcm = new FCM(config.push_key);

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
            let page = (requestParam.page ? parseInt(requestParam.page) : 1);
            let limit = 20;
            page -= 1;
            let skip = page * limit;

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

            let columnMatch = {status:'active', user_id:{$nin: ids}}
            if(requestParam.keyword && requestParam.keyword != ''){
                columnMatch['$or'] = [{
                    name: new RegExp(requestParam.keyword, 'i')
                }, {
                    username: new RegExp(requestParam.keyword, 'i')
                }];
            }
            let lists = await query.selectWithAndFilter(dbConstants.dbSchema.users, columnMatch, { _id:0, user_id: 1, name:1, profile_photo:1, username:1}, {
                created_at: -1
            }, {
                skip,
                limit
            });
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.profile_photo = elem.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${elem.profile_photo}`}) : ''
            }))
            resolve(lists);
            return;
        } catch (error) {
            console.log(error)
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
            
            user.is_requested = false
            let request = await query.selectWithAndOne(dbConstants.dbSchema.friend_requests, {user_id: requestParam.user_id, opponent_user_id: requestParam.opponent_user_id}, {_id: 0, request_id: 1});
            if(request) user.is_requested = true

            user.is_friend = false
            let friend = await query.selectWithAndOne(dbConstants.dbSchema.friends, {user_id: requestParam.user_id, opponent_user_id: requestParam.opponent_user_id}, {_id: 0, friend_id: 1});
            if(friend) user.is_friend = true

            resolve(user);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const createMeetup = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
             if(requestParam.user_id){
                requestParam.user_id = await encryptDecryptHandler.decryptString(requestParam.user_id)
            }
            if(requestParam.title){
                requestParam.title = await encryptDecryptHandler.decryptString(requestParam.title)
            }
            if(requestParam.description){
                requestParam.description = await encryptDecryptHandler.decryptString(requestParam.description)
            }
            if(requestParam.date){
                requestParam.date = await encryptDecryptHandler.decryptString(requestParam.date)
            }
            if(requestParam.time){
                requestParam.time = await encryptDecryptHandler.decryptString(requestParam.time)
            }
            if(requestParam.duration){
                requestParam.duration = await encryptDecryptHandler.decryptString(requestParam.duration)
            }
            if(requestParam.location){
                requestParam.location = await encryptDecryptHandler.decryptString(requestParam.location)
            }
            if(requestParam.friend_ids){
                requestParam.friend_ids = await encryptDecryptHandler.decryptString(requestParam.friend_ids)
            }
            if(requestParam.category_id){
                requestParam.category_id = await encryptDecryptHandler.decryptString(requestParam.category_id)
            }
            if(requestParam.type){
                requestParam.type = await encryptDecryptHandler.decryptString(requestParam.type)
            }
            if(requestParam.limit){
                requestParam.limit = await encryptDecryptHandler.decryptString(requestParam.limit)
            }
            if(requestParam.amount){
                requestParam.amount = await encryptDecryptHandler.decryptString(requestParam.amount)
            }
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files){
                if(req.files.photo){
                    requestParam.photo = await imgHandler.uploadImage(req.files.photo, config.aws.s3.userBucket)
                }
            }
            if(requestParam.friend_ids && requestParam.type == 'private'){
                let friend_ids = requestParam.friend_ids.split(',')
                sendMeetupUserNoti({user_id: requestParam.user_id, friend_ids, type: requestParam.type})
                requestParam.friend_ids = friend_ids
            }
            else{
                sendMeetupUserNoti({user_id: requestParam.user_id, type: requestParam.type})
            }
            await query.insertSingle(dbConstants.dbSchema.meetups, requestParam);
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const sendMeetupUserNoti = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnMatch = {}
            if(requestParam.type == 'private'){
                columnMatch = {user_id:{$in:requestParam.friend_ids}}
            }
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, user_id: 1, name: 1});
            if(response){
                let body = response.name+' created meetup, join now.'
                if(requestParam.type == 'private'){
                    body = response.name+' created meetup with you and '+(requestParam.friend_ids.length - 1)+' others.'
                }
                let users = await query.selectWithAnd(dbConstants.dbSchema.users, columnMatch, {_id: 0, user_id: 1, name: 1, device_token:1});
                await Promise.all(users.map(async (element) => {
                    let message = {
                        to: element.device_token,
                        collapse_key: 'your_collapse_key',
                        content_available: true,
                        mutable_content: true,
                        priority: "high",
                        data: {
                            type: 'meetup',
                            title: 'Meetup',
                        },
                        notification: {
                            title: "Meetup",
                            body: body,
                            sound: 'default'
                        }
                    };
                    fcm.send(message, function(err, response) {
                    });
                }))
            }
            return false;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const meetupNotification = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let page = (requestParam.page ? parseInt(requestParam.page) : 1);
            let limit = 20;
            page -= 1;
            let skip = page * limit;

            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let lists = await query.selectWithAndFilter(dbConstants.dbSchema.meetups, {friend_ids:{$in:[requestParam.user_id]}, user_id:{$ne: requestParam.user_id}, type:'private'}, { _id:0, meetup_id: 1, title:1, description:1, friend_ids:1, date:1, time:1, duration:1, accepted:1, rejected:1}, {
                created_at: -1,
            }, {
                skip,
                limit
            });
            resolve(lists);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const homeMeetupList = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let page = (requestParam.page ? parseInt(requestParam.page) : 1);
            let limit = 20;
            page -= 1;
            let skip = page * limit;

            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let lists = await query.selectWithAndFilter(dbConstants.dbSchema.meetups, {user_id:{$ne: requestParam.user_id}, type:'public'}, { _id:0, meetup_id: 1, title:1, description:1, date:1, time:1, duration:1, accepted:1, amount:1, type:1, limit:1}, {
                created_at: -1,
            }, {
                skip,
                limit
            });
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.is_join = false
                if(elem.accepted.includes(requestParam.user_id) == true){
                    elem.is_join = true
                }
                delete elem.accepted
            }))
            resolve(lists);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const joinMeetup = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let meetup = await query.selectWithAndOne(dbConstants.dbSchema.meetups, {meetup_id:requestParam.meetup_id}, { _id:0, meetup_id: 1, friend_ids:1, accepted:1, rejected:1, limit:1} );
            if(!meetup){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(limit == meetup.accepted.length){
                reject(errors(labels.LBL_LIMIT_OVER[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let accepted = meetup.accepted
            accepted.push(requestParam.user_id)
            await query.updateSingle(dbConstants.dbSchema.meetups, {accepted, $inc: { limit: 1 }}, {meetup_id: requestParam.meetup_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const acceptRejectMeetup = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let meetup = await query.selectWithAndOne(dbConstants.dbSchema.meetups, {meetup_id:requestParam.meetup_id}, { _id:0, meetup_id: 1, friend_ids:1, accepted:1, rejected:1} );
            if(!meetup){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let friend_ids = meetup.friend_ids
            let rejected = meetup.rejected
            let accepted = meetup.accepted

            if(requestParam.type == 'accept'){
                accepted.push(requestParam.user_id)
            }
            if(requestParam.type == 'reject'){
                rejected.push(requestParam.user_id)
                friend_ids.splice( friend_ids.indexOf(requestParam.user_id), 1 );
            }
            await query.updateSingle(dbConstants.dbSchema.meetups, {friend_ids, accepted, rejected}, {meetup_id: requestParam.meetup_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const deleteMeetup = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.removeMultiple(dbConstants.dbSchema.meetups, { meetup_id: { $in: [requestParam.meetup_id]}});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const createdMeetupList = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            let page = (requestParam.page ? parseInt(requestParam.page) : 1);
            let limit = 20;
            page -= 1;
            let skip = page * limit;

            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let lists = await query.selectWithAndFilter(dbConstants.dbSchema.meetups, {user_id: requestParam.user_id}, { _id:0, meetup_id: 1, title:1, description:1, friend_ids:1, date:1, time:1, duration:1, accepted:1, rejected:1, type:1, category_id:1, limit:1, amount:1}, {
                created_at: -1,
            }, {
                skip,
                limit
            });
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                let ids = elem.friend_ids
                ids.push(elem.accepted)
                ids.push(elem.rejected)
                ids = _.uniq(_.flatten(ids))
                ids = _.without(ids, requestParam.user_id)
                let users = await query.selectWithAnd(dbConstants.dbSchema.users, {user_id:{$in: ids}}, { _id:0, user_id: 1, name:1, username:1, profile_photo:1} );
                users = JSON.parse(JSON.stringify(users))
                await Promise.all(users.map(async (itm) => {
                    itm.profile_photo = itm.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${itm.profile_photo}`}) : ''
                    if(elem.accepted.includes(itm.user_id) == true){
                        itm.status = 'accepted'
                    }
                    else if(elem.rejected.includes(itm.user_id) == true){
                        itm.status = 'rejected'
                    }
                    else{
                        itm.status = 'pending'
                    }
                }))
                elem.users = users
                delete elem.friend_ids
                delete elem.accepted
                delete elem.rejected
            }))
            resolve(lists);
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
    createMeetup,
    meetupNotification,
    acceptRejectMeetup,
    deleteMeetup,
    createdMeetupList,
    homeMeetupList,
    joinMeetup
};