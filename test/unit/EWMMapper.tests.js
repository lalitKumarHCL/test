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
import EWMMapper from '../../lib/mapper/EWMMapper'
import httpClient from '../../lib/httpClient'
import sinon from 'sinon'
import parser, { toJson } from 'xml2json-ltx'
import sinonTestFactory from 'sinon-test'
const sinonTest = sinonTestFactory(sinon)

chai.use(chaiAsPromised)
const expect = chai.expect

const issue = {
  'dcterms:subject': 'globalization, team, evaluate',
  'dcterms:type': 'Defect',
  'dcterms:creator': {
    'foaf:name': 'Marco',
    'foaf:nick': 'marco',
    'dcterms:modified': '2019-08-02T07:47:10.103Z',
    'rdf:type': [
      {
        'rdf:resource': 'http://xmlns.com/foaf/0.1/Person'
      }
    ],
    'foaf:img': {
      'rdf:resource': 'https://localhost:9443/ccm/resource/content/_u7sgELT5EemSEYgAH6WzHw'
    },
    'rdf:about': 'https://localhost:9443/jts/users/marco',
    'foaf:mbox': 'mailto:marco%40jkebanking.net'
  },
  'oslc_cm:status': 'Resolved',
  'dcterms:title': 'Not possible to change a user password',
  'dcterms:created': '2019-07-05T21:37:39.032Z',
  'dcterms:modified': '2019-08-16T10:54:10.788Z',
  'rdf:type': [
    {
      'rdf:resource': 'http://open-services.net/ns/cm#ChangeRequest'
    }
  ],
  'dcterms:contributor': {
    'foaf:name': 'Marco',
    'foaf:nick': 'marco',
    'dcterms:modified': '2019-08-02T07:47:10.103Z',
    'rdf:type': [
      {
        'rdf:resource': 'http://xmlns.com/foaf/0.1/Person'
      }
    ],
    'foaf:img': {
      'rdf:resource': 'https://localhost:9443/ccm/resource/content/_u7sgELT5EemSEYgAH6WzHw'
    },
    'rdf:about': 'https://localhost:9443/jts/users/marco',
    'foaf:mbox': 'mailto:marco%40jkebanking.net'
  },
  'rdf:about': 'https://localhost:9443/ccm/resource/itemName/com.ibm.team.workitem.WorkItem/1',
  'dcterms:identifier': '1',
  'dcterms:description': 'We need to add some UI to let a user change his password.',
  'project': { id: 'x', key: 'x', name: 'x' },
  'oslc_cmx:priority': {
    'dcterms:identifier': 'priority.literal.l07',
    'dcterms:title': 'Medium',
    'rtc_cm:iconUrl': 'https://localhost:9443/ccm/service/com.ibm.team.workitem.common.internal.model.IImageContentService/processattachment/_yRLOILT5EemSEYgAH6WzHw/enumeration/medium.gif',
    'rdf:type': [
      {
        'rdf:resource': 'https://localhost:9443/ccm/oslc/enumerations/_yRLOILT5EemSEYgAH6WzHw/priority'
      },
      {
        'rdf:resource': 'http://jazz.net/xmlns/prod/jazz/rtc/cm/1.0/Literal'
      }
    ],
    'rdf:about': 'https://localhost:9443/ccm/oslc/enumerations/_yRLOILT5EemSEYgAH6WzHw/priority/priority.literal.l07'
  },
  'rtc_cm:com.ibm.team.filesystem.workitems.change_set.com.ibm.team.scm.ChangeSet': []
}

const mappedIssue = {
  _id: '1',
  id: '1',
  name: 'Not possible to change a user password',
  creator: 'Marco',
  owner: 'Marco',
  status: 'Resolved',
  created: '2019-07-05T21:37:39.032Z',
  lastUpdate: '2019-08-16T10:54:10.788Z',
  type: 'Defect',
  priority: 'Medium',
  url: 'https://localhost:9443/ccm/resource/itemName/com.ibm.team.workitem.WorkItem/1',
  description: 'We need to add some UI to let a user change his password.',
  labels: 'globalization, team, evaluate',
  project: { id: 'x', key: 'x', name: 'x' },
  history: [],
  rawIssue: issue,
  relations: []
}

