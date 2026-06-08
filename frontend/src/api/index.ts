import getRouterBasename from '@/lib/router';
import { toast } from 'sonner';

import { ChainlitAPI, ClientError } from '@chainlit/react-client';

import { GptRecord, GptToolDescriptor, GptWritePayload } from '@/types/gpts';
import {
  WorkflowBlockDescriptor,
  WorkflowRecord,
  WorkflowRunRecord,
  WorkflowWritePayload
} from '@/types/workflows';

const devServer = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + getRouterBasename()
  : window.location.origin + getRouterBasename();
const url = import.meta.env.DEV
  ? devServer
  : window.origin + getRouterBasename();
const serverUrl = new URL(url);

const httpEndpoint = serverUrl.toString();

const on401 = () => {
  if (window.location.pathname !== getRouterBasename() + '/login') {
    // The credentials aren't correct, remove the token and redirect to login
    window.location.href = getRouterBasename() + '/login';
  }
};

const onError = (error: ClientError) => {
  toast.error(error.toString());
};

class ExtendedChainlitAPI extends ChainlitAPI {
  async shareThread(
    threadId: string,
    isShared: boolean
  ): Promise<{ success: boolean }> {
    const res = await this.put(`/project/thread/share`, {
      threadId,
      isShared
    });
    return res.json();
  }

  connectStreamableHttpMCP(
    sessionId: string,
    name: string,
    url: string,
    headers?: Record<string, string>
  ) {
    // Assumes the backend expects { clientType, name, url }
    return fetch(
      new URL(
        'mcp',
        this.httpEndpoint.endsWith('/')
          ? this.httpEndpoint
          : `${this.httpEndpoint}/`
      ),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'x-session-id': sessionId } : {})
        },
        body: JSON.stringify({
          clientType: 'streamable-http',
          name,
          url,
          sessionId,
          ...(headers ? { headers } : {})
        })
      }
    ).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to connect MCP');
      }
      return { success: true, mcp: data.mcp };
    });
  }

  async listGpts(): Promise<GptRecord[]> {
    const res = await this.get('/gpts');
    const payload = await res.json();
    return payload?.data?.items || [];
  }

  async getGpt(gptId: string): Promise<GptRecord> {
    const res = await this.get(`/gpts/${gptId}`);
    const payload = await res.json();
    return payload?.data?.item;
  }

  async createGpt(data: GptWritePayload): Promise<GptRecord> {
    const res = await this.post('/gpts', data);
    const payload = await res.json();
    return payload?.data?.item;
  }

  async updateGpt(
    gptId: string,
    data: Partial<GptWritePayload>
  ): Promise<GptRecord> {
    const res = await this.put(`/gpts/${gptId}`, data);
    const payload = await res.json();
    return payload?.data?.item;
  }

  async deleteGpt(gptId: string): Promise<void> {
    await this.delete(`/gpts/${gptId}`, {});
  }

  async listGptTools(): Promise<GptToolDescriptor[]> {
    const res = await this.get('/gpts/tools');
    const payload = await res.json();
    return payload?.data?.items || [];
  }

  async uploadGptKnowledge(
    gptId: string,
    data: {
      file_name: string;
      mime_type: string;
      content_base64: string;
    }
  ) {
    const res = await this.post(`/gpts/${gptId}/knowledge`, data);
    const payload = await res.json();
    return payload?.data?.item;
  }

  async deleteGptKnowledge(
    gptId: string,
    knowledgeId: string
  ): Promise<GptRecord> {
    const res = await this.delete(
      `/gpts/${gptId}/knowledge/${knowledgeId}`,
      {}
    );
    const payload = await res.json();
    return payload?.data?.item;
  }

  async listWorkflows(): Promise<WorkflowRecord[]> {
    const res = await this.get('/workflows');
    const payload = await res.json();
    return payload?.data?.items || [];
  }

  async getWorkflow(workflowId: string): Promise<WorkflowRecord> {
    const res = await this.get(`/workflows/${workflowId}`);
    const payload = await res.json();
    return payload?.data?.item;
  }

  async createWorkflow(data: WorkflowWritePayload): Promise<WorkflowRecord> {
    const res = await this.post('/workflows', data);
    const payload = await res.json();
    return payload?.data?.item;
  }

  async updateWorkflow(
    workflowId: string,
    data: Partial<WorkflowWritePayload>
  ): Promise<WorkflowRecord> {
    const res = await this.put(`/workflows/${workflowId}`, data);
    const payload = await res.json();
    return payload?.data?.item;
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    await this.delete(`/workflows/${workflowId}`, {});
  }

  async listWorkflowBlocks(): Promise<WorkflowBlockDescriptor[]> {
    const res = await this.get('/workflows/blocks');
    const payload = await res.json();
    return payload?.data?.items || [];
  }

  async enqueueWorkflowRun(
    workflowId: string,
    input_text: string,
    input_payload: Record<string, unknown> = {}
  ): Promise<WorkflowRunRecord> {
    const res = await this.post(`/workflows/${workflowId}/runs`, {
      input_text,
      input_payload
    });
    const payload = await res.json();
    return payload?.data?.item;
  }

  async listWorkflowRuns(workflowId?: string): Promise<WorkflowRunRecord[]> {
    const query = workflowId
      ? `/workflows/runs?workflow_id=${encodeURIComponent(workflowId)}`
      : '/workflows/runs';
    const res = await this.get(query);
    const payload = await res.json();
    return payload?.data?.items || [];
  }

  async getWorkflowRun(runId: string): Promise<WorkflowRunRecord> {
    const res = await this.get(`/workflows/runs/${runId}`);
    const payload = await res.json();
    return payload?.data?.item;
  }

  async cancelWorkflowRun(runId: string): Promise<WorkflowRunRecord> {
    const res = await this.post(`/workflows/runs/${runId}/cancel`, {});
    const payload = await res.json();
    return payload?.data?.item;
  }

  async handoffWorkflowRunToChat(
    runId: string
  ): Promise<{ thread_id: string }> {
    const res = await this.post(`/workflows/runs/${runId}/chat`, {});
    const payload = await res.json();
    return payload?.data;
  }
}

export const apiClient = new ExtendedChainlitAPI(
  httpEndpoint,
  'webapp',
  {}, // Optional - additionalQueryParams property.
  on401,
  onError
);
