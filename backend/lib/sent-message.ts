import { APIGatewayProxyEvent } from 'aws-lambda'
import ensureApiGatewayManagementApi from 'aws-apigatewaymanagementapi'
import * as AWS from 'aws-sdk'

ensureApiGatewayManagementApi(AWS)

export const sendMessage = async (
  event: APIGatewayProxyEvent,
  connectionId: string,
  message: string
) => {
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint:
      event.requestContext.domainName + '/' + event.requestContext.stage,
  })

  await apigwManagementApi
    .postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    })
    .promise()
}
