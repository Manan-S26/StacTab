const COLORS = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

function getSmartName(urlObj) {
  const host = urlObj.hostname.toLowerCase(); const path = urlObj.pathname.toLowerCase();
  
  if (host === 'vertexaisearch.cloud.google.com' || host === 'gemini.google.com') return 'Gemini';
  
  // Specific Google Workspace Overrides
  if (host === 'docs.google.com') {
    if (path.startsWith('/spreadsheets')) return 'Sheets';
    if (path.startsWith('/document')) return 'Docs';
    if (path.startsWith('/presentation')) return 'Slides';
    if (path.startsWith('/forms')) return 'Forms';
    return 'Docs';
  }
  if (host === 'drive.google.com') return 'Drive';
  if (host === 'calendar.google.com') return 'Calendar';
  if (host === 'meet.google.com') return 'Meet';
  if (host === 'mail.google.com') return 'Gmail';

  if (host.includes('looker')) return 'Looker';
  if (host.includes('jira') || host.includes('atlassian')) return 'Jira';
  if (host.includes('workday') || host.includes('myworkday')) return 'WD';
  if (host.includes('dynamics.com') || host.includes('d365')) return 'D365';
  if (host.includes('github')) return 'GitHub';

  let parts = host.replace(/^(www\.|app\.|eu\.|us\.|uk\.|api\.)/g, '').split('.');
  let name = parts.length > 1 ? parts[parts.length - 2] : parts[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function getColorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    chrome.storage.local.get({ autoGroupEnabled: true }, (res) => {
      if (res.autoGroupEnabled) {
        autoGroupTabs();
      }
    });
  }
});

function autoGroupTabs() {
  chrome.tabs.query({ currentWindow: true }, (tabs) => {
    const groups = {};
    tabs.forEach(tab => {
      try {
        const url = new URL(tab.url);
        if (!url.protocol.startsWith('http')) return; 
        const smartName = getSmartName(url);
        if (!groups[smartName]) groups[smartName] = [];
        groups[smartName].push(tab);
      } catch (e) {}
    });

    for (const [name, domainTabs] of Object.entries(groups)) {
      if (domainTabs.length >= 3) {
        const firstGroupId = domainTabs[0].groupId;
        const alreadyGrouped = domainTabs.every(t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE && t.groupId === firstGroupId);
        if (!alreadyGrouped) {
          const tabIds = domainTabs.map(t => t.id); 
          chrome.tabs.group({ tabIds: tabIds }, (groupId) => {
            chrome.tabGroups.update(groupId, { title: name, color: getColorForName(name) });
          });
        }
      }
    }
  });
}

// 🌟 Listen for the toggle off signal to automatically dissolve all groups
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "dissolveGroups") {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const groupedTabIds = tabs
        .filter(t => t.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE)
        .map(t => t.id);
      
      if (groupedTabIds.length > 0) {
        chrome.tabs.ungroup(groupedTabIds);
      }
    });
  }
});
