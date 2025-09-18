/**
 * Real-time collaboration server using Socket.IO
 * Handles multi-agent isolation and communication
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import * as vscode from 'vscode';

interface AgentSession {
  id: string;
  type: 'llm' | 'user' | 'system';
  name: string;
  capabilities: string[];
  status: 'active' | 'busy' | 'idle' | 'error';
  workspaceId: string;
}

interface CollaborationMessage {
  type: 'code_change' | 'discussion' | 'decision' | 'status_update';
  sender: string;
  content: any;
  timestamp: number;
  targetAgents?: string[];
}

export class CollaborationServer {
  private server: any;
  private io: Server;
  private port: number;
  private agents: Map<string, AgentSession> = new Map();
  private workspaces: Map<string, Set<string>> = new Map(); // workspace -> agent IDs
  private messageHistory: Map<string, CollaborationMessage[]> = new Map(); // workspace -> messages

  constructor(port: number = 3000) {
    this.port = port;
    this.server = createServer();
    this.io = new Server(this.server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupEventHandlers();
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use dynamic port selection for testing environment
      const port = process.env.NODE_ENV === 'test' ? 0 : this.port;
      
      this.server.listen(port, (error: any) => {
        if (error) {
          reject(error);
        } else {
          // Update actual port if using dynamic allocation
          if (port === 0) {
            this.port = (this.server.address() as any)?.port || this.port;
          }
          console.log(`Collaboration server started on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise(resolve => {
      this.server.close(() => {
        console.log('Collaboration server stopped');
        resolve();
      });
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', socket => {
      console.log(`New connection: ${socket.id}`);

      // Agent registration
      socket.on('register_agent', (agentData: Partial<AgentSession>) => {
        this.registerAgent(socket, agentData);
      });

      // Join workspace
      socket.on('join_workspace', (workspaceId: string) => {
        this.joinWorkspace(socket, workspaceId);
      });

      // Handle collaboration messages
      socket.on('collaboration_message', (message: CollaborationMessage) => {
        this.handleMessage(socket, message);
      });

      // Request agent isolation
      socket.on('request_isolation', (taskData: any) => {
        this.createIsolatedAgent(socket, taskData);
      });

      // Status updates
      socket.on('status_update', (status: string) => {
        this.updateAgentStatus(socket, status);
      });

      // Disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  private registerAgent(socket: any, agentData: Partial<AgentSession>): void {
    const agent: AgentSession = {
      id: socket.id,
      type: agentData.type || 'system',
      name: agentData.name || `Agent-${socket.id.substring(0, 8)}`,
      capabilities: agentData.capabilities || [],
      status: 'active',
      workspaceId: agentData.workspaceId || 'default',
    };

    this.agents.set(socket.id, agent);
    socket.join(agent.workspaceId);

    // Add to workspace
    if (!this.workspaces.has(agent.workspaceId)) {
      this.workspaces.set(agent.workspaceId, new Set());
    }
    this.workspaces.get(agent.workspaceId)!.add(socket.id);

    // Notify other agents in workspace
    socket.to(agent.workspaceId).emit('agent_joined', {
      agent: agent,
      timestamp: Date.now(),
    });

    socket.emit('registration_complete', {
      agent: agent,
      workspace_agents: this.getWorkspaceAgents(agent.workspaceId),
    });

    console.log(
      `Agent registered: ${agent.name} (${agent.type}) in workspace ${agent.workspaceId}`
    );
  }

  private joinWorkspace(socket: any, workspaceId: string): void {
    const agent = this.agents.get(socket.id);
    if (!agent) return;

    // Leave current workspace
    socket.leave(agent.workspaceId);
    this.workspaces.get(agent.workspaceId)?.delete(socket.id);

    // Join new workspace
    agent.workspaceId = workspaceId;
    socket.join(workspaceId);

    if (!this.workspaces.has(workspaceId)) {
      this.workspaces.set(workspaceId, new Set());
    }
    this.workspaces.get(workspaceId)!.add(socket.id);

    // Send message history
    const history = this.messageHistory.get(workspaceId) || [];
    socket.emit('message_history', history.slice(-50)); // Last 50 messages

    // Notify workspace
    socket.to(workspaceId).emit('agent_joined', {
      agent: agent,
      timestamp: Date.now(),
    });
  }

  private handleMessage(socket: any, message: CollaborationMessage): void {
    const agent = this.agents.get(socket.id);
    if (!agent) return;

    // Add sender info and timestamp
    message.sender = agent.id;
    message.timestamp = Date.now();

    // Store message in history
    if (!this.messageHistory.has(agent.workspaceId)) {
      this.messageHistory.set(agent.workspaceId, []);
    }
    const history = this.messageHistory.get(agent.workspaceId)!;
    history.push(message);

    // Keep only last 1000 messages
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    // Route message based on type and targets
    if (message.targetAgents && message.targetAgents.length > 0) {
      // Send to specific agents
      message.targetAgents.forEach(targetId => {
        socket.to(targetId).emit('collaboration_message', message);
      });
    } else {
      // Broadcast to all agents in workspace
      socket.to(agent.workspaceId).emit('collaboration_message', message);
    }

    // Handle special message types
    this.processMessageType(message, agent);
  }

  private processMessageType(message: CollaborationMessage, sender: AgentSession): void {
    switch (message.type) {
      case 'decision':
        this.handleDecisionMessage(message, sender);
        break;
      case 'code_change':
        this.handleCodeChange(message, sender);
        break;
      case 'status_update':
        this.handleStatusUpdate(message, sender);
        break;
    }
  }

  private handleDecisionMessage(message: CollaborationMessage, sender: AgentSession): void {
    // Implement voting mechanism for multi-agent decisions
    const decision = message.content;

    // Notify VS Code extension about the decision
    vscode.window.showInformationMessage(
      `Agent ${sender.name} made a decision: ${decision.summary || 'Decision pending'}`
    );
  }

  private handleCodeChange(message: CollaborationMessage, sender: AgentSession): void {
    // Handle real-time code synchronization
    const change = message.content;

    // Broadcast to VS Code extension
    this.io.to(sender.workspaceId).emit('code_sync', {
      file: change.file,
      diff: change.diff,
      author: sender.name,
      timestamp: message.timestamp,
    });
  }

  private handleStatusUpdate(message: CollaborationMessage, sender: AgentSession): void {
    const agent = this.agents.get(sender.id);
    if (agent) {
      agent.status = message.content.status || agent.status;

      // Notify workspace about status change
      this.io.to(agent.workspaceId).emit('agent_status_update', {
        agentId: sender.id,
        status: agent.status,
        timestamp: message.timestamp,
      });
    }
  }

  private createIsolatedAgent(socket: any, taskData: any): void {
    // Create isolated environment for heavy tasks
    const isolationId = `isolated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create isolated workspace
    this.workspaces.set(isolationId, new Set([socket.id]));

    // Move agent to isolated workspace temporarily
    const agent = this.agents.get(socket.id);
    if (agent) {
      const originalWorkspace = agent.workspaceId;

      socket.leave(originalWorkspace);
      socket.join(isolationId);

      socket.emit('isolation_created', {
        isolationId,
        originalWorkspace,
        taskData,
        timestamp: Date.now(),
      });

      // Set timeout to return agent to original workspace
      setTimeout(() => {
        socket.leave(isolationId);
        socket.join(originalWorkspace);
        this.workspaces.delete(isolationId);

        socket.emit('isolation_ended', {
          isolationId,
          returnedTo: originalWorkspace,
          timestamp: Date.now(),
        });
      }, taskData.timeout || 30000); // Default 30 seconds
    }
  }

  private updateAgentStatus(socket: any, status: string): void {
    const agent = this.agents.get(socket.id);
    if (agent) {
      agent.status = status as any;

      // Notify workspace
      socket.to(agent.workspaceId).emit('agent_status_update', {
        agentId: socket.id,
        status: status,
        timestamp: Date.now(),
      });
    }
  }

  private handleDisconnection(socket: any): void {
    const agent = this.agents.get(socket.id);
    if (agent) {
      // Remove from workspace
      this.workspaces.get(agent.workspaceId)?.delete(socket.id);

      // Notify other agents
      socket.to(agent.workspaceId).emit('agent_left', {
        agentId: socket.id,
        agentName: agent.name,
        timestamp: Date.now(),
      });

      // Cleanup
      this.agents.delete(socket.id);

      console.log(`Agent disconnected: ${agent.name} (${socket.id})`);
    }
  }

  private getWorkspaceAgents(workspaceId: string): AgentSession[] {
    const agentIds = this.workspaces.get(workspaceId) || new Set();
    const agents: AgentSession[] = [];

    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (agent) {
        agents.push(agent);
      }
    }

    return agents;
  }

  // Public API methods for integration with VS Code extension

  broadcastToWorkspace(workspaceId: string, event: string, data: any): void {
    this.io.to(workspaceId).emit(event, data);
  }

  getWorkspaceStats(workspaceId: string): any {
    const agents = this.getWorkspaceAgents(workspaceId);
    const messages = this.messageHistory.get(workspaceId) || [];

    return {
      agentCount: agents.length,
      messageCount: messages.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      lastActivity: messages.length > 0 ? messages[messages.length - 1].timestamp : null,
    };
  }

  getAllWorkspaces(): string[] {
    return Array.from(this.workspaces.keys());
  }
}
