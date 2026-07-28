import { useState, useEffect, useCallback } from 'react';

export interface TaskFilterOptions {
  projectId?: string;
  status?: string;
  hasDueDate?: boolean;
  parentOnly?: boolean;
  pageSize?: number;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function usePaginatedTasks(options: TaskFilterOptions = {}) {
  const {
    projectId,
    status,
    hasDueDate,
    parentOnly = true,
    pageSize = 25,
  } = options;

  const [tasks, setTasks] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasksPage = useCallback(
    async (targetPage: number, append = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('page', targetPage.toString());
        params.set('pageSize', pageSize.toString());
        if (projectId) params.set('projectId', projectId);
        if (status) params.set('status', status);
        if (hasDueDate !== undefined) params.set('hasDueDate', String(hasDueDate));
        params.set('parentOnly', String(parentOnly));

        const res = await fetch(`/api/tasks?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to fetch tasks');
        }

        const json = await res.json();
        const fetchedTasks = json.data || [];
        const meta = json.pagination || { page: targetPage, pageSize, total: 0, totalPages: 0 };

        const hasMore = meta.page < meta.totalPages;

        if (append) {
          setTasks((prev) => [...prev, ...fetchedTasks]);
        } else {
          setTasks(fetchedTasks);
        }

        setPagination({
          page: meta.page,
          pageSize: meta.pageSize,
          total: meta.total,
          totalPages: meta.totalPages,
          hasMore,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An error occurred while fetching tasks';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [projectId, status, hasDueDate, parentOnly, pageSize]
  );

  // Fetch page 1 on mount or when filter options change
  useEffect(() => {
    fetchTasksPage(1, false);
  }, [fetchTasksPage]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !pagination.hasMore) return;
    fetchTasksPage(pagination.page + 1, true);
  }, [fetchTasksPage, isLoading, isLoadingMore, pagination.hasMore, pagination.page]);

  const refresh = useCallback(() => {
    return fetchTasksPage(1, false);
  }, [fetchTasksPage]);

  return {
    tasks,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
  };
}
