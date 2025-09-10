"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSimulationStore } from "@/stores/simulationStore";
import { 
  Send, 
  Loader2, 
  Settings,
  Hash,
  AtSign,
  Slash,
  Zap,
  Code2,
  Brain,
  Eye,
  GitBranch,
  Terminal,
  FileText,
  Cpu,
  ChevronDown,
  Sparkles
} from "lucide-react";
import { cn } from "~~/lib/utils";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type?: 'command' | 'context' | 'analysis' | 'suggestion';
  metadata?: {
    command?: string;
    context?: string[];
    nodes?: string[];
  };
}

interface Command {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'action' | 'context' | 'analysis';
}

interface IntegratedAIAssistantProps {
  className?: string;
  isEditMode?: boolean;
  scenarioContent?: string;
  onScenarioUpdate?: (newScenario: string) => void;
}

const SIMULATION_COMMANDS: Command[] = [
  { key: '/analyze', label: 'analyze', description: 'Analyze scenario structure', icon: <Brain className="h-4 w-4" />, category: 'analysis' },
  { key: '/debug', label: 'debug', description: 'Debug current errors', icon: <Terminal className="h-4 w-4" />, category: 'action' },
  { key: '/optimize', label: 'optimize', description: 'Suggest optimizations', icon: <Zap className="h-4 w-4" />, category: 'action' },
  { key: '/explain', label: 'explain', description: 'Explain simulation behavior', icon: <FileText className="h-4 w-4" />, category: 'analysis' },
];

const EDIT_COMMANDS: Command[] = [
  { key: '/validate', label: 'validate', description: 'Validate JSON structure', icon: <Brain className="h-4 w-4" />, category: 'analysis' },
  { key: '/add-node', label: 'add-node', description: 'Add new node to scenario', icon: <Sparkles className="h-4 w-4" />, category: 'action' },
  { key: '/fix-json', label: 'fix-json', description: 'Fix JSON syntax errors', icon: <Terminal className="h-4 w-4" />, category: 'action' },
  { key: '/generate', label: 'generate', description: 'Generate JSON snippets', icon: <Code2 className="h-4 w-4" />, category: 'action' },
  { key: '/refactor', label: 'refactor', description: 'Refactor JSON structure', icon: <GitBranch className="h-4 w-4" />, category: 'action' },
];

const SIMULATION_CONTEXTS = [
  { key: '@scenario', label: 'scenario', description: 'Current scenario data' },
  { key: '@errors', label: 'errors', description: 'Current error messages' },
  { key: '@ledger', label: 'ledger', description: 'Global ledger with all tokens' },
  { key: '@state', label: 'state', description: 'Simulation state' },
  { key: '@t', label: 't', description: 'Reference specific time (e.g., @t5s, @t10s)' },
];

const EDIT_CONTEXTS = [
  { key: '@json', label: 'json', description: 'Current JSON structure' },
  { key: '@schema', label: 'schema', description: 'JSON schema validation' },
  { key: '@nodes', label: 'nodes', description: 'Node definitions' },
  { key: '@connections', label: 'connections', description: 'Node connections' },
  { key: '@variables', label: 'variables', description: 'Scenario variables' },
];

