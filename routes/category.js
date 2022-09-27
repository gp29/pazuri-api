'use strict';

const responseCodes = require('./../utils/response-codes');
const jsonResponse = require('./../utils/json-response');
const config = require('./../config');
const errors = require('./../utils/dz-errors');
const express = require('express');
const router = express.Router();
const labels = require('./../utils/labels.json')
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');
const categoryHandler = require('./../model_handlers/category-handler');

router.post('/create', async(req, res) => {
    try {
        let response = await categoryHandler.create(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/get-sort', async(req, res) => {
    try {
        let response = await categoryHandler.getSort(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/get', async(req, res) => {
    try {
        let response = await categoryHandler.get(req.query);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/action', async(req, res) => {
    try {
        let response = await categoryHandler.action(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/update', async(req, res) => {
    try {
        let response = await categoryHandler.update(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/list', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        if (!req.query.user_id){
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await categoryHandler.list(req.query);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

module.exports = router;