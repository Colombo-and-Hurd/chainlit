import getRouterBasename from '@/lib/router';
import { Navigate, createBrowserRouter } from 'react-router-dom';

import AuthCallback from 'pages/AuthCallback';
import Element from 'pages/Element';
import Env from 'pages/Env';
import GptEditorPage from 'pages/GptEditor';
import GptsPage from 'pages/Gpts';
import Home from 'pages/Home';
import Login from 'pages/Login';
import Thread from 'pages/Thread';
import WorkflowBuilderPage from 'pages/WorkflowBuilder';
import WorkflowRunsPage from 'pages/WorkflowRuns';
import WorkflowsPage from 'pages/Workflows';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Home />
    },
    {
      path: '/env',
      element: <Env />
    },
    {
      path: '/thread/:id?',
      element: <Thread />
    },
    {
      path: '/element/:id',
      element: <Element />
    },
    {
      path: '/login',
      element: <Login />
    },
    {
      path: '/login/callback',
      element: <AuthCallback />
    },
    {
      path: '/share/:id',
      element: <Thread />
    },
    {
      path: '/gpts',
      element: <GptsPage />
    },
    {
      path: '/gpts/new',
      element: <GptEditorPage />
    },
    {
      path: '/gpts/:id/edit',
      element: <GptEditorPage />
    },
    {
      path: '/workflows',
      element: <WorkflowsPage />
    },
    {
      path: '/workflows/new',
      element: <WorkflowBuilderPage />
    },
    {
      path: '/workflows/runs',
      element: <WorkflowRunsPage />
    },
    {
      path: '/workflows/:id',
      element: <WorkflowBuilderPage />
    },
    {
      path: '*',
      element: <Navigate replace to="/" />
    }
  ],
  { basename: getRouterBasename() }
);
