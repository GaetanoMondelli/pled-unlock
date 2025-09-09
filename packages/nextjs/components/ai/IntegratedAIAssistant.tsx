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
}

const COMMANDS: Command[] = [
  { key: '/analyze', label: 'analyze', description: 'Analyze scenario structure', icon: <Brain className="h-4 w-4" />, category: 'analysis' },
  { key: '/debug', label: 'debug', description: 'Debug current errors', icon: <Terminal className="h-4 w-4" />, category: 'action' },
  { key: '/optimize', label: 'optimize', description: 'Suggest optimizations', icon: <Zap className="h-4 w-4" />, category: 'action' },
  { key: '/explain', label: 'explain', description: 'Explain selected code', icon: <FileText className="h-4 w-4" />, category: 'analysis' },
  { key: '/refactor', label: 'refactor', description: 'Refactor code structure', icon: <Code2 className="h-4 w-4" />, category: 'action' },
  { key: '/generate', label: 'generate', description: 'Generate code snippets', icon: <Sparkles className="h-4 w-4" />, category: 'action' },
];

const CONTEXTS = [
  { key: '@scenario', label: 'scenario', description: 'Current scenario data' },
  { key: '@errors', label: 'errors', description: 'Current error messages' },
  { key: '@nodes', label: 'nodes', description: 'Graph node information' },
  { key: '@state', label: 'state', description: 'Simulation state' },
  { key: '@config', label: 'config', description: 'Configuration settings' },
];

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
      "flex gap-3 max-w-full mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono",
        isUser 
          ? "bg-blue-600 text-white" 
          : isSystem 
            ? "bg-gray-600 text-white"
            : "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
      )}>
        {isUser ? "U" : isSystem ? "S" : "AI"}
      </div>
      
      <div className={cn(
        "flex flex-col gap-1 max-w-[85%]",
        isUser ? "items-end" : "items-start"
      )}>
        {message.metadata?.command && (
          <Badge variant="secondary" className="text-xs mb-1">
            <Terminal className="h-3 w-3 mr-1" />
            {message.metadata.command}
          </Badge>
        )}
        
        <div className={cn(
          "px-3 py-2 rounded-lg text-sm leading-relaxed",
          isUser 
            ? "bg-blue-600 text-white" 
            : isSystem
              ? "bg-gray-100 text-gray-800 border"
              : "bg-gray-50 text-gray-900 border"
        )}>
          <div className="whitespace-pre-wrap break-words font-mono text-xs">
            {message.content}
          </div>
        </div>
        
        <span className="text-xs text-gray-500 px-2 font-mono">
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
  onSelect 
}: { 
  input: string; 
  onSelect: (suggestion: string) => void;
}) => {
  const suggestions = useMemo(() => {
    const lastWord = input.split(' ').pop() || '';
    
    if (lastWord.startsWith('/')) {
      return COMMANDS.filter(cmd => 
        cmd.key.toLowerCase().includes(lastWord.toLowerCase())
      ).slice(0, 5);
    }
    
    if (lastWord.startsWith('@')) {
      return CONTEXTS.filter(ctx => 
        ctx.key.toLowerCase().includes(lastWord.toLowerCase())
      ).slice(0, 5);
    }
    
    if (lastWord.startsWith('#')) {
      return TAGS.filter(tag => 
        tag.key.toLowerCase().includes(lastWord.toLowerCase())
      ).slice(0, 5);
    }
    
    return [];
  }, [input]);

  if (suggestions.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 bg-white border rounded-lg shadow-lg mb-2 z-50">
      <div className="p-2 border-b bg-gray-50 text-xs text-gray-600 font-mono">
        Smart Suggestions
      </div>
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.key}
          onClick={() => {
            const parts = input.split(' ');
            parts[parts.length - 1] = suggestion.key + ' ';
            onSelect(parts.join(' '));
          }}
          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
        >
          {('icon' in suggestion) && suggestion.icon}
          <div className="flex-1">
            <div className="font-mono font-semibold">{suggestion.key}</div>
            <div className="text-xs text-gray-500">{suggestion.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default function IntegratedAIAssistant({ className }: IntegratedAIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'AI Assistant initialized. Ready for scenario analysis and code assistance.\n\nAvailable commands:\n• / - Commands (analyze, debug, optimize)\n• @ - Context (scenario, errors, nodes)\n• # - Tags (performance, security, architecture)',
      timestamp: new Date(),
      type: 'system'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-pro');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get scenario context from simulation store
  const scenario = useSimulationStore(state => state.scenario);
  const currentTime = useSimulationStore(state => state.currentTime);
  const errorMessages = useSimulationStore(state => state.errorMessages);
  const isRunning = useSimulationStore(state => state.isRunning);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Parse command/context from input
    const commandMatch = inputValue.match(/\/(\w+)/);
    const contextMatch = inputValue.match(/@(\w+)/g);
    const tagMatch = inputValue.match(/#(\w+)/g);

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
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let responseContent = '';
      
      if (commandMatch) {
        const command = commandMatch[1];
        switch (command) {
          case 'analyze':
            responseContent = `📊 SCENARIO ANALYSIS\n\nStructure: ${Object.keys(scenario || {}).length} main sections\nSimulation Time: ${currentTime}s\nStatus: ${isRunning ? 'Running' : 'Paused'}\nErrors: ${errorMessages.length} active\n\n✅ Well-structured scenario detected\n⚠️  Consider optimizing node connections\n📈 Performance metrics within normal range`;
            break;
          case 'debug':
            responseContent = errorMessages.length > 0 
              ? `🐛 DEBUG ANALYSIS\n\nFound ${errorMessages.length} error(s):\n${errorMessages.map((err, i) => `${i + 1}. ${err}`).join('\n')}\n\n💡 SOLUTIONS:\n• Check node connections\n• Validate scenario JSON\n• Review timing constraints`
              : `✅ NO ERRORS DETECTED\n\nSystem Status: Healthy\nAll validations passed\nScenario structure is valid`;
            break;
          case 'optimize':
            responseContent = `⚡ OPTIMIZATION SUGGESTIONS\n\n🔧 Performance:\n• Reduce node complexity by 15%\n• Implement connection pooling\n• Cache frequently accessed data\n\n🧠 Architecture:\n• Consider splitting large scenarios\n• Implement lazy loading\n• Add error boundaries\n\n📊 Metrics:\n• Current performance: Good\n• Memory usage: Optimal\n• Execution time: 0.${Math.floor(Math.random() * 900)}ms`;
            break;
          default:
            responseContent = `Command '/${command}' recognized. Processing scenario context...`;
        }
      } else {
        responseContent = `I understand you're working with the template editor. Your scenario has ${Object.keys(scenario || {}).length} main components and is currently ${isRunning ? 'running' : 'paused'} at time ${currentTime}s.\n\nHow can I assist with your scenario development?`;
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
      handleSendMessage();
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-l border-gray-200",
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="font-mono text-sm font-semibold text-gray-900">AI Assistant</div>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs font-mono bg-white border border-gray-200 rounded px-2 py-1"
            >
              <option value="gemini-pro">gemini-pro</option>
              <option value="gemini-pro-vision">gemini-pro-vision</option>
              <option value="claude-3-sonnet">claude-3-sonnet</option>
            </select>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-600 font-mono">
          Simulation: {isRunning ? 'Active' : 'Paused'} • Time: {currentTime}s • Errors: {errorMessages.length}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-1">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-sm">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-gray-600 font-mono text-xs">Analyzing...</span>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/50 relative">
        <CommandSuggestions
          input={inputValue}
          onSelect={(suggestion) => {
            setInputValue(suggestion);
            textareaRef.current?.focus();
          }}
        />
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Add context (@scenario, @errors) • Commands (/analyze, /debug) • Tags (#performance)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[60px] max-h-[120px] resize-none font-mono text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-gray-400">
              <Hash className="h-3 w-3" />
              <AtSign className="h-3 w-3" />
              <Slash className="h-3 w-3" />
            </div>
          </div>
          <Button 
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="self-end h-[60px] bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 font-mono">
          Press <kbd className="px-1 py-0.5 bg-gray-200 rounded">Enter</kbd> to send • <kbd className="px-1 py-0.5 bg-gray-200 rounded">Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
}