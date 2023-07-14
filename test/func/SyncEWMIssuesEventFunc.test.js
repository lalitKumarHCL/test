import _ from 'lodash'
import fs from 'fs'
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import SyncEWMIssuesEvent from '../../lib/scheduledEvents/SyncEWMIssuesEvent'
import OSLCClient from '../../lib/clients/oslcClient'
import OSLCResource from '../../lib/OSLCResource'
import httpClient from '../../lib/httpClient'
import sinon from 'sinon'
import sinonTestFactory from 'sinon-test'
export const IMPORT_TYPE = {
  ISSUE: 'ISSUE'
}
const sinonTest = sinonTestFactory(sinon)

chai.use(chaiAsPromised)
const expect = chai.expect

const lastRunDate = 0
const ucvAccessKey = process.env.UCV_ACCESS_KEY

var state = {
  _bsontype: 'ObjectID',
  id: 'foo',
  tenantId: '5ade13625558f2c6688d15ce',
  trackerId: '5cf827823fce1ac67a1cda55',
  apiServerUrl: 'https://localhost/release-events-api',
  lastRun: lastRunDate
}
var properties = {
  serverUrl: 'https://10.134.116.132:9443/ccm',
  userId: 'deepaannjohn',
  password: 'JazzPass12',
  projects: ['JKE Banking (Change Management)'],
  since: '60',
  ucvAccessKey: ucvAccessKey
}

// This functional test does not make use of wiremock. The reason why Wiremock is not used for functional test here is because we are unable to record the test results
// using Wiremock. The EWM API call for authentication has a redirect in it and this call fails when the request goes to RCT through Wiremock proxy. Hence, it was decided to not
// use Wiremock for functional test. The below test case, reads the formatted response from EWM (which is present in the ewmFunctionalData.json file) and calls the graphQL API.
describe('SyncEWMIssuesEvent', function () {
  describe('execute', function () {
    it('completes successfully', sinonTest(async function () {
      sinon.stub(OSLCResource.prototype, 'getServiceProviderUrl').callsFake(function () { return 'serviceProviderUrl' })
      sinon.stub(httpClient, 'doRequest').resolves({ success: true, payload: { 'oslc:responseInfo': 'dummy', 'oslc:results': 'dummy2' } })
      sinon.stub(OSLCClient.prototype, 'getCMServiceProvideCatalogueUrl')
      sinon.stub(OSLCClient.prototype, 'getserviceProviderCatalogue').callsFake(() => new OSLCResource('http://dummy', ''))
      // this.stub(OSLCResource.prototype, 'getServiceProviderUrl').callsFake(() => 'serviceProviderUrl')
      sinon.stub(OSLCClient.prototype, 'getSPServiceUrls')
      sinon.stub(OSLCClient.prototype, 'getWorkItemsAPI')
      let mockData = fs.readFileSync('./test/func/ewmFunctionalTestData.json')
      let final = JSON.parse(mockData)
      sinon.stub(_, 'map').returns(final)
      expect(SyncEWMIssuesEvent.execute(state, properties)).to.eventually.be.fulfilled
    }))
  })
})
