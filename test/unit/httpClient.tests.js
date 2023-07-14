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
import httpClient from '../../lib/httpClient'
import sinonTestFactory from 'sinon-test'

chai.use(chaiAsPromised)
const expect = chai.expect
const sinonTest = sinonTestFactory(sinon)

describe('httpClient', () => {
  describe('doRequest', () => {
    it('should return success as true if there is no error', sinonTest(async function () {
      const result = await httpClient.doRequest('GET', 'https://example.com', { 'Accept': 'application/json' })
      expect(result.success).to.be.equal(true)
    }))
    it('should return success as false if there is an error', sinonTest(async function () {
      const result = await httpClient.doRequest()
      expect(result.success).to.be.equal(false)
    }))
  })
})
