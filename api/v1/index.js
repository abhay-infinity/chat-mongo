const express = require('express')
const router = express.Router()

//-------------------------------------------------------------------------//

const auth = require('./auth/routes')
const users = require('./users/routes')
const chats = require('./chats/routes')
const messages = require('./messages/routes')
const groups = require('./groups/routes')
const coins = require('./coins/routes')
const socketTest = require('./test/socket-test')

//-------------------------------------------------------------------------//

router.use('/auth', auth)
router.use('/users', users)
router.use('/chats', chats)
router.use('/messages', messages)
router.use('/groups', groups)
router.use('/coins', coins)
router.use('/test', socketTest)

//-------------------------------------------------------------------------//

module.exports = router
