console.log("BASE INITIALIZE");

isCommandPopupOpen = false;
firstRun = true;
KEY_EMBED = '[[KEY_EMBED_NALU]]';

//TODO all sectors
src = {
  popup: {
    "block": {},
    "block_commands": {},
    "block_embed": {}
  },
  doc: {
    "cursor": {},
    "editor": {},
    "line": {},
    "word_node": {}
  }
}

window.addEventListener('load', async () => {
  console.log("INITIALIZE");

  await loadCommandPopup();
  setAllElements();
  setAllListenerPopup();
  handlePlaceholder();

  setTimeout(() => handleEmbedLinks(), 1500);
});

function handleEmbedLinks(sheet = null) {
  let setFrameLink = (paragraph, text) => {
    const link = text.split(KEY_EMBED)[0].replace(/[^\x20-\x7E]/g, '');
    const image = paragraph.querySelector('.kix-embeddedobject-view');

    if (!image || !link || paragraph.children[0].classList.contains('hidden')) return;

    replaceImgWithVideo(paragraph, link);
  }

  let getAllParagraphs = () => {
    return sheet ? sheet.querySelectorAll('.kix-paragraphrenderer') : document.querySelectorAll(".kix-paragraphrenderer");
  }

  getAllParagraphs().forEach(paragraph => {
    const hasEmbedKey = paragraph.textContent.includes(KEY_EMBED);
    if (hasEmbedKey) setFrameLink(paragraph, paragraph.textContent);
  });
}

function handlePlaceholder() {
  const carretEl = document.querySelector("#kix-current-user-cursor-caret");
  const addPlaceHolder = (wordNode) => {
    wordNode.setAttribute("data-placeholder", "Type '/' for commands");
    wordNode.classList.add("line-placeholder");
  }
  const handleCarretChange = (mutationsList, observer) => {
    removePlaceholder();

    if (isCommandPopupOpen) return;

    const carretBounds = carretEl.getBoundingClientRect();

    const lineEl = document.elementFromPoint(
      carretBounds.x + 3,
      carretBounds.y
    );

    if (!lineEl) return;

    const wordNode = lineEl.parentElement.classList.contains("kix-wordhtmlgenerator-word-node")
      ? lineEl.parentElement : lineEl.parentElement.querySelector(".kix-wordhtmlgenerator-word-node");
    const text = wordNode?.textContent;

    if (text?.length < 3) addPlaceHolder(wordNode);
  };

  const observerAction = new MutationObserver(handleCarretChange);
  observerAction.observe(carretEl, { attributes: true });

  handleCarretChange();
}

function removePlaceholder() {
  document.querySelectorAll(".line-placeholder").forEach((line) => {
    line.classList.remove("line-placeholder");
    line.removeAttribute("data-placeholder");
  });
}

function openCommandPopup (bounds, command) {
  isCommandPopupOpen = true;

  removePlaceholder();

  src.popup.block.classList.add("open");
  src.popup.block.style.top = `${bounds.bottom + 10}px`;
  src.popup.block.style.left = `${bounds.left}px`;

  let length = 0;
  const action = command.toLowerCase().replace(/[\u200B-\u200D\uFEFF]|[ ]|[\/]/g, "");

  src.popup.block.querySelectorAll("button").forEach((button) => {
    const buttonText = button.textContent.toLowerCase().replace(/[\u200B-\u200D\uFEFF]|[ ]/g, "");
    const matchesSearch = action.indexOf(buttonText) > -1 || buttonText.indexOf(action) > -1;

    if (matchesSearch || !action) {
      button.classList.remove("hidden");
      length++;
    } else button.classList.add("hidden");
  });

  if (length >= 1) {
    src.popup.block.querySelector("span").classList.add("hidden");
    src.popup.block.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
    src.popup.block.querySelectorAll("button:not(.hidden)")[0].classList.add("active");
    src.popup.block.querySelectorAll("button:not(.hidden)")[0].scrollIntoView(false);
  } else {
    hideCommandPopup(false);
  }
};

