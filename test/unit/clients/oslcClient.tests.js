/*********************************************************************
* Licensed Materials - Property of HCL
* (c) Copyright HCL Technologies Ltd. 2018, 2019. All Rights Reserved.
*
* Note to U.S. Government Users Restricted Rights:
* Use, duplication or disclosure restricted by GSA ADP Schedule
* Contract with IBM Corp.
***********************************************************************/
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import httpClient from '../../../lib/httpClient'
import OSLCClient from '../../../lib/clients/oslcClient'
import OSLCResource from '../../../lib/OSLCResource'
import rdflib from 'rdflib'
import UCVClient from '../../../lib/clients/ucvClient'
import sinonTestFactory from 'sinon-test'
import _ from 'lodash'

chai.use(chaiAsPromised)
const expect = chai.expect
const sinonTest = sinonTestFactory(sinon)
const EWMProps = {
  serverUrl: 'https://localhost:9443/ccm',
  projects: ['JKE Banking'],
  userId: 'admin',
  password: 'pass',
  since: 6
}
const fake = sinon.fake.returns()
sinon.replace(rdflib, 'parse', fake)

describe('OSLCClient', () => {
  describe('OSLCClientConstructor', () => {
    it('should return an object with all EWM properties', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      expect(oslcClient.serverUrl).to.be.equal('https://localhost:9443/ccm')
      expect(oslcClient.projects).to.be.eql(['JKE Banking'])
      expect(oslcClient.user).to.be.equal('admin')
      expect(oslcClient.pass).to.be.equal('pass')
      expect(oslcClient.oslcResource).to.be.null
      expect(oslcClient.oslcResourceForSPServiceUrls).to.be.null
    }))
  })
  describe('syncWorkItemsWithUCV', () => {
    it('should return totalSyncCount if there is no error', sinonTest(async function () {
      this.stub(OSLCClient.prototype, 'getCMServiceProvideCatalogueUrl')
      this.stub(OSLCClient.prototype, 'getserviceProviderCatalogue').callsFake(() => new OSLCResource('http://dummy', ''))
      this.stub(OSLCResource.prototype, 'getServiceProviderUrl').callsFake(() => 'serviceProviderUrl')
      this.stub(OSLCClient.prototype, 'getSPServiceUrls')
      this.stub(OSLCClient.prototype, 'getAllWorkItems').callsFake(() => 10)
      const oslcClient = new OSLCClient(EWMProps)
      const result = await oslcClient.syncWorkItemsWithUCV()
      expect(result).to.be.equal(10)
    }))
    it('should return totalSyncCount 0 if there is no error and if no projects', sinonTest(async function () {
      this.stub(OSLCClient.prototype, 'getCMServiceProvideCatalogueUrl')
      this.stub(OSLCClient.prototype, 'getserviceProviderCatalogue').callsFake(() => new OSLCResource('http://dummy', ''))
      this.stub(OSLCResource.prototype, 'getServiceProviderUrl').callsFake(() => 'serviceProviderUrl')
      const oslcClient = new OSLCClient({ projects: [] })
      const result = await oslcClient.syncWorkItemsWithUCV()
      expect(result).to.be.equal(0)
    }))
    it('should throw an error if serviceProviderUrl is null from getServiceProvider in syncWorkItemsWithUCV', sinonTest(async function () {
      this.stub(OSLCClient.prototype, 'getCMServiceProvideCatalogueUrl')
      this.stub(OSLCClient.prototype, 'getserviceProviderCatalogue').callsFake(() => new OSLCResource('http://dummy', ''))
      this.stub(OSLCResource.prototype, 'getServiceProviderUrl').callsFake(() => null)
      const oslcClient = new OSLCClient(EWMProps)
      await expect(oslcClient.syncWorkItemsWithUCV()).to.eventually.be.rejected
    }))
  })
  describe('getCMServiceProvideCatalogueUrl', () => {
    it('should return change management catalogue Url if there is no error', sinonTest(async function () {
      this.stub(OSLCResource.prototype, 'getCMSPCatalogueUrl').callsFake(() => 'https://example.com')
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: {} })
      const result = await oslcClient.getCMServiceProvideCatalogueUrl()
      expect(result).to.be.equal('https://example.com')
    }))
    it('should throw an error if Change Management Service Provider Catalogue is null', sinonTest(async function () {
      this.stub(OSLCResource.prototype, 'getCMSPCatalogueUrl').callsFake(() => null)
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: {} })
      expect(oslcClient.getCMServiceProvideCatalogueUrl()).to.eventually.be.rejected
    }))
    it('should thow an error if there is an error while calling the rootservices API', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: false, error: 'err' })
      expect(oslcClient.getCMServiceProvideCatalogueUrl()).to.eventually.be.rejectedWith('err')
    }))
    it('should thow an error if there is an error while parsing the rdf response data', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: true })
      expect(oslcClient.getCMServiceProvideCatalogueUrl()).to.eventually.be.rejected
    }))
  })
  describe('getserviceProviderCatalogue', () => {
    it('should authorise successfully and return a non null object if there are no errors', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: true, headers: { 'dummy': 'dummy' } })
      const result = await oslcClient.getserviceProviderCatalogue('https://CMCatalogue')
      expect(result).not.be.null
      expect(result.id).not.be.null
      expect(result.kb).not.be.null
    }))
    it('should thow an error if there is an error while getting CM SP Catalogue', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: false, error: 'err' })
      expect(oslcClient.getserviceProviderCatalogue('https://CMCatalogue')).to.eventually.be.rejectedWith('err')
    }))
    it('should thow an error if there is an error while parsing the rdf response data', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: true })
      expect(oslcClient.getserviceProviderCatalogue('https://ProjectCatalogue.xml')).to.eventually.be.rejected
    }))
    it('should thow an error if there is an error while posting the credentials', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: false })
      expect(oslcClient.getserviceProviderCatalogue('https://ProjectCatalogue.xml')).to.eventually.be.rejected
    }))
    it('should thow an error if there are no errors while posting credentials but authfailed is set', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: true, headers: { 'x-com-ibm-team-repository-web-auth-msg': 'authfailed' } })
      expect(oslcClient.getserviceProviderCatalogue('https://ProjectCatalogue.xml')).to.eventually.be.rejected
    }))
  })
  describe('getSPServiceUrls', () => {
    it('should thow an error if there is an error while getting serviceProviderUrl', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: false, error: 'err' })
      expect(oslcClient.getSPServiceUrls('https://ProjectCatalogue.xml')).to.eventually.be.rejectedWith('err')
    }))
    it('should thow an error if there is an error while parsing the rdf response data', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: true, headers: {} })
      expect(oslcClient.getSPServiceUrls()).to.eventually.be.rejected
    }))
    it('should set Service Provider URL in OSLC Resource and return success if there is no error', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      this.stub(httpClient, 'doRequest').resolves({ success: true })
      const result = await oslcClient.getSPServiceUrls('https://ProjectCatalogue.xml')
      expect(result).to.be.equal('success')
    }))
  })
  describe('getAllWorkItems', () => {
    it('should return syncCount as the number of work items if there is no error', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient(EWMProps)
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(OSLCClient.prototype, 'getWorkItemsAPI')
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: { 'oslc:responseInfo': 'dummy', 'oslc:results': 'dummy2' } })
      this.stub(_, 'map').returns(['item1', 'item2'])
      this.stub(UCVClient, 'syncWithVelocity')
      const result = await oslcClient.getAllWorkItems(EWMProps)
      expect(result).to.be.equal(2)
    }))
    it('should return syncCount as 0 if there is no error and even if since fields is not present in EWMProps', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient({ serverUrl: 'https://localhost:9443/ccm' })
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(OSLCClient.prototype, 'getWorkItemsAPI')
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: { 'oslc:responseInfo': 'dummy', 'oslc:results': {} } })
      this.stub(UCVClient, 'syncWithVelocity')
      const result = await oslcClient.getAllWorkItems(EWMProps)
      expect(result).to.be.equal(0)
    }))
    it('should return syncCount as 0 if there is no error and if lastRun fields is present in EWMProps', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient({ serverUrl: 'https://localhost:9443/ccm', lastRun: 24 })
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(OSLCClient.prototype, 'getWorkItemsAPI')
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: { 'oslc:responseInfo': 'dummy', 'oslc:results': {} } })
      this.stub(UCVClient, 'syncWithVelocity')
      const result = await oslcClient.getAllWorkItems(EWMProps)
      expect(result).to.be.equal(0)
    }))
    it('should return syncCount as 0 if there are no WorkItems', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient(EWMProps)
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(OSLCClient.prototype, 'getWorkItemsAPI')
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: { 'oslc:responseInfo': 'dummy', 'oslc:results': {} } })
      this.stub(UCVClient, 'syncWithVelocity')
      const result = await oslcClient.getAllWorkItems(EWMProps)
      expect(result).to.be.equal(0)
    }))
    it('should throw an error if the work items REST API call fails', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient(EWMProps)
      // oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(OSLCClient.prototype, 'getWorkItemsAPI')
      this.stub(httpClient, 'doRequest').resolves({ success: false })
      await expect(oslcClient.getAllWorkItems(EWMProps)).to.eventually.be.rejected
    }))
  })
  describe('getWorkItemsAPI', () => {
    it('should return WorkItemsAPI if there is no error', sinonTest(async function () {
      const oslcClient = new OSLCClient(EWMProps)
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'queryBase')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'query').resolves('WorkItemsAPI')
      const result = await oslcClient.getWorkItemsAPI('lastRunTime')
      expect(result).to.be.equal('WorkItemsAPI')
    }))
    it('should return syncCount as 0 if there is no error and even if since fields is not present in EWMProps', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient({ serverUrl: 'https://localhost:9443/ccm' })
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'queryBase')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'query')
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: { 'oslc:responseInfo': 'dummy', 'oslc:results': {} } })
      this.stub(UCVClient, 'syncWithVelocity')
      const result = await oslcClient.getAllWorkItems(EWMProps)
      expect(result).to.be.equal(0)
    }))
    it('should return syncCount as 0 if there is no error and if lastRun fields is present in EWMProps', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient({ serverUrl: 'https://localhost:9443/ccm', lastRun: 24 })
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'queryBase')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'query')
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: { 'oslc:responseInfo': 'dummy', 'oslc:results': {} } })
      this.stub(UCVClient, 'syncWithVelocity')
      const result = await oslcClient.getAllWorkItems(EWMProps)
      expect(result).to.be.equal(0)
    }))
    it('should return syncCount as 0 if there are no WorkItems', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient(EWMProps)
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'queryBase')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'query')
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: { 'oslc:responseInfo': 'dummy', 'oslc:results': {} } })
      this.stub(UCVClient, 'syncWithVelocity')
      const result = await oslcClient.getAllWorkItems(EWMProps)
      expect(result).to.be.equal(0)
    }))
    it('should throw an error if the work items REST API call fails', sinonTest(async function () {
      this.stub(UCVClient, 'initialize')
      const oslcClient = new OSLCClient(EWMProps)
      oslcClient.oslcResourceForSPServiceUrls = new OSLCResource('http://dummy', '')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'queryBase')
      this.stub(oslcClient.oslcResourceForSPServiceUrls, 'query')
      this.stub(httpClient, 'doRequest').resolves({ 'success': 'false' })
      await expect(oslcClient.getAllWorkItems(EWMProps)).to.eventually.be.rejected
    }))
  })
})
