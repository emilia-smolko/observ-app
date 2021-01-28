const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
//Adding application metrics
const { MetricUnit } = require('../lib/helper/models')
const { logMetric } = require('../lib/logging/logger')
let _cold_start = true
const docClient = new AWS.DynamoDB.DocumentClient()

exports.getByIdHandler = async(event, context) => {
  return AWSXRay.captureAsyncFunc('## Handler', async(subsegment) => {
    let response, id
    try {
      if (_cold_start) {
        //Metrics
        await logMetric(name = 'ColdStart', unit = MetricUnit.Count, value = 1, { service: 'itemService', function_name: context.functionName })
        _cold_start = false
      }
      if (event.httpMethod !== 'GET') {
        throw new Error(`getById only accept GET method, you tried: ${event.httpMethod}`)
      }
      id = event.pathParameters.id
      const item = await getItemById(id, subsegment)
      response = {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(item)
      }

      //Metrics
      await logMetric(name = 'SuccessfulGetItem', unit = MetricUnit.Count, value = 1, { service: 'itemService', operation: 'getById' })
      //Tracing
      subsegment.addAnnotation('ItemID', id)
      subsegment.addAnnotation('Status', 'SUCCESS')
    }
    catch (err) {
      //Tracing
      subsegment.addAnnotation('ItemID', id)
      subsegment.addAnnotation('Status', 'FAILED')
      response = {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(err)
      }
      //Metrics
      await logMetric(name = 'FailedGetItem', unit = MetricUnit.Count, value = 1, { service: 'itemService', operation: 'getById' })
    }
    finally {
      subsegment.close()
    }
    return response
  }, AWSXRay.getSegment());
}



const getItemById = async(id, segment) => {
  return AWSXRay.captureAsyncFunc('## getItemData', async(subsegment) => {
    let response
    try {
      var params = {
        TableName: process.env.SAMPLE_TABLE,
        Key: { id: id }
      }

      response = await docClient.get(params).promise()
      //Tracing
      subsegment.addMetadata('Item', response)
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