function setAllElements() {
  src.popup.block = document.querySelector("#g-docs-commands-container");
  src.doc.cursor = document.querySelector("#kix-current-user-cursor-caret");
}

function setAllListenerPopup() {
  const textIframeEl = document.querySelector(".docs-texteventtarget-iframe").contentDocument;
  const carretEl = document.querySelector("#kix-current-user-cursor-caret");
  const textAreaEl = document.querySelector("#d-docs-command-input");

  textIframeEl.addEventListener('keyup', e => {
    if (e.key !== "/") return;

    const carretBounds = carretEl.getClientRects().item(0);
    const lineEl = document.elementFromPoint(
      carretBounds.x + 3,
      carretBounds.y
    );

    const styles = [
      "fontSize",
      "fontFamily",
      "color",
      "fontWeight",
      "fontStyle",
      "fontVariant",
      "textDecoration",
      "verticalAlign",
      "whiteSpace",
      "fontVariantCaps",
      "fontVariantLigatures",
      "textDecorationColor",
      "textDecorationLine",
      "textDecorationStyle",
    ];
    const computedStyle = getComputedStyle(lineEl);

    styles.forEach((style) => {
      const lineStyle = computedStyle[style];
      textAreaEl.style[style] = lineStyle;
    });

    textAreaEl.classList.remove("hidden");

    textAreaEl.style.display = "block";
    textAreaEl.style.position = "fixed";
    textAreaEl.style.zIndex = "99999";
    textAreaEl.style.top = carretBounds.top + "px";
    textAreaEl.style.left = carretBounds.left + "px";
    textAreaEl.focus();

    openCommandPopup(carretBounds, "");

    const editor = document.querySelector(".kix-appview-editor");
    editor.onscroll = () => hideCommandPopup();
    editor.onclick = () => hideCommandPopup();
  });

  const setPopupEvents = () => {
    const command = document.querySelector(".nalu-commands");

    command?.addEventListener("click", (e) => {
      handleActionItem(e.target);
      return;
    });

    textAreaEl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        focusOnNextItem(e.key);
        e.preventDefault();
        return;
      }
    });

    textAreaEl.addEventListener("keyup", (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") return;

      if (e.key === "Escape" || (e.key === "Backspace" && e.target.value == "")) {
        hideCommandPopup();
        return;
      }

      if (e.key === "Enter") {
        handleActionItem();
        return;
      }

      const carretBounds = carretEl.getClientRects().item(0);
      openCommandPopup(carretBounds, textAreaEl.value);
    });
  }

  let handleActionItem = (item) => {
    let activeButton = null;

    if (item) activeButton = item;
    else activeButton = document.querySelector("#g-docs-commands-container button.active");

    let shortcutData = activeButton?.dataset.shortcut;
    if (shortcutData) {
      let type = "keydown";
      let keys = shortcutData.split("+");

      let key = keys[keys.length-1];
      let isCtrlKey = shortcutData.includes("Ctrl");
      let isAltKey = shortcutData.includes("Alt");
      let isShiftKey = shortcutData.includes("Shift");

      if (key < 6) type = "keyup";

      shortcut(key, type, isCtrlKey, isAltKey, isShiftKey);
      shortcut('Backspace', 'keydown');
      hideCommandPopup();
    }
    else {
      const funcName = activeButton?.dataset.function;
      if (funcName && commandFunctions[funcName]) {
        commandFunctions[funcName]();
      }
    }
  }

  setPopupEvents();
  setEditorEvents();
}

