import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Event } from '../../../types/events';
import { matchEventToRule } from '../../../utils/eventMatching';

const PLED_PATH = path.join(process.cwd(), 'public', 'pled.json');

export async function GET() {
  try {
    const pledContent = await fs.readFile(PLED_PATH, 'utf8');
    const pled = JSON.parse(pledContent);
    
    return NextResponse.json({
      events: pled.events,
      receivedEvents: pled.receivedEvents
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get events' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { event, action } = await request.json();
    const pledContent = await fs.readFile(PLED_PATH, 'utf8');
    const pled = JSON.parse(pledContent);

    if (action === 'receive') {
      // Find the procedure instance (for now using the first one)
      const instance = pled.procedureInstances[0];
      
      // Add event to received events with proper type conversion
      const receivedEvent = {
        ...event,
        timestamp: new Date().toISOString(),
        processed: true,
        // Convert type to match rules if needed
        type: event.type === 'docusign_webhook' ? 'DOCUSIGN_EVENT' :
              event.type === 'hr_approval' ? 'HR_EVENT' :
              event.type === 'contract_generation' ? 'CONTRACT_EVENT' :
              event.type.toUpperCase(),
        // Ensure data is properly structured
        data: event.template?.data || event.data || {}
      };

      try {
        // Find matching rules and generate messages
        const template = pled.procedureTemplates.find(
          t => t.templateId === instance.templateId
        );

        if (template) {
          const matchingRules = template.messageRules.filter(rule => 
            matchEventToRule(
              receivedEvent, // Use the converted event
              {
                type: rule.matches.type,
                conditions: rule.matches.conditions
              },
              instance.variables
            )
          );

          // Generate messages from matching rules
          const newMessages = matchingRules.map(rule => ({
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: rule.generates.type,
            timestamp: new Date().toISOString(),
            title: rule.generates.template.title ? 
              interpolateTemplate(rule.generates.template.title, {
                event: receivedEvent,
                ...instance.variables
              }) : '',
            content: rule.generates.template.content ?
              interpolateTemplate(rule.generates.template.content, {
                event: receivedEvent,
                ...instance.variables
              }) : '',
            fromEvent: receivedEvent.id,
            rule: rule.id
          }));

          // Update instance messages (append instead of replace)
          instance.messages = [...(instance.messages || []), ...newMessages];

          // Update state if rule has transition
          const transitions = matchingRules
            .filter(rule => rule.transition)
            .map(rule => rule.transition);

          if (transitions.length > 0) {
            instance.currentState = transitions[transitions.length - 1];
            receivedEvent.triggeredTransitions = transitions;
          }
        }

        pled.receivedEvents.push(receivedEvent);

        // Mark template as received if it exists
        const eventKey = Object.keys(pled.events).find(
          key => pled.events[key].id === event.id?.split('-')[0]
        );
        if (eventKey) {
          pled.events[eventKey].received = true;
        }
      } catch (error) {
        console.error('Error processing event:', error);
        // Continue even if message generation fails
      }
    } else if (action === 'revert') {
      // Remove event and its messages
      pled.receivedEvents = pled.receivedEvents.filter(
        (e: Event) => e.id !== event.id
      );

      // Find the procedure instance
      const instance = pled.procedureInstances[0];
      
      // Remove messages generated by this event
      instance.messages = instance.messages.filter(
        (msg: any) => msg.fromEvent !== event.id
      );

      // Mark template as not received
      const eventKey = Object.keys(pled.events).find(
        key => pled.events[key].id === event.id.split('-')[0]
      );
      if (eventKey) {
        pled.events[eventKey].received = false;
      }
    }

    // Ensure proper JSON structure before saving
    const cleanPled = JSON.parse(JSON.stringify(pled));
    await fs.writeFile(PLED_PATH, JSON.stringify(cleanPled, null, 2));

    return NextResponse.json({
      success: true,
      message: `Event ${action === 'receive' ? 'received' : 'reverted'} successfully`
    });
  } catch (error: any) {
    console.error('Error in event processing:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process event' },
      { status: 500 }
    );
  }
}

// Helper function to interpolate variables in templates
function interpolateTemplate(template: string, variables: any): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = path.split('.')
      .reduce((obj: any, key: string) => obj?.[key], variables);
    return value ?? match;
  });
} 