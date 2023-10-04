/*********************************************************************
* Licensed Materials - Property of IBM and HCL
* (c) Copyright IBM Corporation 2007, 2017. All Rights Reserved.
* (c) Copyright HCL Technologies Ltd. 2018, 2019. All Rights Reserved.
*
* Note to U.S. Government Users Restricted Rights:
* Use, duplication or disclosure restricted by GSA ADP Schedule
* Contract with IBM Corp.
***********************************************************************/
import React from 'react'
import { compose } from 'recompose'
import PropTypes from 'prop-types'
import _ from 'lodash'
import moment from 'moment'
import { withApollo } from '@apollo/react-hoc'
import ApolloClient from 'apollo-client'
import update from 'react-addons-update'
import { Loading } from 'carbon-components-react'
import { InlineNotification } from '@velocity/ui-common'
import { withTags } from '@/src/modules/release-events/api/TagsAPI'
import { withTeams } from '@/src/modules/release-events/api/TeamsAPI'
import { withHasActivity } from '@/src/modules/release-events/api/ActivityAPI'
import { withReleasesSearch, withEventsSearch } from '@/src/modules/release-events/api/ReleaseEventsSearchAPI'
import { withDeleteReleaseEvent, releaseEventUpdated, releaseEventAdded, releaseEventPlanStatsUpdated, withUpdateReleaseLock } from '@/src/modules/release-events/api/ReleaseEventsAPI'
import { RELEASE_STATE, RELEASE_STATUS, ARCHIVE_DEPLOYMENT_STATUS } from '@/src/modules/release-events/components/common/constants'
import MainHeader from '@/src/modules/release-events/components/MainHeader'
import CalendarAndTaskContainer from './CalendarAndTaskContainer'
import ReleaseSearchResultsContainer from './ReleaseSearchResultsContainer'
import SearchBar from './SearchBar'
import EventDetailsDialog from './EventDetailsDialog'
import ConfirmationDialog from './ConfirmationDialog'
import ArchiveEventDialog from './ArchiveEventDialog'
import Salutation from './Salutation'
import { injectIntl } from 'react-intl'
import messages from '@/src/messages'
import analytics from '@/src/modules/release-events/components/utils/analytics'
import ImportCsvDialog from './ImportCsvDialog'
import { CsvImportReportDialogContainer } from './CsvImportReportDialog'
import ReleaseEventUIToast from './ReleaseEventUIToast'
import subscribe from '@/src/modules/release-events/components/utils/subscribe'
import tenantContainer from '@/src/containers/tenantContainer'

class RightDataContainer extends React.Component {
  constructor (props) {
    super(props)

    this.state = {
      calendarCollapsed: false,
      eventDialogOpen: false,
      eventDeleteDialogOpen: false,
      releaseDeleteDialogOpen: false,
      isReleaseEvent: false,
      selectedEvent: null,
      confirmationLoading: false,
      importCsvDialogOpen: false,
      importCsvError: [],
      isCopyReleaseMode: false,
      toastTitle: '',
      toastSubTitle: ''
    }

    this.openReleaseOrEventEditDialog = this.openReleaseOrEventEditDialog.bind(this)
    this.openReleaseOrEventDeleteDialog = this.openReleaseOrEventDeleteDialog.bind(this)
    this.openReleaseCreateDialog = this.openReleaseEditDialog.bind(this)
    this.openEventCreateDialog = this.openEventEditDialog.bind(this)
    this.openEditDialog = this.openReleaseOrEventEditDialog.bind(this)
    this.openDeleteDialog = this.openReleaseOrEventDeleteDialog.bind(this)
    this.copyRelease = this.copyRelease.bind(this)
    this.openImportCsvDialog = this.openImportCsvDialog.bind(this)
    this.openCalendar = () => this.toggleCalendarCollapsed(false)
    this.collapseCalendar = () => this.toggleCalendarCollapsed(true)
    this.loadMoreEventResults = this.loadMoreEventResults.bind(this)
    this.loadMoreReleaseResults = this.loadMoreReleaseResults.bind(this)
    this.updateReleaseLock = this.updateReleaseLock.bind(this)

    this.subscription = null
  }

