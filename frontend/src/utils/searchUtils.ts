import { SearchMatch } from '../hooks/useSearch';

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

/**
 * Escapes special regex characters in a string
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Creates a regex pattern for searching text
 */
export const createSearchRegex = (query: string, options: SearchOptions): RegExp => {
  let pattern = escapeRegExp(query);

  if (options.wholeWord) {
    pattern = `\\b${pattern}\\b`;
  }

  const flags = options.caseSensitive ? 'g' : 'gi';
  return new RegExp(pattern, flags);
};

/**
 * Extracts plain text from HTML element, preserving structure for search
 */
export const extractTextContent = (element: HTMLElement): string => {
  // Clone the element to avoid modifying the original
  const clone = element.cloneNode(true) as HTMLElement;

  // Remove script and style elements
  const scripts = clone.querySelectorAll('script, style');
  scripts.forEach(el => el.remove());

  // Get text content and normalize whitespace
  return clone.textContent || clone.innerText || '';
};

/**
 * Finds all text matches in an element and returns SearchMatch objects
 */
export const findTextMatches = (
  element: HTMLElement,
  query: string,
  options: SearchOptions,
  elementId: string
): SearchMatch[] => {
  const text = extractTextContent(element);
  const regex = createSearchRegex(query, options);
  const matches: SearchMatch[] = [];

  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      id: `${elementId}-${matches.length}`,
      element,
      text: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });

    // Prevent infinite loop on zero-length matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  return matches;
};

/**
 * Highlights text matches in an element by wrapping them with spans
 */
export const highlightMatches = (
  element: HTMLElement,
  matches: SearchMatch[],
  currentMatchIndex?: number
): void => {
  // Remove existing highlights
  removeHighlights(element);

  if (matches.length === 0) return;

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  // Sort matches by start index in descending order to avoid index shifting
  const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);

  let currentTextOffset = 0;

  for (const textNode of textNodes) {
    const nodeText = textNode.textContent || '';
    const nodeStart = currentTextOffset;
    const nodeEnd = currentTextOffset + nodeText.length;

    // Find matches that fall within this text node
    const nodeMatches = sortedMatches.filter(
      match => match.startIndex >= nodeStart && match.endIndex <= nodeEnd
    );

    if (nodeMatches.length > 0) {
      const parent = textNode.parentNode;
      if (!parent) continue;

      let remainingText = nodeText;
      let offset = 0;

      for (const match of nodeMatches.reverse()) { // Reverse to process in original order
        const relativeStart = match.startIndex - nodeStart;
        const relativeEnd = match.endIndex - nodeStart;

        // Create text nodes for before, match, and after
        const beforeText = remainingText.substring(offset, relativeStart);
        const matchText = remainingText.substring(relativeStart, relativeEnd);
        const afterText = remainingText.substring(relativeEnd);

        // Create highlight span
        const highlight = document.createElement('span');
        highlight.className = 'search-highlight';
        highlight.textContent = matchText;
        highlight.setAttribute('data-search-match', match.id);

        // Add current match styling
        if (currentMatchIndex !== undefined) {
          const matchIndex = matches.findIndex(m => m.id === match.id);
          if (matchIndex === currentMatchIndex) {
            highlight.classList.add('search-highlight-current');
          }
        }

        // Replace the text node with the highlighted version
        if (beforeText) {
          parent.insertBefore(document.createTextNode(beforeText), textNode);
        }
        parent.insertBefore(highlight, textNode);
        if (afterText) {
          parent.insertBefore(document.createTextNode(afterText), textNode);
        }

        parent.removeChild(textNode);
        break; // Only process one match per text node for simplicity
      }
    }

    currentTextOffset = nodeEnd;
  }
};

/**
 * Removes all search highlights from an element
 */
export const removeHighlights = (element: HTMLElement): void => {
  const highlights = element.querySelectorAll('.search-highlight');
  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
      parent.normalize(); // Merge adjacent text nodes
    }
  });
};

/**
 * Scrolls an element into view with smooth behavior
 */
export const scrollToMatch = (match: SearchMatch): void => {
  const highlightElement = match.element.querySelector(`[data-search-match="${match.id}"]`);
  if (highlightElement) {
    highlightElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  } else {
    // Fallback: scroll to the element itself
    match.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });
  }
};

/**
 * Updates the current match highlighting
 */
export const updateCurrentMatch = (
  element: HTMLElement,
  matches: SearchMatch[],
  currentMatchIndex: number
): void => {
  // Remove current highlighting from all matches
  const allHighlights = element.querySelectorAll('.search-highlight-current');
  allHighlights.forEach(highlight => {
    highlight.classList.remove('search-highlight-current');
  });

  // Add current highlighting to the active match
  if (currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
    const currentMatch = matches[currentMatchIndex];
    const currentHighlight = element.querySelector(`[data-search-match="${currentMatch.id}"]`);
    if (currentHighlight) {
      currentHighlight.classList.add('search-highlight-current');
    }
  }
};