const normalizedhistory = [ { timestamp: '1576324705875',
  content:
 { field: 'owner',
   type: 'string',
   from: 'mey',
   to: 'joe',
   user: 'b',
   userDisplayName: 'b' } },
{ timestamp: '1576324705875',
  content:
 { field: 'lastUpdate',
   type: 'integer',
   from: '1573732705875',
   to: '1576324705875' } },
{ timestamp: '1576324705875',
  content:
 { field: 'status',
   type: 'string',
   from: 'New',
   to: 'InProgress',
   user: 'b',
   userDisplayName: 'b' } },
{ timestamp: '1576324705875',
  content:
 { field: 'lastUpdate',
   type: 'integer',
   from: '1573732705875',
   to: '1576324705875' } },
{ timestamp: '1576324705875',
  content:
 { field: 'priority',
   type: 'string',
   from: 'low',
   to: 'medium',
   user: 'b',
   userDisplayName: 'b' } },
{ timestamp: '1576324705875',
  content:
 { field: 'lastUpdate',
   type: 'integer',
   from: '1573732705875',
   to: '1576324705875' } },
{ timestamp: '1576324705875',
  content:
 { field: 'type',
   type: 'string',
   from: 'bug',
   to: 'story',
   user: 'b',
   userDisplayName: 'b' } },
{ timestamp: '1576324705875',
  content:
 { field: 'lastUpdate',
   type: 'integer',
   from: '1573732705875',
   to: '1576324705875' } },
{ timestamp: '1576324705875',
  content:
 { field: 'description',
   type: 'string',
   from: 'desc',
   to: 'new desc',
   user: 'b',
   userDisplayName: 'b' } },
{ timestamp: '1576324705875',
  content:
 { field: 'lastUpdate',
   type: 'integer',
   from: '1573732705875',
   to: '1576324705875' } },
{ timestamp: '1576324705875',
  content:
 { field: 'tags',
   type: 'string',
   from: 'old',
   to: 'new',
   user: 'b',
   userDisplayName: 'b' } },
{ timestamp: '1576324705875',
  content:
 { field: 'lastUpdate',
   type: 'integer',
   from: '1573732705875',
   to: '1576324705875' } } ]

