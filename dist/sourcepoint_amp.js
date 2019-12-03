(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
  factory();
}((function () { 'use strict';

  var constants = {
    MMS_DOMAIN: 'https://mms.sp-prod.net',
    CMP_ORIGIN: 'https://sourcepoint.mgr.consensu.org',
    MSG_SCRIPT_URL: 'https://dialogue.sp-prod.net/messagingWithoutDetection.js'
  };
  var MMS_DOMAIN = constants.MMS_DOMAIN;
  var CMP_ORIGIN = constants.CMP_ORIGIN;
  var MSG_SCRIPT_URL = constants.MSG_SCRIPT_URL;

  var loggedFunction = function(name, callback) {
    return function() {
      console.log("["+name+"] arguments: "+JSON.stringify(arguments));
      callback.apply(null, Array.prototype.slice.call(arguments));
    };
  };

  var ACCEPT_ALL_CHOICE_TYPE = 11;
  var ACCEPT_ALL = "all";
  var REJECT_ALL = "none";

  function SourcePointClient (amp) {
    return {
      onMessageReady: loggedFunction('onMessageReady', function() {
        amp.show();
      }),
      onMessageChoiceError: loggedFunction('onMessageChoiceError', function (_error) {
        amp.dismiss();
      }),
      onSPPMObjectReady: loggedFunction('onSPPMObjectReady', function() {
        if(amp.userTriggered()) {
          amp.show();
        }
      }),
      onMessageChoiceSelect: loggedFunction('onMessageChoiceSelect', function (_choiceId, choiceType) {
        amp.purposeConsent = choiceType === ACCEPT_ALL_CHOICE_TYPE ? ACCEPT_ALL : REJECT_ALL;
      }),
      onPrivacyManagerAction: loggedFunction('onPrivacyManagerAction', function (consents) {
        // consents: {"purposeConsent":"all|some|none", "vendorConsent":"all|some|none" }
        amp.purposeConsent = consents.purposeConsent;
      }),
      onPMCancel: loggedFunction('onPMCancel', function () {
        if(amp.userTriggered()) amp.dismiss();
      }),
      onConsentReady:  loggedFunction('onConsentReady', function (_consentUUID, euconsent) {
        amp.purposeConsent === ACCEPT_ALL ?
          amp.accept(euconsent) :
          amp.reject(euconsent);
      })
    };
  }

  function AMPClient (config, onAMPMessage) {
    this._config = config;
    this._onAMPMessage = onAMPMessage;
    this._config.fullscreen = config.clientConfig &&
      config.clientConfig.fullscreen === false ?
        false :
        true;
  }
  AMPClient.prototype.userTriggered = function () {
    return this._config.promptTrigger === 'action';
  };
  AMPClient.prototype.isFullScreen = function () {
    return this._config.fullscreen;
  };
  AMPClient.prototype._postMessage = function (type, action, info) {
    console.info('postMessage: '+type+', '+action+' '+ (info ? JSON.stringify(info) : ''));
    var payload = {
      type: type,
      action: action
    };
    if(info !== undefined) payload.info = info;
    this._onAMPMessage(payload);
  };
  AMPClient.prototype._action = function (actionName, info) {
    var self = this;
    setTimeout(function () {
      self._postMessage('consent-response', actionName, info);
    }, 100);
  };
  AMPClient.prototype._ui = function name(uiAction) {
    this._postMessage('consent-ui', uiAction);
  };
  AMPClient.prototype.accept = function (consentString) {
    this._action('accept', consentString);
  };
  AMPClient.prototype.reject = function (consentString) {
    this._action('reject', consentString);
  };
  AMPClient.prototype.dismiss = function () {
    this._action('dismiss');
  };
  AMPClient.prototype._ready = function () {
    this._ui('ready');
  };
  AMPClient.prototype._fullscreen = function () {
    var self = this;
    setTimeout(function () {
      self._ui('enter-fullscreen');
    }, 200);
  };
  AMPClient.prototype.show = function () {
    this._ready();
    if(this.isFullScreen()){
      this._fullscreen();
    }
  };

  console.info("== Loading AMP Client v1 ==");
  console.debug("config from AMP: " + window.name);

  var stagingVarsUrl = function(env, mmsDomain) {
    mmsDomain = mmsDomain || MMS_DOMAIN;
    return mmsDomain + "/mms/qa_set_env?env="+env;
  };

  var loadMessageScript = function(scriptSource) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = scriptSource || MSG_SCRIPT_URL;
    document.head.appendChild(script);
  };

  var setEnv = function(env, onReadyCallback) {
    var request = new XMLHttpRequest();
    request.open("GET", stagingVarsUrl(env));
    request.withCredentials = true;
    request.addEventListener("load", function () { onReadyCallback(); });
    request.send();
  };

  var loadMessage = function(env) {
    setEnv(env, loadMessageScript);
  };

  var siteHref = function(siteName) {
    return "https://"+siteName;
  };

  var onAMPMessage = function(payload) {
    window.parent.postMessage(payload, '*');
  };
  var ampConfig = JSON.parse(window.name);
  var amp = new AMPClient(ampConfig, onAMPMessage);
  var clientConfig = ampConfig.clientConfig;

  // set query params for triggering the message or the PM directly
  if (history && history.pushState) {
    var newurl = location.protocol + "//" + location.host + location.pathname
      + '?_sp_showPM='+amp.userTriggered()
      + '&_sp_runMessaging='+!amp.userTriggered();
    history.pushState({ path: newurl }, '', newurl);
  }

  window._sp_ = {
    config: {
      accountId: clientConfig.accountId,
      siteId: clientConfig.siteId,
      privacyManagerId: clientConfig.privacyManagerId,
      siteHref: siteHref(clientConfig.siteName),
      mmsDomain: MMS_DOMAIN,
      cmpOrigin: CMP_ORIGIN,
      waitForConsent: true,
      targetingParams: clientConfig.targetingParams || {},
      events: SourcePointClient(amp)
    }
  };

  loadMessage(clientConfig.stageCampaign ? "stage" : "public");

})));