  isNewSearch (props, nextProps) {
    return (
      !_.isEqual(props.filteredTeams, nextProps.filteredTeams) ||
      !_.isEqual(props.filteredTags, nextProps.filteredTags) ||
      !_.isEqual(props.filteredNames, nextProps.filteredNames) ||
      !_.isEqual(props.releaseStatuses, nextProps.releaseStatuses) ||
      !_.isEqual(props.sort, nextProps.sort) ||
      !_.isEqual(props.dateRange, nextProps.dateRange)
    )
  }

  UNSAFE_componentWillReceiveProps (nextProps) {
    if (!nextProps.releasesSearchDataLoading && !nextProps.eventsSearchDataLoading && this.props.client) {
      if (!this.subscription || this.isNewSearch(this.props, nextProps)) {
        _.forEach(this.subscription, unsubscribe => unsubscribe())
        this.setupSubscriptions(nextProps)
      }
    }
  }

  updateItemFromSubscription = (isEvent, previousResult, subscriptionData, variables) => {
    let result = previousResult
    if (previousResult?.releasesAndEventsSearch?.nodes && subscriptionData?.data) {
      const { releaseEventUpdated, releaseEventPlanStatsUpdated, releaseEventAdded } = subscriptionData.data
      const item = releaseEventUpdated || releaseEventPlanStatsUpdated || releaseEventAdded
      if (item.isEvent === isEvent) {
        const index = _.findIndex(previousResult.releasesAndEventsSearch.nodes, (node) => node._id === item._id)
        if (index >= 0) {
          result = update(previousResult, {
            releasesAndEventsSearch: {
              nodes: { $splice: [[index, 1, item]] }
            }
          })
        } else {
          result = update(previousResult, {
            releasesAndEventsSearch: {
              nodes: { $splice: [[0, 0, item]] }
            }
          })
        }
      }
    }
    return result
  }

  updateReleaseFromSubscription = (previousResult, subscriptionData, variables) => {
    return this.updateItemFromSubscription(false, previousResult, subscriptionData, variables)
  }

  updateEventFromSubscription = (previousResult, subscriptionData, variables) => {
    return this.updateItemFromSubscription(true, previousResult, subscriptionData, variables)
  }

  setupSubscriptions (props) {
    const variables = {}
    variables.start = props.dateRange ? props.dateRange.start : null
    variables.end = props.dateRange ? props.dateRange.end : null
    variables.teams = _.map(props.filteredTeams, team => team._id)
    variables.tags = _.map(props.filteredTags, team => team._id)
    variables.sortField = props.sort.field
    variables.sortOrder = props.sort.order
    variables.tenants = [this.props.tenantId]
    // Subscription must include all statuses otherwise once a release changes status UI will not be updated.
    variables.status = _.values(RELEASE_STATUS)
    variables.state = [RELEASE_STATE.Default]
    variables.lastValue = null

    this.subscription = [
      subscribe(props.subscribeToMoreReleasesSearchData, releaseEventAdded, variables, this.updateReleaseFromSubscription),
      subscribe(props.subscribeToMoreReleasesSearchData, releaseEventUpdated, variables, this.updateReleaseFromSubscription),
      subscribe(props.subscribeToMoreReleasesSearchData, releaseEventPlanStatsUpdated, variables, this.updateReleaseFromSubscription),
      subscribe(props.subscribeToMoreEventsSearchData, releaseEventAdded, variables, this.updateEventFromSubscription),
      subscribe(props.subscribeToMoreEventsSearchData, releaseEventUpdated, variables, this.updateEventFromSubscription),
      subscribe(props.subscribeToMoreEventsSearchData, releaseEventPlanStatsUpdated, variables, this.updateEventFromSubscription)
    ]
  }

  toggleCalendarCollapsed (val) {
    analytics.trackClick('Event List Calendar Task Sidebar Toggle')
    this.setState({
      calendarCollapsed: val
    })
  }

