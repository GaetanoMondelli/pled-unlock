'use client';

import React from 'react';
import { getStateMachineForNodeType, getStateColor, type NodeState, type NodeStateMachine } from '@/lib/NodeStateMachines';

interface StateMachineVisualizationProps {
  nodeType: string;
  currentState: NodeState;
  onStateClick?: (state: NodeState) => void;
  className?: string;
}

const StateMachineVisualization: React.FC<StateMachineVisualizationProps> = ({
  nodeType,
  currentState,
  onStateClick,
  className = ''
}) => {
  const stateMachine = getStateMachineForNodeType(nodeType);

  // Layout states in a flow
  const getStatePosition = (state: NodeState, index: number, total: number): { x: number; y: number } => {
    const spacing = 120;
    const startX = 50;
    const y = 50;
    return { x: startX + (index * spacing), y };
  };

  const getTransitions = (stateMachine: NodeStateMachine) => {
    return Object.values(stateMachine.transitions);
  };

  return (
    <div className={`bg-muted/20 border rounded-lg p-4 ${className}`}>
      <h4 className="font-semibold text-sm mb-3">State Machine: {nodeType}</h4>
      <svg
        width="100%"
        height="120"
        viewBox="0 0 600 120"
        className="border rounded"
      >
        {/* Render transitions as arrows */}
        {getTransitions(stateMachine).map((transition, idx) => {
          const fromIndex = stateMachine.states.indexOf(transition.from);
          const toIndex = stateMachine.states.indexOf(transition.to);

          if (fromIndex === -1 || toIndex === -1) return null;

          const fromPos = getStatePosition(transition.from, fromIndex, stateMachine.states.length);
          const toPos = getStatePosition(transition.to, toIndex, stateMachine.states.length);

          // Self-loop
          if (transition.from === transition.to) {
            const centerX = fromPos.x;
            const centerY = fromPos.y - 25;
            return (
              <g key={`transition-${idx}`}>
                <path
                  d={`M ${centerX} ${fromPos.y} Q ${centerX} ${centerY} ${centerX + 30} ${fromPos.y}`}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="1"
                  markerEnd="url(#arrowhead)"
                />
                <text
                  x={centerX + 15}
                  y={centerY - 5}
                  fontSize="10"
                  textAnchor="middle"
                  fill="#6b7280"
                >
                  {transition.event}
                </text>
              </g>
            );
          }

          // Regular transition
          const midX = (fromPos.x + toPos.x) / 2;
          const midY = (fromPos.y + toPos.y) / 2 - 10;

          return (
            <g key={`transition-${idx}`}>
              <line
                x1={fromPos.x + (toPos.x > fromPos.x ? 25 : -25)}
                y1={fromPos.y}
                x2={toPos.x + (toPos.x > fromPos.x ? -25 : 25)}
                y2={toPos.y}
                stroke="#6b7280"
                strokeWidth="1"
                markerEnd="url(#arrowhead)"
              />
              <text
                x={midX}
                y={midY}
                fontSize="10"
                textAnchor="middle"
                fill="#6b7280"
                className="select-none"
              >
                {transition.event}
              </text>
            </g>
          );
        })}

        {/* Render states as circles */}
        {stateMachine.states.map((state, index) => {
          const position = getStatePosition(state, index, stateMachine.states.length);
          const isActive = state === currentState;
          const color = getStateColor(state);

          return (
            <g key={state}>
              <circle
                cx={position.x}
                cy={position.y}
                r="20"
                fill={isActive ? color : '#f8fafc'}
                stroke={isActive ? color : '#cbd5e1'}
                strokeWidth={isActive ? "3" : "1"}
                className={onStateClick ? "cursor-pointer hover:opacity-80" : ""}
                onClick={() => onStateClick?.(state)}
              />
              <text
                x={position.x}
                y={position.y + 4}
                fontSize="10"
                textAnchor="middle"
                fill={isActive ? '#ffffff' : '#475569'}
                className="select-none font-medium"
              >
                {state}
              </text>
            </g>
          );
        })}

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="6"
            markerHeight="4"
            refX="5"
            refY="2"
            orient="auto"
          >
            <polygon
              points="0 0, 6 2, 0 4"
              fill="#6b7280"
            />
          </marker>
        </defs>
      </svg>

      <div className="mt-2 text-xs text-muted-foreground">
        Current State: <span className="font-semibold" style={{ color: getStateColor(currentState) }}>
          {currentState}
        </span>
      </div>
    </div>
  );
};

export default StateMachineVisualization;