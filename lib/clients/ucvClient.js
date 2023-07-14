/*********************************************************************
* Licensed Materials - Property of HCL
* (c) Copyright HCL Technologies Ltd. 2018, 2019. All Rights Reserved.
*
* Note to U.S. Government Users Restricted Rights:
* Use, duplication or disclosure restricted by GSA ADP Schedule
* Contract with IBM Corp.
***********************************************************************/
import { VelocityApi } from '@velocity/api-client'
import EWMMapper, { SOURCE } from '../mapper/EWMMapper'
import log4js from '@velocity/logger'

const logger = log4js.getLogger('ucvClient')

export const IMPORT_TYPE = {
  ISSUE: 'ISSUE'
}

export default class UCVClient {
  static async initialize (serverUrl, securityToken) {
    if (!this.binding) {
      logger.info('Initializing API Client for EWM integration')
      this.binding = new VelocityApi(serverUrl, securityToken, { insecure: true, useBearerToken: false })
    }
  }

  static async syncWithVelocity (EWMProps, importType, imports) {
    const wrapOptions = {
      trackerId: EWMProps.id ? EWMProps.id.toString() : '',
      baseUrl: EWMProps.serverUrl,
      tenantId: EWMProps.tenantId,
      source: SOURCE
    }
    if (importType === IMPORT_TYPE.ISSUE) {
      await this.uploadIssues(EWMMapper.wrapIssues(imports, wrapOptions))
    }
  }

  static async uploadIssues (issueDataIn) {
    try {
      const result = await this.binding.mutation.uploadIssueData({ data: issueDataIn })
      return result
    } catch (error) {
      logger.error(error.stack)
      throw error
    }
  }

  static async reSync (integrationId, scheduledEventStates) {
    try {
      return this.binding.mutation.updateScheduledEventStates({ integrationId, scheduledEventStates }, '{_id}')
    } catch (error) {
      logger.error(error)
    }
  }
}