  openImportCsvDialog () {
    analytics.trackClick('Event List Open Import Event Dialog')
    this.setState({
      importCsvDialogOpen: true
    })
  }

  closeImportCsvDialog (isImportSuccess) {
    analytics.trackClick('Event List Close Import Event Dialog')
    if (isImportSuccess) {
      this.props.setHideSalutation()
    }
    this.setState({
      importCsvDialogOpen: false
    })
  }

  renderImportCsvDialog () {
    if (this.state.importCsvDialogOpen) {
      return (
        <div>
          {this.renderImportReportDialog()}
          <ImportCsvDialog
            isOpen={this.state.importCsvDialogOpen && !this.state.importReportOpen}
            closeModal={this.closeImportCsvDialog.bind(this)}
            organizationId={this.props.organizationId}
            onReportReady={this.onReportReady.bind(this)}/>
        </div>
      )
    }
  }

  onReportReady (reportId, fileName) {
    this.setState({
      importReportId: reportId,
      importReportOpen: true,
      importedFileName: fileName
    })
  }

  renderImportReportDialog () {
    const { importReportId, importedFileName, importReportOpen } = this.state
    if (this.state.importReportId && this.state.importReportOpen) {
      return <CsvImportReportDialogContainer
        reportId={importReportId}
        fileName={importedFileName}
        isOpen={importReportOpen}
        onClose={() => { this.setState({ importReportOpen: false }) }} />
    }
  }

  openReleaseEditDialog (release) {
    analytics.trackClick('Event List Open Release Edit Dialog')
    let toastTitle = this.props.intl.formatMessage(messages.releaseEditSuccess)
    if (!release) {
      toastTitle = this.props.intl.formatMessage(messages.releaseCreateSuccess)
    }
    this.setState({
      eventDialogOpen: true,
      isReleaseEvent: !!((!release || (release && !release.isEvent))),
      selectedEvent: release,
      isCopyReleaseMode: false,
      toastTitle: toastTitle
    })
  }

  openReleaseArchiveDialog (release) {
    analytics.trackClick('Event List Open Release Archive Dialog')
    this.setState({
      releaseDeleteDialogOpen: true,
      selectedEvent: release,
      toastTitle: this.props.intl.formatMessage(messages.releaseArchiveSuccess)
    })
  }

  openReleaseOrEventEditDialog (entry) {
    if (!entry || (entry && !entry.isEvent)) {
      this.openReleaseEditDialog(entry)
    } else {
      this.openEventEditDialog(entry)
    }
  }

  openReleaseOrEventDeleteDialog (entry) {
    if (entry && !entry.isEvent) {
      this.openReleaseArchiveDialog(entry)
    } else {
      this.openEventDeleteDialog(entry)
    }
  }

  deleteEventOrRelease (status) {
    analytics.trackClick('Event List Archive Release or Delete Event')
    this.setState({
      confirmationLoading: true,
      lastActionError: undefined
    }, () => {
      const { selectedEvent } = this.state
      const deletePromise = this.props.delete({ _id: selectedEvent._id, deploymentStatus: status })
      deletePromise.then(() => {
        if (selectedEvent && !selectedEvent.isEvent) {
          this.closeReleaseDeleteDialog(null, true, selectedEvent.name)
        } else {
          this.closeEventDeleteDialog(null, true, selectedEvent.name)
        }
      }).catch(error => {
        this.setState({ lastActionError: error, confirmationLoading: false })
      })
    })
  }

  copyRelease (release) {
    analytics.trackClick('Event List Open Copy Release Dialog')
    const copiedRelease = _.cloneDeep(release)
    const defaultCopiedName = this.props.intl.formatMessage(messages.eventCopyRelease, { 0: release.name })
    copiedRelease.name = defaultCopiedName
    copiedRelease.start = moment().add(1, 'hours')
    const duration = moment.duration(moment(release.end).diff(moment(release.start)))
    copiedRelease.end = moment(copiedRelease.start).add(duration)

    this.setState({
      isCopyReleaseMode: true,
      selectedEvent: copiedRelease,
      isReleaseEvent: false,
      eventDialogOpen: true,
      toastTitle: this.props.intl.formatMessage(messages.releaseDuplicateSuccess)
    })
  }

