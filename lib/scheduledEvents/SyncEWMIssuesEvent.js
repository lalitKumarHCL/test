/*********************************************************************
* Licensed Materials - Property of HCL
* (c) Copyright HCL Technologies Ltd. 2018, 2019. All Rights Reserved.
*
* Note to U.S. Government Users Restricted Rights:
* Use, duplication or disclosure restricted by GSA ADP Schedule
* Contract with IBM Corp.
***********************************************************************/
import log4js from '@velocity/logger'
import { SOURCE } from '../mapper/EWMMapper'
import { CREDENTIALS } from '../constant/constants'
import OSLCClient from '../clients/oslcClient'
import UCVClient from '../clients/ucvClient'
import moment from 'moment'

const logger = log4js.getLogger('SyncEWMIssuesEvent')

export default {
  execute: execute,
  name: 'Sync EWM Issues',
  description: 'Query EWM for issues in a group of projects',
  interval: 5,
  getEWMProps: getEWMProps // For unit tests
}

async function execute (state, properties) {
  logger.debug(JSON.stringify(state))
  logger.debug(JSON.stringify(properties))
  if (properties._userAccessKey) {
    properties.ucvAccessKey = properties._userAccessKey
  } else if (!properties.ucvAccessKey) {
    logger.error('User Access Key not found. Please manually add a User Access Key in hidden properties field.')
    throw new Error('User Access Key not found. Please manually add a User Access Key in hidden properties field.')
  }
  try {
    properties.serverUrl = properties.serverUrl.endsWith('/') ? properties.serverUrl.slice(0, -1) : properties.serverUrl
    const EWMProps = getEWMProps(state, properties)
    const lastRun = EWMProps.lastRun
    logger.info(`getting issues for EWM Server ${EWMProps.serverUrl} since lastSync of ${moment().toISOString(lastRun)}`)
    const oslcClient = new OSLCClient(EWMProps)
    const syncCount = await oslcClient.syncWorkItemsWithUCV(EWMProps)
    logger.info(`found ${syncCount} issues since lastSync of ${moment().toISOString(lastRun)}`)
    return {
      type: 'ISSUE',
      source: SOURCE,
      data: []
    }
  } catch (error) {
    logger.error(error)
    throw error
  } finally {
    try {
      if (state.hasOwnProperty('deltaTime')) {
        let event = 'Sync EWM Issues'
        UCVClient.initialize(state.apiServerUrl, properties.finalAccessKey)
        await UCVClient.reSync(state.trackerId, { eventName: event, deltaTime: -1 })
      }
    } catch (error) {
      logger.error(error)
    }
  }
}

function getEWMProps (state, properties) {
  let lastRun
  if (state.hasOwnProperty('deltaTime') && state.deltaTime !== -1 && state.deltaTime < state.lastRun) {
    lastRun = state.deltaTime
    logger.info(`ReSyncing from delaTime: ${state.deltaTime}`)
  } else {
    lastRun = state.lastRun
  }
  const stateConversion = {
    id: state.trackerId,
    lastRun: lastRun,
    tenantId: state.tenantId,
    apiServerUrl: state.apiServerUrl
  }
  CREDENTIALS.userName = properties.userId
  CREDENTIALS.password = properties.password
  if (properties.proxyServer) {
    CREDENTIALS.proxyServer = properties.proxyServer
    if (properties.proxyUsername && properties.proxyPassword) {
      CREDENTIALS.proxyUsername = properties.proxyUsername
      CREDENTIALS.proxyPassword = properties.proxyPassword
    }
  }
  return Object.assign({}, properties, stateConversion)
}