function setEditorEvents() {
  const textIframeEl = document.querySelector(".docs-texteventtarget-iframe").contentDocument;
  const editor = document.querySelector(".kix-appview-editor");

  editor.addEventListener("scroll", () => {
    const allSheets = document.querySelectorAll(".kix-page");
    const currentSheet = [...allSheets].find(sheet => isScrolledIntoView(sheet));

    const previousSheet = currentSheet.previousElementSibling;
    const nextSheet = currentSheet.nextElementSibling;

    if (currentSheet) handleEmbedLinks(currentSheet);
    if (previousSheet) handleEmbedLinks(previousSheet);
    if (nextSheet) handleEmbedLinks(nextSheet);
  })

  textIframeEl.addEventListener("keyup", ev => {
    if (ev.key === "Backspace" || ev.key === "Ctrl") {
      removeEmbedSrc();
    }
  });
}

function removeEmbedSrc(paragraph = null) {
  if (!paragraph) paragraph = getCurrentParagraph();

  let hasEmbedSrc = paragraph?.children[0].classList.contains('hidden');

  if (hasEmbedSrc) {
    paragraph.querySelector(".container-nalu-frame").remove();

    Object.values(paragraph.children).forEach(line => {
      line.style.display = "block";

      if (line.classList.contains("hidden")) {
        line.classList.remove("hidden");
      };
    });
  }
}

function hideCommandPopup (deleteCommand = true) {
  isCommandPopupOpen = false;

  let resetPopup = () => {
    // [...src.popup.block.children].forEach((item) => {
    //   if (!item.classList.contains("hidden")) {
    //     item.classList.add("hidden");
    //   }
    // });

    // src.popup.block.children[0].classList.remove("hidden");

    let commandBlock = src.popup.block.querySelector('.nalu-commands');
    let naluEmbedBlock = src.popup.block.querySelector('.nalu-embed');

    if (commandBlock.classList.contains('hidden')) {
      commandBlock.classList.remove('hidden');
    }

    if (!naluEmbedBlock.classList.contains('hidden')) {
      naluEmbedBlock.classList.add('hidden');
    }

    src.popup.block.classList.remove('open');
  }

  const textAreaEl = document.querySelector("#d-docs-command-input");
  let keys = textAreaEl.value.split('');

  textAreaEl.value = "";
  textAreaEl.style.display = "none";

  // Focus editor again
  document.querySelector("#kix-current-user-cursor-caret").click();

  if (!deleteCommand) keys.forEach(key => shortcut(key, 'keypress'));
  // else shortcut('Backspace', 'keydown');



  resetPopup();
}

function focusOnNextItem (direction = "ArrowDown",
  activeEl = document.querySelector("#g-docs-commands-container button.active")) {

  if (!activeEl) return;

  const newActiveEl =
    direction === "ArrowDown"
      ? activeEl.nextElementSibling
      : activeEl.previousElementSibling;

  if (!newActiveEl) return;

  if (newActiveEl.classList.contains("hidden")) {
    return focusOnNextItem(direction, newActiveEl);
  }

  document.querySelectorAll("#g-docs-commands-container button")
    .forEach((button) => button.classList.remove("active"));

  newActiveEl.classList.add("active");
  newActiveEl.scrollIntoView(false);
};

