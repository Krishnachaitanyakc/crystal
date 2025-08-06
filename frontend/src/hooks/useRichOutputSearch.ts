import React, { useCallback, useRef, useEffect } from 'react';
import { useSearch, SearchMatch } from './useSearch';
import { findTextMatches, highlightMatches, removeHighlights, scrollToMatch, updateCurrentMatch } from '../utils/searchUtils';

export const useRichOutputSearch = (containerRef: React.RefObject<HTMLElement>) => {
  const allMatchesRef = useRef<SearchMatch[]>([]);
  const currentContainerRef = useRef<HTMLElement | null>(null);

  const searchOptions = {
    onSearch: useCallback((query: string, options: { caseSensitive: boolean; wholeWord: boolean }) => {
      const container = containerRef.current;
      if (!container) return [];

      // Clear previous highlights
      if (currentContainerRef.current) {
        removeHighlights(currentContainerRef.current);
      }
      currentContainerRef.current = container;

      // Find all searchable elements within the container
      const searchableElements = container.querySelectorAll([
        '[data-message-content]', // Message content
        '[data-tool-content]',    // Tool call content
        '[data-thinking-content]', // Thinking content
        '.rich-output-markdown',   // Markdown content
        '.text-text-primary',      // General text content
        '.whitespace-pre-wrap',    // Pre-formatted text
      ].join(', '));

      const allMatches: SearchMatch[] = [];

      searchableElements.forEach((element: Element, index: number) => {
        const htmlElement = element as HTMLElement;
        const elementId = `search-element-${index}`;
        const matches = findTextMatches(htmlElement, query, options, elementId);
        allMatches.push(...matches);
      });

      // Store matches for highlighting
      allMatchesRef.current = allMatches;

      // Highlight all matches
      allMatches.forEach((match, index) => {
        const elementMatches = allMatches.filter(m => m.element === match.element);
        highlightMatches(match.element, elementMatches, index === 0 ? 0 : undefined);
      });

      return allMatches;
    }, [containerRef]),

    onNavigate: useCallback((match: SearchMatch | null, direction: 'next' | 'prev') => {
      if (!match || !containerRef.current) return;

      // Update current match highlighting
      const matchIndex = allMatchesRef.current.findIndex(m => m.id === match.id);
      if (matchIndex >= 0) {
        // Update highlighting for all elements
        const processedElements = new Set<HTMLElement>();
        allMatchesRef.current.forEach((m) => {
          if (!processedElements.has(m.element)) {
            const elementMatches = allMatchesRef.current.filter(em => em.element === m.element);
            const currentElementMatchIndex = elementMatches.findIndex(em => em.id === match.id);
            updateCurrentMatch(m.element, elementMatches, currentElementMatchIndex);
            processedElements.add(m.element);
          }
        });

        // Scroll to the match
        scrollToMatch(match);
      }
    }, [containerRef]),

    onClose: useCallback(() => {
      // Clear all highlights when search is closed
      if (currentContainerRef.current) {
        removeHighlights(currentContainerRef.current);
        currentContainerRef.current = null;
      }
      allMatchesRef.current = [];
    }, []),
  };

  const search = useSearch(searchOptions);

  // Clean up highlights when component unmounts
  useEffect(() => {
    return () => {
      if (currentContainerRef.current) {
        removeHighlights(currentContainerRef.current);
      }
    };
  }, []);

  return search;
};
