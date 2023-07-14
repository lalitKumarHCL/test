/*********************************************************************
* Licensed Materials - Property of HCL
* (c) Copyright HCL Technologies Ltd. 2018, 2019. All Rights Reserved.
*
* Note to U.S. Government Users Restricted Rights:
* Use, duplication or disclosure restricted by GSA ADP Schedule
* Contract with IBM Corp.
***********************************************************************/
import httpClient from '../httpClient'
import moment from 'moment'
import util from 'util'
import log4js from '@velocity/logger'
import parser from 'xml2json-ltx'
const logger = log4js.getLogger('EWMMapper')
export const SOURCE = 'EWM'

export default class EWMMapper {
  static async mapEWMIssue (server, issue) {
    logger.debug(`mapEWMIssue server: ${JSON.stringify(server)}`)
    logger.debug(`mapEWMIssue issue: ${JSON.stringify(issue)}`)
    let serverUrl = server['serverUrl']
    let workItemId = issue['dcterms:identifier']
    let history = []
    let relationsArray = []
    if (issue['rtc_cm:com.ibm.team.workitem.linktype.relatedworkitem.related'] && issue['rtc_cm:com.ibm.team.workitem.linktype.relatedworkitem.related'].length > 0) {
      issue['rtc_cm:com.ibm.team.workitem.linktype.relatedworkitem.related'].forEach(element => {
        let relations = {}
        relations.type = 'RELATED'
        relations.id = element['dcterms:identifier']
        relationsArray.push(relations)
      })
    }
    if (issue['rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.children'] && issue['rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.children'].length > 0) {
      issue['rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.children'].forEach(element => {
        let relations = {}
        relations.type = 'CHILD'
        relations.id = element['dcterms:identifier']
        relationsArray.push(relations)
      })
    }
    if (issue['rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.parent'] && issue['rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.parent'].length > 0) {
      issue['rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.parent'].forEach(element => {
        let relations = {}
        relations.type = 'PARENT'
        relations.id = element['dcterms:identifier']
        relationsArray.push(relations)
      })
    }
    let uri = util.format('%s/%s=%s%s', serverUrl, 'rpt/repository/workitem?fields=workitem/workItem[id', workItemId, ']/(itemHistory/(modified|state/name|modifiedBy/name|priority/name|owner/name|type/name|description|tags|stateId|predecessor))')
    let response = await httpClient.doRequest('GET', uri, { 'Accept': 'application/xml' })
    if (response.success) {
      let itemHistoryResponse = parser.toJson(response.payload)
      let itemHistoryResponseJSON = JSON.parse(itemHistoryResponse)
      let itemHistoryObjectArray = itemHistoryResponseJSON['workitem'] && itemHistoryResponseJSON['workitem']['workItem'] && itemHistoryResponseJSON['workitem']['workItem']['itemHistory']
      if (itemHistoryObjectArray.length > 1) {
        for (let key in itemHistoryObjectArray) {
          if (JSON.stringify(itemHistoryObjectArray[key]['predecessor']) !== '{}') {
            let predecessorWorkItem = itemHistoryObjectArray.find(itemHistory => itemHistory['stateId'] === itemHistoryObjectArray[key]['predecessor'])
            history = history.concat(this.handleHistory(itemHistoryObjectArray[key], predecessorWorkItem))
          }
        }
      }
    } else {
      logger.error(`response from reportable rest api is ${response.error}`)
      throw response.error
    }
    const changeSetHisObj = []
    for (const iterator of issue['rtc_cm:com.ibm.team.filesystem.workitems.change_set.com.ibm.team.scm.ChangeSet']) {
      const changeSetKey = 'ChangeSet'
      const arr = iterator['dcterms:title'].split(' - ', 4)
      logger.debug(`changeSetHisObj arr: ${arr}`)
      const timestamp = moment(arr[3]).format('x')
      const owner = arr[2]
      const to = `${iterator['dcterms:title']}  |  Url:  ${iterator['rdf:about']} `
      let content = this.normalizeHistoryEntry(changeSetKey, '', to, owner)
      changeSetHisObj.push({ timestamp, content })
      content = this.normalizeHistoryTSEntry('lastUpdate', moment(issue['dcterms:created']).format('x'), timestamp)
      changeSetHisObj.push({ timestamp, content })
    }
    history = history.concat(changeSetHisObj)
    return {
      _id: issue['dcterms:identifier'],
      id: issue['dcterms:identifier'],
      name: issue['dcterms:title'],
      creator: issue['dcterms:creator']['foaf:name'],
      owner: issue['dcterms:contributor']['foaf:name'],
      status: issue['oslc_cm:status'],
      created: issue['dcterms:created'],
      lastUpdate: issue['dcterms:modified'],
      type: issue['dcterms:type'],
      priority: issue['oslc_cmx:priority']['dcterms:title'],
      url: issue['rdf:about'],
      description: issue['dcterms:description'],
      labels: issue['dcterms:subject'],
      project: issue['project'],
      history: history,
      rawIssue: issue,
      relations: relationsArray
    }
  }

  static handleHistory (itemHistoryObject, itemHistoryObjectPredecessor) {
    let history = []
    let content
    let fields = ['owner', 'state', 'priority', 'type', 'description', 'tags']
    let fieldMappings = {
      owner: 'name',
      state: 'name',
      priority: 'name',
      type: 'name'
    }
    for (let key in itemHistoryObject) {
      if (fields.find(field => field === key)) {
        let fromField, toField
        if (JSON.stringify(itemHistoryObjectPredecessor[key]) !== JSON.stringify(itemHistoryObject[key])) {
          let fieldName = fieldMappings[key]
          fromField = itemHistoryObjectPredecessor[key][fieldName] || itemHistoryObjectPredecessor[key]
          toField = itemHistoryObject[key][fieldName] || itemHistoryObject[key]
          content = this.normalizeHistoryEntry(key, fromField, toField, itemHistoryObject['modifiedBy']['name'])
          let timestamp = moment(itemHistoryObject['modified']).format('x')
          history.push({ timestamp, content })
          let predecessorTimestamp = moment(itemHistoryObjectPredecessor['modified']).format('x')
          content = this.normalizeHistoryTSEntry('lastUpdate', predecessorTimestamp, timestamp)
          history.push({ timestamp, content })
        }
      }
    }
    return history
  }

  static normalizeHistoryEntry (fieldName, from, to, user) {
    let type = 'string'
    fieldName = fieldName === 'state' ? 'status' : fieldName
    return {
      field: fieldName,
      type,
      from,
      to,
      user,
      userDisplayName: user
    }
  }

  static normalizeHistoryTSEntry (fieldName, from, to) {
    let type = 'integer'
    return {
      field: fieldName,
      type,
      from,
      to
    }
  }

  static wrapIssues (issues, wrapOptions) {
    return Object.assign({}, wrapOptions, { issues })
  }
}
