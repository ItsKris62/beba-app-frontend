"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  mpesaApi,
  type ApiResponse,
  type StkStatusResponse,
} from "../lib/api-client";

type StkPollOptions = Omit<
  UseQueryOptions<ApiResponse<StkStatusResponse>, Error>,
  "queryKey" | "queryFn" | "enabled" | "refetchInterval"
>;

export function useStkPoll(
  checkoutRequestId: string | null,
  options?: StkPollOptions,
) {
  return useQuery<ApiResponse<StkStatusResponse>, Error>({
    queryKey: ["stk-status", checkoutRequestId],
    queryFn: async () => {
      if (!checkoutRequestId) {
        throw new Error("checkoutRequestId required");
      }
      return mpesaApi.getStkStatus(checkoutRequestId);
    },
    enabled: !!checkoutRequestId,
    refetchInterval: (query) =>
      query.state.data?.data?.status === "PENDING" ? 3000 : false,
    refetchIntervalInBackground: false,
    ...options,
  });
}
