
// ==UserScript==
// @name         Date Format Converter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Convert between human-readable dates and Unix timestamps
// @author       Blake Smith (and Claude 3.7)
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @updateURL    https://github.com/BlakeASmith/dateconverter/raw/refs/heads/main/public/dateconverter.user.js
// @downloadURL  https://github.com/BlakeASmith/dateconverter/raw/refs/heads/main/public/dateconverter.user.js
// ==/UserScript==

(function() {
  'use strict';

  // Add styles for the popup
  GM_addStyle(`
    #date-converter-popup {
      position: absolute;
      background: #333;
      color: #fff;
      padding: 12px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      max-width: 350px;
      word-break: break-word;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    #date-converter-popup .close {
      position: absolute;
      top: 4px;
      right: 8px;
      cursor: pointer;
      font-size: 16px;
      color: #ccc;
      line-height: 1;
    }

    #date-converter-popup .close:hover {
      color: #fff;
    }

    #date-converter-popup .info-row {
      display: flex;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #555;
    }

    #date-converter-popup .info-row:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    #date-converter-popup .label {
      flex: 0 0 90px;
      margin-right: 10px;
    }

    #date-converter-popup .value {
      flex: 1;
      font-weight: bold;
    }

    #date-converter-popup .copy-btn {
      background: #555;
      color: #fff;
      border: none;
      border-radius: 3px;
      padding: 3px 8px;
      margin-left: 8px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    #date-converter-popup .copy-btn:hover {
      background: #777;
    }

    #date-converter-popup .copy-btn.copied {
      background: #4CAF50;
    }

    #date-converter-popup .original {
      font-style: italic;
      color: #aaa;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #555;
    }

    #date-converter-popup .extracted {
      color: #8adbff;
      margin-bottom: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid #555;
    }
  `);

  // Create popup element (hidden initially)
  const popup = document.createElement('div');
  popup.id = 'date-converter-popup';
  popup.style.display = 'none';

  // Add close button
  const closeBtn = document.createElement('span');
  closeBtn.className = 'close';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', hidePopup);

  // Add content container
  const content = document.createElement('div');
  content.className = 'content';

  // Assemble popup
  popup.appendChild(closeBtn);
  popup.appendChild(content);
  document.body.appendChild(popup);

  // Function to convert Unix timestamp to various date formats
  function formatFromTimestamp(timestamp) {
    // Handle both seconds (10 digits) and milliseconds (13 digits)
    const ts = timestamp.length === 10 ? timestamp * 1000 : Number(timestamp);

    try {
      const date = new Date(ts);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }

      const localOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      };

      // Format for UTC time
      const utcOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
      };

      return {
        local: date.toLocaleString(undefined, localOptions),
        utc: date.toLocaleString(undefined, utcOptions),
        relative: getRelativeTime(date),
        iso: date.toISOString(),
        unix: Math.floor(date.getTime() / 1000).toString(),
        unixMs: date.getTime().toString()
      };
    } catch (e) {
      return null;
    }
  }
  // Function to extract and parse dates from text
