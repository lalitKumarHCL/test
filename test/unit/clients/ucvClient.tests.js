import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import UCVClient from '../../../lib/clients/ucvClient'
import sinonTestFactory from 'sinon-test'

chai.use(chaiAsPromised)
const expect = chai.expect
const sinonTest = sinonTestFactory(sinon)

describe('ucvClient', () => {
  describe('initialize', () => {
    it('should create new object of VelocityAPI and set the properties', sinonTest(async function () {
      await UCVClient.initialize('https://serverUrl', 'securityToken')
      expect(UCVClient.binding).to.not.be.null
    }))
  })
  describe('uploadIssues', () => {
    it('should throw an error if there is error', sinonTest(async function () {
      await UCVClient.initialize('https://serverUrl', 'securityToken')
      const error = new Error('error')
      this.stub(UCVClient.binding.mutation, 'uploadIssueData').rejects(error)
      expect(UCVClient.uploadIssues({})).to.be.eventually.rejectedWith(error)
    }))
  })
})
