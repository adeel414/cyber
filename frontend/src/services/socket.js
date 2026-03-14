// services/socket.js - Socket.io client for CyberLens AI
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin

let socket = null

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
    })
  }
  return socket
}

export const connectSocket = (userId) => {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
    s.once('connect', () => {
      if (userId) {
        s.emit('join-user', userId)
      }
    })
  }
  return s
}

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export const joinScanRoom = (scanId) => {
  const s = getSocket()
  s.emit('join-scan', scanId)
}

export default { getSocket, connectSocket, disconnectSocket, joinScanRoom }
