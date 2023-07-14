/*********************************************************************
* Licensed Materials - Property of HCL
* (c) Copyright HCL Technologies Ltd. 2018, 2019. All Rights Reserved.
*
* Note to U.S. Government Users Restricted Rights:
* Use, duplication or disclosure restricted by GSA ADP Schedule
* Contract with IBM Corp.
***********************************************************************/
import util from 'util'
import httpClient from '../httpClient'
import log4js from '@velocity/logger'
import moment from 'moment'
import rdflib from 'rdflib'
import _ from 'lodash'
import OSLCResource from '../OSLCResource'
import EWMMapper from '../mapper/EWMMapper'
import UCVClient, { IMPORT_TYPE } from './ucvClient'
import urljoin from 'url-join'
const logger = log4js.getLogger('oslcClient')
const CM_PAGE_SIZE = 20
const OSLCCM = rdflib.Namespace('http://open-services.net/ns/cm#')

export default class OSLCClient {
  constructor (props) {
    this.serverUrl = props.serverUrl
    this.projects = props.projects
    this.user = props.userId
    this.pass = props.password
    this.oslcResource = null
    this.oslcResourceForSPServiceUrls = null
  }

  async syncWorkItemsWithUCV (EWMProps) {
    // README has the details of the OSLC protocol used here to interact with the IBM EWM (formerly IBM RTC) server
    const cmServiceProvideCatalogueUrl = await this.getCMServiceProvideCatalogueUrl()
    const serviceProviderCatalogue = await this.getserviceProviderCatalogue(cmServiceProvideCatalogueUrl)
    this.oslcResource = serviceProviderCatalogue
    let serviceProviderUrl
    let totalSyncCount = 0
    let syncCount
    for (const project of this.projects) {
      syncCount = 0
      serviceProviderUrl = this.oslcResource.getServiceProviderUrl(project)
      logger.debug('serviceProviderUrl ===> ', serviceProviderUrl)
      if (serviceProviderUrl == null) {
        logger.error('serviceProviderUrl is null from getServiceProvider in syncWorkItemsWithUCV')
        throw new Error('serviceProviderUrl is null')
      }
      await this.getSPServiceUrls(serviceProviderUrl)
      syncCount = await this.getAllWorkItems(EWMProps, project)
      logger.info(`syncCount from ${project} is ${syncCount}`)
      totalSyncCount += syncCount
    }
    return totalSyncCount
  }

  async getCMServiceProvideCatalogueUrl () {
    let uri = util.format('%s/%s', this.serverUrl, 'rootservices')
    logger.info('url', uri)
    let response = await httpClient.doRequest('GET', uri, { 'OSLC-Core-Version': '2.0', 'Accept': 'application/rdf+xml' })
    if (response.success) {
      // creates a storage for storing the rdf+xml data returned by the OSLC API
      let kb = new rdflib.IndexedFormula()
      // parse response payload from OSLC API into 'kb' / 'knowledge base' and 'uri'
      try {
        rdflib.parse(response.payload, kb, uri, 'application/rdf+xml')
      } catch (err) {
        logger.error(`parsing failed in getCMServiceProvideCatalogueUrl with err ${err}`)
        throw err
      }
      // let uri1 = util.format('%s/%s', 'https://ip-c0a8109b:9443/ccm', 'rootservices')
      this.oslcResource = new OSLCResource(uri, kb)
      logger.debug('oslcResource Object:-', this.oslcResource)
      let catalogueUrl = this.oslcResource.getCMSPCatalogueUrl()
      if (catalogueUrl != null) {
        return catalogueUrl
      } else {
        logger.warn('catalogueUrl is null from oslcResource.getCMSPCatalogueUrl in getCMServiceProvideCatalogueUrl')
        return urljoin(this.serverUrl, 'oslc/workitems/catalog')
        // throw new Error('Change Management Service Provider Catalogue is null')
      }
    } else {
      logger.error(response.error)
      throw response.error
    }
  }
  async getserviceProviderCatalogue (cmServiceProvideCatalogueUrl) {
    let uri = util.format('%s/%s=%s&%s=%s', cmServiceProvideCatalogueUrl, 'j_security_check?j_username', this.user, 'j_password', this.pass)
    logger.info('getserviceProviderCatalogue===>', uri)
    let response = await httpClient.doRequest('GET', uri, { 'OSLC-Core-Version': '2.0', 'Accept': 'application/rdf+xml' })
    logger.info('getserviceProviderCatalogue = response==>', JSON.stringify(response))
    if (response.success) {
      if (response.headers['x-com-ibm-team-repository-web-auth-msg'] === 'authfailed') {
        logger.error(`Authentication failed at EWM server, response from server is ${response.payload}`)
        throw new Error('Authentication failed at EWM server')
      }
      if (response.payload && response.payload.startsWith('<!DOCTYPE html')) {
        logger.info('SSO ENABLE OR EWM VERSION GRETER Than 7.0 !!!')
        uri = util.format(cmServiceProvideCatalogueUrl)
        logger.info('getserviceProviderCatalogue===>', uri)
        response = await httpClient.doRequest('GET', uri, { 'OSLC-Core-Version': '2.0', 'Accept': 'application/rdf+xml' })
      }
    } else {
      logger.error(response.error)
      throw response.error
    }
    let kb = new rdflib.IndexedFormula()
    try {
      rdflib.parse(response.payload, kb, cmServiceProvideCatalogueUrl, 'application/rdf+xml')
    } catch (err) {
      logger.error(`Error parsing RDF data in getserviceProviderCatalogue, error is ${err}`)
      throw err
    }
    return new OSLCResource(cmServiceProvideCatalogueUrl, kb)
  }

