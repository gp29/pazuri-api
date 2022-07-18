'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const passwordHandler = require('./../utils/password-handler');
const imgHandler = require('./../model_handlers/image-handler');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');

const login = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.admins, {mobile: requestParam.mobile}, { _id: 0}, { created_at: 1 });
            if (!response) {
                reject(errors(labels.LBL_MOBILE_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let encryptPassword = await passwordHandler.encrypt(requestParam.password.toString());
            if(encryptPassword != response.password){
                reject(errors(labels.LBL_INVALID_PWD[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            // const inserRecord = {
            //     mobile: response.mobile,
            //     name: response.name,
            //     type: 'Admin',
            //     login_id: response.admin_id,
            //     ip: requestParam.ip_address,
            // };
            // let res = await query.insertSingle(dbConstants.dbSchema.login_logs, inserRecord)
            // response = JSON.parse(JSON.stringify(response));
            // response.loginlog_id = res.loginlog_id
            resolve(response);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const logout = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            requestParam['logout_date'] = new Date();
            await query.updateSingle(dbConstants.dbSchema.login_logs, requestParam, {loginlog_id: requestParam.loginlog_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

//FOR API

const signup = async(requestParam, req) => {
    return new Promise(async(resolve, reject) => {
        try {
            if(requestParam.name){
                requestParam.name = await encryptDecryptHandler.decryptString(requestParam.name)
            }
            if(requestParam.region_id){
                requestParam.region_id = await encryptDecryptHandler.decryptString(requestParam.region_id)
            }
            if(requestParam.email){
                requestParam.email = await encryptDecryptHandler.decryptString(requestParam.email)
            }
            if(requestParam.password){
                requestParam.password = await encryptDecryptHandler.decryptString(requestParam.password)
            }
            if(requestParam.mobile_country_code){
                requestParam.mobile_country_code = await encryptDecryptHandler.decryptString(requestParam.mobile_country_code)
            }
            if(requestParam.mobile){
                requestParam.mobile = await encryptDecryptHandler.decryptString(requestParam.mobile)
            }
            if(requestParam.username){
                requestParam.username = await encryptDecryptHandler.decryptString(requestParam.username)
            }
            requestParam.email = requestParam.email.toLowerCase();
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
            if(req.files && req.files.profile_photo){
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.userBucket)
            }
            requestParam.password = await passwordHandler.encrypt(requestParam.password.toString());
            let res = await query.insertSingle(dbConstants.dbSchema.users, requestParam);
            resolve(profile({user_id: res.user_id}));
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
            if(requestParam.user_id){
                requestParam.user_id = await encryptDecryptHandler.decryptString(requestParam.user_id)
            }
            if(requestParam.name){
                requestParam.name = await encryptDecryptHandler.decryptString(requestParam.name)
            }
            if(requestParam.region_id){
                requestParam.region_id = await encryptDecryptHandler.decryptString(requestParam.region_id)
            }

            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1, profile_photo:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files && req.files.profile_photo){
                const objects = [{
                    Key: `pazuri/users/${response.profile_photo}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.customerBucket)
            }
            await query.updateSingle(dbConstants.dbSchema.users, requestParam, {user_id: requestParam.user_id});
            resolve(profile({user_id: requestParam.user_id}));
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const signin = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {mobile_country_code:requestParam.mobile_country_code, mobile: requestParam.mobile}, { _id:0, user_id: 1, password:1, name:1, email:1, status:1} );
            if(!response){
                reject(errors(labels.LBL_MOBILE_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.NotActive));
                return;
            }
            let encryptPassword = await passwordHandler.encrypt(requestParam.password.toString());
            if(encryptPassword != response.password){
                reject(errors(labels.LBL_INVALID_PWD[config.default_language], responseCodes.InvalidOTP));
                return;
            }
            if(requestParam.device_token){
                await query.updateSingle(dbConstants.dbSchema.users, {device_token: requestParam.device_token}, {user_id: response.user_id});
            }
            resolve(profile({user_id: response.user_id}));
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const profile = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1, region_id:1, name:1, username:1, mobile_country_code:1, mobile:1, email:1, profile_photo:1, status:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.NotActive));
                return;
            }
            response.profile_photo = response.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${response.profile_photo}`}) : ''
            resolve(response);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

module.exports = {
    login,
    logout,

    //API
    signup,
    update,
    signin,
    profile,
};