const commandFunctions = {
  uploadImage: () => {
    const optionsButton = document.querySelector("#moreButton");
    if (optionsButton && optionsButton.getAttribute('aria-pressed') === "false") {
      clickItem(optionsButton);
    }

    const addImageButton = document.querySelector("#insertImageButton")
    if (addImageButton && addImageButton.getAttribute("aria-expanded") === "false") {
      setTimeout(()=>{
        clickItem(addImageButton)
        setTimeout(() => {
          document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown",
            code: "ArrowDown",
            keyCode: 40,
            which: 40
          }));
          setTimeout(() => {
            let elementFocus = document.querySelector(".goog-menuitem-highlight");
            clickItem(elementFocus);
          }, 15);
        }, 10);
      }, 5)
    }
  },

  embedGoogle: () => {
    const commandsEl = document.querySelector('.nalu-commands');
    const embedBlockEl = document.querySelector('.nalu-embed');
    const embedInput = document.querySelector('#nalu-embed-input');
    const embedButton = document.querySelector('#nalu-embed-button');

    embedBlockEl.classList.remove('hidden');
    commandsEl.classList.add('hidden');

    embedButton.onclick = e => handleEmbedPopup(e);

    embedInput.onkeyup = e => {
      const key = e.which || e.keyCode;
      if (key == 13) handleEmbedPopup(e);
    }

    embedInput.focus();
  },

  uploadImageUrl: () => {
    const optionsButton = document.querySelector("#moreButton");
    if (optionsButton && optionsButton.getAttribute('aria-pressed') === "false") {
      clickItem(optionsButton);
    }

    const addImageButton = document.querySelector("#insertImageButton");
    if (addImageButton && addImageButton.getAttribute("aria-expanded") === "false") {
      setTimeout(() => {
        clickItem(addImageButton)
        setTimeout(() => {
          document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowUp",
            code: "ArrowUp",
            keyCode: 38,
            which: 38
          }));
          setTimeout(() => {
            document.activeElement.dispatchEvent(new KeyboardEvent("keydown", {
              key: "ArrowUp",
              code: "ArrowUp",
              keyCode: 38,
              which: 38
            }));

            setTimeout(() => {
              let elementFocus = document.querySelector(".goog-menuitem-highlight");
              clickItem(elementFocus);

              setTimeout(() => {
                const URL_PREVIEW_IMAGE = 'https://i.imgur.com/wh67veX.png';

                document.activeElement.value = URL_PREVIEW_IMAGE;

                setTimeout(() => {
                  document.activeElement.dispatchEvent(new KeyboardEvent("keypress", {
                    key: "Enter",
                    code: "Enter",
                    keyCode: 13,
                    which: 13
                  }));
                }, 50);
              }, 25);
            }, 20);
          }, 15);
        }, 10);
      }, 5)
    }
  }
}

function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function handleEmbedPopup(e) {
  const textIframeEl = document.querySelector(".docs-texteventtarget-iframe").contentDocument;
  let embedValue = e.target.value;
  let embed_key = "";

  if (true) {
    textIframeEl.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Backspace",
      code: "Backspace",
      keyCode: 8,
      which: 8
    }));
    embed_key = `${embedValue} ${KEY_EMBED}`;
    embed_key.split('').forEach(key => shortcut(key, 'keypress'));

    const setToClipboard = async blob => {
      const data = [new ClipboardItem({ [blob.type]: blob })];
      await navigator.clipboard.write(data);
      await textIframeEl.execCommand("paste");

      let paragraph = getCurrentParagraph();
      if (!paragraph.classList.contains('loading-embed')) paragraph.classList.add('loading-embed');

      setTimeout(() => {
        textIframeEl.dispatchEvent(new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13
        }));

        handleEmbedLinks();
      }, 1000);
    }

    fetch('https://i.imgur.com/wh67veX.png').then(res => res.blob())
      .then(blob => setToClipboard(blob));
  
    hideCommandPopup();
  }
  else {
    let alertSrc = document.querySelector(".js-embedAlert");

    if (alertSrc.classList.contains("hidden")) {
      alertSrc.textContent = "Wrong embed link";
      alertSrc.classList.remove("hidden");
    }
  }
}

function getCurrentParagraph() {
  const carretBounds = src.doc.cursor.getBoundingClientRect();
  const lineEl = document.elementFromPoint(
    carretBounds.x + 3,
    carretBounds.y
  );
  const paragraph = lineEl.closest(".kix-paragraphrenderer");

  return paragraph;
}

function isValidUrl(string) {
  let url;

  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
}