  async getSPServiceUrls (serviceProviderUrl) {
    let response = await httpClient.doRequest('GET', serviceProviderUrl, { 'OSLC-Core-Version': '2.0', 'Accept': 'application/rdf+xml' })
    if (response.success) {
      var kb = new rdflib.IndexedFormula()
      try {
        rdflib.parse(response.payload, kb, serviceProviderUrl, 'application/rdf+xml')
      } catch (err) {
        logger.error(`Error parsing RDF data in getSPServiceUrls, error is ${err}`)
        throw err
      }
      this.oslcResourceForSPServiceUrls = new OSLCResource(serviceProviderUrl, kb)
      return 'success'
    } else {
      logger.error(response.error)
      throw response.error
    }
  }

  async getAllWorkItems (EWMProps, project) {
    await UCVClient.initialize(EWMProps.apiServerUrl, EWMProps.ucvAccessKey)
    let duration = EWMProps.since ? EWMProps.since : 12
    let lastRunTime = (EWMProps.lastRun === 0) ? moment().subtract(duration, 'months').utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]') : moment(EWMProps.lastRun).utc().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]')
    let hasMorePages = true
    var projectWorkItems = []
    let WorkItemsAPI
    var syncCount = 0
    WorkItemsAPI = await this.getWorkItemsAPI(lastRunTime)
    logger.debug('WorkItemsAPI ===> ', WorkItemsAPI)
    while (hasMorePages) {
      let response = await httpClient.doRequest('GET', WorkItemsAPI, { 'OSLC-Core-Version': '2.0', 'Accept': 'application/json' })
      logger.debug('WorkItemsAPI response ===> ', JSON.stringify(response))
      if (response.success) {
        hasMorePages = response.payload['oslc:responseInfo']['oslc:nextPage'] ? hasMorePages : false
        if (hasMorePages) {
          WorkItemsAPI = response.payload['oslc:responseInfo']['oslc:nextPage']
        }
        projectWorkItems = response.payload['oslc:results']
        let promiseArray = _.map(projectWorkItems, issue => EWMMapper.mapEWMIssue({ serverUrl: this.serverUrl }, Object.assign({}, issue, { 'project': { 'id': project, 'key': project, 'name': project } })))
        await Promise.all(promiseArray)
          .then(mappedIssues => {
            UCVClient.syncWithVelocity(EWMProps, IMPORT_TYPE.ISSUE, mappedIssues)
            return mappedIssues
          }).then(mappedIssues => {
            syncCount += mappedIssues.length
            return syncCount
          })
      } else {
        logger.error(response.error)
        throw response.error
      }
    }
    return syncCount
  }

  async getWorkItemsAPI (lastRunTime) {
    let WorkItemsAPI
    let query
    query = {
      pageSize: CM_PAGE_SIZE,
      from: this.oslcResourceForSPServiceUrls.queryBase(OSLCCM('ChangeRequest').uri),
      select: `dcterms:identifier,dcterms:title,dcterms:creator{*},dcterms:contributor{*},oslc_cm:status,dcterms:created,dcterms:modified,dcterms:type,oslc_cmx:priority{*},dcterms:description,dcterms:subject,rtc_cm:com.ibm.team.workitem.linktype.relatedworkitem.related{dcterms:identifier},rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.children{dcterms:identifier},rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.parent{dcterms:identifier},rtc_cm:com.ibm.team.filesystem.workitems.change_set.com.ibm.team.scm.ChangeSet{*}`,
      where: `dcterms:modified>"${lastRunTime}"`
    }
    WorkItemsAPI = this.oslcResourceForSPServiceUrls.query(query)
    return WorkItemsAPI
  }
}
