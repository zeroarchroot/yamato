if (typeof browser === 'undefined') {
  var browser = chrome;
}

let domains = new Set();

function playSound() {
  const player = document.createElement('audio');
  player.src = browser.runtime.getURL('public/vergil.mp3');
  player.preload = 'auto';
  player.style.display = 'none';
  document.body.appendChild(player);
  try { player.currentTime = 0; } catch (e) {}
  const p = player.play();
  if (p?.catch) {
    p.catch(err => console.warn('Audio play failed:', err));
  }
  // Clean up after play
  player.addEventListener('ended', () => {
    player.remove();
  }, {once: true});
}

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.action) return;

  if (msg.action === 'play-sound') {
    playSound();
    return;
  }

  if (msg.action === 'close-this-tab' && sender?.tab?.id) {
    const removePromise = browser.tabs.remove(sender.tab.id);
    if (removePromise && typeof removePromise.catch === 'function') {
      removePromise.catch(console.error);
    }
    return;
  }

  if (msg.action === 'getLists') {
    browser.storage.local.get(['customBlocks', 'customExceptions'], (result) => {
      sendResponse({
        customBlocks: result.customBlocks || [],
        customExceptions: result.customExceptions || []
      });
    });
    return true;
  }

  if (msg.action === 'addException' && msg.domain) {
    const domain = msg.domain.trim().toLowerCase();
    if (domain && !exceptions.has(domain)) {
      exceptions.add(domain);
      browser.storage.local.get(['customExceptions'], (result) => {
        const exc = result.customExceptions || [];
        if (!exc.includes(domain)) {
          exc.push(domain);
          browser.storage.local.set({ customExceptions: exc });
          console.log(`Added exception: ${domain}`);
        }
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.action === 'removeException' && msg.domain) {
    const domain = msg.domain.trim().toLowerCase();
    if (exceptions.has(domain)) {
      exceptions.delete(domain);
      browser.storage.local.get(['customExceptions'], (result) => {
        const exc = result.customExceptions || [];
        const index = exc.indexOf(domain);
        if (index > -1) {
          exc.splice(index, 1);
          browser.storage.local.set({ customExceptions: exc });
          console.log(`Removed exception: ${domain}`);
        }
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.action === 'removeCustomBlock' && msg.domain) {
    const domain = msg.domain.trim().toLowerCase();
    if (domains.has(domain)) {
      domains.delete(domain);
      browser.storage.local.get(['customBlocks'], (result) => {
        const custom = result.customBlocks || [];
        const index = custom.indexOf(domain);
        if (index > -1) {
          custom.splice(index, 1);
          browser.storage.local.set({ customBlocks: custom });
          console.log(`Removed custom block: ${domain}`);
        }
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.action === 'addCustomBlock' && msg.domain) {
    const domain = msg.domain.trim().toLowerCase();
    if (domain && !domains.has(domain)) {
      domains.add(domain);
      browser.storage.local.get(['customBlocks'], (result) => {
        const custom = result.customBlocks || [];
        if (!custom.includes(domain)) {
          custom.push(domain);
          browser.storage.local.set({ customBlocks: custom });
          console.log(`Added custom block: ${domain}`);
        }
      });
    }
    sendResponse({ success: true });
    return true;
  }

  if (msg.action === 'executeRun') {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        const scriptPromise = browser.tabs.executeScript(tabs[0].id, {
          file: 'run.js',
          runAt: 'document_idle'
        });
        if (scriptPromise && typeof scriptPromise.catch === 'function') {
          scriptPromise.catch(console.error);
        }
      }
    });
    sendResponse({ success: true });
    return true;
  }
});

browser.commands.onCommand.addListener((command) => {
  if (command === 'execute-run') {
    browser.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0]) {
        const scriptPromise2 = browser.tabs.executeScript(tabs[0].id, {
          file: 'run.js',
          runAt: 'document_idle'
        });
        if (scriptPromise2 && typeof scriptPromise2.catch === 'function') {
          scriptPromise2.catch(console.error);
        }
      }
    });
  }
});

(async () => {
  try {
    const response = await fetch(browser.runtime.getURL('public/block.txt'));
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());
    domains = new Set(lines);
    console.log(`Loaded ${domains.size} domains from file`);
  } catch (err) {
    console.error('Failed to load block.txt:', err);
  }
})();

let exceptions = new Set();

browser.storage.local.get(['customBlocks', 'customExceptions'], (result) => {
  const custom = result.customBlocks || [];
  custom.forEach(domain => domains.add(domain));
  console.log(`Merged ${custom.length} custom domains`);

  const exc = result.customExceptions || [];
  exc.forEach(domain => exceptions.add(domain));
  console.log(`Merged ${exc.length} custom exceptions`);

  // Inject into existing tabs after loading storage
  browser.tabs.query({url: '<all_urls>'}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.url && tab.url.startsWith('http')) {
        try {
          const url = new URL(tab.url);
          const hostname = url.hostname;
          let isBlocked = false;
          let isException = false;
          for (const domain of exceptions) {
            if (hostname === domain || hostname.endsWith('.' + domain)) {
              isException = true;
              break;
            }
          }
          if (!isException) {
            for (const domain of domains) {
              if (hostname === domain || hostname.endsWith('.' + domain)) {
                isBlocked = true;
                break;
              }
            }
          }
          if (isBlocked) {
            const scriptPromise3 = browser.tabs.executeScript(tab.id, {
              file: 'run.js',
              runAt: 'document_start'  // Earlier injection for better media blocking
            });
            if (scriptPromise3 && typeof scriptPromise3.catch === 'function') {
              scriptPromise3.catch(console.error);
            }
          }
        } catch (err) {
          console.error('Error checking existing tab URL:', err);
        }
      }
    });
  });
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    try {
      const url = new URL(tab.url);
      const hostname = url.hostname;
      let isBlocked = false;
      let isException = false;
      for (const domain of exceptions) {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          isException = true;
          break;
        }
      }
      if (!isException) {
        for (const domain of domains) {
          if (hostname === domain || hostname.endsWith('.' + domain)) {
            isBlocked = true;
            break;
          }
        }
      }
      if (isBlocked) {
        const scriptPromise4 = browser.tabs.executeScript(tabId, {
          file: 'run.js',
          runAt: 'document_start'  // Earlier injection for better media blocking
        });
        if (scriptPromise4 && typeof scriptPromise4.catch === 'function') {
          scriptPromise4.catch(console.error);
        }
      }
    } catch (err) {
      console.error('Error checking tab URL:', err);
    }
  }
});