function extractAndParseDate(text) {
  // Check if it's a standalone Unix timestamp (10 or 13 digits)
  if (/^\d{10}$|^\d{13}$/.test(text.trim())) {
    return {
      type: 'unix',
      extracted: text.trim(),
      info: formatFromTimestamp(text.trim())
    };
  }

  // Try to extract Unix timestamp with common labels
  const unixPatterns = [
    // Common Unix timestamp labels
    /(?:unix|epoch|timestamp|unix timestamp|epoch timestamp)(?:\s*[:=]\s*)(\d{10,13})\b/i,
    // Timestamp in parentheses
    /\((?:unix|epoch|timestamp|unix timestamp|epoch timestamp)?[:\s]*(\d{10,13})\)/i,
    // Just a number that looks like a Unix timestamp
    /\b(\d{10}|\d{13})\b/
  ];

  // Try each Unix timestamp pattern
  for (const pattern of unixPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const timestamp = match[1].trim();
      const info = formatFromTimestamp(timestamp);

      if (info) {
        return {
          type: 'unix',
          extracted: timestamp,
          info: info
        };
      }
    }
  }

  // Try to parse the entire string as a date
  try {
    const date = new Date(text);
    if (!isNaN(date.getTime())) {
      return {
        type: 'full',
        extracted: text,
        info: getDateInfo(date)
      };
    }
  } catch (e) {
    // Continue with other methods if this fails
  }

  // Common date patterns to extract from text
  const datePatterns = [
    // ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ)
    /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/,

    // Common date formats with time
    /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/,
    /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\b/,

    // Month name, day, year with optional time
    /\b((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?)\b/,

    // Day, Month name, year with optional time
    /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?)\b/,

    // Weekday, Month name, day, year with optional time
    /\b((?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?),?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)?)\b/,

    // Date and time with labels
    /(?:date|time|datetime|date and time|timestamp)(?:\s*[:=]\s*)([^")\n]+)/i,

    // Time with timezone abbreviation
    /\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s+[A-Z]{3,5})\b/
  ];

  // Try each date pattern
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        const extractedText = match[1].trim();
        const date = new Date(extractedText);

        if (!isNaN(date.getTime())) {
          return {
            type: 'extracted',
            extracted: extractedText,
            info: getDateInfo(date)
          };
        }
      } catch (e) {
        // Try next pattern if this one fails
        continue;
      }
    }
  }

  // If we get here, we couldn't find a valid date
  return null;
}

  // Get date info object from a Date object
  function getDateInfo(date) {
    const localOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };

    // Format for UTC time
    const utcOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short'
    };

    return {
      local: date.toLocaleString(undefined, localOptions),
      utc: date.toLocaleString(undefined, utcOptions),
      relative: getRelativeTime(date),
      iso: date.toISOString(),
      unix: Math.floor(date.getTime() / 1000).toString(),
      unixMs: date.getTime().toString()
    };
  }

  // Get relative time description
  function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    if (diffSec < 0) {
      return 'in the future';
    } else if (diffSec < 60) {
      return `${diffSec} second${diffSec !== 1 ? 's' : ''} ago`;
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    } else {
      const diffMonth = Math.round(diffDay / 30);
      if (diffMonth < 12) {
        return `${diffMonth} month${diffMonth !== 1 ? 's' : ''} ago`;
      } else {
        const diffYear = Math.round(diffMonth / 12);
        return `${diffYear} year${diffYear !== 1 ? 's' : ''} ago`;
      }
    }
  }
  // Copy text to clipboard
  function copyToClipboard(text) {
    // Create temporary element
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'absolute';
    el.style.left = '-9999px';
    document.body.appendChild(el);

    // Select and copy
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }

  // Create a row with copy button
  function createInfoRow(label, value) {
    const row = document.createElement('div');
    row.className = 'info-row';

    const labelEl = document.createElement('div');
    labelEl.className = 'label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'value';
    valueEl.textContent = value;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', function() {
      copyToClipboard(value);

      // Visual feedback
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');

      // Reset after 2 seconds
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.remove('copied');
      }, 2000);
    });

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    row.appendChild(copyBtn);

    return row;
  }
  // Show popup with date info
  function showPopup(text, x, y) {
    // Try to extract and parse a date from the text
    const result = extractAndParseDate(text);

    // If no date was found, don't show the popup
    if (!result) {
      return;
    }

    // Clear previous content
    content.innerHTML = '';

    // Add original text as reference if it's different from the extracted date
    if (result.type === 'extracted' && text !== result.extracted) {
      const originalEl = document.createElement('div');
      originalEl.className = 'original';
      originalEl.textContent = `Original: "${text}"`;
      content.appendChild(originalEl);

      const extractedEl = document.createElement('div');
      extractedEl.className = 'extracted';
      extractedEl.textContent = `Extracted: "${result.extracted}"`;
      content.appendChild(extractedEl);
    } else if (result.type === 'full') {
      const originalEl = document.createElement('div');
      originalEl.className = 'original';
      originalEl.textContent = `Original: "${text}"`;
      content.appendChild(originalEl);
    }

    // Add appropriate info rows based on the type of date
    if (result.type === 'unix') {
      // For Unix timestamps, show human-readable formats
      content.appendChild(createInfoRow('Local:', result.info.local));
      content.appendChild(createInfoRow('UTC:', result.info.utc));
      content.appendChild(createInfoRow('Relative:', result.info.relative));
      content.appendChild(createInfoRow('ISO 8601:', result.info.iso));
    } else {
      // For human dates, show technical formats
      content.appendChild(createInfoRow('Unix Time:', result.info.unix));
      content.appendChild(createInfoRow('Unix (ms):', result.info.unixMs));
      content.appendChild(createInfoRow('ISO 8601:', result.info.iso));
      content.appendChild(createInfoRow('UTC:', result.info.utc));
      content.appendChild(createInfoRow('Relative:', result.info.relative));
    }

    // Position popup
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.display = 'block';

    // Add click outside listener
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
    }, 10);
  }

  // Hide popup
  function hidePopup() {
    popup.style.display = 'none';
    document.removeEventListener('click', handleOutsideClick);
  }

  // Handle click outside popup
  function handleOutsideClick(e) {
    if (!popup.contains(e.target)) {
      hidePopup();
    }
  }

  // Handle selection
  function handleSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || text.length < 3) return; // Require at least 3 characters

    // Get position for popup (near the selection)
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const x = rect.left + window.scrollX;
    const y = rect.bottom + window.scrollY + 10; // 10px below selection

    showPopup(text, x, y);
  }

  // Add context menu command
  GM_registerMenuCommand("Convert Selected Date/Time", handleSelection);

  // Listen for mouseup events to detect selections
  document.addEventListener('mouseup', function(e) {
    // Small delay to ensure selection is complete
    setTimeout(handleSelection, 10);
  });

  // Add keyboard shortcut (Ctrl+Shift+D)
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      handleSelection();
    }
  });

  // Double-click handler
  document.addEventListener('dblclick', function(e) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (!text || text.length < 3) return;

    // Get position for popup
    const x = e.pageX;
    const y = e.pageY + 20; // 20px below cursor

    showPopup(text, x, y);
  });
})();
