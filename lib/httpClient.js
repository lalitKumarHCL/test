/* eslint-disable security/detect-new-buffer */
/* eslint-disable node/no-deprecated-api */
/*********************************************************************
* Licensed Materials - Property of HCL
* (c) Copyright HCL Technologies Ltd. 2018, 2019. All Rights Reserved.
*
* Note to U.S. Government Users Restricted Rights:
* Use, duplication or disclosure restricted by GSA ADP Schedule
* Contract with IBM Corp.
***********************************************************************/
import request from 'request-promise'
import { CREDENTIALS } from '../lib/constant/constants'
import UrlParse from 'url-parse'
import log4js from '@velocity/logger'
let cookiejar = request.jar()

const logger = log4js.getLogger('httpClient')
export default class httpClient {
  static async doRequest (reqMethod, reqUri, reqHeaders = {}, reqBody = null, fullResponse = false) {
    reqHeaders['Connection'] = 'keep-alive'
    // reqHeaders['Authorization'] = 'Basic ' + new Buffer('jtsadmin' + ':' + 'jtsadmin').toString('base64')
    reqHeaders['Authorization'] = 'Basic ' + new Buffer(CREDENTIALS.userName + ':' + CREDENTIALS.password).toString('base64')

    var options = {
      method: reqMethod,
      uri: reqUri,
      headers: reqHeaders,
      json: true,
      jar: cookiejar,
      rejectUnauthorized: false,
      resolveWithFullResponse: true,
      followAllRedirects: true,
      proxy: null
    }
    if (CREDENTIALS.proxyServer !== '') {
      const proxyServerParsed = new UrlParse(CREDENTIALS.proxyServer)
      const proxyData = `${proxyServerParsed.protocol}//${CREDENTIALS.proxyUsername}:${CREDENTIALS.proxyPassword}@${proxyServerParsed.host}`
      logger.debug(`Running with Proxy: ${proxyData}`)
      options.proxy = proxyData
    }
    if (reqBody != null) {
      options.body = reqBody
    }
    return request(options)
      .then(function (response) {
        return {
          success: true,
          payload: response.body,
          statusCode: response.statusCode,
          headers: response.headers
        }
      })
      .catch(function (err) {
        return {
          success: false,
          error: err
        }
      })
  }
}
