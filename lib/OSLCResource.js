/*********************************************************************
* Licensed Materials - Property of HCL
* (c) Copyright HCL Technologies Ltd. 2018, 2019. All Rights Reserved.
*
* Note to U.S. Government Users Restricted Rights:
* Use, duplication or disclosure restricted by GSA ADP Schedule
* Contract with IBM Corp.
***********************************************************************/
import rdflib from 'rdflib'
import log4js from '@velocity/logger'
const logger = log4js.getLogger('OSLCResource')
const OSLCCM10 = rdflib.Namespace('http://open-services.net/xmlns/cm/1.0/')
const DCTERMS = rdflib.Namespace('http://purl.org/dc/terms/')
const OSLC = rdflib.Namespace('http://open-services.net/ns/core#')

export default class OSLCResource {
  constructor (uri, kb) {
    this.id = rdflib.sym(uri)
    this.kb = kb
  }

  getCMSPCatalogueUrl () {
    try {
      var catalog = (this.kb.the(this.id, OSLCCM10('cmServiceProviders')))
      logger.debug(`getCMSPCatalogueUrl catalog: ${JSON.stringify(catalog)}`)
      return catalog ? catalog.uri : null
    } catch (err) {
      logger.error(`error from getCMSPCatalogueUrl, ${err}`)
      throw new Error('error from getCMSPCatalogueUrl')
    }
  }

  getServiceProviderUrl (serviceProviderTitle) {
    try {
      var sp = this.kb.statementsMatching(undefined, DCTERMS('title'), this.kb.literal(serviceProviderTitle, undefined, this.kb.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral')))
      if (!sp) {
        return null
      } else {
        return sp[0] && sp[0].subject && sp[0].subject.uri
      }
    } catch (err) {
      logger.error(`error from getServiceProviderUrl, ${err}`)
      throw new Error('error from getServiceProviderUrl')
    }
  }

  queryBase (resourceType) {
    try {
      let resourceTypeSym = (typeof resourceType === 'string') ? this.kb.sym(resourceType) : resourceType
      let services = this.kb.each(this.id, OSLC('service'))
      for (let service of services) {
        var queryCapabilities = this.kb.each(service, OSLC('queryCapability'))
        for (let queryCapability of queryCapabilities) {
          if (this.kb.statementsMatching(queryCapability, OSLC('resourceType'), resourceTypeSym).length) {
            return this.kb.the(queryCapability, OSLC('queryBase')).value
          }
        }
      }
      return null
    } catch (err) {
      logger.error(`error from queryBase, ${err}`)
      throw new Error('error from queryBase')
    }
  }

  query (options) {
    // Construct the query URL and query parameters, then execute the query
    var queryBase = options.from
    var queryURI = ''
    // Add the default prefix definitions
    queryURI += 'oslc.prefix='
    queryURI += 'dcterms=<http://purl.org/dc/terms/>,'
    queryURI += 'foaf=<http://xmlns.com/foaf/0.1/>,'
    queryURI += 'owl=<http://www.w3.org/2002/07/owl#>,'
    queryURI += 'rdf=<http://www.w3.org/1999/02/22-rdf-syntax-ns#>,'
    queryURI += 'xsd=<http://www.w3.org/2001/XMLSchema#>,'
    queryURI += 'rdfs=<http://www.w3.org/2000/01/rdf-schema#>,'
    queryURI += 'ldp=<http://www.w3.org/ns/ldp#>,'
    queryURI += 'oslc=<http://open-services.net/ns/core#>,'
    queryURI += 'acc=<http://open-services.net/ns/core/acc#>,'
    queryURI += 'trs=<http://open-services.net/ns/core/trs#>'
    queryURI = encodeURIComponent(queryURI)
    if (options.pageSize) {
      queryURI += '&'
      queryURI += 'oslc.pageSize=' + encodeURIComponent(options.pageSize)
    }
    if (options.select) {
      queryURI += '&'
      queryURI += 'oslc.select=' + encodeURIComponent(options.select)
    }
    if (options.where) {
      queryURI += '&'
      queryURI += 'oslc.where=' + encodeURIComponent(options.where)
    }
    if (options.orderBy) {
      queryURI += '&'
      queryURI += 'oslc.orderBy=' + encodeURIComponent(options.orderBy)
    }
    queryURI = queryBase + '?' + queryURI
    return queryURI
  }
}
