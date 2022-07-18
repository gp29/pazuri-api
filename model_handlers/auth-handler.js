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
const timeZone = require('moment-timezone');

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
                let exists = await query.selectWithAndOne(dbConstants.dbSchema.users, {username: requestParam.username}, { _id: 0, user_id:1}, { created_at: 1 });
                if(exists){
                    reject(errors(labels.LBL_USERNAME_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                    return;
                }
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
            resolve(profile({user_id: res.user_id, time_zone: requestParam.time_zone}));
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
            if(requestParam.email) delete requestParam.email
            if(requestParam.mobile) delete requestParam.mobile
            if(requestParam.mobile_country_code) delete requestParam.mobile_country_code

            if(requestParam.user_id){
                requestParam.user_id = await encryptDecryptHandler.decryptString(requestParam.user_id)
            }
            if(requestParam.name){
                requestParam.name = await encryptDecryptHandler.decryptString(requestParam.name)
            }
            if(requestParam.is_hide_yourself){
                requestParam.is_hide_yourself = await encryptDecryptHandler.decryptString(requestParam.is_hide_yourself)
                requestParam.is_hide_yourself = requestParam.is_hide_yourself == 'true' ? true : false
            }
            if(requestParam.region_id){
                requestParam.region_id = await encryptDecryptHandler.decryptString(requestParam.region_id)
            }
            if(requestParam.about){
                requestParam.about = await encryptDecryptHandler.decryptString(requestParam.about)
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
                requestParam.profile_photo = await imgHandler.uploadImage(req.files.profile_photo, config.aws.s3.userBucket)
            }
            await query.updateSingle(dbConstants.dbSchema.users, requestParam, {user_id: requestParam.user_id});
            resolve(profile({user_id: requestParam.user_id, time_zone: requestParam.time_zone}));
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
            let updateColumn = {last_login: new Date()}
            if(requestParam.device_token){
                updateColumn.device_token = requestParam.updateColumn
            }
            await query.updateSingle(dbConstants.dbSchema.users, updateColumn, {user_id: response.user_id});
            resolve(profile({user_id: response.user_id, time_zone: requestParam.time_zone}));
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1, region_id:1, name:1, username:1, mobile_country_code:1, mobile:1, email:1, profile_photo:1, status:1, about:1, last_login:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.NotActive));
                return;
            }
            response.last_login = timeZone(new Date(response.last_login)).tz(requestParam.time_zone).format('DD MMM HH:mm')
            response.region_name = ''
            let region = await query.selectWithAndOne(dbConstants.dbSchema.regions, {region_id:response.region_id}, { _id:0, name: 1} );
            if(region){
                response.region_name = region.name
            }
            response.profile_photo = response.profile_photo != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/users/${response.profile_photo}`}) : ''
            resolve(response);
            return;
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
};

const forgot = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {mobile_country_code:requestParam.mobile_country_code, mobile: requestParam.mobile}, { _id:0, user_id: 1, status:1} );
            if(!response){
                reject(errors(labels.LBL_MOBILE_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.status == 'inactive'){
                reject(errors(labels.LBL_ACCOUNT_INACTIVE[config.default_language], responseCodes.NotActive));
                return;
            }
            let otp = Math.floor(1000 + Math.random() * 9000)
            await query.updateSingle(dbConstants.dbSchema.users, {otp}, {user_id: response.user_id});
            resolve({otp});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const verifyOtp = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {mobile_country_code:requestParam.mobile_country_code, mobile: requestParam.mobile}, { _id:0, user_id: 1, otp:1} );
            if(!response){
                reject(errors(labels.LBL_MOBILE_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            response = JSON.parse(JSON.stringify(response))
            if(response.otp != requestParam.otp){
                reject(errors(labels.LBL_INVALID_OTP[config.default_language], responseCodes.NotActive));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.users, {otp:''}, {user_id: response.user_id});
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {mobile_country_code:requestParam.mobile_country_code, mobile: requestParam.mobile}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_MOBILE_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let password = await passwordHandler.encrypt(requestParam.password.toString());
            await query.updateSingle(dbConstants.dbSchema.users, {password}, {user_id: response.user_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const updateLatLng = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1, region_id:1, name:1, username:1, mobile_country_code:1, mobile:1, email:1, profile_photo:1, status:1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            requestParam.location = {
                type: "Point",
                coordinates: [requestParam.longitude, requestParam.latitude]
            }
            await query.updateSingle(dbConstants.dbSchema.users, requestParam, {user_id: response.user_id});
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const logoutDelete = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            if(requestParam.type == 'logout'){
                await query.updateSingle(dbConstants.dbSchema.users, {device_token:''}, { user_id: requestParam.user_id });
            }
            if(requestParam.type == 'delete'){
                let user = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id: requestParam.user_id}, { _id:0, profile_photo: 1});
                let objects = []
                if(user){
                    if(user.profile_photo != ''){
                        objects.push({
                            Key: `pazuri/users/${user.profile_photo}`
                        })
                    }
                    if(objects.length > 0){
                        await imgHandler.deleteImage(objects, config.aws.bucketName)
                    }
                }
                await query.removeMultiple(dbConstants.dbSchema.users, {user_id: requestParam.user_id})
            }
            resolve({})
            return;
        } catch (error) {
            console.log(error)
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
    forgot,
    verifyOtp,
    changePassword,
    updateLatLng,
    logoutDelete,
};