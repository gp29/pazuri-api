'use strict';

const responseCodes = require('./../utils/response-codes');
const jsonResponse = require('./../utils/json-response');
const config = require('./../config');
const errors = require('./../utils/dz-errors');
const express = require('express');
const router = express.Router();
const labels = require('./../utils/labels.json')
const userHandler = require('./../model_handlers/user-handler');
const encryptDecryptHandler = require('./../model_handlers/encrypt-decrypt-handler');

router.post('/create', async(req, res) => {
    try {
        let requestParam = JSON.parse(req.body.fields);
        let response = await userHandler.create(requestParam, req);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/get-sort', async(req, res) => {
    try {
        let response = await userHandler.getSort(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/get', async(req, res) => {
    try {
        let response = await userHandler.get(req.query);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/action', async(req, res) => {
    try {
        let response = await userHandler.action(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/update', async(req, res) => {
    try {
        let requestParam = JSON.parse(req.body.fields);
        let response = await userHandler.update(requestParam, req);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/change-password', async(req, res) => {
    try {
        let response = await userHandler.changePassword(req.body);
        jsonResponse(res, responseCodes.OK, null, response);
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/user-list', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        if (!req.query.user_id || !req.query.page) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await userHandler.userList(req.query);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/details', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        if (!req.query.user_id || !req.query.opponent_user_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await userHandler.details(req.query);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/create-meetup', async(req, res) => {
    try {
        if (!req.body.user_id || !req.body.title || !req.body.description || !req.body.date || !req.body.time || !req.body.duration || !req.body.location || !req.body.user_id || !req.files.photo)  {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await userHandler.createMeetup(req.body, req);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/meetup-notification', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        if (!req.query.user_id || !req.query.page) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await userHandler.meetupNotification(req.query);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/accept-reject-meetup', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.user_id || !req.body.meetup_id || !req.body.type) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await userHandler.acceptRejectMeetup(req.body);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.post('/delete-meetup', async(req, res) => {
    try {
        req.body = await encryptDecryptHandler.decryptJson(req.body.encrypt_data)
        if (!req.body.user_id || !req.body.meetup_id) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await userHandler.deleteMeetup(req.body);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

router.get('/created-meetup-list', async(req, res) => {
    try {
        req.query = await encryptDecryptHandler.decryptJson(req.query.encrypt_data)
        if (!req.query.user_id || !req.query.page) {
            jsonResponse(res, responseCodes.BadRequest, errors(labels.LBL_MISSING_PARAMETERS[config.default_language], responseCodes.BadRequest), null)
            return
        }
        let response = await userHandler.createdMeetupList(req.query);
        jsonResponse(res, responseCodes.OK, null, await encryptDecryptHandler.encrypt(response));
    } catch (error) {
        jsonResponse(res, error.code, error, null);
    }
});

module.exports = router;