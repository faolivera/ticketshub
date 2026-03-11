/**
 * Socket.IO event names (client-server contract).
 */

/** Client subscribes to a transaction chat room */
export const CHAT_JOIN = 'chat:join';

/** Client unsubscribes from a transaction chat room */
export const CHAT_LEAVE = 'chat:leave';

/** Client sends a chat message (or server broadcasts new message) */
export const CHAT_MESSAGE = 'chat:message';

/** Server pushes a new in-app notification to the user */
export const NOTIFICATION = 'notification';
