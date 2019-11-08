/* eslint-disable camelcase,no-return-await */
'use strict'
// noinspection NpmUsedModulesInstalled
const ActionHero = require('actionhero')
const api = ActionHero.api
const esl = require('modesl')
const nodemailer = require('nodemailer')
const shortid = require('shortid')
const crypto = require('crypto')
const uuid = require('uuid')
const should = require('should')
const chai = require('chai')

const dirtyChai = require('dirty-chai')
chai.use(dirtyChai)
const moment = require('moment')

let duckytils

class Validator {
  static isNumber (param) {
    if (typeof(param) !== 'number')
      throw new Error(param + ' IS_NOT_NUMBER')
  }
}

class SessionManager {
  constructor (config) {
    this.config = config
    this.tokenRedisPath = this.config.tokenRedisPath
    this.userRedisPath = this.config.userRedisPath
    this.user_id_fieldname = this.config.user_id_fieldname
    this.sessionTimeoutMS = this.config.sessionTimeoutMS
  }

  async new (connection_id, user) {
    let token = uuid.v1() + uuid.v4() + duckytils.hash.shortid() + connection_id
    return this.new_with_custom_token(token, connection_id, user)
  }

  async new_with_custom_token (token, connection_id, user, options) {
    let tokenRedisKey = this.tokenRedisPath + ':' + token
    let userRedisKey = this.userRedisPath + ':' + user[this.user_id_fieldname]
    if (!options) options = {}
    if (!options.sessionTimeoutMS) options.sessionTimeoutMS = this.sessionTimeoutMS
    await api.cache.save(tokenRedisKey, userRedisKey, options.sessionTimeoutMS)
    await api.cache.save(userRedisKey, user, options.sessionTimeoutMS)
    let userTokenRedisKey = userRedisKey + ':tokens:' + token
    await api.cache.save(userTokenRedisKey, token, options.sessionTimeoutMS)
    return token
  }

  // noinspection JSUnusedGlobalSymbols
  async delete (token) {
    let o
    let tokenRedisKey = this.tokenRedisPath + ':' + token
    try {
      o = await api.cache.load(tokenRedisKey, null)
      if (!o.value) return
    } catch (error) {
      return null
    }
    let userTokenRedisKey = o.value + ':tokens:' + token
    await api.cache.destroy(userTokenRedisKey)
    await api.cache.destroy(tokenRedisKey)
  }

  // noinspection JSUnusedGlobalSymbols
  async update (token, user) {
    let o
    let tokenRedisKey = this.tokenRedisPath + ':' + token
    try {
      o = await api.cache.load(tokenRedisKey, {expireTimeMS: this.sessionTimeoutMS})
      if (!o.value) return
    } catch (error) {
      return null
    }
    await api.cache.save(o.value, user, this.sessionTimeoutMS)
    let userTokenRedisKey = o.value + ':tokens:' + token
    await api.cache.save(userTokenRedisKey, token, this.sessionTimeoutMS)
    return true
  }

  // noinspection JSUnusedGlobalSymbols
  async find (token) {
    let o
    let tokenRedisKey = this.tokenRedisPath + ':' + token
    try {
      o = await api.cache.load(tokenRedisKey, {expireTimeMS: this.sessionTimeoutMS})
      if (!o.value) return
    } catch (error) {
      return null
    }
    try {
      const p = await api.cache.load(o.value, {expireTimeMS: this.sessionTimeoutMS})
      return p.value
    } catch (error) {
      return null
    }
  }
}

class SingleSessionManager {
  constructor (config) {
    this.config = config
    this.tokenRedisPath = this.config.tokenRedisPath
    this.userRedisPath = this.config.userRedisPath
    this.user_id_fieldname = this.config.user_id_fieldname
    this.sessionTimeoutMS = this.config.sessionTimeoutMS
  }

  async new (connection_id, user) {
    let token = uuid.v1() + uuid.v4() + duckytils.hash.shortid() + connection_id
    return this.new_with_custom_token(token, connection_id, user)
  }

