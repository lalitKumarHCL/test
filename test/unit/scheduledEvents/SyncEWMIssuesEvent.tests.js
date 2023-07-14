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
import SyncEWMIssuesEvent from '../../../lib/scheduledEvents/SyncEWMIssuesEvent'
import OSLCClient from '../../../lib/clients/oslcClient'
import sinonTestFactory from 'sinon-test'

chai.use(chaiAsPromised)
const expect = chai.expect
const sinonTest = sinonTestFactory(sinon)
const EWMProps = {
  serverUrl: 'https://localhost:9443/ccm',
  projects: 'JKE Banking',
  user: 'admin',
  pass: 'pass',
  since: 6,
  ucvAccessKey: 'sample-access-key'
}
const EWMState = {
  id: 'trackerId',
  lastRun: '1',
  tenantId: 'tenantId',
  apiServerUrl: 'serverURL',
  securityToken: 'secToken'
}

describe('SyncEWMIssuesEvent', () => {
  describe('execute', () => {
    it('should return an object with EWM properties and state whenever getEWMProps is invoked', sinonTest(async function () {
      const result = await SyncEWMIssuesEvent.getEWMProps(EWMState, EWMProps)
      expect(result.lastRun).to.be.equal('1')
      expect(result.tenantId).to.be.equal('tenantId')
      expect(result.apiServerUrl).to.be.equal('serverURL')
      expect(result.serverUrl).to.be.equal('https://localhost:9443/ccm')
      expect(result.projects).to.be.equal('JKE Banking')
      expect(result.user).to.be.equal('admin')
      expect(result.pass).to.be.equal('pass')
      expect(result.since).to.be.equal(6)
      expect(result.ucvAccessKey).to.be.equal('sample-access-key')
    }))
    it('should return EWM issues data object whenever invoked', sinonTest(async function () {
      this.stub(OSLCClient.prototype, 'syncWorkItemsWithUCV').callsFake(() => null)
      const result = await SyncEWMIssuesEvent.execute(EWMState, EWMProps)
      expect(result).to.not.be.undefined
      expect(result.type).to.be.equal('ISSUE')
      expect(result.source).to.be.equal('EWM')
      expect(result.data.length).to.be.equal(0)
    }))

    it('should throw an error if there is an error', sinonTest(async function () {
      await expect(SyncEWMIssuesEvent.execute()).to.eventually.be.rejectedWith(Error)
    }))
  })
})