  openEventEditDialog (event) {
    analytics.trackClick('Event List Open Event Edit Dialog')
    let toastTitle = this.props.intl.formatMessage(messages.eventEditSuccess)
    if (!event) {
      toastTitle = this.props.intl.formatMessage(messages.eventCreateSuccess)
    }
    this.setState({
      eventDialogOpen: true,
      isReleaseEvent: false,
      selectedEvent: event,
      isCopyReleaseMode: false,
      toastTitle: toastTitle
    })
  }

  openEventDeleteDialog (event) {
    analytics.trackClick('Event List Open Delete Event Dialog')
    const toastTitle = this.props.intl.formatMessage(messages.eventDeleteSuccess)
    this.setState({
      eventDeleteDialogOpen: true,
      selectedEvent: event,
      toastTitle: toastTitle
    })
  }

  closeEventDialog (e, showToast, name) {
    analytics.trackClick('Event List Close Event Details Dialog')
    if (showToast === true) {
      this.props.setHideSalutation()
      this.setState({
        toastOpen: true,
        toastSubTitle: name,
        eventDialogOpen: false,
        isReleaseEvent: false,
        selectedEvent: null
      })
    } else {
      this.setState({
        eventDialogOpen: false,
        isReleaseEvent: false,
        selectedEvent: null
      })
    }
  }

  closeReleaseDeleteDialog (e, showToast, name) {
    analytics.trackClick('Event List Close Release Archive Dialog')
    if (showToast === true) {
      this.setState({
        toastOpen: true,
        toastSubTitle: name,
        releaseDeleteDialogOpen: false,
        selectedEvent: null,
        confirmationLoading: false
      })
    } else {
      this.setState({
        releaseDeleteDialogOpen: false,
        selectedEvent: null,
        confirmationLoading: false
      })
    }
  }

  closeEventDeleteDialog (e, showToast, name) {
    analytics.trackClick('Event List Close Event Delete Dialog')
    if (showToast === true) {
      this.setState({
        toastOpen: true,
        toastSubTitle: name,
        eventDeleteDialogOpen: false,
        selectedEvent: null,
        confirmationLoading: false
      })
    } else {
      this.setState({
        eventDeleteDialogOpen: false,
        selectedEvent: null,
        confirmationLoading: false
      })
    }
  }

  renderReleaseDeleteDialog () {
    const { locale } = this.context
    if (!this.state.releaseDeleteDialogOpen) { return }
    return (
      <ArchiveEventDialog
        locale={locale}
        event={this.state.selectedEvent}
        error={this.state.lastActionError}
        isOpen={this.state.releaseDeleteDialogOpen}
        closeModal={this.closeReleaseDeleteDialog.bind(this)}
        deleteAction={this.deleteEventOrRelease.bind(this)}
        loading={this.state.confirmationLoading}
      />
    )
  }

  renderEventDeleteDialog () {
    const { intl } = this.props
    const { eventDeleteDialogOpen, selectedEvent, confirmationLoading, lastActionError } = this.state
    const { locale } = this.context
    if (eventDeleteDialogOpen) {
      const dialogLabel = intl.formatMessage(messages.releaseRemovalLabel)
      const dialogTitle = intl.formatMessage(messages.releaseRemovalTitle)
      const dialogMessage = intl.formatMessage(messages.releaseRemovalBody, { 0: selectedEvent.name })
      return (
        <ConfirmationDialog
          locale={locale}
          isOpen={true}
          label={dialogLabel}
          title={dialogTitle}
          message={dialogMessage}
          error={lastActionError}
          loading={confirmationLoading}
          confirmAction={this.deleteEventOrRelease.bind(this, ARCHIVE_DEPLOYMENT_STATUS.All)}
          closeModal={this.closeEventDeleteDialog.bind(this)} />
      )
    }
  }