  async new_with_custom_token (token, connection_id, user, options) {
    let tokenRedisKey = this.tokenRedisPath + ':' + token
    let userRedisKey = this.userRedisPath + ':' + user[this.user_id_fieldname]
    if (!options) options = {}
    if (!options.sessionTimeoutMS) options.sessionTimeoutMS = this.sessionTimeoutMS
    await api.cache.save(tokenRedisKey, userRedisKey, options.sessionTimeoutMS)
    await api.cache.save(userRedisKey, user, options.sessionTimeoutMS)
    let userTokenRedisKey = userRedisKey + ':token'
    await api.cache.save(userTokenRedisKey, token, options.sessionTimeoutMS)
    return token
  }

  // noinspection JSUnusedGlobalSymbols
  async delete (token) {
    let o
    let tokenRedisKey = this.tokenRedisPath + ':' + token
    try {
      o = await api.cache.load(tokenRedisKey, null)
      if (!o.value) return
    } catch (error) {
      return null
    }
    let userTokenRedisKey = o.value + ':token'
    await api.cache.destroy(userTokenRedisKey)
    await api.cache.destroy(tokenRedisKey)
  }

  // noinspection JSUnusedGlobalSymbols
  async update (token, user) {
    let o
    let tokenRedisKey = this.tokenRedisPath + ':' + token
    try {
      o = await api.cache.load(tokenRedisKey, {expireTimeMS: this.sessionTimeoutMS})
      if (!o.value) return
    } catch (error) {
      return null
    }
    await api.cache.save(o.value, user, this.sessionTimeoutMS)
    let userTokenRedisKey = o.value + ':token'
    await api.cache.save(userTokenRedisKey, token, this.sessionTimeoutMS)
    return true
  }

  // noinspection JSUnusedGlobalSymbols
  async find (token) {
    let o
    let tokenRedisKey = this.tokenRedisPath + ':' + token
    try {
      o = await api.cache.load(tokenRedisKey, {expireTimeMS: this.sessionTimeoutMS})
      if (!o.value) return
    } catch (error) {
      return null
    }
    try {
      const p = await api.cache.load(o.value, {expireTimeMS: this.sessionTimeoutMS})
      return p.value
    } catch (error) {
      return null
    }
  }

  // noinspection JSUnusedGlobalSymbols
  async find_token_by_user_id_fieldname_value (value) {
    let o
    let userRedisKey = this.userRedisPath + ':' + value
    let userTokenRedisKey = userRedisKey + ':token'
    try {
      o = await api.cache.load(userTokenRedisKey, {expireTimeMS: this.sessionTimeoutMS})
      if (!o.value) return
    } catch (error) {
      return null
    }
    return o.value
  }
}

