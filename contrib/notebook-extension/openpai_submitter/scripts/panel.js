define([
  'require',
  'jquery',
  'base/js/namespace',
  'base/js/events',
  'nbextensions/openpai_submitter/scripts/config',
  'nbextensions/openpai_submitter/scripts/interface',
  'nbextensions/openpai_submitter/scripts/utils'
],
function (requirejs, $, Jupyter, events, config, Interface, Utils) {
  function Panel () {
    var STATUS_R = [
      'NOT_READY',
      'READY_NOT_LOADING',
      'READY_LOADING',
      'SHOWING_INFO',
      'SUBMITTING_1',
      'SUBMITTING_2',
      'SUBMITTING_3',
      'SUBMITTING_OK',
      'CANCELLING',
      'ERROR',
      'FATAL'
    ]
    var MSG_R = [
      'PLEASE_INIT',
      'INIT_OK',
      'CLICK_BUTTON',
      'CLICK_CLOSE',
      'CLICK_REFRESH',
      'SUBMIT_START_1',
      'SUBMIT_START_2',
      'SUBMIT_START_3',
      'SUBMIT_OK',
      'CANCEL',
      'ERROR',
      'FATAL_ERROR'
    ]

    var STATUS = {}
    for (var i = 0; i < STATUS_R.length; i += 1) { STATUS[STATUS_R[i]] = i }
    var MSG = {}
    for (var j = 0; j < MSG_R.length; j += 1) { MSG[MSG_R[j]] = j }

    var set = function (s) {
      // console.log('[openpai submitter] set status', STATUS_R[s])
      status = s
    }

    var status
    var panelRecent

    set(STATUS.NOT_READY)

    var speed = config.panel_toggle_speed
    var getLoadingImg = function (idName) {
      var loadingImg
      if (idName !== undefined) { loadingImg = '<img src="' + requirejs.toUrl('../misc/loading.gif') + '" class="loading-img" id="' + idName + '"></img>' } else { loadingImg = '<img src="' + requirejs.toUrl('../misc/loading.gif') + '" class="loading-img"></img>' }
      return loadingImg
    }

    var showInformation = function (info) {
      /* this function will hide table and show information for users. */
      $('#panel-table-wrapper').hide()
      $('#panel-information').html(info)
      $('#panel-information-wrapper').show()
    }

    var appendInformation = function (info) {
      $('#panel-information').append(info)
    }

    var send = function (msg, value) {
      // console.log('[openpai submitter]', 'status:', STATUS_R[status], 'msg', MSG_R[msg], 'value', value)
      switch (msg) {
        case MSG.PLEASE_INIT:
          handleInit()
          break
        case MSG.INIT_OK:
          handleInitOK()
          break
        case MSG.CLICK_BUTTON:
          if (!($('#openpai-panel-wrapper').is(':visible'))) {
            if ((status !== STATUS.READY_LOADING) && (status !== STATUS.SUBMITTING_1) &&
                                (status !== STATUS.SUBMITTING_2) && (status !== STATUS.SUBMITTING_3) &&
                                (status !== STATUS.SUBMITTING_4) && (status !== STATUS.SUBMITTING_OK) &&
                                (status !== STATUS.FATAL)) { send(MSG.CLICK_REFRESH) }
          }
          togglePanel()
          break
        case MSG.CLICK_CLOSE:
          closePanel()
          break
        case MSG.CLICK_REFRESH:
          handleRefresh()
          break
        case MSG.SUBMIT_START_1:
          handleSubmitStart1(value)
          break
        case MSG.ERROR:
          handleError(value)
          break
        case MSG.FATAL_ERROR:
          handleFatalError(value)
          break
        default:
          send(MSG.ERROR, 'unknown message received by panel!')
      }
    }

    var handleInit = function () {
      var panelUrl = requirejs.toUrl('../templates/panel.html')
      var panel = $('<div id="openpai-panel-wrapper" class="openpai-wrapper"></div>').load(panelUrl)

      Promise.all([
        /* Promise 1: add panel to html body and bind functions */
        panel.promise()
          .then(
            function () {
              panel.draggable()
              panel.toggle()
              $('body').append(panel)
              $('body').on('click', '#close-panel-button', function () {
                send(MSG.CLICK_CLOSE)
              })
              $('body').on('click', '#refresh-panel-button', function () {
                send(MSG.CLICK_REFRESH)
              })
            }
          )
          .then(
            () => Utils.set_timeout(600)
          ).then(function () {
            panel.resizable()
            $('.openpai-logo').attr('src', requirejs.toUrl('../misc/pailogo.jpg'))
            $('#cluster-data')
              .DataTable({
                dom: 'rtip',
                order: [
                  [2, 'desc']
                ]
              })
          }),
        /* Promise 2: load python script */
        new Promise(function (resolve, reject) {
          Interface.initiate(panel, resolve, reject)
        })
      ]).then(function (value) {
        send(MSG.INIT_OK, value)
      })
        .catch(function (err) {
          send(MSG.FATAL_ERROR, err)
        })
    }

    var handleInitOK = function () {
      if (status === STATUS.NOT_READY) {
        if ($('#openpai-panel-wrapper').is(':visible')) {
          /* if the panel has been shown, then load the cluster info */
          set(STATUS.READY_NOT_LOADING)
          send(MSG.CLICK_REFRESH)
        } else {
          /* if the panel has not been shown, change the status to READY_NOT_LOADING and wait */
          showInformation('')
          set(STATUS.READY_NOT_LOADING)
        }
      }
    }

    var handleRefresh = function () {
      if (status === STATUS.NOT_READY || status === STATUS.READY_LOADING) { return }
      if (status === STATUS.SUBMITTING_1 || status === STATUS.SUBMITTING_2 ||
                    status === STATUS.SUBMITTING_3 || status === STATUS.SUBMITTING_4) {
        alert('Please do not refresh during submission.')
        return
      }
      if (status === STATUS.FATAL) {
        alert('Please refresh the whole page to reload this extension.')
        return
      }
      if (status === STATUS.SUBMIT_OK) {
        if (confirm('Are you sure to refresh? This will clear the current job!') === false) {
          return
        }
      }
      set(STATUS.READY_LOADING)
      showInformation('Loading the cluster information, please wait...' + getLoadingImg('loading-cluster-info'))
      Interface.available_resources().then(function (data) {
        var ret = []
        for (var cluster in data) {
          for (var vc in data[cluster]) {
            var info = data[cluster][vc]
            var gpuInfo
            if (info['GPUs'] === -1) {
              gpuInfo = '<a class="openpai-tooltip" href="#" title="Fetching resource of this version of PAI is not supported. Please update it to >= 0.14.0">?</a>'
            } else {
              gpuInfo = info['GPUs']
            }
            ret.push({
              cluster: cluster,
              vc: vc,
              gpu: {
                display: gpuInfo,
                gpu_value: info['GPUs']
              },
              button_sub: `<button class="submit_button" data-type="quick" data-cluster="${cluster}" data-vc="${vc}" >Quick Submit</button>`,
              button_edit: `<button class="submit_button" data-type="edit" data-cluster="${cluster}" data-vc="${vc}" >Download Config</button>`
            })
          }
        }
        $('#cluster-data')
          .DataTable({
            dom: 'rtip',
            order: [
              [2, 'desc']
            ],
            destroy: true,
            data: ret,
            columns: [{
              data: 'cluster'
            }, {
              data: 'vc'
            }, {
              data: 'gpu',
              type: 'num',
              render: {
                _: 'display',
                sort: 'gpu_value'
              }
            }, {
              data: 'button_sub'
            }, {
              data: 'button_edit'
            }],
            fnDrawCallback: function () {
              set(STATUS.SHOWING_INFO)
              $('.openpai-tooltip').tooltip({
                classes: {
                  'ui-tooltip': 'highlight'
                } }
              )
              $('.submit_button').on('click', function () {
                var cluster = $(this).data('cluster')
                var vc = $(this).data('vc')
                var type = $(this).data('type')
                send(MSG.SUBMIT_START_1, {
                  cluster: cluster,
                  vc: vc,
                  type: type
                })
              })
            }
          })
        $('#panel-information-wrapper').hide()
        $('#panel-table-wrapper').show()
      }).catch(function (e) {
        send(MSG.ERROR, e)
      })
    }

    var handleSubmitStart1 = function (info) {
      if (status !== STATUS.SHOWING_INFO) {
        return
      }
      set(STATUS.SUBMITTING_1)
      /* get some basic */
      var submittingCtx = {
        form: $('#submit-form-menu').val(), // file | notebook
        type: info['type'], // quick | edit
        cluster: info['cluster'],
        vc: info['vc'],
        gpu: parseInt($('#resource-menu option:selected').data('gpu')),
        cpu: parseInt($('#resource-menu option:selected').data('cpu')),
        memoryMB: parseInt($('#resource-menu option:selected').data('memory')),
        docker_image: $('#docker-image-menu').val(),
        notebook_name: Jupyter.notebook.notebook_name
      }
      if (submittingCtx['type'] === 'edit') { submittingCtx['stage_num'] = 1 } else {
        if (submittingCtx['form'] === 'file') { submittingCtx['stage_num'] = 1 } else { submittingCtx['stage_num'] = 2 }
      }

      console.log('[openpai submitter] submitting ctx:', submittingCtx)
      showInformation('')
      if (submittingCtx['type'] === 'edit')
        appendInformation('Uploading files and generating config...' + getLoadingImg('loading-stage-1'))
      else{
        if (submittingCtx['stage_num'] === 1)
          appendInformation('Uploading files and submitting the job...' + getLoadingImg('loading-stage-1'))
        else
          appendInformation('Stage 1 / 2 : Uploading files and submitting the job...' + getLoadingImg('loading-stage-1'))
      }
      var promiseSubmitting = Jupyter.notebook.save_notebook()
        .then(
          () => Interface.submit_job(submittingCtx)
        )
        .then(
          function (ctx) {
            set(STATUS.SUBMITTING_2)
            $('#loading-stage-1').remove()
            appendInformation('<br>')
            submittingCtx = ctx
            if (ctx['type'] === 'quick') {
              var submissionTime = (function () {
                var ts = new Date()
                var mm = ts.getMonth() + 1
                var dd = ts.getDate()
                var HH = ts.getHours()
                var MM = ts.getMinutes()
                var SS = ts.getSeconds()
                if (mm < 10) mm = '0' + mm
                if (dd < 10) dd = '0' + dd
                if (HH < 10) HH = '0' + HH
                if (MM < 10) MM = '0' + MM
                if (SS < 10) SS = '0' + SS
                return mm + '-' + dd + ' ' + HH + ':' + MM + ':' + SS
              }())
              panelRecent.send(
                panelRecent.MSG.ADD_JOB, {
                  cluster: ctx['cluster'],
                  vc: ctx['vc'],
                  user: ctx['user'],
                  time: submissionTime,
                  jobname: ctx['jobname'],
                  joblink: ctx['joblink'],
                  state: 'WAITING'
                }
              )
              appendInformation('The job name is: ' + ctx['jobname'] + '<br>')
              appendInformation('The job link is: <a href="' + ctx['joblink'] + '" target="_blank">' + ctx['joblink'] + '</a>')
              return new Promise((resolve, reject) => resolve(ctx))
            } else {
              /* ctx["type"] === "edit" */
              var download = function (filename, text) {
                var element = document.createElement('a')
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
                element.setAttribute('download', filename)
                element.style.display = 'none'
                document.body.appendChild(element)
                element.click()
                document.body.removeChild(element)
              }
              download(ctx['jobname'] + '.yaml', ctx['job_config'])
            }
          }
        )
      if (submittingCtx['stage_num'] === 2) {
        promiseSubmitting = promiseSubmitting.then(
          function (ctx) {
            appendInformation('<br><br>')
            appendInformation('Stage 2 / 2: Wait until the notebook is ready...' + getLoadingImg('loading-stage-2'))
            appendInformation('<br>')
            appendInformation('<p id="text-notebook-show">Note: This procedure may persist for several minutes. You can safely close' +
                                  ' this submitter, and <b>the notebook URL will be shown here once it is prepared.</b></p><br>')
            appendInformation('<p id="text-clear-info-force">If you don\'t want to wait, you can also click <a href="#" id="openpai-clear-info-force">[here]</a> to start a new session.</p>')
            var cancelThis
            var promise = Promise.race([
              Interface.wait_jupyter(ctx),
              new Promise(function (resolve, reject) {
                cancelThis = reject
              })
            ])
            $('body').off('click', '#openpai-clear-info-force').on('click', '#openpai-clear-info-force', function () {
              if (confirm('Are you sure to start a new session? It will clear the current job!')) {
                cancelThis('cancelled')
                set(STATUS.NOT_READY)
                send(MSG.INIT_OK)
              }
            })
            return promise
          }
        ).then(
          function (ctx) {
            if (!($('#openpai-panel-wrapper').is(':visible'))) {
              togglePanel()
            }
            $('#loading-stage-2').remove()
            $('#text-notebook-show').hide()
            $('#text-clear-info-force').hide()
            appendInformation('The notebook url is: <a href="' + ctx['notebook_url'] + '" target="_blank">' + ctx['notebook_url'] + '</a>')
            return new Promise((resolve, reject) => resolve(ctx))
          })
      }
      promiseSubmitting = promiseSubmitting.then(
        function (ctx) {
          set(STATUS.SUBMITTING_OK)
          appendInformation('<br><br> You can click <a href="#" id="openpai-clear-info">[here]</a> to start a new session.')
          $('body').off('click', '#openpai-clear-info').on('click', '#openpai-clear-info', function () {
            set(STATUS.NOT_READY)
            send(MSG.INIT_OK)
          })
        }
      ).catch(function (e) {
        if (e !== 'cancelled') { send(MSG.ERROR, e) }
      })
    }

    var handleError = function (err) {
      showInformation(
        '<p>An error happened. ' +
                    'Please click [refresh] to retry. </p>' +
                    '<br><p>Error Information:' + err + '</p>'
      )
      set(STATUS.ERROR)
    }

    var handleFatalError = function (err) {
      showInformation(
        '<p>A fatal error happened and the OpenPAI Submitter has been terminated. ' +
                    'Please refresh the page and click Kernel - Restart & Clear Output to retry. </p>' +
                    '<br><p>Error Information:' + err + '</p>'
      )
      $('#refresh-panel-button').hide()
      set(STATUS.FATAL)
    }

    var togglePanel = function (callback = null) {
      $('#openpai-panel-wrapper').toggle(speed, callback)
    }

    var openPanel = function (callback = null) {
      $('#openpai-panel-wrapper').show(speed, callback)
    }

    var closePanel = function (callback = null) {
      $('#openpai-panel-wrapper').hide(speed, callback)
    }

    var bindPanelRecent = function (panelRecentInstance) {
      panelRecent = panelRecentInstance
    }

    return {
      send: send,
      STATUS: STATUS,
      MSG: MSG,
      bindPanelRecent: bindPanelRecent
    }
  }

  return Panel
})
