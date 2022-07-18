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
const imgHandler = require('./../model_handlers/image-handler');
const FCM = require('fcm-push');
let fcm = new FCM(config.push_key);

const sendNotification = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let user = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id: 0, user_id: 1, name:1, profile_photo:1} );
            let opp_user = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.opponent_user_id}, { _id: 0, user_id: 1, name:1, profile_photo:1, device_token:1} );
            let title;
            let msg;
            let body;
            if(user && opp_user){
                let is_send = true;
                if(requestParam.type == 'became_friend'){
                    title = 'Became friends'
                    msg = 'became friends'
                    body = 'You and ' +user.name+' friends now'
                }
                else if(requestParam.type == 'friend_request'){
                    title = 'Friend request'
                    msg = 'sent you friend request'
                    body = user.name+' '+msg
                }
                requestParam.msg = msg.replace(/^\w/, (c) => c.toUpperCase());
                if(is_send){
                    let message = {
                        to: opp_user.device_token,
                        collapse_key: 'your_collapse_key',
                        content_available: true,
                        mutable_content: true,
                        priority: "high",
                        data: {
                            type: requestParam.type,
                            image: user.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${user.profile_photo}`}) : '',
                            title: title,

                            user_id: user.user_id,
                            user_name: user.name,
                            user_profile_photo: user.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${user.profile_photo}`}) : '',
                        },
                        notification: {
                            title: title,
                            body: body,
                            sound: 'default'
                        }
                    };

                    fcm.send(message, function(err, response) {
                        console.log(err)
                        console.log(response)
                    });
                }
            }
            return false;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

module.exports = {
    sendNotification,
};