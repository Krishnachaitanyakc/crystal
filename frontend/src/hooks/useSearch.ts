import React, { useState, useCallback, useEffect, useRef } from 'react';

export interface SearchState {
  isOpen: boolean;
  query: string;
  currentMatch: number;
  totalMatches: number;
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface SearchMatch {
  id: string;
  element: HTMLElement;
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface UseSearchOptions {
  onSearch?: (query: string, options: { caseSensitive: boolean; wholeWord: boolean }) => SearchMatch[];
  onNavigate?: (match: SearchMatch | null, direction: 'next' | 'prev') => void;
  onClose?: () => void;
}

export const useSearch = (options: UseSearchOptions = {}) => {
  const [searchState, setSearchState] = useState<SearchState>({
    isOpen: false,
    query: '',
    currentMatch: 0,
    totalMatches: 0,
    caseSensitive: false,
    wholeWord: false,
  });

  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const openSearch = useCallback(() => {
    setSearchState((prev: SearchState) => ({ ...prev, isOpen: true }));
    // Focus the search input after a brief delay to ensure it's rendered
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchState((prev: SearchState) => ({
      ...prev,
      isOpen: false,
      query: '',
      currentMatch: 0,
      totalMatches: 0,
    }));
    setMatches([]);
    options.onClose?.();
  }, [options]);

  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setMatches([]);
      setSearchState((prev: SearchState) => ({
        ...prev,
        query,
        currentMatch: 0,
        totalMatches: 0,
      }));
      return;
    }

    const searchMatches = options.onSearch?.(query, {
      caseSensitive: searchState.caseSensitive,
      wholeWord: searchState.wholeWord,
    }) || [];

    setMatches(searchMatches);
    setSearchState((prev: SearchState) => ({
      ...prev,
      query,
      currentMatch: searchMatches.length > 0 ? 1 : 0,
      totalMatches: searchMatches.length,
    }));

    // Navigate to first match if available
    if (searchMatches.length > 0) {
      options.onNavigate?.(searchMatches[0], 'next');
    }
  }, [searchState.caseSensitive, searchState.wholeWord, options]);

  const navigateToMatch = useCallback((direction: 'next' | 'prev') => {
    if (matches.length === 0) return;

    let newIndex: number;
    if (direction === 'next') {
      newIndex = searchState.currentMatch >= matches.length ? 1 : searchState.currentMatch + 1;
    } else {
      newIndex = searchState.currentMatch <= 1 ? matches.length : searchState.currentMatch - 1;
    }

    setSearchState((prev: SearchState) => ({ ...prev, currentMatch: newIndex }));

    const match = matches[newIndex - 1];
    if (match) {
      options.onNavigate?.(match, direction);
    }
  }, [matches, searchState.currentMatch, options]);

  const setQuery = useCallback((query: string) => {
    performSearch(query);
  }, [performSearch]);

  const toggleCaseSensitive = useCallback(() => {
    setSearchState((prev: SearchState) => {
      const newState = { ...prev, caseSensitive: !prev.caseSensitive };
      // Re-perform search with new options
      if (prev.query) {
        setTimeout(() => performSearch(prev.query), 0);
      }
      return newState;
    });
  }, [performSearch]);

  const toggleWholeWord = useCallback(() => {
    setSearchState((prev: SearchState) => {
      const newState = { ...prev, wholeWord: !prev.wholeWord };
      // Re-perform search with new options
      if (prev.query) {
        setTimeout(() => performSearch(prev.query), 0);
      }
      return newState;
    });
  }, [performSearch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Open search with Cmd+F (Mac) or Ctrl+F (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        openSearch();
        return;
      }

      // Only handle other shortcuts when search is open
      if (!searchState.isOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          closeSearch();
          break;
        case 'Enter':
          event.preventDefault();
          if (event.shiftKey) {
            navigateToMatch('prev');
          } else {
            navigateToMatch('next');
          }
          break;
        case 'F3':
          event.preventDefault();
          if (event.shiftKey) {
            navigateToMatch('prev');
          } else {
            navigateToMatch('next');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchState.isOpen, openSearch, closeSearch, navigateToMatch]);

  return {
    searchState,
    matches,
    searchInputRef,
    openSearch,
    closeSearch,
    setQuery,
    navigateToMatch,
    toggleCaseSensitive,
    toggleWholeWord,
  };
};
