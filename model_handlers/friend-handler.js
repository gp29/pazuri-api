'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const friend = require('./../models/friend');
const friend_req = require('./../models/friend-request');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const imgHandler = require('./../model_handlers/image-handler');
const notiHandler = require('./../model_handlers/notification-handler');

const sendRequest = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let opp_user = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.opponent_user_id}, { _id: 0, user_id: 1} );
            if(!opp_user){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let exists = await query.selectWithAndOne(dbConstants.dbSchema.friend_requests, {user_id: requestParam.user_id, opponent_user_id:requestParam.opponent_user_id}, { _id: 0, block_id: 1} );
            let exists1 = await query.selectWithAndOne(dbConstants.dbSchema.friends, {user_id: requestParam.user_id, opponent_user_id: requestParam.opponent_user_id}, { _id: 0, friend_id: 1} );
            if(!exists && !exists1){
                await query.insertSingle(dbConstants.dbSchema.friend_requests, requestParam);
                notiHandler.sendNotification({type: 'friend_request', user_id: requestParam.user_id, opponent_user_id: requestParam.opponent_user_id});
            }
            resolve({});
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const requestedList = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let page = (requestParam.page ? parseInt(requestParam.page) : 1);
            let limit = 20;
            page -= 1;
            let skip = page * limit;

            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
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
                $match: {opponent_user_id: requestParam.user_id},
            }, {
                $sort: {created_at: -1}
            }, {
                $skip: skip
            }, {
                $limit: limit
            }, {
                $project: {
                    _id: 0,
                    request_id: 1,
                    user_id: "$user_id",
                    name: "$userDetails.name",
                    username: "$userDetails.username",
                    profile_photo: "$userDetails.profile_photo",
                }
            }];
            let lists = await query.joinWithAnd(dbConstants.dbSchema.friend_requests, joinArr);
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

const requestedAction = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let exists = await query.selectWithAndOne(dbConstants.dbSchema.friend_requests, {request_id: requestParam.request_id}, { _id: 0, request_id: 1, user_id:1, opponent_user_id:1} );
            if(exists){
                if(requestParam.action == 'reject'){
                    await query.removeMultiple(dbConstants.dbSchema.friend_requests, {request_id: requestParam.request_id})
                }
                else{
                    becomeFriend(exists);
                }
            }
            resolve({});
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const becomeFriend = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let exists = await query.selectWithAndOne(dbConstants.dbSchema.friends, {user_id: requestParam.user_id, opponent_user_id: requestParam.opponent_user_id}, { _id: 0, friend_id: 1} );
            if(!exists){
                await query.insertSingle(dbConstants.dbSchema.friends, {
                    user_id: requestParam.user_id,
                    opponent_user_id: requestParam.opponent_user_id
                });
            }
            let exists1 = await query.selectWithAndOne(dbConstants.dbSchema.friends, {user_id: requestParam.opponent_user_id, opponent_user_id: requestParam.user_id}, { _id: 0, friend_id: 1} );
            if(!exists1){
                await query.insertSingle(dbConstants.dbSchema.friends, {
                    user_id: requestParam.opponent_user_id,
                    opponent_user_id: requestParam.user_id
                });
            }
            await query.removeMultiple(dbConstants.dbSchema.friend_requests, {request_id: requestParam.request_id})
            notiHandler.sendNotification({type: 'became_friend', user_id: requestParam.opponent_user_id, opponent_user_id: requestParam.user_id});
            return false;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const friendsList = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let page = (requestParam.page ? parseInt(requestParam.page) : 1);
            let limit = 20;
            page -= 1;
            let skip = page * limit;

            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let joinArr = [{
                $lookup: {
                    from: 'users',
                    localField: 'opponent_user_id',
                    foreignField: 'user_id',
                    as: 'userDetails',
                },
            }, {
                $unwind: "$userDetails"
            }, {
                $match: {user_id: requestParam.user_id},
            }, {
                $sort: {created_at: -1}
            }, {
                $skip: skip
            }, {
                $limit: limit
            }, {
                $project: {
                    _id: 0,
                    friend_id: 1,
                    user_id: "$opponent_user_id",
                    name: "$userDetails.name",
                    username: "$userDetails.username",
                    profile_photo: "$userDetails.profile_photo",
                }
            }];
            let lists = await query.joinWithAnd(dbConstants.dbSchema.friends, joinArr);
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

const locationList = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let page = (requestParam.page ? parseInt(requestParam.page) : 1);
            let limit = 20;
            page -= 1;
            let skip = page * limit;

            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let joinArr = [{
                $lookup: {
                    from: 'users',
                    localField: 'opponent_user_id',
                    foreignField: 'user_id',
                    as: 'userDetails',
                },
            }, {
                $unwind: "$userDetails"
            }, {
                $match: {user_id: requestParam.user_id, "userDetails.is_hide_yourself": false},
            }, {
                $sort: {created_at: -1}
            }, {
                $skip: skip
            }, {
                $limit: limit
            }, {
                $project: {
                    _id: 0,
                    friend_id: 1,
                    user_id: "$opponent_user_id",
                    name: "$userDetails.name",
                    username: "$userDetails.username",
                    profile_photo: "$userDetails.profile_photo",
                    latitude: "$userDetails.latitude",
                    longitude: "$userDetails.longitude",
                }
            }];
            let lists = await query.joinWithAnd(dbConstants.dbSchema.friends, joinArr);
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

const removeFriend = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.removeMultiple(dbConstants.dbSchema.friends, {user_id: requestParam.user_id, opponent_user_id: requestParam.opponent_user_id})
            await query.removeMultiple(dbConstants.dbSchema.friends, {user_id: requestParam.opponent_user_id, opponent_user_id: requestParam.user_id})
            resolve({});
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

module.exports = {
    sendRequest,
    requestedList,
    requestedAction,
    friendsList,
    locationList,
    removeFriend,
};