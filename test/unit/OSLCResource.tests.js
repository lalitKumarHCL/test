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
import rdflib from 'rdflib'
import OSLCResource from '../../lib/OSLCResource'
const OSLCCM10 = rdflib.Namespace('http://open-services.net/xmlns/cm/1.0/')

chai.use(chaiAsPromised)
const expect = chai.expect

describe('OSLCResource', () => {
  describe('Constructor', () => {
    it('should create a new object with all the properties', () => {
      const oslcResource = new OSLCResource('https://dummy.dummy', {})
      expect(oslcResource).to.be.not.null
      expect(oslcResource.id).to.be.not.null
      expect(oslcResource.kb).to.be.not.null
    })
    describe('getCMSPCatalogueUrl', () => {
      it('should throw an error if there is an error', () => {
        const oslcResource = new OSLCResource('https://dummy.dummy', {})
        expect(() => oslcResource.getCMSPCatalogueUrl()).to.throw
      })
      it('should return Service Provider Catalogue value as null if catalogue is not found', () => {
        let kb = new rdflib.IndexedFormula()
        const oslcResource = new OSLCResource('https://dummy.dummy', kb)
        const catalogue = oslcResource.getCMSPCatalogueUrl()
        expect(catalogue).to.be.null
      })
      it('should return Service Provider Catalogue value if no errors', () => {
        let kb = new rdflib.IndexedFormula()
        kb.add(rdflib.sym('http://rooturl'), OSLCCM10('cmServiceProviders'), rdflib.sym('http://WICatalogueUrl'))
        const oslcResource = new OSLCResource('http://rooturl', kb)
        const boundFn = oslcResource.getCMSPCatalogueUrl.bind(oslcResource)
        const catalogue = boundFn()
        expect(catalogue).to.be.equal('http://WICatalogueUrl')
      })
    })
    describe('getServiceProviderUrl', () => {
      it('should throw an error if there is an error', () => {
        const oslcResource = new OSLCResource('https://dummy.dummy', {})
        expect(() => oslcResource.getServiceProviderUrl('dummy')).to.throw
      })
    })
    describe('queryBase', () => {
      it('should throw an error if there is an error', () => {
        const oslcResource = new OSLCResource('https://dummy.dummy', {})
        expect(() => oslcResource.queryBase('dummy')).to.throw
      })
    })
    describe('query', () => {
      it('should return a valid REST API', () => {
        const oslcResource = new OSLCResource('https://dummy.dummy', {})
        const queryToFormat = {
          from: 'https://dummydns',
          select: 'dummy',
          where: 'dummyDate',
          pageSize: 10,
          orderBy: 'dateDummy'
        }
        const WorkItemsAPI = oslcResource.query(queryToFormat)
        expect(WorkItemsAPI).to.contain('oslc.select')
        expect(WorkItemsAPI).to.contain('oslc.where')
        expect(WorkItemsAPI).to.contain('oslc.pageSize')
        expect(WorkItemsAPI).to.contain('oslc.orderBy')
      })
      it('should return a valid REST API', () => {
        const oslcResource = new OSLCResource('https://dummy.dummy', {})
        const queryToFormat = {
          from: 'https://dummydns'
        }
        const WorkItemsAPI = oslcResource.query(queryToFormat)
        expect(WorkItemsAPI).not.to.contain('oslc.select')
        expect(WorkItemsAPI).not.to.contain('oslc.where')
        expect(WorkItemsAPI).not.to.contain('oslc.pageSize')
        expect(WorkItemsAPI).not.to.contain('oslc.orderBy')
      })
    })
  })
})
