const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
const docClient = new AWS.DynamoDB.DocumentClient()

const { Unit } = require('aws-embedded-metrics');
const { logMetricEMF } = require('../lib/logging/logger')
const { logger_setup } = require('../lib/logging/logger')
let log
let _cold_start = true

exports.getAllItemsHandler = async(event, context) => {
    return AWSXRay.captureAsyncFunc('## Handler', async(subsegment) => {
        log = logger_setup()
        let response

        log.info(event)
        log.info(context)
        try {
            if (_cold_start) {
                //Metrics
                await logMetricEMF(name = 'ColdStart', unit = Unit.Count, value = 1, { service: 'itemService', function_name: context.functionName })
                _cold_start = false
            }
            if (event.httpMethod !== 'GET') {
                // Logging
                log.error({ operation: 'getAllItems', method: 'getAllItemsHandler', details: 'getAllItems only accept GET method, you tried: ${event.httpMethod}' })
                //throw new Error('getAllItems only accept GET method, you tried: ${event.httpMethod}')
            }
            //throw new Error('Sample exception introduction')
            const items = await getAllItems(subsegment)
            response = {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(items)
            }
            //Metrics
            await logMetricEMF(name = 'SuccessfulGetAllItems', unit = Unit.Count, value = 1, { service: 'itemService', operation: 'getAllItems' })
            //Tracing
            subsegment.addAnnotation('ItemsCount', items.Count)
            subsegment.addAnnotation('Status', 'SUCCESS')
        }
        catch (err) {
            //Tracing
            subsegment.addAnnotation('Status', 'FAILED')
            response = {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(err)
            }

            //Metrics
            await logMetricEMF(name = 'FailedGetAllItems', unit = Unit.Count, value = 1, { service: 'itemService', operation: 'getAllItems' })
            // Logging
            log.error({ operation: 'getAllItems', method: 'getAllItemsHandler', details: err })
        }
        finally {
            subsegment.close()
        }
        // Logging
        log.info({ operation: 'getAllItems', method: 'getAllItemsHandler', eventPath: event.path, statusCode: response.statusCode, body: JSON.parse(response.body) })
        return response
    }, AWSXRay.getSegment());
}


const getAllItems = async(segment) => {
    return AWSXRay.captureAsyncFunc('## getAllItemsData', async(subsegment) => {
        let response
        try {
            var params = {
                TableName: process.env.SAMPLE_TABLE
            }
            response = await docClient.scan(params).promise()
            //Tracing
            subsegment.addMetadata('items', response)
        }
        catch (err) {
            throw err
        }
        finally {
            subsegment.close()
        }
        return response
    }, segment);
}
