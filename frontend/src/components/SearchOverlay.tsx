import React from 'react';
import { Search, X, ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import { cn } from '../utils/cn';

interface SearchOverlayProps {
  isOpen: boolean;
  query: string;
  currentMatch: number;
  totalMatches: number;
  caseSensitive: boolean;
  wholeWord: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onToggleCaseSensitive: () => void;
  onToggleWholeWord: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  query,
  currentMatch,
  totalMatches,
  caseSensitive,
  wholeWord,
  searchInputRef,
  onQueryChange,
  onClose,
  onNavigateNext,
  onNavigatePrev,
  onToggleCaseSensitive,
  onToggleWholeWord,
}) => {
  if (!isOpen) return null;

  const hasMatches = totalMatches > 0;
  const showMatchCounter = query.trim() !== '';

  return (
    <div className="fixed top-4 right-4 z-50 bg-surface-primary border border-border-primary rounded-lg shadow-lg min-w-80">
      <div className="flex items-center p-3">
        {/* Search Icon */}
        <Search className="w-4 h-4 text-text-tertiary mr-2 flex-shrink-0" />

        {/* Search Input */}
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search..."
          className={cn(
            "flex-1 bg-transparent text-text-primary placeholder-text-tertiary",
            "border-none outline-none text-sm",
            !hasMatches && query.trim() !== '' && "text-status-error"
          )}
        />

        {/* Match Counter */}
        {showMatchCounter && (
          <div className="flex items-center text-xs text-text-secondary mr-2 flex-shrink-0">
            {hasMatches ? (
              <span>{currentMatch} of {totalMatches}</span>
            ) : (
              <span className="text-status-error">No matches</span>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={onNavigatePrev}
            disabled={!hasMatches}
            className={cn(
              "p-1 rounded transition-colors",
              hasMatches
                ? "hover:bg-surface-hover text-text-secondary hover:text-text-primary"
                : "text-text-tertiary cursor-not-allowed"
            )}
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={onNavigateNext}
            disabled={!hasMatches}
            className={cn(
              "p-1 rounded transition-colors",
              hasMatches
                ? "hover:bg-surface-hover text-text-secondary hover:text-text-primary"
                : "text-text-tertiary cursor-not-allowed"
            )}
            title="Next match (Enter)"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Options Button */}
        <div className="relative group">
          <button
            className="p-1 rounded transition-colors hover:bg-surface-hover text-text-secondary hover:text-text-primary"
            title="Search options"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>

          {/* Options Dropdown */}
          <div className="absolute right-0 top-full mt-1 bg-surface-primary border border-border-primary rounded-md shadow-lg py-1 min-w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            <button
              onClick={onToggleCaseSensitive}
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover transition-colors flex items-center justify-between",
                caseSensitive ? "text-text-primary" : "text-text-secondary"
              )}
            >
              <span>Match Case</span>
              {caseSensitive && (
                <div className="w-1.5 h-1.5 bg-interactive rounded-full" />
              )}
            </button>
            <button
              onClick={onToggleWholeWord}
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs hover:bg-surface-hover transition-colors flex items-center justify-between",
                wholeWord ? "text-text-primary" : "text-text-secondary"
              )}
            >
              <span>Whole Word</span>
              {wholeWord && (
                <div className="w-1.5 h-1.5 bg-interactive rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-1 rounded transition-colors hover:bg-surface-hover text-text-secondary hover:text-text-primary ml-1"
          title="Close search (Escape)"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
