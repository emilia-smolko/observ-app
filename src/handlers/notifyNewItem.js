const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))

exports.notifiyNewItemHandler = async(event, context) => {
  return AWSXRay.captureAsyncFunc('## Handler', async(subsegment) => {
    let response
    try {
      const record = JSON.parse(event.Records[0].Sns.Message)
      response = await getItem(record, subsegment)
      //Tracing
      subsegment.addAnnotation('ItemID', id)
      subsegment.addAnnotation('Status', 'SUCCESS')
    }
    catch (err) {
      //Tracing
      subsegment.addAnnotation('ItemID', id)
      subsegment.addAnnotation('Status', 'FAILED')
      throw err
    }
    finally {
      subsegment.close()
    }
    return response
  }, AWSXRay.getSegment());
}


const getItem = async(record, segment) => {
  return AWSXRay.captureAsyncFunc('## subscribeSNSNewItem', async(subsegment) => {
    let response
    try {
      response = JSON.stringify(record)
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
