import React, { useCallback, useRef, useEffect } from 'react';
import { useSearch, SearchMatch } from './useSearch';
import { SearchAddon } from '@xterm/addon-search';
import { Terminal } from '@xterm/xterm';

export const useTerminalSearch = (terminalRef: React.RefObject<Terminal | null>) => {
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const currentTerminalRef = useRef<Terminal | null>(null);

  // Initialize search addon when terminal is available
  useEffect(() => {
    const terminal = terminalRef.current;
    if (terminal && terminal !== currentTerminalRef.current) {
      // Clean up previous addon
      if (searchAddonRef.current && currentTerminalRef.current) {
        try {
          currentTerminalRef.current.dispose();
        } catch (e) {
          // Ignore disposal errors
        }
      }

      // Create new search addon
      searchAddonRef.current = new SearchAddon();
      terminal.loadAddon(searchAddonRef.current);
      currentTerminalRef.current = terminal;
    }
  }, [terminalRef]);

  const searchOptions = {
    onSearch: useCallback((query: string, options: { caseSensitive: boolean; wholeWord: boolean }) => {
      const terminal = terminalRef.current;
      const searchAddon = searchAddonRef.current;

      if (!terminal || !searchAddon || !query.trim()) {
        return [];
      }

      try {
        // Clear previous search
        searchAddon.clearDecorations();

        // Perform search with xterm search addon
        const found = searchAddon.findNext(query, {
          caseSensitive: options.caseSensitive,
          wholeWord: options.wholeWord,
          regex: false, // We handle regex escaping in our search utils
        });

        if (found) {
          // Create a mock SearchMatch for compatibility with our search interface
          // Note: xterm search addon doesn't provide detailed match information
          // so we create a simplified match object
          const matches: SearchMatch[] = [{
            id: 'terminal-match-0',
            element: terminal.element as HTMLElement,
            text: query,
            startIndex: 0,
            endIndex: query.length,
          }];

          return matches;
        }

        return [];
      } catch (error) {
        console.error('Terminal search error:', error);
        return [];
      }
    }, [terminalRef]),

    onNavigate: useCallback((match: SearchMatch | null, direction: 'next' | 'prev') => {
      const searchAddon = searchAddonRef.current;

      if (!searchAddon || !match) return;

      try {
        // Use xterm's built-in navigation
        if (direction === 'next') {
          searchAddon.findNext(match.text, {
            caseSensitive: false, // We'll handle this in the search options
            wholeWord: false,
            regex: false,
          });
        } else {
          searchAddon.findPrevious(match.text, {
            caseSensitive: false,
            wholeWord: false,
            regex: false,
          });
        }
      } catch (error) {
        console.error('Terminal navigation error:', error);
      }
    }, []),

    onClose: useCallback(() => {
      const searchAddon = searchAddonRef.current;
      if (searchAddon) {
        try {
          searchAddon.clearDecorations();
        } catch (error) {
          console.error('Error clearing terminal search decorations:', error);
        }
      }
    }, []),
  };

  const search = useSearch(searchOptions);

  // Enhanced search methods that work better with xterm
  const searchInTerminal = useCallback((query: string, direction: 'next' | 'prev' = 'next') => {
    const searchAddon = searchAddonRef.current;

    if (!searchAddon || !query.trim()) return false;

    try {
      const searchOptions = {
        caseSensitive: search.searchState.caseSensitive,
        wholeWord: search.searchState.wholeWord,
        regex: false,
      };

      const found = direction === 'next'
        ? searchAddon.findNext(query, searchOptions)
        : searchAddon.findPrevious(query, searchOptions);

      return found;
    } catch (error) {
      console.error('Terminal search error:', error);
      return false;
    }
  }, [search.searchState.caseSensitive, search.searchState.wholeWord]);

  const navigateInTerminal = useCallback((direction: 'next' | 'prev') => {
    if (!search.searchState.query.trim()) return;

    searchInTerminal(search.searchState.query, direction);
  }, [search.searchState.query, searchInTerminal]);

  // Override the default navigate function to use terminal-specific navigation
  const enhancedSearch = {
    ...search,
    navigateToMatch: navigateInTerminal,
    searchInTerminal,
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (searchAddonRef.current && currentTerminalRef.current) {
        try {
          searchAddonRef.current.clearDecorations();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return enhancedSearch;
};