  renderEventDetailsDialog () {
    if (!this.state.eventDialogOpen) { return }
    return (
      <EventDetailsDialog
        closeModal={this.closeEventDialog.bind(this)}
        isOpen={this.state.eventDialogOpen}
        organizationId={this.props.organizationId}
        releaseTagsLoading={this.props.releaseTagsLoading}
        teamsLoading={this.props.teamsLoading}
        isReleaseEvent={this.state.isReleaseEvent}
        chosenTemplate={this.state.chosenTemplate}
        tags={this.props.releaseTags}
        teams={this.props.teamsForCurrentUser}
        copyReleaseMode={this.state.isCopyReleaseMode}
        event={this.state.selectedEvent}/>
    )
  }

  closeToast () {
    analytics.trackClick('Event List Close Toast Notification')
    this.setState({
      toastOpen: false
    })
  }

  renderToast () {
    return (
      <ReleaseEventUIToast
        kind={'success'}
        open={this.state.toastOpen}
        title={this.state.toastTitle}
        subtitle={this.state.toastSubTitle}
        onRequestClose={this.closeToast.bind(this)}
      />
    )
  }

  loadMoreEventResults (callback) {
    const { eventsSearchResults, loadMoreEvents } = this.props
    let afterKey = ''
    let afterId = ''
    if (eventsSearchResults?.pageInfo?.endCursor) {
      afterKey = eventsSearchResults.pageInfo.endCursor.key
      afterId = eventsSearchResults.pageInfo.endCursor.id
    }
    loadMoreEvents(callback, afterKey, afterId)
  }

  loadMoreReleaseResults (callback) {
    const { releaseSearchResults, loadMoreReleases } = this.props
    let afterKey = ''
    let afterId = ''
    if (releaseSearchResults?.pageInfo?.endCursor) {
      afterKey = releaseSearchResults.pageInfo.endCursor.key
      afterId = releaseSearchResults.pageInfo.endCursor.id
    }
    loadMoreReleases(callback, afterKey, afterId)
  }

  renderSearchContent () {
    const { eventsSearchDataLoading, eventsSearchResults, hasMoreEvents, hasMoreEventSearchResults, noMoreEventSearchResults } = this.props
    const { releasesSearchDataLoading, releaseSearchResults, hasMoreReleases, hasMoreReleaseSearchResults, noMoreReleaseSearchResults } = this.props

    const releaseAndEventFunctions = {
      openReleaseOrEventEditDialog: this.openReleaseOrEventEditDialog,
      openReleaseOrEventDeleteDialog: this.openReleaseOrEventDeleteDialog,
      openReleaseCreateDialog: this.openReleaseCreateDialog,
      openEventCreateDialog: this.openEventCreateDialog,
      openEditDialog: this.openEditDialog,
      openDeleteDialog: this.openDeleteDialog,
      copyRelease: this.copyRelease,
      openImportCsvDialog: this.openImportCsvDialog
    }
    return (
      <main className='right-data-container'>
        <MainHeader />
        <SearchBar
          tags={this.props.releaseTags}
          teams={this.props.teamsForCurrentUser}
          showStatusFilter={true}
          {...this.props} />
        <div className='search-bar-backdrop'/>
        <div className='calendar-and-search-results-container'>
          <CalendarAndTaskContainer
            eventsSearchDataLoading={eventsSearchDataLoading}
            searchResults={eventsSearchResults}
            loadMoreEvents={this.loadMoreEventResults}
            hasMoreSearchResults={hasMoreEventSearchResults && hasMoreEvents}
            noMoreSearchResults={noMoreEventSearchResults}
            collapseCalendar={this.collapseCalendar}
            calendarCollapsed={this.state.calendarCollapsed}
            dateRangeName={this.props.dateRangeName}
            dateRange={this.props.dateRange}
            setDateRangeFilter={this.props.setDateRangeFilter}
            tags={this.props.releaseTags}
            organizationId={this.props.organizationId}
            features={this.props.features}
            locale={this.props.locale}
            {...releaseAndEventFunctions} />
          <ReleaseSearchResultsContainer
            releasesSearchDataLoading={releasesSearchDataLoading}
            searchResults={releaseSearchResults}
            loadMoreReleases={this.loadMoreReleaseResults}
            hasMoreSearchResults={hasMoreReleaseSearchResults && hasMoreReleases}
            noMoreSearchResults={noMoreReleaseSearchResults}
            updateReleaseLock={this.updateReleaseLock}
            openCalendar={this.openCalendar}
            calendarCollapsed={this.state.calendarCollapsed}
            getSearchFiltersUsed={this.props.getSearchFiltersUsed}
            tags={this.props.releaseTags}
            teams={this.props.teamsForCurrentUser}
            sort={this.props.sort}
            setSort={this.props.setSort}
            resultViewMode={this.props.resultViewMode}
            setResultViewMode={this.props.setResultViewMode}
            organizationId={this.props.organizationId}
            features={this.props.features}
            {...releaseAndEventFunctions} />
        </div>
        {this.renderToast()}
        {this.renderEventDetailsDialog()}
        {this.renderReleaseDeleteDialog()}
        {this.renderEventDeleteDialog()}
        {this.renderImportCsvDialog()}
        <div className='footer-margin'/>
      </main>
    )
  }