describe('EWMMapper', () => {
  describe('mapEWMIssue', () => {
    it('should throw an error if doRequest fails', sinonTest(async function () {
      this.stub(httpClient, 'doRequest').resolves({ success: false, error: 'err' })
      expect(EWMMapper.mapEWMIssue({ server: 'https://fake' }, issue)).to.eventually.be.rejectedWith('err')
    }))
    it('should continue execution if doRequest response is success', sinonTest(async function () {
      this.spy(parser, 'toJson')
      const data = { 'workitem': { 'workItem': { 'itemHistory': [{ 'fake': 'fake' }] } } }
      this.stub(JSON, 'parse').callsFake(() => data)
      this.stub(httpClient, 'doRequest').resolves({ success: true, payload: '<!DOCTYPE _[<!ELEMENT _ EMPTY>]><_/>' })
      EWMMapper.mapEWMIssue({ server: 'https://fake' }, issue)
      expect(toJson.calledOnce === true)
    }))
    it('should call itemHistoryObjectArray.find if itemHistoryobjectArray length > 1 and predecessor work item is present', sinonTest(async function () {
      this.stub(parser, 'toJson')
      const data = { 'workitem': { 'workItem': { 'itemHistory': [{ 'predecessor': '123' }, { 'stateId': '123' }] } } }
      this.stub(JSON, 'parse').callsFake(() => data)
      this.stub(httpClient, 'doRequest').resolves({ success: true })
      this.spy(EWMMapper, 'handleHistory')
      EWMMapper.mapEWMIssue({ server: 'https://fake' }, issue)
      expect(EWMMapper.handleHistory.calledOnce === true)
    }))
    it('should not call itemHistoryObjectArray.find if itemHistoryobjectArray length > 1 and predecessor work item is not present', sinonTest(async function () {
      this.stub(parser, 'toJson')
      const data = { 'workitem': { 'workItem': { 'itemHistory': [{ 'predecessor': '' }, { 'stateId': '123' }] } } }
      this.stub(JSON, 'parse').callsFake(() => data)
      this.stub(httpClient, 'doRequest').resolves({ success: true })
      this.spy(EWMMapper, 'handleHistory')
      EWMMapper.mapEWMIssue({ server: 'https://fake' }, issue)
      expect(EWMMapper.handleHistory.calledOnce === false)
    }))
    it('should return correctly mapped issue', sinonTest(async function () {
      this.stub(parser, 'toJson')
      const data = { 'workitem': { 'workItem': { 'itemHistory': [{ 'predecessor': '' }, { 'stateId': '123' }] } } }
      this.stub(JSON, 'parse').callsFake(() => data)
      this.stub(httpClient, 'doRequest').resolves({ success: true })
      this.spy(EWMMapper, 'handleHistory')
      let result = await EWMMapper.mapEWMIssue({ server: 'https://fake' }, issue)
      expect(result).to.be.deep.equal(mappedIssue)
    }))
  })
  describe('wrapIssues', () => {
    it('should wrap issue with correct options', () => {
      const wrapOptions = {
        trackerId: '5678',
        baseUrl: 'https://dns:9443/ccm',
        tenantId: '1234',
        source: 'EWM'
      }
      const wrappedIssue = EWMMapper.wrapIssues([mappedIssue], wrapOptions)
      expect(wrappedIssue).to.not.be.null
      expect(wrappedIssue.source).to.be.equal(wrapOptions.source)
      expect(wrappedIssue.trackerId).to.be.equal(wrapOptions.trackerId)
      expect(wrappedIssue.tenantId).to.be.equal(wrapOptions.tenantId)
      expect(wrappedIssue.baseUrl).to.be.equal(wrapOptions.baseUrl)
    })
  })
  describe('handleHistory', () => {
    it('should create a history array using item history and its predecessor', sinonTest(async function () {
      let itemHistory = { 'owner': { 'name': 'joe' }, 'state': { 'name': 'InProgress' }, 'priority': { 'name': 'medium' }, 'type': { 'name': 'story' }, 'description': 'new desc', 'tags': 'new', 'modifiedBy': { 'name': 'b' }, 'modified': '2019-12-14T11:58:25.875+0000' }
      let itemHistoryPredecessor = { 'owner': { 'name': 'mey' }, 'state': { 'name': 'New' }, 'priority': { 'name': 'low' }, 'type': { 'name': 'bug' }, 'description': 'desc', 'tags': 'old', 'modifiedBy': { 'name': 'a' }, 'modified': '2019-11-14T11:58:25.875+0000' }
      expect(EWMMapper.handleHistory(itemHistory, itemHistoryPredecessor)).to.be.deep.equal(normalizedhistory)
    }))
  })
  describe('normalizeHistoryEntry', () => {
    it('should normalize history entry', sinonTest(async function () {
      let normalizedHistory = { 'field': 'status', 'type': 'string', 'from': 'x', 'to': 'y', 'user': 'bill', 'userDisplayName': 'bill' }
      expect(EWMMapper.normalizeHistoryEntry('state', 'x', 'y', 'bill')).to.be.deep.equal(normalizedHistory)
    }))
  })
  describe('normalizeHistoryTSEntry', () => {
    it('should normalize history timestamp entry', sinonTest(async function () {
      let normalizedHistory = { 'field': 'lastUpdate', 'type': 'integer', 'from': 'x', 'to': 'y' }
      expect(EWMMapper.normalizeHistoryTSEntry('lastUpdate', 'x', 'y')).to.be.deep.equal(normalizedHistory)
    }))
  })
})
