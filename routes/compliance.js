'use strict';

const responseCodes = require('./../utils/response-codes');
const jsonResponse = require('./../utils/json-response');
const config = require('./../config');
const errors = require('./../utils/dz-errors');
const express = require('express');
const router = express.Router();
const labels = require('./../utils/labels.json')
const complianceHandler = require('./../model_handlers/compliance-handler');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');

router.post('/create', async(req, res) => {
    try {
        let response = await complianceHandler.create(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/get-sort', async(req, res) => {
    try {
        let response = await complianceHandler.getSort(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/get', async(req, res) => {
    try {
        let response = await complianceHandler.get(req.query);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/action', async(req, res) => {
    try {
        let response = await complianceHandler.action(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/update', async(req, res) => {
    try {
        let response = await complianceHandler.update(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

// API
router.get('/list', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        let response = await complianceHandler.list(req.query);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/create-comply', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.user_id || !req.body.region_id || !req.body.compliance_id || !req.body.price || !req.body.expiry_date || !req.body.paid_status) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        if(req.body.paid_status == 'paid'){
            if (!req.body.transaction_id){
                jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
                return
            }
        }
        let response = await complianceHandler.createComply(req.body);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

module.exports = router;