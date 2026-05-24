import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter, createRootRoute, createRoute, Outlet } from '@tanstack/react-router'
import Home from "./home.tsx";
import Archive from "./archive.tsx";
import "./index.css";
// 1. مسار الجذر
const rootRoute = createRootRoute({
  component: () => (
    <>
      <div className="p-4 bg-gray-100 flex gap-4 text-lg font-bold border-b">
        <span className="text-gray-700">نظام إدارة العقار المالي</span>
      </div>
      <hr />
      <Outlet />
    </>
  ),
})

// 2. مسار الصفحة الرئيسية
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

// 3. مسار الأرشيف
const archiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/archive',
  component: Archive,
})

// 4. بناء الـ Router
const routeTree = rootRoute.addChildren([indexRoute, archiveRoute])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// 5. التصيير
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)