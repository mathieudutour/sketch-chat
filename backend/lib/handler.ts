import { _handler } from './_handler'
import { removeUser, getUser, getRoom } from './storage'
import { sendMessage } from './sent-message'

export const connectionHandler = _handler(async event => {
  const { name, avatar } = event.queryStringParameters
  const connectionID = event.requestContext.connectionId

  await getUser({ connectionID, name, avatar })

  return {
    message: 'ok',
  }
})

export const defaultHandler = _handler(async event => {
  const connectionID = event.requestContext.connectionId
  const user = await getUser({ connectionID })
  const body = JSON.parse(event.body || '{}')

  body.user = {
    name: user.name,
    avatar: user.avatar,
  }
  body.isMessage = true

  const room = await getRoom(body.room)

  await Promise.all(
    room.users
      .filter(x => x !== connectionID)
      .map(x => sendMessage(event, x, body))
  )

  return {
    message: 'ok',
  }
})

export const disconnectionHandler = _handler(async event => {
  await removeUser(event.requestContext.connectionId)
  return {
    message: 'ok',
  }
})
