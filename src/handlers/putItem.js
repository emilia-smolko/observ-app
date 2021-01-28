const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
//Adding application metrics
const { MetricUnit } = require('../lib/helper/models')
const { putMetric } = require('../lib/logging/logger')
let _cold_start = true

const docClient = new AWS.DynamoDB.DocumentClient()
const sns = new AWS.SNS();

exports.putItemHandler = async(event, context) => {
    return AWSXRay.captureAsyncFunc('## Handler', async(subsegment) => {
        let response
        try {
            if (_cold_start) {
                //Metrics
                await putMetric(name = 'ColdStart', unit = MetricUnit.Count, value = 1, { service: 'itemService', function_name: context.functionName })
                _cold_start = false
            }
            if (event.httpMethod !== 'POST') {
                throw new Error(`PutItem only accept POST method, you tried: ${event.httpMethod}`)
            }

            const item = await putItem(event, subsegment)
            await publishSns(item, subsegment)

            response = {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(item)
            }

            //Metrics
            await putMetric(name = 'SuccessfulPutItem', unit = MetricUnit.Count, value = 1, { service: 'itemService', operation: 'putItem' })
            //Tracing
            subsegment.addAnnotation('ItemID', JSON.parse(event.body).id)
            subsegment.addAnnotation('Status', 'SUCCESS')
        }
        catch (err) {
            //Tracing
            subsegment.addAnnotation('ItemID', JSON.parse(event.body).id)
            subsegment.addAnnotation('Status', 'FAILED')
            response = {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify(err)
            }
            //Metrics
            await putMetric(name = 'FailedPutItem', unit = MetricUnit.Count, value = 1, { service: 'itemService', operation: 'putItem' })
        }
        finally {
            subsegment.close()
        }

        return response
    }, AWSXRay.getSegment());
}

const putItem = async(event, segment) => {
    return AWSXRay.captureAsyncFunc('## putItemData', async(subsegment) => {
        let response
        try {
            const body = JSON.parse(event.body)
            const id = body.id
            const name = body.name

            var params = {
                TableName: process.env.SAMPLE_TABLE,
                Item: { id: id, name: name }
            }

            response = await docClient.put(params).promise()

            //Tracing
            subsegment.addMetadata('Item Payload', params)
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


const publishSns = async(data, segment) => {
    return AWSXRay.captureAsyncFunc('## publishNewItemSNS', async(subsegment) => {
        let response
        try {
            const msg = {
                TopicArn: process.env.TOPIC_NAME,
                Message: JSON.stringify({
                    operation: "notify_new_item",
                    details: {
                        id: 1,
                        name: "N/A"
                    }
                }),
                MessageAttributes: {
                    "Status": { "DataType": "String", "StringValue": "Success" }
                }
            }

            response = await sns.publish(msg).promise()

            subsegment.addMetadata('Message Payload', msg)
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
