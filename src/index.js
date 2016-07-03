import 'babel-polyfill'
import {Bot} from './bot'

const bot = new Bot({
  clientId: process.env.CLIENT_ID,
  token: process.env.TOKEN,
  perms: [
    'CREATE_INSTANT_INVITE', 'KICK_MEMBERS', 'BAN_MEMBERS',
    'MANAGE_CHANNELS', 'READ_MESSAGES', 'SEND_MESSAGES',
    'MANAGE_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES',
    'READ_MESSAGE_HISTORY', 'MENTION_EVERYONE',
    'CHANGE_NICKNAME', 'MANAGE_NICKNAMES', 'MANAGE_ROLES',
  ],
})


console.log(bot.getAuthUrl())
bot.on('debug', console.log)
bot.on('error', console.error)
