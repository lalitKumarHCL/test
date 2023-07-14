/** ******************************************************** {COPYRIGHT-TOP} ****
* Licensed Materials - Property of IBM
*
* (C) Copyright IBM Corp. 2018 All Rights Reserved
*
* US Government Users Restricted Rights - Use, duplication, or
* disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
********************************************************* {COPYRIGHT-END} ****/

import SyncEWMIssuesEvent from './scheduledEvents/SyncEWMIssuesEvent'

export default {
  properties: [
    {
      name: 'serverUrl',
      label: 'Server URL',
      description: 'The URL of the EWM repository. For example: https://server.com/ccm',
      required: true,
      type: 'String'
    },
    {
      name: 'projects',
      label: 'Projects (Comma Separated List)',
      description: 'Comma separated list of projects from which work items are to be extracted.',
      required: true,
      type: 'Array'
    },
    {
      name: 'userId',
      label: 'User ID',
      description: 'The user ID used to authenicate with the repository.',
      required: true,
      type: 'String'
    },
    {
      name: 'password',
      label: 'Password',
      description: 'The password used to authenicate with the repository.',
      required: true,
      type: 'Secure'
    },
    {
      name: 'since',
      label: 'Issues since how many months',
      description: 'Issues since how many months are to be imported when the plugin runs for the first time, default is 12 months',
      required: false,
      type: 'String'
    },
    {
      label: 'User Access Key (For server version prior to 2.4.0)',
      name: 'ucvAccessKey',
      type: 'Secure',
      description: 'User access key for authentication with this server (Prior to version 2.4.0).',
      required: false,
      hidden: true
    },
    {
      name: 'proxyServer',
      label: 'Proxy Server',
      type: 'String',
      description: 'The URL of the proxy server including the port number.',
      required: false,
      hidden: true
    },
    {
      name: 'proxyUsername',
      label: 'Proxy Username',
      type: 'String',
      description: 'The Username used to authenticate with the proxy server.',
      required: false,
      hidden: true
    },
    {
      name: 'proxyPassword',
      label: 'Proxy Password',
      type: 'Secure',
      description: 'The Password used to authenticate with the proxy server.',
      required: false,
      hidden: true
    }
  ],
  endpoints: [],
  scheduledEvents: [SyncEWMIssuesEvent],
  taskDefinitions: [],
  eventTriggers: [],
  qualityHandlers: [],
  displayName: 'IBM Engineering Workflow Management (EWM)',
  pluginId: 'ucv-ext-ewm',
  description: 'The EWM plug-in imports work item from an IBM EWM respository as issues.',
  categories: ['ALM'],
  idRegExp: '(#[0-9]+)'
}
