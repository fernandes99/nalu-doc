chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.url.includes("docs.google.com") && changeInfo.status == "complete" && tabId === tab.id) {
      chrome.tabs.sendMessage(tabId, {
        message: 'open-doc',
        url: changeInfo.url
      })
    }
  }
);


function getClipboard() {
  var pasteTarget = document.createElement("div");
  pasteTarget.contentEditable = true;
  var actElem = document.activeElement.appendChild(pasteTarget).parentNode;
  pasteTarget.focus();
  document.execCommand("Paste", null, null);
  var paste = pasteTarget.innerText;
  actElem.removeChild(pasteTarget);
  return paste;
};

function onClipboardMessage(request, sender, sendResponse) {
  if (request.action === "paste") {
      sendResponse({
          paste: getClipboard()
      });
  }
}


chrome.extension.onMessage.addListener(onClipboardMessage);