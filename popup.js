document.addEventListener('DOMContentLoaded', () => {
  const clickSound = new Audio(chrome.runtime.getURL('public/click.mp3'));
  const clickSound2 = new Audio(chrome.runtime.getURL('public/schum.mp3'));
  const addBtn = document.getElementById('addBtn');
  const customUrl = document.getElementById('customUrl');
  const addExcBtn = document.getElementById('addExcBtn');
  const exceptionUrl = document.getElementById('exceptionUrl');
  const executeBtn = document.getElementById('executeBtn');
  const customList = document.getElementById('customList');
  const exceptionsList = document.getElementById('exceptionsList');

  function loadLists() {
    chrome.runtime.sendMessage({ action: 'getLists' }, (response) => {
      if (response) {
        customList.innerHTML = '';
        (response.customBlocks || []).forEach(domain => {
          const li = document.createElement('li');
          const textSpan = document.createElement('span');
          textSpan.textContent = domain;
          const removeBtn = document.createElement('span');
          removeBtn.textContent = 'X';
          removeBtn.className = 'remove-btn';
          removeBtn.onclick = () => {
            clickSound.play().catch(e => console.log('Sound play failed:', e));
            removeCustomBlock(domain);
          };
          li.appendChild(textSpan);
          li.appendChild(removeBtn);
          customList.appendChild(li);
        });

        exceptionsList.innerHTML = '';
        (response.customExceptions || []).forEach(domain => {
          const li = document.createElement('li');
          const textSpan = document.createElement('span');
          textSpan.textContent = domain;
          const removeBtn = document.createElement('span');
          removeBtn.textContent = 'X';
          removeBtn.className = 'remove-btn';
          removeBtn.onclick = () => {
            clickSound.play().catch(e => console.log('Sound play failed:', e));
            removeException(domain);
          };
          li.appendChild(textSpan);
          li.appendChild(removeBtn);
          exceptionsList.appendChild(li);
        });
      }
    });
  }

  function removeCustomBlock(domain) {
    chrome.runtime.sendMessage({ action: 'removeCustomBlock', domain: domain }, (response) => {
      if (response && response.success) {
        loadLists();
      }
    });
  }

  function removeException(domain) {
    chrome.runtime.sendMessage({ action: 'removeException', domain: domain }, (response) => {
      if (response && response.success) {
        loadLists();
      }
    });
  }

  addBtn.addEventListener('click', () => {
    clickSound.play().catch(e => console.log('Sound play failed:', e));
    const domain = customUrl.value.trim().toLowerCase();
    if (domain) {
      chrome.runtime.sendMessage({ action: 'addCustomBlock', domain: domain }, (response) => {
        if (response && response.success) {
          customUrl.value = '';
          loadLists();
        }
      });
    }
  });

  addExcBtn.addEventListener('click', () => {
    clickSound.play().catch(e => console.log('Sound play failed:', e));
    const domain = exceptionUrl.value.trim().toLowerCase();
    if (domain) {
      chrome.runtime.sendMessage({ action: 'addException', domain: domain }, (response) => {
        if (response && response.success) {
          exceptionUrl.value = '';
          loadLists();
        }
      });
    }
  });

  loadLists();

  customUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addBtn.click();
    }
  });

  exceptionUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addExcBtn.click();
    }
  });

  executeBtn.addEventListener('click', () => {
    clickSound2.play().catch(e => console.log('Sound play failed:', e));
    chrome.runtime.sendMessage({ action: 'executeRun' }, (response) => {
      if (response && response.success) {
        console.log('Executed run.js on current tab');
      }
    });
  });
});