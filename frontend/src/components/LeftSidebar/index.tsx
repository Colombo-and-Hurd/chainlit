import { cn } from '@/lib/utils';
import { BrainCircuit, ChevronDown, Workflow } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ChainlitContext } from '@chainlit/react-client';

import SidebarTrigger from '@/components/header/SidebarTrigger';
import { Button } from '@/components/ui/button';
import { Sidebar, SidebarHeader, SidebarRail } from '@/components/ui/sidebar';

import type { GptRecord } from '@/types/gpts';
import type { WorkflowRecord } from '@/types/workflows';

import NewChatButton from '../header/NewChat';
import SearchChats from './Search';
import { ThreadHistory } from './ThreadHistory';

export default function LeftSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const apiClient = useContext(ChainlitContext) as any;
  const location = useLocation();
  const navigate = useNavigate();
  const [showAgents, setShowAgents] = useState(false);
  const [showWorkflows, setShowWorkflows] = useState(false);
  const [isAgentsLoading, setIsAgentsLoading] = useState(false);
  const [isWorkflowsLoading, setIsWorkflowsLoading] = useState(false);
  const [hasLoadedAgents, setHasLoadedAgents] = useState(false);
  const [hasLoadedWorkflows, setHasLoadedWorkflows] = useState(false);
  const [agents, setAgents] = useState<GptRecord[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const agentsFetchInFlight = useRef(false);
  const workflowsFetchInFlight = useRef(false);

  const loadAgents = async (force = false) => {
    if ((hasLoadedAgents && !force) || agentsFetchInFlight.current) {
      return;
    }
    agentsFetchInFlight.current = true;
    setIsAgentsLoading(true);
    try {
      const records = await apiClient.listGpts();
      setAgents(
        records.filter((item: GptRecord) => item.visibility !== 'example')
      );
      setHasLoadedAgents(true);
    } finally {
      agentsFetchInFlight.current = false;
      setIsAgentsLoading(false);
    }
  };

  const loadWorkflows = async (force = false) => {
    if ((hasLoadedWorkflows && !force) || workflowsFetchInFlight.current) {
      return;
    }
    workflowsFetchInFlight.current = true;
    setIsWorkflowsLoading(true);
    try {
      const records = await apiClient.listWorkflows();
      setWorkflows(
        records.filter((item: WorkflowRecord) => item.visibility !== 'example')
      );
      setHasLoadedWorkflows(true);
    } finally {
      workflowsFetchInFlight.current = false;
      setIsWorkflowsLoading(false);
    }
  };

  useEffect(() => {
    void loadAgents();
    void loadWorkflows();
  }, []);

  const toggleAgents = () => {
    setShowAgents((prev) => {
      const next = !prev;
      if (next) {
        void loadAgents();
      }
      return next;
    });
  };

  const toggleWorkflows = () => {
    setShowWorkflows((prev) => {
      const next = !prev;
      if (next) {
        void loadWorkflows();
      }
      return next;
    });
  };

  const agentsRouteActive = location.pathname.startsWith('/gpts');
  const workflowsRouteActive = location.pathname.startsWith('/workflows');

  const renderAgentItems = () => {
    if (isAgentsLoading && agents.length === 0) {
      return (
        <div className="space-y-1.5 py-1">
          <div className="h-7 rounded-md bg-muted/70 animate-pulse" />
          <div className="h-7 rounded-md bg-muted/70 animate-pulse w-5/6" />
        </div>
      );
    }
    if (agents.length === 0) {
      return (
        <p className="text-xs text-muted-foreground px-2 py-1">
          No agents created yet
        </p>
      );
    }
    return agents.slice(0, 8).map((agent) => (
      <Button
        key={agent.id}
        variant="ghost"
        className="w-full justify-start h-7 text-xs px-2"
        onClick={() =>
          navigate(`/gpts/${agent.id}/edit`, {
            state: { gpt: agent }
          })
        }
      >
        <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
        <span className="truncate">{agent.name}</span>
      </Button>
    ));
  };

  const renderWorkflowItems = () => {
    if (isWorkflowsLoading && workflows.length === 0) {
      return (
        <div className="space-y-1.5 py-1">
          <div className="h-7 rounded-md bg-muted/70 animate-pulse" />
          <div className="h-7 rounded-md bg-muted/70 animate-pulse w-4/5" />
        </div>
      );
    }
    if (workflows.length === 0) {
      return (
        <p className="text-xs text-muted-foreground px-2 py-1">
          No workflows created yet
        </p>
      );
    }
    return workflows.slice(0, 8).map((workflow) => (
      <Button
        key={workflow.id}
        variant="ghost"
        className="w-full justify-start h-7 text-xs px-2"
        onClick={() =>
          navigate(`/workflows/${workflow.id}`, {
            state: { workflow }
          })
        }
      >
        <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
        <span className="truncate">{workflow.name}</span>
      </Button>
    ));
  };

  return (
    <Sidebar {...props} className="border-none">
      <SidebarHeader className="py-3">
        <div className="flex items-center justify-between">
          <SidebarTrigger />
          <div className="flex items-center">
            <SearchChats />
            <NewChatButton navigate={navigate} />
          </div>
        </div>
        <div className="pt-2">
          <div className="space-y-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 px-1.5 py-1">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className={cn(
                    'h-8 w-full justify-start px-2.5 text-[13px] font-semibold tracking-tight',
                    agentsRouteActive && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => navigate('/gpts')}
                >
                  <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <BrainCircuit className="h-3.5 w-3.5" />
                  </span>
                  <span>Agents</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 shrink-0 rounded-md',
                    showAgents && 'bg-accent'
                  )}
                  onClick={toggleAgents}
                  aria-label="Toggle agents list"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showAgents ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </div>
              <div
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  showAgents
                    ? 'grid-rows-[1fr] opacity-100 mt-1'
                    : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <div className="ml-4 border-l border-border/70 pl-2.5 space-y-1 py-0.5">
                    {renderAgentItems()}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 px-1.5 py-1">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className={cn(
                    'h-8 w-full justify-start px-2.5 text-[13px] font-semibold tracking-tight',
                    workflowsRouteActive && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => navigate('/workflows')}
                >
                  <span className="mr-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Workflow className="h-3.5 w-3.5" />
                  </span>
                  <span>Workflows</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 shrink-0 rounded-md',
                    showWorkflows && 'bg-accent'
                  )}
                  onClick={toggleWorkflows}
                  aria-label="Toggle workflows list"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      showWorkflows ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </div>
              <div
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  showWorkflows
                    ? 'grid-rows-[1fr] opacity-100 mt-1'
                    : 'grid-rows-[0fr] opacity-0'
                )}
              >
                <div className="overflow-hidden">
                  <div className="ml-4 border-l border-border/70 pl-2.5 space-y-1 py-0.5">
                    {renderWorkflowItems()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <ThreadHistory />
      <SidebarRail />
    </Sidebar>
  );
}
