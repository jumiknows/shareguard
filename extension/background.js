// ShareGuard tracks one source tab per Studio. The tab ID survives ordinary
// cross-origin navigation, even though the page's content-script document does not.
const STUDIO = chrome.runtime.getURL('studio.html');
const sessions = new Map(); // Studio tab ID -> source tab ID (best-effort notifications).
const installs = new Map(); // source tab ID -> in-flight scanner installation.
const WEB_PAGE = /^(https?:|file:)/;

chrome.action.onClicked.addListener(async tab => {
  if (!tab.id || !WEB_PAGE.test(tab.url || '')) {
    console.warn('ShareGuard: open a normal web page first.');
    return;
  }
  try {
    await chrome.windows.create({
      url: chrome.runtime.getURL(`studio.html?source=${tab.id}`),
      type: 'popup', width: 1380, height: 900,
    });
  } catch (error) { console.error('ShareGuard could not open Studio:', error); }
});

function explanation(error, tab) {
  const detail = String(error?.message || error);
  if (tab.url?.startsWith('file:')) {
    return `Cannot inspect this local file. Enable “Allow access to file URLs” in ShareGuard’s extension Details, then reload the source tab. (${detail})`;
  }
  return `Cannot inspect this website. Try reloading it. Browser-internal pages, built-in PDFs, and inaccessible frames are unsupported. (${detail})`;
}

function isMissingReceiver(error) {
  return /receiving end does not exist|could not establish connection|message port closed|the message port closed/i.test(String(error?.message || error));
}

async function installScanner(sourceId) {
  if (!installs.has(sourceId)) {
    const pending = chrome.scripting.executeScript({
      target: {tabId: sourceId}, files: ['detector.js', 'scanner.js'],
    }).finally(() => { if (installs.get(sourceId) === pending) installs.delete(sourceId); });
    installs.set(sourceId, pending);
  }
  return installs.get(sourceId);
}

async function inspect(sourceId, categories, before) {
  const request = {type: 'SCAN_NOW', categories};
  let data;
  try {
    data = await chrome.tabs.sendMessage(sourceId, request);
  } catch (error) {
    if (!isMissingReceiver(error)) throw error;
    // On each full navigation the old document (and its scanner) is destroyed.
    // Wait for the new document, then install a fresh scanner in THAT tab.
    const current = await chrome.tabs.get(sourceId);
    if (current.status === 'loading' || current.url !== before.url) return {navigating: true};
    try {
      await installScanner(sourceId);
      data = await chrome.tabs.sendMessage(sourceId, request);
    } catch (injectionError) {
      const after = await chrome.tabs.get(sourceId);
      if (after.status === 'loading' || after.url !== before.url || isMissingReceiver(injectionError)) {
        return {navigating: true};
      }
      throw new Error(explanation(injectionError, after));
    }
  }
  // Do not release a frame if a scan came back from the PREVIOUS document.
  const after = await chrome.tabs.get(sourceId);
  if (after.status === 'loading' || after.url !== before.url) return {navigating: true};
  return {data};
}

function announce(sourceId, type) {
  for (const [studioId, trackedId] of sessions) {
    if (trackedId !== sourceId) continue;
    // A Studio listener receives these notifications in addition to its
    // request/response polling. A suspended worker may lose the sessions Map;
    // polling remains the authoritative fallback.
    chrome.runtime.sendMessage({type, sourceId, studioId}).catch(() => {});
  }
}

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading' || change.url) {
    installs.delete(tabId);
    announce(tabId, 'SOURCE_NAVIGATING');
  }
  if (change.status === 'complete') announce(tabId, 'SOURCE_READY');
});
chrome.tabs.onRemoved.addListener(tabId => {
  installs.delete(tabId);
  sessions.delete(tabId);
  announce(tabId, 'SOURCE_CLOSED');
  for (const [studioId, sourceId] of sessions) if (sourceId === tabId) sessions.delete(studioId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!sender.tab?.id || !sender.url?.startsWith(STUDIO)) return;
  if (!['START_CAPTURE', 'SCAN', 'CHECK_SOURCE', 'STOP_CAPTURE'].includes(message?.type)) return;
  (async () => {
    if (message.type === 'STOP_CAPTURE') {
      sessions.delete(sender.tab.id);
      return {ok: true};
    }
    const sourceId = Number(message.sourceId);
    if (!Number.isSafeInteger(sourceId) || sourceId <= 0 || sourceId === sender.tab.id) {
      throw new Error('Invalid source tab. Reopen Studio from the browser tab you want to protect.');
    }
    const tab = await chrome.tabs.get(sourceId);
    if (!tab) throw new Error('Your original browser tab has been closed.');
    if (!WEB_PAGE.test(tab.url || '')) {
      if (message.type === 'SCAN') {
        return {ok: true, unavailable: true, reason: 'This page cannot be scanned. Return to a normal website to resume protection.'};
      }
      throw new Error('This browser page cannot be scanned. Open a normal website first.');
    }
    if (tab.status === 'loading') {
      if (message.type === 'SCAN') return {ok: true, navigating: true};
      throw new Error('The page is still loading. Wait for it to finish, then start protection.');
    }
    const result = await inspect(sourceId, message.categories, tab);
    if (result.navigating) {
      if (message.type === 'SCAN') return {ok: true, navigating: true};
      throw new Error('The page is changing. Wait for it to finish, then start protection.');
    }
    if (!result.data?.complete) {
      // Return the scanner's structured error, never a supposedly safe frame.
      return {ok: true, data: result.data};
    }
    if (message.type === 'START_CAPTURE') {
      const streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: sourceId, consumerTabId: sender.tab.id,
      });
      sessions.set(sender.tab.id, sourceId);
      return {ok: true, streamId, sourceUrl: tab.url};
    }
    if (message.type === 'SCAN') sessions.set(sender.tab.id, sourceId);
    return {ok: true, data: result.data, sourceUrl: tab.url};
  })().then(sendResponse).catch(error => {
    console.error(`ShareGuard ${message.type} failed:`, error);
    sendResponse({ok: false, error: String(error?.message || error)});
  });
  return true;
});
