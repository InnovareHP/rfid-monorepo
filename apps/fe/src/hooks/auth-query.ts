import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";

export const useSession = () => {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await authClient.getSession();
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 mins
  });
};
