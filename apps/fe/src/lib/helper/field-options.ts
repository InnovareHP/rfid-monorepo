export type FieldOption = { id: string; value: string; color?: string };

// The options endpoint returns a bare array when unpaged and { data, total }
// when a page is asked for, so pickers normalize before rendering.
export const toFieldOptions = (response: unknown): FieldOption[] => {
  if (Array.isArray(response)) return response as FieldOption[];

  const paged = response as { data?: FieldOption[] } | null;
  return paged?.data ?? [];
};