  renderSalutation () {
    return (
      <div>
        <Salutation
          hideSalutation={this.props.setHideSalutation}
          openImportCsvDialog={this.openImportCsvDialog.bind(this)}
          openReleaseCreateDialog={this.openReleaseEditDialog.bind(this)}
        />
        {this.renderToast()}
        {this.renderEventDetailsDialog()}
        {this.renderReleaseDeleteDialog()}
        {this.renderImportCsvDialog()}
      </div>
    )
  }

  renderContent () {
    const { hasActivity, hideSalutation } = this.props

    const forceShowHelp = window.location.search.indexOf('showStartUp') > -1
    if (!hideSalutation) {
      if (forceShowHelp || !hasActivity) {
        return this.renderSalutation()
      }
    }
    return this.renderSearchContent()
  }

  updateReleaseLock (event, releaseLock) {
    const { updateReleaseLock } = this.props
    updateReleaseLock(event._id, releaseLock)
  }

  render () {
    let result
    const { intl, eventsSearchError, releasesSearchError, hasActivityLoading, hasActivityQueryError, releaseTagsLoading, releaseTags, releaseTagsQueryError, teamsLoading, teamsError, teamsForCurrentUser } = this.props
    const error = hasActivityQueryError || releaseTagsQueryError || teamsError || releasesSearchError || eventsSearchError
    if (error) {
      console.error('Releases failed to load: ', error)
      result = (
        <InlineNotification
          className='release-events-error-banner'
          kind='error'
          title={intl.formatMessage(messages.notificationErrorTitle)}
          subtitle={intl.formatMessage(messages.notificationErrorMsg)}
          forceStacked={true}
          forceOpaque={true}
          hideCloseButton={true} />
      )
    } else if (hasActivityLoading || releaseTagsLoading || !releaseTags || teamsLoading || !teamsForCurrentUser) {
      result = <Loading />
    } else {
      result = this.renderContent()
    }
    return result
  }
}

RightDataContainer.propTypes = {
  releaseTagsLoading: PropTypes.bool,
  releaseTags: PropTypes.array,
  releaseTagsQueryError: PropTypes.object,
  hasActivityLoading: PropTypes.bool,
  hasActivity: PropTypes.bool,
  hasActivityQueryError: PropTypes.object,
  subscribeToMoreTags: PropTypes.func,
  teamsLoading: PropTypes.bool,
  teamsForCurrentUser: PropTypes.array,
  teamsError: PropTypes.object,
  client: PropTypes.instanceOf(ApolloClient),
  hideSalutation: PropTypes.bool,
  setHideSalutation: PropTypes.func
}

const MainDataContainer = compose(
  withApollo,
  tenantContainer,
  withTags,
  withTeams,
  withHasActivity,
  withEventsSearch,
  withReleasesSearch,
  withDeleteReleaseEvent,
  withUpdateReleaseLock,
  injectIntl
)(RightDataContainer)

export { MainDataContainer }
