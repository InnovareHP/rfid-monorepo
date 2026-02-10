// const queryClient = new QueryClient();

/**
 * Lead Collection using TanStack DB
 * - Only stores `data` (rows).
 * - Fetch `columns` separately with React Query.
 */
// export const referralCollection = createCollection(
//   queryCollectionOptions({
//     queryKey: ["referrals"],
//     queryFn: async () => {
//       const response = await getReferral();

//       return response.data;
//     },
//     getKey: (item: ReferralRow) => item.id,
//     queryClient,
//     onUpdate: async ({ transaction }) => {
//       const mutation = transaction.mutations[0];
//       await updateReferral(
//         mutation.modified.id as string,
//         mutation.modified.field_id as string,
//         mutation.modified.value as string,
//         mutation.modified.reason as string
//       );
//     },
//     onInsert: async ({ transaction }) => {
//       const mutation = transaction.mutations[0];
//       await createReferral(mutation.modified);
//     },

//     onDelete: async ({ transaction }) => {
//       const mutation = transaction.mutations;
//       await deleteReferralColumn(mutation.map((m) => m.modified.id as string));
//     },
//   })
// );

// export const referralTimelineCollection = createCollection(
//   queryCollectionOptions({
//     queryKey: ["referral-timeline"],
//     queryFn: async ({ queryKey }: { queryKey: string[] }) => {
//       const referralId = queryKey[1];
//       const response = await getReferralTimeline(referralId);
//       return response.data;
//     },
//     getKey: (item: ReferralHistoryItem) => item.id,
//     queryClient,
//     onInsert: async ({ transaction }) => {
//       const mutation = transaction.mutations[0];
//       await createReferralTimeline(
//         mutation.modified.id as string,
//         mutation.modified
//       );
//     },
//   })
// );
