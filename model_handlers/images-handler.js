'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const image = require('./../models/image');
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
            if(requestParam.image_id){
                columnValue.image_id = requestParam.image_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.images, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.image_id){
                response = response[0]
                response.image = response.image != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/images/${response.image}`}) : ''
                resolve(response);
                return;
            }
            await Promise.all(response.map(async (elem) => {
                elem.image = elem.image != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/images/${elem.image}`}) : ''
            }))
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
                    image_id: new RegExp(requestParam.text, 'i')
                }, {
                    name: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.images, columnAndValue)
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
                    image_id:1,
                    name:1,
                    image:1,
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.images, joinArr);
            data = JSON.parse(JSON.stringify(data))
            await Promise.all(data.map(async (elem) => {
                elem.image = elem.image != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/images/${elem.image}`}) : ''
            }))
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
            let compareColumnAndValues = {
                name: requestParam.name
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.images, compareColumnAndValues, { _id: 0, image_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files){
                if(req.files.image){
                    requestParam.image = await imgHandler.uploadImage(req.files.image, config.aws.s3.imageBucket)
                }
            }
            await query.insertSingle(dbConstants.dbSchema.images, requestParam);
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
            let compareColumnAndValues = {
                name: requestParam.name,
                image_id: {
                    $ne: requestParam.image_id
                }
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.images, compareColumnAndValues, { _id: 0, image_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let customer = await query.selectWithAndOne(dbConstants.dbSchema.images, {image_id: requestParam.image_id}, { _id: 0, image:1}, { created_at: 1 });
            if (requestParam.change_logo) {
                const objects = [{
                    Key: `pazuri/images/${customer.image}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.image = await imgHandler.uploadImage(req.files.image, config.aws.s3.imageBucket)
            }
            else{
                delete requestParam.image
            }
            await query.updateSingle(dbConstants.dbSchema.images, requestParam, {image_id: requestParam.image_id});
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
                let response = await query.selectWithAnd(dbConstants.dbSchema.images, {image_id: {$in: requestParam.ids}}, { _id: 0, image_id:1, image:1}, { created_at: 1 });
                let objects = []
                await Promise.all(response.map(async (elem) => {
                    objects.push({
                        Key: `pazuri/images/${elem.image}`
                    });
                }))
                if(objects.length > 0) await imgHandler.deleteImage(objects, config.aws.bucketName)
                await query.removeMultiple(dbConstants.dbSchema.images, { image_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.images, {status: requestParam.type}, {image_id: { $in: requestParam['ids']}});
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
            await query.updateSingle(dbConstants.dbSchema.images, requestParam, {image_id: requestParam.image_id});
            resolve({});
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
    changePassword
};