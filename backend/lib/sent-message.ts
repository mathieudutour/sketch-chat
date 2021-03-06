import { getUser } from './storage'

export const sendMessage = (connectionID: string, message: any) => {
  const user = getUser({ connectionID })

  if (!user.ws) {
    return
  }
  message.timestamp = Date.now()
  user.ws.send(JSON.stringify(message))
}
