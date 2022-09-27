'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const category = require('./../models/category');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');
const imgHandler = require('./../model_handlers/image-handler');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.category_id){
                columnValue.category_id = requestParam.category_id
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.categories, columnValue, { _id: 0}, { created_at: 1 });
            response = JSON.parse(JSON.stringify(response))
            if(requestParam.category_id){
                response = response[0]
                response.image = response.image != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/categories/${response.image}`}) : ''
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
                    category_id: new RegExp(requestParam.text, 'i')
                }, {
                    title: new RegExp(requestParam.text, 'i')
                }, {
                    status: new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.categories, columnAndValue)
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
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.categories, joinArr);
            data = JSON.parse(JSON.stringify(data))
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
            let response = await query.selectWithAndOne(dbConstants.dbSchema.categories, {title: requestParam.title}, { _id: 0, category_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            if(req.files){
                if(req.files.image){
                    requestParam.image = await imgHandler.uploadImage(req.files.image, config.aws.s3.categoryBucket)
                }
            }
            await query.insertSingle(dbConstants.dbSchema.categories, requestParam);
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
                category_id: { $ne: requestParam.category_id },
                title: requestParam.title,
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.categories, compareColumnAndValues, { _id: 0, category_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let cat = await query.selectWithAndOne(dbConstants.dbSchema.categories, {category_id: requestParam.category_id}, { _id: 0, image:1}, { created_at: 1 });
            if (requestParam.change_logo) {
                const objects = [{
                    Key: `pazuri/categories/${cat.image}`
                }];
                await imgHandler.deleteImage(objects, config.aws.bucketName)
                requestParam.image = await imgHandler.uploadImage(req.files.image, config.aws.s3.categoryBucket)
            }
            else{
                delete requestParam.image
            }
            await query.updateSingle(dbConstants.dbSchema.categories, requestParam, {category_id: requestParam.category_id});
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
                let response = await query.selectWithAnd(dbConstants.dbSchema.categories, {category_id: {$in: requestParam.ids}}, { _id: 0, category_id:1, image:1}, { created_at: 1 });
                let objects = []
                await Promise.all(response.map(async (elem) => {
                    objects.push({
                        Key: `pazuri/categories/${elem.image}`
                    });
                }))
                if(objects.length > 0) await imgHandler.deleteImage(objects, config.aws.bucketName)
                await query.removeMultiple(dbConstants.dbSchema.categories, { category_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.categories, {status: requestParam.type}, {category_id: { $in: requestParam['ids']}});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const list = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let lists = await query.selectWithAnd(dbConstants.dbSchema.categories, {status:'active'}, { _id:0, category_id: 1, title:1, image:1} );
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.image = elem.image != '' ? await imgHandler.getImage({bucket: config.aws.bucketName, key:`pazuri/categories/${elem.image}`}) : ''
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
    list
};