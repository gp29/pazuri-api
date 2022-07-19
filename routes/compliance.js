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

module.exports = router;