// Helper function to extract nodes from scenario content
const extractNodesFromScenario = (scenarioContent?: string) => {
  if (!scenarioContent) return [];
  
  try {
    const scenario = JSON.parse(scenarioContent);
    const nodes: Array<{ key: string; label: string; description: string }> = [];
    
    // Extract nodes from different possible structures
    if (scenario.nodes && Array.isArray(scenario.nodes)) {
      scenario.nodes.forEach((node: any) => {
        // Handle various node ID and name patterns
        const nodeId = node.nodeId || node.id || node.name;
        const displayName = node.displayName || node.data?.label || node.label || node.name || nodeId;
        
        if (nodeId || displayName) {
          // Use displayName for the @ reference (like "Source A", "Queue B")
          const referenceKey = displayName || nodeId;
          nodes.push({
            key: `@${referenceKey}`,
            label: referenceKey,
            description: `${node.type || 'Node'}: ${displayName}${nodeId !== displayName ? ` (${nodeId})` : ''}`
          });
        }
      });
    }
    
    // Extract sources with human-readable names
    if (scenario.sources && Array.isArray(scenario.sources)) {
      scenario.sources.forEach((source: any) => {
        if (source.id || source.name) {
          const sourceId = source.id || source.name;
          const sourceName = source.name || source.label || sourceId;
          nodes.push({
            key: `@${sourceName}`,
            label: sourceName,
            description: `Source: ${sourceName}${source.type ? ` (${source.type})` : ''}`
          });
        }
      });
    }
    
    // Extract tokens from ledger if available
    if (scenario.ledger && Array.isArray(scenario.ledger)) {
      scenario.ledger.forEach((token: any) => {
        if (token.id || token.name) {
          const tokenId = token.id || token.name;
          const tokenName = token.name || token.label || tokenId;
          nodes.push({
            key: `@${tokenName}`,
            label: tokenName,
            description: `Token: ${tokenName}${token.type ? ` (${token.type})` : ''}`
          });
        }
      });
    }
    
    // Extract any other named entities
    Object.keys(scenario).forEach(key => {
      if (key !== 'nodes' && key !== 'sources' && key !== 'ledger' && typeof scenario[key] === 'object' && Array.isArray(scenario[key])) {
        scenario[key].forEach((item: any) => {
          if (item.id || item.name) {
            const itemId = item.id || item.name;
            const itemName = item.name || item.label || itemId;
            if (!nodes.find(n => n.label === itemName)) {
              nodes.push({
                key: `@${itemName}`,
                label: itemName,
                description: `${key}: ${itemName}`
              });
            }
          }
        });
      }
    });
    
    return nodes.sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.warn('Error parsing scenario for node extraction:', error);
    return [];
  }
};

const TAGS = [
  { key: '#performance', label: 'performance', description: 'Performance analysis' },
  { key: '#security', label: 'security', description: 'Security considerations' },
  { key: '#architecture', label: 'architecture', description: 'Architecture review' },
  { key: '#testing', label: 'testing', description: 'Testing strategies' },
  { key: '#documentation', label: 'documentation', description: 'Documentation needs' },
];

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  return (
    <div className={cn(
      "flex gap-2 max-w-full mb-3",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold shadow-sm",
        isUser 
          ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white" 
          : isSystem 
            ? "bg-slate-100 text-slate-600 border border-slate-200"
            : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
      )}>
        {isUser ? "U" : isSystem ? "S" : "AI"}
      </div>
      
      <div className={cn(
        "flex flex-col gap-1 max-w-[85%]",
        isUser ? "items-end" : "items-start"
      )}>
        {message.metadata?.command && (
          <Badge className="text-[10px] mb-1 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
            <Terminal className="h-2 w-2 mr-1" />
            /{message.metadata.command}
          </Badge>
        )}
        
        <div className={cn(
          "px-3 py-2 rounded-lg text-xs leading-relaxed shadow-sm",
          isUser 
            ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white" 
            : isSystem
              ? "bg-slate-50 text-slate-700 border border-slate-200"
              : "bg-white text-slate-800 border border-slate-200"
        )}>
          <div className="whitespace-pre-wrap break-words text-xs font-mono">
            {message.content}
          </div>
        </div>
        
        <span className="text-[10px] text-slate-400 px-2 font-mono">
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })}
        </span>
      </div>
    </div>
  );
};

