# Observability end to end in Serverless Applications
Demo application for observability end-to-end in serverless applications.

## Configuration

Install [Cloud9 Environment](https://console.aws.amazon.com/cloud9/home) or configure on your own AWS CLI and access to cloud environment.
```
nvm install stable
sudo yum -y install jq 
sudo pip3 install locust
npm install
```

In following installation instructions there is need to have AWS account and access it from AWS CLI.

## Installation

Having cloned repository and configured aws access install application using Serverless Application Model.

```
sam build -t serverless-observ.yaml
sam deploy -g
```


## Running

Save to local environment url address to application for quick access:
```
export ApiUrl=$(aws cloudformation describe-stacks --stack-name ObservApp --output json | jq '.Stacks[].Outputs[] | select(.OutputKey=="ApiUrl") | .OutputValue' | sed -e 's/^"//'  -e 's/"$//')
echo "export ApiUrl="$ApiUrl
```
Add new item to DynamoDB:
```
curl -X POST \
  $ApiUrl/items/ \
  -d '{
        "id":"1",  
        "name": "Pierwsza rzecz"
  }'
```
Get all items using scan from DynamoDB table:
```
curl -X GET $ApiUrl/items/ | jq
```
Select single item from DynamoDB table:
``` 
curl -X GET $ApiUrl/items/1 | jq
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
