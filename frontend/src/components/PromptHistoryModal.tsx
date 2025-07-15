import { useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { API } from '../utils/api';
import { X } from 'lucide-react';

interface PromptHistoryItem {
  id: string;
  prompt: string;
  sessionName: string;
  sessionId: string;
  createdAt: string;
  status: string;
}

interface PromptHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PromptHistoryModal({ isOpen, onClose }: PromptHistoryModalProps) {
  const [prompts, setPrompts] = useState<PromptHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const createSession = useSessionStore((state) => state.createSession);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const sessions = useSessionStore((state) => state.sessions);

  useEffect(() => {
    if (isOpen) {
      fetchPromptHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const fetchPromptHistory = async () => {
    try {
      setLoading(true);
      const response = await API.prompts.getAll();
      if (response.success) {
        setPrompts(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch prompt history');
      }
    } catch (error) {
      console.error('Error fetching prompt history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrompts = prompts.filter(prompt =>
    prompt.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.sessionName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleReusePrompt = async (prompt: PromptHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Generate a default worktree name based on the prompt
      const worktreeTemplate = prompt.sessionName.replace(/[-]\d+$/, '') || 'session';
      
      await createSession({
        prompt: prompt.prompt,
        worktreeTemplate,
        count: 1
      });
      
      // Close the modal after creating the session
      onClose();
    } catch (error) {
      console.error('Error reusing prompt:', error);
    }
  };

  const handlePromptClick = async (promptItem: PromptHistoryItem) => {
    // Check if the session still exists
    const sessionExists = sessions.some(s => s.id === promptItem.sessionId);
    
    if (sessionExists) {
      // Set the selected prompt
      setSelectedPromptId(promptItem.id);
      
      // Switch to the session
      setActiveSession(promptItem.sessionId);
      
      // Get the prompt marker information
      try {
        const response = await API.prompts.getByPromptId(promptItem.id);
        if (response.success && response.data) {
          // Dispatch an event that SessionView can listen for
          window.dispatchEvent(new CustomEvent('navigateToPrompt', {
            detail: {
              sessionId: promptItem.sessionId,
              promptMarker: response.data
            }
          }));
        }
      } catch (error) {
        console.error('Error getting prompt details:', error);
      }
      
      // Close the modal after navigation
      onClose();
    } else {
      // Session no longer exists, show a message or handle appropriately
      console.warn('Session no longer exists:', promptItem.sessionId);
    }
  };

  const handleCopyPrompt = (prompt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'stopped':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      case 'error':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
      case 'running':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
      case 'waiting':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700';
    }
  };

  const truncatePrompt = (prompt: string, maxLength: number = 100) => {
    return prompt.length > maxLength ? prompt.substring(0, maxLength) + '...' : prompt;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prompt History</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search prompts or session names..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-gray-600 dark:text-gray-400">Loading prompt history...</div>
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-gray-600 dark:text-gray-400">
                <div className="text-lg mb-2">
                  {searchTerm ? 'No prompts found' : 'No prompt history yet'}
                </div>
                <div className="text-sm">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'Create a session to start building your prompt history'
                  }
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPrompts.map((promptItem) => (
                <div
                  key={promptItem.id}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    selectedPromptId === promptItem.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                  }`}
                  onClick={() => handlePromptClick(promptItem)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                          {promptItem.sessionName}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(promptItem.status)}`}>
                          {promptItem.status}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                        {truncatePrompt(promptItem.prompt, 200)}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>
                          Created {new Date(promptItem.createdAt).toLocaleDateString()} at{' '}
                          {new Date(promptItem.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={(e) => handleReusePrompt(promptItem, e)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Reuse
                      </button>
                      <button
                        onClick={(e) => handleCopyPrompt(promptItem.prompt, e)}
                        className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  
                  {promptItem.prompt.length > 200 && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-sm hover:text-blue-700 dark:hover:text-blue-300">
                        Show full prompt
                      </summary>
                      <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {promptItem.prompt}
                      </p>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}