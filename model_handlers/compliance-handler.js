'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const compliance = require('./../models/compliance');
const comply = require('./../models/comply');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const moment = require('moment');
const timeZone = require('moment-timezone');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.compliance_id){
                columnValue.compliance_id = requestParam.compliance_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.compliances, columnValue, { _id: 0, created_at:0, updated_at:0, __v:0}, { created_at: 1 });
            if(requestParam.compliance_id){
                response = response[0]
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
                    compliance_id: new RegExp(requestParam.text, 'i')
                }, {
                    name: new RegExp(requestParam.text, 'i')
                }, {
                    description: new RegExp(requestParam.text, 'i')
                }, {
                    'authDetails.name': new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.compliances, columnAndValue);

            let joinArr = [{
                $lookup: {
                    from: 'authorities',
                    localField: 'authority_id',
                    foreignField: 'authority_id',
                    as: 'authDetails',
                },
            }, {
                $unwind: "$authDetails"
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
                    compliance_id: 1,
                    name: 1,
                    description: 1,
                    authority: "$authDetails.name",
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.compliances, joinArr);
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

const create = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.compliances, {name: requestParam.name, authority_id: requestParam.authority_id}, { _id: 0, compliance_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.insertSingle(dbConstants.dbSchema.compliances, requestParam);
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
                compliance_id: { $ne: requestParam.compliance_id },
                name: requestParam.name,
                authority_id: requestParam.authority_id,
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.compliances, compareColumnAndValues, { _id: 0, compliance_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.compliances, requestParam, {compliance_id: requestParam.compliance_id});
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
                await query.removeMultiple(dbConstants.dbSchema.compliances, { compliance_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.compliances, {status: requestParam.type}, {compliance_id: { $in: requestParam['ids']}});
            }
            resolve({});
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

// API
const list = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let lists = await query.selectWithAnd(dbConstants.dbSchema.compliances, {}, { _id: 0, compliance_id:1, name:1}, { created_at: 1 });
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.price = 0
                elem.price_id = ''
                elem.inclusive_vat = ''
                let response = await query.selectWithAndOne(dbConstants.dbSchema.prices, {compliance_id: elem.compliance_id}, { _id: 0, price_id:1, amount:1, inclusive_vat:1}, { created_at: 1 });
                if(response){
                    elem.price = response.amount
                    elem.price_id = response.price_id
                    elem.inclusive_vat = response.inclusive_vat
                }
            }));
            resolve(lists);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const complyList = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            let lists = await query.selectWithAnd(dbConstants.dbSchema.complies, {user_id:requestParam.user_id}, { _id:0, comply_id: 1, compliance_id:1, expiry_date:1, paid_status:1, status:1} );
            lists = JSON.parse(JSON.stringify(lists))
            await Promise.all(lists.map(async (elem) => {
                elem.expiry_date = moment(elem.expiry_date).format('ll')
                elem.compliance_name = ''
                let compliance = await query.selectWithAndOne(dbConstants.dbSchema.compliances, {compliance_id: elem.compliance_id}, { _id: 0, name:1}, { created_at: 1 });
                if(compliance){
                    elem.compliance_name = compliance.name
                }
            }));
            resolve(lists);
            return;
        } catch (error) {
            reject(error)
            return
        }
    })
};

const createComply = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.users, {user_id:requestParam.user_id}, { _id:0, user_id: 1} );
            if(!response){
                reject(errors(labels.LBL_USER_NOT_FOUND[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.insertSingle(dbConstants.dbSchema.complies, requestParam);
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

    //API
    list,
    complyList,
    createComply
};