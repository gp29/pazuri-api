'use strict';

const config = require('./../config');
const errors = require('./../utils/dz-errors');
const dbConstants = require('./../constants/db-constants');
const query = require('./../utils/query-creator');
const price = require('./../models/price');
const _ = require('underscore');
const labels = require('./../utils/labels.json');
const responseCodes = require('./../utils/response-codes');
const timeZone = require('moment-timezone');

const get = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let columnValue = {}
            if(requestParam.price_id){
                columnValue.price_id = requestParam.price_id
            }
            if(requestParam.status){
                columnValue.status = requestParam.status
            }
            let response = await query.selectWithAnd(dbConstants.dbSchema.prices, columnValue, { _id: 0}, { created_at: 1 });
            if(requestParam.price_id){
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
                    price_id: new RegExp(requestParam.text, 'i')
                }, {
                    inclusive_vat: new RegExp(requestParam.text, 'i')
                }, {
                    amount: new RegExp(requestParam.text, 'i')
                }, {
                    'comDetails.name': new RegExp(requestParam.text, 'i')
                }];
            }
            let page = requestParam.page ? requestParam.page : 0 ;
            let sizePerPage = requestParam.sizePerPage ? requestParam.sizePerPage : 10 ;
            let skip = page * sizePerPage;
            let obj = {};

            let count = await query.countRecord(dbConstants.dbSchema.prices, columnAndValue);

            let joinArr = [{
                $lookup: {
                    from: 'compliances',
                    localField: 'compliance_id',
                    foreignField: 'compliance_id',
                    as: 'comDetails',
                },
            }, {
                $unwind: "$comDetails"
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
                    price_id: 1,
                    amount: 1,
                    inclusive_vat: 1,
                    compliance: "$comDetails.name",
                }
            }];
            let data = await query.joinWithAnd(dbConstants.dbSchema.prices, joinArr);
            data = JSON.parse(JSON.stringify(data))
            _.each(data, (elem) => {
                elem.amount = elem.amount+' TZS'
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

const create = async(requestParam) => {
    return new Promise(async(resolve, reject) => {
        try {
            let response = await query.selectWithAndOne(dbConstants.dbSchema.prices, {compliance_id: requestParam.compliance_id}, { _id: 0, price_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.insertSingle(dbConstants.dbSchema.prices, requestParam);
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
                price_id: { $ne: requestParam.price_id },
                compliance_id: requestParam.compliance_id,
            };
            let response = await query.selectWithAndOne(dbConstants.dbSchema.prices, compareColumnAndValues, { _id: 0, price_id:1}, { created_at: 1 });
            if(response){
                reject(errors(labels.LBL_RECORD_ALREADY_EXISTS[config.default_language], responseCodes.ResourceNotFound));
                return;
            }
            await query.updateSingle(dbConstants.dbSchema.prices, requestParam, {price_id: requestParam.price_id});
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
                await query.removeMultiple(dbConstants.dbSchema.prices, { price_id: { $in: requestParam['ids']}});
            }
            else{
                await query.updateMultiple(dbConstants.dbSchema.prices, {status: requestParam.type}, {price_id: { $in: requestParam['ids']}});
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
    get,
    getSort,
    create,
    update,
    action
};