// noinspection JSUnusedGlobalSymbols
duckytils = {
  Validator,
  SessionManager,
  SingleSessionManager,
  testInExecute: false,
  testActions: [],
  testMemory: [],
  hash: {
    shortid: function () {
      return shortid.generate()
    },
    stringToSHA256Hex: function (s) {
      // noinspection Annotator
      let hash = crypto.createHash('sha256')
      hash.update(s)
      return hash.digest('hex')
    },
    stringToSHA1Hex: function (s) {
      let hash = crypto.createHash('sha1')
      hash.update(s)
      return hash.digest('hex')
    }
  },
  // noinspection JSUnusedGlobalSymbols
  email: {
    send: async function (transporter, from, to, subject, html, text) {
      let mailTransporter = nodemailer.createTransport(transporter)
      let email = {
        from: from,
        to: to,
        subject: subject,
        html: html,
        text: text
      }
      await mailTransporter.sendMail(email)
      return api.log('Sent email to ' + to, 'notice', email)
    }
  },
  // noinspection JSUnusedGlobalSymbols
  xml: {
    getValue: function (tag, s) {
      let k1 = '<' + tag + '>'
      let k2 = '</' + tag + '>'
      let l1 = k1.length
      let p1 = s.search(k1) + l1
      let p2 = s.search(k2)
      return s.slice(p1, p2)
    }
  },
  // noinspection JSUnusedGlobalSymbols
  freeswitchESL: {
    jsRun: async function (config, script, params) {
      return new Promise((resolve, reject) => {
        try {
          let conn = new esl.Connection(config['eslIPAddress'], config['eslPort'], config['eslSecret'], () => {
            let p = ''
            for (let i = 0; i < params.length; i++) {
              p = p + ' ' + params[i]
            }
            let s = script + p
            conn.bgapi('jsrun', s, event => { return resolve(event) })
          })
        } catch (error) {
          reject(error)
        }
      })
    },
    luaRun: async function (data_tag, config, script, params) {
      return new Promise((resolve, reject) => {
        try {
          duckytils.log(data_tag, 'info', 'Connecting to ' + config['eslIPAddress'] + ':' + config['eslPort'])
          let conn = new esl.Connection(config['eslIPAddress'], config['eslPort'], config['eslSecret'], () => {
            duckytils.log(data_tag, 'info', 'Connected to ' + config['eslIPAddress'] + ':' + config['eslPort'])
            let p = ''
            for (let i = 0; i < params.length; i++) {
              p = p + ' ' + params[i]
            }
            let s = script + p
            duckytils.log(data_tag, 'info', 'Execute luarun ' + s)
            conn.bgapi('luarun', s, event => { return resolve(event) })
          })
        } catch (error) {
          duckytils.log(data_tag, 'error', 'Fail to connect to ' + config['eslIPAddress'] + ':' + config['eslPort'] + ' reason:' + error.message, [error])
          reject(error)
        }
      })
    },
    smsOutSend: async function (config, messageId, from, to, message) {
      return new Promise((resolve, reject) => {
        let conn = new esl.Connection(config['eslIPAddress'], config['eslPort'], config['eslSecret'], async function () {
          try {
            let toRealm = config['smsOutGatewayToRealm']

            let fromRealm = config['smsOutGatewayFromRealm']
            let event = new esl.Event('CUSTOM', 'SMS::SEND_MESSAGE')
            event.addHeader('to', to + '@' + toRealm)
            event.addHeader('from', from + '@' + fromRealm)
            event.addHeader('to_sip_ip', config['smsOutGatewayIPAddress'])
            event.addHeader('to_sip_port', config['smsOutGatewayPort'])
            event.addHeader('sip_profile', config['smsOutGatewaySIPProfile'])
            event.addHeader('dest_proto', 'sip')
            event.addHeader('type', 'text/plain')
            event.addBody(message)
            conn.sendEvent(event)
            api.log('Sending message id=' + messageId + ' from ' + from + ' to ' + to, 'notice', null)
          } catch (error) {
            return reject(error)
          }
          return resolve(messageId)
        })
      })
    }
  },
  // noinspection JSMethodCanBeStatic,JSUnusedGlobalSymbols
/*  installDB: async (config) => {
    api.log('Installing...', 'warning', null)
    try {
      // noinspection JSUnresolvedFunction
      await api.redis.clients.client.flushdb()
    } catch (error) {
      api.log('Redis FlushDB error', 'error', error)
      throw error
    }
    try {
      await duckypg.db.forceCreate(config)
    } catch (error) {
      api.log('Cannot force create database ' + config.database, 'error', error)
      throw error
    }
    api.log('Creating database ' + config.database + ' done.', 'warning', null)
    api.log('Installing done.', 'warning', null)
  },*/

  testIt: async (next) => {
    return duckytils.testActions.push(next)
  },

  testExecute: async () => {
    // noinspection JSUnusedGlobalSymbols
    duckytils.testInExecute = true
    for (let i = 0; i < duckytils.testActions.length; i++) {
      await duckytils.testActions[i]()
    }
    // noinspection JSUnusedGlobalSymbols
    duckytils.testInExecute = false
  },

// noinspection JSMethodCanBeStatic
  testRunAction: async (actionName, params) => {
    const response = await api.specHelper.runAction(actionName, params)
    console.log(JSON.stringify(response, null, 2))
    should.not.exist(response.error)
    should.exist(response.resultCode, 'response.resultCode should exist.')
    return response
  },

  testRunActionOK: async (actionName, params) => {
    const response = await duckytils.testRunAction(actionName, params)
    response.resultCode.should.be.equal('OK', 'resultCode value should OK')
    return response
  },

// noinspection JSUnusedGlobalSymbols
  testRunActionFail: async (actionName, params) => {
    const response = await duckytils.testRunAction(actionName, params)
    response.resultCode.should.be.equal('FAIL', 'resultCode value should FAIL')
    return response
  },

// noinspection JSMethodCanBeStatic
  actionDone: async (actionObject, data, error) => {
    if (error) {
      if (error.message.startsWith('FAIL_')) {
        duckytils.log(data.tag, 'notice', 'Notice Exception:' + error.message, [data.tag, error.stack, error.message, actionObject.name, data.params])
      } else {
        duckytils.log(data.tag, 'error', 'Exception:' + error.message, [data.tag, error.stack, error.message, actionObject.name, data.params])
      }
      data.response.resultCode = 'FAIL'
      data.response.reasonText = error.message
      duckytils.log(data.tag, 'info', 'Action End: FAIL ' + actionObject.name, [data.response])
      return
    }
    if (!data.response.resultCode) data.response.resultCode = 'OK'
    duckytils.log(data.tag, 'info', 'Action End: OK ' + actionObject.name)
  },

// noinspection JSMethodCanBeStatic
  actionDoneHideReason: async (actionObject, data, error) => {
    if (error) {
      duckytils.log(data.tag, 'error', 'Error:' + error.message, [data.tag, error.stack, error.message, actionObject.name, data.params])
      data.response.resultCode = 'FAIL'
      data.response.reasonText = 'FAIL'
      duckytils.log(data.tag, 'info', 'Action End: FAIL ' + actionObject.name, [data.response])
      return
    }
    if (!data.response.resultCode) data.response.resultCode = 'OK'
    duckytils.log(data.tag, 'info', 'Action End: OK ' + actionObject.name)
  },

  log: (data_tag, type, msg, objects) => {
    if (data_tag) {
      api.log('[' + data_tag.toString() + '] ' + msg, type, objects)
      return
    }
    api.log(msg, type, objects)
  },

  actionRun: async (actionObject, data, fn) => {
    if (!data.pushnotifications) data.pushnotifications = []
    if (!data.tag) data.tag = moment().format('YYYYMMDDHHmmssSSSZZ') + shortid.generate()
    duckytils.log(data.tag, 'info', 'Action Start: ' + actionObject.name)
    try {
      await fn(actionObject)
      duckytils.log(data.tag, 'info', 'Action Execute Done: ' + actionObject.name)
      return await duckytils.actionDone(actionObject, data)
    } catch (error) {
      return await duckytils.actionDone(actionObject, data, error)
    }
  },

// noinspection JSUnusedGlobalSymbols
  actionRunHideReason: async (actionObject, data, fn) => {
    if (!data.tag) data.tag = moment().format('YYYYMMDDHHmmssSSSZZ') + shortid.generate()
    duckytils.log(data.tag, 'info', 'Action Start: ' + actionObject.name)
    try {
      await fn()
      duckytils.log(data.tag, 'info', 'Action Execute Done: ' + actionObject.name)
      return await
        duckytils.actionDone(actionObject, data)
    } catch (error) {
      return await
        duckytils.actionDoneHideReason(actionObject, data, error)
    }
  }
}

// noinspection JSUnusedGlobalSymbols,JSUnusedGlobalSymbols
module.exports = duckytils
