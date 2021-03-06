import {MMS_DOMAIN, MSG_SCRIPT_URL, CMP_ORIGIN, CCPA_ORIGIN, CCPA_MMS_DOMAIN, WRAPPER_API_ORIGIN, TCFV2_SCRIPT_URL} from './constants';
import {gdpr_events, ccpa_events, tcfv2_events} from './sourcepoint_client';
import AMPClient from './amp_client';

// start index.js
console.info("== Loading AMP Client v1 ==");
console.debug("config from AMP: " + window.name);

const urlParams = new URLSearchParams(window.location.search);
const authId = urlParams.get('authId');
const clientId = urlParams.get('client_id');
const pageviewId = urlParams.get('page_view_id');
const pageviewId64 = urlParams.get('page_view_id_64');

var stagingVarsUrl = function(mmsDomain) {
  mmsDomain = mmsDomain || MMS_DOMAIN;
  return mmsDomain + "/mms/qa_set_env?env=stage";
};

var loadMessageScript = function() {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = MSG_SCRIPT_URL;
  document.head.appendChild(script);
};

var loadMessageScriptTCFV2 = function() {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = window._sp_.config.scriptUrl || TCFV2_SCRIPT_URL;
  document.head.appendChild(script);
};

var setStage = function(onReadyCallback) {
  var request = new XMLHttpRequest();
  request.withCredentials = true;
  request.open("GET", stagingVarsUrl());
  request.addEventListener("load", onReadyCallback);
  request.send();
};

var loadMessage = function(isStageCampaign) {
  isStageCampaign ? setStage(loadMessageScript) : loadMessageScript();
};

var loadMessageTCFV2 = function(isStageCampaign) {
  isStageCampaign ? setStage(loadMessageScriptTCFV2) : loadMessageScriptTCFV2();
};

var siteHref = function(siteName) {
  return "https://"+siteName;
};

var onAMPMessage = function(payload) {
  window.parent.postMessage(payload, '*')
}
var ampConfig = JSON.parse(window.name)
var amp = new AMPClient(ampConfig, onAMPMessage);
var clientConfig = ampConfig.clientConfig;

// set query params for triggering the message or the PM directly
if (history && history.pushState) {
  let showPM = false;
  let runMessaging = false;

  if (amp.userTriggered() && ( clientConfig.privacyManagerId && (clientConfig.privacyManagerId.length > 0 || clientConfig.privacyManagerId > 0) )) showPM = true;
  if (!amp.userTriggered() || !clientConfig.privacyManagerId || clientConfig.privacyManagerId.length == 0) runMessaging = true;

  var newurl = location.protocol + "//" + location.host + location.pathname
    + '?_sp_showPM='+showPM
    + '&_sp_runMessaging='+runMessaging
    + '&isCCPA='+(clientConfig.isCCPA || false)
    + '&isTCFV2='+(clientConfig.isTCFV2 || false);
  history.pushState({ path: newurl }, '', newurl);
}

window._sp_ccpa = window._sp_;
if (!clientConfig.isCCPA && !clientConfig.isTCFV2) {
  console.log("run gdpr");
  window._sp_ = {
    config: {
      accountId: clientConfig.accountId,
      siteId: clientConfig.siteId,
      privacyManagerId: clientConfig.privacyManagerId,
      siteHref: siteHref(clientConfig.siteName),
      mmsDomain: clientConfig.mmsDomain || MMS_DOMAIN,
      cmpOrigin: clientConfig.cmpOrigin  || CMP_ORIGIN,
      waitForConsent: true,
      targetingParams: clientConfig.targetingParams || {},
      events: gdpr_events(amp),
    }
  };
  loadMessage(clientConfig.stageCampaign);
} else if (!clientConfig.isCCPA && clientConfig.isTCFV2) {
  console.log("run tcfv2");
  window._sp_ = {
    config: {
      accountId: clientConfig.accountId,
      propertyId: clientConfig.propertyId,
      propertyHref: clientConfig.propertyHref,
      pmTab: clientConfig.pmTab,
      isTCFV2: true,
      scriptUrl: clientConfig.scriptUrl || TCFV2_SCRIPT_URL,
      privacyManagerId: clientConfig.privacyManagerId,
      consentLanguage: clientConfig.consentLanguage,
      mmsDomain: clientConfig.mmsDomain || MMS_DOMAIN,
      wrapperAPIOrigin: clientConfig.wrapperAPIOrigin || WRAPPER_API_ORIGIN,
      campaignEnv: clientConfig.stageCampaign ? "stage" : "prod",
      env: clientConfig.env,
      targetingParams: clientConfig.targetingParams || {},
      promptTrigger: ampConfig.promptTrigger,
      events: tcfv2_events(amp),
    }
  };
  if (authId)       window._sp_.config.authId = authId;
  if (clientId)     window._sp_.config.clientId = clientId;
  if (pageviewId)   window._sp_.config.pageviewId = pageviewId;
  if (pageviewId64) window._sp_.config.pageviewId64 = pageviewId64;
  loadMessageTCFV2(clientConfig.stageCampaign);
} else {
  console.log("run ccpa");
  window._sp_ccpa = {
    config: {
      mmsDomain: clientConfig.mmsDomain || CCPA_MMS_DOMAIN,
      ccpaOrigin: clientConfig.ccpaOrigin || CCPA_ORIGIN,
      accountId: clientConfig.accountId,
      getDnsMsgMms: clientConfig.getDnsMsgMms,
      alwaysDisplayDns: clientConfig.alwaysDisplayDns,
      isCCPA: true,
      siteId: clientConfig.siteId,
      siteHref: clientConfig.siteHref,
      targetingParams: clientConfig.targetingParams || {},
      privacyManagerId: clientConfig.privacyManagerId,
      events: ccpa_events(amp),
    }
  };
  if (authId)       window._sp_ccpa.config.authId = authId;
  if (clientId)     window._sp_ccpa.config.clientId = clientId;
  if (pageviewId)   window._sp_ccpa.config.pageviewId = pageviewId;
  if (pageviewId64) window._sp_ccpa.config.pageviewId64 = pageviewId64;
  window._sp_ =     window._sp_ccpa;
}
// end index.js