function replaceImgWithVideo(paragraph, frameURL) {
  paragraph.style.zIndex = 100;

  let frameSrc = document.createElement('div');

  frameSrc.classList.add("container-nalu-frame", "loader");
  frameSrc.style.height = `${paragraph.offsetHeight}px`;
  frameSrc.innerHTML = `
    <iframe style="display: none;" class="nalu-frame" loading="lazy" width="${paragraph.offsetWidth + 140}" height="${paragraph.offsetHeight}" src="${frameURL}" frameborder="0" allowfullscreen></iframe>
    <button class="nalu-action-button nalu-frame-close">X</button>
    <button class="nalu-action-button nalu-frame-open-link"></button>
  `;

  frameSrc.querySelector('iframe').onload = () => {
    frameSrc.classList.remove("loader");
    frameSrc.querySelector('iframe').style.display='block';
  }

  frameSrc.querySelector('.nalu-frame-open-link').onclick = () => {
    window.open(frameURL, '_blank').focus();
  }

  frameSrc.querySelector('.nalu-frame-close').onclick = () => {
    removeEmbedSrc(paragraph);
  }

  if (paragraph.classList.contains('loading-embed')) paragraph.classList.remove('loading-embed');

  Object.values(paragraph.children).forEach((line, idx) => {
    if (idx == 0) {
      line.style.display = 'none';
      line.classList.add('hidden');
    }

    if (line.querySelector('.kix-embeddedobject-view')) line.style.display = 'none';
    else line.style.display = 'none';
  });

  paragraph.appendChild(frameSrc);
}

const clickItem = (elementToClick) => {
  const simulateMouseEvent = function(element, eventName, coordX, coordY) {
    element.dispatchEvent(new MouseEvent(eventName, {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: coordX,
      clientY: coordY,
      button: 0
    }));
  };

  const box = elementToClick.getBoundingClientRect(),
      coordX = box.left + (box.right - box.left) / 2,
      coordY = box.top + (box.bottom - box.top) / 2;

  simulateMouseEvent(elementToClick, "mousedown", coordX, coordY);
  simulateMouseEvent(elementToClick, "mouseup", coordX, coordY);
  simulateMouseEvent(elementToClick, "click", coordX, coordY);
}

function shortcut(key, type = "keydown", ctrlKey = false, altKey = false, shiftKey = false) {
  const textIframeEl = document.querySelector(".docs-texteventtarget-iframe").contentDocument;

  let code = isNaN(key) ? `Key${key}` : `Digit${key}`;
  let charCode = (key).charCodeAt();

  if (key === "ArrowDown") {
    code = "ArrowDown";
    charCode = 40;
  }

  if (key === "ArrowRight") {
    code = "ArrowRight";
    charCode = 39;
  }

  if (key === "Enter") {
    code = "Enter";
    charCode = 13;
  }

  if (key === "Backspace") {
    code = "Backspace";
    charCode = 8;
  }

  textIframeEl.dispatchEvent(new KeyboardEvent(type, {
    key: key,
    keyCode: charCode,
    code: code,
    which: charCode,
    altKey: altKey,
    ctrlKey: ctrlKey,
    shiftKey: shiftKey,
    metaKey: false
  }));
}

async function loadCommandPopup() {
  const urlSrc = chrome.extension.getURL("src/views/popupCommand.html");
  const src = await fetchHtmlAsText(urlSrc);

  return document.body.insertAdjacentHTML("beforeend", src);
};

// UTILS
async function fetchHtmlAsText(url) {
  return await (await fetch(url)).text();
}



Element.prototype.remove = function() {
  this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
  for(var i = this.length - 1; i >= 0; i--) {
      if(this[i] && this[i].parentElement) {
          this[i].parentElement.removeChild(this[i]);
      }
  }
}



function isScrolledIntoView(el) {
  const rect = el.getBoundingClientRect();
  const elemTop = rect.top;
  const elemBottom = rect.bottom;

  // Only completely visible elements return true:
  // var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);

  const isVisible = elemTop < window.innerHeight && elemBottom >= 0;
  return isVisible;
}