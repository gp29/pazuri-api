'use strict';

const dotenv = require('dotenv')
dotenv.config()

const _ = require('underscore');
const requiredParams = [
    'APP_NAME',
    'PORT',
    'AWS_ACCESS_KEY_ID',
    'AWS_ACCESS_SECRET_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET_NAME',
    'AWS_S3_URL_PRIFIX',
    'AWS_S3_USER_BUCKET',
    'AWS_S3_IMAGE_BUCKET',
    'AWS_S3_CATEGORY_BUCKET',
    'DATABASE_URL',
    'PUSH_KEY',
    'GOOGLE_KEY',
    'TIME_ZONE',
    'AES_256_KEY',
    'AES_256_IV',
];

for (let i = 0; i < requiredParams.length; i++) {
    if (!_.has(process.env, requiredParams[i])) {
        console.log(
            'Error: environment variables have not been properly setup for the Pazuri Platform. The variable:',
            requiredParams[i],
            'was not found.'
        );

        throw new Error('Pazuri Platform Environment Variables Not Properly Set');
    }
}

module.exports = {
	default_language:'EN',
    time_zone:process.env.TIME_ZONE,
	appName: process.env.APP_NAME,
	port: process.env.PORT,
    database_url: process.env.DATABASE_URL,
    push_key: process.env.PUSH_KEY,
    google_key: process.env.GOOGLE_KEY,
    aes256:{
        key:process.env.AES_256_KEY,
        iv:process.env.AES_256_IV
    },
	aws:{
		keyId: process.env.AWS_ACCESS_KEY_ID,
        key: process.env.AWS_ACCESS_SECRET_KEY,
        region: process.env.AWS_REGION,
        bucketName: process.env.AWS_S3_BUCKET_NAME,
        prefix: process.env.AWS_S3_URL_PRIFIX,
        s3: {
            userBucket: process.env.AWS_S3_USER_BUCKET,
            imageBucket: process.env.AWS_S3_IMAGE_BUCKET,
            categoryBucket: process.env.AWS_S3_CATEGORY_BUCKET,
	    },
	}
};