const CommandSuggestions = ({ 
  input, 
  onSelect,
  isEditMode = false,
  scenarioContent,
  onSuggestionsChange
}: { 
  input: string; 
  onSelect: (suggestion: string) => void;
  isEditMode?: boolean;
  scenarioContent?: string;
  onSuggestionsChange?: (hassuggestions: boolean, suggestions?: any[]) => void;
}) => {
  const suggestions = useMemo(() => {
    const lastWord = input.split(' ').pop() || '';
    const commands = isEditMode ? EDIT_COMMANDS : SIMULATION_COMMANDS;
    const baseContexts = isEditMode ? EDIT_CONTEXTS : SIMULATION_CONTEXTS;
    
    // Extract dynamic nodes from scenario
    const dynamicNodes = extractNodesFromScenario(scenarioContent);
    
    // Generate time suggestions if typing @t
    const timeSuggestions = [];
    if (lastWord.startsWith('@t') && !isEditMode) {
      for (let i = 1; i <= 20; i++) {
        const timeKey = `@t${i}s`;
        if (timeKey.toLowerCase().includes(lastWord.toLowerCase())) {
          timeSuggestions.push({
            key: timeKey,
            label: `t${i}s`,
            description: `Time: ${i} second${i > 1 ? 's' : ''} into simulation`
          });
        }
      }
      // Add some common time formats
      ['@t30s', '@t60s', '@t120s'].forEach(timeKey => {
        if (timeKey.toLowerCase().includes(lastWord.toLowerCase())) {
          const seconds = parseInt(timeKey.slice(2, -1));
          timeSuggestions.push({
            key: timeKey,
            label: timeKey.slice(1),
            description: `Time: ${seconds} seconds into simulation`
          });
        }
      });
    }
    
    const allContexts = [...baseContexts, ...dynamicNodes, ...timeSuggestions];
    
    if (lastWord.startsWith('/')) {
      return commands.filter(cmd => 
        cmd.key.toLowerCase().includes(lastWord.toLowerCase())
      ).slice(0, 8);
    }
    
    if (lastWord.startsWith('@')) {
      return allContexts.filter(ctx => 
        ctx.key.toLowerCase().includes(lastWord.toLowerCase())
      ).slice(0, 12);
    }
    
    if (lastWord.startsWith('#')) {
      return TAGS.filter(tag => 
        tag.key.toLowerCase().includes(lastWord.toLowerCase())
      ).slice(0, 5);
    }
    
    return [];
  }, [input, isEditMode, scenarioContent]);

  // Notify parent about suggestions state
  React.useEffect(() => {
    onSuggestionsChange?.(suggestions.length > 0, suggestions);
  }, [suggestions, onSuggestionsChange]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl mb-2 z-50">
      <div className="p-3 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-slate-600" />
          <span className="text-xs font-semibold text-slate-700 font-mono">Smart Suggestions</span>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {suggestions.map((suggestion, index) => {
          const isDynamicNode = suggestion.key.startsWith('@') && !suggestion.key.match(/^@(json|schema|nodes|connections|variables|scenario|errors|state|ledger|t)$/);
          const isTimeReference = suggestion.key.match(/^@t\d+s$/);
          
          return (
            <button
              key={`${suggestion.key}-${index}`}
              onClick={() => {
                const parts = input.split(' ');
                parts[parts.length - 1] = suggestion.key + ' ';
                onSelect(parts.join(' '));
              }}
              className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 text-sm border-b border-slate-50 last:border-b-0 transition-colors"
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold",
                isDynamicNode 
                  ? "bg-emerald-100 text-emerald-700" 
                  : isTimeReference
                    ? "bg-blue-100 text-blue-700"
                    : ('icon' in suggestion)
                      ? "bg-slate-100 text-slate-600"
                      : "bg-slate-100 text-slate-600"
              )}>
                {isDynamicNode ? (
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                ) : isTimeReference ? (
                  <div className="text-xs font-mono font-bold">T</div>
                ) : (
                  ('icon' in suggestion) && suggestion.icon
                )}
              </div>
              <div className="flex-1">
                <div className="font-mono font-semibold text-slate-800">{suggestion.key}</div>
                <div className="text-xs text-slate-500 font-mono">{suggestion.description}</div>
              </div>
              {isDynamicNode && (
                <div className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                  Live
                </div>
              )}
              {isTimeReference && (
                <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                  Time
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default function IntegratedAIAssistant({ className, isEditMode = false, scenarioContent, onScenarioUpdate }: IntegratedAIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: isEditMode 
        ? 'Template Editor\n\nI can help with:\n- JSON structure validation\n- Adding and modifying nodes\n- Connecting data flows\n- Schema compliance\n\nUse / for commands, @ to reference nodes, # for tags'
        : 'Simulation Analysis\n\nI can help with:\n- Node behavior analysis\n- Debugging data flows\n- Performance optimization\n- Token tracking in ledger\n\nUse / for commands, @ to reference nodes, # for tags',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [currentSuggestions, setCurrentSuggestions] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get scenario context from simulation store
  const scenario = useSimulationStore(state => state.scenario);
  const currentTime = useSimulationStore(state => state.currentTime);
  const errorMessages = useSimulationStore(state => state.errorMessages);
  const isRunning = useSimulationStore(state => state.isRunning);

  // Removed auto-scroll - it was hiding the top of the page

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Parse command/context from input
    const commandMatch = inputValue.match(/\/(\w+)/);
    const contextMatch = inputValue.match(/@([\w-]+)/g);
    const tagMatch = inputValue.match(/#(\w+)/g);
    
    // Extract referenced nodes from scenario
    const dynamicNodes = extractNodesFromScenario(scenarioContent);
    const referencedNodes = contextMatch?.filter(match => 
      dynamicNodes.some(node => node.key === match)
    ) || [];
    
    // Extract time references
    const timeReferences = contextMatch?.filter(match => 
      match.match(/^@t\d+s$/)
    ) || [];

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      type: commandMatch ? 'command' : 'analysis',
      metadata: {
        command: commandMatch?.[1],
        context: contextMatch,
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the actual Gemini API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          scenarioContext: {
            scenario: scenarioContent ? JSON.parse(scenarioContent) : null,
            currentTime: currentTime || 0,
            errors: errorMessages || [],
            isRunning: isRunning || false
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      let responseContent = data.message;

      // Check if the user is asking to add/modify nodes and handle scenario updates
      const lowerInput = inputValue.toLowerCase();
      if ((lowerInput.includes('add') || lowerInput.includes('create') || lowerInput.includes('new')) && lowerInput.includes('source')) {
        // Parse user specifications for automatic scenario updates
        const rangeMatch = inputValue.match(/range\s+(\d+)-(\d+)/i) || 
                         inputValue.match(/(\d+)-(\d+)/) || 
                         inputValue.match(/range\s+up\s+to\s+(\d+)/i) ||
                         inputValue.match(/up\s+to\s+(\d+)/i);
        const intervalMatch = inputValue.match(/(\d+)\s*sec/i) || inputValue.match(/every\s+(\d+)/i);
        const connectMatch = inputValue.match(/@([A-Za-z0-9\s]+?)(?:\s+and|\s+range|\s+every|$)/);
        const nameMatch = inputValue.match(/call\s+it\s+([A-Za-z0-9\s]+?)(?:\s+and|\s+range|\s+every|$)/i) || 
                         inputValue.match(/name\s+it\s+([A-Za-z0-9\s]+?)(?:\s+and|\s+range|\s+every|$)/i);
        
        console.log(`DEBUG: Connect match result:`, connectMatch);
        if (connectMatch) {
          console.log(`DEBUG: Target name extracted: "${connectMatch[1]}"`);
        }
        console.log(`DEBUG: Name match result:`, nameMatch);
        if (nameMatch) {
          console.log(`DEBUG: Custom name extracted: "${nameMatch[1]}"`);
        }
        
        let minVal = 1;
        let maxVal = 10;
        
        if (rangeMatch) {
          if (rangeMatch[2]) {
            // Format: "1-20" or "range 1-20"
            minVal = parseInt(rangeMatch[1]);
            maxVal = parseInt(rangeMatch[2]);
          } else {
            // Format: "up to 20" or "range up to 20"
            minVal = 1;
            maxVal = parseInt(rangeMatch[1]);
          }
        }
        const interval = intervalMatch ? parseInt(intervalMatch[1]) : 3;
        
        // Find the actual destination node ID by matching display name
        let destination = 'Queue_B';
        let destinationDisplayName = 'Queue B';
        if (connectMatch && scenarioContent) {
          try {
            const scenario = JSON.parse(scenarioContent);
            const targetName = connectMatch[1];
            
            // Try multiple matching strategies
            const targetNode = scenario.nodes.find((node: any) => {
              const normalizedTarget = targetName.toLowerCase().trim();
              const normalizedDisplayName = node.displayName.toLowerCase();
              const normalizedNodeId = node.nodeId.toLowerCase();
              
              // Exact match with displayName
              if (normalizedDisplayName === normalizedTarget) return true;
              // Exact match with nodeId  
              if (normalizedNodeId === normalizedTarget) return true;
              // NodeId with underscore replaced by space matches target (Queue_D matches "queue d")
              if (normalizedNodeId.replace('_', ' ') === normalizedTarget) return true;
              // Target with space replaced by underscore matches nodeId ("queue d" becomes "queue_d")
              if (normalizedTarget.replace(' ', '_') === normalizedNodeId) return true;
              // Partial match - displayName contains the target
              if (normalizedDisplayName.includes(normalizedTarget)) return true;
              // Check if target matches the main part of display name (e.g., "Queue D" matches "Output Queue D")
              const displayWords = normalizedDisplayName.split(' ');
              const targetWords = normalizedTarget.split(' ');
              if (targetWords.every(word => displayWords.includes(word))) return true;
              
              // Special case: "output queue d" should match exactly
              if (normalizedTarget.includes('output') && normalizedDisplayName.includes('output')) return true;
              
              return false;
            });
            
            if (targetNode) {
              destination = targetNode.nodeId;
              destinationDisplayName = targetNode.displayName;
              console.log(`DEBUG: Found target node - ID: ${destination}, Display: ${destinationDisplayName}`);
            } else {
              console.log(`DEBUG: No target node found for: "${targetName}"`);
              console.log('Available nodes:', scenario.nodes.map(n => `${n.nodeId} (${n.displayName})`));
            }
          } catch (e) {
            // Fallback to default
          }
        }
        
        // Try to automatically add the source
        if (scenarioContent && onScenarioUpdate) {
          try {
            const scenario = JSON.parse(scenarioContent);
            const newNodeId = `DataSource_${Date.now()}`;
            
            // Use custom name if provided, otherwise generate one
            let displayName = `Source ${String.fromCharCode(65 + scenario.nodes.length)}`;
            if (nameMatch) {
              displayName = nameMatch[1].trim();
            }
            
            const newNode = {
              nodeId: newNodeId,
              type: "DataSource",
              displayName: displayName,
              position: {
                x: 50,
                y: 100 + (scenario.nodes.length * 100)
              },
              interval: interval,
              valueMin: minVal,
              valueMax: maxVal,
              destinationNodeId: destination
            };
            
            scenario.nodes.push(newNode);
            const updatedScenario = JSON.stringify(scenario, null, 2);
            onScenarioUpdate(updatedScenario);
            
            responseContent = `SOURCE ADDED SUCCESSFULLY\n\nAdded new source: ${displayName}\n- Range: ${minVal}-${maxVal}\n- Interval: ${interval}s\n- Connected to: ${destinationDisplayName} (${destination})\n\nScenario updated automatically!`;
          } catch (error) {
            responseContent = `ERROR ADDING SOURCE\n\nFailed to parse or update scenario JSON.\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
          }
        }
      }


      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        type: commandMatch ? 'analysis' : 'suggestion',
        metadata: {
          command: commandMatch?.[1],
        }
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // If suggestions are open, accept the first one
      if (hasSuggestions && currentSuggestions.length > 0) {
        const firstSuggestion = currentSuggestions[0];
        const parts = inputValue.split(' ');
        parts[parts.length - 1] = firstSuggestion.key + ' ';
        setInputValue(parts.join(' '));
        textareaRef.current?.focus();
        return;
      }
      
      // Otherwise send the message
      handleSendMessage();
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-slate-50",
      className
    )}>
      {/* Messages */}
      <ScrollArea className="flex-1 px-3 py-2">
        <div className="space-y-1">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                <div className="w-4 h-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded flex items-center justify-center">
                  <Loader2 className="h-2 w-2 animate-spin text-white" />
                </div>
                <span className="text-indigo-700 font-medium">Analyzing...</span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Enhanced Input Area */}
      <div className="p-3 bg-white border-t border-slate-200 relative">
        <CommandSuggestions
          input={inputValue}
          onSelect={(suggestion) => {
            setInputValue(suggestion);
            textareaRef.current?.focus();
          }}
          isEditMode={isEditMode}
          scenarioContent={scenarioContent}
          onSuggestionsChange={(hasSuggestions, suggestions) => {
            setHasSuggestions(hasSuggestions);
            setCurrentSuggestions(suggestions || []);
          }}
        />
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Ask me about your scenario..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] max-h-[80px] resize-none text-xs font-mono bg-slate-50 border-slate-200 focus:border-indigo-300 focus:ring-indigo-200 rounded"
              disabled={isLoading}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-slate-400">
              <Hash className="h-2 w-2" />
              <AtSign className="h-2 w-2" />
              <Slash className="h-2 w-2" />
            </div>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="self-end h-[60px] bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
        
        <div className="text-[10px] text-slate-500 mt-2 flex items-center justify-between">
          <div>
            <kbd className="px-1 py-0.5 bg-slate-200 rounded text-slate-600">Enter</kbd> to send
          </div>
          <span className="text-[10px] text-slate-500">Gemini Pro</span>
        </div>
      </div>
    </div>
  );
}